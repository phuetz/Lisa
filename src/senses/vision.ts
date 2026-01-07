import type { Percept } from '../types';
import config, { AVAILABLE_VISION_MODELS } from '../config';
import { ObjectDetector, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { useAppStore } from '../store/appStore';
import type { SdkVisualPercept, SdkVisualObject, SdkVisualPayload } from './types';
import { adapterSdkToLegacy } from './converters/vision.converter';

// --- SDK TYPES & ADAPTERS ---
// Moved to ./types.ts and ./converters/vision.converter.ts to allow side-effect free imports.

let visionWorker: Worker | null = null;
let isWorkerInitialized = false;

let isModelLoaded = false;
let onPerceptCallback: ((percept: Percept<VisionPayload>) => void) | null = null;
// New SDK Channel
let onSdkPerceptCallback: ((percept: SdkVisualPercept) => void) | null = null;

// CPU Fallback state
let cpuObjectDetector: ObjectDetector | null = null;
let cpuPoseLandmarker: PoseLandmarker | null = null;
let isCpuFallbackInitialized = false;
let isCpuProcessing = false;

/**
 * Initializes the vision Web Worker and loads the model.
 */
export async function initializeVisionWorker(): Promise<void> {
  if (isWorkerInitialized) {
    console.warn('[Vision] Worker already initialized.');
    return;
  }

  // Check if advanced vision is enabled
  if (!config.features.advancedVision) {
    console.log('[Vision] Advanced vision is disabled in config. Skipping worker initialization.');
    return;
  }

  // Check for Web Worker support
  if (typeof Worker === 'undefined') {
    console.error('[Vision] Web Workers are not supported in this environment.');
    console.log('[Vision] Falling back to CPU processing (MediaPipe fallback).');
    await initializeCpuFallback();
    return;
  }

  try {
    // Instantiate Worker from SDK via Factory (Lazy Import)
    const { createVisionWorker } = await import('./runtime/vision.factory');
    visionWorker = createVisionWorker();

    visionWorker.onmessage = (event: MessageEvent) => {
      const data = event.data as any;

      // Handle model loaded event
      if (data && data.type === 'MODEL_LOADED') {
        isModelLoaded = data.success || false;
        if (data.success) {
          console.log('[Vision] Model loaded successfully in worker (SDK)');
        } else {
          console.error('[Vision] Model failed to load:', data.error);
          void initializeCpuFallback();
        }
        return;
      }

      // Handle Percepts via the unified emitter
      if (data && data.modality === 'vision' && data.payload) {
        let sdkPercept: SdkVisualPercept | null = null;

        // Case 1: New Standard (objects array)
        if (data.payload.objects) {
          sdkPercept = data as SdkVisualPercept;
        } 
        // Case 2: Legacy SDK Format (parallel arrays) -> Adapt to New Standard
        else if (data.payload.boxes) {
           const objects = data.payload.boxes.map((box: number[], i: number) => ({
             label: data.payload.classes[i],
             confidence: data.payload.scores[i],
             bbox: box as [number, number, number, number]
           }));
           
           sdkPercept = {
             modality: 'vision',
             confidence: data.confidence,
             ts: data.ts,
             payload: {
               objects,
               timestamp: data.ts
             }
           } as SdkVisualPercept;
        }

        if (sdkPercept) {
          emitPercept(sdkPercept);
        }
      }
    };

    visionWorker.onerror = (error: ErrorEvent) => {
      console.error('[Vision] Worker error:', error);
      // Attempt to restart worker on error or fallback
      terminateVisionWorker();
      console.log('[Vision] Worker failed, switching to CPU fallback...');
      void initializeCpuFallback();
    };

    // Get selected model URL
    const selectedModelId = useAppStore.getState().selectedVisionModel;
    const modelConfig = AVAILABLE_VISION_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_VISION_MODELS[0];
    const modelUrl = modelConfig.type === 'tfjs' ? modelConfig.url : undefined;

    // Send a message to the worker to load the model
    visionWorker.postMessage({ type: 'LOAD_MODEL', payload: { modelUrl } });
    isWorkerInitialized = true;
    console.log(`[Vision] Worker initialized. Loading model: ${modelConfig.name}`);

    // If fall detector is enabled, we need CPU PoseLandmarker as well
    if (config.features.fallDetector) {
      console.log('[Vision] Fall detector enabled, initializing CPU fallback for pose detection...');
      void initializeCpuFallback();
    }
  } catch (error) {
    console.error('[Vision] Failed to initialize worker:', error);
    visionWorker = null;
    isWorkerInitialized = false;
    await initializeCpuFallback();
  }
}

/**
 * Initializes the CPU fallback using MediaPipe ObjectDetector and PoseLandmarker
 */
async function initializeCpuFallback(): Promise<void> {
  if (isCpuFallbackInitialized) return;

  try {
    console.log('[Vision] Initializing CPU fallback (MediaPipe)...');
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
    );

    // Initialize Object Detector
    cpuObjectDetector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
        delegate: 'CPU'
      },
      scoreThreshold: 0.5,
      runningMode: 'VIDEO'
    });

    // Initialize Pose Landmarker (needed for Fall Detection)
    try {
      cpuPoseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'CPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });
      console.log('[Vision] CPU PoseLandmarker initialized.');
    } catch (e) {
      console.warn('[Vision] CPU PoseLandmarker failed to initialize:', e);
    }

    isCpuFallbackInitialized = true;
    isModelLoaded = true; // Consider system ready if fallback is ready
    console.log('[Vision] CPU fallback initialized successfully.');
  } catch (error) {
    console.error('[Vision] Failed to initialize CPU fallback:', error);
  }
}

/**
 * Processes a video frame using the vision worker or CPU fallback.
 * @param frame The video frame (e.g., ImageData, HTMLVideoElement).
 */
export function processVideoFrame(frame: ImageData | HTMLVideoElement): void {
  // Try Worker first
  if (isWorkerInitialized && visionWorker && isModelLoaded) {
    if (frame instanceof HTMLVideoElement) {
      // Use createImageBitmap for efficient transfer to worker
      createImageBitmap(frame).then(bitmap => {
        if (visionWorker) {
          visionWorker.postMessage({ type: 'PROCESS_FRAME', payload: bitmap }, [bitmap]);
        }
      }).catch(err => {
        console.error('[Vision] Failed to create ImageBitmap:', err);
      });
    } else {
      visionWorker.postMessage({ type: 'PROCESS_FRAME', payload: frame });
    }
    
    // Note: If the worker only does object detection, we might still want to run Pose on CPU
    // if fall detection is enabled.
    if (config.features.fallDetector && isCpuFallbackInitialized && cpuPoseLandmarker) {
      void processCpuPose(frame);
    }
    return;
  }

  // Fallback to CPU
  if (isCpuFallbackInitialized) {
    void processCpuFrame(frame);
  } else {
    // Try to initialize if not ready (lazy init)
    if (!isCpuFallbackInitialized && !isWorkerInitialized) {
      void initializeCpuFallback();
    }
  }
}

/**
 * Process frame on CPU (Object Detection)
 */
async function processCpuFrame(frame: ImageData | HTMLVideoElement): Promise<void> {
  if (isCpuProcessing) return;

  isCpuProcessing = true;
  try {
    const startTimeMs = performance.now();
    const width = (frame instanceof HTMLVideoElement) ? frame.videoWidth : frame.width;
    const height = (frame instanceof HTMLVideoElement) ? frame.videoHeight : frame.height;

    // Run Object Detection
    if (cpuObjectDetector) {
      const detections = cpuObjectDetector.detectForVideo(frame, startTimeMs);

      // Convert MediaPipe detections to our Percept format
      const boxes: Array<[number, number, number, number]> = [];
      const classes: string[] = [];
      const scores: number[] = [];

      for (const detection of detections.detections) {
        const bbox = detection.boundingBox;
        if (bbox && width > 0 && height > 0) {
          // Normalize coordinates (0-1)
          boxes.push([
            bbox.originX / width,
            bbox.originY / height,
            (bbox.originX + bbox.width) / width,
            (bbox.originY + bbox.height) / height
          ]);

          if (detection.categories.length > 0) {
            classes.push(detection.categories[0].categoryName);
            scores.push(detection.categories[0].score);
          } else {
            classes.push('unknown');
            scores.push(0.0);
          }
        }
      }

      if (boxes.length > 0) {
        emitPercept({
          modality: 'vision',
          confidence: Math.max(...scores),
          timestamp: Date.now(),
          payload: {
            timestamp: Date.now(),
            objects: boxes.map((box, i) => ({
              label: classes[i],
              confidence: scores[i],
              bbox: box as [number, number, number, number]
            }))
          }
        });
      }
    }

    // Run Pose Detection if enabled
    if (config.features.fallDetector && cpuPoseLandmarker) {
      await processCpuPose(frame);
    }

  } catch (error) {
    console.error('[Vision] CPU processing error:', error);
  } finally {
    isCpuProcessing = false;
  }
}

/**
 * Process Pose on CPU
 */
async function processCpuPose(frame: ImageData | HTMLVideoElement): Promise<void> {
  if (!cpuPoseLandmarker) return;
  
  try {
    const startTimeMs = performance.now();
    const res = cpuPoseLandmarker.detectForVideo(frame, startTimeMs);
    
    if (res && res.landmarks.length > 0) {
      for (const landmarks of res.landmarks) {
        emitLegacyPercept({
          modality: 'vision',
          payload: {
            type: 'pose',
            landmarks,
            score: 0.9,
          },
          confidence: 0.9,
          ts: Date.now()
        });
      }
    }
  } catch (error) {
    console.error('[Vision] CPU Pose processing error:', error);
  }
}

/**
 * Check if the vision model is loaded and ready
 */
export function isVisionModelReady(): boolean {
  return (isWorkerInitialized && isModelLoaded) || isCpuFallbackInitialized;
}

/**
 * Terminates the vision worker.
 */
export function terminateVisionWorker(): void {
  if (visionWorker) {
    visionWorker.terminate();
    visionWorker = null;
    isWorkerInitialized = false;
    console.log('Vision worker terminated.');
  }

  if (cpuObjectDetector) {
    cpuObjectDetector.close();
    cpuObjectDetector = null;
    isCpuFallbackInitialized = false;
  }
}

// MediaPipe Payload Types
export interface MediaPipeFacePayload {
  type: 'face';
  boxes: Array<[number, number, number, number]>;
  landmarks: unknown;
  classes: string[];
  scores: number[];
  isSmiling: boolean;
}

export interface MediaPipeHandPayload {
  type: 'hand';
  boxes: Array<[number, number, number, number]>;
  landmarks: unknown;
  handedness: 'Left' | 'Right';
  scores: number[];
}

export interface MediaPipeObjectPayload {
  type: 'object';
  boxes: Array<[number, number, number, number]>;
  classes: string[];
  scores: number[];
}

export interface MediaPipePosePayload {
  type: 'pose';
  landmarks: unknown;
  score: number;
}

export interface MediaPipeImageClassificationPayload {
  type: 'image_classification';
  classifications: Array<{
    category: string;
    score: number;
    displayName: string;
  }>;
  topCategory: string;
  topScore: number;
}

export interface MediaPipeGesturePayload {
  type: 'gesture';
  gestures: Array<{
    name: string;
    score: number;
    displayName?: string;
  }>;
  handedness: string;
  landmarks: unknown;
}

export interface MediaPipeSegmentationPayload {
  type: 'segmentation';
  width: number;
  height: number;
  hasConfidenceMask: boolean;
  maskDataAvailable: boolean;
}

export type VisionPayload =
  | MediaPipeFacePayload
  | MediaPipeHandPayload
  | MediaPipeObjectPayload
  | MediaPipePosePayload
  | MediaPipeImageClassificationPayload
  | MediaPipeGesturePayload
  | MediaPipeSegmentationPayload;

// Re-export Percept type with VisionPayload
export type { Percept, SdkVisualPercept };
export { adapterSdkToLegacy };

// Back-compat API expected by LisaCanvas
export function setOnPerceptCallback(cb: ((percept: Percept<VisionPayload>) => void) | null) {
  onPerceptCallback = cb;
}

/**
 * Sets the callback for the new SDK standard channel.
 * This allows consumers to opt-in to the new format.
 */
export function setOnSdkPerceptCallback(cb: ((percept: SdkVisualPercept) => void) | null) {
  onSdkPerceptCallback = cb;
}

/**
 * Internal helper to dispatch to both channels (Legacy via Adapter, and New SDK).
 * @param sdkPercept The standardized percept
 */
export function emitPercept(sdkPercept: SdkVisualPercept) {
  const legacyPercept: Percept<VisionPayload> = {
    modality: 'vision',
    payload: adapterSdkToLegacy(sdkPercept),
    confidence: sdkPercept.confidence,
    ts: sdkPercept.payload.timestamp || Date.now()
  };

  // 0. Update Store directly
  useAppStore.setState((state) => {
    const currentPercepts = state.percepts || [];
    return {
      percepts: [...currentPercepts, legacyPercept].slice(-50)
    };
  });

  // 1. Emit to new SDK channel
  if (onSdkPerceptCallback) {
    try {
      onSdkPerceptCallback(sdkPercept);
    } catch (e) {
      console.warn('[Vision] SDK callback error:', e);
    }
  }

  // 2. Adapt and emit to Legacy channel
  if (onPerceptCallback) {
    try {
      onPerceptCallback(legacyPercept);
    } catch (e) {
      console.warn('[Vision] Legacy callback error:', e);
    }
  }
}

/**
 * Helper to emit non-SDK (legacy) percepts directly
 */
export function emitLegacyPercept(percept: Percept<VisionPayload>) {
  // Update Store
  useAppStore.setState((state) => {
    const currentPercepts = state.percepts || [];
    return {
      percepts: [...currentPercepts, percept].slice(-50)
    };
  });

  if (onPerceptCallback) {
    onPerceptCallback(percept);
  }
}

export function start(): void {
  // Kick off worker initialization if not already running
  void initializeVisionWorker();
}

export function stop(): void {
  terminateVisionWorker();
}

/**
 * Switch vision model dynamically
 */
export async function setModel(modelId: string): Promise<void> {
  const modelConfig = AVAILABLE_VISION_MODELS.find(m => m.id === modelId);
  if (!modelConfig) {
    console.error(`[Vision] Model ${modelId} not found`);
    return;
  }

  if (modelConfig.type === 'tfjs') {
    // If worker is running, send new model URL
    if (visionWorker && isWorkerInitialized) {
      visionWorker.postMessage({ type: 'LOAD_MODEL', payload: { modelUrl: modelConfig.url } });
      console.log(`[Vision] Switching to TFJS model: ${modelConfig.name}`);
    } else {
      // Re-init worker
      await initializeVisionWorker();
    }
  } else if (modelConfig.type === 'mediapipe') {
    // Switch to CPU fallback
    if (visionWorker) {
      terminateVisionWorker();
    }
    await initializeCpuFallback();
    console.log(`[Vision] Switching to MediaPipe model: ${modelConfig.name}`);
  }
}

export const visionSense = {
  setOnPerceptCallback,
  start,
  stop,
  setModel,
};

// Provide compatibility alias for object detection payload expected by canvas
export type DetectionResult = MediaPipeObjectPayload;

// Optional: Initialize the worker when the module is imported,
// or expose an explicit initialization function.
// For now, we'll expose initializeVisionWorker.