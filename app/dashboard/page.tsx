'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Stats {
  totalDocuments: number;
  pendingReview: number;
  inProgress: number;
  completed: number;
  totalCollections: number;
  publishedCollections: number;
  averageConfidence: number;
  totalReviewTime: number;
  aiCorrections: number;
}

interface RecentActivity {
  _id: string;
  type: 'upload' | 'review' | 'publish';
  title: string;
  timestamp: string;
}

// Famous Egyptian Cinema Quotes
const CINEMA_QUOTES = [
  { quote: "أنا مش حرامي... أنا بحب الحرية", film: "باب الحديد", year: 1958 },
  { quote: "الأرض بتتكلم عربي", film: "الأرض", year: 1970 },
  { quote: "إحنا مش بتوع سياسة", film: "إحنا بتوع الأتوبيس", year: 1979 },
  { quote: "الحب حلال... والكره حرام", film: "شيء من الخوف", year: 1969 },
  { quote: "أنا اللي بنيت السد العالي", film: "الناصر صلاح الدين", year: 1963 },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalDocuments: 0,
    pendingReview: 0,
    inProgress: 0,
    completed: 0,
    totalCollections: 0,
    publishedCollections: 0,
    averageConfidence: 0,
    totalReviewTime: 0,
    aiCorrections: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuote, setCurrentQuote] = useState(0);

  useEffect(() => {
    fetchStats();
    const quoteInterval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % CINEMA_QUOTES.length);
    }, 8000);
    return () => clearInterval(quoteInterval);
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch documents stats
      const docsRes = await fetch('/api/documents?limit=1000');
      const docsData = await docsRes.json();
      const docs = docsData.documents || [];
      
      // Fetch collections stats
      const colRes = await fetch('/api/collections?limit=1000');
      const colData = await colRes.json();
      const collections = colData.collections || [];

      // Calculate stats
      const pending = docs.filter((d: { reviewStatus: string }) => d.reviewStatus === 'pending').length;
      const inProg = docs.filter((d: { reviewStatus: string }) => d.reviewStatus === 'in_progress').length;
      const completed = docs.filter((d: { reviewStatus: string }) => d.reviewStatus === 'completed').length;
      const published = collections.filter((c: { status: string }) => c.status === 'published').length;
      
      const avgConf = docs.length > 0 
        ? docs.reduce((sum: number, d: { ocrConfidence?: number }) => sum + (d.ocrConfidence || 0), 0) / docs.length 
        : 0;
      
      const totalTime = docs.reduce((sum: number, d: { reviewTimeSeconds?: number }) => sum + (d.reviewTimeSeconds || 0), 0);
      const aiCorr = docs.reduce((sum: number, d: { approvedCorrectionsCount?: number }) => sum + (d.approvedCorrectionsCount || 0), 0);

      setStats({
        totalDocuments: docs.length,
        pendingReview: pending,
        inProgress: inProg,
        completed: completed,
        totalCollections: collections.length,
        publishedCollections: published,
        averageConfidence: avgConf * 100,
        totalReviewTime: totalTime,
        aiCorrections: aiCorr,
      });

      // Create recent activity from documents and collections
      const activities: RecentActivity[] = [
        ...docs.slice(0, 5).map((d: { _id: string; filename: string; uploadedAt: string }) => ({
          _id: d._id,
          type: 'upload' as const,
          title: d.filename,
          timestamp: d.uploadedAt,
        })),
      ];
      setRecentActivity(activities);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}س ${mins}د`;
  };

  const quote = CINEMA_QUOTES[currentQuote];

  return (
    <div className="min-h-screen bg-[#0f0c08] relative overflow-hidden film-grain" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 egyptian-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[150%] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center top, rgba(201, 162, 39, 0.1) 0%, transparent 60%)' }}
      />
      <div className="fixed top-0 left-0 w-5 h-full bg-[#1a1612] film-sprockets pointer-events-none" />
      <div className="fixed top-0 right-0 w-5 h-full bg-[#1a1612] film-sprockets pointer-events-none" />

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
                  <span className="text-[#c9a227] font-bold text-lg arabic-title">سينما زمان</span>
                  <p className="text-[#8b7319] text-xs">CINEMA ZAMAN</p>
                </div>
              </Link>
            </div>
            <nav className="flex items-center gap-2">
              <Link href="/" className="btn-outline-gold px-4 py-2 rounded-lg text-sm">الرئيسية</Link>
              <Link href="/archive" className="btn-outline-gold px-4 py-2 rounded-lg text-sm">الأرشيف</Link>
              <Link href="/review" className="btn-outline-gold px-4 py-2 rounded-lg text-sm">المراجعة</Link>
            </nav>
          </div>
        </header>

        <div className="container mx-auto px-6 py-10">
          {/* Page Title */}
          <div className="text-center mb-12">
            <div className="flex justify-center items-center gap-4 mb-4">
              <span className="text-[#c9a227] text-2xl">𓃭</span>
              <h1 className="text-4xl font-bold film-title arabic-title">لوحة التحكم</h1>
              <span className="text-[#c9a227] text-2xl">𓃭</span>
            </div>
            <p className="text-[#8b7319] tracking-wider">DASHBOARD</p>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="film-spinner mx-auto mb-4"></div>
              <p className="text-[#c9a227]">جاري التحميل...</p>
            </div>
          ) : (
            <>
              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="vintage-card p-6 rounded-xl text-center">
                  <div className="text-5xl font-bold text-[#c9a227] mb-2">{stats.totalDocuments}</div>
                  <div className="text-[#9c8550] text-sm">إجمالي الوثائق</div>
                  <div className="text-[#5c4108] text-xs mt-1">TOTAL DOCUMENTS</div>
                </div>
                <div className="vintage-card p-6 rounded-xl text-center">
                  <div className="text-5xl font-bold text-[#e8d48b] mb-2">{stats.pendingReview}</div>
                  <div className="text-[#9c8550] text-sm">في انتظار المراجعة</div>
                  <div className="text-[#5c4108] text-xs mt-1">PENDING REVIEW</div>
                </div>
                <div className="vintage-card p-6 rounded-xl text-center">
                  <div className="text-5xl font-bold text-[#c9a227] mb-2">{stats.inProgress}</div>
                  <div className="text-[#9c8550] text-sm">قيد المراجعة</div>
                  <div className="text-[#5c4108] text-xs mt-1">IN PROGRESS</div>
                </div>
                <div className="vintage-card p-6 rounded-xl text-center">
                  <div className="text-5xl font-bold text-[#90ee90] mb-2">{stats.completed}</div>
                  <div className="text-[#9c8550] text-sm">مكتملة</div>
                  <div className="text-[#5c4108] text-xs mt-1">COMPLETED</div>
                </div>
              </div>

              {/* Secondary Stats */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {/* Collections Card */}
                <div className="vintage-card p-6 rounded-xl">
                  <h3 className="text-[#c9a227] font-bold text-lg mb-4 flex items-center gap-2">
                    <span>📚</span> المجموعات
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[#9c8550]">إجمالي المجموعات</span>
                      <span className="text-[#e8d48b] font-bold text-xl">{stats.totalCollections}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#9c8550]">المنشورة</span>
                      <span className="text-[#90ee90] font-bold text-xl">{stats.publishedCollections}</span>
                    </div>
                    <div className="h-2 bg-[#2a2318] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#c9a227] to-[#90ee90]"
                        style={{ width: `${stats.totalCollections ? (stats.publishedCollections / stats.totalCollections) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Performance Card */}
                <div className="vintage-card p-6 rounded-xl">
                  <h3 className="text-[#c9a227] font-bold text-lg mb-4 flex items-center gap-2">
                    <span>🎯</span> الأداء
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[#9c8550]">متوسط دقة OCR</span>
                      <span className={`font-bold text-xl ${stats.averageConfidence > 80 ? 'text-[#90ee90]' : 'text-[#e8d48b]'}`}>
                        {stats.averageConfidence.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#9c8550]">تصحيحات AI</span>
                      <span className="text-[#c9a227] font-bold text-xl">{stats.aiCorrections}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#9c8550]">وقت المراجعة</span>
                      <span className="text-[#e8d48b] font-bold">{formatTime(stats.totalReviewTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Card */}
                <div className="vintage-card p-6 rounded-xl">
                  <h3 className="text-[#c9a227] font-bold text-lg mb-4 flex items-center gap-2">
                    <span>⚡</span> إجراءات سريعة
                  </h3>
                  <div className="space-y-3">
                    <Link href="/" className="btn-rotana w-full py-3 rounded-lg text-center block">
                      📤 رفع وثائق جديدة
                    </Link>
                    <Link href="/review?status=pending" className="btn-outline-gold w-full py-3 rounded-lg text-center block">
                      📝 مراجعة الوثائق
                    </Link>
                    <Link href="/archive" className="btn-outline-gold w-full py-3 rounded-lg text-center block">
                      📚 تصفح الأرشيف
                    </Link>
                  </div>
                </div>
              </div>

              {/* Progress Visualization */}
              <div className="vintage-card p-6 rounded-xl mb-8">
                <h3 className="text-[#c9a227] font-bold text-lg mb-6 flex items-center gap-2">
                  <span>📊</span> تقدم المراجعة
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-8 bg-[#2a2318] rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-[#90ee90] transition-all duration-500"
                        style={{ width: `${stats.totalDocuments ? (stats.completed / stats.totalDocuments) * 100 : 0}%` }}
                      />
                      <div 
                        className="h-full bg-[#c9a227] transition-all duration-500"
                        style={{ width: `${stats.totalDocuments ? (stats.inProgress / stats.totalDocuments) * 100 : 0}%` }}
                      />
                      <div 
                        className="h-full bg-[#5c4108] transition-all duration-500"
                        style={{ width: `${stats.totalDocuments ? (stats.pendingReview / stats.totalDocuments) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#90ee90] rounded"></span> مكتمل</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#c9a227] rounded"></span> قيد التنفيذ</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#5c4108] rounded"></span> في الانتظار</span>
                  </div>
                </div>
              </div>

              {/* Movie Quote */}
              <div className="vintage-card p-8 rounded-xl text-center relative overflow-hidden">
                <div className="absolute inset-0 egyptian-pattern opacity-10" />
                <div className="relative z-10">
                  <div className="text-6xl mb-4">🎬</div>
                  <blockquote className="text-2xl text-[#e8d48b] font-bold mb-4 arabic-title">
                    &ldquo;{quote.quote}&rdquo;
                  </blockquote>
                  <p className="text-[#c9a227]">
                    — {quote.film} ({quote.year})
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-[#3a3020]">
          <div className="container mx-auto text-center">
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
