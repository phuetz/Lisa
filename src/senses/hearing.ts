// src/senses/hearing.ts
import { Percept } from '../types';

// Define the type for messages sent to the worker
interface HearingWorkerMessage {
  type: 'LOAD_STT_MODEL' | 'PROCESS_AUDIO';
  payload?: any;
}

// Define the type for messages received from the worker
export interface HearingPerceptPayload {
  text?: string;
  emotion?: string;
  sentiment?: string;
  intent?: string;
}

let hearingWorker: Worker | null = null;
let isWorkerInitialized = false;

// Callback for percepts received from the worker
let onPerceptCallback: ((percept: Percept<HearingPerceptPayload>) => void) | null = null;

/**
 * Initializes the hearing Web Worker and loads the STT model.
 */
async function initializeHearingWorker(): Promise<void> {
  if (isWorkerInitialized) {
    console.warn('Hearing worker already initialized.');
    return;
  }

  if (typeof Worker === 'undefined') {
    console.error('Web Workers are not supported in this environment. Falling back to Web Speech API (not yet implemented).');
    // TODO: Implement Web Speech API fallback here
    return;
  }

  hearingWorker = new Worker(new URL('../workers/hearingWorker.ts', import.meta.url), { type: 'module' });

  hearingWorker.onmessage = (event: MessageEvent<Percept<HearingPerceptPayload>>) => {
    if (onPerceptCallback) {
      onPerceptCallback(event.data);
    }
  };

  hearingWorker.onerror = (error: ErrorEvent) => {
    console.error('Hearing worker error:', error);
  };

  // Send a message to the worker to load the STT model and provide audio context/stream
  hearingWorker.postMessage({ type: 'LOAD_STT_MODEL', payload: { audioContext, mediaStream } });
  isWorkerInitialized = true;
  console.log('Hearing worker initialized and STT model load message sent.');
}

/**
 * Processes an audio chunk using the hearing worker.
 * @param audioData The audio data (e.g., Float32Array).
 */
function processAudioChunk(audioData: Float32Array): void {
  if (!isWorkerInitialized || !hearingWorker) {
    console.warn('Hearing worker not initialized. Cannot process audio chunk.');
    return;
  }

  hearingWorker.postMessage({ type: 'PROCESS_AUDIO', payload: audioData }, [audioData.buffer]);
}

/**
 * Sets the callback function for receiving hearing percepts.
 * @param callback The callback function.
 */
function setOnPerceptCallback(callback: ((percept: Percept<HearingPerceptPayload>) => void) | null) {
  onPerceptCallback = callback;
}

/**
 * Terminates the hearing worker.
 */
function terminateHearingWorker(): void {
  if (hearingWorker) {
    hearingWorker.terminate();
    hearingWorker = null;
    isWorkerInitialized = false;
    console.log('Hearing worker terminated.');
  }
}

export const hearingSense = {
  initialize: initializeHearingWorker,
  processAudio: processAudioChunk,
  terminate: terminateHearingWorker,
  setOnPerceptCallback: setOnPerceptCallback,
};