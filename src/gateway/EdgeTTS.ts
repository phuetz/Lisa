/**
 * Lisa Edge TTS - Text-to-Speech using Microsoft Edge TTS (free)
 * Based on OpenClaw's TTS implementation
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface EdgeTTSConfig {
  voice?: string;
  rate?: string;
  pitch?: string;
  volume?: string;
  language?: string;
}

export interface TTSVoice {
  name: string;
  shortName: string;
  gender: string;
  locale: string;
}

export interface TTSState {
  isPlaying: boolean;
  isSpeaking: boolean;
  currentText?: string;
  voice: string;
  rate: string;
  pitch: string;
  volume: string;
}

// Available French voices for Lisa
export const LISA_VOICES: TTSVoice[] = [
  { name: 'Microsoft Denise Online (Natural) - French (France)', shortName: 'fr-FR-DeniseNeural', gender: 'Female', locale: 'fr-FR' },
  { name: 'Microsoft Henri Online (Natural) - French (France)', shortName: 'fr-FR-HenriNeural', gender: 'Male', locale: 'fr-FR' },
  { name: 'Microsoft Eloise Online (Natural) - French (France)', shortName: 'fr-FR-EloiseNeural', gender: 'Female', locale: 'fr-FR' },
  { name: 'Microsoft Sylvie Online (Natural) - French (Canada)', shortName: 'fr-CA-SylvieNeural', gender: 'Female', locale: 'fr-CA' },
  { name: 'Microsoft Jenny Online (Natural) - English (US)', shortName: 'en-US-JennyNeural', gender: 'Female', locale: 'en-US' },
  { name: 'Microsoft Aria Online (Natural) - English (US)', shortName: 'en-US-AriaNeural', gender: 'Female', locale: 'en-US' },
];

export class EdgeTTS extends BrowserEventEmitter {
  private config: EdgeTTSConfig;
  private state: TTSState;
  private _audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private speechSynthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor(config?: EdgeTTSConfig) {
    super();
    this.config = {
      voice: 'fr-FR-DeniseNeural',
      rate: '+0%',
      pitch: '+0Hz',
      volume: '+0%',
      language: 'fr-FR',
      ...config,
    };

    this.state = {
      isPlaying: false,
      isSpeaking: false,
      voice: this.config.voice || 'fr-FR-DeniseNeural',
      rate: this.config.rate || '+0%',
      pitch: this.config.pitch || '+0Hz',
      volume: this.config.volume || '+0%',
    };
  }

  async initialize(): Promise<void> {
    // Initialize Web Audio API (for future audio processing if needed)
    this._audioContext = new AudioContext();
    
    // Initialize Speech Synthesis as fallback
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }

    this.emit('initialized');
  }

  /**
   * Speak text using Edge TTS via server-side proxy or fallback to Web Speech API
   */
  async speak(text: string): Promise<void> {
    if (!text.trim()) return;

    this.state.currentText = text;
    this.state.isSpeaking = true;
    this.emit('speaking', { text });

    try {
      // Try Edge TTS first (requires server-side proxy)
      const edgeTTSAvailable = await this.tryEdgeTTS(text);
      
      if (!edgeTTSAvailable) {
        // Fallback to Web Speech API
        await this.speakWithWebSpeech(text);
      }
    } catch (error) {
      this.state.isSpeaking = false;
      this.emit('error', error);
      
      // Try fallback
      await this.speakWithWebSpeech(text);
    }
  }

  private async tryEdgeTTS(text: string): Promise<boolean> {
    try {
      // Check if Edge TTS server is available (node-edge-tts runs server-side)
      const response = await fetch('/api/tts/edge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: this.config.voice,
          rate: this.config.rate,
          pitch: this.config.pitch,
          volume: this.config.volume,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      await this.playAudio(audioUrl);
      URL.revokeObjectURL(audioUrl);
      
      return true;
    } catch {
      return false;
    }
  }

  private async playAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.currentAudio = new Audio(url);
      this.state.isPlaying = true;

      this.currentAudio.onended = () => {
        this.state.isPlaying = false;
        this.state.isSpeaking = false;
        this.emit('ended');
        resolve();
      };

      this.currentAudio.onerror = (error) => {
        this.state.isPlaying = false;
        this.state.isSpeaking = false;
        reject(error);
      };

      this.currentAudio.play().catch(reject);
    });
  }

  private async speakWithWebSpeech(text: string): Promise<void> {
    if (!this.speechSynthesis) {
      throw new Error('Speech synthesis not available');
    }

    return new Promise((resolve, reject) => {
      this.currentUtterance = new SpeechSynthesisUtterance(text);
      
      // Find matching voice
      const voices = this.speechSynthesis!.getVoices();
      const targetVoice = voices.find(
        (v) => v.lang.startsWith(this.config.language || 'fr') && v.name.includes('Female')
      ) || voices.find((v) => v.lang.startsWith(this.config.language || 'fr'));

      if (targetVoice) {
        this.currentUtterance.voice = targetVoice;
      }

      this.currentUtterance.lang = this.config.language || 'fr-FR';
      this.currentUtterance.rate = this.parseRate(this.config.rate);
      this.currentUtterance.pitch = this.parsePitch(this.config.pitch);
      this.currentUtterance.volume = this.parseVolume(this.config.volume);

      this.currentUtterance.onend = () => {
        this.state.isSpeaking = false;
        this.emit('ended');
        resolve();
      };

      this.currentUtterance.onerror = (event) => {
        this.state.isSpeaking = false;
        reject(new Error(event.error));
      };

      this.speechSynthesis!.speak(this.currentUtterance);
    });
  }

  private parseRate(rate?: string): number {
    if (!rate) return 1;
    const match = rate.match(/([+-]?\d+)/);
    if (match) {
      const percent = parseInt(match[1], 10);
      return 1 + percent / 100;
    }
    return 1;
  }

  private parsePitch(pitch?: string): number {
    if (!pitch) return 1;
    const match = pitch.match(/([+-]?\d+)/);
    if (match) {
      const hz = parseInt(match[1], 10);
      return 1 + hz / 50; // Approximate conversion
    }
    return 1;
  }

  private parseVolume(volume?: string): number {
    if (!volume) return 1;
    const match = volume.match(/([+-]?\d+)/);
    if (match) {
      const percent = parseInt(match[1], 10);
      return Math.max(0, Math.min(1, 1 + percent / 100));
    }
    return 1;
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    if (this.speechSynthesis && this.currentUtterance) {
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
    }

    this.state.isPlaying = false;
    this.state.isSpeaking = false;
    this.emit('stopped');
  }

  pause(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    if (this.speechSynthesis) {
      this.speechSynthesis.pause();
    }
    this.state.isPlaying = false;
    this.emit('paused');
  }

  resume(): void {
    if (this.currentAudio) {
      this.currentAudio.play();
    }
    if (this.speechSynthesis) {
      this.speechSynthesis.resume();
    }
    this.state.isPlaying = true;
    this.emit('resumed');
  }

  setVoice(voice: string): void {
    this.config.voice = voice;
    this.state.voice = voice;
  }

  setRate(rate: string): void {
    this.config.rate = rate;
    this.state.rate = rate;
  }

  setPitch(pitch: string): void {
    this.config.pitch = pitch;
    this.state.pitch = pitch;
  }

  setVolume(volume: string): void {
    this.config.volume = volume;
    this.state.volume = volume;
  }

  getState(): TTSState {
    return { ...this.state };
  }

  isSpeaking(): boolean {
    return this.state.isSpeaking;
  }

  getAvailableVoices(): TTSVoice[] {
    return LISA_VOICES;
  }

  async getWebSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.speechSynthesis) return [];

    return new Promise((resolve) => {
      const voices = this.speechSynthesis!.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }

      // Wait for voices to load
      this.speechSynthesis!.onvoiceschanged = () => {
        resolve(this.speechSynthesis!.getVoices());
      };
    });
  }
}

// Singleton instance
let instance: EdgeTTS | null = null;

export function getEdgeTTS(config?: EdgeTTSConfig): EdgeTTS {
  if (!instance) {
    instance = new EdgeTTS(config);
  }
  return instance;
}

export function resetEdgeTTS(): void {
  if (instance) {
    instance.stop();
    instance.removeAllListeners();
    instance = null;
  }
}
