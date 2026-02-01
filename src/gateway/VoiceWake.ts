/**
 * Lisa Voice Wake
 */
import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface VoiceWakeConfig {
  enabled: boolean;
  wakeWord: string;
  sensitivity: number;
  listenContinuously: boolean;
}

export interface WakeEvent {
  timestamp: Date;
  confidence: number;
  wakeWord: string;
}

export interface VoiceWakeState {
  isListening: boolean;
  lastWake: Date | null;
  wakeCount: number;
}

export class VoiceWake extends BrowserEventEmitter {
  private config: VoiceWakeConfig;
  private state: VoiceWakeState = { isListening: false, lastWake: null, wakeCount: 0 };

  constructor(config: Partial<VoiceWakeConfig> = {}) {
    super();
    this.config = { enabled: true, wakeWord: 'Lisa', sensitivity: 0.5, listenContinuously: true, ...config };
  }

  start(): void { this.state.isListening = true; this.emit('started'); }
  stop(): void { this.state.isListening = false; this.emit('stopped'); }
  getState(): VoiceWakeState { return { ...this.state }; }
  getConfig(): VoiceWakeConfig { return { ...this.config }; }
}

let instance: VoiceWake | null = null;
export function getVoiceWake(): VoiceWake { if (!instance) instance = new VoiceWake(); return instance; }
export function resetVoiceWake(): void { if (instance) { instance.stop(); instance.removeAllListeners(); instance = null; } }

