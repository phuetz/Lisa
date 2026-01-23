/**
 * Speech Synthesizer - Stub implementation
 */

import type { SpeechSynthesisOptions } from './types';

export class SpeechSynthesizer {
  private options: SpeechSynthesisOptions;
  private _isSpeaking = false;

  constructor(options: SpeechSynthesisOptions = {}) {
    this.options = {
      rate: 1,
      pitch: 1,
      volume: 1,
      language: 'en-US',
      ...options
    };
  }

  async initialize(): Promise<void> {
    console.log('[SpeechSynthesizer] Initializing with options:', this.options);
  }

  async speak(text: string): Promise<void> {
    this._isSpeaking = true;
    console.log('[SpeechSynthesizer] Speaking:', text);
    this._isSpeaking = false;
  }

  stop(): void {
    this._isSpeaking = false;
    console.log('[SpeechSynthesizer] Stopped');
  }

  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  getVoices(): string[] {
    return [];
  }

  setVoice(voice: string): void {
    this.options.voice = voice;
  }

  close(): void {
    this.stop();
  }
}

export function createSpeechSynthesizer(options?: SpeechSynthesisOptions): SpeechSynthesizer {
  return new SpeechSynthesizer(options);
}
