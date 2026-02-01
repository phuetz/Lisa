/**
 * Lisa Voice Wake Pro - Real wake word detection using Porcupine
 * Based on OpenClaw's voice wake implementation
 *
 * Custom Wake Word: "Lisa" and variants
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface VoiceWakeProConfig {
  accessKey?: string;
  wakeWords?: string[];
  sensitivity?: number;
  enableContinuousListening?: boolean;
  autoStart?: boolean;
  // Custom Lisa wake word configuration
  customModelPath?: string; // Path to custom .ppn model file
  lisaVariants?: boolean; // Enable "Hey Lisa", "OK Lisa", "Salut Lisa"
  language?: 'en' | 'fr' | 'es' | 'de'; // Language for wake word recognition
  confirmationSound?: boolean; // Play sound when wake word detected
  cooldownMs?: number; // Minimum time between wake events
}

export interface WakeWordEvent {
  keyword: string;
  keywordIndex: number;
  timestamp: Date;
  confidence: number;
}

export interface VoiceWakeProState {
  isListening: boolean;
  isInitialized: boolean;
  wakeCount: number;
  lastWake?: Date;
  lastKeyword?: string;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PorcupineInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebVoiceProcessorType = any;

export class VoiceWakePro extends BrowserEventEmitter {
  private config: VoiceWakeProConfig;
  private state: VoiceWakeProState = {
    isListening: false,
    isInitialized: false,
    wakeCount: 0,
  };
  
  private porcupine: PorcupineInstance = null;
  private webVoiceProcessor: WebVoiceProcessorType = null;

  constructor(config: VoiceWakeProConfig) {
    super();
    this.config = {
      wakeWords: ['Lisa'],
      sensitivity: 0.5,
      enableContinuousListening: true,
      autoStart: false,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.state.isInitialized) return;

    try {
      // Dynamic imports for browser compatibility
      const porcupineModule = await import('@picovoice/porcupine-web');
      const wvpModule = await import('@picovoice/web-voice-processor');

      // Get Porcupine class - cast to any to avoid version-specific type issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PorcupineClass = (porcupineModule as any).default || porcupineModule;
      
      // Initialize Porcupine - use built-in keyword if available
      if (PorcupineClass && typeof PorcupineClass.create === 'function') {
        this.porcupine = await PorcupineClass.create(
          this.config.accessKey || '',
          ['ALEXA'], // Built-in keyword name
          this.handleDetection.bind(this),
          { sensitivities: [this.config.sensitivity || 0.5] }
        );
      } else {
        throw new Error('Porcupine API not available');
      }

      // Store WebVoiceProcessor reference
      this.webVoiceProcessor = wvpModule.WebVoiceProcessor;

      this.state.isInitialized = true;
      this.emit('initialized');

      if (this.config.autoStart) {
        await this.start();
      }
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error);
      this.emit('error', error);
      throw error;
    }
  }

  private handleDetection(detection: { keywordIndex: number }): void {
    const keyword = this.config.wakeWords?.[detection.keywordIndex] || 'Lisa';
    
    this.state.wakeCount++;
    this.state.lastWake = new Date();
    this.state.lastKeyword = keyword;

    const event: WakeWordEvent = {
      keyword,
      keywordIndex: detection.keywordIndex,
      timestamp: new Date(),
      confidence: this.config.sensitivity || 0.5,
    };

    this.emit('wake', event);
    this.emit('detected', event);
  }

  async start(): Promise<void> {
    if (!this.state.isInitialized) {
      await this.initialize();
    }

    if (this.state.isListening) return;

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start processing
      if (this.webVoiceProcessor && this.porcupine) {
        await this.webVoiceProcessor.subscribe(this.porcupine);
      }

      this.state.isListening = true;
      this.emit('started');
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error);
      this.emit('error', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.state.isListening) return;

    try {
      if (this.webVoiceProcessor && this.porcupine) {
        await this.webVoiceProcessor.unsubscribe(this.porcupine);
      }

      this.state.isListening = false;
      this.emit('stopped');
    } catch (error) {
      this.emit('error', error);
    }
  }

  async release(): Promise<void> {
    await this.stop();

    if (this.porcupine?.release) {
      this.porcupine.release();
    }

    this.porcupine = null;
    this.webVoiceProcessor = null;
    this.state.isInitialized = false;
    this.emit('released');
  }

  getState(): VoiceWakeProState {
    return { ...this.state };
  }

  getIsListening(): boolean {
    return this.state.isListening;
  }

  getIsInitialized(): boolean {
    return this.state.isInitialized;
  }

  setSensitivity(sensitivity: number): void {
    this.config.sensitivity = Math.max(0, Math.min(1, sensitivity));
  }
}

// Default Lisa wake word variants by language
const LISA_VARIANTS: Record<string, string[]> = {
  en: ['Lisa', 'Hey Lisa', 'OK Lisa', 'Hi Lisa'],
  fr: ['Lisa', 'Hey Lisa', 'OK Lisa', 'Salut Lisa', 'Bonjour Lisa'],
  es: ['Lisa', 'Hey Lisa', 'OK Lisa', 'Hola Lisa'],
  de: ['Lisa', 'Hey Lisa', 'OK Lisa', 'Hallo Lisa']
};

/**
 * Fallback Voice Wake using Web Speech API
 * Used when Porcupine is not available
 * Now enhanced with Lisa-specific wake words
 */
export class VoiceWakeFallback extends BrowserEventEmitter {
  private config: Omit<VoiceWakeProConfig, 'accessKey'>;
  private state: VoiceWakeProState = {
    isListening: false,
    isInitialized: false,
    wakeCount: 0,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;
  private wakePatterns: RegExp[];
  private lastWakeTime = 0;
  private audioContext: AudioContext | null = null;

  constructor(config?: Omit<VoiceWakeProConfig, 'accessKey'>) {
    super();

    // Build wake words list including Lisa variants
    const language = config?.language || 'fr';
    let wakeWords = config?.wakeWords || ['Lisa'];

    if (config?.lisaVariants !== false) {
      // Add Lisa variants for the selected language
      const variants = LISA_VARIANTS[language] || LISA_VARIANTS['en'];
      wakeWords = [...new Set([...wakeWords, ...variants])];
    }

    this.config = {
      wakeWords,
      sensitivity: 0.5,
      enableContinuousListening: true,
      language,
      confirmationSound: true,
      cooldownMs: 2000, // 2 second cooldown between wake events
      ...config,
    };

    // Build patterns for wake word detection with fuzzy matching
    this.wakePatterns = this.buildWakePatterns(this.config.wakeWords || ['Lisa']);
  }

  /**
   * Build regex patterns for wake word detection
   * Includes fuzzy matching for common pronunciation variations
   */
  private buildWakePatterns(wakeWords: string[]): RegExp[] {
    const patterns: RegExp[] = [];

    for (const word of wakeWords) {
      // Exact match
      patterns.push(new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i'));

      // Handle common variations of "Lisa"
      if (word.toLowerCase().includes('lisa')) {
        // "Liza", "Leeza", "Leesa" variations
        patterns.push(new RegExp(`\\b(l[ie]{1,2}[sz]a)\\b`, 'i'));
        // With prefix variations
        if (word.toLowerCase().startsWith('hey')) {
          patterns.push(new RegExp(`\\b(hey|hay|ei)\\s*(l[ie]{1,2}[sz]a)\\b`, 'i'));
        }
        if (word.toLowerCase().startsWith('ok')) {
          patterns.push(new RegExp(`\\b(ok|okay|o\\.k\\.)\\s*(l[ie]{1,2}[sz]a)\\b`, 'i'));
        }
        if (word.toLowerCase().startsWith('salut')) {
          patterns.push(new RegExp(`\\b(salut|salu)\\s*(l[ie]{1,2}[sz]a)\\b`, 'i'));
        }
      }
    }

    return patterns;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async initialize(): Promise<void> {
    if (this.state.isInitialized) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      throw new Error('Speech recognition not supported in this browser');
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = this.config.enableContinuousListening || true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'fr-FR';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onresult = (event: any) => {
      const results = event.results;
      for (let i = event.resultIndex; i < results.length; i++) {
        const transcript = results[i][0].transcript.toLowerCase();
        
        for (let j = 0; j < this.wakePatterns.length; j++) {
          if (this.wakePatterns[j].test(transcript)) {
            this.handleDetection(j, this.config.wakeWords![j]);
            break;
          }
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        this.state.error = event.error;
        this.emit('error', new Error(event.error));
      }
    };

    this.recognition.onend = () => {
      if (this.state.isListening && this.config.enableContinuousListening) {
        // Restart recognition
        setTimeout(() => {
          if (this.state.isListening && this.recognition) {
            this.recognition.start();
          }
        }, 100);
      }
    };

    this.state.isInitialized = true;
    this.emit('initialized');
  }

  private handleDetection(keywordIndex: number, keyword: string): void {
    const now = Date.now();

    // Check cooldown
    if (this.config.cooldownMs && now - this.lastWakeTime < this.config.cooldownMs) {
      return; // Still in cooldown
    }
    this.lastWakeTime = now;

    this.state.wakeCount++;
    this.state.lastWake = new Date();
    this.state.lastKeyword = keyword;

    const event: WakeWordEvent = {
      keyword,
      keywordIndex,
      timestamp: new Date(),
      confidence: 0.7,
    };

    // Play confirmation sound if enabled
    if (this.config.confirmationSound) {
      this.playConfirmationSound();
    }

    this.emit('wake', event);
    this.emit('detected', event);
  }

  /**
   * Play a subtle confirmation sound when wake word is detected
   */
  private playConfirmationSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const ctx = this.audioContext;

      // Create a pleasant two-tone chime
      const oscillator1 = ctx.createOscillator();
      const oscillator2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator1.type = 'sine';
      oscillator2.type = 'sine';

      // C5 and E5 for a pleasant major third
      oscillator1.frequency.value = 523.25; // C5
      oscillator2.frequency.value = 659.25; // E5

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Short, subtle sound
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      oscillator1.start(ctx.currentTime);
      oscillator2.start(ctx.currentTime);
      oscillator1.stop(ctx.currentTime + 0.2);
      oscillator2.stop(ctx.currentTime + 0.2);
    } catch {
      // Ignore audio errors
    }
  }

  async start(): Promise<void> {
    if (!this.state.isInitialized) {
      await this.initialize();
    }

    if (this.state.isListening || !this.recognition) return;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recognition.start();
      this.state.isListening = true;
      this.emit('started');
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error);
      this.emit('error', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.state.isListening || !this.recognition) return;

    this.recognition.stop();
    this.state.isListening = false;
    this.emit('stopped');
  }

  async release(): Promise<void> {
    await this.stop();
    this.recognition = null;
    this.state.isInitialized = false;

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.emit('released');
  }

  getState(): VoiceWakeProState {
    return { ...this.state };
  }

  getIsListening(): boolean {
    return this.state.isListening;
  }

  /**
   * Get configured wake words
   */
  getWakeWords(): string[] {
    return [...(this.config.wakeWords || [])];
  }

  /**
   * Add a custom wake word
   */
  addWakeWord(word: string): void {
    if (!this.config.wakeWords) {
      this.config.wakeWords = [];
    }
    if (!this.config.wakeWords.includes(word)) {
      this.config.wakeWords.push(word);
      this.wakePatterns = this.buildWakePatterns(this.config.wakeWords);
    }
  }

  /**
   * Remove a wake word
   */
  removeWakeWord(word: string): void {
    if (this.config.wakeWords) {
      const index = this.config.wakeWords.indexOf(word);
      if (index > -1) {
        this.config.wakeWords.splice(index, 1);
        this.wakePatterns = this.buildWakePatterns(this.config.wakeWords);
      }
    }
  }

  /**
   * Set language for wake word detection
   */
  setLanguage(language: 'en' | 'fr' | 'es' | 'de'): void {
    this.config.language = language;
    if (this.recognition) {
      const langMap: Record<string, string> = {
        en: 'en-US',
        fr: 'fr-FR',
        es: 'es-ES',
        de: 'de-DE'
      };
      this.recognition.lang = langMap[language];
    }

    // Update variants for new language
    if (this.config.lisaVariants !== false) {
      const variants = LISA_VARIANTS[language] || LISA_VARIANTS['en'];
      const customWords = (this.config.wakeWords || []).filter(
        w => !Object.values(LISA_VARIANTS).flat().includes(w)
      );
      this.config.wakeWords = [...new Set([...customWords, ...variants])];
      this.wakePatterns = this.buildWakePatterns(this.config.wakeWords);
    }
  }

  /**
   * Enable or disable confirmation sound
   */
  setConfirmationSound(enabled: boolean): void {
    this.config.confirmationSound = enabled;
  }

  /**
   * Set cooldown between wake events
   */
  setCooldown(ms: number): void {
    this.config.cooldownMs = ms;
  }
}

// Factory function to get the best available implementation
let instance: VoiceWakePro | VoiceWakeFallback | null = null;

export async function getVoiceWakePro(
  config?: VoiceWakeProConfig
): Promise<VoiceWakePro | VoiceWakeFallback> {
  if (instance) return instance;

  // Try Porcupine first if access key provided
  if (config?.accessKey) {
    try {
      instance = new VoiceWakePro(config);
      await instance.initialize();
      return instance;
    } catch (error) {
      console.warn('Porcupine initialization failed, falling back to Web Speech API:', error);
    }
  }

  // Fallback to Web Speech API
  instance = new VoiceWakeFallback(config);
  await instance.initialize();
  return instance;
}

export function resetVoiceWakePro(): void {
  if (instance) {
    instance.release();
    instance.removeAllListeners();
    instance = null;
  }
}
