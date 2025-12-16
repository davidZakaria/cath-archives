'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      // Only fetch published collections
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

  // Filter collections by search query and type
  const filteredCollections = collections.filter((col) => {
    // Filter by type
    if (filterType === 'movie' && !col.linkedMovie) return false;
    if (filterType === 'character' && !col.linkedCharacter) return false;

    // Filter by search
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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-amber-800 hover:text-amber-600 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-amber-900">أرشيف السينما العربية</h1>
                <p className="text-sm text-amber-600">مجموعة رقمية من الوثائق السينمائية التاريخية</p>
              </div>
            </div>
            
            <nav className="flex items-center gap-4">
              <Link 
                href="/movies" 
                className="text-amber-700 hover:text-amber-900 font-medium transition-colors"
              >
                الأفلام
              </Link>
              <Link 
                href="/characters" 
                className="text-amber-700 hover:text-amber-900 font-medium transition-colors"
              >
                الشخصيات
              </Link>
              <Link 
                href="/admin/review" 
                className="text-amber-700 hover:text-amber-900 font-medium transition-colors"
              >
                الإدارة
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-800 to-amber-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">اكتشف تاريخ السينما العربية</h2>
          <p className="text-amber-100 text-lg max-w-2xl mx-auto mb-8">
            تصفح مجموعة فريدة من المجلات والصحف السينمائية التاريخية، محفوظة رقمياً للأجيال القادمة
          </p>
          
          {/* Search Bar */}
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن فيلم، ممثل، أو موضوع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-4 pr-12 rounded-full text-gray-900 bg-white shadow-lg focus:ring-4 focus:ring-amber-300 focus:outline-none text-lg"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400"
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
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters and View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex rounded-lg border border-amber-200 bg-white overflow-hidden">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filterType === 'all' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-amber-50'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFilterType('movie')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-x border-amber-200 ${
                  filterType === 'movie' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-amber-50'
                }`}
              >
                أفلام
              </button>
              <button
                onClick={() => setFilterType('character')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filterType === 'character' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-amber-50'
                }`}
              >
                شخصيات
              </button>
            </div>
            
            <span className="text-amber-600">
              {filteredCollections.length} مقال
            </span>
          </div>
          
          <div className="flex items-center gap-2 bg-white rounded-lg border border-amber-200 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-amber-100 text-amber-800' : 'text-gray-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-amber-100 text-amber-800' : 'text-gray-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Collections Grid/List */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600"></div>
            <p className="mt-4 text-amber-600 text-lg">جاري تحميل الأرشيف...</p>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto w-16 h-16 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-xl font-medium text-gray-700">لا توجد مقالات منشورة</h3>
            <p className="mt-2 text-gray-500">لم يتم العثور على مقالات تطابق معايير البحث</p>
            <Link 
              href="/" 
              className="inline-block mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              رفع مقال جديد
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCollections.map((col) => (
              <Link
                key={col._id}
                href={`/archive/${col._id}`}
                className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="aspect-[3/4] relative bg-amber-50">
                  {col.coverImagePath ? (
                    <Image
                      src={col.coverImagePath}
                      alt={col.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-300">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Pages Badge */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-white/90 text-amber-700">
                      {col.totalPages} صفحة
                    </span>
                  </div>

                  {/* Link Type Badge */}
                  {(col.linkedMovie || col.linkedCharacter) && (
                    <div className="absolute bottom-3 right-3 left-3">
                      <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
                        <p className="text-white text-sm font-medium truncate">
                          {col.linkedMovie?.arabicName || col.linkedCharacter?.arabicName}
                        </p>
                        <p className="text-amber-300 text-xs">
                          {col.linkType === 'movie' ? 'فيلم' : 'شخصية'}
                          {col.linkedMovie?.year && ` • ${col.linkedMovie.year}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-amber-700 transition-colors">
                    {col.title}
                  </h3>
                  
                  {col.publishedAt && (
                    <p className="mt-2 text-xs text-gray-400">
                      نُشر في {formatDate(col.publishedAt)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCollections.map((col) => (
              <Link
                key={col._id}
                href={`/archive/${col._id}`}
                className="flex gap-4 bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow p-4"
              >
                <div className="w-24 h-32 relative flex-shrink-0 rounded-lg overflow-hidden bg-amber-50">
                  {col.coverImagePath ? (
                    <Image
                      src={col.coverImagePath}
                      alt={col.title}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-300">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 hover:text-amber-700 transition-colors">
                      {col.title}
                    </h3>
                    <span className="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                      {col.totalPages} صفحة
                    </span>
                  </div>
                  
                  {(col.linkedMovie || col.linkedCharacter) && (
                    <p className="mt-1 text-sm text-amber-600">
                      {col.linkType === 'movie' ? 'فيلم: ' : 'شخصية: '}
                      {col.linkedMovie?.arabicName || col.linkedCharacter?.arabicName}
                      {col.linkedMovie?.year && ` (${col.linkedMovie.year})`}
                    </p>
                  )}
                  
                  {col.description && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                      {col.description}
                    </p>
                  )}
                  
                  {col.publishedAt && (
                    <p className="mt-2 text-xs text-gray-400">
                      نُشر في {formatDate(col.publishedAt)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

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
