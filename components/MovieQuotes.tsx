'use client';

import { useState, useEffect } from 'react';

// Famous Egyptian Cinema Quotes
const QUOTES = [
  { quote: "أنا مش حرامي... أنا بحب الحرية", film: "باب الحديد", year: 1958, star: "يوسف شاهين" },
  { quote: "الأرض بتتكلم عربي", film: "الأرض", year: 1970, star: "محمود المليجي" },
  { quote: "احنا مش بتوع سياسة", film: "إحنا بتوع الأتوبيس", year: 1979, star: "عادل إمام" },
  { quote: "الحب حلال... والكره حرام", film: "شيء من الخوف", year: 1969, star: "شادية" },
  { quote: "أنا اللي بنيت السد", film: "الناصر صلاح الدين", year: 1963, star: "أحمد مظهر" },
  { quote: "يا واد يا تقيل", film: "غزل البنات", year: 1949, star: "نجيب الريحاني" },
  { quote: "أبوس إيدك", film: "أبي فوق الشجرة", year: 1969, star: "عبد الحليم حافظ" },
  { quote: "مصر أم الدنيا", film: "رد قلبي", year: 1957, star: "شكري سرحان" },
  { quote: "الصبر مفتاح الفرج", film: "الزوجة الثانية", year: 1967, star: "صلاح ذو الفقار" },
  { quote: "الدنيا ريشة في هوا", film: "دعاء الكروان", year: 1959, star: "فاتن حمامة" },
  { quote: "أنا عايز حقي", film: "الكرنك", year: 1975, star: "سعاد حسني" },
  { quote: "الحياة حلوة بس نفهمها", film: "النظارة السوداء", year: 1963, star: "أحمد رمزي" },
];

interface MovieQuotesProps {
  className?: string;
  autoRotate?: boolean;
  rotateInterval?: number;
  showFilmInfo?: boolean;
  variant?: 'full' | 'compact' | 'minimal';
}

export default function MovieQuotes({
  className = '',
  autoRotate = true,
  rotateInterval = 8000,
  showFilmInfo = true,
  variant = 'full',
}: MovieQuotesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Start with random quote
    setCurrentIndex(Math.floor(Math.random() * QUOTES.length));
  }, []);

  useEffect(() => {
    if (!autoRotate) return;

    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % QUOTES.length);
        setIsAnimating(false);
      }, 300);
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [autoRotate, rotateInterval]);

  const quote = QUOTES[currentIndex];

  if (variant === 'minimal') {
    return (
      <div className={`text-center ${className}`}>
        <p className={`text-[#e8d48b] italic transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          &ldquo;{quote.quote}&rdquo;
        </p>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <span className="text-[#c9a227] text-2xl">🎬</span>
        <div className={`transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <p className="text-[#e8d48b] italic">&ldquo;{quote.quote}&rdquo;</p>
          {showFilmInfo && (
            <p className="text-[#8b7319] text-xs mt-1">— {quote.film} ({quote.year})</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`vintage-card p-8 rounded-xl text-center relative overflow-hidden ${className}`}>
      {/* Background pattern */}
      <div className="absolute inset-0 egyptian-pattern opacity-5" />
      
      <div className="relative z-10">
        {/* Film reel icon */}
        <div className="text-5xl mb-4">🎬</div>
        
        {/* Quote */}
        <blockquote className={`text-2xl text-[#e8d48b] font-bold mb-4 transition-all duration-300 ${
          isAnimating ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
        }`} style={{ fontFamily: "'Amiri', serif" }}>
          &ldquo;{quote.quote}&rdquo;
        </blockquote>
        
        {/* Film info */}
        {showFilmInfo && (
          <div className={`transition-all duration-300 delay-100 ${
            isAnimating ? 'opacity-0' : 'opacity-100'
          }`}>
            <p className="text-[#c9a227] mb-1">— {quote.film} ({quote.year})</p>
            <p className="text-[#8b7319] text-sm">{quote.star}</p>
          </div>
        )}
        
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6">
          {QUOTES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex 
                  ? 'bg-[#c9a227] w-6' 
                  : 'bg-[#3a3020] hover:bg-[#5c4108]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Export quotes for use elsewhere
export { QUOTES };

