'use client';

import { useState, useEffect, useCallback } from 'react';

interface Movie {
  _id: string;
  arabicName: string;
  englishName?: string;
  year?: number;
  genres?: string[];
  documentCount: number;
}

interface Character {
  _id: string;
  arabicName: string;
  englishName?: string;
  type: string;
  documentCount: number;
}

type TabType = 'movies' | 'characters';

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('movies');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<Movie | Character | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    arabicName: '',
    englishName: '',
    year: '',
    genres: '',
    type: 'actor',
    biography: '',
    birthYear: '',
    nationality: '',
  });

  const fetchMovies = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await fetch(`/api/movies?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMovies(data.movies);
      }
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    }
  }, [searchQuery]);

  const fetchCharacters = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await fetch(`/api/characters?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters);
      }
    } catch (error) {
      console.error('Failed to fetch characters:', error);
    }
  }, [searchQuery]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMovies(), fetchCharacters()]).finally(() => {
      setLoading(false);
    });
  }, [fetchMovies, fetchCharacters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isMovie = activeTab === 'movies';
    const endpoint = isMovie ? '/api/movies' : '/api/characters';
    const method = editItem ? 'PATCH' : 'POST';
    const url = editItem ? `${endpoint}/${editItem._id}` : endpoint;
    
    const payload = isMovie
      ? {
          arabicName: formData.arabicName,
          englishName: formData.englishName || undefined,
          year: formData.year ? parseInt(formData.year) : undefined,
          genres: formData.genres ? formData.genres.split(',').map(g => g.trim()) : [],
        }
      : {
          arabicName: formData.arabicName,
          englishName: formData.englishName || undefined,
          type: formData.type,
          biography: formData.biography || undefined,
          birthYear: formData.birthYear ? parseInt(formData.birthYear) : undefined,
          nationality: formData.nationality || undefined,
        };

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowAddModal(false);
        setEditItem(null);
        resetForm();
        isMovie ? fetchMovies() : fetchCharacters();
      } else {
        const error = await response.json();
        alert(error.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;
    
    const endpoint = activeTab === 'movies' ? '/api/movies' : '/api/characters';
    
    try {
      const response = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        activeTab === 'movies' ? fetchMovies() : fetchCharacters();
      } else {
        alert('فشل في الحذف');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleEdit = (item: Movie | Character) => {
    setEditItem(item);
    if ('year' in item) {
      // Movie
      setFormData({
        arabicName: item.arabicName,
        englishName: item.englishName || '',
        year: item.year?.toString() || '',
        genres: item.genres?.join(', ') || '',
        type: 'actor',
        biography: '',
        birthYear: '',
        nationality: '',
      });
    } else {
      // Character
      const char = item as Character;
      setFormData({
        arabicName: char.arabicName,
        englishName: char.englishName || '',
        year: '',
        genres: '',
        type: char.type,
        biography: '',
        birthYear: '',
        nationality: '',
      });
    }
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      arabicName: '',
      englishName: '',
      year: '',
      genres: '',
      type: 'actor',
      biography: '',
      birthYear: '',
      nationality: '',
    });
  };

  const openAddModal = () => {
    resetForm();
    setEditItem(null);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة التصنيفات</h1>
          <p className="text-slate-500 mt-1">الأفلام والشخصيات</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          إضافة {activeTab === 'movies' ? 'فيلم' : 'شخصية'}
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('movies')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
              activeTab === 'movies'
                ? 'text-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            🎬 الأفلام ({movies.length})
            {activeTab === 'movies' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('characters')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
              activeTab === 'characters'
                ? 'text-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            ⭐ الشخصيات ({characters.length})
            {activeTab === 'characters' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={`البحث في ${activeTab === 'movies' ? 'الأفلام' : 'الشخصيات'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">جاري التحميل...</p>
          </div>
        ) : activeTab === 'movies' ? (
          <div className="p-4">
            {movies.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                <p className="text-slate-500">لا توجد أفلام. أضف فيلماً جديداً للبدء.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {movies.map((movie) => (
                  <div
                    key={movie._id}
                    className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900">{movie.arabicName}</h3>
                        {movie.englishName && (
                          <p className="text-sm text-slate-500" dir="ltr">{movie.englishName}</p>
                        )}
                        {movie.year && (
                          <p className="text-sm text-slate-400 mt-1">{movie.year}</p>
                        )}
                        {movie.genres && movie.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {movie.genres.map((genre, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                          {movie.documentCount} وثيقة مرتبطة
                        </p>
                      </div>
                      <div className="flex gap-1 mr-2">
                        <button
                          onClick={() => handleEdit(movie)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(movie._id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            {characters.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-slate-500">لا توجد شخصيات. أضف شخصية جديدة للبدء.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {characters.map((character) => (
                  <div
                    key={character._id}
                    className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900">{character.arabicName}</h3>
                        {character.englishName && (
                          <p className="text-sm text-slate-500" dir="ltr">{character.englishName}</p>
                        )}
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                          character.type === 'actor' ? 'bg-blue-100 text-blue-700' :
                          character.type === 'director' ? 'bg-purple-100 text-purple-700' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {character.type === 'actor' ? 'ممثل' :
                           character.type === 'director' ? 'مخرج' :
                           character.type === 'producer' ? 'منتج' :
                           character.type === 'writer' ? 'كاتب' : 'آخر'}
                        </span>
                        <p className="text-xs text-slate-400 mt-2">
                          {character.documentCount} وثيقة مرتبطة
                        </p>
                      </div>
                      <div className="flex gap-1 mr-2">
                        <button
                          onClick={() => handleEdit(character)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(character._id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {editItem ? 'تعديل' : 'إضافة'} {activeTab === 'movies' ? 'فيلم' : 'شخصية'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditItem(null);
                    resetForm();
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    الاسم بالعربية *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.arabicName}
                    onChange={(e) => setFormData({ ...formData, arabicName: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    الاسم بالإنجليزية
                  </label>
                  <input
                    type="text"
                    value={formData.englishName}
                    onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    dir="ltr"
                  />
                </div>

                {activeTab === 'movies' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        سنة الإنتاج
                      </label>
                      <input
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1900"
                        max="2100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        التصنيفات (مفصولة بفواصل)
                      </label>
                      <input
                        type="text"
                        value={formData.genres}
                        onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
                        placeholder="دراما, رومانسي, كوميدي"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        النوع
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="actor">ممثل</option>
                        <option value="director">مخرج</option>
                        <option value="producer">منتج</option>
                        <option value="writer">كاتب</option>
                        <option value="other">آخر</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        الجنسية
                      </label>
                      <input
                        type="text"
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        سنة الميلاد
                      </label>
                      <input
                        type="number"
                        value={formData.birthYear}
                        onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1800"
                        max="2100"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                  >
                    {editItem ? 'حفظ التغييرات' : 'إضافة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditItem(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
