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

  // Reset index when changes update
  useEffect(() => {
    if (currentIndex >= pendingChanges.length && pendingChanges.length > 0) {
      setCurrentIndex(0);
    }
  }, [pendingChanges.length, currentIndex]);

  // Get context around the change (surrounding text)
  const getContextText = useCallback((position: { start: number; end: number }, contextSize: number = 50) => {
    const start = Math.max(0, position.start - contextSize);
    const end = Math.min(originalText.length, position.end + contextSize);
    
    const beforeChange = originalText.slice(start, position.start);
    const changeText = originalText.slice(position.start, position.end);
    const afterChange = originalText.slice(position.end, end);
    
    return { beforeChange, changeText, afterChange, hasMore: start > 0 || end < originalText.length };
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
  }, [isOpen, handleApprove, handleReject, handleSkip, handlePrevious, onClose]);

  if (!isOpen) return null;

  // All changes reviewed
  if (pendingChanges.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="vintage-card rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-[#d4a012] mb-4">اكتملت المراجعة!</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#2a4a2a]/50 rounded-lg p-4 border border-[#4a8a4a]">
              <div className="text-3xl font-bold text-[#90ee90]">{approvedChanges}</div>
              <div className="text-sm text-[#90ee90]/80">موافق عليها</div>
            </div>
            <div className="bg-[#4a2020]/50 rounded-lg p-4 border border-[#8a4040]">
              <div className="text-3xl font-bold text-[#ff6b6b]">{rejectedChanges}</div>
              <div className="text-sm text-[#ff6b6b]/80">مرفوضة</div>
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

  const context = currentChange ? getContextText(currentChange.position) : null;
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
            </div>
          </div>
        </div>

        {/* Content */}
        {currentChange && context && typeInfo && (
          <div className="flex-1 overflow-y-auto p-6 bg-[#1a1510]">
            {/* Change type badge */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeInfo.color}`}>
                {typeInfo.ar} / {typeInfo.en}
              </span>
              <span className="text-sm text-[#7a6545]">
                الثقة: {Math.round(currentChange.confidence * 100)}%
              </span>
            </div>

            {/* Context display */}
            <div className="bg-[#2a2318] rounded-xl p-4 mb-4 font-arabic text-right border border-[#3a3020]" dir="rtl">
              <div className="text-lg leading-relaxed text-[#d4c4a8]">
                {context.hasMore && <span className="text-[#5c4108]">...</span>}
                <span>{context.beforeChange}</span>
                <span className="bg-[#4a2020] text-[#ff6b6b] px-1 rounded line-through mx-1">
                  {context.changeText}
                </span>
                <span>{context.afterChange}</span>
                {context.hasMore && <span className="text-[#5c4108]">...</span>}
              </div>
            </div>

            {/* Change details */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#4a2020]/30 rounded-xl p-4 border border-[#6a3030]">
                <div className="text-xs text-[#ff6b6b] font-medium mb-2">الأصلي</div>
                <div className="font-arabic text-right text-lg text-[#ff6b6b]" dir="rtl">
                  {currentChange.original}
                </div>
              </div>
              <div className="bg-[#2a4a2a]/30 rounded-xl p-4 border border-[#4a8a4a]">
                <div className="text-xs text-[#90ee90] font-medium mb-2">المقترح</div>
                <div className="font-arabic text-right text-lg text-[#90ee90]" dir="rtl">
                  {currentChange.changeType === 'correction' 
                    ? (currentChange as AICorrection).corrected 
                    : (currentChange as FormattingChange).suggestion}
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="bg-[#2a3a4a]/30 rounded-xl p-4 border border-[#3a4a5a]">
              <div className="text-xs text-[#60a5fa] font-medium mb-2">السبب</div>
              <div className="text-[#60a5fa]">
                {currentChange.changeType === 'correction' 
                  ? (currentChange as AICorrection).reason 
                  : (currentChange as FormattingChange).suggestion}
              </div>
            </div>
          </div>
        )}

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
              className="flex-1 px-6 py-3 bg-[#4a2020] text-[#ff6b6b] rounded-lg font-bold hover:bg-[#5a3030] transition-colors border border-[#6a3030]"
              title="رفض (R)"
            >
              ✗ رفض
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
            A/Enter = موافق | R = رفض | S = تخطي | ← = السابق | Esc = إغلاق
          </div>
        </div>
      </div>
    </div>
  );
}
