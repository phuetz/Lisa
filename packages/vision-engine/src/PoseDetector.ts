/**
 * Pose Detector using MediaPipe
 */

import type { VisionConfig, PoseDetection, DetectionCallback } from './types';

export interface PoseDetectorConfig extends VisionConfig {
  numPoses?: number;
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
}

export class PoseDetector {
  private detector: unknown = null;
  private config: PoseDetectorConfig;
  private callback?: DetectionCallback<PoseDetection[]>;

  constructor(config: PoseDetectorConfig = {}) {
    this.config = {
      numPoses: 1,
      minConfidence: 0.5,
      runningMode: 'VIDEO',
      ...config
    };
  }

  async initialize(): Promise<void> {
    // Implementation uses @mediapipe/tasks-vision PoseLandmarker
    console.log('[PoseDetector] Initializing with config:', this.config);
  }

  setCallback(callback: DetectionCallback<PoseDetection[]>): void {
    this.callback = callback;
  }

  async detect(_image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<PoseDetection[]> {
    if (!this.detector) {
      console.warn('[PoseDetector] Not initialized');
      return [];
    }
    return [];
  }

  close(): void {
    this.detector = null;
  }
}

export function createPoseDetector(config?: PoseDetectorConfig): PoseDetector {
  return new PoseDetector(config);
}
