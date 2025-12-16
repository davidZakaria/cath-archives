'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Character {
  _id: string;
  arabicName: string;
  englishName?: string;
  type: string;
  biography?: string;
  birthYear?: number;
  deathYear?: number;
  nationality?: string;
  photoImage?: string;
  documentCount: number;
}

const typeLabels: Record<string, string> = {
  actor: 'ممثل',
  director: 'مخرج',
  producer: 'منتج',
  writer: 'كاتب',
  other: 'آخر',
};

const typeColors: Record<string, string> = {
  actor: 'bg-blue-100 text-blue-700',
  director: 'bg-purple-100 text-purple-700',
  producer: 'bg-green-100 text-green-700',
  writer: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');

  const fetchCharacters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterType) params.set('type', filterType);
      
      const response = await fetch(`/api/characters?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters || []);
      }
    } catch (error) {
      console.error('Failed to fetch characters:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterType]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

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
                <h1 className="text-2xl font-bold text-amber-900">الشخصيات</h1>
                <p className="text-sm text-amber-600">تصفح الممثلين والمخرجين في الأرشيف</p>
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
                href="/movies" 
                className="text-amber-700 hover:text-amber-900 font-medium transition-colors"
              >
                الأفلام
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Search & Filter */}
      <div className="bg-blue-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="ابحث عن ممثل أو مخرج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 pr-12 rounded-lg text-gray-900 bg-white shadow-lg focus:ring-4 focus:ring-blue-300 focus:outline-none"
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
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 rounded-lg bg-white text-gray-900 focus:ring-4 focus:ring-blue-300 focus:outline-none"
            >
              <option value="">جميع الأنواع</option>
              <option value="actor">ممثل</option>
              <option value="director">مخرج</option>
              <option value="producer">منتج</option>
              <option value="writer">كاتب</option>
              <option value="other">آخر</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 text-blue-600">
          {characters.length} شخصية
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="mt-4 text-blue-600 text-lg">جاري التحميل...</p>
          </div>
        ) : characters.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto w-16 h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-4 text-xl font-medium text-gray-700">لا توجد شخصيات</h3>
            <p className="mt-2 text-gray-500">لم يتم العثور على شخصيات تطابق معايير البحث</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {characters.map((character) => (
              <div
                key={character._id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-6">
                  {/* Avatar placeholder */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                      {character.arabicName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 truncate">{character.arabicName}</h3>
                      {character.englishName && (
                        <p className="text-sm text-gray-500 truncate" dir="ltr">{character.englishName}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColors[character.type] || typeColors.other}`}>
                      {typeLabels[character.type] || character.type}
                    </span>
                    {character.nationality && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {character.nationality}
                      </span>
                    )}
                  </div>
                  
                  {(character.birthYear || character.deathYear) && (
                    <p className="text-sm text-gray-500 mb-3">
                      {character.birthYear && <span>{character.birthYear}</span>}
                      {character.birthYear && character.deathYear && <span> - </span>}
                      {character.deathYear && <span>{character.deathYear}</span>}
                    </p>
                  )}
                  
                  {character.biography && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {character.biography}
                    </p>
                  )}
                  
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      {character.documentCount} وثيقة مرتبطة
                    </span>
                    <Link
                      href={`/archive?character=${encodeURIComponent(character.arabicName)}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
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
      <footer className="bg-blue-900 text-blue-100 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg font-medium mb-2">أرشيف السينما العربية الرقمي</p>
          <p className="text-blue-300 text-sm">
            حفظ التراث السينمائي العربي للأجيال القادمة
          </p>
        </div>
      </footer>
    </div>
  );
}
