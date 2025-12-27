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

const DECADE_FILTERS = [
  { label: 'الكل', value: '' },
  { label: 'الثلاثينات', value: '1930' },
  { label: 'الأربعينات', value: '1940' },
  { label: 'الخمسينات', value: '1950' },
  { label: 'الستينات', value: '1960' },
  { label: 'السبعينات', value: '1970' },
];

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterDecade, setFilterDecade] = useState('');
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
        let filteredMovies = data.movies || [];
        
        // Filter by decade
        if (filterDecade) {
          const decadeStart = parseInt(filterDecade);
          filteredMovies = filteredMovies.filter((m: Movie) => 
            m.year && m.year >= decadeStart && m.year < decadeStart + 10
          );
        }
        
        setMovies(filteredMovies);
        
        const genres = new Set<string>();
        data.movies?.forEach((m: Movie) => m.genres?.forEach(g => genres.add(g)));
        setAllGenres(Array.from(genres).sort());
      }
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterGenre, filterDecade]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  return (
    <div className="min-h-screen bg-[#0f0c08] relative overflow-hidden film-grain" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 egyptian-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[150%] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center top, rgba(201, 162, 39, 0.1) 0%, transparent 60%)' }}
      />
      <div className="fixed top-0 left-0 w-5 h-full bg-[#1a1612] film-sprockets pointer-events-none" />
      <div className="fixed top-0 right-0 w-5 h-full bg-[#1a1612] film-sprockets pointer-events-none" />
      <div className="fixed top-0 left-0 w-28 h-full pointer-events-none"
        style={{ background: 'linear-gradient(90deg, rgba(107, 28, 35, 0.4) 0%, transparent 100%)' }}
      />
      <div className="fixed top-0 right-0 w-28 h-full pointer-events-none"
        style={{ background: 'linear-gradient(270deg, rgba(107, 28, 35, 0.4) 0%, transparent 100%)' }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="rotana-header py-4 px-6">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c9a227] via-[#e8d48b] to-[#8b7319] p-0.5">
                  <div className="w-full h-full rounded-full bg-[#1a1612] flex items-center justify-center">
                    <span className="text-2xl">🎬</span>
                  </div>
                </div>
                <div>
                  <span className="text-[#c9a227] font-bold text-lg">سينما زمان</span>
                  <p className="text-[#8b7319] text-xs">CINEMA ZAMAN</p>
                </div>
              </Link>
            </div>
            <nav className="flex items-center gap-2">
              <Link href="/" className="btn-outline-gold px-4 py-2 rounded-lg text-sm">الرئيسية</Link>
              <Link href="/archive" className="btn-outline-gold px-4 py-2 rounded-lg text-sm">الأرشيف</Link>
              <Link href="/characters" className="btn-outline-gold px-4 py-2 rounded-lg text-sm">النجوم</Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="py-16 px-6 border-b border-[#3a3020]">
          <div className="container mx-auto text-center max-w-4xl">
            <div className="flex justify-center gap-3 mb-6">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-[#c9a227] ${i === 2 ? 'text-3xl' : 'text-xl'}`}>
                  {i === 2 ? '🎬' : '★'}
                </span>
              ))}
            </div>
            <h1 className="text-5xl font-bold film-title mb-4">أفلام العصر الذهبي</h1>
            <p className="text-[#8b7319] tracking-wider mb-8">GOLDEN ERA FILMS</p>
            
            {/* Search */}
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث عن فيلم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="vintage-input w-full px-6 py-4 pr-14 rounded-xl text-lg"
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
        </section>

        {/* Filters */}
        <section className="py-6 px-6 bg-[#1a1612]/50 border-b border-[#3a3020]">
          <div className="container mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {/* Decade Filter */}
              <div className="flex gap-2">
                {DECADE_FILTERS.map((decade) => (
                  <button
                    key={decade.value}
                    onClick={() => setFilterDecade(decade.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterDecade === decade.value
                        ? 'bg-gradient-to-b from-[#c9a227] to-[#8b7319] text-[#1a1612]'
                        : 'text-[#9c8550] hover:text-[#c9a227] bg-[#2a2318]'
                    }`}
                  >
                    {decade.label}
                  </button>
                ))}
              </div>
              
              {/* Genre Filter */}
              {allGenres.length > 0 && (
                <select
                  value={filterGenre}
                  onChange={(e) => setFilterGenre(e.target.value)}
                  className="vintage-input px-4 py-2 rounded-lg text-sm"
                >
                  <option value="">جميع التصنيفات</option>
                  {allGenres.map((genre) => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </section>

        {/* Movies Grid */}
        <main className="container mx-auto px-6 py-10">
          <div className="mb-6 text-[#c9a227] font-bold">
            {movies.length} فيلم
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="film-spinner mx-auto mb-4"></div>
              <p className="text-[#c9a227]">جاري تحميل الأفلام...</p>
            </div>
          ) : movies.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#2a2318] flex items-center justify-center">
                <span className="text-5xl">🎬</span>
              </div>
              <h3 className="text-2xl font-bold text-[#c9a227] mb-2">لا توجد أفلام</h3>
              <p className="text-[#9c8550]">لم يتم العثور على أفلام تطابق معايير البحث</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {movies.map((movie) => (
                <div
                  key={movie._id}
                  className="vintage-card rounded-xl overflow-hidden hover:scale-105 transition-transform group"
                >
                  {/* Movie poster area */}
                  <div className="h-40 bg-gradient-to-br from-[#2a2318] to-[#1a1612] flex items-center justify-center relative">
                    <span className="text-7xl opacity-30 group-hover:opacity-50 transition-opacity">🎬</span>
                    {movie.year && (
                      <div className="absolute top-3 left-3 px-3 py-1 bg-[#c9a227] text-[#1a1612] rounded-full text-sm font-bold">
                        {movie.year}
                      </div>
                    )}
                    {/* Film sprocket decoration */}
                    <div className="absolute top-0 bottom-0 right-0 w-3 flex flex-col justify-around py-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-[#3a3020] rounded-sm" />
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-[#e8d48b] mb-1 group-hover:text-[#c9a227] transition-colors">
                      {movie.arabicName}
                    </h3>
                    {movie.englishName && (
                      <p className="text-sm text-[#8b7319] mb-3" dir="ltr">{movie.englishName}</p>
                    )}
                    
                    {movie.genres && movie.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {movie.genres.slice(0, 3).map((genre, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-[#3a3020] text-[#c9a227] text-xs rounded cursor-pointer hover:bg-[#5c4108]"
                            onClick={() => setFilterGenre(genre)}
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {movie.description && (
                      <p className="text-sm text-[#9c8550] line-clamp-2 mb-4">
                        {movie.description}
                      </p>
                    )}
                    
                    <div className="pt-4 border-t border-[#3a3020] flex items-center justify-between">
                      <span className="text-xs text-[#7a6540]">
                        {movie.documentCount} وثيقة
                      </span>
                      <Link
                        href={`/archive?movie=${encodeURIComponent(movie.arabicName)}`}
                        className="text-[#c9a227] hover:text-[#e8d48b] text-sm font-medium flex items-center gap-1"
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
        <footer className="py-10 px-6 bg-[#0a0805] border-t border-[#3a3020]">
          <div className="container mx-auto text-center">
            <div className="text-[#c9a22730] text-xs tracking-[0.3em] mb-4">
              𓂀 𓃭 𓆣 𓇋 𓈖
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {[...Array(3)].map((_, i) => (
                <span key={i} className="text-[#8b7319]">★</span>
              ))}
            </div>
            <p className="text-[#5c4108] text-sm">سينما زمان © {new Date().getFullYear()}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
