'use client';

import { useState, useEffect } from 'react';
import StarsCarousel from '@/components/StarsCarousel';
import Link from 'next/link';

// Classic Egyptian Cinema Stars for decoration
const GOLDEN_ERA_STARS = [
  'فاتن حمامة', 'عمر الشريف', 'سعاد حسني', 'رشدي أباظة',
  'شادية', 'عبد الحليم حافظ', 'فريد الأطرش', 'ليلى مراد',
  'أنور وجدي', 'ماجدة', 'هند رستم', 'محمود المليجي'
];

const CLASSIC_MOVIES = [
  'باب الحديد ١٩٥٨', 'الأرض ١٩٧٠', 'المومياء ١٩٦٩', 'شباب امرأة ١٩٥٦',
  'دعاء الكروان ١٩٥٩', 'الناصر صلاح الدين ١٩٦٣', 'غزل البنات ١٩٤٩'
];

export default function HomePage() {
  const [currentStarIndex, setCurrentStarIndex] = useState(0);

  // Rotate through stars
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStarIndex((prev) => (prev + 1) % GOLDEN_ERA_STARS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0c08] relative overflow-hidden film-grain">
      {/* Egyptian Pattern Background */}
      <div className="fixed inset-0 egyptian-pattern opacity-30 pointer-events-none" />
      
      {/* Spotlight Effect */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[200%] h-[700px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(201, 162, 39, 0.15) 0%, rgba(107, 28, 35, 0.05) 40%, transparent 70%)',
        }}
      />

      {/* Cinema Curtains */}
      <div className="fixed top-0 left-0 w-40 h-full pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, rgba(107, 28, 35, 0.6) 0%, rgba(74, 18, 24, 0.3) 50%, transparent 100%)',
        }}
      />
      <div className="fixed top-0 right-0 w-40 h-full pointer-events-none"
        style={{
          background: 'linear-gradient(270deg, rgba(107, 28, 35, 0.6) 0%, rgba(74, 18, 24, 0.3) 50%, transparent 100%)',
        }}
      />

      {/* Film Sprocket Left */}
      <div className="fixed top-0 left-0 w-6 h-full bg-[#1a1612] film-sprockets pointer-events-none" />
      <div className="fixed top-0 right-0 w-6 h-full bg-[#1a1612] film-sprockets pointer-events-none" />

      <div className="relative z-10">
        {/* Rotana-Style Header */}
        <header className="rotana-header py-4 px-6">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#c9a227] via-[#e8d48b] to-[#8b7319] p-0.5">
                  <div className="w-full h-full rounded-full bg-[#1a1612] flex items-center justify-center">
                    <span className="text-3xl">🎬</span>
                  </div>
                </div>
                {/* Film reel decoration */}
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#c9a227] opacity-60" />
              </div>
              <div>
                <h2 className="text-[#c9a227] font-bold text-xl arabic-title">سينما زمان</h2>
                <p className="text-[#8b7319] text-xs tracking-wider">CINEMA ZAMAN</p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex items-center gap-3">
              <Link href="/archive" className="btn-outline-gold px-4 py-2 rounded-lg text-sm font-medium">
                الأرشيف
              </Link>
              <Link href="/review" className="btn-outline-gold px-4 py-2 rounded-lg text-sm font-medium">
                المراجعة
              </Link>
              <Link href="/movies" className="btn-outline-gold px-4 py-2 rounded-lg text-sm font-medium">
                الأفلام
              </Link>
              <Link href="/dashboard" className="btn-rotana px-5 py-2 rounded-lg text-sm font-bold">
                لوحة التحكم
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-6 relative spotlight">
          <div className="container mx-auto text-center relative">
            {/* Decorative Egyptian Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[#c9a22730] text-sm tracking-[0.5em] hieroglyph-border">
              𓂀 𓃭 𓆣 𓇋 𓈖 𓊪 𓋴 𓌳
            </div>
            
            {/* Stars decoration */}
            <div className="flex justify-center gap-3 mb-8">
              {[...Array(7)].map((_, i) => (
                <span key={i} className={`text-[#c9a227] ${i === 3 ? 'text-3xl' : 'text-xl'} star-rating`}>
                  {i === 3 ? '✦' : '★'}
                </span>
              ))}
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold film-title arabic-title mb-4 cinema-flicker" dir="rtl">
              أرشيف السينما
            </h1>
            <h2 className="text-3xl md:text-4xl text-[#e8d48b] font-bold arabic-title mb-2">
              العصر الذهبي
            </h2>
            <p className="text-[#8b7319] text-lg mb-8 tracking-widest">
              THE GOLDEN ERA OF EGYPTIAN CINEMA
            </p>
            
            {/* Art Deco Divider */}
            <div className="art-deco-divider max-w-xl mx-auto mb-8">
              <span className="text-[#c9a227] text-2xl">❖</span>
            </div>
            
            <p className="text-xl text-[#d4c4a0] max-w-3xl mx-auto mb-6 leading-relaxed arabic-body" dir="rtl">
              رقمنة وحفظ التراث السينمائي المصري والعربي
              <br />
              من المجلات والصحف التاريخية في الفترة من ١٩٣٠ إلى ١٩٨٠
            </p>
            
            {/* Rotating Star Names */}
            <div className="h-8 mb-10 overflow-hidden">
              <p className="text-[#c9a227] text-lg animate-pulse">
                ✨ {GOLDEN_ERA_STARS[currentStarIndex]} ✨
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex justify-center gap-4 flex-wrap">
              <Link href="/archive" className="btn-rotana px-10 py-4 rounded-xl text-lg font-bold flex items-center gap-3 group">
                <span className="text-2xl group-hover:animate-pulse">🎞️</span>
                تصفح الأرشيف
              </Link>
              <Link href="/review" className="btn-burgundy px-10 py-4 rounded-xl text-lg font-bold flex items-center gap-3">
                <span className="text-2xl">✍️</span>
                قائمة المراجعة
              </Link>
            </div>
          </div>
        </section>

        {/* Classic Movies Marquee */}
        <div className="py-4 bg-gradient-to-r from-[#6b1c23] via-[#4a1218] to-[#6b1c23] border-y border-[#c9a227]/30 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...CLASSIC_MOVIES, ...CLASSIC_MOVIES].map((movie, i) => (
              <span key={i} className="mx-8 text-[#e8d48b] text-sm">
                ★ {movie}
              </span>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <section className="py-16 px-6 bg-gradient-to-b from-transparent via-[#1a1612]/50 to-transparent">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <div className="flex justify-center items-center gap-4 mb-4">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#c9a227]" />
                <span className="text-[#c9a227] text-3xl">𓂀</span>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#c9a227]" />
              </div>
              <h3 className="text-3xl font-bold text-[#c9a227] arabic-title mb-2">كيف يعمل النظام</h3>
              <p className="text-[#8b7319] tracking-wider">THE DIGITIZATION PROCESS</p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                { 
                  icon: '📜', 
                  title: 'الرفع', 
                  desc: 'ارفع صفحات المجلات والصحف السينمائية من العصر الذهبي',
                  step: '𓏺'
                },
                { 
                  icon: '🔍', 
                  title: 'استخراج النص', 
                  desc: 'تقنية OCR متقدمة للتعرف على النص العربي القديم بدقة عالية',
                  step: '𓏻'
                },
                { 
                  icon: '🤖', 
                  title: 'الذكاء الاصطناعي', 
                  desc: 'تصحيح تلقائي للأخطاء مع مراجعة كل تعديل قبل التطبيق',
                  step: '𓏼'
                },
                { 
                  icon: '✨', 
                  title: 'الأرشفة', 
                  desc: 'حفظ المحتوى بشكل دائم مع ربطه بالأفلام والنجوم',
                  step: '𓏽'
                },
              ].map((item, index) => (
                <div key={index} className="vintage-card p-6 rounded-xl text-center group hover:scale-105 transition-transform">
                  <div className="relative inline-block mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2a2318] to-[#1a1510] flex items-center justify-center text-4xl border-2 border-[#5c4108] group-hover:border-[#c9a227] transition-colors">
                      {item.icon}
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#8b7319] rounded-full flex items-center justify-center text-sm font-bold text-[#1a1612]">
                      {item.step}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-[#c9a227] mb-2 arabic-title">{item.title}</h4>
                  <p className="text-sm text-[#9c8550] leading-relaxed arabic-body">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stars Carousel Section */}
        <section className="py-16 px-6">
          <div className="container mx-auto max-w-5xl">
            <StarsCarousel 
              autoPlay={true}
              autoPlayInterval={5000}
              showNavigation={true}
              showDots={true}
            />
            
            {/* View All Stars Link */}
            <div className="text-center mt-8">
              <Link href="/characters" className="btn-outline-gold px-8 py-3 rounded-xl text-sm inline-flex items-center gap-2">
                <span>⭐</span>
                تصفح جميع النجوم
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="py-12 px-6 border-t border-[#3a3020]">
          <div className="container mx-auto text-center">
            <div className="flex justify-center items-center gap-8 flex-wrap text-sm">
              <Link href="/movies" className="text-[#c9a227] hover:text-[#e8d48b] transition-colors flex items-center gap-2">
                <span>🎬</span> الأفلام
              </Link>
              <span className="text-[#5c4108]">❖</span>
              <Link href="/characters" className="text-[#c9a227] hover:text-[#e8d48b] transition-colors flex items-center gap-2">
                <span>⭐</span> النجوم
              </Link>
              <span className="text-[#5c4108]">❖</span>
              <Link href="/archive" className="text-[#c9a227] hover:text-[#e8d48b] transition-colors flex items-center gap-2">
                <span>📚</span> الأرشيف
              </Link>
              <span className="text-[#5c4108]">❖</span>
              <Link href="/admin/categories" className="text-[#c9a227] hover:text-[#e8d48b] transition-colors flex items-center gap-2">
                <span>⚙️</span> الإدارة
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 bg-gradient-to-b from-[#1a1612] to-[#0f0c08] border-t border-[#c9a227]/20">
          <div className="container mx-auto text-center">
            {/* Hieroglyphic decoration */}
            <div className="text-[#c9a22730] text-xs tracking-[0.3em] mb-6">
              𓂀 𓃭 𓆣 𓇋 𓈖 𓊪 𓋴 𓌳 𓏏 𓐍 𓊹 𓅓
            </div>
            
            <div className="flex justify-center gap-3 mb-6">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-[#8b7319]">★</span>
              ))}
            </div>
            
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a227] to-[#8b7319] p-0.5">
                <div className="w-full h-full rounded-full bg-[#0f0c08] flex items-center justify-center">
                  <span className="text-xl">🎬</span>
                </div>
              </div>
              <div>
                <p className="text-[#c9a227] font-bold text-lg arabic-title">سينما زمان</p>
                <p className="text-[#8b7319] text-xs">أرشيف السينما المصرية</p>
              </div>
            </div>
            
            <p className="text-[#7a6540] text-sm mb-4">
              حفظ التراث السينمائي العربي للأجيال القادمة
            </p>
            
            <p className="text-[#5c4108] text-xs">
              © {new Date().getFullYear()} جميع الحقوق محفوظة
            </p>
          </div>
        </footer>
      </div>

      {/* Marquee Animation */}
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
