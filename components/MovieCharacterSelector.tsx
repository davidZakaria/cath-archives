'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type LinkType = 'movie' | 'character';

interface Movie {
  _id: string;
  arabicName: string;
  englishName?: string;
  year?: number;
}

interface Character {
  _id: string;
  arabicName: string;
  englishName?: string;
  type: string;
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                      className="w-full px-4 py-3 text-right hover:bg-amber-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{item.arabicName}</div>
                      <div className="text-sm text-gray-500">
                        {item.englishName && <span>{item.englishName}</span>}
                        {linkType === 'movie' && (item as Movie).year && (
                          <span className="mr-2">• {(item as Movie).year}</span>
                        )}
                        {linkType === 'character' && (
                          <span className="mr-2">• {(item as Character).type}</span>
                        )}
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

// Quick Add Modal Component
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
      const body = type === 'movie'
        ? { arabicName, englishName, year: year ? parseInt(year) : undefined }
        : { arabicName, englishName, type: characterType };

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
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" dir="rtl">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          إنشاء {type === 'movie' ? 'فيلم' : 'شخصية'} جديد
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الاسم بالعربية *
            </label>
            <input
              type="text"
              value={arabicName}
              onChange={(e) => setArabicName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              required
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              dir="ltr"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                dir="ltr"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
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
              {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء'}
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
