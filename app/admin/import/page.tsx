'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import Image from 'next/image';

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

interface TMDBPerson {
  tmdbId: number;
  name: string;
  profileUrl: string | null;
  popularity: number;
  knownForDepartment: string;
  gender: number;
  knownFor?: Array<{
    id: number;
    title: string;
    posterUrl: string | null;
  }>;
}

interface ImportResult {
  tmdbId: number;
  success: boolean;
  movieId?: string;
  characterId?: string;
  arabicName?: string;
  error?: string;
  skipped?: boolean;
}

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
  const { language, dir } = useLanguage();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'movies' | 'people'>('movies');
  
  // Movies state
  const [region, setRegion] = useState<'egypt' | 'arabic'>('egypt');
  const [yearFrom, setYearFrom] = useState<string>('');
  const [yearTo, setYearTo] = useState<string>('');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [movieSearchQuery, setMovieSearchQuery] = useState('');
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<Set<number>>(new Set());
  const [moviePage, setMoviePage] = useState(1);
  const [movieTotalPages, setMovieTotalPages] = useState(0);
  const [movieTotalResults, setMovieTotalResults] = useState(0);
  
  // People state
  const [peopleSearchQuery, setPeopleSearchQuery] = useState('');
  const [people, setPeople] = useState<TMDBPerson[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<Set<number>>(new Set());
  const [peoplePage, setPeoplePage] = useState(1);
  const [peopleTotalPages, setPeopleTotalPages] = useState(0);
  const [peopleTotalResults, setPeopleTotalResults] = useState(0);
  
  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Translations
  const texts = {
    title: { ar: 'استيراد من TMDB', en: 'Import from TMDB' },
    subtitle: { ar: 'استيراد أفلام وممثلين من قاعدة بيانات الأفلام العالمية', en: 'Import movies and actors from The Movie Database' },
    moviesTab: { ar: '🎬 الأفلام', en: '🎬 Movies' },
    peopleTab: { ar: '⭐ الممثلين والمخرجين', en: '⭐ Actors & Directors' },
    egyptianMovies: { ar: 'أفلام مصرية', en: 'Egyptian Movies' },
    arabicMovies: { ar: 'أفلام عربية', en: 'Arabic Movies' },
    searchMovies: { ar: 'بحث عن فيلم...', en: 'Search for a movie...' },
    searchPeople: { ar: 'بحث عن ممثل أو مخرج...', en: 'Search for an actor or director...' },
    searchBtn: { ar: 'بحث', en: 'Search' },
    popularPeople: { ar: 'الأكثر شعبية', en: 'Most Popular' },
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
    actor: { ar: 'ممثل', en: 'Actor' },
    director: { ar: 'مخرج', en: 'Director' },
    knownFor: { ar: 'معروف بـ', en: 'Known for' },
  };

  const getText = (key: keyof typeof texts) => texts[key][language];

  // Fetch movies
  const fetchMovies = async (newPage: number = 1, search?: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      let url: string;
      if (search) {
        const params = new URLSearchParams({ query: search, page: String(newPage) });
        if (yearFrom) params.append('year', yearFrom);
        url = `/api/tmdb/search?${params}`;
      } else {
        const params = new URLSearchParams({
          page: String(newPage),
          region,
          sortBy,
        });
        if (yearFrom) params.append('yearFrom', yearFrom);
        if (yearTo) params.append('yearTo', yearTo);
        url = `/api/tmdb/discover?${params}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setMovies(data.movies);
        setMovieTotalPages(data.pagination.totalPages);
        setMovieTotalResults(data.pagination.totalResults);
        setMoviePage(newPage);
      } else {
        setError(data.error || 'Failed to fetch movies');
      }
    } catch (err) {
      setError('Failed to connect to TMDB');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch people
  const fetchPeople = async (newPage: number = 1, search?: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({ page: String(newPage) });
      if (search) {
        params.append('query', search);
      } else {
        params.append('mode', 'popular');
      }
      
      const response = await fetch(`/api/tmdb/people?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setPeople(data.people);
        setPeopleTotalPages(data.pagination.totalPages);
        setPeopleTotalResults(data.pagination.totalResults);
        setPeoplePage(newPage);
      } else {
        setError(data.error || 'Failed to fetch people');
      }
    } catch (err) {
      setError('Failed to connect to TMDB');
    } finally {
      setIsLoading(false);
    }
  };

  // Import movies
  const importMovies = async () => {
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

  // Import people
  const importPeople = async () => {
    if (selectedPeople.size === 0) return;
    
    setIsImporting(true);
    setImportResults([]);
    
    try {
      const response = await fetch('/api/tmdb/people/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbIds: Array.from(selectedPeople) }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setImportResults(data.results);
        setShowResults(true);
        setSelectedPeople(new Set());
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err) {
      setError('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (activeTab === 'movies') {
      fetchMovies(1);
    } else {
      fetchPeople(1);
    }
  }, [activeTab, region, sortBy]);

  const currentSelection = activeTab === 'movies' ? selectedMovies : selectedPeople;

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getText('title')}</h1>
          <p className="text-gray-600 mt-1">{getText('subtitle')}</p>
        </div>
        
        {/* Selection Actions */}
        {currentSelection.size > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-blue-700 font-medium">
              {currentSelection.size} {getText('selected')}
            </span>
            <button
              onClick={() => activeTab === 'movies' ? setSelectedMovies(new Set()) : setSelectedPeople(new Set())}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {getText('clearSelection')}
            </button>
            <button
              onClick={activeTab === 'movies' ? importMovies : importPeople}
              disabled={isImporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {isImporting ? getText('importing') : getText('importSelected')}
            </button>
          </div>
        )}
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2 border-b border-gray-200 pb-4">
        <button
          onClick={() => setActiveTab('movies')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'movies'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {getText('moviesTab')}
        </button>
        <button
          onClick={() => setActiveTab('people')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'people'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {getText('peopleTab')}
        </button>
      </div>

      {/* Movies Tab Content */}
      {activeTab === 'movies' && (
        <>
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

          {/* Movie Search */}
          <div className="flex gap-2">
            <input
              type="text"
              value={movieSearchQuery}
              onChange={(e) => setMovieSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchMovies(1, movieSearchQuery || undefined)}
              placeholder={getText('searchMovies')}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white text-gray-900 placeholder-gray-400"
            />
            <button
              onClick={() => fetchMovies(1, movieSearchQuery || undefined)}
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
                      onClick={() => { setYearFrom(String(d.from)); setYearTo(String(d.to)); }}
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
                    className="w-20 px-2 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    value={yearTo}
                    onChange={(e) => setYearTo(e.target.value)}
                    placeholder="2024"
                    className="w-20 px-2 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                  <button
                    onClick={() => fetchMovies(1)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    {getText('apply')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Info */}
          {!isLoading && movies.length > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{movieTotalResults.toLocaleString()} {getText('results')}</span>
              <button
                onClick={() => {
                  const newSelection = new Set(selectedMovies);
                  movies.forEach(m => newSelection.add(m.tmdbId));
                  setSelectedMovies(newSelection);
                }}
                className="text-amber-600 hover:text-amber-700 font-medium"
              >
                {getText('selectAll')}
              </button>
            </div>
          )}

          {/* Movies Grid */}
          {!isLoading && movies.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {movies.map((movie) => (
                <div
                  key={movie.tmdbId}
                  onClick={() => {
                    const newSelection = new Set(selectedMovies);
                    if (newSelection.has(movie.tmdbId)) {
                      newSelection.delete(movie.tmdbId);
                    } else {
                      newSelection.add(movie.tmdbId);
                    }
                    setSelectedMovies(newSelection);
                  }}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedMovies.has(movie.tmdbId)
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {selectedMovies.has(movie.tmdbId) && (
                    <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  
                  {movie.posterUrl ? (
                    <img src={movie.posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover" />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center">
                      <span className="text-4xl">🎬</span>
                    </div>
                  )}
                  
                  <div className="p-2 bg-white">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
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

          {/* Movie Pagination */}
          {!isLoading && movieTotalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => fetchMovies(moviePage - 1, movieSearchQuery || undefined)}
                disabled={moviePage <= 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                {getText('prev')}
              </button>
              <span className="text-gray-600">
                {getText('page')} {moviePage} {getText('of')} {movieTotalPages}
              </span>
              <button
                onClick={() => fetchMovies(moviePage + 1, movieSearchQuery || undefined)}
                disabled={moviePage >= movieTotalPages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                {getText('next')}
              </button>
            </div>
          )}
        </>
      )}

      {/* People Tab Content */}
      {activeTab === 'people' && (
        <>
          {/* People Search */}
          <div className="flex gap-2">
            <input
              type="text"
              value={peopleSearchQuery}
              onChange={(e) => setPeopleSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchPeople(1, peopleSearchQuery || undefined)}
              placeholder={getText('searchPeople')}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900 placeholder-gray-400"
            />
            <button
              onClick={() => fetchPeople(1, peopleSearchQuery || undefined)}
              disabled={isLoading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
            >
              {getText('searchBtn')}
            </button>
          </div>

          {/* Popular People Button */}
          <button
            onClick={() => { setPeopleSearchQuery(''); fetchPeople(1); }}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
          >
            ⭐ {getText('popularPeople')}
          </button>

          {/* Results Info */}
          {!isLoading && people.length > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{peopleTotalResults.toLocaleString()} {getText('results')}</span>
              <button
                onClick={() => {
                  const newSelection = new Set(selectedPeople);
                  people.forEach(p => newSelection.add(p.tmdbId));
                  setSelectedPeople(newSelection);
                }}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                {getText('selectAll')}
              </button>
            </div>
          )}

          {/* People Grid */}
          {!isLoading && people.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {people.map((person) => (
                <div
                  key={person.tmdbId}
                  onClick={() => {
                    const newSelection = new Set(selectedPeople);
                    if (newSelection.has(person.tmdbId)) {
                      newSelection.delete(person.tmdbId);
                    } else {
                      newSelection.add(person.tmdbId);
                    }
                    setSelectedPeople(newSelection);
                  }}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedPeople.has(person.tmdbId)
                      ? 'border-purple-500 ring-2 ring-purple-200'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {selectedPeople.has(person.tmdbId) && (
                    <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  
                  {person.profileUrl ? (
                    <img src={person.profileUrl} alt={person.name} className="w-full aspect-[2/3] object-cover" />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center">
                      <span className="text-4xl">👤</span>
                    </div>
                  )}
                  
                  <div className="p-2 bg-white">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{person.name}</h4>
                    <div className="text-xs text-gray-500 mt-1">
                      <span className={`px-2 py-0.5 rounded-full ${
                        person.knownForDepartment === 'Acting' 
                          ? 'bg-blue-100 text-blue-700' 
                          : person.knownForDepartment === 'Directing'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {person.knownForDepartment === 'Acting' ? getText('actor') : 
                         person.knownForDepartment === 'Directing' ? getText('director') : 
                         person.knownForDepartment}
                      </span>
                    </div>
                    {person.knownFor && person.knownFor.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {getText('knownFor')}: {person.knownFor.map(m => m.title).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* People Pagination */}
          {!isLoading && peopleTotalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => fetchPeople(peoplePage - 1, peopleSearchQuery || undefined)}
                disabled={peoplePage <= 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                {getText('prev')}
              </button>
              <span className="text-gray-600">
                {getText('page')} {peoplePage} {getText('of')} {peopleTotalPages}
              </span>
              <button
                onClick={() => fetchPeople(peoplePage + 1, peopleSearchQuery || undefined)}
                disabled={peoplePage >= peopleTotalPages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                {getText('next')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            activeTab === 'movies' ? 'border-amber-600' : 'border-purple-600'
          }`}></div>
        </div>
      )}

      {/* No Results */}
      {!isLoading && ((activeTab === 'movies' && movies.length === 0) || (activeTab === 'people' && people.length === 0)) && (
        <div className="text-center py-12 text-gray-500">
          {getText('noResults')}
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
