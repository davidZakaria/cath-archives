'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

interface Stats {
  totalDocuments: number;
  pendingReview: number;
  inProgress: number;
  completed: number;
  totalCollections: number;
  publishedCollections: number;
  pendingCollections: number;
  draftCollections: number;
  averageConfidence: number;
  processingOCR: number;
  failedOCR: number;
}

interface RecentCollection {
  _id: string;
  title: string;
  status: 'draft' | 'pending_review' | 'published';
  totalPages: number;
  createdAt: string;
  processingStatus: string;
}

export default function AdminDashboardPage() {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    totalDocuments: 0,
    pendingReview: 0,
    inProgress: 0,
    completed: 0,
    totalCollections: 0,
    publishedCollections: 0,
    pendingCollections: 0,
    draftCollections: 0,
    averageConfidence: 0,
    processingOCR: 0,
    failedOCR: 0,
  });
  const [recentCollections, setRecentCollections] = useState<RecentCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentCollections();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch documents
      const docsRes = await fetch('/api/documents?limit=1000');
      const docsData = await docsRes.json();
      const docs = docsData.documents || [];

      // Fetch collections with different statuses
      const [allCol, pubCol, pendCol, draftCol] = await Promise.all([
        fetch('/api/collections?limit=0').then(r => r.json()),
        fetch('/api/collections?status=published&limit=0').then(r => r.json()),
        fetch('/api/collections?status=pending_review&limit=0').then(r => r.json()),
        fetch('/api/collections?status=draft&limit=0').then(r => r.json()),
      ]);

      // Calculate document stats
      const pending = docs.filter((d: { reviewStatus: string }) => d.reviewStatus === 'pending').length;
      const inProg = docs.filter((d: { reviewStatus: string }) => d.reviewStatus === 'in_progress').length;
      const completed = docs.filter((d: { reviewStatus: string }) => d.reviewStatus === 'completed').length;
      const processing = docs.filter((d: { processingStatus: string }) => 
        d.processingStatus === 'ocr_processing' || d.processingStatus === 'ai_processing'
      ).length;
      const failed = docs.filter((d: { processingStatus: string }) => d.processingStatus === 'failed').length;

      const avgConf = docs.length > 0
        ? docs.reduce((sum: number, d: { ocrConfidence?: number }) => sum + (d.ocrConfidence || 0), 0) / docs.length
        : 0;

      setStats({
        totalDocuments: docs.length,
        pendingReview: pending,
        inProgress: inProg,
        completed: completed,
        totalCollections: allCol.pagination?.total || 0,
        publishedCollections: pubCol.pagination?.total || 0,
        pendingCollections: pendCol.pagination?.total || 0,
        draftCollections: draftCol.pagination?.total || 0,
        averageConfidence: avgConf * 100,
        processingOCR: processing,
        failedOCR: failed,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCollections = async () => {
    try {
      const res = await fetch('/api/collections?limit=5');
      const data = await res.json();
      setRecentCollections(data.collections || []);
    } catch (error) {
      console.error('Failed to fetch recent collections:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: 'bg-green-100 text-green-700',
      pending_review: 'bg-yellow-100 text-yellow-700',
      draft: 'bg-slate-100 text-slate-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {t(`status.${status}`)}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('dashboard.title')}</h1>
        <p className="text-slate-500 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collections */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('dashboard.totalCollections')}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalCollections}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <span className="text-green-600">✓ {stats.publishedCollections} {t('dashboard.published')}</span>
            <span className="text-yellow-600">◉ {stats.pendingCollections} {t('dashboard.inReview')}</span>
            <span className="text-slate-500">○ {stats.draftCollections} {t('dashboard.draft')}</span>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('dashboard.totalDocuments')}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalDocuments}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <span className="text-green-600">✓ {stats.completed} {t('dashboard.completed')}</span>
            <span className="text-blue-600">◉ {stats.inProgress} {t('dashboard.inProgress')}</span>
            <span className="text-slate-500">○ {stats.pendingReview} {t('dashboard.pending')}</span>
          </div>
        </div>

        {/* OCR Queue */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('dashboard.processingQueue')}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.processingOCR}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            {stats.failedOCR > 0 ? (
              <span className="text-red-600">⚠ {stats.failedOCR} {t('dashboard.failed')}</span>
            ) : (
              <span className="text-green-600">✓ {t('dashboard.noErrors')}</span>
            )}
          </div>
        </div>

        {/* Average Confidence */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('dashboard.avgOcrAccuracy')}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.averageConfidence.toFixed(1)}%</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              stats.averageConfidence >= 80 ? 'bg-green-100' : 'bg-amber-100'
            }`}>
              <svg className={`w-6 h-6 ${stats.averageConfidence >= 80 ? 'text-green-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${stats.averageConfidence >= 80 ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(stats.averageConfidence, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Collections */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-900 mb-4">{t('dashboard.quickActions')}</h2>
          <div className="space-y-3">
            <Link
              href="/admin/upload"
              className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>{t('dashboard.uploadNew')}</span>
            </Link>
            
            <Link
              href="/admin/review"
              className="flex items-center gap-3 p-3 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>{t('dashboard.reviewPending')} ({stats.pendingCollections} {t('dashboard.waitingReview')})</span>
            </Link>
            
            <Link
              href="/admin/ocr-queue"
              className="flex items-center gap-3 p-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{t('dashboard.processingQueue')} ({stats.processingOCR})</span>
            </Link>
            
            <Link
              href="/admin/collections"
              className="flex items-center gap-3 p-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>{t('dashboard.manageCollections')}</span>
            </Link>
          </div>
        </div>

        {/* Recent Collections */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">{t('dashboard.recentCollections')}</h2>
            <Link href="/admin/collections" className="text-sm text-blue-600 hover:text-blue-700">
              {t('dashboard.viewAll')} →
            </Link>
          </div>
          
          {recentCollections.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p>{t('dashboard.noCollections')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCollections.map((col) => (
                <Link
                  key={col._id}
                  href={`/admin/review/${col._id}`}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{col.title}</p>
                      <p className="text-xs text-slate-500">{col.totalPages} {t('dashboard.pages')} • {formatDate(col.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(col.status)}
                    <svg className={`w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors ${language === 'ar' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="font-bold text-slate-900 mb-4">{t('dashboard.systemStatus')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <p className="text-sm font-medium text-green-700">{t('dashboard.database')}</p>
              <p className="text-xs text-green-600">{t('dashboard.connected')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <p className="text-sm font-medium text-green-700">Google Vision OCR</p>
              <p className="text-xs text-green-600">{t('dashboard.active')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <p className="text-sm font-medium text-green-700">OpenAI API</p>
              <p className="text-xs text-green-600">{t('dashboard.active')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <p className="text-sm font-medium text-green-700">{t('dashboard.storage')}</p>
              <p className="text-xs text-green-600">{t('dashboard.available')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
