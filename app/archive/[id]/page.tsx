'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
  combinedFormattedContent?: {
    title?: string;
    subtitle?: string;
    body?: string;
    dialogues?: Array<{ speaker?: string; text: string }>;
    credits?: string;
  };
  status: 'draft' | 'pending_review' | 'published';
  linkedMovie?: LinkedEntity;
  linkedCharacter?: LinkedEntity;
  linkType?: 'movie' | 'character';
  coverImagePath?: string;
  metadata?: {
    movies?: string[];
    characters?: string[];
    publicationDate?: string;
    source?: string;
  };
  // Accuracy metrics
  accuracyScore?: number;
  accuracyMetrics?: {
    overallConfidence: number;
    highConfidenceBlocksPercent: number;
    lowConfidenceBlocksPercent: number;
    averageFontSize: number;
    detectedTitles: string[];
  };
  publishedAt?: string;
  createdAt: string;
}

interface ExtractedImage {
  _id: string;
  imagePath: string;
  thumbnailPath?: string;
  caption?: string;
  width: number;
  height: number;
}

export default function ArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const response = await fetch(`/api/collections/${id}`);
        if (response.ok) {
          const data = await response.json();
          setCollection(data.collection);
        }
      } catch (error) {
        console.error('Failed to fetch collection:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600"></div>
          <p className="mt-4 text-amber-600 text-lg">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <svg className="mx-auto w-16 h-16 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-xl font-medium text-gray-700">المقال غير موجود</h3>
          <Link href="/archive" className="mt-4 inline-block text-amber-600 hover:text-amber-800">
            العودة للأرشيف
          </Link>
        </div>
      </div>
    );
  }

  // Check if not published - redirect to admin
  if (collection.status !== 'published') {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <svg className="mx-auto w-16 h-16 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-4 text-xl font-medium text-gray-700">هذا المقال غير منشور بعد</h3>
          <p className="text-gray-500 mt-2">المقال قيد المراجعة حالياً</p>
          <Link href="/archive" className="mt-4 inline-block text-amber-600 hover:text-amber-800">
            العودة للأرشيف
          </Link>
        </div>
      </div>
    );
  }

  // Get display text - try combined first, then fall back to individual page texts
  const displayText = collection.combinedOcrText || 
    collection.pages
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map(p => p.ocrText || '')
      .filter(t => t.trim())
      .join('\n\n--- صفحة جديدة ---\n\n') || '';
  const title = collection.title;

  // Helper function to render formatted text with proper styling
  const renderFormattedText = (text: string) => {
    // Split by page breaks first
    const pages = text.split('\n\n--- صفحة جديدة ---\n\n');
    
    return pages.map((pageText, pageIndex) => (
      <div key={pageIndex} className="mb-8">
        {pageIndex > 0 && (
          <div className="text-center text-amber-600 text-sm mb-6 py-2 border-y border-amber-200">
            صفحة {pageIndex + 1}
          </div>
        )}
        {pageText.split('\n\n').map((block, blockIndex) => {
          const trimmed = block.trim();
          if (!trimmed) return null;
          
          // Main Title (# ...)
          if (trimmed.startsWith('# ')) {
            const titleText = trimmed.substring(2);
            return (
              <h1 key={blockIndex} className="text-3xl font-bold text-amber-900 mb-6 text-center border-b-2 border-amber-200 pb-4">
                {titleText}
              </h1>
            );
          }
          
          // Subtitle (## ...)
          if (trimmed.startsWith('## ')) {
            const subtitleText = trimmed.substring(3);
            return (
              <h2 key={blockIndex} className="text-2xl font-semibold text-amber-800 mb-4 mt-8">
                {subtitleText}
              </h2>
            );
          }
          
          // Heading (### ...)
          if (trimmed.startsWith('### ')) {
            const headingText = trimmed.substring(4);
            return (
              <h3 key={blockIndex} className="text-xl font-semibold text-amber-700 mb-3 mt-6">
                {headingText}
              </h3>
            );
          }
          
          // Quote/Dialogue (> ...)
          if (trimmed.startsWith('> ')) {
            const quoteText = trimmed.substring(2);
            return (
              <blockquote key={blockIndex} className="border-r-4 border-amber-400 pr-4 mr-4 my-4 text-gray-700 italic text-lg bg-amber-50 py-3 rounded-l-lg">
                {quoteText}
              </blockquote>
            );
          }
          
          // Caption/Emphasis (*...*) - italic text
          if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
            const captionText = trimmed.slice(1, -1);
            return (
              <p key={blockIndex} className="text-sm text-gray-500 italic text-center my-4">
                {captionText}
              </p>
            );
          }
          
          // List item (• ...)
          if (trimmed.startsWith('• ')) {
            const listText = trimmed.substring(2);
            return (
              <li key={blockIndex} className="mr-6 mb-2 list-disc text-lg">
                {listText}
              </li>
            );
          }
          
          // Section divider (---)
          if (trimmed === '---') {
            return <hr key={blockIndex} className="my-8 border-amber-200" />;
          }
          
          // Regular paragraph
          return (
            <p key={blockIndex} className="mb-4 text-lg leading-relaxed">
              {trimmed}
            </p>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/archive" className="text-amber-600 hover:text-amber-800 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-amber-900 truncate">{title}</h1>
              {collection.subtitle && (
                <p className="text-sm text-amber-600 truncate">{collection.subtitle}</p>
              )}
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
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-700">
                منشور
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Linked Entity Info */}
        {(collection.linkedMovie || collection.linkedCharacter) && (
          <div className="mb-6 bg-amber-100 rounded-xl p-6">
            <div className="flex items-center gap-4">
              {collection.coverImagePath && (
                <div className="w-20 h-24 rounded-lg overflow-hidden relative flex-shrink-0">
                  <Image
                    src={collection.coverImagePath}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <p className="text-amber-700 text-sm mb-1">
                  {collection.linkType === 'movie' ? 'مقال عن فيلم' : 'مقال عن شخصية'}
                </p>
                <h2 className="text-2xl font-bold text-amber-900">
                  {collection.linkedMovie?.arabicName || collection.linkedCharacter?.arabicName}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-amber-700">
                  {collection.linkedMovie?.englishName && (
                    <span dir="ltr">{collection.linkedMovie.englishName}</span>
                  )}
                  {collection.linkedCharacter?.englishName && (
                    <span dir="ltr">{collection.linkedCharacter.englishName}</span>
                  )}
                  {collection.linkedMovie?.year && (
                    <span>• {collection.linkedMovie.year}</span>
                  )}
                  {collection.linkedCharacter?.type && (
                    <span>• {collection.linkedCharacter.type === 'actor' ? 'ممثل' : collection.linkedCharacter.type === 'director' ? 'مخرج' : collection.linkedCharacter.type}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metadata Tags */}
        {(collection.metadata?.movies?.length || collection.metadata?.characters?.length) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {collection.metadata?.movies?.map((movie, i) => (
              <Link
                key={`movie-${i}`}
                href={`/movies?search=${encodeURIComponent(movie)}`}
                className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm hover:bg-amber-200 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                {movie}
              </Link>
            ))}
            {collection.metadata?.characters?.map((char, i) => (
              <Link
                key={`char-${i}`}
                href={`/characters?search=${encodeURIComponent(char)}`}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {char}
              </Link>
            ))}
          </div>
        )}

        {/* Page Thumbnails */}
        {collection.pages.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">
                صفحات المقال ({collection.totalPages} صفحة)
              </h2>
              {selectedPage !== null && (
                <button
                  onClick={() => setSelectedPage(null)}
                  className="text-sm text-amber-600 hover:text-amber-800"
                >
                  إغلاق المعاينة
                </button>
              )}
            </div>
            
            {/* Thumbnails Row */}
            <div className="p-4 flex gap-3 overflow-x-auto">
              {collection.pages.map((page, index) => (
                <button
                  key={page.pageNumber}
                  onClick={() => setSelectedPage(selectedPage === index ? null : index)}
                  className={`flex-shrink-0 relative rounded-lg overflow-hidden transition-all ${
                    selectedPage === index 
                      ? 'ring-4 ring-amber-500 scale-105' 
                      : 'hover:ring-2 hover:ring-amber-300'
                  }`}
                >
                  <div className="w-20 h-28 relative bg-gray-100">
                    <Image
                      src={page.imagePath}
                      alt={`صفحة ${page.pageNumber}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-xs text-center py-1">
                    {page.pageNumber}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Page Preview */}
            {selectedPage !== null && collection.pages[selectedPage] && (
              <div className="p-4 border-t">
                <div 
                  className="relative mx-auto max-w-2xl cursor-zoom-in"
                  onClick={() => setZoomedImage(collection.pages[selectedPage].imagePath)}
                >
                  <Image
                    src={collection.pages[selectedPage].imagePath}
                    alt={`صفحة ${collection.pages[selectedPage].pageNumber}`}
                    width={800}
                    height={1000}
                    className="w-full rounded-lg shadow-lg"
                  />
                  <p className="text-center text-sm text-gray-500 mt-2">
                    اضغط للتكبير
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Article Text */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 bg-amber-50 border-b border-amber-100">
            <h2 className="font-semibold text-amber-900">نص المقال</h2>
          </div>
          
          <div className="p-8">
            {collection.combinedFormattedContent && (collection.combinedFormattedContent.title || collection.combinedFormattedContent.body) ? (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Title */}
                {collection.combinedFormattedContent.title && (
                  <h1 className="text-3xl font-bold text-gray-900 leading-relaxed text-center">
                    {collection.combinedFormattedContent.title}
                  </h1>
                )}
                
                {/* Subtitle */}
                {collection.combinedFormattedContent.subtitle && (
                  <p className="text-xl text-gray-600 leading-relaxed text-center">
                    {collection.combinedFormattedContent.subtitle}
                  </p>
                )}
                
                <hr className="my-8 border-amber-200" />
                
                {/* Body */}
                {collection.combinedFormattedContent.body && (
                  <div className="prose prose-lg max-w-none text-gray-800 leading-loose">
                    {collection.combinedFormattedContent.body.split('\n').map((para, i) => (
                      para.trim() && <p key={i} className="mb-4 text-lg">{para}</p>
                    ))}
                  </div>
                )}
                
                {/* Dialogues */}
                {collection.combinedFormattedContent.dialogues && collection.combinedFormattedContent.dialogues.length > 0 && (
                  <div className="mt-8 space-y-4 bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-700 border-b pb-2">الحوارات</h3>
                    {collection.combinedFormattedContent.dialogues.map((dialogue, i) => (
                      <div key={i} className="pr-4 border-r-4 border-amber-300">
                        {dialogue.speaker && (
                          <p className="font-semibold text-amber-800">{dialogue.speaker}:</p>
                        )}
                        <p className="text-gray-700 italic text-lg">&ldquo;{dialogue.text}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Credits */}
                {collection.combinedFormattedContent.credits && (
                  <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500 text-center">
                    {collection.combinedFormattedContent.credits}
                  </div>
                )}
              </div>
            ) : displayText ? (
              <div className="max-w-3xl mx-auto text-gray-800 leading-loose">
                {renderFormattedText(displayText)}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg">لم يتم استخراج نص من هذا المقال بعد</p>
                <p className="text-sm mt-2">يمكنك الاطلاع على الصور الأصلية أعلاه</p>
              </div>
            )}
          </div>
        </div>

        {/* Extracted Images Gallery */}
        {extractedImages.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 bg-amber-50 border-b border-amber-100">
              <h2 className="font-semibold text-amber-900">الصور المستخرجة ({extractedImages.length})</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {extractedImages.map((img) => (
                  <div
                    key={img._id}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                    onClick={() => setZoomedImage(img.imagePath)}
                  >
                    <Image
                      src={img.thumbnailPath || img.imagePath}
                      alt={img.caption || 'Extracted image'}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      sizes="150px"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {img.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                        <p className="text-white text-xs truncate">{img.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Article Info */}
        <div className="mt-8 bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="font-semibold text-gray-700">معلومات المقال</h2>
          </div>
          <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">عدد الصفحات:</span>
              <p className="font-medium text-gray-900">{collection.totalPages} صفحة</p>
            </div>
            <div>
              <span className="text-gray-500">تاريخ النشر:</span>
              <p className="font-medium text-gray-900">
                {collection.publishedAt ? formatDate(collection.publishedAt) : '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">تاريخ الرفع:</span>
              <p className="font-medium text-gray-900">
                {formatDate(collection.createdAt)}
              </p>
            </div>
            {collection.metadata?.source && (
              <div>
                <span className="text-gray-500">المصدر:</span>
                <p className="font-medium text-gray-900">{collection.metadata.source}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/archive"
            className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            تصفح المزيد من المقالات
          </Link>
        </div>
      </main>

      {/* Zoomed Image Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setZoomedImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <Image
              src={zoomedImage}
              alt="Zoomed image"
              width={1200}
              height={1600}
              className="object-contain max-h-[90vh] mx-auto"
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-amber-900 text-amber-100 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg font-medium mb-2">أرشيف السينما العربية الرقمي</p>
          <p className="text-amber-300 text-sm">
            حفظ التراث السينمائي العربي للأجيال القادمة
          </p>
        </div>
      </footer>
    </div>
  );
}
