import { visionAdapter } from '../../services/VisionAdapter';
import type { Percept, VisionPayload } from '../../types';
import { useAppStore } from '../../store/appStore';
import config from '../../config';
import VisionWorker from './worker?worker';

// --- LEGACY EXPORTS (Compatibility Layer) ---
export type { Percept, VisionPayload };
export { adapterSdkToLegacy } from './converters/vision.converter';

// Adapter for callback
let onPerceptCallback: ((percept: Percept<VisionPayload>) => void) | null = null;
let isInitialized = false;
let worker: Worker | null = null;

function updateStoreAndNotify(percept: Percept<VisionPayload>) {
    // 1. Update Legacy Store (Zustand)
    useAppStore.setState((state) => {
        const currentPercepts = state.percepts || [];
        return {
            percepts: [...currentPercepts, percept].slice(-50)
        };
    });

    // 2. Call the legacy callback registered by consumers
    if (onPerceptCallback) {
        onPerceptCallback(percept);
    }
}

/**
 * Initializes the vision system.
 * Uses local YOLOv8 Worker if advancedVision is enabled, otherwise falls back to SDK Adapter.
 */
export async function initializeVisionWorker(): Promise<void> {
  if (isInitialized) {
    console.warn('[Vision] Already initialized.');
    return;
  }
  
  if (config.features.advancedVision) {
    try {
        console.log('[Vision] Initializing Advanced Vision Worker (YOLOv8)...');
        worker = new VisionWorker();
        
        worker.onmessage = (e: MessageEvent) => {
            const { type, payload, modality, confidence, timestamp } = e.data;
            
            if (modality === 'vision') {
                const percept: Percept<VisionPayload> = {
                    modality: 'vision',
                    payload: payload, // Ensure payload structure matches VisionPayload
                    confidence: confidence || 0,
                    ts: timestamp || Date.now()
                };
                updateStoreAndNotify(percept);
            } else if (type === 'MODEL_LOADED') {
                console.log('[Vision] Worker Model Loaded:', e.data.success ? 'Success' : 'Failed');
            } else if (type === 'ERROR') {
                console.error('[Vision] Worker Error:', e.data.error);
            }
        };

        worker.postMessage({ type: 'LOAD_MODEL' });
        isInitialized = true;
        console.log('[Vision] Worker initialized.');
        return;
    } catch (err) {
        console.error('[Vision] Failed to init worker, falling back to Adapter.', err);
    }
  }

  // Fallback / Standard Mode via Adapter
  try {
    console.log('[Vision] Initializing via VisionAdapter (Packages)...');
    await visionAdapter.initialize();
    
    visionAdapter.setOnPerceptCallback((percept) => {
        updateStoreAndNotify(percept as Percept<VisionPayload>);
    });
    
    isInitialized = true;
    console.log('[Vision] System fully initialized via Adapter.');
  } catch (error) {
    console.error('[Vision] Failed to initialize via Adapter:', error);
  }
}

/**
 * Processes a video frame.
 */
export function processVideoFrame(frame: ImageData | HTMLVideoElement): void {
  if (!isInitialized) return;

  if (worker) {
      // Create bitmap for efficient transfer
      createImageBitmap(frame).then(bitmap => {
          if (worker) {
            worker.postMessage({ type: 'PROCESS_FRAME', payload: bitmap }, [bitmap]);
          }
      }).catch(err => console.error('[Vision] Frame conversion failed:', err));
  } else {
      visionAdapter.processFrame(frame);
  }
}

/**
 * Check if the vision model is loaded and ready.
 */
export function isVisionModelReady(): boolean {
  return isInitialized; 
}

/**
 * Legacy compatibility: Set the callback for percepts.
 */
export function setOnPerceptCallback(cb: ((percept: Percept<VisionPayload>) => void) | null) {
  onPerceptCallback = cb;
}

/**
 * Helper to emit non-SDK (legacy) percepts directly
 */
export function emitLegacyPercept(percept: Percept<VisionPayload>) {
    updateStoreAndNotify(percept);
}

export function start(): void {
  void initializeVisionWorker();
}

export function stop(): void {
  if (worker) {
      worker.terminate();
      worker = null;
  }
  visionAdapter.terminate();
  isInitialized = false;
  console.log('[Vision] Stopped.');
}

/**
 * Switch vision model dynamically.
 */
export async function setModel(modelId: string): Promise<void> {
    console.log('[Vision] setModel called via legacy API.', modelId);
    if (worker) {
         // TODO: Pass model URL to worker
    }
}

// SDK Interop (deprecated)
export function setOnSdkPerceptCallback(cb: any) {
    console.warn('[Vision] setOnSdkPerceptCallback is deprecated. Use adapter directly.');
}

export function emitPercept(sdkPercept: any) {
   // No-op
}

export const visionSense = {
  setOnPerceptCallback,
  start,
  stop,
  setModel,
};

// Compatibility Types
export type DetectionResult = any;