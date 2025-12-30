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
  type?: string;
  photoImage?: string;
  biography?: string;
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
  linkedMovie?: LinkedMovie;
  linkedCharacter?: LinkedCharacter;
  linkType?: 'movie' | 'character';
  coverImagePath?: string;
  metadata?: {
    movies?: string[];
    characters?: string[];
    publicationDate?: string;
    source?: string;
  };
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
      <div className="min-h-screen bg-[#0d0a08] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="film-spinner mx-auto mb-4"></div>
          <p className="text-[#d4a012] text-lg">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-[#0d0a08] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#2a2318] flex items-center justify-center">
            <span className="text-5xl">🎞️</span>
          </div>
          <h3 className="text-2xl font-bold text-[#d4a012] mb-2">المقال غير موجود</h3>
          <Link href="/archive" className="btn-gold px-6 py-3 rounded-xl inline-block mt-4">
            العودة للأرشيف
          </Link>
        </div>
      </div>
    );
  }

  if (collection.status !== 'published') {
    return (
      <div className="min-h-screen bg-[#0d0a08] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#4a3f20] flex items-center justify-center">
            <span className="text-5xl">⏳</span>
          </div>
          <h3 className="text-2xl font-bold text-[#fde047] mb-2">هذا المقال غير منشور بعد</h3>
          <p className="text-[#9c8560] mt-2">المقال قيد المراجعة حالياً</p>
          <Link href="/archive" className="btn-gold px-6 py-3 rounded-xl inline-block mt-4">
            العودة للأرشيف
          </Link>
        </div>
      </div>
    );
  }

  const movie = collection.linkedMovie;
  const character = collection.linkedCharacter;

  const displayText = collection.combinedOcrText || 
    collection.pages
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map(p => p.ocrText || '')
      .filter(t => t.trim())
      .join('\n\n--- صفحة جديدة ---\n\n') || '';

  const renderFormattedText = (text: string) => {
    const pages = text.split('\n\n--- صفحة جديدة ---\n\n');
    
    return pages.map((pageText, pageIndex) => (
      <div key={pageIndex} className="mb-8">
        {pageIndex > 0 && (
          <div className="text-center text-[#d4a012] text-sm mb-6 py-2 border-y border-[#3a3020]">
            صفحة {pageIndex + 1}
          </div>
        )}
        {pageText.split('\n\n').map((block, blockIndex) => {
          const trimmed = block.trim();
          if (!trimmed) return null;
          
          if (trimmed.startsWith('# ')) {
            const titleText = trimmed.substring(2);
            return (
              <h1 key={blockIndex} className="text-3xl font-bold text-[#d4a012] mb-6 text-center border-b-2 border-[#3a3020] pb-4">
                {titleText}
              </h1>
            );
          }
          
          if (trimmed.startsWith('## ')) {
            const subtitleText = trimmed.substring(3);
            return (
              <h2 key={blockIndex} className="text-2xl font-semibold text-[#b8860b] mb-4 mt-8">
                {subtitleText}
              </h2>
            );
          }
          
          if (trimmed.startsWith('### ')) {
            const headingText = trimmed.substring(4);
            return (
              <h3 key={blockIndex} className="text-xl font-semibold text-[#9c8560] mb-3 mt-6">
                {headingText}
              </h3>
            );
          }
          
          if (trimmed.startsWith('> ')) {
            const quoteText = trimmed.substring(2);
            return (
              <blockquote key={blockIndex} className="border-r-4 border-[#d4a012] pr-4 mr-4 my-4 text-[#d4c4a8] italic text-lg bg-[#2a2318] py-3 px-4 rounded-l-lg">
                {quoteText}
              </blockquote>
            );
          }
          
          if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
            const captionText = trimmed.slice(1, -1);
            return (
              <p key={blockIndex} className="text-sm text-[#7a6545] italic text-center my-4">
                {captionText}
              </p>
            );
          }
          
          if (trimmed.startsWith('• ')) {
            const listText = trimmed.substring(2);
            return (
              <li key={blockIndex} className="mr-6 mb-2 list-disc text-lg text-[#d4c4a8]">
                {listText}
              </li>
            );
          }
          
          if (trimmed === '---') {
            return <hr key={blockIndex} className="my-8 border-[#3a3020]" />;
          }
          
          return (
            <p key={blockIndex} className="mb-4 text-lg leading-relaxed text-[#d4c4a8]">
              {trimmed}
            </p>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-[#0d0a08] relative overflow-hidden" dir="rtl">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10">
        {/* Movie/Character Hero Section with TMDB Data */}
        {(movie || character) && (
          <div className="relative">
            {/* Backdrop Image */}
            {movie?.backdropImage && (
              <div className="absolute inset-0 h-[500px] overflow-hidden">
                <Image
                  src={movie.backdropImage}
                  alt=""
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#0d0a08]"></div>
              </div>
            )}
            
            <div className={`relative ${movie?.backdropImage ? 'pt-8' : 'bg-gradient-to-b from-[#1a1510] to-[#0d0a08] pt-4'}`}>
              {/* Back Button */}
              <div className="max-w-7xl mx-auto px-6">
                <Link 
                  href="/archive" 
                  className="inline-flex items-center gap-2 text-[#d4a012] hover:text-[#f4c247] transition-colors mb-6"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>العودة للأرشيف</span>
                </Link>
              </div>
              
              <div className="max-w-7xl mx-auto px-6 pb-10">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Poster / Photo */}
                  <div className="flex-shrink-0">
                    <div className="relative w-56 h-80 rounded-xl overflow-hidden shadow-2xl ring-4 ring-[#d4a012]/30">
                      {(movie?.posterImage || character?.photoImage || collection.coverImagePath) ? (
                        <Image
                          src={movie?.posterImage || character?.photoImage || collection.coverImagePath || ''}
                          alt={movie?.arabicName || character?.arabicName || ''}
                          fill
                          className="object-cover"
                          priority
                        />
                      ) : (
                        <div className="w-full h-full bg-[#2a2318] flex items-center justify-center">
                          <span className="text-6xl">🎬</span>
                        </div>
                      )}
                    </div>
                    
                    {/* TMDB Rating Badge */}
                    {movie?.voteAverage && movie.voteAverage > 0 && (
                      <div className="mt-4 flex items-center justify-center gap-2 bg-black/60 rounded-lg py-2.5 px-4 border border-[#d4a012]/30">
                        <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-white font-bold text-lg">{movie.voteAverage.toFixed(1)}</span>
                        <span className="text-white/50 text-sm">/ 10</span>
                        {movie.voteCount && (
                          <span className="text-white/40 text-xs mr-2">({movie.voteCount.toLocaleString()} تقييم)</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Movie/Character Info */}
                  <div className="flex-1">
                    {/* Type Badge */}
                    <div className="mb-3">
                      <span className="px-3 py-1 bg-[#d4a012]/20 text-[#d4a012] rounded-full text-sm font-medium">
                        {collection.linkType === 'movie' ? '🎬 مقال عن فيلم' : '⭐ مقال عن شخصية'}
                      </span>
                    </div>
                    
                    {/* Title */}
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                      {movie?.arabicName || character?.arabicName}
                    </h1>
                    
                    {/* English Name & Year & Runtime */}
                    <div className="flex flex-wrap items-center gap-3 mb-4 text-[#9c8560]">
                      {(movie?.englishName || character?.englishName) && (
                        <span className="text-lg" dir="ltr">{movie?.englishName || character?.englishName}</span>
                      )}
                      {movie?.year && (
                        <>
                          <span className="text-[#5c4108]">•</span>
                          <span className="text-[#d4a012] font-semibold">{movie.year}</span>
                        </>
                      )}
                      {movie?.runtime && (
                        <>
                          <span className="text-[#5c4108]">•</span>
                          <span>{movie.runtime} دقيقة</span>
                        </>
                      )}
                      {character?.type && (
                        <>
                          <span className="text-[#5c4108]">•</span>
                          <span>{character.type === 'actor' ? 'ممثل' : character.type === 'director' ? 'مخرج' : character.type}</span>
                        </>
                      )}
                    </div>
                    
                    {/* Tagline */}
                    {movie?.tagline && (
                      <p className="text-xl italic text-[#b8860b] mb-4 border-r-4 border-[#d4a012] pr-4">
                        "{movie.tagline}"
                      </p>
                    )}
                    
                    {/* Genres */}
                    {movie?.genres && movie.genres.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {movie.genres.map((genre, i) => (
                          <span 
                            key={i} 
                            className="px-4 py-1.5 bg-[#2a2318] text-[#d4c4a8] rounded-full text-sm border border-[#3a3020]"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Directors */}
                    {movie?.directors && movie.directors.length > 0 && (
                      <div className="mb-5 text-[#9c8560]">
                        <span className="font-semibold text-[#d4a012]">إخراج: </span>
                        <span className="text-[#d4c4a8]">{movie.directors.join('، ')}</span>
                      </div>
                    )}
                    
                    {/* Description */}
                    {(movie?.description || character?.biography) && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-[#d4a012] mb-2">القصة</h3>
                        <p className="text-[#d4c4a8] leading-relaxed text-lg max-w-3xl">
                          {movie?.description || character?.biography}
                        </p>
                      </div>
                    )}
                    
                    {/* TMDB Link */}
                    {movie?.tmdbId && (
                      <a 
                        href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#01b4e4]/10 text-[#01b4e4] rounded-lg text-sm hover:bg-[#01b4e4]/20 transition-colors border border-[#01b4e4]/30"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                        <span>عرض في TMDB</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header (if no movie/character linked) */}
        {!movie && !character && (
          <header className="art-deco-header py-4 px-6 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-4">
                <Link href="/archive" className="btn-outline-gold p-2 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-[#d4a012] truncate">{collection.title}</h1>
                  {collection.subtitle && (
                    <p className="text-sm text-[#9c8560] truncate">{collection.subtitle}</p>
                  )}
                </div>
              </div>
            </div>
          </header>
        )}

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Article Title Card */}
          <div className="vintage-card rounded-xl p-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#d4a012]">{collection.title}</h2>
                {collection.subtitle && (
                  <p className="text-[#9c8560] mt-1">{collection.subtitle}</p>
                )}
                <p className="text-[#7a6545] text-sm mt-2">
                  {collection.totalPages} صفحات • {formatDate(collection.createdAt)}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {collection.accuracyScore !== undefined && (
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                    collection.accuracyScore >= 90 
                      ? 'bg-[#2a4a2a]/50 text-[#90ee90] border border-[#4a8a4a]' 
                      : collection.accuracyScore >= 70 
                        ? 'bg-[#4a3f20]/50 text-[#fde047] border border-[#6a5a30]'
                        : 'bg-[#4a2020]/50 text-[#ff6b6b] border border-[#6a3030]'
                  }`}>
                    <span className="text-sm font-medium">دقة {collection.accuracyScore}%</span>
                  </div>
                )}
                <span className="px-3 py-1 text-sm font-bold rounded-full bg-[#2a4a2a] text-[#90ee90] border border-[#4a8a4a]">
                  ✓ منشور
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Tags */}
          {(collection.metadata?.movies?.length || collection.metadata?.characters?.length) && (
            <div className="mb-6 flex flex-wrap gap-2">
              {collection.metadata?.movies?.map((movieName, i) => (
                <Link
                  key={`movie-${i}`}
                  href={`/movies?search=${encodeURIComponent(movieName)}`}
                  className="px-3 py-1.5 bg-[#3a3020] text-[#d4a012] rounded-full text-sm hover:bg-[#4a4030] transition-colors flex items-center gap-1.5 border border-[#5c4108]"
                >
                  <span>🎬</span>
                  {movieName}
                </Link>
              ))}
              {collection.metadata?.characters?.map((char, i) => (
                <Link
                  key={`char-${i}`}
                  href={`/characters?search=${encodeURIComponent(char)}`}
                  className="px-3 py-1.5 bg-[#2a3a4a] text-[#60a5fa] rounded-full text-sm hover:bg-[#3a4a5a] transition-colors flex items-center gap-1.5 border border-[#3a4a5a]"
                >
                  <span>⭐</span>
                  {char}
                </Link>
              ))}
            </div>
          )}

          {/* Page Thumbnails */}
          {collection.pages.length > 0 && (
            <div className="mb-8 vintage-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#3a3020] flex items-center justify-between bg-[#2a2318]">
                <h2 className="font-bold text-[#d4a012]">
                  صفحات المقال ({collection.totalPages} صفحة)
                </h2>
                {selectedPage !== null && (
                  <button
                    onClick={() => setSelectedPage(null)}
                    className="text-sm text-[#9c8560] hover:text-[#d4a012] transition-colors"
                  >
                    إغلاق المعاينة
                  </button>
                )}
              </div>
              
              {/* Thumbnails Row */}
              <div className="p-4 flex gap-3 overflow-x-auto bg-[#1a1510]">
                {collection.pages.map((page, index) => (
                  <button
                    key={page.pageNumber}
                    onClick={() => setSelectedPage(selectedPage === index ? null : index)}
                    className={`flex-shrink-0 relative rounded-lg overflow-hidden transition-all ${
                      selectedPage === index 
                        ? 'ring-4 ring-[#d4a012] scale-105' 
                        : 'hover:ring-2 hover:ring-[#5c4108]'
                    }`}
                  >
                    <div className="w-20 h-28 relative bg-[#2a2318]">
                      <Image
                        src={page.imagePath}
                        alt={`صفحة ${page.pageNumber}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-[#1a1510]/90 text-[#d4a012] text-xs text-center py-1 font-bold">
                      {page.pageNumber}
                    </div>
                    {/* Film sprocket */}
                    <div className="absolute top-0 bottom-0 left-0 w-1.5 flex flex-col justify-around py-1">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-[#3a3020] rounded-sm" />
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Page Preview */}
              {selectedPage !== null && collection.pages[selectedPage] && (
                <div className="p-6 border-t border-[#3a3020] bg-[#0d0a08]">
                  <div 
                    className="relative mx-auto max-w-2xl cursor-zoom-in"
                    onClick={() => setZoomedImage(collection.pages[selectedPage].imagePath)}
                  >
                    <Image
                      src={collection.pages[selectedPage].imagePath}
                      alt={`صفحة ${collection.pages[selectedPage].pageNumber}`}
                      width={800}
                      height={1000}
                      className="w-full rounded-lg border-2 border-[#3a3020]"
                    />
                    <p className="text-center text-sm text-[#7a6545] mt-3">
                      اضغط للتكبير
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Article Text */}
          <div className="vintage-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#3a3020] bg-[#2a2318]">
              <h2 className="font-bold text-[#d4a012]">نص المقال</h2>
            </div>
            
            <div className="p-8 bg-[#1a1510]">
              {collection.combinedFormattedContent && (collection.combinedFormattedContent.title || collection.combinedFormattedContent.body) ? (
                <div className="max-w-3xl mx-auto space-y-6">
                  {collection.combinedFormattedContent.title && (
                    <h1 className="text-3xl font-bold text-[#d4a012] leading-relaxed text-center">
                      {collection.combinedFormattedContent.title}
                    </h1>
                  )}
                  
                  {collection.combinedFormattedContent.subtitle && (
                    <p className="text-xl text-[#b8860b] leading-relaxed text-center">
                      {collection.combinedFormattedContent.subtitle}
                    </p>
                  )}
                  
                  <hr className="my-8 border-[#3a3020]" />
                  
                  {collection.combinedFormattedContent.body && (
                    <div className="text-[#d4c4a8] leading-loose">
                      {collection.combinedFormattedContent.body.split('\n').map((para, i) => (
                        para.trim() && <p key={i} className="mb-4 text-lg">{para}</p>
                      ))}
                    </div>
                  )}
                  
                  {collection.combinedFormattedContent.dialogues && collection.combinedFormattedContent.dialogues.length > 0 && (
                    <div className="mt-8 space-y-4 bg-[#2a2318] rounded-xl p-6 border border-[#3a3020]">
                      <h3 className="font-bold text-[#d4a012] border-b border-[#3a3020] pb-2">الحوارات</h3>
                      {collection.combinedFormattedContent.dialogues.map((dialogue, i) => (
                        <div key={i} className="pr-4 border-r-4 border-[#d4a012]">
                          {dialogue.speaker && (
                            <p className="font-bold text-[#b8860b]">{dialogue.speaker}:</p>
                          )}
                          <p className="text-[#d4c4a8] italic text-lg">&ldquo;{dialogue.text}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {collection.combinedFormattedContent.credits && (
                    <div className="mt-8 pt-4 border-t border-[#3a3020] text-sm text-[#7a6545] text-center">
                      {collection.combinedFormattedContent.credits}
                    </div>
                  )}
                </div>
              ) : displayText ? (
                <div className="max-w-3xl mx-auto">
                  {renderFormattedText(displayText)}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#2a2318] flex items-center justify-center">
                    <span className="text-4xl">📝</span>
                  </div>
                  <p className="text-lg text-[#9c8560]">لم يتم استخراج نص من هذا المقال بعد</p>
                  <p className="text-sm mt-2 text-[#7a6545]">يمكنك الاطلاع على الصور الأصلية أعلاه</p>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Images Gallery */}
          {extractedImages.length > 0 && (
            <div className="mt-8 vintage-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#3a3020] bg-[#2a2318]">
                <h2 className="font-bold text-[#d4a012]">الصور المستخرجة ({extractedImages.length})</h2>
              </div>
              <div className="p-6 bg-[#1a1510]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {extractedImages.map((img) => (
                    <div
                      key={img._id}
                      className="group relative aspect-square rounded-lg overflow-hidden bg-[#2a2318] cursor-pointer border-2 border-[#3a3020] hover:border-[#d4a012] transition-colors"
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
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-[#0d0a08] to-transparent">
                          <p className="text-[#d4a012] text-xs truncate">{img.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Article Info */}
          <div className="mt-8 vintage-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#3a3020] bg-[#2a2318]">
              <h2 className="font-bold text-[#d4a012]">معلومات المقال</h2>
            </div>
            <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm bg-[#1a1510]">
              <div>
                <span className="text-[#7a6545]">عدد الصفحات:</span>
                <p className="font-bold text-[#d4c4a8] mt-1">{collection.totalPages} صفحة</p>
              </div>
              <div>
                <span className="text-[#7a6545]">تاريخ النشر:</span>
                <p className="font-bold text-[#d4c4a8] mt-1">
                  {collection.publishedAt ? formatDate(collection.publishedAt) : '-'}
                </p>
              </div>
              <div>
                <span className="text-[#7a6545]">تاريخ الرفع:</span>
                <p className="font-bold text-[#d4c4a8] mt-1">
                  {formatDate(collection.createdAt)}
                </p>
              </div>
              {collection.metadata?.source && (
                <div>
                  <span className="text-[#7a6545]">المصدر:</span>
                  <p className="font-bold text-[#d4c4a8] mt-1">{collection.metadata.source}</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-10 flex justify-center">
            <Link href="/archive" className="btn-gold px-8 py-3 rounded-xl text-lg">
              تصفح المزيد من المقالات
            </Link>
          </div>
        </main>

        {/* Zoomed Image Modal */}
        {zoomedImage && (
          <div
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setZoomedImage(null)}
          >
            <button
              className="absolute top-6 left-6 text-[#9c8560] hover:text-[#d4a012] transition-colors"
              onClick={() => setZoomedImage(null)}
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="relative max-w-5xl max-h-[90vh] w-full">
              <Image
                src={zoomedImage}
                alt="Zoomed image"
                width={1200}
                height={1600}
                className="object-contain max-h-[90vh] mx-auto rounded-lg border-4 border-[#3a3020]"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="py-10 px-6 bg-[#0a0805] border-t border-[#2a2318] mt-12">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex justify-center gap-2 mb-4">
              {[...Array(3)].map((_, i) => (
                <span key={i} className="text-[#5c4108]">★</span>
              ))}
            </div>
            <p className="text-[#d4a012] font-bold text-lg mb-2">أرشيف السينما العربية الرقمي</p>
            <p className="text-[#7a6545] text-sm">
              حفظ التراث السينمائي العربي للأجيال القادمة
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
