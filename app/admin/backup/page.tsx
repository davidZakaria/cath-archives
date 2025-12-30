'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface BackupInfo {
  filename: string;
  version?: string;
  createdAt: string;
  collections?: number;
  documents?: number;
  movies?: number;
  characters?: number;
  totalSize?: number;
}

interface DatabaseStatus {
  collections: number;
  documents: number;
  movies: number;
  characters: number;
  lastBackup: string | null;
}

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [backupsRes, statusRes] = await Promise.all([
        fetch('/api/admin/backup'),
        fetch('/api/admin/backup?action=status'),
      ]);

      if (backupsRes.ok) {
        const data = await backupsRes.json();
        setBackups(data.backups || []);
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to fetch backup data:', error);
      setMessage({ type: 'error', text: 'فشل في تحميل البيانات' });
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeEmbeddings: false }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `تم إنشاء النسخة الاحتياطية: ${data.backup.filename}` });
        fetchData();
      } else {
        throw new Error('Failed to create backup');
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
      setMessage({ type: 'error', text: 'فشل في إنشاء النسخة الاحتياطية' });
    } finally {
      setCreating(false);
    }
  };

  const restoreBackup = async (filename: string, mode: 'merge' | 'replace') => {
    if (!confirm(mode === 'replace' 
      ? 'هل أنت متأكد؟ سيتم استبدال جميع البيانات الحالية!'
      : 'سيتم دمج البيانات. هل تريد المتابعة؟'
    )) return;

    setRestoring(filename);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, mode }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `تم استعادة النسخة الاحتياطية بنجاح` });
        fetchData();
      } else {
        throw new Error('Failed to restore backup');
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      setMessage({ type: 'error', text: 'فشل في استعادة النسخة الاحتياطية' });
    } finally {
      setRestoring(null);
    }
  };

  const deleteBackup = async (filename: string) => {
    if (!confirm('هل تريد حذف هذه النسخة الاحتياطية؟')) return;

    setDeleting(filename);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/backup?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'تم حذف النسخة الاحتياطية' });
        fetchData();
      } else {
        throw new Error('Failed to delete backup');
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
      setMessage({ type: 'error', text: 'فشل في حذف النسخة الاحتياطية' });
    } finally {
      setDeleting(null);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">النسخ الاحتياطي</h1>
          <p className="text-gray-600 mt-1">إدارة النسخ الاحتياطية واستعادة البيانات</p>
        </div>
        <button
          onClick={createBackup}
          disabled={creating}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {creating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              جاري الإنشاء...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              إنشاء نسخة احتياطية
            </>
          )}
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Database Status */}
      {status && (
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              حالة قاعدة البيانات
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{status.collections}</div>
                <div className="text-sm text-gray-600 mt-1">مجموعات</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{status.documents}</div>
                <div className="text-sm text-gray-600 mt-1">وثائق</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <div className="text-3xl font-bold text-amber-600">{status.movies}</div>
                <div className="text-sm text-gray-600 mt-1">أفلام</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{status.characters}</div>
                <div className="text-sm text-gray-600 mt-1">شخصيات</div>
              </div>
            </div>
            {status.lastBackup && (
              <div className="mt-4 text-sm text-gray-600 text-center">
                آخر نسخة احتياطية: {formatDate(status.lastBackup)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backups List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            النسخ الاحتياطية المتاحة
          </h2>
          <span className="text-sm text-gray-500">{backups.length} نسخة</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">لا توجد نسخ احتياطية</h3>
            <p className="text-gray-600">اضغط على &quot;إنشاء نسخة احتياطية&quot; لإنشاء أول نسخة</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {backups.map((backup) => (
              <div key={backup.filename} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-gray-900 truncate">
                        {backup.filename}
                      </span>
                      {backup.version && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          v{backup.version}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(backup.createdAt)}
                    </div>
                    {(backup.collections !== undefined || backup.totalSize !== undefined) && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {backup.collections !== undefined && (
                          <span>{backup.collections} مجموعات</span>
                        )}
                        {backup.documents !== undefined && (
                          <span>{backup.documents} وثائق</span>
                        )}
                        {backup.movies !== undefined && (
                          <span>{backup.movies} أفلام</span>
                        )}
                        {backup.characters !== undefined && (
                          <span>{backup.characters} شخصيات</span>
                        )}
                        {backup.totalSize !== undefined && (
                          <span className="font-medium">{formatBytes(backup.totalSize)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Restore (Merge) */}
                    <button
                      onClick={() => restoreBackup(backup.filename, 'merge')}
                      disabled={restoring === backup.filename}
                      className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors"
                      title="استعادة (دمج)"
                    >
                      {restoring === backup.filename ? '...' : 'دمج'}
                    </button>
                    
                    {/* Restore (Replace) */}
                    <button
                      onClick={() => restoreBackup(backup.filename, 'replace')}
                      disabled={restoring === backup.filename}
                      className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors"
                      title="استعادة (استبدال)"
                    >
                      {restoring === backup.filename ? '...' : 'استبدال'}
                    </button>
                    
                    {/* Delete */}
                    <button
                      onClick={() => deleteBackup(backup.filename)}
                      disabled={deleting === backup.filename}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                      title="حذف"
                    >
                      {deleting === backup.filename ? (
                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-3">ملاحظات هامة</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><strong>دمج:</strong> يضيف البيانات الجديدة فقط دون حذف الموجودة</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><strong>استبدال:</strong> يستبدل جميع البيانات الموجودة بالنسخة الاحتياطية</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>يُنصح بإنشاء نسخة احتياطية قبل أي عملية استعادة</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>النسخ الاحتياطية لا تتضمن الصور، فقط بيانات قاعدة البيانات</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

