import type { Percept } from '@lisa-sdk/core';

export interface VisionConfig {
  models: {
    yolo: {
      url: string;
      confidence: number;
      iou: number;
    };
  };
  features: {
    enableFace: boolean;
    enableHand: boolean;
    enablePose: boolean;
    enableFallDetection: boolean;
  };
}

export type VisionModelType = 'yolov8n' | 'yolov8s' | 'mediapipe';

export interface BoundingBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface VisionPayload {
  type: 'object' | 'pose' | 'face' | 'hand';
  boxes?: [number, number, number, number][];
  classes?: string[];
  scores?: number[];
  landmarks?: PoseLandmark[];
}

// VisionPercept now extends the generic Percept from core
export type VisionPercept = Percept<VisionPayload>;
