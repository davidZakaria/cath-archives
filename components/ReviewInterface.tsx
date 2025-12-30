'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ImageViewer from './ImageViewer';
import TextEditor from './TextEditor';
import ChangeReviewModal from './ChangeReviewModal';
import ChangePreview, { ChangeSummaryBadge } from './ChangePreview';
import PageReorderPanel from './PageReorderPanel';
import { IDocument, AICorrection, FormattingChange, CorrectionStatus, PageLayout, TextBlock } from '@/types';

interface ReviewInterfaceProps {
  document: IDocument;
}

export default function ReviewInterface({ document }: ReviewInterfaceProps) {
  const [verifiedText, setVerifiedText] = useState(document.verifiedText || document.ocrText);
  const [reviewNotes, setReviewNotes] = useState(document.reviewNotes || '');
  const [correctionsCount, setCorrectionsCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [reviewTime, setReviewTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(document.reviewStatus === 'in_progress');
  const router = useRouter();
  const startTimeRef = useRef<number>(Date.now());
  const autoSaveTimerRef = useRef<NodeJS.Timeout>(undefined);

  // AI Correction states
  const [corrections, setCorrections] = useState<AICorrection[]>(document.pendingCorrections || []);
  const [formattingChanges, setFormattingChanges] = useState<FormattingChange[]>(document.pendingFormattingChanges || []);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showChangeReviewModal, setShowChangeReviewModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPageReorder, setShowPageReorder] = useState(false);
  const [aiDetectionCost, setAiDetectionCost] = useState<number | null>(document.aiDetectionCost || null);
  
  const [pages, setPages] = useState<PageLayout[]>(() => {
    if (document.ocrBlocks && document.ocrBlocks.length > 0) {
      return [{
        pageNumber: 1,
        documentId: document._id,
        order: 1,
        textBlocks: document.ocrBlocks.map((block, index) => ({
          id: `block_${index}`,
          text: block.text,
          boundingBox: block.boundingBox,
          order: index + 1,
          blockType: block.blockType || 'body',
        })),
      }];
    }
    return [];
  });

  const approvedCount = corrections.filter(c => c.status === 'approved').length + 
                        formattingChanges.filter(f => f.status === 'approved').length;
  const rejectedCount = corrections.filter(c => c.status === 'rejected').length + 
                        formattingChanges.filter(f => f.status === 'rejected').length;
  const pendingCount = corrections.filter(c => c.status === 'pending').length + 
                       formattingChanges.filter(f => f.status === 'pending').length;

  useEffect(() => {
    if (!hasStarted) return;
    const interval = setInterval(() => {
      setReviewTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [hasStarted]);

  useEffect(() => {
    if (document.reviewStatus === 'pending') {
      startReview();
    }
  }, []);

  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => saveDraft(), 30000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [verifiedText, reviewNotes, correctionsCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveDraft(); } 
      else if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); completeReview(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [verifiedText, reviewNotes, correctionsCount, reviewTime]);

  const startReview = async () => {
    try {
      await fetch(`/api/documents/${document._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus: 'in_progress', reviewStartedAt: new Date().toISOString() }),
      });
      setHasStarted(true);
      startTimeRef.current = Date.now();
    } catch (error) { console.error('Error starting review:', error); }
  };

  const saveDraft = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await fetch(`/api/documents/${document._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedText, reviewNotes, correctionsCount, reviewTimeSeconds: reviewTime,
          pendingCorrections: corrections, pendingFormattingChanges: formattingChanges,
          approvedCorrectionsCount: approvedCount, rejectedCorrectionsCount: rejectedCount,
        }),
      });
    } catch (error) { console.error('Error saving draft:', error); alert('فشل حفظ المسودة'); }
    finally { setSaving(false); }
  };

  const completeReview = async () => {
    if (saving) return;
    if (pendingCount > 0) {
      const proceed = window.confirm(`لديك ${pendingCount} اقتراحات من الذكاء الاصطناعي لم تراجعها. هل تريد المتابعة؟`);
      if (!proceed) { setShowChangeReviewModal(true); return; }
    }
    const confirmed = window.confirm('هل تريد تأكيد اكتمال المراجعة؟ يمكنك التعديل لاحقاً');
    if (!confirmed) return;
    setSaving(true);
    try {
      await fetch(`/api/documents/${document._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedText, reviewNotes, correctionsCount, reviewStatus: 'completed',
          reviewCompletedAt: new Date().toISOString(), reviewTimeSeconds: reviewTime,
          pendingCorrections: corrections, pendingFormattingChanges: formattingChanges,
          approvedCorrectionsCount: approvedCount, rejectedCorrectionsCount: rejectedCount,
        }),
      });
      alert('تم إكمال المراجعة بنجاح! ✓');
      router.push('/review');
      router.refresh();
    } catch (error) { console.error('Error completing review:', error); alert('فشل إكمال المراجعة'); }
    finally { setSaving(false); }
  };

  const handleTextChange = (newText: string, corrections: number) => {
    setVerifiedText(newText);
    setCorrectionsCount(corrections);
  };

  const runAIDetection = async () => {
    if (isDetecting) return;
    setIsDetecting(true);
    try {
      const response = await fetch(`/api/corrections/${document._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: verifiedText }),
      });
      if (!response.ok) throw new Error('AI detection failed');
      const data = await response.json();
      setCorrections(data.corrections || []);
      setFormattingChanges(data.formattingChanges || []);
      setAiDetectionCost(data.cost || 0);
      if ((data.corrections?.length || 0) + (data.formattingChanges?.length || 0) > 0) {
        setShowChangeReviewModal(true);
      } else { alert('لا توجد تصحيحات مطلوبة! النص يبدو جيداً ✓'); }
    } catch (error) { console.error('AI detection error:', error); alert('فشل تشغيل الذكاء الاصطناعي. حاول مرة أخرى'); }
    finally { setIsDetecting(false); }
  };

  const handleUpdateCorrection = useCallback((id: string, status: CorrectionStatus) => {
    setCorrections(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  }, []);

  const handleUpdateFormatting = useCallback((id: string, status: CorrectionStatus) => {
    setFormattingChanges(prev => prev.map(f => f.id === id ? { ...f, status } : f));
  }, []);

  const applyApprovedCorrections = useCallback(() => {
    const approved = corrections.filter(c => c.status === 'approved').sort((a, b) => b.position.start - a.position.start);
    let result = verifiedText;
    for (const correction of approved) {
      result = result.slice(0, correction.position.start) + correction.corrected + result.slice(correction.position.end);
    }
    setVerifiedText(result);
    setCorrectionsCount(prev => prev + approved.length);
    setShowChangeReviewModal(false);
    setShowPreview(true);
  }, [corrections, verifiedText]);

  const handleReorderPages = useCallback((newPages: PageLayout[]) => setPages(newPages), []);
  const handleReorderBlocks = useCallback((pageIndex: number, newBlocks: TextBlock[]) => {
    setPages(prev => { const updated = [...prev]; updated[pageIndex] = { ...updated[pageIndex], textBlocks: newBlocks }; return updated; });
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const lowConfidenceBlocks = document.ocrBlocks?.filter((block) => block.confidence < 0.7).map((block) => ({
    x: block.boundingBox.x, y: block.boundingBox.y, width: block.boundingBox.width, height: block.boundingBox.height, confidence: block.confidence,
  })) || [];

  return (
    <div className="h-screen flex flex-col bg-[#0f0c08]">
      {/* Rotana Cinema Zaman Header */}
      <div className="rotana-header px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/review')}
              className="btn-outline-gold px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              العودة
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#2a2318] to-[#1a1510] border-2 border-[#5c4108] flex items-center justify-center overflow-hidden">
                <span className="text-2xl">🎞️</span>
              </div>
              <div>
                <h1 className="text-[#c9a227] font-bold text-lg truncate max-w-[300px] arabic-title">{document.filename}</h1>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`flex items-center gap-1 ${
                    (document.ocrConfidence || 0) > 0.7 ? 'text-[#90ee90]' : 'text-[#e8d48b]'
                  }`}>
                    <span>🎯</span>
                    {Math.round((document.ocrConfidence || 0) * 100)}%
                  </span>
                  <span className="text-[#9c8550] flex items-center gap-1">
                    <span>⏱️</span>
                    {formatTime(reviewTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center - AI Controls */}
          <div className="flex items-center gap-3">
            {/* Main AI Detection Button - PROMINENT */}
            <button
              onClick={runAIDetection}
              disabled={isDetecting || saving}
              className={`px-8 py-3 rounded-xl font-bold text-lg transition-all flex items-center gap-3 ${
                isDetecting 
                  ? 'bg-[#3a3020] text-[#c9a227] cursor-wait'
                  : 'bg-gradient-to-r from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] hover:from-[#a78bfa] hover:via-[#8b5cf6] hover:to-[#7c3aed] text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105'
              }`}
              title="تشغيل الذكاء الاصطناعي للكشف عن الأخطاء"
            >
              {isDetecting ? (
                <>
                  <div className="w-6 h-6 border-3 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
                  <span>جاري التحليل...</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">🤖</span>
                  <span>الذكاء الاصطناعي</span>
                </>
              )}
            </button>

            {/* Corrections Badge */}
            {(corrections.length > 0 || formattingChanges.length > 0) && (
              <button
                onClick={() => setShowChangeReviewModal(true)}
                className="vintage-card px-4 py-2 rounded-xl hover:border-[#c9a227] transition-all flex items-center gap-2"
                title="مراجعة التصحيحات"
              >
                <span className="text-[#c9a227]">📝</span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#90ee90]">✓{approvedCount}</span>
                  <span className="text-[#5c4108]">|</span>
                  <span className="text-[#ff6b6b]">✗{rejectedCount}</span>
                  {pendingCount > 0 && (
                    <>
                      <span className="text-[#5c4108]">|</span>
                      <span className="text-[#e8d48b]">⏳{pendingCount}</span>
                    </>
                  )}
                </div>
              </button>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-[#c9a227] text-sm flex items-center gap-2 animate-pulse">
                <div className="w-4 h-4 border-2 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
                جاري الحفظ...
              </span>
            )}

            {approvedCount > 0 && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  showPreview ? 'bg-[#c9a227] text-[#1a1612]' : 'btn-outline-gold'
                }`}
              >
                👁️ معاينة
              </button>
            )}

            {pages.length > 0 && (
              <button onClick={() => setShowPageReorder(true)} className="btn-outline-gold px-4 py-2 rounded-lg text-sm font-medium">
                📄 ترتيب
              </button>
            )}

            <button onClick={saveDraft} disabled={saving} className="btn-outline-gold px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" title="Ctrl+S">
              💾 حفظ
            </button>
            
            <button
              onClick={completeReview}
              disabled={saving || pendingCount > 0}
              className="btn-rotana px-6 py-2 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
              title={pendingCount > 0 ? "راجع جميع التصحيحات أولاً" : "Ctrl+Enter"}
            >
              <span>✓</span>
              إكمال المراجعة
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Image Viewer */}
        <div className="w-1/2 border-r-2 border-[#3a3020] bg-[#0a0805]">
          <ImageViewer imagePath={document.imagePath} alt={document.filename} lowConfidenceBlocks={lowConfidenceBlocks} />
        </div>

        {/* Right: Text Editor */}
        <div className="w-1/2 flex flex-col bg-[#1a1612]">
          <TextEditor initialText={verifiedText} onChange={handleTextChange} originalOcrText={document.ocrText} />
          
          {/* Notes Section */}
          <div className="border-t-2 border-[#3a3020] p-5 bg-gradient-to-r from-[#1a1612] to-[#0f0c08]">
            <label className="block text-sm font-bold text-[#c9a227] mb-2">
              📝 ملاحظات المراجعة
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="vintage-input w-full h-20 px-4 py-3 rounded-lg resize-none text-sm"
              placeholder="أضف ملاحظاتك هنا..."
              dir="rtl"
            />
            {aiDetectionCost !== null && (
              <div className="mt-2 text-xs text-[#7a6540] flex items-center gap-2">
                <span>💰</span>
                تكلفة التحليل: ${aiDetectionCost.toFixed(6)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="fixed inset-y-0 right-0 w-1/2 bg-[#1a1612] shadow-2xl z-40 overflow-y-auto border-l-2 border-[#c9a227]">
          <div className="sticky top-0 bg-[#2a2318] border-b border-[#3a3020] p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#c9a227] arabic-title">معاينة التغييرات</h2>
            <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-[#3a3020] rounded-full text-[#9c8550] hover:text-[#c9a227] transition-colors">✕</button>
          </div>
          <div className="p-6">
            <ChangePreview originalText={document.ocrText} corrections={corrections} formattingChanges={formattingChanges} />
          </div>
        </div>
      )}

      {/* Change Review Modal */}
      <ChangeReviewModal
        isOpen={showChangeReviewModal}
        onClose={() => setShowChangeReviewModal(false)}
        corrections={corrections}
        formattingChanges={formattingChanges}
        originalText={verifiedText}
        onUpdateCorrection={handleUpdateCorrection}
        onUpdateFormatting={handleUpdateFormatting}
        onComplete={applyApprovedCorrections}
      />

      {/* Page Reorder Panel */}
      {showPageReorder && (
        <PageReorderPanel pages={pages} onReorderPages={handleReorderPages} onReorderBlocks={handleReorderBlocks} onClose={() => setShowPageReorder(false)} />
      )}
    </div>
  );
}
