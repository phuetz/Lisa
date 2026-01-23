/**
 * Base Percept Interface
 * All sensory inputs must conform to this structure.
 */
export interface Percept<T = any> {
  /** The modality of the sense (vision, hearing, touch, etc.) */
  modality: 'vision' | 'hearing' | 'touch' | 'proprioception' | 'environment' | string;
  
  /** The raw or processed payload */
  payload: T;
  
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  
  /** Timestamp of perception */
  timestamp: number;
  
  /** Source identifier (e.g., "yolov8-worker", "whisper-api") */
  source?: string;
  
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Standard Payload Types
 * These can be extended by specific packages
 */
export interface TextPayload {
  content: string;
  language?: string;
}

export interface AudioPayload {
  buffer?: Float32Array;
  sampleRate?: number;
  transcription?: string;
}

export interface VisualPayload {
  objects?: Array<{ label: string; confidence: number; box: any }>;
  faces?: Array<{ id: string; landmarks: any }>;
}
