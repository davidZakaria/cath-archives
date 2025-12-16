'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Movie {
  _id: string;
  arabicName: string;
  englishName?: string;
  year?: number;
  genres?: string[];
  description?: string;
  posterImage?: string;
  documentCount: number;
}

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [allGenres, setAllGenres] = useState<string[]>([]);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterGenre) params.set('genre', filterGenre);
      
      const response = await fetch(`/api/movies?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMovies(data.movies || []);
        
        // Extract unique genres
        const genres = new Set<string>();
        data.movies?.forEach((m: Movie) => m.genres?.forEach(g => genres.add(g)));
        setAllGenres(Array.from(genres).sort());
      }
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterGenre]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/archive" className="text-amber-600 hover:text-amber-800 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-amber-900">الأفلام</h1>
                <p className="text-sm text-amber-600">تصفح الأفلام المذكورة في الأرشيف</p>
              </div>
            </div>
            
            <nav className="flex items-center gap-4">
              <Link 
                href="/archive" 
                className="text-amber-700 hover:text-amber-900 font-medium transition-colors"
              >
                الأرشيف
              </Link>
              <Link 
                href="/characters" 
                className="text-amber-700 hover:text-amber-900 font-medium transition-colors"
              >
                الشخصيات
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Search & Filter */}
      <div className="bg-amber-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="ابحث عن فيلم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 pr-12 rounded-lg text-gray-900 bg-white shadow-lg focus:ring-4 focus:ring-amber-300 focus:outline-none"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {allGenres.length > 0 && (
              <select
                value={filterGenre}
                onChange={(e) => setFilterGenre(e.target.value)}
                className="px-4 py-3 rounded-lg bg-white text-gray-900 focus:ring-4 focus:ring-amber-300 focus:outline-none"
              >
                <option value="">جميع التصنيفات</option>
                {allGenres.map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 text-amber-600">
          {movies.length} فيلم
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600"></div>
            <p className="mt-4 text-amber-600 text-lg">جاري التحميل...</p>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto w-16 h-16 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <h3 className="mt-4 text-xl font-medium text-gray-700">لا توجد أفلام</h3>
            <p className="mt-2 text-gray-500">لم يتم العثور على أفلام تطابق معايير البحث</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {movies.map((movie) => (
              <div
                key={movie._id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{movie.arabicName}</h3>
                      {movie.englishName && (
                        <p className="text-sm text-gray-500 mb-2" dir="ltr">{movie.englishName}</p>
                      )}
                    </div>
                    {movie.year && (
                      <span className="flex-shrink-0 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                        {movie.year}
                      </span>
                    )}
                  </div>
                  
                  {movie.genres && movie.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {movie.genres.map((genre, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded cursor-pointer hover:bg-gray-200"
                          onClick={() => setFilterGenre(genre)}
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {movie.description && (
                    <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                      {movie.description}
                    </p>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      {movie.documentCount} وثيقة مرتبطة
                    </span>
                    <Link
                      href={`/archive?movie=${encodeURIComponent(movie.arabicName)}`}
                      className="text-amber-600 hover:text-amber-800 text-sm font-medium flex items-center gap-1"
                    >
                      عرض الوثائق
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
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
