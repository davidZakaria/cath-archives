'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    const endpoint = activeTab === 'movies' ? '/api/movies' : '/api/characters';
    
    try {
      const response = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        activeTab === 'movies' ? fetchMovies() : fetchCharacters();
      } else {
        alert('Failed to delete');
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
      setFormData({
        arabicName: item.arabicName,
        englishName: item.englishName || '',
        year: '',
        genres: '',
        type: item.type,
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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">إدارة التصنيفات</h1>
            </div>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إضافة {activeTab === 'movies' ? 'فيلم' : 'شخصية'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('movies')}
            className={`px-6 py-3 text-lg font-medium border-b-2 transition-colors ${
              activeTab === 'movies'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            الأفلام ({movies.length})
          </button>
          <button
            onClick={() => setActiveTab('characters')}
            className={`px-6 py-3 text-lg font-medium border-b-2 transition-colors ${
              activeTab === 'characters'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            الشخصيات ({characters.length})
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder={`البحث في ${activeTab === 'movies' ? 'الأفلام' : 'الشخصيات'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-2 text-gray-500">جاري التحميل...</p>
          </div>
        ) : activeTab === 'movies' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {movies.map((movie) => (
              <div
                key={movie._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{movie.arabicName}</h3>
                    {movie.englishName && (
                      <p className="text-sm text-gray-500" dir="ltr">{movie.englishName}</p>
                    )}
                    {movie.year && (
                      <p className="text-sm text-gray-400 mt-1">{movie.year}</p>
                    )}
                    {movie.genres && movie.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {movie.genres.map((genre, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {movie.documentCount} وثيقة مرتبطة
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(movie)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(movie._id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {movies.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                لا توجد أفلام. أضف فيلماً جديداً للبدء.
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {characters.map((character) => (
              <div
                key={character._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{character.arabicName}</h3>
                    {character.englishName && (
                      <p className="text-sm text-gray-500" dir="ltr">{character.englishName}</p>
                    )}
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                      character.type === 'actor' ? 'bg-blue-100 text-blue-700' :
                      character.type === 'director' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {character.type === 'actor' ? 'ممثل' :
                       character.type === 'director' ? 'مخرج' :
                       character.type === 'producer' ? 'منتج' :
                       character.type === 'writer' ? 'كاتب' : 'آخر'}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">
                      {character.documentCount} وثيقة مرتبطة
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(character)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(character._id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {characters.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                لا توجد شخصيات. أضف شخصية جديدة للبدء.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editItem ? 'تعديل' : 'إضافة'} {activeTab === 'movies' ? 'فيلم' : 'شخصية'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الاسم بالعربية *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.arabicName}
                    onChange={(e) => setFormData({ ...formData, arabicName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الاسم بالإنجليزية
                  </label>
                  <input
                    type="text"
                    value={formData.englishName}
                    onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    dir="ltr"
                  />
                </div>

                {activeTab === 'movies' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        سنة الإنتاج
                      </label>
                      <input
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1900"
                        max="2100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        التصنيفات (مفصولة بفواصل)
                      </label>
                      <input
                        type="text"
                        value={formData.genres}
                        onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
                        placeholder="دراما, رومانسي, كوميدي"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        النوع
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="actor">ممثل</option>
                        <option value="director">مخرج</option>
                        <option value="producer">منتج</option>
                        <option value="writer">كاتب</option>
                        <option value="other">آخر</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الجنسية
                      </label>
                      <input
                        type="text"
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        سنة الميلاد
                      </label>
                      <input
                        type="number"
                        value={formData.birthYear}
                        onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1800"
                        max="2100"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
