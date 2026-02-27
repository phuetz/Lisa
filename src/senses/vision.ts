// src/senses/vision.ts
import * as tf from '@tensorflow/tfjs';

// Define the type for messages sent to the worker
interface VisionWorkerMessage {
  type: 'LOAD_MODEL' | 'PROCESS_FRAME';
  payload?: any;
}

// Define the type for messages received from the worker
import { Percept } from '../types';

// Define the type for messages received from the worker
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface VisionResult extends Percept<any> {}

let visionWorker: Worker | null = null;
let isWorkerInitialized = false;

/**
 * Initializes the vision Web Worker and loads the model.
 */
export async function initializeVisionWorker(): Promise<void> {
  if (isWorkerInitialized) {
    console.warn('Vision worker already initialized.');
    return;
  }

  // Check for Web Worker support
  if (typeof Worker === 'undefined') {
    console.error('Web Workers are not supported in this environment. Falling back to main thread processing (not yet implemented).');
    // TODO: Implement CPU fallback here
    return;
  }

  visionWorker = new Worker(new URL('../workers/visionWorker.ts', import.meta.url), { type: 'module' });

  visionWorker.onmessage = (event: MessageEvent<VisionResult>) => {
    // Handle results from the worker
    console.log('Received vision result from worker:', event.data);
    // Here, you would typically dispatch an event to a global bus or store
    // For now, just log it.
  };

  visionWorker.onerror = (error: ErrorEvent) => {
    console.error('Vision worker error:', error);
  };

  // Send a message to the worker to load the model
  visionWorker.postMessage({ type: 'LOAD_MODEL' });
  isWorkerInitialized = true;
  console.log('Vision worker initialized and model load message sent.');
}

/**
 * Processes a video frame using the vision worker.
 * @param frame The video frame (e.g., ImageData, HTMLVideoElement).
 */
export function processVideoFrame(frame: ImageData | HTMLVideoElement): void {
  if (!isWorkerInitialized || !visionWorker) {
    console.warn('Vision worker not initialized. Cannot process frame.');
    return;
  }

  // In a real scenario, you might convert the frame to a transferable object
  // or send a reference. For simplicity, we'll assume the worker can handle it.
  visionWorker.postMessage({ type: 'PROCESS_FRAME', payload: frame });
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
}

// Optional: Initialize the worker when the module is imported,
// or expose an explicit initialization function.
// For now, we'll expose initializeVisionWorker.