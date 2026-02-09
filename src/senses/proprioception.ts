// src/senses/proprioception.ts
/**
 * PROPRIOCEPTION - Lisa's Self-Awareness Sense
 * 
 * Conscience de l'état interne du système:
 * - Ressources système (CPU, mémoire, GPU, batterie)
 * - État des agents et tâches en cours
 * - Capacités disponibles
 * - État émotionnel simulé
 * - Utilisation de la mémoire conversationnelle
 */

import type {
  Percept,
  ProprioceptionPayload,
  ProprioceptionSystemPayload,
  ProprioceptionStatePayload,
  ProprioceptionCapabilityPayload,
  ProprioceptionEmotionalPayload,
  ProprioceptionMemoryPayload,
  SenseModality,
} from '../types';

type ProprioceptionPerceptCallback = (percept: Percept<ProprioceptionPayload>) => void;

// State
let isInitialized = false;
let onPerceptCallback: ProprioceptionPerceptCallback | null = null;
let updateInterval: ReturnType<typeof setInterval> | null = null;
let startTime = Date.now();
let errorCount = 0;
let processingTasks = 0;
let activeAgentsList: string[] = [];

// Configuration
const UPDATE_INTERVAL = 5000; // 5 seconds

// Performance tracking
const performanceHistory: number[] = [];
const MAX_HISTORY_SIZE = 60; // 5 minutes at 5s interval

/**
 * Émet un percept de proprioception
 */
function emitPercept(payload: ProprioceptionPayload, confidence: number = 1.0, source?: string): void {
  if (!onPerceptCallback) return;

  const percept: Percept<ProprioceptionPayload> = {
    modality: 'proprioception',
    payload,
    confidence,
    ts: Date.now(),
    source,
  };

  onPerceptCallback(percept);
}

/**
 * Obtient les métriques système
 */
async function getSystemMetrics(): Promise<ProprioceptionSystemPayload> {
  let cpuUsage = 0;
  let memoryUsage = 0;
  let gpuUsage: number | undefined;
  let batteryLevel: number | undefined;
  let isCharging: boolean | undefined;
  let networkLatency = 0;
  let networkType: ProprioceptionSystemPayload['networkType'] = 'offline';

  // Memory usage via Performance API
  if (performance && 'memory' in performance) {
    const memory = (performance as unknown as { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    memoryUsage = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
  }

  // CPU estimation via frame timing
  const frameStart = performance.now();
  await new Promise(resolve => requestAnimationFrame(resolve));
  const frameDuration = performance.now() - frameStart;
  cpuUsage = Math.min(100, Math.round((frameDuration / 16.67) * 100)); // 16.67ms = 60fps

  // Battery API
  if ('getBattery' in navigator) {
    try {
      const battery = await (navigator as unknown as { getBattery: () => Promise<{ level: number; charging: boolean }> }).getBattery();
      batteryLevel = Math.round(battery.level * 100);
      isCharging = battery.charging;
    } catch {
      // Battery API not available
    }
  }

  // Network info
  if ('connection' in navigator) {
    const connection = (navigator as unknown as { connection: { effectiveType: string; rtt: number } }).connection;
    networkLatency = connection.rtt || 0;
    
    const effectiveType = connection.effectiveType;
    if (effectiveType === '4g' || effectiveType === '3g') {
      networkType = 'cellular';
    } else if (effectiveType === 'wifi') {
      networkType = 'wifi';
    }
  }

  // Check if online
  if (!navigator.onLine) {
    networkType = 'offline';
  } else if (networkType === 'offline') {
    networkType = 'wifi'; // Default to wifi if online but no specific info
  }

  // Measure actual network latency
  try {
    const pingStart = performance.now();
    const apiBase = typeof window !== 'undefined' && window.electronAPI ? 'http://localhost:3001' : '';
    await fetch(`${apiBase}/api/health`, { method: 'HEAD', mode: 'no-cors' }).catch(() => {});
    networkLatency = Math.round(performance.now() - pingStart);
  } catch {
    // Keep estimated latency
  }

  return {
    type: 'system',
    cpuUsage,
    memoryUsage,
    gpuUsage,
    batteryLevel,
    isCharging,
    networkLatency,
    networkType,
  };
}

/**
 * Obtient l'état des tâches et agents
 */
function getStateMetrics(): ProprioceptionStatePayload {
  return {
    type: 'state',
    isProcessing: processingTasks > 0,
    activeAgents: [...activeAgentsList],
    pendingTasks: processingTasks,
    errorCount,
    uptime: Math.round((Date.now() - startTime) / 1000),
  };
}

/**
 * Obtient les capacités du système
 */
function getCapabilityMetrics(): ProprioceptionCapabilityPayload {
  const availableSenses: SenseModality[] = ['vision', 'hearing', 'touch', 'environment', 'proprioception'];
  
  const enabledFeatures: string[] = [];
  
  // Check various capabilities
  if ('mediaDevices' in navigator) enabledFeatures.push('camera', 'microphone');
  if ('geolocation' in navigator) enabledFeatures.push('geolocation');
  if ('speechRecognition' in window || 'webkitSpeechRecognition' in window) enabledFeatures.push('speech_recognition');
  if ('speechSynthesis' in window) enabledFeatures.push('speech_synthesis');
  if ('Notification' in window) enabledFeatures.push('notifications');
  if ('vibrate' in navigator) enabledFeatures.push('haptic_feedback');
  if ('bluetooth' in navigator) enabledFeatures.push('bluetooth');
  if ('serial' in navigator) enabledFeatures.push('serial_port');
  if ('gpu' in navigator) enabledFeatures.push('webgpu');
  if (typeof WebSocket !== 'undefined') enabledFeatures.push('websocket');
  if (typeof Worker !== 'undefined') enabledFeatures.push('web_workers');

  // Model status would come from actual model loaders
  const modelStatus: Record<string, 'loaded' | 'loading' | 'error' | 'unloaded'> = {
    vision_object_detection: 'unloaded',
    vision_face_detection: 'unloaded',
    hearing_stt: 'unloaded',
    hearing_emotion: 'unloaded',
  };

  return {
    type: 'capability',
    availableSenses,
    enabledFeatures,
    modelStatus,
  };
}

/**
 * Calcule l'état émotionnel simulé basé sur les métriques
 */
function calculateEmotionalState(systemMetrics: ProprioceptionSystemPayload): ProprioceptionEmotionalPayload {
  // Calculate stress based on system load
  const cpuStress = systemMetrics.cpuUsage / 100;
  const memStress = systemMetrics.memoryUsage / 100;
  const stressLevel = (cpuStress + memStress) / 2;

  // Energy based on battery (if available) or inverse of stress
  let energyLevel = 1 - stressLevel * 0.5;
  if (systemMetrics.batteryLevel !== undefined) {
    energyLevel = systemMetrics.batteryLevel / 100;
  }

  // Confidence based on recent performance stability
  const avgPerformance = performanceHistory.length > 0
    ? performanceHistory.reduce((a, b) => a + b, 0) / performanceHistory.length
    : 50;
  const confidence = Math.max(0.3, Math.min(1, 1 - (avgPerformance - 50) / 100));

  // Determine mood
  let mood: ProprioceptionEmotionalPayload['mood'];
  if (errorCount > 5 || stressLevel > 0.8) {
    mood = 'alert';
  } else if (stressLevel > 0.6) {
    mood = 'concerned';
  } else if (energyLevel < 0.2) {
    mood = 'tired';
  } else if (stressLevel < 0.3 && energyLevel > 0.6) {
    mood = 'happy';
  } else {
    mood = 'neutral';
  }

  return {
    type: 'emotional',
    mood,
    energyLevel,
    stressLevel,
    confidence,
  };
}

/**
 * Obtient l'état de la mémoire conversationnelle
 */
function getMemoryMetrics(): ProprioceptionMemoryPayload {
  // These would normally come from actual memory stores
  return {
    type: 'memory',
    shortTermCount: 0, // Would query short-term memory store
    longTermCount: 0, // Would query long-term memory store
    contextWindowUsed: 0, // Would track token usage
    contextWindowMax: 128000, // GPT-4 context window
  };
}

/**
 * Mise à jour complète des métriques
 */
async function updateMetrics(): Promise<void> {
  try {
    // System metrics
    const systemMetrics = await getSystemMetrics();
    emitPercept(systemMetrics, 0.95, 'system');

    // Track CPU for history
    performanceHistory.push(systemMetrics.cpuUsage);
    if (performanceHistory.length > MAX_HISTORY_SIZE) {
      performanceHistory.shift();
    }

    // State metrics
    const stateMetrics = getStateMetrics();
    emitPercept(stateMetrics, 1.0, 'state');

    // Capability metrics (less frequent)
    if (Math.random() < 0.1) { // ~10% of updates
      const capabilityMetrics = getCapabilityMetrics();
      emitPercept(capabilityMetrics, 1.0, 'capability');
    }

    // Emotional state
    const emotionalMetrics = calculateEmotionalState(systemMetrics);
    emitPercept(emotionalMetrics, 0.8, 'emotional');

    // Memory metrics
    const memoryMetrics = getMemoryMetrics();
    emitPercept(memoryMetrics, 0.9, 'memory');

  } catch (error) {
    console.error('[Proprioception] Update error:', error);
    errorCount++;
  }
}

/**
 * Enregistre une erreur
 */
export function recordError(): void {
  errorCount++;
}

/**
 * Réinitialise le compteur d'erreurs
 */
export function resetErrorCount(): void {
  errorCount = 0;
}

/**
 * Enregistre le début d'une tâche
 */
export function startTask(agentId?: string): void {
  processingTasks++;
  if (agentId && !activeAgentsList.includes(agentId)) {
    activeAgentsList.push(agentId);
  }
}

/**
 * Enregistre la fin d'une tâche
 */
export function endTask(agentId?: string): void {
  processingTasks = Math.max(0, processingTasks - 1);
  if (agentId) {
    activeAgentsList = activeAgentsList.filter(id => id !== agentId);
  }
}

/**
 * Met à jour le statut d'un modèle
 */
export function updateModelStatus(
  modelId: string, 
  status: 'loaded' | 'loading' | 'error' | 'unloaded'
): void {
  const capabilityMetrics = getCapabilityMetrics();
  capabilityMetrics.modelStatus[modelId] = status;
  emitPercept(capabilityMetrics, 1.0, 'model_status_update');
}

/**
 * Met à jour les métriques mémoire
 */
export function updateMemoryMetrics(
  shortTermCount: number,
  longTermCount: number,
  contextWindowUsed: number
): void {
  const memoryMetrics: ProprioceptionMemoryPayload = {
    type: 'memory',
    shortTermCount,
    longTermCount,
    contextWindowUsed,
    contextWindowMax: 128000,
  };
  emitPercept(memoryMetrics, 0.95, 'memory_update');
}

/**
 * Initialise la proprioception
 */
async function initialize(): Promise<void> {
  if (isInitialized) {
    console.warn('[Proprioception] Already initialized');
    return;
  }

  startTime = Date.now();
  errorCount = 0;
  processingTasks = 0;
  activeAgentsList = [];

  // Initial update
  await updateMetrics();

  // Start periodic updates
  updateInterval = setInterval(updateMetrics, UPDATE_INTERVAL);

  isInitialized = true;
  console.log('[Proprioception] Sense initialized');
}

/**
 * Termine la proprioception
 */
function terminate(): void {
  if (!isInitialized) return;

  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  performanceHistory.length = 0;

  isInitialized = false;
  console.log('[Proprioception] Sense terminated');
}

/**
 * Configure le callback pour les percepts
 */
function setOnPerceptCallback(callback: ProprioceptionPerceptCallback | null): void {
  onPerceptCallback = callback;
}

/**
 * Vérifie si le sens est prêt
 */
export function isProprioceptionReady(): boolean {
  return isInitialized;
}

/**
 * Obtient l'uptime en secondes
 */
export function getUptime(): number {
  return Math.round((Date.now() - startTime) / 1000);
}

/**
 * Force une mise à jour immédiate
 */
export async function forceUpdate(): Promise<void> {
  await updateMetrics();
}

export const proprioceptionSense = {
  initialize,
  terminate,
  setOnPerceptCallback,
  recordError,
  resetErrorCount,
  startTask,
  endTask,
  updateModelStatus,
  updateMemoryMetrics,
  getUptime,
  forceUpdate,
  isReady: isProprioceptionReady,
};
