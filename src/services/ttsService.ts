/**
 * Text-to-Speech Service
 * Fait parler Lisa avec la synthèse vocale native
 */

import { Capacitor } from '@capacitor/core';

export interface TTSOptions {
  lang?: string;
  rate?: number;  // 0.1 - 2.0
  pitch?: number; // 0 - 2
  volume?: number; // 0 - 1
  voice?: string;
}

interface TTSState {
  speaking: boolean;
  paused: boolean;
  supported: boolean;
  voices: SpeechSynthesisVoice[];
}

type TTSEventListener = (state: TTSState) => void;

class TTSService {
  private state: TTSState = {
    speaking: false,
    paused: false,
    supported: false,
    voices: [],
  };

  private listeners: TTSEventListener[] = [];
  private _currentUtterance: SpeechSynthesisUtterance | null = null;
  private defaultOptions: Required<TTSOptions> = {
    lang: 'fr-FR',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voice: '',
  };

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === 'undefined') return;

    this.state.supported = 'speechSynthesis' in window;
    
    if (this.state.supported) {
      // Charger les voix
      this.loadVoices();
      
      // Les voix peuvent être chargées de manière asynchrone
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }

    console.log('[TTSService] Initialized, supported:', this.state.supported);
  }

  private loadVoices(): void {
    this.state.voices = speechSynthesis.getVoices();
    
    // Trouver la meilleure voix française
    const frenchVoice = this.state.voices.find(v => 
      v.lang.startsWith('fr') && v.localService
    ) || this.state.voices.find(v => v.lang.startsWith('fr'));

    if (frenchVoice) {
      this.defaultOptions.voice = frenchVoice.name;
    }

    console.log(`[TTSService] Loaded ${this.state.voices.length} voices`);
    this.notifyListeners();
  }

  get isSupported(): boolean {
    return this.state.supported;
  }

  get isSpeaking(): boolean {
    return this.state.speaking;
  }

  get isPaused(): boolean {
    return this.state.paused;
  }

  get voices(): SpeechSynthesisVoice[] {
    return this.state.voices;
  }

  get frenchVoices(): SpeechSynthesisVoice[] {
    return this.state.voices.filter(v => v.lang.startsWith('fr'));
  }

  /**
   * Parler un texte
   */
  speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.state.supported) {
        reject(new Error('TTS not supported'));
        return;
      }

      // Arrêter la parole en cours
      this.stop();

      const opts = { ...this.defaultOptions, ...options };
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.lang = opts.lang;
      utterance.rate = opts.rate;
      utterance.pitch = opts.pitch;
      utterance.volume = opts.volume;

      // Trouver la voix
      if (opts.voice) {
        const voice = this.state.voices.find(v => v.name === opts.voice);
        if (voice) utterance.voice = voice;
      }

      utterance.onstart = () => {
        this.state.speaking = true;
        this.state.paused = false;
        this.notifyListeners();
      };

      utterance.onend = () => {
        this.state.speaking = false;
        this.state.paused = false;
        this._currentUtterance = null;
        this.notifyListeners();
        resolve();
      };

      utterance.onerror = (event) => {
        this.state.speaking = false;
        this.state.paused = false;
        this._currentUtterance = null;
        this.notifyListeners();
        
        if (event.error === 'canceled' || event.error === 'interrupted') {
          resolve(); // Not really an error
        } else {
          reject(new Error(`TTS error: ${event.error}`));
        }
      };

      utterance.onpause = () => {
        this.state.paused = true;
        this.notifyListeners();
      };

      utterance.onresume = () => {
        this.state.paused = false;
        this.notifyListeners();
      };

      this._currentUtterance = utterance;
      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Parler les messages de Lisa
   */
  async speakResponse(text: string): Promise<void> {
    // Nettoyer le texte (retirer markdown, code blocks, etc.)
    const cleanText = this.cleanTextForSpeech(text);
    
    if (cleanText.trim()) {
      await this.speak(cleanText);
    }
  }

  /**
   * Mettre en pause
   */
  pause(): void {
    if (this.state.supported && this.state.speaking) {
      speechSynthesis.pause();
    }
  }

  /**
   * Reprendre
   */
  resume(): void {
    if (this.state.supported && this.state.paused) {
      speechSynthesis.resume();
    }
  }

  /**
   * Arrêter
   */
  stop(): void {
    if (this.state.supported) {
      speechSynthesis.cancel();
      this.state.speaking = false;
      this.state.paused = false;
      this._currentUtterance = null;
      this.notifyListeners();
    }
  }

  /**
   * Toggle pause/resume
   */
  togglePause(): void {
    if (this.state.paused) {
      this.resume();
    } else if (this.state.speaking) {
      this.pause();
    }
  }

  /**
   * Mettre à jour les options par défaut
   */
  setDefaultOptions(options: TTSOptions): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * S'abonner aux changements d'état
   */
  subscribe(listener: TTSEventListener): () => void {
    this.listeners.push(listener);
    listener(this.state);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  /**
   * Nettoyer le texte pour la synthèse vocale
   */
  private cleanTextForSpeech(text: string): string {
    return text
      // Retirer les blocs de code
      .replace(/```[\s\S]*?```/g, 'bloc de code omis')
      .replace(/`[^`]+`/g, '')
      // Retirer le markdown
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Retirer les emojis (optionnel, les garder peut être sympa)
      // .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      // Nettoyer les espaces
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Vérifier si on est sur mobile natif
   */
  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }
}

export const ttsService = new TTSService();
export default ttsService;
