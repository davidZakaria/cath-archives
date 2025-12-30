'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LinkedEntity {
  _id: string;
  arabicName: string;
  englishName?: string;
  year?: number;
  type?: string;
}

interface Collection {
  _id: string;
  title: string;
  totalPages: number;
  ocrCompletedPages: number;
  status: 'draft' | 'pending_review' | 'published';
  processingStatus: string;
  coverImagePath?: string;
  linkedMovie?: LinkedEntity;
  linkedCharacter?: LinkedEntity;
  linkType?: 'movie' | 'character';
  createdAt: string;
  accuracyScore?: number;
}

type FilterStatus = 'all' | 'pending_review' | 'draft' | 'published';

export default function ReviewQueuePage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending_review');
  const [stats, setStats] = useState({ pending: 0, draft: 0, published: 0 });

  useEffect(() => {
    fetchCollections();
  }, [filterStatus]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [pendingRes, draftRes, publishedRes] = await Promise.all([
        fetch('/api/collections?status=pending_review&limit=0'),
        fetch('/api/collections?status=draft&limit=0'),
        fetch('/api/collections?status=published&limit=0'),
      ]);

      const [pending, draft, published] = await Promise.all([
        pendingRes.json(),
        draftRes.json(),
        publishedRes.json(),
      ]);

      setStats({
        pending: pending.pagination?.total || 0,
        draft: draft.pagination?.total || 0,
        published: published.pagination?.total || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const statusParam = filterStatus === 'all' ? '' : `&status=${filterStatus}`;
      const response = await fetch(`/api/collections?limit=50${statusParam}`);
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_review: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      draft: 'bg-slate-100 text-slate-700 border-slate-200',
      published: 'bg-green-100 text-green-700 border-green-200',
    };
    const labels: Record<string, string> = {
      pending_review: 'في المراجعة',
      draft: 'مسودة',
      published: 'منشور',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">قائمة المراجعة</h1>
          <p className="text-slate-500 mt-1">مراجعة واعتماد المقالات المرفوعة</p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          رفع مقال جديد
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setFilterStatus('pending_review')}
          className={`p-6 rounded-xl shadow-sm transition-all border-2 ${
            filterStatus === 'pending_review' 
              ? 'border-yellow-500 bg-yellow-50' 
              : 'border-transparent bg-white hover:border-yellow-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-500 text-sm">في انتظار المراجعة</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilterStatus('draft')}
          className={`p-6 rounded-xl shadow-sm transition-all border-2 ${
            filterStatus === 'draft' 
              ? 'border-slate-500 bg-slate-50' 
              : 'border-transparent bg-white hover:border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-500 text-sm">مسودات</p>
              <p className="text-3xl font-bold text-slate-600 mt-1">{stats.draft}</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilterStatus('published')}
          className={`p-6 rounded-xl shadow-sm transition-all border-2 ${
            filterStatus === 'published' 
              ? 'border-green-500 bg-green-50' 
              : 'border-transparent bg-white hover:border-green-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-slate-500 text-sm">منشور</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.published}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </button>
      </div>

      {/* Filter Tabs & Collections List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex">
            {[
              { id: 'pending_review', label: 'في انتظار المراجعة' },
              { id: 'draft', label: 'مسودات' },
              { id: 'published', label: 'منشور' },
              { id: 'all', label: 'الكل' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as FilterStatus)}
                className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                  filterStatus === tab.id
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                {filterStatus === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Collections List */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">جاري التحميل...</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-slate-900 mb-1">لا توجد مقالات</h3>
            <p className="text-slate-500">لا توجد مقالات في هذه الحالة</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {collections.map((collection) => (
              <Link
                key={collection._id}
                href={`/admin/review/${collection._id}`}
                className="flex p-4 hover:bg-slate-50 transition-colors group"
              >
                {/* Cover Image */}
                <div className="w-20 h-28 bg-slate-200 rounded-lg flex-shrink-0 relative overflow-hidden">
                  {collection.coverImagePath ? (
                    <Image
                      src={collection.coverImagePath}
                      alt={collection.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 mr-4 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {collection.title}
                      </h3>
                      
                      {/* Linked Entity */}
                      {(collection.linkedMovie || collection.linkedCharacter) && (
                        <p className="text-sm text-slate-500 mt-1">
                          <span className="text-blue-600">
                            {collection.linkType === 'movie' ? '🎬 ' : '⭐ '}
                          </span>
                          {collection.linkedMovie?.arabicName || collection.linkedCharacter?.arabicName}
                          {collection.linkedMovie?.year && ` (${collection.linkedMovie.year})`}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                        <span>{collection.totalPages} صفحة</span>
                        <span>•</span>
                        <span>{formatDate(collection.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        {/* Accuracy Badge */}
                        {collection.accuracyScore !== undefined && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            collection.accuracyScore >= 90 
                              ? 'bg-green-100 text-green-700' 
                              : collection.accuracyScore >= 70 
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            دقة {collection.accuracyScore}%
                          </span>
                        )}
                        {getStatusBadge(collection.status)}
                      </div>
                      {collection.processingStatus !== 'completed' && (
                        <span className="text-xs text-blue-600">
                          جاري المعالجة ({collection.ocrCompletedPages}/{collection.totalPages})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 self-center text-slate-400 group-hover:text-blue-600 transition-colors">
                  <svg className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
