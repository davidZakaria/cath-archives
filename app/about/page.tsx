'use client';

import Link from 'next/link';
import StarsCarousel from '@/components/StarsCarousel';

const TIMELINE_EVENTS = [
  {
    year: 1896,
    title: 'بداية السينما في مصر',
    titleEn: 'Cinema Arrives in Egypt',
    description: 'أول عرض سينمائي في مصر، بعد أشهر قليلة من عرض الأخوين لوميير في باريس',
    icon: '🎬',
  },
  {
    year: 1917,
    title: 'أول استوديو مصري',
    titleEn: 'First Egyptian Studio',
    description: 'تأسيس أول استوديو سينمائي في مصر على يد محمد كريم',
    icon: '🏛️',
  },
  {
    year: 1927,
    title: 'ليلى - أول فيلم مصري',
    titleEn: 'Laila - First Egyptian Feature',
    description: 'إنتاج فيلم "ليلى" أول فيلم روائي مصري طويل من بطولة عزيزة أمير',
    icon: '⭐',
  },
  {
    year: 1935,
    title: 'استوديو مصر',
    titleEn: 'Studio Misr Founded',
    description: 'تأسيس استوديو مصر على يد طلعت حرب، بداية العصر الذهبي للسينما المصرية',
    icon: '🎥',
  },
  {
    year: 1936,
    title: 'وداد - أم كلثوم',
    titleEn: 'Wedad - Umm Kulthum',
    description: 'فيلم "وداد" من بطولة أم كلثوم، أول إنتاجات استوديو مصر',
    icon: '🎵',
  },
  {
    year: 1944,
    title: 'غزل البنات',
    titleEn: 'Flirtation of Girls',
    description: 'من أشهر أفلام العصر الذهبي، بطولة ليلى مراد ونجيب الريحاني',
    icon: '💃',
  },
  {
    year: 1952,
    title: 'ثورة يوليو',
    titleEn: 'July Revolution',
    description: 'تأثير الثورة على السينما المصرية وبداية مرحلة جديدة',
    icon: '🦅',
  },
  {
    year: 1958,
    title: 'باب الحديد',
    titleEn: 'Cairo Station',
    description: 'تحفة يوسف شاهين، من أهم الأفلام في تاريخ السينما العربية',
    icon: '🚂',
  },
  {
    year: 1963,
    title: 'الناصر صلاح الدين',
    titleEn: 'Saladin',
    description: 'الفيلم الملحمي من إخراج يوسف شاهين، أضخم إنتاج عربي',
    icon: '⚔️',
  },
  {
    year: 1969,
    title: 'المومياء',
    titleEn: 'The Mummy',
    description: 'تحفة شادي عبد السلام، من أعظم الأفلام في تاريخ السينما',
    icon: '𓃭',
  },
  {
    year: 1970,
    title: 'الأرض',
    titleEn: 'The Land',
    description: 'فيلم يوسف شاهين الكلاسيكي عن الفلاح المصري',
    icon: '🌾',
  },
  {
    year: 1978,
    title: 'إسكندرية ليه',
    titleEn: 'Alexandria Why',
    description: 'أول أفلام ثلاثية يوسف شاهين السيرة الذاتية',
    icon: '🌊',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0f0c08] relative overflow-hidden film-grain" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 egyptian-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[150%] h-[600px] pointer-events-none"
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
            <nav className="flex items-center gap-2">
              <Link href="/" className="btn-outline-gold px-4 py-2 rounded-lg text-sm">الرئيسية</Link>
              <Link href="/archive" className="btn-outline-gold px-4 py-2 rounded-lg text-sm">الأرشيف</Link>
              <Link href="/movies" className="btn-rotana px-4 py-2 rounded-lg text-sm">الأفلام</Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="py-20 px-6 border-b border-[#3a3020]">
          <div className="container mx-auto text-center max-w-4xl">
            <div className="text-[#c9a22740] text-sm tracking-[0.5em] mb-6">
              𓂀 𓃭 𓆣 𓇋 𓈖 𓊪 𓋴 𓌳
            </div>
            <div className="flex justify-center gap-3 mb-6">
              {[...Array(7)].map((_, i) => (
                <span key={i} className={`text-[#c9a227] ${i === 3 ? 'text-3xl' : 'text-xl'}`}>
                  {i === 3 ? '✦' : '★'}
                </span>
              ))}
            </div>
            <h1 className="text-5xl md:text-7xl font-bold film-title mb-4">
              تاريخ السينما المصرية
            </h1>
            <p className="text-[#8b7319] text-lg mb-8 tracking-widest">
              THE HISTORY OF EGYPTIAN CINEMA
            </p>
            <div className="art-deco-divider max-w-md mx-auto mb-8">
              <span className="text-[#c9a227] text-2xl">❖</span>
            </div>
            <p className="text-xl text-[#d4c4a0] leading-relaxed">
              رحلة عبر أكثر من قرن من الإبداع السينمائي المصري
              <br />
              <span className="text-[#9c8550]">من العصر الذهبي إلى اليوم</span>
            </p>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-16 px-6">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-[#c9a227] text-center mb-12">
              <span className="ml-4">𓃭</span>
              الخط الزمني
              <span className="mr-4">𓃭</span>
            </h2>
            
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute top-0 bottom-0 right-8 w-1 bg-gradient-to-b from-[#c9a227] via-[#8b7319] to-[#5c4108]" />
              
              {/* Events */}
              <div className="space-y-8">
                {TIMELINE_EVENTS.map((event, index) => (
                  <div key={index} className="relative flex gap-8">
                    {/* Year marker */}
                    <div className="flex-shrink-0 w-16 text-left">
                      <div className="w-8 h-8 rounded-full bg-[#c9a227] flex items-center justify-center text-[#1a1612] font-bold text-lg absolute right-4 transform translate-x-1/2">
                        {event.icon}
                      </div>
                      <div className="text-[#c9a227] font-bold text-xl pt-1">{event.year}</div>
                    </div>
                    
                    {/* Content */}
                    <div className="vintage-card p-6 rounded-xl flex-1 mr-8">
                      <h3 className="text-xl font-bold text-[#e8d48b] mb-1">{event.title}</h3>
                      <p className="text-[#8b7319] text-xs mb-3 tracking-wider">{event.titleEn}</p>
                      <p className="text-[#9c8550]">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Golden Stars Carousel */}
        <section className="py-16 px-6 bg-gradient-to-b from-transparent via-[#1a1612]/50 to-transparent">
          <div className="container mx-auto max-w-5xl">
            <StarsCarousel 
              autoPlay={true}
              autoPlayInterval={4000}
              showNavigation={true}
              showDots={true}
            />
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 px-6">
          <div className="container mx-auto max-w-3xl">
            <div className="vintage-card p-10 rounded-2xl text-center relative overflow-hidden">
              <div className="absolute inset-0 egyptian-pattern opacity-10" />
              <div className="relative z-10">
                <div className="text-6xl mb-6">📜</div>
                <h2 className="text-2xl font-bold text-[#c9a227] mb-4">مهمتنا</h2>
                <p className="text-[#d4c4a0] text-lg leading-relaxed mb-6">
                  نسعى لحفظ وتوثيق التراث السينمائي المصري والعربي من خلال رقمنة المجلات والصحف التاريخية،
                  وإتاحتها للباحثين والمهتمين بتاريخ السينما العربية.
                </p>
                <p className="text-[#9c8550]">
                  باستخدام أحدث تقنيات الذكاء الاصطناعي للحفاظ على هذا الإرث للأجيال القادمة
                </p>
                <div className="mt-8">
                  <Link href="/" className="btn-rotana px-8 py-4 rounded-xl text-lg inline-flex items-center gap-2">
                    <span>📤</span>
                    ساهم في الأرشيف
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 bg-[#0a0805] border-t border-[#3a3020]">
          <div className="container mx-auto text-center">
            <div className="text-[#c9a22730] text-xs tracking-[0.3em] mb-6">
              𓂀 𓃭 𓆣 𓇋 𓈖 𓊪 𓋴 𓌳 𓏏 𓐍
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-[#8b7319]">★</span>
              ))}
            </div>
            <p className="text-[#c9a227] font-bold text-lg mb-2">سينما زمان</p>
            <p className="text-[#5c4108] text-sm">© {new Date().getFullYear()} جميع الحقوق محفوظة</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

