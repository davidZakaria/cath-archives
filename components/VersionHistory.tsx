'use client';

import { useState, useEffect } from 'react';

interface Version {
  versionNumber: number;
  changes: string;
  modifiedBy?: string;
  modifiedAt: string;
  snapshot: {
    title: string;
    combinedOcrText?: string;
    combinedAiText?: string;
  };
}

interface VersionHistoryProps {
  collectionId: string;
  currentText?: string;
  language?: 'ar' | 'en';
  onRestore?: (version: Version) => void;
}

export default function VersionHistory({
  collectionId,
  currentText,
  language = 'ar',
  onRestore,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const texts = {
    title: { ar: 'سجل الإصدارات', en: 'Version History' },
    version: { ar: 'إصدار', en: 'Version' },
    changes: { ar: 'التغييرات', en: 'Changes' },
    modifiedBy: { ar: 'بواسطة', en: 'By' },
    modifiedAt: { ar: 'في', en: 'At' },
    restore: { ar: 'استعادة', en: 'Restore' },
    compare: { ar: 'مقارنة', en: 'Compare' },
    current: { ar: 'الحالي', en: 'Current' },
    noVersions: { ar: 'لا توجد إصدارات سابقة', en: 'No previous versions' },
    restoring: { ar: 'جاري الاستعادة...', en: 'Restoring...' },
    confirmRestore: { ar: 'هل تريد استعادة هذا الإصدار؟', en: 'Restore this version?' },
    yes: { ar: 'نعم', en: 'Yes' },
    cancel: { ar: 'إلغاء', en: 'Cancel' },
    close: { ar: 'إغلاق', en: 'Close' },
    additions: { ar: 'إضافات', en: 'Additions' },
    deletions: { ar: 'حذف', en: 'Deletions' },
  };

  const t = (key: keyof typeof texts) => texts[key][language];

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await fetch(`/api/collections/${collectionId}/versions`);
        const data = await response.json();
        if (data.success) {
          setVersions(data.versions || []);
        }
      } catch (error) {
        console.error('Failed to fetch versions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [collectionId]);

  const handleRestore = async (version: Version) => {
    if (!confirm(t('confirmRestore'))) return;

    setRestoring(true);
    try {
      const response = await fetch(`/api/collections/${collectionId}/versions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionNumber: version.versionNumber,
          modifiedBy: 'user',
        }),
      });

      const data = await response.json();
      if (data.success) {
        onRestore?.(version);
        // Refresh versions
        const refreshResponse = await fetch(`/api/collections/${collectionId}/versions`);
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setVersions(refreshData.versions || []);
        }
      }
    } catch (error) {
      console.error('Failed to restore version:', error);
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Simple diff calculation for comparison
  const calculateDiff = (oldText: string, newText: string) => {
    const oldLines = (oldText || '').split('\n');
    const newLines = (newText || '').split('\n');
    
    const additions = newLines.filter(line => !oldLines.includes(line)).length;
    const deletions = oldLines.filter(line => !newLines.includes(line)).length;
    
    return { additions, deletions };
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4a012]"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#2a2318] rounded-xl border border-[#3a3020]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="p-4 border-b border-[#3a3020] flex items-center justify-between">
        <h3 className="font-bold text-[#d4a012] flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('title')}
        </h3>
        <span className="text-sm text-[#7a6545]">
          {versions.length} {language === 'ar' ? 'إصدار' : 'versions'}
        </span>
      </div>

      {/* Version List */}
      <div className="max-h-96 overflow-y-auto">
        {versions.length === 0 ? (
          <div className="p-8 text-center text-[#7a6545]">
            {t('noVersions')}
          </div>
        ) : (
          <div className="divide-y divide-[#3a3020]">
            {versions.sort((a, b) => b.versionNumber - a.versionNumber).map((version) => (
              <div
                key={version.versionNumber}
                className={`p-4 hover:bg-[#3a3020]/50 transition-colors ${
                  selectedVersion?.versionNumber === version.versionNumber ? 'bg-[#3a3020]/50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Version Number */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-[#d4a012]/20 text-[#d4a012] text-sm font-bold rounded">
                        v{version.versionNumber}
                      </span>
                      <span className="text-xs text-[#7a6545]">
                        {formatDate(version.modifiedAt)}
                      </span>
                    </div>

                    {/* Changes */}
                    <p className="text-sm text-[#d4c4a8] mb-1">
                      {version.changes}
                    </p>

                    {/* Modified By */}
                    {version.modifiedBy && (
                      <p className="text-xs text-[#7a6545]">
                        {t('modifiedBy')}: {version.modifiedBy}
                      </p>
                    )}

                    {/* Diff Stats */}
                    {currentText && version.snapshot.combinedAiText && (
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        {(() => {
                          const diff = calculateDiff(
                            version.snapshot.combinedAiText || '',
                            currentText
                          );
                          return (
                            <>
                              <span className="text-green-500">+{diff.additions} {t('additions')}</span>
                              <span className="text-red-500">-{diff.deletions} {t('deletions')}</span>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedVersion(
                        selectedVersion?.versionNumber === version.versionNumber ? null : version
                      )}
                      className="px-3 py-1 text-xs bg-[#3a3020] text-[#d4c4a8] rounded hover:bg-[#4a4030] transition-colors"
                    >
                      {t('compare')}
                    </button>
                    <button
                      onClick={() => handleRestore(version)}
                      disabled={restoring}
                      className="px-3 py-1 text-xs bg-[#d4a012]/20 text-[#d4a012] rounded hover:bg-[#d4a012]/30 transition-colors disabled:opacity-50"
                    >
                      {restoring ? '...' : t('restore')}
                    </button>
                  </div>
                </div>

                {/* Expanded Comparison View */}
                {selectedVersion?.versionNumber === version.versionNumber && (
                  <div className="mt-4 p-4 bg-[#1a1510] rounded-lg border border-[#3a3020]">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Old Version */}
                      <div>
                        <h4 className="text-sm font-bold text-[#7a6545] mb-2">
                          v{version.versionNumber} - {t('title')}
                        </h4>
                        <div className="max-h-48 overflow-y-auto text-sm text-[#9c8560] bg-[#0d0a08] p-3 rounded">
                          <pre className="whitespace-pre-wrap font-sans">
                            {(version.snapshot.combinedAiText || version.snapshot.combinedOcrText || '').substring(0, 1000)}
                            {(version.snapshot.combinedAiText || version.snapshot.combinedOcrText || '').length > 1000 && '...'}
                          </pre>
                        </div>
                      </div>

                      {/* Current Version */}
                      <div>
                        <h4 className="text-sm font-bold text-[#d4a012] mb-2">
                          {t('current')}
                        </h4>
                        <div className="max-h-48 overflow-y-auto text-sm text-[#d4c4a8] bg-[#0d0a08] p-3 rounded">
                          <pre className="whitespace-pre-wrap font-sans">
                            {(currentText || '').substring(0, 1000)}
                            {(currentText || '').length > 1000 && '...'}
                          </pre>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedVersion(null)}
                      className="mt-3 text-sm text-[#7a6545] hover:text-[#d4a012]"
                    >
                      {t('close')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

