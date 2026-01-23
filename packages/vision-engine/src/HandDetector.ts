/**
 * Hand Detector using MediaPipe
 */

import type { VisionConfig, HandDetection, DetectionCallback } from './types';

export interface HandDetectorConfig extends VisionConfig {
  numHands?: number;
  minHandDetectionConfidence?: number;
  minHandPresenceConfidence?: number;
  minTrackingConfidence?: number;
}

export class HandDetector {
  private detector: unknown = null;
  private config: HandDetectorConfig;
  private callback?: DetectionCallback<HandDetection[]>;

  constructor(config: HandDetectorConfig = {}) {
    this.config = {
      numHands: 2,
      minConfidence: 0.5,
      runningMode: 'VIDEO',
      ...config
    };
  }

  async initialize(): Promise<void> {
    console.log('[HandDetector] Initializing with config:', this.config);
  }

  setCallback(callback: DetectionCallback<HandDetection[]>): void {
    this.callback = callback;
  }

  async detect(_image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<HandDetection[]> {
    if (!this.detector) {
      return [];
    }
    return [];
  }

  close(): void {
    this.detector = null;
  }
}

export function createHandDetector(config?: HandDetectorConfig): HandDetector {
  return new HandDetector(config);
}
