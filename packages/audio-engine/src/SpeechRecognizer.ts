/**
 * Speech Recognizer - Stub implementation
 */

import type { AudioConfig, SpeechRecognitionResult, AudioEventCallback } from './types';

export interface SpeechRecognizerConfig extends AudioConfig {
  continuous?: boolean;
  interimResults?: boolean;
}

export class SpeechRecognizer {
  private config: SpeechRecognizerConfig;
  private callback?: AudioEventCallback<SpeechRecognitionResult>;
  private _isListening = false;

  constructor(config: SpeechRecognizerConfig = {}) {
    this.config = {
      language: 'en-US',
      continuous: false,
      interimResults: true,
      ...config
    };
  }

  async initialize(): Promise<void> {
    console.log('[SpeechRecognizer] Initializing with config:', this.config);
  }

  setCallback(callback: AudioEventCallback<SpeechRecognitionResult>): void {
    this.callback = callback;
  }

  start(): void {
    this._isListening = true;
    console.log('[SpeechRecognizer] Started listening');
  }

  stop(): void {
    this._isListening = false;
    console.log('[SpeechRecognizer] Stopped listening');
  }

  get isListening(): boolean {
    return this._isListening;
  }

  close(): void {
    this.stop();
  }
}

export function createSpeechRecognizer(config?: SpeechRecognizerConfig): SpeechRecognizer {
  return new SpeechRecognizer(config);
}
