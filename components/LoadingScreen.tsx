'use client';

import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  isLoading: boolean;
  message?: string;
  showQuote?: boolean;
}

const LOADING_MESSAGES = [
  'جاري تحميل الأرشيف...',
  'نستعيد ذكريات الزمن الجميل...',
  'نفتح خزائن السينما...',
  'نجهز شريط الفيلم...',
];

const QUICK_QUOTES = [
  'الصبر مفتاح الفرج',
  'اللي فات مات',
  'السينما حياة',
];

export default function LoadingScreen({ isLoading, message, showQuote = true }: LoadingScreenProps) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [reelRotation, setReelRotation] = useState(0);

  useEffect(() => {
    if (!isLoading) return;

    // Rotate messages
    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    // Animate film reel
    const reelInterval = setInterval(() => {
      setReelRotation((prev) => prev + 30);
    }, 100);

    return () => {
      clearInterval(messageInterval);
      clearInterval(reelInterval);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-[#0f0c08] flex items-center justify-center">
      {/* Background effects */}
      <div className="absolute inset-0 egyptian-pattern opacity-10" />
      <div className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(201, 162, 39, 0.1) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 text-center">
        {/* Film Reel Animation */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {/* Outer reel */}
          <div 
            className="absolute inset-0 rounded-full border-4 border-[#c9a227]"
            style={{ transform: `rotate(${reelRotation}deg)` }}
          >
            {/* Reel holes */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-4 h-4 bg-[#0f0c08] rounded-full"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${i * 45}deg) translateY(-45px) translate(-50%, -50%)`,
                }}
              />
            ))}
          </div>
          
          {/* Inner circle */}
          <div className="absolute inset-8 rounded-full bg-[#1a1612] border-2 border-[#8b7319] flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-[#c9a227]" />
          </div>
          
          {/* Film strip coming out */}
          <div className="absolute -right-16 top-1/2 -translate-y-1/2 w-20 h-8 overflow-hidden">
            <div className="h-full bg-[#2a2318] flex">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1 h-full bg-[#0f0c08] mx-1" />
              ))}
            </div>
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-[#c9a227]" style={{ fontFamily: "'Amiri', serif" }}>
            {message || LOADING_MESSAGES[currentMessage]}
          </h2>
          
          {/* Loading bar */}
          <div className="w-64 h-1 mx-auto bg-[#2a2318] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#c9a227] to-[#e8d48b] animate-pulse"
              style={{
                width: '60%',
                animation: 'loading-bar 1.5s ease-in-out infinite',
              }}
            />
          </div>

          {/* Quote */}
          {showQuote && (
            <p className="text-[#8b7319] text-sm italic mt-6">
              &ldquo;{QUICK_QUOTES[currentMessage % QUICK_QUOTES.length]}&rdquo;
            </p>
          )}
        </div>

        {/* Decorative hieroglyphs */}
        <div className="mt-8 text-[#c9a22730] text-xs tracking-[0.3em]">
          𓂀 𓃭 𓆣 𓇋 𓈖
        </div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

// Simple spinner version
export function FilmSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className={`${sizeClasses[size]} border-[#8b7319] border-t-[#c9a227] rounded-full animate-spin ${className}`} />
  );
}

