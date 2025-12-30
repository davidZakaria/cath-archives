'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface TimelineItem {
  _id: string;
  title: string;
  coverImagePath?: string;
  totalPages: number;
  linkedMovie?: {
    arabicName: string;
    year?: number;
    posterImage?: string;
  };
  linkedCharacter?: {
    arabicName: string;
    photoImage?: string;
  };
  linkType?: string;
  publishedAt?: string;
  createdAt: string;
}

interface TimelineViewProps {
  language?: 'ar' | 'en';
  onItemClick?: (item: TimelineItem) => void;
}

interface DecadeGroup {
  decade: string;
  years: Map<number, TimelineItem[]>;
  totalCount: number;
}

const DECADES = ['2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s', '1950s', '1940s', '1930s'];

export default function TimelineView({
  language = 'ar',
  onItemClick,
}: TimelineViewProps) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDecades, setExpandedDecades] = useState<Set<string>>(new Set());
  const [selectedDecade, setSelectedDecade] = useState<string | null>(null);

  const texts = {
    title: { ar: 'الجدول الزمني', en: 'Timeline' },
    loading: { ar: 'جاري التحميل...', en: 'Loading...' },
    noData: { ar: 'لا توجد بيانات', en: 'No data available' },
    articles: { ar: 'مقال', en: 'articles' },
    viewAll: { ar: 'عرض الكل', en: 'View All' },
    collapse: { ar: 'إخفاء', en: 'Collapse' },
    decades: {
      ar: {
        '2020s': 'العشرينيات',
        '2010s': 'العقد الثاني',
        '2000s': 'الألفينيات',
        '1990s': 'التسعينيات',
        '1980s': 'الثمانينيات',
        '1970s': 'السبعينيات',
        '1960s': 'الستينيات',
        '1950s': 'الخمسينيات',
        '1940s': 'الأربعينيات',
        '1930s': 'الثلاثينيات',
      },
      en: {
        '2020s': '2020s',
        '2010s': '2010s',
        '2000s': '2000s',
        '1990s': '1990s',
        '1980s': '1980s',
        '1970s': '1970s',
        '1960s': '1960s',
        '1950s': '1950s',
        '1940s': '1940s',
        '1930s': '1930s',
      },
    },
  };

  const t = (key: keyof typeof texts) => {
    const value = texts[key];
    if (typeof value === 'object' && 'ar' in value && 'en' in value) {
      return (value as { ar: string; en: string })[language];
    }
    return '';
  };

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/collections?status=published&limit=500');
        const data = await response.json();
        if (data.success) {
          setItems(data.collections);
        }
      } catch (error) {
        console.error('Failed to fetch timeline items:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  // Group items by decade and year
  const timelineData = useMemo(() => {
    const decadeGroups: Map<string, DecadeGroup> = new Map();

    for (const item of items) {
      const year = item.linkedMovie?.year;
      if (!year) continue;

      const decadeStart = Math.floor(year / 10) * 10;
      const decade = `${decadeStart}s`;

      if (!decadeGroups.has(decade)) {
        decadeGroups.set(decade, {
          decade,
          years: new Map(),
          totalCount: 0,
        });
      }

      const group = decadeGroups.get(decade)!;
      if (!group.years.has(year)) {
        group.years.set(year, []);
      }
      group.years.get(year)!.push(item);
      group.totalCount++;
    }

    // Sort years within each decade
    for (const group of decadeGroups.values()) {
      const sortedYears = new Map([...group.years.entries()].sort((a, b) => b[0] - a[0]));
      group.years = sortedYears;
    }

    return decadeGroups;
  }, [items]);

  const toggleDecade = (decade: string) => {
    const newExpanded = new Set(expandedDecades);
    if (newExpanded.has(decade)) {
      newExpanded.delete(decade);
    } else {
      newExpanded.add(decade);
    }
    setExpandedDecades(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#d4a012]"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#7a6545]">{t('noData')}</p>
      </div>
    );
  }

  return (
    <div className="relative" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Timeline Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#d4a012]">{t('title')}</h2>
        <p className="text-[#7a6545] mt-2">
          {items.length} {t('articles')}
        </p>
      </div>

      {/* Decade Navigation */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {DECADES.map((decade) => {
          const group = timelineData.get(decade);
          if (!group) return null;

          return (
            <button
              key={decade}
              onClick={() => {
                setSelectedDecade(selectedDecade === decade ? null : decade);
                if (!expandedDecades.has(decade)) {
                  toggleDecade(decade);
                }
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedDecade === decade
                  ? 'bg-[#d4a012] text-[#1a1510]'
                  : 'bg-[#2a2318] text-[#d4c4a8] hover:bg-[#3a3020]'
              }`}
            >
              {texts.decades[language][decade as keyof typeof texts.decades.ar]}
              <span className="mr-1 text-xs opacity-70">({group.totalCount})</span>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Central Line */}
        <div className="absolute top-0 bottom-0 right-1/2 w-px bg-[#3a3020] transform translate-x-1/2"></div>

        {DECADES.map((decade) => {
          const group = timelineData.get(decade);
          if (!group) return null;
          if (selectedDecade && selectedDecade !== decade) return null;

          const isExpanded = expandedDecades.has(decade);

          return (
            <div key={decade} className="relative mb-8">
              {/* Decade Header */}
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => toggleDecade(decade)}
                  className="relative z-10 flex items-center gap-2 px-6 py-3 bg-[#2a2318] border-2 border-[#d4a012] rounded-full text-[#d4a012] font-bold hover:bg-[#3a3020] transition-colors"
                >
                  <span className="text-xl">
                    {texts.decades[language][decade as keyof typeof texts.decades.ar]}
                  </span>
                  <span className="text-sm opacity-70">({group.totalCount})</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Years */}
              {isExpanded && (
                <div className="space-y-6">
                  {Array.from(group.years.entries()).map(([year, yearItems]) => (
                    <div key={year} className="relative">
                      {/* Year Label */}
                      <div className="flex justify-center mb-3">
                        <div className="relative z-10 px-4 py-1 bg-[#1a1510] border border-[#5c4108] rounded-full">
                          <span className="text-[#d4a012] font-bold">{year}</span>
                          <span className="text-[#7a6545] text-sm mr-2">({yearItems.length})</span>
                        </div>
                      </div>

                      {/* Items Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 px-4">
                        {yearItems.slice(0, 6).map((item) => (
                          <Link
                            key={item._id}
                            href={`/archive/${item._id}`}
                            onClick={() => onItemClick?.(item)}
                            className="group block bg-[#2a2318] rounded-lg overflow-hidden border border-[#3a3020] hover:border-[#d4a012] transition-all"
                          >
                            <div className="aspect-[3/4] relative bg-[#1a1510]">
                              {(item.linkedMovie?.posterImage || item.linkedCharacter?.photoImage || item.coverImagePath) ? (
                                <Image
                                  src={item.linkedMovie?.posterImage || item.linkedCharacter?.photoImage || item.coverImagePath || ''}
                                  alt={item.title}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform"
                                  sizes="150px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-3xl opacity-30">🎬</span>
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <p className="text-xs text-[#d4c4a8] truncate group-hover:text-[#d4a012]">
                                {item.linkedMovie?.arabicName || item.title}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>

                      {/* Show more indicator */}
                      {yearItems.length > 6 && (
                        <div className="text-center mt-2">
                          <Link
                            href={`/archive?year=${year}`}
                            className="text-sm text-[#7a6545] hover:text-[#d4a012]"
                          >
                            +{yearItems.length - 6} {t('articles')}
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

