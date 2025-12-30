'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  coverImagePath?: string;
  totalPages: number;
  status: string;
  linkType?: string;
  linkedMovie?: {
    _id: string;
    arabicName: string;
    englishName?: string;
    year?: number;
    posterImage?: string;
  };
  linkedCharacter?: {
    _id: string;
    arabicName: string;
    englishName?: string;
    type?: string;
    photoImage?: string;
  };
  metadata?: {
    movies?: string[];
    characters?: string[];
    publicationDate?: string;
    source?: string;
  };
  accuracyScore?: number;
  publishedAt?: string;
  createdAt: string;
  score?: number;
  highlights?: string[];
}

interface SearchFilters {
  decade: string;
  linkType: 'all' | 'movie' | 'character';
  source: string;
  sortBy: 'relevance' | 'date' | 'accuracy';
}

const DECADES = [
  { value: '', label: { ar: 'كل العقود', en: 'All Decades' } },
  { value: '1940s', label: { ar: 'الأربعينيات', en: '1940s' } },
  { value: '1950s', label: { ar: 'الخمسينيات', en: '1950s' } },
  { value: '1960s', label: { ar: 'الستينيات', en: '1960s' } },
  { value: '1970s', label: { ar: 'السبعينيات', en: '1970s' } },
  { value: '1980s', label: { ar: 'الثمانينيات', en: '1980s' } },
  { value: '1990s', label: { ar: 'التسعينيات', en: '1990s' } },
  { value: '2000s', label: { ar: 'الألفينيات', en: '2000s' } },
];

interface AdvancedSearchProps {
  language?: 'ar' | 'en';
  onResultClick?: (result: SearchResult) => void;
  showFilters?: boolean;
  defaultStatus?: 'published' | 'all';
}

export default function AdvancedSearch({
  language = 'ar',
  onResultClick,
  showFilters = true,
  defaultStatus = 'published',
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    decade: '',
    linkType: 'all',
    source: '',
    sortBy: 'relevance',
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  const texts = {
    searchPlaceholder: { ar: 'ابحث في الأرشيف...', en: 'Search the archive...' },
    filters: { ar: 'تصفية', en: 'Filters' },
    decade: { ar: 'العقد', en: 'Decade' },
    type: { ar: 'النوع', en: 'Type' },
    all: { ar: 'الكل', en: 'All' },
    movies: { ar: 'أفلام', en: 'Movies' },
    characters: { ar: 'شخصيات', en: 'Characters' },
    source: { ar: 'المصدر', en: 'Source' },
    sortBy: { ar: 'ترتيب', en: 'Sort by' },
    relevance: { ar: 'الأكثر صلة', en: 'Relevance' },
    date: { ar: 'التاريخ', en: 'Date' },
    accuracy: { ar: 'الدقة', en: 'Accuracy' },
    results: { ar: 'نتيجة', en: 'results' },
    noResults: { ar: 'لا توجد نتائج', en: 'No results found' },
    loadMore: { ar: 'تحميل المزيد', en: 'Load More' },
    pages: { ar: 'صفحات', en: 'pages' },
    clearFilters: { ar: 'مسح الفلاتر', en: 'Clear Filters' },
  };

  const t = (key: keyof typeof texts) => texts[key][language];

  const search = useCallback(async (newPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('q', debouncedQuery);
      if (filters.decade) params.append('decade', filters.decade);
      if (filters.linkType !== 'all') params.append('linkType', filters.linkType);
      if (filters.source) params.append('source', filters.source);
      params.append('sortBy', filters.sortBy);
      params.append('status', defaultStatus);
      params.append('page', String(newPage));
      params.append('limit', '12');

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      if (data.success) {
        if (newPage === 1) {
          setResults(data.results);
        } else {
          setResults(prev => [...prev, ...data.results]);
        }
        setTotal(data.pagination.total);
        setPage(newPage);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filters, defaultStatus]);

  useEffect(() => {
    search(1);
  }, [search]);

  const clearFilters = () => {
    setFilters({
      decade: '',
      linkType: 'all',
      source: '',
      sortBy: 'relevance',
    });
    setQuery('');
  };

  const hasActiveFilters = filters.decade || filters.linkType !== 'all' || filters.source || query;

  return (
    <div className="w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Search Input */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full px-5 py-4 pr-12 text-lg border-2 border-[#3a3020] rounded-xl bg-[#1a1510] text-[#d4c4a8] placeholder-[#7a6545] focus:border-[#d4a012] focus:outline-none transition-colors"
        />
        <svg
          className="absolute top-1/2 right-4 transform -translate-y-1/2 w-6 h-6 text-[#7a6545]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Filter Toggle & Results Count */}
      {showFilters && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFilterPanel || hasActiveFilters
                  ? 'bg-[#d4a012] text-[#1a1510]'
                  : 'bg-[#2a2318] text-[#d4c4a8] hover:bg-[#3a3020]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {t('filters')}
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-[#7a6545] hover:text-[#d4a012] transition-colors"
              >
                {t('clearFilters')}
              </button>
            )}
          </div>

          <span className="text-[#7a6545]">
            {total} {t('results')}
          </span>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && showFilterPanel && (
        <div className="mb-6 p-4 bg-[#2a2318] rounded-xl border border-[#3a3020]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Decade Filter */}
            <div>
              <label className="block text-sm text-[#7a6545] mb-2">{t('decade')}</label>
              <select
                value={filters.decade}
                onChange={(e) => setFilters({ ...filters, decade: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] focus:border-[#d4a012] focus:outline-none"
              >
                {DECADES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label[language]}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm text-[#7a6545] mb-2">{t('type')}</label>
              <select
                value={filters.linkType}
                onChange={(e) => setFilters({ ...filters, linkType: e.target.value as SearchFilters['linkType'] })}
                className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] focus:border-[#d4a012] focus:outline-none"
              >
                <option value="all">{t('all')}</option>
                <option value="movie">🎬 {t('movies')}</option>
                <option value="character">⭐ {t('characters')}</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-sm text-[#7a6545] mb-2">{t('source')}</label>
              <input
                type="text"
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                placeholder="..."
                className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] placeholder-[#5a4530] focus:border-[#d4a012] focus:outline-none"
              />
            </div>

            {/* Sort Filter */}
            <div>
              <label className="block text-sm text-[#7a6545] mb-2">{t('sortBy')}</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as SearchFilters['sortBy'] })}
                className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] focus:border-[#d4a012] focus:outline-none"
              >
                <option value="relevance">{t('relevance')}</option>
                <option value="date">{t('date')}</option>
                <option value="accuracy">{t('accuracy')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && results.length === 0 && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#d4a012]"></div>
        </div>
      )}

      {/* No Results */}
      {!loading && results.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#2a2318] flex items-center justify-center">
            <span className="text-4xl">🔍</span>
          </div>
          <p className="text-[#7a6545] text-lg">{t('noResults')}</p>
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((result) => (
            <Link
              key={result._id}
              href={`/archive/${result._id}`}
              onClick={() => onResultClick?.(result)}
              className="group block bg-[#2a2318] rounded-xl overflow-hidden border border-[#3a3020] hover:border-[#d4a012] transition-all"
            >
              {/* Cover Image */}
              <div className="aspect-[4/3] relative bg-[#1a1510]">
                {(result.linkedMovie?.posterImage || result.linkedCharacter?.photoImage || result.coverImagePath) ? (
                  <Image
                    src={result.linkedMovie?.posterImage || result.linkedCharacter?.photoImage || result.coverImagePath || ''}
                    alt={result.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-5xl opacity-30">
                      {result.linkType === 'character' ? '⭐' : '🎬'}
                    </span>
                  </div>
                )}

                {/* Type Badge */}
                {result.linkType && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 text-xs font-bold rounded-full bg-[#d4a012] text-[#1a1510]">
                      {result.linkType === 'movie' ? '🎬' : '⭐'}
                    </span>
                  </div>
                )}

                {/* Pages Badge */}
                <div className="absolute bottom-2 left-2">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-black/70 text-white">
                    {result.totalPages} {t('pages')}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-[#d4c4a8] line-clamp-2 group-hover:text-[#d4a012] transition-colors">
                  {result.title}
                </h3>

                {/* Linked Entity */}
                {(result.linkedMovie || result.linkedCharacter) && (
                  <p className="text-sm text-[#7a6545] mt-1 truncate">
                    {result.linkedMovie?.arabicName || result.linkedCharacter?.arabicName}
                    {result.linkedMovie?.year && ` (${result.linkedMovie.year})`}
                  </p>
                )}

                {/* Highlights */}
                {result.highlights && result.highlights.length > 0 && (
                  <p className="text-xs text-[#9c8560] mt-2 line-clamp-2 italic">
                    &ldquo;{result.highlights[0]}&rdquo;
                  </p>
                )}

                {/* Accuracy Score */}
                {result.accuracyScore !== undefined && (
                  <div className="mt-2 flex items-center gap-1">
                    <div className="flex-1 h-1 bg-[#3a3020] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          result.accuracyScore >= 90
                            ? 'bg-green-500'
                            : result.accuracyScore >= 70
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${result.accuracyScore}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#7a6545]">{result.accuracyScore}%</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Load More */}
      {results.length < total && (
        <div className="mt-6 text-center">
          <button
            onClick={() => search(page + 1)}
            disabled={loading}
            className="px-6 py-3 bg-[#d4a012] text-[#1a1510] rounded-lg font-bold hover:bg-[#e4b022] transition-colors disabled:opacity-50"
          >
            {loading ? '...' : t('loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}

