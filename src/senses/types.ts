import type { Percept } from '../types';

// --- VISION TYPES ---

export interface SdkVisualObject {
  label: string;
  confidence: number;
  // Standardized Bounding Box: [x1, y1, x2, y2] (Normalized 0-1)
  bbox: [number, number, number, number];
}

export interface SdkVisualPayload {
  objects: SdkVisualObject[];
  timestamp: number;
}

export type SdkVisualPercept = Percept<SdkVisualPayload>;

// --- HEARING TYPES ---

export interface LegacyHearingPerceptPayload {
  text?: string;
  emotion?: string;
  sentiment?: string;
  intent?: string;
}

export interface SdkAudioPayload {
  transcription: string;
  language?: string;
  confidence: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export type SdkAudioPercept = Percept<SdkAudioPayload>;
