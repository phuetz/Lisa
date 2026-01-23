/**
 * Audio Classifier - Stub implementation
 */

import type { AudioConfig, AudioClassificationResult, AudioEventCallback } from './types';

export interface AudioClassifierConfig extends AudioConfig {
  modelPath?: string;
  maxResults?: number;
}

export class AudioClassifier {
  private config: AudioClassifierConfig;
  private callback?: AudioEventCallback<AudioClassificationResult[]>;

  constructor(config: AudioClassifierConfig = {}) {
    this.config = {
      maxResults: 5,
      ...config
    };
  }

  async initialize(): Promise<void> {
    console.log('[AudioClassifier] Initializing with config:', this.config);
  }

  setCallback(callback: AudioEventCallback<AudioClassificationResult[]>): void {
    this.callback = callback;
  }

  async classify(_audioData: Float32Array): Promise<AudioClassificationResult[]> {
    return [];
  }

  close(): void {
    console.log('[AudioClassifier] Closed');
  }
}

export function createAudioClassifier(config?: AudioClassifierConfig): AudioClassifier {
  return new AudioClassifier(config);
}
