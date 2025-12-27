'use client';

import { useCallback, useRef, useEffect, useState } from 'react';

type SoundType = 'projector' | 'typewriter' | 'click' | 'success' | 'bell' | 'filmStart';

// Sound URLs (using Web Audio API to generate sounds)
const createAudioContext = () => {
  if (typeof window === 'undefined') return null;
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
};

export function useCinemaSound() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Check localStorage for sound preference
    if (typeof window !== 'undefined') {
      const savedEnabled = localStorage.getItem('cinema-sound-enabled');
      const savedVolume = localStorage.getItem('cinema-sound-volume');
      if (savedEnabled !== null) setIsEnabled(savedEnabled === 'true');
      if (savedVolume !== null) setVolume(parseFloat(savedVolume));
    }
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Generate different sounds using Web Audio API
  const playSound = useCallback((type: SoundType) => {
    if (!isEnabled) return;
    
    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume context if suspended (required by browsers)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    gainNode.gain.value = volume;

    const now = ctx.currentTime;

    switch (type) {
      case 'projector':
        // Projector clicking sound
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(100, now);
        gainNode.gain.setValueAtTime(volume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
        break;

      case 'typewriter':
        // Typewriter key press
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.02);
        gainNode.gain.setValueAtTime(volume * 0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
        break;

      case 'click':
        // Simple click
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, now);
        gainNode.gain.setValueAtTime(volume * 0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
        oscillator.start(now);
        oscillator.stop(now + 0.03);
        break;

      case 'success':
        // Success chime
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gainNode.gain.setValueAtTime(volume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
        break;

      case 'bell':
        // Cinema bell
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, now);
        gainNode.gain.setValueAtTime(volume * 0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.5);
        break;

      case 'filmStart':
        // Film projector start sequence
        const playProjectorSequence = () => {
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.type = 'square';
              osc.frequency.setValueAtTime(100 + i * 20, ctx.currentTime);
              gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
              osc.start();
              osc.stop(ctx.currentTime + 0.08);
            }, i * 100);
          }
        };
        playProjectorSequence();
        return;
    }
  }, [isEnabled, volume, getAudioContext]);

  const toggleSound = useCallback(() => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cinema-sound-enabled', String(newEnabled));
    }
    if (newEnabled) {
      playSound('click');
    }
  }, [isEnabled, playSound]);

  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cinema-sound-volume', String(newVolume));
    }
  }, []);

  return {
    isEnabled,
    volume,
    playSound,
    toggleSound,
    setVolume: updateVolume,
  };
}

// Sound toggle button component
export function SoundToggle() {
  const { isEnabled, toggleSound, volume, setVolume } = useCinemaSound();
  const [showVolume, setShowVolume] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={toggleSound}
        onMouseEnter={() => setShowVolume(true)}
        onMouseLeave={() => setShowVolume(false)}
        className={`p-2 rounded-lg transition-all ${
          isEnabled 
            ? 'bg-[#c9a227] text-[#1a1612]' 
            : 'bg-[#2a2318] text-[#8b7319] hover:text-[#c9a227]'
        }`}
        title={isEnabled ? 'إيقاف الصوت' : 'تشغيل الصوت'}
      >
        {isEnabled ? '🔊' : '🔇'}
      </button>
      
      {/* Volume slider */}
      {showVolume && isEnabled && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 vintage-card rounded-lg">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 bg-[#3a3020] rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}

