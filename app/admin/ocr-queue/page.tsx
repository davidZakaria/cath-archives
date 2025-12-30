'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Document {
  _id: string;
  filename: string;
  imagePath: string;
  processingStatus: 'pending' | 'ocr_processing' | 'ocr_complete' | 'ai_processing' | 'ai_complete' | 'failed';
  ocrConfidence?: number;
  ocrProcessedAt?: string;
  aiProcessedAt?: string;
  collectionId?: string;
  pageNumber?: number;
  createdAt: string;
  updatedAt: string;
}

type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'failed';

export default function OCRQueuePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents?limit=100');
      if (response.ok) {
        const data = await response.json();
        const docs = data.documents || [];
        
        // Filter based on processing status
        let filtered = docs;
        if (filterStatus === 'pending') {
          filtered = docs.filter((d: Document) => d.processingStatus === 'pending');
        } else if (filterStatus === 'processing') {
          filtered = docs.filter((d: Document) => 
            d.processingStatus === 'ocr_processing' || d.processingStatus === 'ai_processing'
          );
        } else if (filterStatus === 'completed') {
          filtered = docs.filter((d: Document) => 
            d.processingStatus === 'ocr_complete' || d.processingStatus === 'ai_complete'
          );
        } else if (filterStatus === 'failed') {
          filtered = docs.filter((d: Document) => d.processingStatus === 'failed');
        }
        
        setDocuments(filtered);
        
        // Calculate stats
        const pending = docs.filter((d: Document) => d.processingStatus === 'pending').length;
        const processing = docs.filter((d: Document) => 
          d.processingStatus === 'ocr_processing' || d.processingStatus === 'ai_processing'
        ).length;
        const completed = docs.filter((d: Document) => 
          d.processingStatus === 'ocr_complete' || d.processingStatus === 'ai_complete'
        ).length;
        const failed = docs.filter((d: Document) => d.processingStatus === 'failed').length;
        
        setStats({
          total: docs.length,
          pending,
          processing,
          completed,
          failed,
        });
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchDocuments();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchDocuments, 10000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  // Retry OCR for a document
  const retryOCR = async (docId: string) => {
    setActionLoading(docId);
    try {
      const response = await fetch(`/api/retry-ocr/${docId}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'تم إعادة تشغيل OCR بنجاح' });
        fetchDocuments();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'فشل في إعادة التشغيل' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ' });
    } finally {
      setActionLoading(null);
    }
  };

  // Retry all failed
  const retryAllFailed = async () => {
    const failedDocs = documents.filter(d => d.processingStatus === 'failed');
    if (failedDocs.length === 0) return;
    
    setActionLoading('bulk');
    let success = 0;
    let failed = 0;
    
    for (const doc of failedDocs) {
      try {
        const response = await fetch(`/api/retry-ocr/${doc._id}`, { method: 'POST' });
        if (response.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    
    setMessage({
      type: failed === 0 ? 'success' : 'error',
      text: `تم إعادة تشغيل ${success} وثيقة${failed > 0 ? ` - فشل ${failed}` : ''}`
    });
    fetchDocuments();
    setActionLoading(null);
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: {
        label: 'في الانتظار',
        color: 'bg-slate-100 text-slate-700',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      },
      ocr_processing: {
        label: 'معالجة OCR',
        color: 'bg-blue-100 text-blue-700',
        icon: <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      },
      ocr_complete: {
        label: 'OCR مكتمل',
        color: 'bg-green-100 text-green-700',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      },
      ai_processing: {
        label: 'معالجة AI',
        color: 'bg-purple-100 text-purple-700',
        icon: <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
      },
      ai_complete: {
        label: 'AI مكتمل',
        color: 'bg-green-100 text-green-700',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      },
      failed: {
        label: 'فشل',
        color: 'bg-red-100 text-red-700',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      },
    };
    return statusMap[status] || statusMap.pending;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-EG', {
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
          <h1 className="text-2xl font-bold text-slate-900">طابور المعالجة</h1>
          <p className="text-slate-500 mt-1">مراقبة وإدارة معالجة OCR و AI</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDocuments}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>تحديث</span>
          </button>
          {stats.failed > 0 && (
            <button
              onClick={retryAllFailed}
              disabled={actionLoading === 'bulk'}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>إعادة تشغيل الفاشل ({stats.failed})</span>
            </button>
          )}
        </div>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { id: 'all', label: 'الكل', count: stats.total, color: 'bg-slate-500' },
          { id: 'pending', label: 'في الانتظار', count: stats.pending, color: 'bg-slate-400' },
          { id: 'processing', label: 'قيد المعالجة', count: stats.processing, color: 'bg-blue-500' },
          { id: 'completed', label: 'مكتمل', count: stats.completed, color: 'bg-green-500' },
          { id: 'failed', label: 'فشل', count: stats.failed, color: 'bg-red-500' },
        ].map((stat) => (
          <button
            key={stat.id}
            onClick={() => setFilterStatus(stat.id as FilterStatus)}
            className={`p-4 rounded-xl border-2 transition-all ${
              filterStatus === stat.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-transparent bg-white hover:border-slate-200'
            } shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900">{stat.count}</span>
              <div className={`w-3 h-3 rounded-full ${stat.color}`} />
            </div>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Processing Queue */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">قائمة الوثائق</h2>
          <p className="text-sm text-slate-500 mt-1">تحديث تلقائي كل 10 ثوانٍ</p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">جاري التحميل...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-slate-900 mb-1">لا توجد وثائق</h3>
            <p className="text-slate-500">الطابور فارغ حالياً</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {documents.map((doc) => {
              const statusInfo = getStatusInfo(doc.processingStatus);
              return (
                <div key={doc._id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="w-16 h-20 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                      <Image
                        src={doc.imagePath}
                        alt={doc.filename}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{doc.filename}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                        
                        {/* Confidence */}
                        {doc.ocrConfidence !== undefined && (
                          <span className={`text-xs ${
                            doc.ocrConfidence >= 0.8 ? 'text-green-600' : 
                            doc.ocrConfidence >= 0.6 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            دقة {(doc.ocrConfidence * 100).toFixed(0)}%
                          </span>
                        )}
                        
                        {/* Collection/Page info */}
                        {doc.pageNumber && (
                          <span className="text-xs text-slate-500">
                            صفحة {doc.pageNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDate(doc.updatedAt)}
                        {doc.ocrProcessedAt && ` • OCR: ${formatDate(doc.ocrProcessedAt)}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {doc.processingStatus === 'failed' && (
                        <button
                          onClick={() => retryOCR(doc._id)}
                          disabled={actionLoading === doc._id}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          إعادة
                        </button>
                      )}
                      
                      {(doc.processingStatus === 'ocr_processing' || doc.processingStatus === 'ai_processing') && (
                        <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          جاري...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Processing Info */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          كيف تعمل المعالجة
        </h3>
        <div className="grid md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">1</span>
              <span className="font-medium text-slate-900">في الانتظار</span>
            </div>
            <p className="text-slate-600">الوثيقة مرفوعة وجاهزة للمعالجة</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">2</span>
              <span className="font-medium text-slate-900">معالجة OCR</span>
            </div>
            <p className="text-slate-600">Google Vision يستخرج النص العربي</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">3</span>
              <span className="font-medium text-slate-900">معالجة AI</span>
            </div>
            <p className="text-slate-600">الذكاء الاصطناعي يصحح الأخطاء</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600">4</span>
              <span className="font-medium text-slate-900">مكتمل</span>
            </div>
            <p className="text-slate-600">جاهز للمراجعة والنشر</p>
          </div>
        </div>
      </div>
    </div>
  );
}

