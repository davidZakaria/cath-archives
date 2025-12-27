'use client';

import { useMemo } from 'react';
import { AICorrection, FormattingChange, CorrectionDecisionSummary } from '@/types';

interface ChangePreviewProps {
  originalText: string;
  corrections: AICorrection[];
  formattingChanges: FormattingChange[];
  showOnlyApproved?: boolean;
}

// Type labels with styling
const TYPE_LABELS: Record<string, { label: string; bgColor: string; textColor: string }> = {
  ocr_error: { label: 'OCR', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  spelling: { label: 'Spelling', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  formatting: { label: 'Format', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '⏳' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', icon: '✓' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', icon: '✗' },
};

export default function ChangePreview({
  originalText,
  corrections,
  formattingChanges,
  showOnlyApproved = false,
}: ChangePreviewProps) {
  // Calculate summary statistics
  const summary: CorrectionDecisionSummary = useMemo(() => {
    const allChanges = [...corrections, ...formattingChanges];
    return {
      total: allChanges.length,
      approved: allChanges.filter(c => c.status === 'approved').length,
      rejected: allChanges.filter(c => c.status === 'rejected').length,
      pending: allChanges.filter(c => c.status === 'pending').length,
      byType: {
        ocr_error: {
          approved: corrections.filter(c => c.type === 'ocr_error' && c.status === 'approved').length,
          rejected: corrections.filter(c => c.type === 'ocr_error' && c.status === 'rejected').length,
        },
        spelling: {
          approved: corrections.filter(c => c.type === 'spelling' && c.status === 'approved').length,
          rejected: corrections.filter(c => c.type === 'spelling' && c.status === 'rejected').length,
        },
        formatting: {
          approved: formattingChanges.filter(c => c.status === 'approved').length,
          rejected: formattingChanges.filter(c => c.status === 'rejected').length,
        },
      },
    };
  }, [corrections, formattingChanges]);

  // Generate preview text with approved changes applied
  const previewText = useMemo(() => {
    const approvedCorrections = corrections
      .filter(c => c.status === 'approved')
      .sort((a, b) => b.position.start - a.position.start);

    let result = originalText;
    for (const correction of approvedCorrections) {
      const before = result.slice(0, correction.position.start);
      const after = result.slice(correction.position.end);
      result = before + correction.corrected + after;
    }
    return result;
  }, [originalText, corrections]);

  // Filter changes based on showOnlyApproved
  const displayedCorrections = showOnlyApproved 
    ? corrections.filter(c => c.status === 'approved')
    : corrections;

  const displayedFormatting = showOnlyApproved
    ? formattingChanges.filter(c => c.status === 'approved')
    : formattingChanges;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
        <h3 className="font-bold text-gray-800 mb-3">Change Summary</h3>
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-gray-800">{summary.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">{summary.approved}</div>
            <div className="text-xs text-green-600">Approved</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-red-600">{summary.rejected}</div>
            <div className="text-xs text-red-600">Rejected</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
            <div className="text-xs text-yellow-600">Pending</div>
          </div>
        </div>

        {/* By type breakdown */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {Object.entries(summary.byType).map(([type, counts]) => (
            <div key={type} className="bg-white rounded-lg p-2 text-center shadow-sm">
              <div className="text-xs font-medium text-gray-500 mb-1">
                {TYPE_LABELS[type]?.label || type}
              </div>
              <div className="flex justify-center gap-2 text-xs">
                <span className="text-green-600">✓{counts.approved}</span>
                <span className="text-red-600">✗{counts.rejected}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-4">
        {/* Original text */}
        <div className="bg-red-50 rounded-xl p-4">
          <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
            <span>📄</span> Original Text
          </h4>
          <div 
            className="font-arabic text-right bg-white rounded-lg p-4 max-h-64 overflow-y-auto border border-red-200"
            dir="rtl"
          >
            {originalText || <span className="text-gray-400 italic">No text</span>}
          </div>
        </div>

        {/* Preview with changes */}
        <div className="bg-green-50 rounded-xl p-4">
          <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
            <span>✨</span> With Approved Changes
          </h4>
          <div 
            className="font-arabic text-right bg-white rounded-lg p-4 max-h-64 overflow-y-auto border border-green-200"
            dir="rtl"
          >
            {previewText || <span className="text-gray-400 italic">No text</span>}
          </div>
        </div>
      </div>

      {/* Detailed change list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b bg-gray-50">
          <h4 className="font-bold text-gray-800">
            {showOnlyApproved ? 'Approved Changes' : 'All Changes'} 
            ({displayedCorrections.length + displayedFormatting.length})
          </h4>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {displayedCorrections.length === 0 && displayedFormatting.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <div>No changes to display</div>
            </div>
          ) : (
            <div className="divide-y">
              {/* Corrections */}
              {displayedCorrections.map((correction, index) => {
                const typeInfo = TYPE_LABELS[correction.type];
                const statusInfo = STATUS_STYLES[correction.status];
                
                return (
                  <div 
                    key={correction.id || index}
                    className={`p-4 ${statusInfo.bg}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Type and status badges */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeInfo.bgColor} ${typeInfo.textColor}`}>
                            {typeInfo.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                            {statusInfo.icon} {correction.status}
                          </span>
                          <span className="text-xs text-gray-400">
                            {Math.round(correction.confidence * 100)}% confident
                          </span>
                        </div>

                        {/* Before/After */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-red-600 mb-1">Before:</div>
                            <div className="font-arabic text-right bg-red-100 rounded px-2 py-1 text-red-800" dir="rtl">
                              {correction.original}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-green-600 mb-1">After:</div>
                            <div className="font-arabic text-right bg-green-100 rounded px-2 py-1 text-green-800" dir="rtl">
                              {correction.corrected}
                            </div>
                          </div>
                        </div>

                        {/* Reason */}
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Reason:</span> {correction.reason}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Formatting changes */}
              {displayedFormatting.map((change, index) => {
                const statusInfo = STATUS_STYLES[change.status];
                
                return (
                  <div 
                    key={change.id || `fmt-${index}`}
                    className={`p-4 ${statusInfo.bg}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Type and status badges */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            {change.type}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                            {statusInfo.icon} {change.status}
                          </span>
                        </div>

                        {/* Text and suggestion */}
                        <div className="font-arabic text-right bg-white rounded px-2 py-1 mb-2" dir="rtl">
                          {change.text}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Suggestion:</span> {change.suggestion}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact inline diff component for use in other places
export function InlineDiff({ 
  original, 
  corrected,
  className = ''
}: { 
  original: string; 
  corrected: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="line-through text-red-600 bg-red-50 px-1 rounded">
        {original}
      </span>
      <span className="text-gray-400">→</span>
      <span className="text-green-600 bg-green-50 px-1 rounded font-medium">
        {corrected}
      </span>
    </span>
  );
}

// Mini summary badge component
export function ChangeSummaryBadge({
  approved,
  rejected,
  pending,
}: {
  approved: number;
  rejected: number;
  pending: number;
}) {
  const total = approved + rejected + pending;
  
  if (total === 0) {
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
        No changes
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
      <span className="text-green-600">✓{approved}</span>
      <span className="text-gray-300">|</span>
      <span className="text-red-600">✗{rejected}</span>
      {pending > 0 && (
        <>
          <span className="text-gray-300">|</span>
          <span className="text-yellow-600">⏳{pending}</span>
        </>
      )}
    </span>
  );
}
