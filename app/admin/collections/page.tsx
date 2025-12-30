'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LinkedEntity {
  _id: string;
  arabicName: string;
  englishName?: string;
  year?: number;
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
  updatedAt: string;
  publishedAt?: string;
  accuracyScore?: number;
}

type FilterStatus = 'all' | 'draft' | 'pending_review' | 'published';
type SortBy = 'createdAt' | 'updatedAt' | 'title' | 'status';

export default function CollectionsManagerPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ all: 0, draft: 0, pending_review: 0, published: 0 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = filterStatus === 'all' ? '' : `&status=${filterStatus}`;
      const response = await fetch(`/api/collections?limit=100${statusParam}`);
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  const fetchStats = useCallback(async () => {
    try {
      const [allRes, draftRes, pendingRes, pubRes] = await Promise.all([
        fetch('/api/collections?limit=0'),
        fetch('/api/collections?status=draft&limit=0'),
        fetch('/api/collections?status=pending_review&limit=0'),
        fetch('/api/collections?status=published&limit=0'),
      ]);
      const [all, draft, pending, pub] = await Promise.all([
        allRes.json(), draftRes.json(), pendingRes.json(), pubRes.json()
      ]);
      setStats({
        all: all.pagination?.total || 0,
        draft: draft.pagination?.total || 0,
        pending_review: pending.pagination?.total || 0,
        published: pub.pagination?.total || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
    fetchStats();
  }, [fetchCollections, fetchStats]);

  // Filter and sort collections
  const filteredCollections = collections
    .filter(col => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        col.title.toLowerCase().includes(query) ||
        col.linkedMovie?.arabicName.toLowerCase().includes(query) ||
        col.linkedCharacter?.arabicName.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime();
    });

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.size === filteredCollections.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCollections.map(c => c._id)));
    }
  };

  // Handle individual selection
  const handleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Update status
  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const body: Record<string, unknown> = { status };
      if (status === 'published') {
        body.publishedAt = new Date().toISOString();
      }
      
      const response = await fetch(`/api/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'تم تحديث الحالة بنجاح' });
        fetchCollections();
        fetchStats();
      } else {
        setMessage({ type: 'error', text: 'فشل في تحديث الحالة' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ' });
    } finally {
      setActionLoading(null);
    }
  };

  // Delete collection
  const deleteCollection = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }
    
    setActionLoading(id);
    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'تم الحذف بنجاح' });
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        fetchCollections();
        fetchStats();
      } else {
        setMessage({ type: 'error', text: 'فشل في الحذف' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ' });
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk delete
  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} مجموعة؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      return;
    }
    
    setActionLoading('bulk');
    let success = 0;
    let failed = 0;
    
    for (const id of selectedIds) {
      try {
        const response = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
        if (response.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    
    setSelectedIds(new Set());
    setMessage({
      type: failed === 0 ? 'success' : 'error',
      text: `تم حذف ${success} مجموعة${failed > 0 ? ` - فشل ${failed}` : ''}`
    });
    fetchCollections();
    fetchStats();
    setActionLoading(null);
  };

  // Bulk status update
  const bulkStatusUpdate = async (status: string) => {
    if (selectedIds.size === 0) return;
    
    setActionLoading('bulk');
    let success = 0;
    let failed = 0;
    
    for (const id of selectedIds) {
      try {
        const body: Record<string, unknown> = { status };
        if (status === 'published') {
          body.publishedAt = new Date().toISOString();
        }
        
        const response = await fetch(`/api/collections/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (response.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    
    setSelectedIds(new Set());
    setMessage({
      type: failed === 0 ? 'success' : 'error',
      text: `تم تحديث ${success} مجموعة${failed > 0 ? ` - فشل ${failed}` : ''}`
    });
    fetchCollections();
    fetchStats();
    setActionLoading(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: 'bg-green-100 text-green-700 border-green-200',
      pending_review: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      draft: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    const labels: Record<string, string> = {
      published: 'منشور',
      pending_review: 'في المراجعة',
      draft: 'مسودة',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة المجموعات</h1>
          <p className="text-slate-500 mt-1">عرض وتعديل وحذف المجموعات</p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>رفع مجموعة جديدة</span>
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-left text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Stats Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {[
            { id: 'all', label: 'الكل', count: stats.all },
            { id: 'draft', label: 'مسودات', count: stats.draft },
            { id: 'pending_review', label: 'في المراجعة', count: stats.pending_review },
            { id: 'published', label: 'منشور', count: stats.published },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as FilterStatus)}
              className={`flex-1 px-4 py-4 text-sm font-medium transition-colors relative ${
                filterStatus === tab.id
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span className={`mr-2 px-2 py-0.5 rounded-full text-xs ${
                filterStatus === tab.id ? 'bg-blue-100' : 'bg-slate-100'
              }`}>
                {tab.count}
              </span>
              {filterStatus === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث..."
                className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="createdAt">الأحدث إنشاءً</option>
            <option value="updatedAt">الأحدث تعديلاً</option>
            <option value="title">العنوان</option>
            <option value="status">الحالة</option>
          </select>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 border-r border-slate-200 pr-4 mr-2">
              <span className="text-sm text-slate-600">
                {selectedIds.size} محدد
              </span>
              <button
                onClick={() => bulkStatusUpdate('published')}
                disabled={actionLoading === 'bulk'}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm disabled:opacity-50"
              >
                نشر
              </button>
              <button
                onClick={() => bulkStatusUpdate('draft')}
                disabled={actionLoading === 'bulk'}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm disabled:opacity-50"
              >
                مسودة
              </button>
              <button
                onClick={bulkDelete}
                disabled={actionLoading === 'bulk'}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm disabled:opacity-50"
              >
                حذف
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">جاري التحميل...</p>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-slate-900 mb-1">لا توجد مجموعات</h3>
            <p className="text-slate-500">ابدأ برفع مجموعة جديدة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredCollections.length && filteredCollections.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">المجموعة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">الصفحات</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">التاريخ</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCollections.map((col) => (
                  <tr key={col._id} className={`hover:bg-slate-50 ${selectedIds.has(col._id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(col._id)}
                        onChange={() => handleSelect(col._id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 bg-slate-200 rounded overflow-hidden flex-shrink-0 relative">
                          {col.coverImagePath ? (
                            <Image
                              src={col.coverImagePath}
                              alt={col.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate max-w-[200px]">{col.title}</p>
                          {(col.linkedMovie || col.linkedCharacter) && (
                            <p className="text-xs text-slate-500 truncate">
                              {col.linkType === 'movie' ? '🎬 ' : '⭐ '}
                              {col.linkedMovie?.arabicName || col.linkedCharacter?.arabicName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(col.status)}
                      {col.accuracyScore !== undefined && (
                        <div className="mt-1">
                          <span className={`text-xs ${
                            col.accuracyScore >= 90 ? 'text-green-600' : 
                            col.accuracyScore >= 70 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            دقة {col.accuracyScore}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600">{col.totalPages}</span>
                      {col.processingStatus !== 'completed' && (
                        <span className="text-xs text-blue-600 block">
                          ({col.ocrCompletedPages}/{col.totalPages})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatDate(col.createdAt)}
                      {col.publishedAt && (
                        <span className="text-xs text-green-600 block">
                          نشر: {formatDate(col.publishedAt)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/review/${col._id}`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        
                        {col.status !== 'published' && (
                          <button
                            onClick={() => updateStatus(col._id, 'published')}
                            disabled={actionLoading === col._id}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="نشر"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        
                        {col.status === 'published' && (
                          <button
                            onClick={() => updateStatus(col._id, 'draft')}
                            disabled={actionLoading === col._id}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                            title="إلغاء النشر"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        )}
                        
                        {col.status === 'published' && (
                          <Link
                            href={`/archive/${col._id}`}
                            target="_blank"
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="عرض"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        )}
                        
                        <button
                          onClick={() => deleteCollection(col._id)}
                          disabled={actionLoading === col._id}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="حذف"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

