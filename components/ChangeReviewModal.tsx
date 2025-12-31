'use client';

import { useState, useCallback, useEffect } from 'react';
import { AICorrection, FormattingChange, CorrectionStatus } from '@/types';

interface ChangeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  corrections: AICorrection[];
  formattingChanges: FormattingChange[];
  originalText: string;
  onUpdateCorrection: (id: string, status: CorrectionStatus) => void;
  onUpdateFormatting: (id: string, status: CorrectionStatus) => void;
  onComplete: () => void;
}

// Type labels in Arabic and English - Egyptian Cinema Theme
const TYPE_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  ocr_error: { ar: 'خطأ OCR', en: 'OCR Error', color: 'bg-[#4a2020] text-[#ff6b6b] border border-[#6a3030]' },
  spelling: { ar: 'خطأ إملائي', en: 'Spelling', color: 'bg-[#4a3f20] text-[#fde047] border border-[#6a5a30]' },
  formatting: { ar: 'تنسيق', en: 'Formatting', color: 'bg-[#2a3a4a] text-[#60a5fa] border border-[#3a4a5a]' },
  title: { ar: 'عنوان', en: 'Title', color: 'bg-[#3a2a4a] text-[#c084fc] border border-[#4a3a5a]' },
  paragraph: { ar: 'فقرة', en: 'Paragraph', color: 'bg-[#2a4a2a] text-[#90ee90] border border-[#3a5a3a]' },
  quote: { ar: 'اقتباس', en: 'Quote', color: 'bg-[#4a4a20] text-[#facc15] border border-[#5a5a30]' },
  section_break: { ar: 'فاصل', en: 'Section Break', color: 'bg-[#3a3020] text-[#d4a012] border border-[#4a4030]' },
};

export default function ChangeReviewModal({
  isOpen,
  onClose,
  corrections,
  formattingChanges,
  originalText,
  onUpdateCorrection,
  onUpdateFormatting,
  onComplete,
}: ChangeReviewModalProps) {
  // Combine all changes into one list for sequential review
  const allChanges = [
    ...corrections.map(c => ({ ...c, changeType: 'correction' as const })),
    ...formattingChanges.map(f => ({ ...f, changeType: 'formatting' as const })),
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const pendingChanges = allChanges.filter(c => c.status === 'pending');
  const currentChange = pendingChanges[currentIndex] || allChanges[currentIndex];
  
  // Calculate progress
  const totalChanges = allChanges.length;
  const reviewedChanges = allChanges.filter(c => c.status !== 'pending').length;
  const approvedChanges = allChanges.filter(c => c.status === 'approved').length;
  const rejectedChanges = allChanges.filter(c => c.status === 'rejected').length;
  const deletedChanges = allChanges.filter(c => c.status === 'deleted').length;

  // Reset index when changes update
  useEffect(() => {
    if (currentIndex >= pendingChanges.length && pendingChanges.length > 0) {
      setCurrentIndex(0);
    }
  }, [pendingChanges.length, currentIndex]);

  // Get full context around the change - finds the actual original word in text
  const getContextText = useCallback((originalWord: string, position: { start: number; end: number }) => {
    // First, check if the word at the given position matches
    const textAtPosition = originalText.slice(position.start, position.end).trim();
    
    let actualStart = position.start;
    let actualEnd = position.end;
    let wordFound = false;
    
    // If word matches at position, use it
    if (textAtPosition === originalWord.trim() || 
        textAtPosition.includes(originalWord.trim()) ||
        originalWord.trim().includes(textAtPosition)) {
      wordFound = true;
      // Adjust to exact boundaries
      const trimmedWord = originalWord.trim();
      if (textAtPosition !== trimmedWord) {
        // Find exact match within the position range
        const exactIndex = textAtPosition.indexOf(trimmedWord);
        if (exactIndex !== -1) {
          actualStart = position.start + exactIndex;
          actualEnd = actualStart + trimmedWord.length;
        }
      }
    } else {
      // Word doesn't match at position, search for it
      // Search in a window around the position first
      const searchStart = Math.max(0, position.start - 500);
      const searchEnd = Math.min(originalText.length, position.end + 500);
      const searchArea = originalText.slice(searchStart, searchEnd);
      
      const trimmedWord = originalWord.trim();
      let wordIndex = searchArea.indexOf(trimmedWord);
      
      if (wordIndex !== -1) {
        actualStart = searchStart + wordIndex;
        actualEnd = actualStart + trimmedWord.length;
        wordFound = true;
      } else {
        // Try case-insensitive for emails/URLs
        if (trimmedWord.includes('@') || trimmedWord.includes('www.') || trimmedWord.includes('http')) {
          const lowerWord = trimmedWord.toLowerCase();
          const lowerSearchArea = searchArea.toLowerCase();
          wordIndex = lowerSearchArea.indexOf(lowerWord);
          if (wordIndex !== -1) {
            actualStart = searchStart + wordIndex;
            actualEnd = actualStart + trimmedWord.length;
            wordFound = true;
          }
        }
        
        // If still not found, search entire text
        if (!wordFound) {
          const fullIndex = originalText.indexOf(trimmedWord);
          if (fullIndex !== -1) {
            actualStart = fullIndex;
            actualEnd = actualStart + trimmedWord.length;
            wordFound = true;
          }
        }
      }
      
      // If word still not found, use the position but show what's actually there
      if (!wordFound) {
        // Use position but note the mismatch
        actualStart = position.start;
        actualEnd = position.end;
      }
    }
    
    // Find paragraph boundaries around the actual position
    let paragraphStart = actualStart;
    let paragraphEnd = actualEnd;
    
    // Search backwards for paragraph start
    for (let i = actualStart - 1; i >= 0; i--) {
      if (originalText[i] === '\n' || originalText[i] === '\r') {
        paragraphStart = i + 1;
        break;
      }
      if (i === 0) paragraphStart = 0;
    }
    
    // Search forwards for paragraph end
    for (let i = actualEnd; i < originalText.length; i++) {
      if (originalText[i] === '\n' || originalText[i] === '\r') {
        paragraphEnd = i;
        break;
      }
      if (i === originalText.length - 1) paragraphEnd = originalText.length;
    }
    
    // Extend context if too short
    const minContext = 200;
    if (actualStart - paragraphStart < minContext) {
      paragraphStart = Math.max(0, actualStart - minContext);
    }
    if (paragraphEnd - actualEnd < minContext) {
      paragraphEnd = Math.min(originalText.length, actualEnd + minContext);
    }
    
    const beforeChange = originalText.slice(paragraphStart, actualStart);
    const changeText = originalText.slice(actualStart, actualEnd);
    const afterChange = originalText.slice(actualEnd, paragraphEnd);
    
    return { 
      beforeChange, 
      changeText, 
      afterChange, 
      hasMoreBefore: paragraphStart > 0,
      hasMoreAfter: paragraphEnd < originalText.length 
    };
  }, [originalText]);

  const handleApprove = useCallback(() => {
    if (!currentChange) return;
    
    if (currentChange.changeType === 'correction') {
      onUpdateCorrection(currentChange.id, 'approved');
    } else {
      onUpdateFormatting(currentChange.id, 'approved');
    }
    
    // Move to next pending change
    if (currentIndex < pendingChanges.length - 1) {
      setCurrentIndex(prev => prev);
    }
  }, [currentChange, currentIndex, pendingChanges.length, onUpdateCorrection, onUpdateFormatting]);

  const handleReject = useCallback(() => {
    if (!currentChange) return;
    
    if (currentChange.changeType === 'correction') {
      onUpdateCorrection(currentChange.id, 'rejected');
    } else {
      onUpdateFormatting(currentChange.id, 'rejected');
    }
  }, [currentChange, onUpdateCorrection, onUpdateFormatting]);

  const handleDelete = useCallback(() => {
    if (!currentChange) return;
    
    // Delete removes text completely (sets corrected to empty string)
    if (currentChange.changeType === 'correction') {
      onUpdateCorrection(currentChange.id, 'deleted');
    } else {
      // For formatting changes, deletion means reject (keep original)
      onUpdateFormatting(currentChange.id, 'rejected');
    }
  }, [currentChange, onUpdateCorrection, onUpdateFormatting]);

  const handleSkip = useCallback(() => {
    if (currentIndex < pendingChanges.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  }, [currentIndex, pendingChanges.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'Enter') {
        e.preventDefault();
        handleApprove();
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'Backspace') {
        e.preventDefault();
        handleReject();
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'Delete') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleApprove, handleReject, handleDelete, handleSkip, handlePrevious, onClose]);

  if (!isOpen) return null;

  // All changes reviewed
  if (pendingChanges.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="vintage-card rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-[#d4a012] mb-4">اكتملت المراجعة!</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#2a4a2a]/50 rounded-lg p-4 border border-[#4a8a4a]">
              <div className="text-3xl font-bold text-[#90ee90]">{approvedChanges}</div>
              <div className="text-sm text-[#90ee90]/80">موافق عليها</div>
            </div>
            <div className="bg-[#4a2020]/50 rounded-lg p-4 border border-[#8a4040]">
              <div className="text-3xl font-bold text-[#ff6b6b]">{rejectedChanges}</div>
              <div className="text-sm text-[#ff6b6b]/80">مرفوضة</div>
            </div>
            <div className="bg-[#3a2a2a]/50 rounded-lg p-4 border border-[#6a4040]">
              <div className="text-3xl font-bold text-[#cc8888]">{deletedChanges}</div>
              <div className="text-sm text-[#cc8888]/80">محذوفة</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 btn-outline-gold rounded-lg font-medium"
            >
              مراجعة مرة أخرى
            </button>
            <button
              onClick={onComplete}
              className="flex-1 px-6 py-3 btn-gold rounded-lg font-bold"
            >
              تطبيق التغييرات
            </button>
          </div>
        </div>
      </div>
    );
  }

  const changeOriginalText = currentChange && 'original' in currentChange ? currentChange.original : (currentChange && 'text' in currentChange ? currentChange.text : '');
  const context = currentChange ? getContextText(changeOriginalText, currentChange.position) : null;
  const typeInfo = currentChange ? TYPE_LABELS[currentChange.type] || TYPE_LABELS.formatting : null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="vintage-card rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col border-2 border-[#5c4108]">
        {/* Header */}
        <div className="p-6 border-b border-[#3a3020] bg-gradient-to-r from-[#2a2318] to-[#1a1510] rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#d4a012]">مراجعة التصحيحات</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#3a3020] rounded-full transition-colors text-[#9c8560] hover:text-[#d4a012]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#9c8560]">
                التصحيح {reviewedChanges + 1} من {totalChanges}
              </span>
              <span className="text-[#9c8560]">
                متبقي {pendingChanges.length}
              </span>
            </div>
            <div className="h-2 bg-[#2a2318] rounded-full overflow-hidden border border-[#3a3020]">
              <div 
                className="h-full bg-gradient-to-r from-[#d4a012] to-[#b8860b] transition-all duration-300"
                style={{ width: `${(reviewedChanges / totalChanges) * 100}%` }}
              />
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-[#90ee90]">✓ {approvedChanges} موافق</span>
              <span className="text-[#ff6b6b]">✗ {rejectedChanges} مرفوض</span>
              <span className="text-[#cc8888]">🗑️ {deletedChanges} محذوف</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {currentChange && context && typeInfo && (() => {
          // Check if word at position matches what AI detected
          const textAtPosition = originalText.slice(currentChange.position.start, currentChange.position.end).trim();
          const detectedWord = currentChange.changeType === 'correction' 
            ? (currentChange as AICorrection).original 
            : (currentChange as FormattingChange).text;
          const positionMatches = textAtPosition === detectedWord.trim() || 
                                 textAtPosition.includes(detectedWord.trim()) ||
                                 detectedWord.trim().includes(textAtPosition);
          
          return (
            <div className="flex-1 overflow-y-auto p-6 bg-[#1a1510]">
              {/* Change type badge */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeInfo.color}`}>
                  {typeInfo.ar} / {typeInfo.en}
                </span>
                {'confidence' in currentChange && (
                  <span className="text-sm text-[#7a6545]">
                    الثقة: {Math.round(currentChange.confidence * 100)}%
                  </span>
                )}
                {!positionMatches && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-[#4a2020] text-[#ff9999] border border-[#6a3030]">
                    ⚠️ موضع غير متطابق
                  </span>
                )}
              </div>

            {/* Full context display - shows whole paragraph */}
            <div className="bg-[#2a2318] rounded-xl p-4 mb-4 font-arabic text-right border-2 border-[#3a3020] max-h-[25vh] overflow-y-auto" dir="rtl">
              <div className="text-xs text-[#7a6545] mb-2">📜 النص الكامل (الكلمة المحددة باللون الأحمر):</div>
              <div 
                className="leading-relaxed text-[#d4c4a8]"
                style={{ 
                  fontFamily: "'Amiri', 'Noto Naskh Arabic', Georgia, serif",
                  fontSize: '18px',
                  lineHeight: '2',
                }}
              >
                {context.hasMoreBefore && <span className="text-[#5c4108] text-base">... </span>}
                <span>{context.beforeChange}</span>
                <mark className="bg-[#8a2020] text-[#ffcccc] px-2 py-0.5 rounded mx-1 font-bold border-2 border-[#cc4444]">
                  {context.changeText}
                </mark>
                <span>{context.afterChange}</span>
                {context.hasMoreAfter && <span className="text-[#5c4108] text-base"> ...</span>}
              </div>
            </div>

            {/* Change details - Original vs Suggested */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-[#4a2020]/50 rounded-xl p-4 border-2 border-[#8a3030]">
                <div className="text-xs text-[#ff9999] font-bold mb-2">❌ الأصلي (الخطأ)</div>
                <div 
                  className="font-arabic text-right text-[#ff8888]" 
                  dir="rtl"
                  style={{ 
                    fontFamily: "'Amiri', 'Noto Naskh Arabic', Georgia, serif",
                    fontSize: '22px',
                    lineHeight: '1.8',
                  }}
                >
                  {/* Show actual text at position if it differs from AI's detection */}
                  {(() => {
                    if (currentChange.changeType === 'correction') {
                      const correction = currentChange as AICorrection;
                      const actualTextAtPosition = originalText.slice(correction.position.start, correction.position.end).trim();
                      const aiDetected = correction.original;
                      
                      // If actual text differs, show both
                      if (actualTextAtPosition !== aiDetected && actualTextAtPosition.length > 0) {
                        return (
                          <div>
                            <div className="text-[#ff6666] mb-2">ما اكتشفه الذكاء الاصطناعي:</div>
                            <div className="text-[#ff9999]">{aiDetected}</div>
                            <div className="text-[#ffaa66] mt-3 mb-2 border-t border-[#6a3030] pt-2">النص الفعلي في هذا الموضع:</div>
                            <div className="text-[#ff8888]">{actualTextAtPosition || '(فارغ)'}</div>
                          </div>
                        );
                      }
                      return aiDetected;
                    }
                    return (currentChange as FormattingChange).text;
                  })()}
                </div>
              </div>
              <div className="bg-[#2a4a2a]/50 rounded-xl p-4 border-2 border-[#4a8a4a]">
                <div className="text-xs text-[#99ff99] font-bold mb-2">✅ المقترح (الصحيح)</div>
                <div 
                  className="font-arabic text-right text-[#88ff88]" 
                  dir="rtl"
                  style={{ 
                    fontFamily: "'Amiri', 'Noto Naskh Arabic', Georgia, serif",
                    fontSize: '22px',
                    lineHeight: '1.8',
                  }}
                >
                  {(() => {
                    if (currentChange.changeType === 'correction') {
                      const correction = currentChange as AICorrection;
                      const corrected = correction.corrected.trim();
                      
                      // If correction is empty (for deletion), show indication
                      if (corrected === '') {
                        return <span className="text-[#99cc99] italic">(سيتم حذف النص)</span>;
                      }
                      
                      // If correction seems wrong, show it but indicate it might need review
                      if (corrected.length === 0 || corrected === correction.original) {
                        return <span className="text-[#ffcc99]">(لا يوجد تصحيح مقترح)</span>;
                      }
                      
                      return corrected;
                    }
                    return (currentChange as FormattingChange).suggestion;
                  })()}
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="bg-[#2a3a4a]/50 rounded-xl p-3 border border-[#3a4a5a]">
              <div className="text-xs text-[#88bbff] font-bold mb-1">💡 السبب</div>
              <div className="text-[#aaccff] text-sm">
                {currentChange.changeType === 'correction' 
                  ? (currentChange as AICorrection).reason 
                  : (currentChange as FormattingChange).suggestion}
              </div>
            </div>
          </div>
          );
        })()}

        {/* Actions */}
        <div className="p-6 border-t border-[#3a3020] bg-[#2a2318] rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-4 py-3 bg-[#3a3020] text-[#9c8560] rounded-lg font-medium hover:bg-[#4a4030] hover:text-[#d4a012] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="السابق (←)"
            >
              →
            </button>
            <button
              onClick={handleReject}
              className="px-6 py-3 bg-[#4a2020] text-[#ff6b6b] rounded-lg font-bold hover:bg-[#5a3030] transition-colors border border-[#6a3030]"
              title="رفض (R)"
            >
              ✗ رفض
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-3 bg-[#3a2a2a] text-[#cc8888] rounded-lg font-bold hover:bg-[#4a3a3a] transition-colors border border-[#6a4040]"
              title="حذف (D)"
            >
              🗑️ حذف
            </button>
            <button
              onClick={handleSkip}
              className="px-6 py-3 bg-[#3a3020] text-[#9c8560] rounded-lg font-medium hover:bg-[#4a4030] hover:text-[#d4a012] transition-colors"
              title="تخطي (S)"
            >
              ← تخطي
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 px-6 py-3 btn-gold rounded-lg font-bold"
              title="موافق (A أو Enter)"
            >
              ✓ موافق
            </button>
          </div>
          <div className="text-center text-xs text-[#5c4108] mt-3">
            A/Enter = موافق | R = رفض | D = حذف | S = تخطي | ← = السابق | Esc = إغلاق
          </div>
        </div>
      </div>
    </div>
  );
}
