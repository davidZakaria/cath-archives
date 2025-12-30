'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type LinkType = 'movie' | 'character';

interface Movie {
  _id: string;
  arabicName: string;
  englishName?: string;
  year?: number;
  tmdbId?: number;
  posterImage?: string;
}

interface Character {
  _id: string;
  arabicName: string;
  englishName?: string;
  type: string;
}

interface TMDBSearchResult {
  tmdbId: number;
  title: string;
  originalTitle: string;
  year: number | null;
  overview: string;
  posterUrl: string | null;
  voteAverage: number;
  originalLanguage: string;
}

interface SelectedItem {
  id: string;
  type: LinkType;
  arabicName: string;
  englishName?: string;
  extra?: string; // year for movies, type for characters
}

interface MovieCharacterSelectorProps {
  onSelect: (item: SelectedItem | null) => void;
  initialValue?: SelectedItem | null;
  className?: string;
}

export default function MovieCharacterSelector({
  onSelect,
  initialValue,
  className = '',
}: MovieCharacterSelectorProps) {
  const [linkType, setLinkType] = useState<LinkType>(initialValue?.type || 'movie');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<(Movie | Character)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(initialValue || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search for movies or characters
  const search = useCallback(async (query: string, type: LinkType) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = type === 'movie' ? '/api/movies' : '/api/characters';
      const response = await fetch(`${endpoint}?search=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.movies || data.characters || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        search(searchQuery, linkType);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, linkType, search]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: Movie | Character) => {
    const selected: SelectedItem = {
      id: item._id,
      type: linkType,
      arabicName: item.arabicName,
      englishName: item.englishName,
      extra: linkType === 'movie' 
        ? (item as Movie).year?.toString() 
        : (item as Character).type,
    };
    setSelectedItem(selected);
    onSelect(selected);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    setSelectedItem(null);
    onSelect(null);
    setSearchQuery('');
  };

  const handleTypeChange = (type: LinkType) => {
    setLinkType(type);
    setSelectedItem(null);
    onSelect(null);
    setSearchQuery('');
    setResults([]);
  };

  return (
    <div className={`${className}`} dir="rtl">
      {/* Type Toggle */}
      <div className="flex mb-3 border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => handleTypeChange('movie')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            linkType === 'movie'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          فيلم
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('character')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            linkType === 'character'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          شخصية / ممثل
        </button>
      </div>

      {/* Selected Item Display */}
      {selectedItem && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="font-semibold text-amber-900">{selectedItem.arabicName}</span>
            {selectedItem.englishName && (
              <span className="text-amber-700 mr-2">({selectedItem.englishName})</span>
            )}
            {selectedItem.extra && (
              <span className="text-amber-600 text-sm mr-2">
                - {selectedItem.type === 'movie' ? selectedItem.extra : selectedItem.extra}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-amber-600 hover:text-amber-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Search Input */}
      {!selectedItem && (
        <div className="relative" ref={dropdownRef}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder={linkType === 'movie' ? 'ابحث عن فيلم...' : 'ابحث عن شخصية أو ممثل...'}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
          />
          
          {isLoading && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
            </div>
          )}

          {/* Dropdown Results */}
          {showDropdown && (searchQuery.length >= 2 || results.length > 0) && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {results.length > 0 ? (
                <>
                  {results.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="w-full px-4 py-3 text-right hover:bg-amber-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                    >
                      {linkType === 'movie' && (item as Movie).posterImage && (
                        <img 
                          src={(item as Movie).posterImage} 
                          alt=""
                          className="w-10 h-14 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.arabicName}</div>
                        <div className="text-sm text-gray-500">
                          {item.englishName && <span>{item.englishName}</span>}
                          {linkType === 'movie' && (item as Movie).year && (
                            <span className="mr-2">• {(item as Movie).year}</span>
                          )}
                          {linkType === 'movie' && (item as Movie).tmdbId && (
                            <span className="mr-2 text-blue-500">• TMDB</span>
                          )}
                          {linkType === 'character' && (
                            <span className="mr-2">• {(item as Character).type}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              ) : searchQuery.length >= 2 && !isLoading ? (
                <div className="px-4 py-3 text-gray-500 text-center">
                  لم يتم العثور على نتائج
                </div>
              ) : null}
              
              {/* Create New Button */}
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="w-full px-4 py-3 text-center text-amber-600 hover:bg-amber-50 border-t border-gray-200 font-medium"
              >
                + إنشاء {linkType === 'movie' ? 'فيلم' : 'شخصية'} جديد
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create New Modal */}
      {showCreateModal && (
        <QuickAddModal
          type={linkType}
          initialName={searchQuery}
          onClose={() => setShowCreateModal(false)}
          onCreated={(item) => {
            handleSelect(item);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

// Quick Add Modal Component with TMDB Search
interface QuickAddModalProps {
  type: LinkType;
  initialName: string;
  onClose: () => void;
  onCreated: (item: Movie | Character) => void;
}

function QuickAddModal({ type, initialName, onClose, onCreated }: QuickAddModalProps) {
  const [arabicName, setArabicName] = useState(initialName);
  const [englishName, setEnglishName] = useState('');
  const [year, setYear] = useState('');
  const [characterType, setCharacterType] = useState<string>('actor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // TMDB Search state
  const [showTMDBSearch, setShowTMDBSearch] = useState(false);
  const [tmdbQuery, setTmdbQuery] = useState(initialName);
  const [tmdbResults, setTmdbResults] = useState<TMDBSearchResult[]>([]);
  const [isTmdbLoading, setIsTmdbLoading] = useState(false);
  const [selectedTmdbId, setSelectedTmdbId] = useState<number | null>(null);

  // Search TMDB
  const searchTMDB = async () => {
    if (!tmdbQuery.trim()) return;
    
    setIsTmdbLoading(true);
    try {
      const response = await fetch(`/api/tmdb/search?query=${encodeURIComponent(tmdbQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setTmdbResults(data.movies || []);
      }
    } catch (err) {
      console.error('TMDB search failed:', err);
    } finally {
      setIsTmdbLoading(false);
    }
  };

  // Select a TMDB movie
  const handleTmdbSelect = (movie: TMDBSearchResult) => {
    // Determine if original is Arabic
    const isArabic = movie.originalLanguage === 'ar';
    setArabicName(isArabic ? movie.originalTitle : movie.title);
    setEnglishName(isArabic ? movie.title : movie.originalTitle);
    setYear(movie.year?.toString() || '');
    setSelectedTmdbId(movie.tmdbId);
    setShowTMDBSearch(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arabicName.trim()) {
      setError('الاسم بالعربية مطلوب');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const endpoint = type === 'movie' ? '/api/movies' : '/api/characters';
      
      let body;
      if (type === 'movie') {
        // If we have a TMDB ID, let the backend fetch all the details
        if (selectedTmdbId) {
          body = { tmdbId: selectedTmdbId };
        } else {
          body = { arabicName, englishName, year: year ? parseInt(year) : undefined };
        }
      } else {
        body = { arabicName, englishName, type: characterType };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        onCreated(data.movie || data.character);
      } else {
        const data = await response.json();
        setError(data.error || 'فشل في الإنشاء');
      }
    } catch (err) {
      setError('حدث خطأ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" dir="rtl">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          إنشاء {type === 'movie' ? 'فيلم' : 'شخصية'} جديد
        </h3>

        {/* TMDB Search Section - Only for movies */}
        {type === 'movie' && (
          <div className="mb-4">
            {!showTMDBSearch ? (
              <button
                type="button"
                onClick={() => setShowTMDBSearch(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                البحث في TMDB (قاعدة بيانات الأفلام)
              </button>
            ) : (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-blue-900">البحث في TMDB</span>
                  <button
                    type="button"
                    onClick={() => setShowTMDBSearch(false)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={tmdbQuery}
                    onChange={(e) => setTmdbQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchTMDB()}
                    placeholder="اسم الفيلم..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={searchTMDB}
                    disabled={isTmdbLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isTmdbLoading ? '...' : 'بحث'}
                  </button>
                </div>

                {/* TMDB Results */}
                {tmdbResults.length > 0 && (
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                    {tmdbResults.map((movie) => (
                      <button
                        key={movie.tmdbId}
                        type="button"
                        onClick={() => handleTmdbSelect(movie)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 text-right"
                      >
                        {movie.posterUrl ? (
                          <img 
                            src={movie.posterUrl} 
                            alt=""
                            className="w-12 h-18 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-18 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {movie.originalLanguage === 'ar' ? movie.originalTitle : movie.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {movie.originalLanguage === 'ar' ? movie.title : movie.originalTitle}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                            {movie.year && <span>{movie.year}</span>}
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
                      </button>
                    ))}
                  </div>
                )}

                {tmdbResults.length === 0 && tmdbQuery && !isTmdbLoading && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    لم يتم العثور على نتائج في TMDB
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selected TMDB Movie Badge */}
        {selectedTmdbId && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 font-medium">تم اختيار فيلم من TMDB</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTmdbId(null)}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              إزالة
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الاسم بالعربية *
            </label>
            <input
              type="text"
              value={arabicName}
              onChange={(e) => setArabicName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white text-gray-900 placeholder-gray-400"
              required
              disabled={!!selectedTmdbId}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الاسم بالإنجليزية
            </label>
            <input
              type="text"
              value={englishName}
              onChange={(e) => setEnglishName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white text-gray-900 placeholder-gray-400"
              dir="ltr"
              disabled={!!selectedTmdbId}
            />
          </div>

          {type === 'movie' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                سنة الإنتاج
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="1960"
                min="1900"
                max="2030"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white text-gray-900 placeholder-gray-400"
                dir="ltr"
                disabled={!!selectedTmdbId}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نوع الشخصية
              </label>
              <select
                value={characterType}
                onChange={(e) => setCharacterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white text-gray-900"
              >
                <option value="actor">ممثل</option>
                <option value="director">مخرج</option>
                <option value="producer">منتج</option>
                <option value="writer">كاتب</option>
                <option value="other">أخرى</option>
              </select>
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {isSubmitting ? 'جاري الإنشاء...' : selectedTmdbId ? 'استيراد من TMDB' : 'إنشاء'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
