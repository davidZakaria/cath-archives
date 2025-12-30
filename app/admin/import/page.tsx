'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';

interface TMDBMovie {
  tmdbId: number;
  title: string;
  originalTitle: string;
  year: number | null;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number;
  popularity: number;
  originalLanguage: string;
  genreIds?: number[];
}

interface ImportResult {
  tmdbId: number;
  success: boolean;
  movieId?: string;
  arabicName?: string;
  error?: string;
  skipped?: boolean;
}

// Genre mapping
const GENRES: Record<number, { ar: string; en: string }> = {
  28: { ar: 'أكشن', en: 'Action' },
  12: { ar: 'مغامرة', en: 'Adventure' },
  16: { ar: 'رسوم متحركة', en: 'Animation' },
  35: { ar: 'كوميديا', en: 'Comedy' },
  80: { ar: 'جريمة', en: 'Crime' },
  99: { ar: 'وثائقي', en: 'Documentary' },
  18: { ar: 'دراما', en: 'Drama' },
  10751: { ar: 'عائلي', en: 'Family' },
  14: { ar: 'فانتازيا', en: 'Fantasy' },
  36: { ar: 'تاريخي', en: 'History' },
  27: { ar: 'رعب', en: 'Horror' },
  10402: { ar: 'موسيقى', en: 'Music' },
  9648: { ar: 'غموض', en: 'Mystery' },
  10749: { ar: 'رومانسي', en: 'Romance' },
  878: { ar: 'خيال علمي', en: 'Sci-Fi' },
  10770: { ar: 'تلفزيوني', en: 'TV Movie' },
  53: { ar: 'إثارة', en: 'Thriller' },
  10752: { ar: 'حرب', en: 'War' },
  37: { ar: 'غربي', en: 'Western' },
};

// Decade presets
const DECADES = [
  { label: { ar: 'الأربعينيات', en: '1940s' }, from: 1940, to: 1949 },
  { label: { ar: 'الخمسينيات', en: '1950s' }, from: 1950, to: 1959 },
  { label: { ar: 'الستينيات', en: '1960s' }, from: 1960, to: 1969 },
  { label: { ar: 'السبعينيات', en: '1970s' }, from: 1970, to: 1979 },
  { label: { ar: 'الثمانينيات', en: '1980s' }, from: 1980, to: 1989 },
  { label: { ar: 'التسعينيات', en: '1990s' }, from: 1990, to: 1999 },
  { label: { ar: 'الألفينيات', en: '2000s' }, from: 2000, to: 2009 },
  { label: { ar: 'العقد الحالي', en: '2010s+' }, from: 2010, to: 2030 },
];

export default function TMDBImportPage() {
  const { language, t, dir } = useLanguage();
  
  // Filters
  const [region, setRegion] = useState<'egypt' | 'arabic'>('egypt');
  const [yearFrom, setYearFrom] = useState<string>('');
  const [yearTo, setYearTo] = useState<string>('');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Results
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  
  // Selection
  const [selectedMovies, setSelectedMovies] = useState<Set<number>>(new Set());
  
  // Import
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Discover movies
  const discoverMovies = async (newPage: number = 1) => {
    setIsLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        page: String(newPage),
        region,
        sortBy,
      });
      
      if (yearFrom) params.append('yearFrom', yearFrom);
      if (yearTo) params.append('yearTo', yearTo);
      
      const response = await fetch(`/api/tmdb/discover?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setMovies(data.movies);
        setTotalPages(data.pagination.totalPages);
        setTotalResults(data.pagination.totalResults);
        setPage(newPage);
      } else {
        setError(data.error || 'Failed to fetch movies');
      }
    } catch (err) {
      setError('Failed to connect to TMDB');
    } finally {
      setIsLoading(false);
    }
  };

  // Search movies
  const searchMovies = async () => {
    if (!searchQuery.trim()) {
      discoverMovies(1);
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        page: '1',
      });
      
      if (yearFrom) params.append('year', yearFrom);
      
      const response = await fetch(`/api/tmdb/search?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setMovies(data.movies);
        setTotalPages(data.pagination.totalPages);
        setTotalResults(data.pagination.totalResults);
        setPage(1);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle movie selection
  const toggleSelection = (tmdbId: number) => {
    const newSelection = new Set(selectedMovies);
    if (newSelection.has(tmdbId)) {
      newSelection.delete(tmdbId);
    } else {
      newSelection.add(tmdbId);
    }
    setSelectedMovies(newSelection);
  };

  // Select all on current page
  const selectAll = () => {
    const newSelection = new Set(selectedMovies);
    movies.forEach(m => newSelection.add(m.tmdbId));
    setSelectedMovies(newSelection);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedMovies(new Set());
  };

  // Import selected movies
  const importSelected = async () => {
    if (selectedMovies.size === 0) return;
    
    setIsImporting(true);
    setImportResults([]);
    
    try {
      const response = await fetch('/api/tmdb/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbIds: Array.from(selectedMovies) }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setImportResults(data.results);
        setShowResults(true);
        setSelectedMovies(new Set());
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err) {
      setError('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Set decade filter
  const setDecade = (from: number, to: number) => {
    setYearFrom(String(from));
    setYearTo(String(to));
  };

  // Initial load
  useEffect(() => {
    discoverMovies(1);
  }, [region, sortBy]);

  // Translations
  const texts = {
    title: { ar: 'استيراد أفلام من TMDB', en: 'Import Movies from TMDB' },
    subtitle: { ar: 'تصفح واستيراد أفلام من قاعدة بيانات الأفلام العالمية', en: 'Browse and import movies from The Movie Database' },
    egyptianMovies: { ar: 'أفلام مصرية', en: 'Egyptian Movies' },
    arabicMovies: { ar: 'أفلام عربية', en: 'Arabic Movies' },
    search: { ar: 'بحث عن فيلم...', en: 'Search for a movie...' },
    searchBtn: { ar: 'بحث', en: 'Search' },
    filters: { ar: 'تصفية', en: 'Filters' },
    sortBy: { ar: 'ترتيب حسب', en: 'Sort by' },
    popularity: { ar: 'الأكثر شعبية', en: 'Most Popular' },
    rating: { ar: 'الأعلى تقييماً', en: 'Highest Rated' },
    newest: { ar: 'الأحدث', en: 'Newest' },
    oldest: { ar: 'الأقدم', en: 'Oldest' },
    decade: { ar: 'العقد', en: 'Decade' },
    allYears: { ar: 'كل السنوات', en: 'All Years' },
    from: { ar: 'من', en: 'From' },
    to: { ar: 'إلى', en: 'To' },
    apply: { ar: 'تطبيق', en: 'Apply' },
    selected: { ar: 'محدد', en: 'selected' },
    selectAll: { ar: 'تحديد الكل', en: 'Select All' },
    clearSelection: { ar: 'إلغاء التحديد', en: 'Clear Selection' },
    importSelected: { ar: 'استيراد المحدد', en: 'Import Selected' },
    importing: { ar: 'جاري الاستيراد...', en: 'Importing...' },
    results: { ar: 'نتيجة', en: 'results' },
    page: { ar: 'صفحة', en: 'Page' },
    of: { ar: 'من', en: 'of' },
    prev: { ar: 'السابق', en: 'Previous' },
    next: { ar: 'التالي', en: 'Next' },
    noResults: { ar: 'لا توجد نتائج', en: 'No results found' },
    importResults: { ar: 'نتائج الاستيراد', en: 'Import Results' },
    imported: { ar: 'تم الاستيراد', en: 'Imported' },
    skipped: { ar: 'موجود مسبقاً', en: 'Already exists' },
    failed: { ar: 'فشل', en: 'Failed' },
    close: { ar: 'إغلاق', en: 'Close' },
  };

  const getText = (key: keyof typeof texts) => texts[key][language];

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getText('title')}</h1>
          <p className="text-gray-600 mt-1">{getText('subtitle')}</p>
        </div>
        
        {/* Selection Actions */}
        {selectedMovies.size > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-blue-700 font-medium">
              {selectedMovies.size} {getText('selected')}
            </span>
            <button
              onClick={clearSelection}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {getText('clearSelection')}
            </button>
            <button
              onClick={importSelected}
              disabled={isImporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {isImporting ? getText('importing') : getText('importSelected')}
            </button>
          </div>
        )}
      </div>

      {/* Region Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setRegion('egypt')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            region === 'egypt'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🇪🇬 {getText('egyptianMovies')}
        </button>
        <button
          onClick={() => setRegion('arabic')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            region === 'arabic'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🌍 {getText('arabicMovies')}
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchMovies()}
          placeholder={getText('search')}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white text-gray-900 placeholder-gray-400"
        />
        <button
          onClick={searchMovies}
          disabled={isLoading}
          className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
        >
          {getText('searchBtn')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">{getText('filters')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getText('sortBy')}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            >
              <option value="popularity.desc">{getText('popularity')}</option>
              <option value="vote_average.desc">{getText('rating')}</option>
              <option value="release_date.desc">{getText('newest')}</option>
              <option value="release_date.asc">{getText('oldest')}</option>
            </select>
          </div>

          {/* Decade Shortcuts */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getText('decade')}
            </label>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => { setYearFrom(''); setYearTo(''); }}
                className={`px-2 py-1 text-xs rounded ${!yearFrom && !yearTo ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {getText('allYears')}
              </button>
              {DECADES.map(d => (
                <button
                  key={d.from}
                  onClick={() => setDecade(d.from, d.to)}
                  className={`px-2 py-1 text-xs rounded ${yearFrom === String(d.from) ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {d.label[language]}
                </button>
              ))}
            </div>
          </div>

          {/* Year Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getText('from')} - {getText('to')}
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                placeholder="1940"
                min="1900"
                max="2030"
                className="w-20 px-2 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                placeholder="2024"
                min="1900"
                max="2030"
                className="w-20 px-2 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
              />
              <button
                onClick={() => discoverMovies(1)}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                {getText('apply')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Results Info */}
      {!isLoading && movies.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {totalResults.toLocaleString()} {getText('results')}
          </span>
          <button
            onClick={selectAll}
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            {getText('selectAll')}
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      )}

      {/* Movies Grid */}
      {!isLoading && movies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map((movie) => (
            <div
              key={movie.tmdbId}
              onClick={() => toggleSelection(movie.tmdbId)}
              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                selectedMovies.has(movie.tmdbId)
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              {/* Selection Indicator */}
              {selectedMovies.has(movie.tmdbId) && (
                <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              
              {/* Poster */}
              {movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
              )}
              
              {/* Info */}
              <div className="p-2 bg-white">
                <h4 className="font-medium text-gray-900 text-sm truncate" title={movie.originalLanguage === 'ar' ? movie.originalTitle : movie.title}>
                  {movie.originalLanguage === 'ar' ? movie.originalTitle : movie.title}
                </h4>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>{movie.year || '—'}</span>
                  {movie.voteAverage > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {movie.voteAverage.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && movies.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {getText('noResults')}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => discoverMovies(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            {getText('prev')}
          </button>
          <span className="text-gray-600">
            {getText('page')} {page} {getText('of')} {totalPages}
          </span>
          <button
            onClick={() => discoverMovies(page + 1)}
            disabled={page >= totalPages}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            {getText('next')}
          </button>
        </div>
      )}

      {/* Import Results Modal */}
      {showResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden" dir={dir}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{getText('importResults')}</h3>
              <button
                onClick={() => setShowResults(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {importResults.map((result) => (
                <div
                  key={result.tmdbId}
                  className={`flex items-center justify-between p-3 rounded-lg mb-2 ${
                    result.success && !result.skipped
                      ? 'bg-green-50'
                      : result.skipped
                      ? 'bg-yellow-50'
                      : 'bg-red-50'
                  }`}
                >
                  <div>
                    <span className="font-medium text-gray-900">
                      {result.arabicName || `TMDB #${result.tmdbId}`}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${
                    result.success && !result.skipped
                      ? 'text-green-600'
                      : result.skipped
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {result.success && !result.skipped
                      ? getText('imported')
                      : result.skipped
                      ? getText('skipped')
                      : getText('failed')}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowResults(false)}
                className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                {getText('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

