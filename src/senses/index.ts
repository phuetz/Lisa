// src/senses/index.ts
/**
 * LES 5 SENS DE LISA
 * 
 * 1. VISION - Perception visuelle (caméra, images, vidéo)
 * 2. HEARING - Perception auditive (microphone, voix, sons)
 * 3. TOUCH - Perception tactile (souris, clavier, capteurs)
 * 4. ENVIRONMENT - Perception environnementale (météo, qualité air, localisation)
 * 5. PROPRIOCEPTION - Conscience de soi (état système, capacités, émotions)
 */

export { visionSense } from './vision';
export type { VisionPayload } from './vision';
export { hearingSense } from './hearing';
export type { HearingPerceptPayload } from './hearing';
export { touchSense, isTouchReady, getLastTouchPosition } from './touch';
export { 
  environmentSense, 
  isEnvironmentReady, 
  getCachedLocation,
  refreshWeather,
  refreshAirQuality 
} from './environment';
export { 
  proprioceptionSense, 
  isProprioceptionReady,
  recordError,
  resetErrorCount,
  startTask,
  endTask,
  updateModelStatus,
  updateMemoryMetrics,
  getUptime,
  forceUpdate 
} from './proprioception';

// Re-export all sense types
export type {
  SenseModality,
  Percept,
  AnyPercept,
  AnyPerceptPayload,
  // Vision
  VisionPercept,
  VisionObjectPayload,
  VisionFacePayload,
  VisionHandPayload,
  VisionPosePayload,
  // Hearing
  HearingPercept,
  HearingTranscriptionPayload,
  HearingEmotionPayload,
  HearingSoundPayload,
  HearingPayload,
  // Touch
  TouchPercept,
  TouchPayload,
  TouchInputPayload,
  TouchSensorPayload,
  TouchGesturePayload,
  TouchHapticPayload,
  // Environment
  EnvironmentPercept,
  EnvironmentPayload,
  EnvironmentAirQualityPayload,
  EnvironmentWeatherPayload,
  EnvironmentLocationPayload,
  EnvironmentLightPayload,
  EnvironmentNoisePayload,
  // Proprioception
  ProprioceptionPercept,
  ProprioceptionPayload,
  ProprioceptionSystemPayload,
  ProprioceptionStatePayload,
  ProprioceptionCapabilityPayload,
  ProprioceptionEmotionalPayload,
  ProprioceptionMemoryPayload,
  // Config
  SenseConfig,
  SensesConfig,
} from '../types';

/**
 * Configuration par défaut des 5 sens
 */
export const DEFAULT_SENSES_CONFIG = {
  vision: {
    enabled: true,
    sensitivity: 0.8,
    updateInterval: 33, // ~30 FPS
    sources: ['camera', 'screen'],
  },
  hearing: {
    enabled: true,
    sensitivity: 0.7,
    updateInterval: 100,
    sources: ['microphone'],
  },
  touch: {
    enabled: true,
    sensitivity: 1.0,
    updateInterval: 16, // ~60 FPS for responsiveness
    sources: ['mouse', 'touch', 'keyboard'],
  },
  environment: {
    enabled: true,
    sensitivity: 0.5,
    updateInterval: 60000, // 1 minute
    sources: ['geolocation', 'weather_api', 'sensors'],
  },
  proprioception: {
    enabled: true,
    sensitivity: 1.0,
    updateInterval: 5000, // 5 seconds
    sources: ['system', 'memory', 'agents'],
  },
};

/**
 * Initialise tous les sens
 */
export async function initializeAllSenses(): Promise<void> {
  const { visionSense } = await import('./vision');
  const { hearingSense } = await import('./hearing');
  const { touchSense } = await import('./touch');
  const { environmentSense } = await import('./environment');
  const { proprioceptionSense } = await import('./proprioception');

  // Initialize in parallel
  await Promise.all([
    visionSense.start(),
    hearingSense.initialize(),
    touchSense.initialize(),
    environmentSense.initialize(),
    proprioceptionSense.initialize(),
  ]);

  console.log('[Senses] All 5 senses initialized');
}

/**
 * Termine tous les sens
 */
export async function terminateAllSenses(): Promise<void> {
  const { visionSense } = await import('./vision');
  const { hearingSense } = await import('./hearing');
  const { touchSense } = await import('./touch');
  const { environmentSense } = await import('./environment');
  const { proprioceptionSense } = await import('./proprioception');

  visionSense.stop();
  hearingSense.terminate();
  touchSense.terminate();
  environmentSense.terminate();
  proprioceptionSense.terminate();

  console.log('[Senses] All 5 senses terminated');
}
