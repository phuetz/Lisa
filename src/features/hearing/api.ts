import { audioAdapter } from '../../services/AudioAdapter';
import type { Percept } from '../../types';
import { useAppStore } from '../../store/appStore';
import config from '../../config';
import HearingWorker from './worker?worker';
import type { LegacyHearingPerceptPayload } from './types';

export type { LegacyHearingPerceptPayload as HearingPerceptPayload };

let onPerceptCallback: ((percept: Percept<LegacyHearingPerceptPayload>) => void) | null = null;
let isInitialized = false;
let worker: Worker | null = null;
let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let processor: ScriptProcessorNode | null = null;

/**
 * Initializes the hearing system.
 */
export async function initializeHearingWorker(): Promise<void> {
  if (isInitialized) return;

  if (config.features.advancedHearing) {
    try {
        console.log('[Hearing] Initializing Advanced Hearing Worker (Whisper)...');
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
            } else if (type === 'MODEL_LOADED') {
                console.log('[Hearing] Model Loaded:', e.data.success ? 'Success' : e.data.error);
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
    console.log('[Hearing] Initializing via AudioAdapter (Web Speech API)...');
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
    useAppStore.setState((state) => ({
        hearingPercepts: [...(state.hearingPercepts || []), percept].slice(-50),
    }));
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
        const source = audioContext.createMediaStreamSource(mediaStream);
        // Buffer 16384 = ~1s. 
        // Note: Whisper works best on phrases. This naive streaming is experimental.
        processor = audioContext.createScriptProcessor(16384, 1, 1);
        
        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            // Send to worker
            worker?.postMessage({ type: 'PROCESS_AUDIO', payload: inputData });
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
        console.log('[Hearing] Advanced Listening Started');
     } catch (e) {
         console.error('[Hearing] Mic capture failed', e);
     }
  } else {
     void audioAdapter.startListening();
  }
}

export function stopListening(): void {
  if (worker && config.features.advancedHearing) {
      processor?.disconnect();
      audioContext?.close();
      mediaStream?.getTracks().forEach(t => t.stop());
      processor = null;
      audioContext = null;
      mediaStream = null;
      console.log('[Hearing] Advanced Listening Stopped');
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