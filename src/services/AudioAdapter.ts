import { HearingService, type HearingPercept } from '@lisa-sdk/hearing';
import type { Percept } from '../types';
import { adapterAudioSdkToLegacy } from '../features/hearing/converters/hearing.converter';

/**
 * Adapter bridging the new @lisa-sdk/hearing package to the legacy application logic.
 */
class AudioAdapter {
  private service: HearingService;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.service = new HearingService();
  }

  /**
   * Initialize the Hearing Engine (SDK).
   */
  async initialize(): Promise<void> {
    console.log('[AudioAdapter] Initializing SDK HearingService...');
    // Currently relying on SDK's internal fallback logic
    await this.service.initialize();
  }

  /**
   * Start listening for audio.
   */
  async startListening(): Promise<void> {
    await this.service.startListening();
  }

  /**
   * Stop listening for audio.
   */
  stopListening(): void {
    this.service.stopListening();
  }

  /**
   * Bridge SDK events to Legacy callback.
   */
  setOnPerceptCallback(callback: (percept: Percept<any>) => void): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.unsubscribe = this.service.onPercept((sdkPercept: HearingPercept) => {
      // Map SDK types to Legacy types using existing converter
      // We adapt to the expected SdkAudioPercept format
      const legacyPayload = adapterAudioSdkToLegacy({
          modality: 'hearing',
          confidence: sdkPercept.confidence,
          payload: {
              transcription: sdkPercept.payload.text || '',
              confidence: sdkPercept.confidence,
              timestamp: sdkPercept.timestamp
          }
      } as any);
      
      const legacyPercept: Percept<any> = {
        modality: 'hearing',
        payload: legacyPayload,
        confidence: sdkPercept.confidence,
        ts: sdkPercept.timestamp
      };

      callback(legacyPercept);
    });
  }

  terminate(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.service.terminate();
  }
}

export const audioAdapter = new AudioAdapter();
