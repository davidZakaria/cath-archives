'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ImageViewer from './ImageViewer';
import TextEditor from './TextEditor';
import { IDocument } from '@/types';

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
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  // Timer effect
  useEffect(() => {
    if (!hasStarted) return;
    
    const interval = setInterval(() => {
      setReviewTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted]);

  // Start review on mount if not started
  useEffect(() => {
    if (document.reviewStatus === 'pending') {
      startReview();
    }
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 30000); // Auto-save every 30 seconds

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [verifiedText, reviewNotes, correctionsCount]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveDraft();
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        completeReview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [verifiedText, reviewNotes, correctionsCount, reviewTime]);

  const startReview = async () => {
    try {
      await fetch(`/api/documents/${document._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewStatus: 'in_progress',
          reviewStartedAt: new Date().toISOString(),
        }),
      });
      setHasStarted(true);
      startTimeRef.current = Date.now();
    } catch (error) {
      console.error('Error starting review:', error);
    }
  };

  const saveDraft = async () => {
    if (saving) return;
    
    setSaving(true);
    try {
      await fetch(`/api/documents/${document._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedText,
          reviewNotes,
          correctionsCount,
          reviewTimeSeconds: reviewTime,
        }),
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const completeReview = async () => {
    if (saving) return;

    const confirmed = window.confirm(
      'Mark this document as reviewed and completed? You can still edit it later.'
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await fetch(`/api/documents/${document._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedText,
          reviewNotes,
          correctionsCount,
          reviewStatus: 'completed',
          reviewCompletedAt: new Date().toISOString(),
          reviewTimeSeconds: reviewTime,
        }),
      });
      
      alert('Document marked as completed!');
      router.push('/review');
      router.refresh();
    } catch (error) {
      console.error('Error completing review:', error);
      alert('Failed to complete review');
    } finally {
      setSaving(false);
    }
  };

  const handleTextChange = (newText: string, corrections: number) => {
    setVerifiedText(newText);
    setCorrectionsCount(corrections);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get low confidence blocks for highlighting
  const lowConfidenceBlocks = document.ocrBlocks
    ?.filter((block) => block.confidence < 0.7)
    .map((block) => ({
      x: block.boundingBox.x,
      y: block.boundingBox.y,
      width: block.boundingBox.width,
      height: block.boundingBox.height,
      confidence: block.confidence,
    })) || [];

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300 p-5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push('/review')}
            className="px-4 py-2 text-gray-700 hover:text-white hover:bg-blue-600 font-medium rounded-lg border-2 border-gray-300 hover:border-blue-600 transition-all"
          >
            ← Back to Queue
          </button>
          <h1 className="text-xl font-bold text-gray-800">📄 {document.filename}</h1>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
            (document.ocrConfidence || 0) > 0.7 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            🎯 Confidence: {Math.round((document.ocrConfidence || 0) * 100)}%
          </span>
          <span className="text-sm font-medium text-gray-700 bg-white px-3 py-1 rounded-full border-2 border-gray-300">
            ⏱️ {formatTime(reviewTime)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {saving && <span className="text-sm font-medium text-blue-600 animate-pulse">💾 Saving...</span>}
          <button
            onClick={saveDraft}
            disabled={saving}
            className="px-5 py-2 bg-white hover:bg-blue-50 border-2 border-blue-400 text-blue-700 font-medium rounded-lg disabled:opacity-50 transition-all shadow-sm"
            title="Save Draft (Ctrl+S)"
          >
            💾 Save Draft
          </button>
          <button
            onClick={completeReview}
            disabled={saving}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50 transition-all shadow-md"
            title="Mark as Completed (Ctrl+Enter)"
          >
            ✓ Complete Review
          </button>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Image Viewer */}
        <div className="w-1/2 border-r">
          <ImageViewer
            imagePath={document.imagePath}
            alt={document.filename}
            lowConfidenceBlocks={lowConfidenceBlocks}
          />
        </div>

        {/* Right: Text Editor */}
        <div className="w-1/2 flex flex-col">
          <TextEditor
            initialText={verifiedText}
            onChange={handleTextChange}
            originalOcrText={document.ocrText}
          />
          
          {/* Notes Section */}
          <div className="border-t-2 border-gray-300 p-6 bg-gradient-to-r from-gray-50 to-gray-100">
            <label className="block text-base font-bold text-gray-800 mb-3">
              📝 Review Notes (optional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="w-full h-24 px-4 py-3 border-2 border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base shadow-sm"
              placeholder="Add any notes about this document (quality issues, uncertainties, etc.)..."
              style={{ fontSize: '15px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

