// Browser-based Text-to-Speech service for Arabic narration
// Uses Web Speech API (SpeechSynthesis)

export interface TTSOptions {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;      // 0.1 - 10, default 1
  pitch?: number;     // 0 - 2, default 1
  volume?: number;    // 0 - 1, default 1
  lang?: string;      // Language code (ar-SA, ar-EG, etc.)
}

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentParagraph: number;
  totalParagraphs: number;
  progress: number; // 0-100
}

type TTSStateCallback = (state: TTSState) => void;
type TTSParagraphCallback = (index: number, text: string) => void;

const DEFAULT_OPTIONS: TTSOptions = {
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: 'ar-SA',
};

/**
 * Text-to-Speech Controller class
 */
export class TTSController {
  private synth: SpeechSynthesis | null = null;
  private utterances: SpeechSynthesisUtterance[] = [];
  private currentIndex: number = 0;
  private options: TTSOptions;
  private stateCallback?: TTSStateCallback;
  private paragraphCallback?: TTSParagraphCallback;
  private _isPlaying: boolean = false;
  private _isPaused: boolean = false;

  constructor(options: TTSOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  /**
   * Check if TTS is supported
   */
  isSupported(): boolean {
    return this.synth !== null;
  }

  /**
   * Get available Arabic voices
   */
  getArabicVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    
    const voices = this.synth.getVoices();
    return voices.filter(voice => 
      voice.lang.startsWith('ar') || 
      voice.lang.includes('Arabic')
    );
  }

  /**
   * Get all available voices
   */
  getAllVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  /**
   * Get best Arabic voice
   */
  getBestArabicVoice(): SpeechSynthesisVoice | null {
    const arabicVoices = this.getArabicVoices();
    
    // Prefer Egyptian Arabic, then Saudi, then any Arabic
    const preferredLangs = ['ar-EG', 'ar-SA', 'ar'];
    
    for (const lang of preferredLangs) {
      const voice = arabicVoices.find(v => v.lang === lang);
      if (voice) return voice;
    }
    
    return arabicVoices[0] || null;
  }

  /**
   * Set callback for state changes
   */
  onStateChange(callback: TTSStateCallback): void {
    this.stateCallback = callback;
  }

  /**
   * Set callback for paragraph changes
   */
  onParagraphChange(callback: TTSParagraphCallback): void {
    this.paragraphCallback = callback;
  }

  /**
   * Split text into paragraphs for chunked reading
   */
  private splitIntoParagraphs(text: string): string[] {
    // Split by double newlines, periods followed by newlines, or long sentences
    const paragraphs = text
      .split(/\n\n+|\n(?=[^a-zA-Z\u0600-\u06FF])|(?<=[.!?؟،])\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    // Further split very long paragraphs (over 500 chars)
    const result: string[] = [];
    for (const para of paragraphs) {
      if (para.length > 500) {
        // Split at sentence boundaries
        const sentences = para.split(/(?<=[.!?؟])\s+/);
        let chunk = '';
        for (const sentence of sentences) {
          if (chunk.length + sentence.length > 400) {
            if (chunk) result.push(chunk.trim());
            chunk = sentence;
          } else {
            chunk += ' ' + sentence;
          }
        }
        if (chunk) result.push(chunk.trim());
      } else {
        result.push(para);
      }
    }
    
    return result;
  }

  /**
   * Prepare text for reading
   */
  prepare(text: string): void {
    if (!this.synth) return;
    
    this.stop();
    this.utterances = [];
    this.currentIndex = 0;
    
    const paragraphs = this.splitIntoParagraphs(text);
    const voice = this.options.voice || this.getBestArabicVoice();
    
    for (const para of paragraphs) {
      const utterance = new SpeechSynthesisUtterance(para);
      
      if (voice) utterance.voice = voice;
      utterance.lang = this.options.lang || 'ar-SA';
      utterance.rate = this.options.rate || 1;
      utterance.pitch = this.options.pitch || 1;
      utterance.volume = this.options.volume || 1;
      
      this.utterances.push(utterance);
    }
    
    this.updateState();
  }

  /**
   * Start or resume reading
   */
  play(): void {
    if (!this.synth || this.utterances.length === 0) return;
    
    if (this._isPaused) {
      this.synth.resume();
      this._isPaused = false;
      this._isPlaying = true;
      this.updateState();
      return;
    }
    
    this._isPlaying = true;
    this._isPaused = false;
    this.speakCurrent();
  }

  /**
   * Pause reading
   */
  pause(): void {
    if (!this.synth || !this._isPlaying) return;
    
    this.synth.pause();
    this._isPaused = true;
    this._isPlaying = false;
    this.updateState();
  }

  /**
   * Stop reading
   */
  stop(): void {
    if (!this.synth) return;
    
    this.synth.cancel();
    this._isPlaying = false;
    this._isPaused = false;
    this.currentIndex = 0;
    this.updateState();
  }

  /**
   * Skip to next paragraph
   */
  next(): void {
    if (!this.synth || this.currentIndex >= this.utterances.length - 1) return;
    
    this.synth.cancel();
    this.currentIndex++;
    
    if (this._isPlaying) {
      this.speakCurrent();
    } else {
      this.updateState();
    }
  }

  /**
   * Go to previous paragraph
   */
  previous(): void {
    if (!this.synth || this.currentIndex <= 0) return;
    
    this.synth.cancel();
    this.currentIndex--;
    
    if (this._isPlaying) {
      this.speakCurrent();
    } else {
      this.updateState();
    }
  }

  /**
   * Jump to specific paragraph
   */
  goTo(index: number): void {
    if (!this.synth || index < 0 || index >= this.utterances.length) return;
    
    this.synth.cancel();
    this.currentIndex = index;
    
    if (this._isPlaying) {
      this.speakCurrent();
    } else {
      this.updateState();
    }
  }

  /**
   * Set playback rate
   */
  setRate(rate: number): void {
    this.options.rate = Math.max(0.1, Math.min(10, rate));
    
    // Update current and future utterances
    for (let i = this.currentIndex; i < this.utterances.length; i++) {
      this.utterances[i].rate = this.options.rate;
    }
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.options.volume = Math.max(0, Math.min(1, volume));
    
    for (let i = this.currentIndex; i < this.utterances.length; i++) {
      this.utterances[i].volume = this.options.volume;
    }
  }

  /**
   * Get current state
   */
  getState(): TTSState {
    return {
      isPlaying: this._isPlaying,
      isPaused: this._isPaused,
      currentParagraph: this.currentIndex,
      totalParagraphs: this.utterances.length,
      progress: this.utterances.length > 0 
        ? Math.round((this.currentIndex / this.utterances.length) * 100) 
        : 0,
    };
  }

  /**
   * Get current paragraph text
   */
  getCurrentText(): string {
    if (this.currentIndex < this.utterances.length) {
      return this.utterances[this.currentIndex].text;
    }
    return '';
  }

  /**
   * Internal: speak current paragraph
   */
  private speakCurrent(): void {
    if (!this.synth || this.currentIndex >= this.utterances.length) {
      this._isPlaying = false;
      this.updateState();
      return;
    }
    
    const utterance = this.utterances[this.currentIndex];
    
    // Notify paragraph change
    this.paragraphCallback?.(this.currentIndex, utterance.text);
    
    utterance.onend = () => {
      this.currentIndex++;
      if (this.currentIndex < this.utterances.length && this._isPlaying) {
        this.speakCurrent();
      } else {
        this._isPlaying = false;
        this.updateState();
      }
    };
    
    utterance.onerror = (event) => {
      console.error('TTS Error:', event.error);
      this._isPlaying = false;
      this.updateState();
    };
    
    this.synth.speak(utterance);
    this.updateState();
  }

  /**
   * Internal: update state and notify callback
   */
  private updateState(): void {
    this.stateCallback?.(this.getState());
  }
}

/**
 * Create a new TTS controller instance
 */
export function createTTSController(options?: TTSOptions): TTSController {
  return new TTSController(options);
}

/**
 * Check if browser supports Web Speech API
 */
export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Wait for voices to be loaded (they load asynchronously)
 */
export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    
    const synth = window.speechSynthesis;
    let voices = synth.getVoices();
    
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    
    // Voices load asynchronously in some browsers
    synth.onvoiceschanged = () => {
      voices = synth.getVoices();
      resolve(voices);
    };
    
    // Fallback timeout
    setTimeout(() => {
      resolve(synth.getVoices());
    }, 1000);
  });
}

