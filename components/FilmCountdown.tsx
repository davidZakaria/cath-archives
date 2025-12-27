'use client';

import { useState, useEffect } from 'react';

interface FilmCountdownProps {
  onComplete: () => void;
  duration?: number;
}

export default function FilmCountdown({ onComplete, duration = 3000 }: FilmCountdownProps) {
  const [count, setCount] = useState(5);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), duration / 5);
      return () => clearTimeout(timer);
    } else {
      const fadeTimer = setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 500);
      return () => clearTimeout(fadeTimer);
    }
  }, [count, duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-[#0f0c08] flex items-center justify-center transition-opacity duration-500 ${
        count === 0 ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Film grain */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* Film sprocket holes */}
      <div className="absolute top-0 bottom-0 left-8 w-8 flex flex-col justify-around">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="w-6 h-6 bg-[#1a1612] rounded border border-[#3a3020]" />
        ))}
      </div>
      <div className="absolute top-0 bottom-0 right-8 w-8 flex flex-col justify-around">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="w-6 h-6 bg-[#1a1612] rounded border border-[#3a3020]" />
        ))}
      </div>

      {/* Center content */}
      <div className="relative">
        {/* Countdown circle */}
        <div className="relative w-64 h-64">
          {/* Outer ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#3a3020"
              strokeWidth="2"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#c9a227"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(count / 5) * 283} 283`}
              className="transition-all duration-500"
            />
          </svg>
          
          {/* Inner content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {count > 0 ? (
              <>
                <div 
                  className="text-9xl font-bold text-[#c9a227] animate-pulse"
                  style={{ 
                    textShadow: '0 0 30px rgba(201, 162, 39, 0.5), 0 0 60px rgba(201, 162, 39, 0.3)',
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {count}
                </div>
              </>
            ) : (
              <div className="text-6xl">🎬</div>
            )}
          </div>
        </div>

        {/* Logo */}
        <div className="mt-8 text-center">
          <p className="text-[#c9a227] text-2xl font-bold arabic-title">سينما زمان</p>
          <p className="text-[#8b7319] text-sm tracking-widest">CINEMA ZAMAN</p>
        </div>

        {/* Decorative hieroglyphs */}
        <div className="mt-6 text-[#c9a22740] text-sm tracking-[0.5em] text-center">
          𓂀 𓃭 𓆣 𓇋 𓈖 𓊪
        </div>
      </div>

      {/* Corner film marks */}
      <div className="absolute top-8 left-20 text-[#c9a227] text-2xl">◢</div>
      <div className="absolute top-8 right-20 text-[#c9a227] text-2xl">◣</div>
      <div className="absolute bottom-8 left-20 text-[#c9a227] text-2xl">◥</div>
      <div className="absolute bottom-8 right-20 text-[#c9a227] text-2xl">◤</div>
    </div>
  );
}

