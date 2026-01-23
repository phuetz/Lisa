import type { HearingConfig, HearingPercept } from './types';

const DEFAULT_CONFIG: HearingConfig = {
  features: {
    enableWhisper: true,
    enableSentiment: false,
    enableEmotion: false
  }
};

export class HearingService {
  private config: HearingConfig;
  private worker: Worker | null = null;
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private callbacks: Set<(percept: HearingPercept) => void> = new Set();
  private isInitialized = false;

  constructor(config: Partial<HearingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(workerUrl?: string, _processorUrl?: string) {
    if (this.isInitialized) return;

    if (this.config.features.enableWhisper && typeof Worker !== 'undefined') {
      if (workerUrl) {
        this.worker = new Worker(workerUrl, { type: 'module' });
        this.worker.onmessage = (e) => {
          if (e.data.modality === 'hearing') this.notify(e.data);
        };
        this.worker.postMessage({ type: 'LOAD_STT_MODEL' });
      }
    }

    this.isInitialized = true;
  }

  // Define interfaces locally to avoid using 'any'
  private startWebSpeech() {
    // Basic Web Speech Implementation
    const SpeechRecognition = (window as unknown as { 
      SpeechRecognition: new () => SpeechRecognitionMock; 
      webkitSpeechRecognition: new () => SpeechRecognitionMock 
    }).SpeechRecognition || 
    (window as unknown as { 
      SpeechRecognition: new () => SpeechRecognitionMock; 
      webkitSpeechRecognition: new () => SpeechRecognitionMock 
    }).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: SpeechRecognitionEventMock) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript;
        this.notify({
          modality: 'hearing',
          payload: { text },
          confidence: event.results[last][0].confidence,
          timestamp: Date.now(),
          source: 'web-speech-api'
        });
      };
      
      recognition.start();
    }
  }

  async startListening(processorUrl?: string) {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (processorUrl && this.config.features.enableWhisper) {
        await this.audioCtx.audioWorklet.addModule(processorUrl);
        const source = this.audioCtx.createMediaStreamSource(this.micStream);
        this.workletNode = new AudioWorkletNode(this.audioCtx, 'audio-processor');
        
        this.workletNode.port.onmessage = (e) => {
          if (this.worker) {
            this.worker.postMessage({ type: 'PROCESS_AUDIO', payload: e.data }, [e.data.buffer]);
          }
        };

        source.connect(this.workletNode);
      } else {
        // Fallback Web Speech API would go here
        this.startWebSpeech();
      }
    } catch (e) {
      console.error('[HearingSDK] Failed to start listening:', e);
    }
  }

  stopListening() {
    this.micStream?.getTracks().forEach(t => t.stop());
    this.workletNode?.disconnect();
    this.audioCtx?.suspend();
  }

  public onPercept(callback: (p: HearingPercept) => void) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notify(percept: HearingPercept) {
    this.callbacks.forEach(cb => cb(percept));
  }

  public terminate() {
    this.stopListening();
    this.worker?.terminate();
    this.audioCtx?.close();
    this.callbacks.clear();
    this.isInitialized = false;
  }
}

// Minimal interfaces for Web Speech API
interface SpeechRecognitionMock {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEventMock) => void;
  start: () => void;
}

interface SpeechRecognitionEventMock {
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}
