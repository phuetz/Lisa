/**
 * @file src/types/index.ts
 * 
 * Ce fichier contient les types globaux de l'application.
 * Lisa maîtrise les 5 sens adaptés pour une IA virtuelle:
 * 1. Vision - Caméra, images, reconnaissance visuelle
 * 2. Hearing (Ouïe) - Microphone, reconnaissance vocale, analyse audio
 * 3. Touch (Toucher) - Entrées utilisateur, capteurs IoT, interactions
 * 4. Smell/Environment (Odorat/Environnement) - Qualité air, capteurs environnementaux
 * 5. Proprioception - État interne du système, métriques, conscience de soi
 */

import type { Percept as SDKPercept } from '@lisa-sdk/core';

/** Les 5 modalités sensorielles de Lisa */
export type SenseModality = 'vision' | 'hearing' | 'touch' | 'environment' | 'proprioception';

/** Percept générique avec modalité typée */
export type Percept<V> = Omit<SDKPercept<V>, 'timestamp'> & {
  ts: number;
};

/** ===== VISION PAYLOADS ===== */
export interface VisionObjectPayload {
  type: 'object';
  boxes: Array<[number, number, number, number]>;
  classes: string[];
  scores: number[];
}

export interface VisionFacePayload {
  type: 'face';
  faces: Array<{
    bbox: [number, number, number, number];
    landmarks: unknown;
    emotion?: string;
    age?: number;
    gender?: string;
  }>;
}

export interface VisionHandPayload {
  type: 'hand';
  hands: Array<{
    bbox: [number, number, number, number];
    landmarks: unknown;
    handedness: 'Left' | 'Right';
    gesture?: string;
  }>;
}

export interface VisionPosePayload {
  type: 'pose';
  poses: Array<{
    landmarks: unknown;
    score: number;
    activity?: string;
  }>;
}

export type VisionPayload = VisionObjectPayload | VisionFacePayload | VisionHandPayload | VisionPosePayload;

/** ===== HEARING PAYLOADS ===== */
export interface HearingTranscriptionPayload {
  type: 'transcription';
  text: string;
  language?: string;
  isFinal: boolean;
}

export interface HearingEmotionPayload {
  type: 'emotion';
  emotion: string;
  valence: number; // -1 à 1 (négatif à positif)
  arousal: number; // 0 à 1 (calme à excité)
}

export interface HearingSoundPayload {
  type: 'sound';
  soundClass: string; // "speech", "music", "alarm", "silence", etc.
  volume: number; // 0 à 1
}

export type HearingPayload = HearingTranscriptionPayload | HearingEmotionPayload | HearingSoundPayload;

/** ===== TOUCH PAYLOADS ===== */
export interface TouchInputPayload {
  type: 'input';
  inputType: 'mouse' | 'touch' | 'pen' | 'keyboard';
  position?: { x: number; y: number };
  pressure?: number; // 0 à 1
  action: 'down' | 'up' | 'move' | 'key';
  key?: string;
}

export interface TouchSensorPayload {
  type: 'sensor';
  sensorId: string;
  sensorType: 'pressure' | 'proximity' | 'temperature' | 'vibration' | 'force';
  value: number;
  unit: string;
}

export interface TouchGesturePayload {
  type: 'gesture';
  gesture: 'tap' | 'double_tap' | 'long_press' | 'swipe' | 'pinch' | 'rotate';
  direction?: 'up' | 'down' | 'left' | 'right';
  scale?: number;
  rotation?: number;
}

export interface TouchHapticPayload {
  type: 'haptic';
  pattern: 'vibrate' | 'pulse' | 'impact' | 'selection' | 'success' | 'warning' | 'error';
  intensity: number; // 0 à 1
  duration: number; // ms
}

export type TouchPayload = TouchInputPayload | TouchSensorPayload | TouchGesturePayload | TouchHapticPayload;

/** ===== ENVIRONMENT/SMELL PAYLOADS ===== */
export interface EnvironmentAirQualityPayload {
  type: 'air_quality';
  aqi: number; // 0-500 (Air Quality Index)
  pm25: number; // µg/m³
  pm10: number;
  co2: number; // ppm
  voc: number; // ppb (Volatile Organic Compounds)
  humidity: number; // %
  temperature: number; // °C
}

export interface EnvironmentWeatherPayload {
  type: 'weather';
  temperature: number;
  humidity: number;
  pressure: number; // hPa
  windSpeed: number; // km/h
  condition: string;
  uvIndex: number;
}

export interface EnvironmentLocationPayload {
  type: 'location';
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  speed?: number;
  heading?: number;
}

export interface EnvironmentLightPayload {
  type: 'light';
  illuminance: number; // lux
  colorTemperature?: number; // Kelvin
  isNight: boolean;
}

export interface EnvironmentNoisePayload {
  type: 'noise';
  decibels: number;
  noiseLevel: 'quiet' | 'moderate' | 'loud' | 'very_loud';
}

export type EnvironmentPayload = 
  | EnvironmentAirQualityPayload 
  | EnvironmentWeatherPayload 
  | EnvironmentLocationPayload 
  | EnvironmentLightPayload 
  | EnvironmentNoisePayload;

/** ===== PROPRIOCEPTION PAYLOADS ===== */
export interface ProprioceptionSystemPayload {
  type: 'system';
  cpuUsage: number; // %
  memoryUsage: number; // %
  gpuUsage?: number; // %
  batteryLevel?: number; // %
  isCharging?: boolean;
  networkLatency: number; // ms
  networkType: 'wifi' | 'cellular' | 'ethernet' | 'offline';
}

export interface ProprioceptionStatePayload {
  type: 'state';
  isProcessing: boolean;
  activeAgents: string[];
  pendingTasks: number;
  errorCount: number;
  uptime: number; // seconds
}

export interface ProprioceptionCapabilityPayload {
  type: 'capability';
  availableSenses: SenseModality[];
  enabledFeatures: string[];
  modelStatus: Record<string, 'loaded' | 'loading' | 'error' | 'unloaded'>;
}

export interface ProprioceptionEmotionalPayload {
  type: 'emotional';
  mood: 'happy' | 'neutral' | 'concerned' | 'alert' | 'tired';
  energyLevel: number; // 0 à 1
  stressLevel: number; // 0 à 1
  confidence: number; // 0 à 1
}

export interface ProprioceptionMemoryPayload {
  type: 'memory';
  shortTermCount: number;
  longTermCount: number;
  contextWindowUsed: number; // tokens
  contextWindowMax: number;
}

export type ProprioceptionPayload = 
  | ProprioceptionSystemPayload 
  | ProprioceptionStatePayload 
  | ProprioceptionCapabilityPayload
  | ProprioceptionEmotionalPayload
  | ProprioceptionMemoryPayload;

/** ===== UNIFIED SENSE TYPES ===== */
export type AnyPerceptPayload = 
  | VisionPayload 
  | HearingPayload 
  | TouchPayload 
  | EnvironmentPayload 
  | ProprioceptionPayload;

export type VisionPercept = Percept<VisionPayload>;
export type HearingPercept = Percept<HearingPayload>;
export type TouchPercept = Percept<TouchPayload>;
export type EnvironmentPercept = Percept<EnvironmentPayload>;
export type ProprioceptionPercept = Percept<ProprioceptionPayload>;

export type AnyPercept = 
  | VisionPercept 
  | HearingPercept 
  | TouchPercept 
  | EnvironmentPercept 
  | ProprioceptionPercept;

/** Configuration des sens */
export interface SenseConfig {
  enabled: boolean;
  sensitivity: number; // 0 à 1
  updateInterval: number; // ms
  sources: string[];
}

export type SensesConfig = Record<SenseModality, SenseConfig>;

/** ===== PERSONA TYPES ===== */
export * from './persona';

/** ===== GROK CLI TYPES ===== */
export * from './grokCli';
