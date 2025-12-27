'use client';

import { useState, useEffect, useCallback } from 'react';

// Golden Age Egyptian Cinema Stars
// Images should be placed in /public/stars/ folder with the following filenames
const GOLDEN_STARS = [
  {
    name: 'فاتن حمامة',
    nameEn: 'Faten Hamama',
    title: 'سيدة الشاشة العربية',
    years: '1931 - 2015',
    films: 'دعاء الكروان، الحرام، أريد حلاً',
    icon: '👑',
    color: '#c9a227',
    image: '/stars/faten-hamama.svg',
  },
  {
    name: 'عمر الشريف',
    nameEn: 'Omar Sharif',
    title: 'النجم العالمي',
    years: '1932 - 2015',
    films: 'صراع في الوادي، لورنس العرب، دكتور زيفاجو',
    icon: '🌟',
    color: '#e8d48b',
    image: '/stars/omar-sharif.svg',
  },
  {
    name: 'سعاد حسني',
    nameEn: 'Soad Hosny',
    title: 'السندريلا',
    years: '1943 - 2001',
    films: 'خلي بالك من زوزو، الكرنك، شفيقة ومتولي',
    icon: '👠',
    color: '#d4a0a8',
    image: '/stars/soad-hosny.svg',
  },
  {
    name: 'رشدي أباظة',
    nameEn: 'Rushdy Abaza',
    title: 'دنجوان السينما',
    years: '1926 - 1980',
    films: 'نهر الحب، أبي فوق الشجرة، لا وقت للحب',
    icon: '🎩',
    color: '#8b7319',
    image: '/stars/rushdy-abaza.svg',
  },
  {
    name: 'شادية',
    nameEn: 'Shadia',
    title: 'دلوعة السينما',
    years: '1931 - 2017',
    films: 'شيء من الخوف، المرأة المجهولة، لا تطفئ الشمس',
    icon: '🌹',
    color: '#c96a6a',
    image: '/stars/shadia.svg',
  },
  {
    name: 'عبد الحليم حافظ',
    nameEn: 'Abdel Halim Hafez',
    title: 'العندليب الأسمر',
    years: '1929 - 1977',
    films: 'الوسادة الخالية، أبي فوق الشجرة، معبودة الجماهير',
    icon: '🎤',
    color: '#6a8bc9',
    image: '/stars/abdel-halim.svg',
  },
  {
    name: 'نجيب الريحاني',
    nameEn: 'Naguib El-Rihani',
    title: 'ملك الكوميديا',
    years: '1889 - 1949',
    films: 'غزل البنات، سلامة في خير، أبو حلموس',
    icon: '🎭',
    color: '#c9a227',
    image: '/stars/naguib-rihani.svg',
  },
  {
    name: 'ليلى مراد',
    nameEn: 'Laila Mourad',
    title: 'قيثارة السماء',
    years: '1918 - 1995',
    films: 'غزل البنات، قلبي دليلي، شاطئ الغرام',
    icon: '🎵',
    color: '#9c6ac9',
    image: '/stars/laila-mourad.svg',
  },
  {
    name: 'أم كلثوم',
    nameEn: 'Umm Kulthum',
    title: 'كوكب الشرق',
    years: '1898 - 1975',
    films: 'وداد، دنانير، سلامة',
    icon: '🌙',
    color: '#c9b86a',
    image: '/stars/umm-kulthum.svg',
  },
  {
    name: 'يوسف شاهين',
    nameEn: 'Youssef Chahine',
    title: 'عبقري الإخراج',
    years: '1926 - 2008',
    films: 'باب الحديد، الأرض، إسكندرية ليه',
    icon: '🎬',
    color: '#6ac9a2',
    image: '/stars/youssef-chahine.svg',
  },
  {
    name: 'إسماعيل ياسين',
    nameEn: 'Ismail Yassin',
    title: 'ضاحك مصر',
    years: '1912 - 1972',
    films: 'إسماعيل ياسين في الجيش، ابن حميدو، الآنسة حنفي',
    icon: '😄',
    color: '#c9c96a',
    image: '/stars/ismail-yassin.svg',
  },
  {
    name: 'هند رستم',
    nameEn: 'Hind Rostom',
    title: 'مارلين مونرو الشرق',
    years: '1929 - 2011',
    films: 'باب الحديد، حب حتى العبادة، إمبراطورية ميم',
    icon: '💋',
    color: '#c96a8b',
    image: '/stars/hind-rostom.svg',
  },
];

interface StarsCarouselProps {
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showNavigation?: boolean;
  showDots?: boolean;
  className?: string;
}

// Star Portrait Component with image support
function StarPortrait({ 
  name,
  color,
  image,
  size = 'large'
}: { 
  name: string;
  color: string;
  image?: string;
  size?: 'small' | 'large';
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const isLarge = size === 'large';
  
  const showImage = image && !imageError;
  
  return (
    <div 
      className={`relative flex items-center justify-center overflow-hidden ${
        isLarge ? 'w-48 h-60 md:w-56 md:h-72' : 'w-full h-full'
      }`}
      style={{
        background: `linear-gradient(145deg, ${color}15 0%, ${color}30 50%, ${color}15 100%)`,
      }}
    >
      {/* Image */}
      {showImage && (
        <>
          {/* Loading placeholder */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1a1612]">
              <div className="w-8 h-8 border-2 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={name}
            className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ 
              objectFit: 'cover',
              objectPosition: 'center top',
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        </>
      )}
      
      
      {/* Film grain effect */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] pointer-events-none" />
      
      {/* Bottom gradient for name (when image is shown) */}
      {showImage && imageLoaded && isLarge && (
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
      )}
    </div>
  );
}

export default function StarsCarousel({
  autoPlay = true,
  autoPlayInterval = 4000,
  showNavigation = true,
  showDots = true,
  className = '',
}: StarsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  const goToNext = useCallback(() => {
    goToSlide((currentIndex + 1) % GOLDEN_STARS.length);
  }, [currentIndex, goToSlide]);

  const goToPrev = useCallback(() => {
    goToSlide((currentIndex - 1 + GOLDEN_STARS.length) % GOLDEN_STARS.length);
  }, [currentIndex, goToSlide]);

  // Auto-play
  useEffect(() => {
    if (!autoPlay || isPaused) return;
    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isPaused, goToNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToNext();
      if (e.key === 'ArrowRight') goToPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  const currentStar = GOLDEN_STARS[currentIndex];
  const prevIndex = (currentIndex - 1 + GOLDEN_STARS.length) % GOLDEN_STARS.length;
  const nextIndex = (currentIndex + 1) % GOLDEN_STARS.length;

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main Carousel Container */}
      <div className="vintage-card rounded-2xl p-8 overflow-hidden relative">
        {/* Background pattern */}
        <div className="absolute inset-0 egyptian-pattern opacity-10" />
        
        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="flex justify-center gap-2 mb-3">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={`text-[#c9a227] ${i === 2 ? 'text-2xl' : 'text-lg'}`}>★</span>
            ))}
          </div>
          <h2 className="text-3xl font-bold film-title mb-2">نجوم العصر الذهبي</h2>
          <p className="text-[#8b7319] tracking-widest text-sm">GOLDEN ERA LEGENDS</p>
        </div>

        {/* Carousel Content */}
        <div className="relative z-10">
          {/* Stars Display */}
          <div className="flex items-center justify-center gap-4 md:gap-8">
            {/* Previous Star (small) */}
            <div 
              className="hidden md:block w-24 h-32 cursor-pointer opacity-40 hover:opacity-60 transition-all transform scale-75 rounded-lg overflow-hidden border-2 border-[#5c4108]"
              onClick={goToPrev}
            >
              <StarPortrait
                name={GOLDEN_STARS[prevIndex].name}
                color={GOLDEN_STARS[prevIndex].color}
                image={GOLDEN_STARS[prevIndex].image}
                size="small"
              />
            </div>

            {/* Current Star (large) */}
            <div className={`transition-all duration-500 ${isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                {/* Star Portrait */}
                <div className="relative group">
                  {/* Golden frame */}
                  <div className="absolute -inset-2 bg-gradient-to-br from-[#c9a227] via-[#e8d48b] to-[#8b7319] rounded-2xl opacity-80" />
                  <div className="relative rounded-xl overflow-hidden border-4 border-[#1a1612]">
                    <StarPortrait
                      name={currentStar.name}
                      color={currentStar.color}
                      image={currentStar.image}
                      size="large"
                    />
                  </div>
                  {/* Film sprocket decoration */}
                  <div className="absolute top-0 bottom-0 -right-4 w-3 flex flex-col justify-around">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="w-2 h-2 bg-[#c9a227] rounded-sm" />
                    ))}
                  </div>
                  <div className="absolute top-0 bottom-0 -left-4 w-3 flex flex-col justify-around">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="w-2 h-2 bg-[#c9a227] rounded-sm" />
                    ))}
                  </div>
                </div>

                {/* Star Info */}
                <div className="text-center md:text-right max-w-xs">
                  <h3 className="text-3xl md:text-4xl font-bold text-[#e8d48b] mb-1">
                    {currentStar.name}
                  </h3>
                  <p className="text-[#8b7319] text-sm mb-3" dir="ltr">
                    {currentStar.nameEn}
                  </p>
                  <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-[#c9a227] to-[#8b7319] text-[#1a1612] rounded-full text-sm font-bold mb-4">
                    {currentStar.title}
                  </div>
                  <p className="text-[#9c8550] mb-4">
                    {currentStar.years}
                  </p>
                  <div className="pt-4 border-t border-[#3a3020]">
                    <p className="text-[#7a6540] text-xs mb-2">من أشهر أعماله:</p>
                    <p className="text-[#c9a227] text-sm leading-relaxed">
                      {currentStar.films}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Star (small) */}
            <div 
              className="hidden md:block w-24 h-32 cursor-pointer opacity-40 hover:opacity-60 transition-all transform scale-75 rounded-lg overflow-hidden border-2 border-[#5c4108]"
              onClick={goToNext}
            >
              <StarPortrait
                name={GOLDEN_STARS[nextIndex].name}
                color={GOLDEN_STARS[nextIndex].color}
                image={GOLDEN_STARS[nextIndex].image}
                size="small"
              />
            </div>
          </div>

          {/* Navigation Arrows */}
          {showNavigation && (
            <>
              <button
                onClick={goToPrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#1a1612]/80 border-2 border-[#c9a227] rounded-full flex items-center justify-center text-[#c9a227] hover:bg-[#c9a227] hover:text-[#1a1612] transition-all group"
                aria-label="Previous star"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#1a1612]/80 border-2 border-[#c9a227] rounded-full flex items-center justify-center text-[#c9a227] hover:bg-[#c9a227] hover:text-[#1a1612] transition-all group"
                aria-label="Next star"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Dots Navigation */}
        {showDots && (
          <div className="flex justify-center gap-2 mt-8 relative z-10">
            {GOLDEN_STARS.map((star, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex 
                    ? 'w-8 h-3 bg-gradient-to-r from-[#c9a227] to-[#e8d48b]' 
                    : 'w-3 h-3 bg-[#3a3020] hover:bg-[#5c4108]'
                }`}
                aria-label={`Go to ${star.name}`}
                title={star.name}
              />
            ))}
          </div>
        )}

        {/* Counter */}
        <div className="text-center mt-4 text-[#5c4108] text-sm relative z-10">
          {currentIndex + 1} / {GOLDEN_STARS.length}
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[#c9a22730] text-xs tracking-[0.5em]">
        𓂀 𓃭 𓆣 𓇋 𓈖
      </div>
    </div>
  );
}

// Export stars data for use elsewhere
export { GOLDEN_STARS };
