import { VisionService, type VisionPercept } from '@lisa-sdk/vision';
import type { Percept } from '../types';
import { adapterSdkToLegacy } from '../features/vision/converters/vision.converter';

/**
 * Adapter bridging the new @lisa-sdk/vision package to the legacy application logic.
 */
class VisionAdapter {
  private service: VisionService;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.service = new VisionService();
  }

  /**
   * Initialize the Vision Engine (SDK).
   */
  async initialize(): Promise<void> {
    // TODO: Handle Worker URL correctly to enable off-main-thread processing.
    // Currently relying on SDK's internal CPU fallback if worker URL is missing.
    console.log('[VisionAdapter] Initializing SDK VisionService...');
    await this.service.initialize();
  }

  /**
   * Process a single frame.
   */
  processFrame(frame: ImageData | HTMLVideoElement): void {
    this.service.processFrame(frame);
  }

  /**
   * Bridge SDK events to Legacy callback.
   */
  setOnPerceptCallback(callback: (percept: Percept<any>) => void): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.unsubscribe = this.service.onPercept((sdkPercept: VisionPercept) => {
      // Use the existing converter to map SDK types to Legacy types
      // We cast to any here because the app's local type definitions might strictly 
      // mismatch the package's types during this transition phase.
      const legacyPayload = adapterSdkToLegacy(sdkPercept as any); 
      
      const legacyPercept: Percept<any> = {
        modality: 'vision',
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

export const visionAdapter = new VisionAdapter();
