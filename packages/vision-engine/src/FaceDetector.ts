/**
 * Face Detector using MediaPipe
 */

import type { VisionConfig, FaceDetection, DetectionCallback } from './types';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

export interface FaceDetectorConfig extends VisionConfig {
  minDetectionConfidence?: number;
}

export class FaceDetector {
  private detector: unknown = null;
  private config: FaceDetectorConfig;
  private callback?: DetectionCallback<FaceDetection[]>;

  constructor(config: FaceDetectorConfig = {}) {
    this.config = {
      minConfidence: 0.5,
      maxResults: 5,
      runningMode: 'VIDEO',
      ...config
    };
  }

  async initialize(): Promise<void> {
    const { FaceDetector: MPFaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
    
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_CDN);
    
    this.detector = await MPFaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: this.config.delegate || 'GPU'
      },
      runningMode: this.config.runningMode,
      minDetectionConfidence: this.config.minConfidence
    });
  }

  setCallback(callback: DetectionCallback<FaceDetection[]>): void {
    this.callback = callback;
  }

  async detect(image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<FaceDetection[]> {
    if (!this.detector) {
      throw new Error('FaceDetector not initialized. Call initialize() first.');
    }

    const detector = this.detector as { detect: (img: unknown, ts?: number) => { detections: unknown[] } };
    const result = detector.detect(image, performance.now());
    
    const faces: FaceDetection[] = result.detections.map((d: unknown) => {
      const detection = d as {
        boundingBox: { originX: number; originY: number; width: number; height: number };
        keypoints: Array<{ x: number; y: number }>;
        categories: Array<{ score: number }>;
      };
      return {
        boundingBox: {
          x: detection.boundingBox.originX,
          y: detection.boundingBox.originY,
          width: detection.boundingBox.width,
          height: detection.boundingBox.height
        },
        keypoints: detection.keypoints.map(kp => ({ x: kp.x, y: kp.y })),
        confidence: detection.categories[0]?.score || 0
      };
    });

    if (this.callback) {
      this.callback(faces, performance.now());
    }

    return faces;
  }

  close(): void {
    if (this.detector) {
      (this.detector as { close: () => void }).close();
      this.detector = null;
    }
  }
}

export function createFaceDetector(config?: FaceDetectorConfig): FaceDetector {
  return new FaceDetector(config);
}
