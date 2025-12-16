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
    const styles = {
      pending_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      published: 'bg-green-100 text-green-800 border-green-200',
    };
    const labels = {
      pending_review: 'في انتظار المراجعة',
      draft: 'مسودة',
      published: 'منشور',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm border ${styles[status as keyof typeof styles] || styles.draft}`}>
        {labels[status as keyof typeof labels] || status}
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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">قائمة المراجعة</h1>
              <p className="text-gray-500 text-sm mt-1">مراجعة واعتماد المقالات المرفوعة</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              رفع مقال جديد
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div
            onClick={() => setFilterStatus('pending_review')}
            className={`bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all border-2 ${
              filterStatus === 'pending_review' ? 'border-yellow-500' : 'border-transparent hover:border-yellow-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">في انتظار المراجعة</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div
            onClick={() => setFilterStatus('draft')}
            className={`bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all border-2 ${
              filterStatus === 'draft' ? 'border-gray-500' : 'border-transparent hover:border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">مسودات</p>
                <p className="text-3xl font-bold text-gray-600">{stats.draft}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
          </div>

          <div
            onClick={() => setFilterStatus('published')}
            className={`bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all border-2 ${
              filterStatus === 'published' ? 'border-green-500' : 'border-transparent hover:border-green-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">منشور</p>
                <p className="text-3xl font-bold text-green-600">{stats.published}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b">
            <nav className="flex -mb-px">
              {[
                { id: 'pending_review', label: 'في انتظار المراجعة' },
                { id: 'draft', label: 'مسودات' },
                { id: 'published', label: 'منشور' },
                { id: 'all', label: 'الكل' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id as FilterStatus)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    filterStatus === tab.id
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Collections List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">جاري التحميل...</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">لا توجد مقالات</h3>
            <p className="text-gray-500">لا توجد مقالات في هذه الحالة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {collections.map((collection) => (
              <Link
                key={collection._id}
                href={`/admin/review/${collection._id}`}
                className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="flex">
                  {/* Cover Image */}
                  <div className="w-32 h-32 bg-gray-100 flex-shrink-0 relative">
                    {collection.coverImagePath ? (
                      <Image
                        src={collection.coverImagePath}
                        alt={collection.title}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg mb-1">{collection.title}</h3>
                        
                        {/* Linked Entity */}
                        {(collection.linkedMovie || collection.linkedCharacter) && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <span className="text-amber-600">
                              {collection.linkType === 'movie' ? 'فيلم:' : 'شخصية:'}
                            </span>
                            <span>
                              {collection.linkedMovie?.arabicName || collection.linkedCharacter?.arabicName}
                              {collection.linkedMovie?.year && ` (${collection.linkedMovie.year})`}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{collection.totalPages} صفحة</span>
                          <span>•</span>
                          <span>{formatDate(collection.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
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
                  <div className="flex items-center px-4 text-gray-400">
                    <svg className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
