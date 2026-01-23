// Generic loader for MediaPipe .task models
// Decides GPU vs CPU delegate based on availability with automatic fallback

// Model asset paths from CDN (MediaPipe December 2025)
const MODEL_PATHS: Record<string, string> = {
  FaceLandmarker: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  HandLandmarker: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  ObjectDetector: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
  PoseLandmarker: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  AudioClassifier: 'https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite',
  ImageClassifier: 'https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite',
  GestureRecognizer: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
  ImageSegmenter: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite',
  ImageEmbedder: 'https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite',
};

/**
 * Check if WebGPU is available
 */
function isGPUAvailable(): boolean {
  return !!(navigator as unknown as { gpu?: unknown }).gpu;
}

/**
 * Load a MediaPipe task with automatic GPU → CPU fallback
 * @param TaskCtor - The MediaPipe task constructor
 * @param taskName - Explicit task name (required because class names are minified in production)
 * @param gpuPreferred - Whether to prefer GPU delegate
 */
export async function loadTask<T extends { createFromOptions: (options: unknown) => Promise<unknown> }>(
  TaskCtor: T,
  taskName: string,
  gpuPreferred = true
): Promise<ReturnType<T['createFromOptions']> | null> {
  const modelAssetPath = MODEL_PATHS[taskName];

  if (!modelAssetPath) {
    console.warn(`[loadTask] No model path found for ${taskName}, skipping`);
    return null;
  }

  const runningMode = taskName === 'AudioClassifier' ? 'AUDIO_STREAM' : 'VIDEO';

  // Try GPU first if preferred and available
  if (gpuPreferred && isGPUAvailable()) {
    try {
      console.log(`[loadTask] Loading ${taskName} with GPU delegate...`);
      const result = await TaskCtor.createFromOptions({
        baseOptions: {
          modelAssetPath,
          delegate: 'GPU',
        },
        runningMode,
      });
      console.log(`[loadTask] ${taskName} loaded successfully with GPU`);
      return result as ReturnType<T['createFromOptions']>;
    } catch (gpuError) {
      const errorMessage = gpuError instanceof Error ? gpuError.message : String(gpuError);
      console.warn(`[loadTask] GPU initialization failed for ${taskName}: ${errorMessage}`);
      console.log(`[loadTask] Falling back to CPU delegate...`);
    }
  }

  // Fallback to CPU
  try {
    console.log(`[loadTask] Loading ${taskName} with CPU delegate...`);
    const result = await TaskCtor.createFromOptions({
      baseOptions: {
        modelAssetPath,
        delegate: 'CPU',
      },
      runningMode,
    });
    console.log(`[loadTask] ${taskName} loaded successfully with CPU`);
    return result as ReturnType<T['createFromOptions']>;
  } catch (cpuError) {
    const errorMessage = cpuError instanceof Error ? cpuError.message : String(cpuError);
    console.error(`[loadTask] Failed to load ${taskName} with CPU: ${errorMessage}`);
    return null;
  }
}

/**
 * Safely close a MediaPipe task to free resources
 */
export function closeTask(task: { close?: () => void } | null): void {
  if (task && typeof task.close === 'function') {
    try {
      task.close();
      console.log('[loadTask] Task closed successfully');
    } catch (error) {
      console.warn('[loadTask] Error closing task:', error);
    }
  }
}
