import { audioAdapter } from '../../services/AudioAdapter';
import type { Percept } from '../../types';
import config from '../../config';
import HearingWorker from './worker?worker';
import type { LegacyHearingPerceptPayload } from './types';

// AudioWorklet processor URL - Vite handles this import
import audioWorkletUrl from './audioProcessor.worklet.ts?url';

export type { LegacyHearingPerceptPayload as HearingPerceptPayload };

let onPerceptCallback: ((percept: Percept<LegacyHearingPerceptPayload>) => void) | null = null;
let isInitialized = false;
let worker: Worker | null = null;
let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let workletNode: AudioWorkletNode | null = null;

/**
 * Initializes the hearing system.
 */
export async function initializeHearingWorker(): Promise<void> {
  if (isInitialized) return;

  if (config.features.advancedHearing) {
    try {
      worker = new HearingWorker();

      worker.onmessage = (e: MessageEvent) => {
        const { type, payload, modality, confidence, timestamp } = e.data;

        if (modality === 'hearing') {
          const percept = {
            modality: 'hearing' as const,
            payload: payload,
            confidence: confidence || 0,
            ts: timestamp || Date.now()
          };
          updateStoreAndNotify(percept);
        } else if (type === 'MODEL_LOADED' && !e.data.success) {
          console.error('[Hearing] Model loading failed:', e.data.error);
        }
      };

      worker.postMessage({ type: 'LOAD_STT_MODEL' });
      isInitialized = true;
      return;
    } catch (err) {
      console.error('[Hearing] Worker init failed, falling back.', err);
    }
  }

  // Fallback / Standard Mode
  try {
    await audioAdapter.initialize();

    audioAdapter.setOnPerceptCallback((percept) => {
      updateStoreAndNotify(percept as Percept<LegacyHearingPerceptPayload>);
    });

    isInitialized = true;
  } catch (error) {
    console.error('[Hearing] Failed to initialize via Adapter:', error);
  }
}

function updateStoreAndNotify(percept: Percept<LegacyHearingPerceptPayload>) {
  import('../../store/audioStore').then(({ useAudioStore }) => {
    useAudioStore.getState().addHearingPercept(percept);
  });
  if (onPerceptCallback) {
    onPerceptCallback(percept);
  }
}

export async function startListening(): Promise<void> {
  if (!isInitialized) await initializeHearingWorker();

  if (worker && config.features.advancedHearing) {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext({ sampleRate: 16000 }); // Whisper expects 16k

      // Load AudioWorklet module (replaces deprecated ScriptProcessorNode)
      await audioContext.audioWorklet.addModule(audioWorkletUrl);

      const source = audioContext.createMediaStreamSource(mediaStream);

      // Create AudioWorkletNode instead of ScriptProcessorNode
      workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

      // Handle messages from the worklet processor
      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'AUDIO_DATA') {
          // Send audio data to Whisper worker
          worker?.postMessage({ type: 'PROCESS_AUDIO', payload: event.data.payload });
        }
      };

      // Connect: source -> workletNode -> destination
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
    } catch (e) {
      console.error('[Hearing] Mic capture failed', e);
      // Fallback to adapter if AudioWorklet fails
      void audioAdapter.startListening();
    }
  } else {
    void audioAdapter.startListening();
  }
}

export function stopListening(): void {
  if (worker && config.features.advancedHearing) {
    // Disconnect and cleanup AudioWorklet
    workletNode?.disconnect();
    audioContext?.close();
    mediaStream?.getTracks().forEach(t => t.stop());
    workletNode = null;
    audioContext = null;
    mediaStream = null;
  } else {
    audioAdapter.stopListening();
  }
}

export function setOnPerceptCallback(callback: ((percept: Percept<LegacyHearingPerceptPayload>) => void) | null) {
  onPerceptCallback = callback;
}

export function setOnSdkPerceptCallback(callback: any) {
  console.warn('[Hearing] setOnSdkPerceptCallback is deprecated.');
}

export function isHearingReady(): boolean {
  return isInitialized;
}

export function terminateHearingWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  audioAdapter.terminate();
  isInitialized = false;
}

export const hearingSense = {
  initialize: initializeHearingWorker,
  startListening,
  stopListening,
  start: () => {
    void initializeHearingWorker();
    startListening();
  },
  stop: () => {
    stopListening();
    terminateHearingWorker();
  },
  terminate: terminateHearingWorker,
  setOnPerceptCallback: setOnPerceptCallback,
  setOnSdkPerceptCallback: setOnSdkPerceptCallback,
};