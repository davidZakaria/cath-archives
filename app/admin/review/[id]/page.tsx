'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Page {
  documentId: string;
  pageNumber: number;
  imagePath: string;
  ocrText?: string;
}

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
  subtitle?: string;
  description?: string;
  pages: Page[];
  totalPages: number;
  combinedOcrText?: string;
  combinedAiText?: string;
  status: 'draft' | 'pending_review' | 'published';
  processingStatus: string;
  linkedMovie?: LinkedEntity;
  linkedCharacter?: LinkedEntity;
  linkType?: 'movie' | 'character';
  coverImagePath?: string;
  reviewNotes?: string;
  createdAt: string;
  publishedAt?: string;
  // Accuracy metrics
  accuracyScore?: number;
  accuracyMetrics?: {
    overallConfidence: number;
    highConfidenceBlocksPercent: number;
    lowConfidenceBlocksPercent: number;
    averageFontSize: number;
    detectedTitles: string[];
  };
}

export default function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedPage, setSelectedPage] = useState(0);
  const [showAllPages, setShowAllPages] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCollection();
  }, [id]);

  const fetchCollection = async () => {
    try {
      const response = await fetch(`/api/collections/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCollection(data.collection);
        setEditedText(data.collection.combinedOcrText || '');
        setReviewNotes(data.collection.reviewNotes || '');
      } else {
        setMessage({ type: 'error', text: 'فشل في تحميل المقال' });
      }
    } catch (error) {
      console.error('Failed to fetch collection:', error);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء التحميل' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!collection) return;
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          combinedOcrText: editedText,
          reviewNotes,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'تم الحفظ بنجاح' });
        const data = await response.json();
        setCollection(data.collection);
      } else {
        setMessage({ type: 'error', text: 'فشل في الحفظ' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الحفظ' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!collection) return;
    
    if (!confirm('هل أنت متأكد من نشر هذا المقال؟ سيصبح متاحاً للجمهور.')) {
      return;
    }

    setPublishing(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'published',
          publishedAt: new Date().toISOString(),
          combinedOcrText: editedText,
          reviewNotes,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'تم النشر بنجاح! جاري التوجيه...' });
        setTimeout(() => {
          router.push(`/archive/${id}`);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: 'فشل في النشر' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء النشر' });
    } finally {
      setPublishing(false);
    }
  };

  const handleReject = async () => {
    if (!collection) return;
    
    const reason = prompt('سبب الرفض (اختياري):');
    
    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'draft',
          reviewNotes: reason || reviewNotes,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'تم إرجاع المقال للمسودات' });
        fetchCollection();
      } else {
        setMessage({ type: 'error', text: 'فشل في الرفض' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">لم يتم العثور على المقال</h2>
          <Link href="/admin/review" className="text-amber-600 hover:underline">
            العودة لقائمة المراجعة
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/review"
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{collection.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{collection.totalPages} صفحة</span>
                  {collection.linkedMovie && (
                    <>
                      <span>•</span>
                      <span className="text-amber-600">فيلم: {collection.linkedMovie.arabicName}</span>
                    </>
                  )}
                  {collection.linkedCharacter && (
                    <>
                      <span>•</span>
                      <span className="text-amber-600">شخصية: {collection.linkedCharacter.arabicName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Accuracy Badge */}
              {collection.accuracyScore !== undefined && (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                  collection.accuracyScore >= 90 
                    ? 'bg-green-100 text-green-700' 
                    : collection.accuracyScore >= 70 
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">دقة {collection.accuracyScore}%</span>
                </div>
              )}

              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-sm ${
                collection.status === 'published' 
                  ? 'bg-green-100 text-green-800'
                  : collection.status === 'pending_review'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {collection.status === 'published' ? 'منشور' : collection.status === 'pending_review' ? 'في المراجعة' : 'مسودة'}
              </span>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>

              {/* Reject Button */}
              {collection.status !== 'draft' && (
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                >
                  رفض
                </button>
              )}

              {/* Publish Button */}
              {collection.status !== 'published' && (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  {publishing ? 'جاري النشر...' : 'نشر المقال'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Message */}
      {message && (
        <div className={`max-w-7xl mx-auto px-4 pt-4 sm:px-6 lg:px-8`}>
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Images */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">صور الصفحات</h2>
                <button
                  onClick={() => setShowAllPages(!showAllPages)}
                  className="text-sm text-amber-600 hover:text-amber-700"
                >
                  {showAllPages ? 'عرض صفحة واحدة' : 'عرض كل الصفحات'}
                </button>
              </div>
            </div>

            {/* Page Selector */}
            {!showAllPages && collection.pages.length > 1 && (
              <div className="p-4 border-b flex gap-2 overflow-x-auto">
                {collection.pages.map((page, index) => (
                  <button
                    key={page.pageNumber}
                    onClick={() => setSelectedPage(index)}
                    className={`flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedPage === index ? 'border-amber-500' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <div className="relative w-full h-full bg-gray-100">
                      <Image
                        src={page.imagePath}
                        alt={`صفحة ${page.pageNumber}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-black bg-opacity-60 text-white text-xs text-center py-0.5">
                        {page.pageNumber}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Image Display */}
            <div className={`p-4 ${showAllPages ? 'space-y-4 max-h-[70vh] overflow-y-auto' : ''}`}>
              {showAllPages ? (
                collection.pages.map((page) => (
                  <div key={page.pageNumber} className="relative">
                    <div className="absolute top-2 right-2 bg-amber-600 text-white text-sm px-2 py-1 rounded z-10">
                      صفحة {page.pageNumber}
                    </div>
                    <Image
                      src={page.imagePath}
                      alt={`صفحة ${page.pageNumber}`}
                      width={800}
                      height={1000}
                      className="w-full rounded-lg"
                    />
                  </div>
                ))
              ) : (
                collection.pages[selectedPage] && (
                  <div className="relative">
                    <Image
                      src={collection.pages[selectedPage].imagePath}
                      alt={`صفحة ${collection.pages[selectedPage].pageNumber}`}
                      width={800}
                      height={1000}
                      className="w-full rounded-lg"
                    />
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right: Text Editor */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">النص المستخرج (قابل للتعديل)</h2>
              <p className="text-sm text-gray-500 mt-1">
                يمكنك تعديل النص وتصحيح أي أخطاء قبل النشر
              </p>
            </div>

            <div className="flex-1 p-4">
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full h-[50vh] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-lg leading-relaxed"
                placeholder="النص المستخرج من OCR سيظهر هنا..."
                dir="rtl"
              />
            </div>

            {/* Review Notes */}
            <div className="p-4 border-t bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات المراجعة (اختياري)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                placeholder="أضف ملاحظات للرجوع إليها لاحقاً..."
                rows={2}
              />
            </div>

            {/* Word Count & Accuracy Stats */}
            <div className="p-4 border-t text-sm text-gray-500 space-y-3">
              <div>عدد الكلمات: {editedText.trim().split(/\s+/).filter(Boolean).length}</div>
              
              {/* Accuracy Metrics Panel */}
              {collection.accuracyMetrics && (
                <div className="bg-gray-100 rounded-lg p-3 space-y-2">
                  <h4 className="font-medium text-gray-700 text-xs">مقاييس الدقة</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between bg-white p-2 rounded">
                      <span>الثقة الكلية:</span>
                      <span className={`font-bold ${
                        collection.accuracyMetrics.overallConfidence >= 90 ? 'text-green-600' :
                        collection.accuracyMetrics.overallConfidence >= 70 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {collection.accuracyMetrics.overallConfidence}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-white p-2 rounded">
                      <span>كتل عالية الثقة:</span>
                      <span className="font-bold text-green-600">
                        {collection.accuracyMetrics.highConfidenceBlocksPercent}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-white p-2 rounded">
                      <span>كتل منخفضة الثقة:</span>
                      <span className={`font-bold ${
                        collection.accuracyMetrics.lowConfidenceBlocksPercent <= 10 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {collection.accuracyMetrics.lowConfidenceBlocksPercent}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-white p-2 rounded">
                      <span>متوسط حجم الخط:</span>
                      <span className="font-bold text-gray-700">
                        {collection.accuracyMetrics.averageFontSize}px
                      </span>
                    </div>
                  </div>
                  
                  {/* Detected Titles */}
                  {collection.accuracyMetrics.detectedTitles && collection.accuracyMetrics.detectedTitles.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-600">العناوين المكتشفة:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {collection.accuracyMetrics.detectedTitles.slice(0, 3).map((title, i) => (
                          <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs truncate max-w-[200px]">
                            {title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions - View in Archive (if published) */}
        {collection.status === 'published' && (
          <div className="mt-6 bg-green-50 rounded-xl p-6 text-center">
            <p className="text-green-800 mb-3">تم نشر هذا المقال بنجاح</p>
            <Link
              href={`/archive/${collection._id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <span>عرض في الأرشيف</span>
              <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
