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
  actress: 'ممثلة',
  director: 'مخرج',
  producer: 'منتج',
  writer: 'كاتب',
  singer: 'مطرب',
  composer: 'ملحن',
  other: 'آخر',
};

const typeIcons: Record<string, string> = {
  actor: '🎭',
  actress: '🌟',
  director: '🎬',
  producer: '🎥',
  writer: '✍️',
  singer: '🎤',
  composer: '🎵',
  other: '⭐',
};

const typeFilters = [
  { value: '', label: 'الكل', icon: '📋' },
  { value: 'actor', label: 'ممثلون', icon: '🎭' },
  { value: 'actress', label: 'ممثلات', icon: '🌟' },
  { value: 'director', label: 'مخرجون', icon: '🎬' },
  { value: 'singer', label: 'مطربون', icon: '🎤' },
  { value: 'writer', label: 'كتاب', icon: '✍️' },
];

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
              <Link href="/movies" className="btn-outline-gold px-4 py-2 rounded-lg text-sm">الأفلام</Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="py-16 px-6 border-b border-[#3a3020]">
          <div className="container mx-auto text-center max-w-4xl">
            <div className="flex justify-center gap-3 mb-6">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-[#c9a227] ${i === 2 ? 'text-3xl' : 'text-xl'}`}>
                  {i === 2 ? '⭐' : '★'}
                </span>
              ))}
            </div>
            <h1 className="text-5xl font-bold film-title mb-4">نجوم العصر الذهبي</h1>
            <p className="text-[#8b7319] tracking-wider mb-8">GOLDEN ERA STARS</p>
            
            {/* Search */}
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث عن نجم أو مخرج..."
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
            <div className="flex flex-wrap items-center justify-center gap-2">
              {typeFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    filterType === filter.value
                      ? 'bg-gradient-to-b from-[#c9a227] to-[#8b7319] text-[#1a1612]'
                      : 'text-[#9c8550] hover:text-[#c9a227] bg-[#2a2318]'
                  }`}
                >
                  <span>{filter.icon}</span>
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Stars Grid */}
        <main className="container mx-auto px-6 py-10">
          <div className="mb-6 text-[#c9a227] font-bold">
            {characters.length} نجم
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="film-spinner mx-auto mb-4"></div>
              <p className="text-[#c9a227]">جاري تحميل النجوم...</p>
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#2a2318] flex items-center justify-center">
                <span className="text-5xl">⭐</span>
              </div>
              <h3 className="text-2xl font-bold text-[#c9a227] mb-2">لا توجد نتائج</h3>
              <p className="text-[#9c8550]">لم يتم العثور على نجوم يطابقون معايير البحث</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {characters.map((character) => (
                <div
                  key={character._id}
                  className="vintage-card rounded-xl overflow-hidden hover:scale-105 transition-transform group"
                >
                  <div className="p-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#c9a227] via-[#e8d48b] to-[#8b7319] p-1 flex-shrink-0">
                        <div className="w-full h-full rounded-full bg-[#2a2318] flex items-center justify-center text-3xl">
                          {typeIcons[character.type] || '⭐'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-[#e8d48b] truncate group-hover:text-[#c9a227] transition-colors">
                          {character.arabicName}
                        </h3>
                        {character.englishName && (
                          <p className="text-sm text-[#8b7319] truncate" dir="ltr">{character.englishName}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#c9a227] text-[#1a1612]">
                        {typeLabels[character.type] || character.type}
                      </span>
                      {character.nationality && (
                        <span className="px-2 py-1 bg-[#3a3020] text-[#9c8550] text-xs rounded-full">
                          {character.nationality}
                        </span>
                      )}
                    </div>
                    
                    {(character.birthYear || character.deathYear) && (
                      <p className="text-sm text-[#8b7319] mb-3">
                        {character.birthYear && <span>{character.birthYear}</span>}
                        {character.birthYear && character.deathYear && <span> - </span>}
                        {character.deathYear && <span>{character.deathYear}</span>}
                      </p>
                    )}
                    
                    {character.biography && (
                      <p className="text-sm text-[#9c8550] line-clamp-2 mb-4">
                        {character.biography}
                      </p>
                    )}
                    
                    <div className="pt-4 border-t border-[#3a3020] flex items-center justify-between">
                      <span className="text-xs text-[#7a6540]">
                        {character.documentCount} وثيقة
                      </span>
                      <Link
                        href={`/archive?character=${encodeURIComponent(character.arabicName)}`}
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
