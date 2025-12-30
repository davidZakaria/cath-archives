'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AdvancedSearch from '@/components/AdvancedSearch';
import TimelineView from '@/components/TimelineView';

interface LinkedEntity {
  _id: string;
  arabicName: string;
  englishName?: string;
  year?: number;
  type?: string;
  posterImage?: string;
  photoImage?: string; // For characters
  tmdbId?: number;
  voteAverage?: number;
}

interface Collection {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  totalPages: number;
  coverImagePath?: string;
  linkedMovie?: LinkedEntity;
  linkedCharacter?: LinkedEntity;
  linkType?: 'movie' | 'character';
  metadata?: {
    movies?: string[];
    characters?: string[];
    publicationDate?: string;
  };
  publishedAt?: string;
  createdAt: string;
}

export default function ArchivePage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'character'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'timeline' | 'search'>('grid');

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/collections?status=published&limit=100');
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const filteredCollections = collections.filter((col) => {
    if (filterType === 'movie' && !col.linkedMovie) return false;
    if (filterType === 'character' && !col.linkedCharacter) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      col.title.toLowerCase().includes(query) ||
      col.linkedMovie?.arabicName.toLowerCase().includes(query) ||
      col.linkedMovie?.englishName?.toLowerCase().includes(query) ||
      col.linkedCharacter?.arabicName.toLowerCase().includes(query) ||
      col.linkedCharacter?.englishName?.toLowerCase().includes(query) ||
      col.metadata?.movies?.some(m => m.toLowerCase().includes(query)) ||
      col.metadata?.characters?.some(c => c.toLowerCase().includes(query))
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#0f0c08] relative overflow-hidden film-grain" dir="rtl">
      {/* Egyptian Pattern Background */}
      <div className="fixed inset-0 egyptian-pattern opacity-20 pointer-events-none" />
      
      {/* Spotlight */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[180%] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(201, 162, 39, 0.12) 0%, rgba(107, 28, 35, 0.03) 40%, transparent 70%)',
        }}
      />
      
      {/* Cinema Curtains */}
      <div className="fixed top-0 left-0 w-32 h-full pointer-events-none"
        style={{ background: 'linear-gradient(90deg, rgba(107, 28, 35, 0.5) 0%, transparent 100%)' }}
      />
      <div className="fixed top-0 right-0 w-32 h-full pointer-events-none"
        style={{ background: 'linear-gradient(270deg, rgba(107, 28, 35, 0.5) 0%, transparent 100%)' }}
      />
      
      {/* Film Sprockets */}
      <div className="fixed top-0 left-0 w-5 h-full bg-[#1a1612] film-sprockets pointer-events-none" />
      <div className="fixed top-0 right-0 w-5 h-full bg-[#1a1612] film-sprockets pointer-events-none" />

      <div className="relative z-10">
        {/* Rotana-Style Header */}
        <header className="rotana-header py-4 px-6 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c9a227] via-[#e8d48b] to-[#8b7319] p-0.5">
                    <div className="w-full h-full rounded-full bg-[#1a1612] flex items-center justify-center">
                      <span className="text-2xl">🎬</span>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[#c9a227] arabic-title">سينما زمان</h1>
                    <p className="text-xs text-[#8b7319]">CINEMA ZAMAN</p>
                  </div>
                </Link>
              </div>
              
              <nav className="flex items-center gap-2">
                <Link href="/" className="btn-outline-gold px-4 py-2 rounded-lg text-sm font-medium">
                  الرئيسية
                </Link>
                <Link href="/movies" className="btn-outline-gold px-4 py-2 rounded-lg text-sm font-medium">
                  الأفلام
                </Link>
                <Link href="/characters" className="btn-outline-gold px-4 py-2 rounded-lg text-sm font-medium">
                  النجوم
                </Link>
                <Link href="/review" className="btn-rotana px-4 py-2 rounded-lg text-sm font-bold">
                  المراجعة
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="relative py-20 px-6 border-b border-[#3a3020]">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            {/* Decorative Elements */}
            <div className="text-[#c9a22730] text-sm tracking-[0.5em] mb-6">
              𓂀 𓃭 𓆣 𓇋 𓈖 𓊪 𓋴 𓌳
            </div>
            
            <div className="flex justify-center gap-3 mb-6">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-[#c9a227] ${i === 2 ? 'text-2xl' : 'text-lg'}`}>
                  {i === 2 ? '✦' : '★'}
                </span>
              ))}
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold film-title arabic-title mb-4">
              أرشيف السينما
            </h2>
            <p className="text-[#8b7319] text-lg mb-8 tracking-widest">
              THE GOLDEN ERA ARCHIVES
            </p>
            
            <div className="art-deco-divider max-w-sm mx-auto mb-8">
              <span className="text-[#c9a227] text-xl">❖</span>
            </div>
            
            <p className="text-[#d4c4a0] text-lg max-w-2xl mx-auto mb-10 leading-relaxed arabic-body">
              تصفح مجموعة فريدة من المجلات والصحف السينمائية التاريخية
              <br />
              <span className="text-[#9c8550]">محفوظة رقمياً للأجيال القادمة</span>
            </p>
            
            {/* Search Bar */}
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث عن فيلم، ممثل، أو موضوع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="vintage-input w-full px-6 py-4 pr-14 rounded-xl text-lg border-2 border-[#5c4108] focus:border-[#c9a227]"
                />
                <svg
                  className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-[#7a6540]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-10">
          {/* Filters and View Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <div className="flex items-center gap-4">
              <div className="vintage-card inline-flex p-1.5 rounded-xl">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    filterType === 'all' 
                      ? 'bg-gradient-to-b from-[#c9a227] to-[#8b7319] text-[#1a1612]' 
                      : 'text-[#9c8550] hover:text-[#c9a227]'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setFilterType('movie')}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    filterType === 'movie' 
                      ? 'bg-gradient-to-b from-[#c9a227] to-[#8b7319] text-[#1a1612]' 
                      : 'text-[#9c8550] hover:text-[#c9a227]'
                  }`}
                >
                  🎬 أفلام
                </button>
                <button
                  onClick={() => setFilterType('character')}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    filterType === 'character' 
                      ? 'bg-gradient-to-b from-[#c9a227] to-[#8b7319] text-[#1a1612]' 
                      : 'text-[#9c8550] hover:text-[#c9a227]'
                  }`}
                >
                  ⭐ شخصيات
                </button>
              </div>
              
              <span className="text-[#c9a227] font-bold">
                {filteredCollections.length} مقال
              </span>
            </div>
            
            <div className="vintage-card inline-flex p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded transition-all ${
                  viewMode === 'grid' ? 'bg-[#3a3020] text-[#c9a227]' : 'text-[#7a6540] hover:text-[#c9a227]'
                }`}
                title="عرض شبكي"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded transition-all ${
                  viewMode === 'list' ? 'bg-[#3a3020] text-[#c9a227]' : 'text-[#7a6540] hover:text-[#c9a227]'
                }`}
                title="عرض قائمة"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2.5 rounded transition-all ${
                  viewMode === 'timeline' ? 'bg-[#3a3020] text-[#c9a227]' : 'text-[#7a6540] hover:text-[#c9a227]'
                }`}
                title="الجدول الزمني"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('search')}
                className={`p-2.5 rounded transition-all ${
                  viewMode === 'search' ? 'bg-[#3a3020] text-[#c9a227]' : 'text-[#7a6540] hover:text-[#c9a227]'
                }`}
                title="بحث متقدم"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Timeline View */}
          {viewMode === 'timeline' && (
            <TimelineView language="ar" />
          )}

          {/* Advanced Search View */}
          {viewMode === 'search' && (
            <AdvancedSearch language="ar" showFilters={true} defaultStatus="published" />
          )}

          {/* Collections - Grid/List Views */}
          {(viewMode === 'grid' || viewMode === 'list') && loading ? (
            <div className="text-center py-24">
              <div className="film-spinner mx-auto mb-6"></div>
              <p className="text-[#c9a227] text-xl arabic-title">جاري تحميل الأرشيف...</p>
              <p className="text-[#8b7319] text-sm mt-2">LOADING ARCHIVES</p>
            </div>
          ) : (viewMode === 'grid' || viewMode === 'list') && filteredCollections.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-[#2a2318] flex items-center justify-center border-2 border-[#5c4108]">
                <span className="text-6xl">🎞️</span>
              </div>
              <h3 className="text-3xl font-bold text-[#c9a227] mb-2 arabic-title">لا توجد مقالات منشورة</h3>
              <p className="text-[#9c8550] mb-8">لم يتم العثور على مقالات تطابق معايير البحث</p>
              <Link href="/" className="btn-rotana px-8 py-4 rounded-xl inline-flex items-center gap-2 text-lg">
                <span>📤</span>
                رفع مقال جديد
              </Link>
            </div>
          ) : (viewMode === 'grid' || viewMode === 'list') && viewMode === 'grid' ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCollections.map((col) => (
                <Link
                  key={col._id}
                  href={`/archive/${col._id}`}
                  className="group vintage-card rounded-xl overflow-hidden hover:border-[#c9a227] transition-all duration-300 transform hover:-translate-y-2 hover:shadow-lg hover:shadow-[#c9a227]/20"
                >
                  <div className="aspect-[3/4] relative bg-[#2a2318] movie-poster">
                    {/* Prefer TMDB poster/photo if available, then cover image */}
                    {col.linkedMovie?.posterImage || col.linkedCharacter?.photoImage || col.coverImagePath ? (
                      <Image
                        src={col.linkedMovie?.posterImage || col.linkedCharacter?.photoImage || col.coverImagePath || ''}
                        alt={col.title}
                        fill
                        className={`object-cover group-hover:scale-105 transition-transform duration-500 ${(col.linkedMovie?.posterImage || col.linkedCharacter?.photoImage) ? '' : 'sepia-photo'}`}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-7xl opacity-40">{col.linkType === 'character' ? '⭐' : '🎬'}</span>
                      </div>
                    )}
                    
                    {/* Film Sprockets */}
                    <div className="absolute top-0 bottom-0 left-0 w-4 flex flex-col justify-around py-3 opacity-60">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="w-3 h-3 bg-[#3a3020] rounded-sm mx-auto border border-[#5c4108]" />
                      ))}
                    </div>
                    
                    {/* Pages Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-[#c9a227] text-[#1a1612]">
                        {col.totalPages} صفحة
                      </span>
                    </div>
                    
                    {/* TMDB Rating Badge */}
                    {col.linkedMovie?.voteAverage && col.linkedMovie.voteAverage > 0 && (
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-black/80 rounded-full px-2 py-1">
                        <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-white text-xs font-bold">{col.linkedMovie.voteAverage.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Link Type Badge */}
                    {(col.linkedMovie || col.linkedCharacter) && (
                      <div className="absolute bottom-3 right-3 left-3 z-10">
                        <div className="bg-[#1a1612]/95 backdrop-blur-sm rounded-lg px-3 py-2 border border-[#5c4108]">
                          <p className="text-[#c9a227] text-sm font-bold truncate arabic-title">
                            {col.linkedMovie?.arabicName || col.linkedCharacter?.arabicName}
                          </p>
                          <p className="text-[#9c8550] text-xs">
                            {col.linkType === 'movie' ? '🎬 فيلم' : '⭐ شخصية'}
                            {col.linkedMovie?.year && ` • ${col.linkedMovie.year}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 bg-gradient-to-b from-[#1a1612] to-[#0f0c08]">
                    <h3 className="font-bold text-[#d4c4a0] line-clamp-2 group-hover:text-[#c9a227] transition-colors arabic-title">
                      {col.title}
                    </h3>
                    
                    {col.publishedAt && (
                      <p className="mt-2 text-xs text-[#7a6540]">
                        نُشر في {formatDate(col.publishedAt)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {filteredCollections.map((col) => (
                <Link
                  key={col._id}
                  href={`/archive/${col._id}`}
                  className="flex gap-5 vintage-card rounded-xl overflow-hidden hover:border-[#c9a227] transition-all p-5 group"
                >
                  <div className="w-28 h-36 relative flex-shrink-0 rounded-lg overflow-hidden bg-[#2a2318]">
                    {col.coverImagePath ? (
                      <Image
                        src={col.coverImagePath}
                        alt={col.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300 sepia-photo"
                        sizes="112px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl opacity-40">🎬</span>
                      </div>
                    )}
                    {/* Film sprocket */}
                    <div className="absolute top-0 bottom-0 left-0 w-2 flex flex-col justify-around py-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 bg-[#3a3020] rounded-sm" />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-lg text-[#d4c4a0] group-hover:text-[#c9a227] transition-colors arabic-title">
                        {col.title}
                      </h3>
                      <span className="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-full bg-[#c9a227] text-[#1a1612]">
                        {col.totalPages} صفحة
                      </span>
                    </div>
                    
                    {(col.linkedMovie || col.linkedCharacter) && (
                      <p className="mt-2 text-sm text-[#c9a227]">
                        {col.linkType === 'movie' ? '🎬 فيلم: ' : '⭐ شخصية: '}
                        {col.linkedMovie?.arabicName || col.linkedCharacter?.arabicName}
                        {col.linkedMovie?.year && ` (${col.linkedMovie.year})`}
                      </p>
                    )}
                    
                    {col.description && (
                      <p className="mt-2 text-sm text-[#9c8550] line-clamp-2 arabic-body">
                        {col.description}
                      </p>
                    )}
                    
                    {col.publishedAt && (
                      <p className="mt-3 text-xs text-[#7a6540]">
                        نُشر في {formatDate(col.publishedAt)}
                      </p>
                    )}
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-shrink-0 self-center text-[#5c4108] group-hover:text-[#c9a227] transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </main>

        {/* Footer */}
        <footer className="py-12 px-6 bg-gradient-to-b from-[#1a1612] to-[#0f0c08] border-t border-[#3a3020] mt-12">
          <div className="max-w-7xl mx-auto text-center">
            <div className="text-[#c9a22730] text-xs tracking-[0.3em] mb-6">
              𓂀 𓃭 𓆣 𓇋 𓈖 𓊪 𓋴 𓌳 𓏏 𓐍
            </div>
            <div className="flex justify-center gap-3 mb-6">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-[#8b7319]">★</span>
              ))}
            </div>
            <p className="text-[#c9a227] font-bold text-lg mb-2 arabic-title">سينما زمان</p>
            <p className="text-[#7a6540] text-sm">
              حفظ التراث السينمائي العربي للأجيال القادمة
            </p>
            <div className="mt-6 flex justify-center gap-6 text-sm">
              <Link href="/" className="text-[#9c8550] hover:text-[#c9a227] transition-colors">
                الرئيسية
              </Link>
              <span className="text-[#3a3020]">❖</span>
              <Link href="/movies" className="text-[#9c8550] hover:text-[#c9a227] transition-colors">
                الأفلام
              </Link>
              <span className="text-[#3a3020]">❖</span>
              <Link href="/characters" className="text-[#9c8550] hover:text-[#c9a227] transition-colors">
                النجوم
              </Link>
              <span className="text-[#3a3020]">❖</span>
              <Link href="/review" className="text-[#9c8550] hover:text-[#c9a227] transition-colors">
                المراجعة
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
