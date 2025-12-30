'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentParagraph: number;
  totalParagraphs: number;
  progress: number;
}

interface AudioNarrationProps {
  text: string;
  language?: 'ar' | 'en';
  onParagraphChange?: (index: number) => void;
  className?: string;
}

export default function AudioNarration({
  text,
  language = 'ar',
  onParagraphChange,
  className = '',
}: AudioNarrationProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isPaused: false,
    currentParagraph: 0,
    totalParagraphs: 0,
    progress: 0,
  });
  const [rate, setRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [hasArabicVoice, setHasArabicVoice] = useState(true);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentIndexRef = useRef(0);
  const isPlayingRef = useRef(false);

  const texts = {
    listen: { ar: 'استمع للمقال', en: 'Listen to Article' },
    play: { ar: 'تشغيل', en: 'Play' },
    pause: { ar: 'إيقاف مؤقت', en: 'Pause' },
    stop: { ar: 'إيقاف', en: 'Stop' },
    previous: { ar: 'السابق', en: 'Previous' },
    next: { ar: 'التالي', en: 'Next' },
    speed: { ar: 'السرعة', en: 'Speed' },
    voice: { ar: 'الصوت', en: 'Voice' },
    settings: { ar: 'الإعدادات', en: 'Settings' },
    notSupported: { ar: 'متصفحك لا يدعم القراءة الصوتية', en: 'Your browser does not support text-to-speech' },
    paragraph: { ar: 'فقرة', en: 'Paragraph' },
    of: { ar: 'من', en: 'of' },
    accessibility: { ar: 'اضغط مسافة للتشغيل/الإيقاف، الأسهم للتنقل', en: 'Press Space to play/pause, arrows to navigate' },
    noArabicVoice: { 
      ar: '⚠️ لم يتم العثور على صوت عربي. يرجى تثبيت حزمة اللغة العربية من إعدادات ويندوز', 
      en: '⚠️ No Arabic voice found. Please install Arabic language pack from Windows Settings → Language' 
    },
  };

  const t = (key: keyof typeof texts) => texts[key][language];

  // Split text into paragraphs
  const splitIntoParagraphs = useCallback((inputText: string): string[] => {
    const paras = inputText
      .split(/\n\n+|\n(?=[\u0600-\u06FF])|(?<=[.!?؟،])\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 10); // Filter out very short segments
    
    // Further split very long paragraphs
    const result: string[] = [];
    for (const para of paras) {
      if (para.length > 500) {
        const sentences = para.split(/(?<=[.!?؟])\s+/);
        let chunk = '';
        for (const sentence of sentences) {
          if (chunk.length + sentence.length > 400 && chunk) {
            result.push(chunk.trim());
            chunk = sentence;
          } else {
            chunk += ' ' + sentence;
          }
        }
        if (chunk.trim()) result.push(chunk.trim());
      } else {
        result.push(para);
      }
    }
    
    return result.length > 0 ? result : [inputText.substring(0, 500)];
  }, []);

  // Initialize TTS
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    synthRef.current = window.speechSynthesis;

    // Load voices
    const loadVoices = () => {
      const availableVoices = synthRef.current?.getVoices() || [];
      setAllVoices(availableVoices);
      
      const arabicVoices = availableVoices.filter(v => v.lang.startsWith('ar'));
      setHasArabicVoice(arabicVoices.length > 0);
      
      // Show Arabic voices first, then all others
      const sortedVoices = [
        ...arabicVoices,
        ...availableVoices.filter(v => !v.lang.startsWith('ar'))
      ];
      setVoices(sortedVoices);
      
      // Auto-select first Arabic voice if available
      if (arabicVoices.length > 0 && !selectedVoiceURI) {
        setSelectedVoiceURI(arabicVoices[0].voiceURI);
      }
    };

    loadVoices();
    
    // Voices might load asynchronously
    if (synthRef.current) {
      synthRef.current.onvoiceschanged = loadVoices;
    }

    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  // Prepare paragraphs when text changes
  useEffect(() => {
    if (text) {
      const paras = splitIntoParagraphs(text);
      setParagraphs(paras);
      currentIndexRef.current = 0;
      setState(prev => ({
        ...prev,
        currentParagraph: 0,
        totalParagraphs: paras.length,
        progress: 0,
      }));
    }
  }, [text, splitIntoParagraphs]);

  const updateState = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentParagraph: currentIndexRef.current,
      progress: paragraphs.length > 0 
        ? Math.round((currentIndexRef.current / paragraphs.length) * 100) 
        : 0,
    }));
  }, [paragraphs.length]);

  const speakParagraph = useCallback((index: number) => {
    if (!synthRef.current || index >= paragraphs.length) {
      isPlayingRef.current = false;
      setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(paragraphs[index]);
    utterance.lang = language === 'ar' ? 'ar-SA' : 'en-US';
    utterance.rate = rate;
    
    // Set voice if selected
    if (selectedVoiceURI && voices.length > 0) {
      const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (voice) utterance.voice = voice;
    } else {
      // Try to find an Arabic voice
      const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
      if (arabicVoice) utterance.voice = arabicVoice;
    }

    utterance.onstart = () => {
      currentIndexRef.current = index;
      onParagraphChange?.(index);
      updateState();
    };

    utterance.onend = () => {
      if (isPlayingRef.current && index < paragraphs.length - 1) {
        speakParagraph(index + 1);
      } else {
        isPlayingRef.current = false;
        setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
      }
    };

    utterance.onerror = (event) => {
      console.error('TTS Error:', event.error);
      isPlayingRef.current = false;
      setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
    };

    synthRef.current.speak(utterance);
  }, [paragraphs, language, rate, selectedVoiceURI, voices, onParagraphChange, updateState]);

  const play = useCallback(() => {
    if (!synthRef.current || paragraphs.length === 0) return;

    if (state.isPaused) {
      synthRef.current.resume();
      setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
    } else {
      isPlayingRef.current = true;
      setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
      speakParagraph(currentIndexRef.current);
    }
  }, [paragraphs.length, state.isPaused, speakParagraph]);

  const pause = useCallback(() => {
    if (!synthRef.current) return;
    synthRef.current.pause();
    setState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
  }, []);

  const stop = useCallback(() => {
    if (!synthRef.current) return;
    isPlayingRef.current = false;
    synthRef.current.cancel();
    currentIndexRef.current = 0;
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentParagraph: 0,
      progress: 0,
    }));
  }, []);

  const previous = useCallback(() => {
    if (currentIndexRef.current <= 0) return;
    synthRef.current?.cancel();
    currentIndexRef.current = Math.max(0, currentIndexRef.current - 1);
    updateState();
    if (isPlayingRef.current) {
      speakParagraph(currentIndexRef.current);
    }
  }, [updateState, speakParagraph]);

  const next = useCallback(() => {
    if (currentIndexRef.current >= paragraphs.length - 1) return;
    synthRef.current?.cancel();
    currentIndexRef.current = Math.min(paragraphs.length - 1, currentIndexRef.current + 1);
    updateState();
    if (isPlayingRef.current) {
      speakParagraph(currentIndexRef.current);
    }
  }, [paragraphs.length, updateState, speakParagraph]);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, pause, play]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          language === 'ar' ? next() : previous();
          break;
        case 'ArrowRight':
          language === 'ar' ? previous() : next();
          break;
        case 'Escape':
          stop();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [language, togglePlayPause, next, previous, stop]);

  if (!isSupported) {
    return (
      <div className={`p-4 bg-[#2a2318] rounded-lg border border-[#3a3020] text-center ${className}`}>
        <p className="text-[#7a6545] text-sm">{t('notSupported')}</p>
      </div>
    );
  }

  return (
    <div 
      className={`bg-[#2a2318] rounded-xl border border-[#3a3020] ${className}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      role="region"
      aria-label={t('listen')}
    >
      {/* Header */}
      <div className="p-3 border-b border-[#3a3020] flex items-center justify-between">
        <h3 className="font-bold text-[#d4a012] flex items-center gap-2 text-sm">
          <span className="text-lg">🎧</span>
          {t('listen')}
        </h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 rounded-lg hover:bg-[#3a3020] transition-colors"
          aria-label={t('settings')}
        >
          <svg className="w-5 h-5 text-[#7a6545]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between text-xs text-[#7a6545] mb-1">
          <span>
            {t('paragraph')} {state.currentParagraph + 1} {t('of')} {state.totalParagraphs}
          </span>
          <span>{state.progress}%</span>
        </div>
        <div className="h-1.5 bg-[#1a1510] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#d4a012] rounded-full transition-all duration-300"
            style={{ width: `${state.progress}%` }}
            role="progressbar"
            aria-valuenow={state.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Arabic Voice Warning */}
      {!hasArabicVoice && language === 'ar' && (
        <div className="mx-3 mb-2 p-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
          <p className="text-xs text-yellow-500 text-center">{t('noArabicVoice')}</p>
        </div>
      )}

      {/* Controls */}
      <div className="p-3 flex items-center justify-center gap-2">
        {/* Previous */}
        <button
          onClick={previous}
          disabled={state.currentParagraph === 0}
          className="p-2 rounded-full hover:bg-[#3a3020] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={t('previous')}
        >
          <svg className="w-5 h-5 text-[#d4c4a8]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlayPause}
          disabled={paragraphs.length === 0}
          className="p-3 rounded-full bg-[#d4a012] hover:bg-[#e4b022] transition-colors disabled:opacity-50"
          aria-label={state.isPlaying ? t('pause') : t('play')}
        >
          {state.isPlaying ? (
            <svg className="w-6 h-6 text-[#1a1510]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-[#1a1510]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Stop */}
        <button
          onClick={stop}
          disabled={!state.isPlaying && !state.isPaused}
          className="p-2 rounded-full hover:bg-[#3a3020] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={t('stop')}
        >
          <svg className="w-5 h-5 text-[#d4c4a8]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z" />
          </svg>
        </button>

        {/* Next */}
        <button
          onClick={next}
          disabled={state.currentParagraph >= state.totalParagraphs - 1}
          className="p-2 rounded-full hover:bg-[#3a3020] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={t('next')}
        >
          <svg className="w-5 h-5 text-[#d4c4a8]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-3 border-t border-[#3a3020] space-y-3">
          {/* Speed Control */}
          <div>
            <label className="block text-xs text-[#7a6545] mb-1">
              {t('speed')}: {rate}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.25"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#1a1510] rounded-lg appearance-none cursor-pointer accent-[#d4a012]"
              aria-label={t('speed')}
            />
            <div className="flex justify-between text-xs text-[#5a4530] mt-1">
              <span>0.5x</span>
              <span>1x</span>
              <span>1.5x</span>
              <span>2x</span>
            </div>
          </div>

          {/* Voice Selection */}
          {voices.length > 0 && (
            <div>
              <label className="block text-xs text-[#7a6545] mb-1">{t('voice')}</label>
              <select
                value={selectedVoiceURI}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] focus:border-[#d4a012] focus:outline-none"
              >
                <option value="">Default</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Accessibility Hint */}
      <div className="px-3 pb-2">
        <p className="text-xs text-[#5a4530] text-center" aria-hidden="true">
          {t('accessibility')}
        </p>
      </div>

      {/* Screen Reader Status */}
      <div className="sr-only" role="status" aria-live="polite">
        {state.isPlaying && `Playing paragraph ${state.currentParagraph + 1} of ${state.totalParagraphs}`}
        {state.isPaused && 'Paused'}
      </div>
    </div>
  );
}
