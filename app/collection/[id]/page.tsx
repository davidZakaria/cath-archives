'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface CollectionPage {
  documentId: {
    _id: string;
    ocrText: string;
    verifiedText?: string;
  };
  pageNumber: number;
  imagePath: string;
  ocrText?: string;
  aiCorrectedText?: string;
}

interface LinkedMovie {
  _id: string;
  arabicName: string;
  englishName?: string;
  year?: number;
  genres?: string[];
  description?: string;
  directors?: string[];
  posterImage?: string;
  backdropImage?: string;
  tmdbId?: number;
  voteAverage?: number;
  voteCount?: number;
  runtime?: number;
  tagline?: string;
  originalLanguage?: string;
  popularity?: number;
}

interface LinkedCharacter {
  _id: string;
  arabicName: string;
  englishName?: string;
  type: string;
  photoImage?: string;
  biography?: string;
}

interface Collection {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  pages: CollectionPage[];
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
  metadata?: {
    movies?: string[];
    characters?: string[];
    publicationDate?: string;
    source?: string;
  };
  linkedMovie?: LinkedMovie;
  linkedCharacter?: LinkedCharacter;
  linkType?: 'movie' | 'character';
  coverImagePath?: string;
  processingStatus: string;
  status: string;
  ocrCompletedPages: number;
  createdAt: string;
}

export default function CollectionViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'pages' | 'combined'>('combined');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [processingAI, setProcessingAI] = useState(false);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const response = await fetch(`/api/collections/${resolvedParams.id}`);
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
  }, [resolvedParams.id]);

  const handleProcessAI = async () => {
    if (!collection) return;
    
    setProcessingAI(true);
    try {
      const response = await fetch(`/api/collections/${collection._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processWithAI: true }),
      });

      if (response.ok) {
        const data = await response.json();
        setCollection(data.collection);
      } else {
        alert('فشلت معالجة الذكاء الاصطناعي');
      }
    } catch (error) {
      console.error('AI processing failed:', error);
      alert('حدث خطأ أثناء المعالجة');
    } finally {
      setProcessingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
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
          <h3 className="text-xl font-medium text-gray-700">المجموعة غير موجودة</h3>
          <Link href="/" className="mt-4 inline-block text-amber-600 hover:text-amber-800">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  const currentPageData = collection.pages.find(p => p.pageNumber === currentPage);
  const displayText = viewMode === 'combined' 
    ? (collection.combinedAiText || collection.combinedOcrText || '')
    : (currentPageData?.aiCorrectedText || currentPageData?.ocrText || '');

  const movie = collection.linkedMovie;
  const character = collection.linkedCharacter;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white" dir="rtl">
      {/* Movie/Character Hero Section */}
      {(movie || character) && (
        <div className="relative">
          {/* Backdrop Image */}
          {movie?.backdropImage && (
            <div className="absolute inset-0 h-80 overflow-hidden">
              <Image
                src={movie.backdropImage}
                alt=""
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-amber-50"></div>
            </div>
          )}
          
          <div className={`relative ${movie?.backdropImage ? 'pt-8' : 'pt-4 bg-gradient-to-r from-amber-900 to-amber-800'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
              {/* Back Button */}
              <Link 
                href="/archive" 
                className={`inline-flex items-center gap-2 mb-6 ${movie?.backdropImage ? 'text-white' : 'text-amber-100'} hover:text-amber-200 transition-colors`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>العودة للأرشيف</span>
              </Link>
              
              <div className="flex flex-col md:flex-row gap-8">
                {/* Poster / Photo */}
                {(movie?.posterImage || character?.photoImage) && (
                  <div className="flex-shrink-0">
                    <div className="relative w-48 h-72 rounded-xl overflow-hidden shadow-2xl ring-4 ring-white/20">
                      <Image
                        src={movie?.posterImage || character?.photoImage || ''}
                        alt={movie?.arabicName || character?.arabicName || ''}
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                    
                    {/* TMDB Rating Badge */}
                    {movie?.voteAverage && movie.voteAverage > 0 && (
                      <div className="mt-3 flex items-center justify-center gap-2 bg-black/50 rounded-lg py-2 px-3">
                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-white font-bold">{movie.voteAverage.toFixed(1)}</span>
                        <span className="text-white/60 text-sm">({movie.voteCount?.toLocaleString()})</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Movie/Character Info */}
                <div className="flex-1">
                  {/* Title */}
                  <h1 className={`text-3xl md:text-4xl font-bold ${movie?.backdropImage ? 'text-white' : 'text-white'} mb-2`}>
                    {movie?.arabicName || character?.arabicName}
                  </h1>
                  
                  {/* English Name & Year */}
                  <div className={`flex flex-wrap items-center gap-3 mb-4 ${movie?.backdropImage ? 'text-white/80' : 'text-amber-100'}`}>
                    {(movie?.englishName || character?.englishName) && (
                      <span className="text-lg">{movie?.englishName || character?.englishName}</span>
                    )}
                    {movie?.year && (
                      <>
                        <span className="text-white/40">•</span>
                        <span>{movie.year}</span>
                      </>
                    )}
                    {movie?.runtime && (
                      <>
                        <span className="text-white/40">•</span>
                        <span>{movie.runtime} دقيقة</span>
                      </>
                    )}
                    {character?.type && (
                      <>
                        <span className="text-white/40">•</span>
                        <span>{character.type}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Tagline */}
                  {movie?.tagline && (
                    <p className={`text-lg italic mb-4 ${movie?.backdropImage ? 'text-white/70' : 'text-amber-200'}`}>
                      "{movie.tagline}"
                    </p>
                  )}
                  
                  {/* Genres */}
                  {movie?.genres && movie.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {movie.genres.map((genre, i) => (
                        <span 
                          key={i} 
                          className="px-3 py-1 bg-white/20 text-white rounded-full text-sm backdrop-blur-sm"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Directors */}
                  {movie?.directors && movie.directors.length > 0 && (
                    <div className={`mb-4 ${movie?.backdropImage ? 'text-white/80' : 'text-amber-100'}`}>
                      <span className="font-semibold">إخراج: </span>
                      {movie.directors.join('، ')}
                    </div>
                  )}
                  
                  {/* Description */}
                  {(movie?.description || character?.biography) && (
                    <p className={`text-base leading-relaxed ${movie?.backdropImage ? 'text-white/90' : 'text-amber-100'} max-w-3xl`}>
                      {movie?.description || character?.biography}
                    </p>
                  )}
                  
                  {/* TMDB Badge */}
                  {movie?.tmdbId && (
                    <a 
                      href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 bg-[#01b4e4]/20 text-[#01b4e4] rounded-lg text-sm hover:bg-[#01b4e4]/30 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                      <span>عرض في TMDB</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Header (if no movie/character linked) */}
      {!movie && !character && (
        <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Link href="/archive" className="text-amber-600 hover:text-amber-800 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-amber-900 truncate">{collection.title}</h1>
                <p className="text-sm text-amber-600">{collection.totalPages} صفحات</p>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Article Title Card */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{collection.title}</h2>
              <p className="text-gray-500 mt-1">{collection.totalPages} صفحات • {new Date(collection.createdAt).toLocaleDateString('ar-EG')}</p>
            </div>
            
            {/* AI Process Button */}
            {!collection.combinedAiText && collection.combinedOcrText && (
              <button
                onClick={handleProcessAI}
                disabled={processingAI}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {processingAI ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    معالجة بالذكاء الاصطناعي
                  </>
                )}
              </button>
            )}
          </div>
          
          {/* Status Badge */}
          <div className="mt-4 flex items-center gap-2">
            {collection.status === 'published' && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                منشور
              </span>
            )}
            {collection.combinedAiText && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                معالج بالذكاء الاصطناعي
              </span>
            )}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-amber-200 p-1">
            <button
              onClick={() => setViewMode('combined')}
              className={`px-4 py-2 rounded ${viewMode === 'combined' ? 'bg-amber-100 text-amber-800' : 'text-gray-500'}`}
            >
              النص المدمج
            </button>
            <button
              onClick={() => setViewMode('pages')}
              className={`px-4 py-2 rounded ${viewMode === 'pages' ? 'bg-amber-100 text-amber-800' : 'text-gray-500'}`}
            >
              صفحة بصفحة
            </button>
          </div>

          {/* Page Navigation (for pages mode) */}
          {viewMode === 'pages' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white rounded-lg border border-gray-200 disabled:opacity-30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span className="px-4 py-2 bg-white rounded-lg border border-gray-200">
                صفحة {currentPage} من {collection.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(collection.totalPages, p + 1))}
                disabled={currentPage === collection.totalPages}
                className="p-2 bg-white rounded-lg border border-gray-200 disabled:opacity-30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Images Panel */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 bg-amber-50 border-b border-amber-100">
              <h2 className="font-semibold text-amber-900">
                {viewMode === 'combined' ? 'جميع الصفحات' : `صفحة ${currentPage}`}
              </h2>
            </div>
            
            {viewMode === 'combined' ? (
              // Thumbnail grid for all pages
              <div className="p-4 grid grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
                {collection.pages
                  .sort((a, b) => a.pageNumber - b.pageNumber)
                  .map((page) => (
                    <div
                      key={page.pageNumber}
                      className={`relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        currentPage === page.pageNumber ? 'border-amber-500 ring-2 ring-amber-200' : 'border-transparent'
                      }`}
                      onClick={() => {
                        setCurrentPage(page.pageNumber);
                        setZoomedImage(page.imagePath);
                      }}
                    >
                      <Image
                        src={page.imagePath}
                        alt={`صفحة ${page.pageNumber}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform"
                        sizes="150px"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center py-1 text-sm">
                        {page.pageNumber}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              // Single page view
              <div
                className="relative aspect-[3/4] cursor-zoom-in"
                onClick={() => currentPageData && setZoomedImage(currentPageData.imagePath)}
              >
                {currentPageData && (
                  <Image
                    src={currentPageData.imagePath}
                    alt={`صفحة ${currentPage}`}
                    fill
                    className="object-contain"
                    sizes="50vw"
                  />
                )}
              </div>
            )}
          </div>

          {/* Text Panel */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
              <h2 className="font-semibold text-amber-900">
                {viewMode === 'combined' ? 'النص الكامل' : `نص صفحة ${currentPage}`}
              </h2>
              {collection.combinedAiText && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  معالج بالذكاء الاصطناعي
                </span>
              )}
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[600px]">
              {collection.combinedFormattedContent && viewMode === 'combined' ? (
                <div className="space-y-6">
                  {collection.combinedFormattedContent.title && (
                    <h1 className="text-2xl font-bold text-gray-900 leading-relaxed">
                      {collection.combinedFormattedContent.title}
                    </h1>
                  )}
                  
                  {collection.combinedFormattedContent.subtitle && (
                    <p className="text-lg text-gray-600 leading-relaxed">
                      {collection.combinedFormattedContent.subtitle}
                    </p>
                  )}
                  
                  {collection.combinedFormattedContent.body && (
                    <div className="prose prose-lg max-w-none text-gray-800 leading-loose whitespace-pre-wrap">
                      {collection.combinedFormattedContent.body}
                    </div>
                  )}
                  
                  {collection.combinedFormattedContent.dialogues && collection.combinedFormattedContent.dialogues.length > 0 && (
                    <div className="mt-8 space-y-4">
                      <h3 className="font-semibold text-gray-700 border-b pb-2">الحوارات</h3>
                      {collection.combinedFormattedContent.dialogues.map((dialogue, i) => (
                        <div key={i} className="pr-4 border-r-4 border-amber-300">
                          {dialogue.speaker && (
                            <p className="font-semibold text-amber-800">{dialogue.speaker}:</p>
                          )}
                          <p className="text-gray-700 italic">&ldquo;{dialogue.text}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-gray-800 leading-loose text-lg">
                  {displayText || 'لا يوجد نص متاح'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Thumbnails Strip (for pages mode) */}
        {viewMode === 'pages' && (
          <div className="mt-6 bg-white rounded-xl shadow-lg p-4">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {collection.pages
                .sort((a, b) => a.pageNumber - b.pageNumber)
                .map((page) => (
                  <button
                    key={page.pageNumber}
                    onClick={() => setCurrentPage(page.pageNumber)}
                    className={`relative flex-shrink-0 w-16 aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                      currentPage === page.pageNumber ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200'
                    }`}
                  >
                    <Image
                      src={page.imagePath}
                      alt={`صفحة ${page.pageNumber}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center text-xs">
                      {page.pageNumber}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
