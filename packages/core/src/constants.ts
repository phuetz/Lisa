/**
 * Core Constants for Lisa AI Components
 */

// Package versions
export const LISA_VERSION = '1.0.0';

// Supported languages for code execution
export const SUPPORTED_LANGUAGES = [
  'python',
  'javascript',
  'typescript',
  'html',
  'css',
  'json',
  'markdown',
  'sql',
  'bash',
  'shell'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Vision model types
export const VISION_MODELS = {
  FACE_DETECTION: 'face_detection',
  POSE_DETECTION: 'pose_detection',
  HAND_DETECTION: 'hand_detection',
  OBJECT_DETECTION: 'object_detection',
  IMAGE_SEGMENTATION: 'image_segmentation',
  GESTURE_RECOGNITION: 'gesture_recognition'
} as const;

export type VisionModel = typeof VISION_MODELS[keyof typeof VISION_MODELS];

// Audio model types
export const AUDIO_MODELS = {
  SPEECH_RECOGNITION: 'speech_recognition',
  AUDIO_CLASSIFICATION: 'audio_classification',
  SPEAKER_DIARIZATION: 'speaker_diarization',
  VOICE_ACTIVITY: 'voice_activity'
} as const;

export type AudioModel = typeof AUDIO_MODELS[keyof typeof AUDIO_MODELS];

// Theme colors
export const THEME_COLORS = {
  light: {
    background: '#ffffff',
    foreground: '#1a1a1a',
    primary: '#10a37f',
    secondary: '#6366f1',
    accent: '#8b5cf6',
    muted: '#f4f4f5',
    border: '#e4e4e7'
  },
  dark: {
    background: '#1a1a1a',
    foreground: '#fafafa',
    primary: '#10a37f',
    secondary: '#818cf8',
    accent: '#a78bfa',
    muted: '#27272a',
    border: '#3f3f46'
  }
} as const;

// Default timeouts (ms)
export const TIMEOUTS = {
  API_REQUEST: 30000,
  CODE_EXECUTION: 60000,
  VISION_INFERENCE: 5000,
  AUDIO_PROCESSING: 10000,
  DEBOUNCE: 300,
  THROTTLE: 100
} as const;

// MediaPipe CDN URLs
export const MEDIAPIPE_CDN = {
  VISION: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
  AUDIO: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@latest/wasm'
} as const;

// Pyodide CDN
export const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/';

// Event names
export const EVENTS = {
  // Vision events
  FACE_DETECTED: 'lisa:face:detected',
  POSE_DETECTED: 'lisa:pose:detected',
  GESTURE_DETECTED: 'lisa:gesture:detected',
  OBJECT_DETECTED: 'lisa:object:detected',
  
  // Audio events
  SPEECH_START: 'lisa:speech:start',
  SPEECH_END: 'lisa:speech:end',
  SPEECH_RESULT: 'lisa:speech:result',
  AUDIO_CLASSIFIED: 'lisa:audio:classified',
  
  // Code events
  CODE_EXECUTING: 'lisa:code:executing',
  CODE_COMPLETE: 'lisa:code:complete',
  CODE_ERROR: 'lisa:code:error',
  
  // General events
  READY: 'lisa:ready',
  ERROR: 'lisa:error',
  LOADING: 'lisa:loading'
} as const;

export type LisaEventName = typeof EVENTS[keyof typeof EVENTS];
