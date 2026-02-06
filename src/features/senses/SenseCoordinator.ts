/**
 * SenseCoordinator - Unified coordination of Lisa's 5 senses
 *
 * Provides a single point of access for:
 * - Initializing/terminating all senses
 * - Subscribing to percepts from any or all senses
 * - Health monitoring and error tracking
 * - Sense lifecycle management
 *
 * @example
 * ```typescript
 * const coordinator = SenseCoordinator.getInstance();
 * await coordinator.initialize();
 *
 * // Subscribe to all percepts
 * const unsubscribe = coordinator.subscribeAll((percept) => {
 *   console.log(`[${percept.modality}]`, percept.payload);
 * });
 *
 * // Subscribe to specific sense
 * coordinator.subscribe('vision', (percept) => {
 *   console.log('Vision:', percept.payload);
 * });
 * ```
 */

import type {
  Sense,
  SenseConfig,
  SensesConfig,
  SenseHealthStatus,
  SenseStatus,
  PerceptCallback,
  AnyPerceptCallback,
  Unsubscribe,
  AnyPercept,
  SenseModality,
} from './types';

import { DEFAULT_SENSES_CONFIG } from '../../senses';

/* ---------- Sense Adapters ---------- */

// Import senses lazily to avoid circular dependencies
async function importVisionSense() {
  const { visionSense } = await import('../../senses/vision');
  return visionSense;
}

async function importHearingSense() {
  const { hearingSense } = await import('../../senses/hearing');
  return hearingSense;
}

async function importTouchSense() {
  const { touchSense } = await import('../../senses/touch');
  return touchSense;
}

async function importEnvironmentSense() {
  const { environmentSense } = await import('../../senses/environment');
  return environmentSense;
}

async function importProprioceptionSense() {
  const { proprioceptionSense } = await import('../../senses/proprioception');
  return proprioceptionSense;
}

/* ---------- SenseCoordinator Class ---------- */

export class SenseCoordinator {
  private static instance: SenseCoordinator | null = null;

  private senses: Map<SenseModality, Sense> = new Map();
  private callbacks: Map<SenseModality, Set<PerceptCallback>> = new Map();
  private globalCallbacks: Set<AnyPerceptCallback> = new Set();
  private healthStatus: SenseHealthStatus;
  private initialized = false;
  private config: SensesConfig;

  private constructor() {
    this.config = DEFAULT_SENSES_CONFIG as SensesConfig;
    this.healthStatus = this.createInitialHealthStatus();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SenseCoordinator {
    if (!SenseCoordinator.instance) {
      SenseCoordinator.instance = new SenseCoordinator();
    }
    return SenseCoordinator.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    if (SenseCoordinator.instance) {
      SenseCoordinator.instance.terminate();
      SenseCoordinator.instance = null;
    }
  }

  /* ---------- Initialization ---------- */

  /**
   * Initialize all senses based on configuration
   */
  async initialize(config?: Partial<SensesConfig>): Promise<void> {
    if (this.initialized) {
      console.warn('[SenseCoordinator] Already initialized');
      return;
    }

    // Merge with default config
    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log('[SenseCoordinator] Initializing 5 senses...');

    const initPromises: Promise<void>[] = [];

    // Initialize enabled senses in parallel
    if (this.config.vision.enabled) {
      initPromises.push(this.initializeSense('vision', importVisionSense));
    }
    if (this.config.hearing.enabled) {
      initPromises.push(this.initializeSense('hearing', importHearingSense));
    }
    if (this.config.touch.enabled) {
      initPromises.push(this.initializeSense('touch', importTouchSense));
    }
    if (this.config.environment.enabled) {
      initPromises.push(this.initializeSense('environment', importEnvironmentSense));
    }
    if (this.config.proprioception.enabled) {
      initPromises.push(this.initializeSense('proprioception', importProprioceptionSense));
    }

    await Promise.all(initPromises);

    this.initialized = true;
    console.log(`[SenseCoordinator] Initialized ${this.senses.size}/5 senses`);
  }

  /**
   * Initialize a single sense
   */
  private async initializeSense(
    modality: SenseModality,
    importer: () => Promise<Sense>
  ): Promise<void> {
    try {
      const sense = await importer();

      // Adapt the sense to our interface
      const adaptedSense: Sense = {
        name: modality,
        initialize: sense.initialize,
        start: sense.start,
        stop: sense.stop,
        terminate: sense.terminate,
        setOnPerceptCallback: sense.setOnPerceptCallback,
        isActive: () => this.healthStatus[modality].active,
      };

      // Set up percept callback
      sense.setOnPerceptCallback((percept: AnyPercept) => {
        this.handlePercept(modality, percept);
      });

      // Initialize
      const senseConfig = this.config[modality];
      await sense.initialize(senseConfig);
      sense.start();

      this.senses.set(modality, adaptedSense);
      this.healthStatus[modality].active = true;

      console.log(`[SenseCoordinator] ${modality} sense initialized`);
    } catch (error) {
      console.error(`[SenseCoordinator] Failed to initialize ${modality}:`, error);
      this.healthStatus[modality].lastError = error instanceof Error ? error.message : String(error);
      this.healthStatus[modality].errorCount++;
    }
  }

  /* ---------- Termination ---------- */

  /**
   * Terminate all senses
   */
  async terminate(): Promise<void> {
    if (!this.initialized) return;

    console.log('[SenseCoordinator] Terminating all senses...');

    for (const [modality, sense] of this.senses) {
      try {
        sense.terminate();
        this.healthStatus[modality].active = false;
      } catch (error) {
        console.error(`[SenseCoordinator] Error terminating ${modality}:`, error);
      }
    }

    this.senses.clear();
    this.callbacks.clear();
    this.globalCallbacks.clear();
    this.initialized = false;

    console.log('[SenseCoordinator] All senses terminated');
  }

  /* ---------- Subscription ---------- */

  /**
   * Subscribe to percepts from a specific sense
   */
  subscribe(modality: SenseModality, callback: PerceptCallback): Unsubscribe {
    if (!this.callbacks.has(modality)) {
      this.callbacks.set(modality, new Set());
    }
    this.callbacks.get(modality)!.add(callback);

    return () => {
      this.callbacks.get(modality)?.delete(callback);
    };
  }

  /**
   * Subscribe to percepts from all senses
   */
  subscribeAll(callback: AnyPerceptCallback): Unsubscribe {
    this.globalCallbacks.add(callback);

    return () => {
      this.globalCallbacks.delete(callback);
    };
  }

  /**
   * Handle incoming percept
   */
  private handlePercept(modality: SenseModality, percept: AnyPercept): void {
    // Update health status
    this.healthStatus[modality].lastPercept = Date.now();

    // Notify modality-specific subscribers
    const modalityCallbacks = this.callbacks.get(modality);
    if (modalityCallbacks) {
      for (const cb of modalityCallbacks) {
        try {
          cb(percept);
        } catch (error) {
          console.error(`[SenseCoordinator] Callback error for ${modality}:`, error);
        }
      }
    }

    // Notify global subscribers
    for (const cb of this.globalCallbacks) {
      try {
        cb(percept);
      } catch (error) {
        console.error('[SenseCoordinator] Global callback error:', error);
      }
    }
  }

  /* ---------- Control ---------- */

  /**
   * Start a specific sense
   */
  startSense(modality: SenseModality): void {
    const sense = this.senses.get(modality);
    if (sense) {
      sense.start();
      this.healthStatus[modality].active = true;
    }
  }

  /**
   * Stop a specific sense
   */
  stopSense(modality: SenseModality): void {
    const sense = this.senses.get(modality);
    if (sense) {
      sense.stop();
      this.healthStatus[modality].active = false;
    }
  }

  /**
   * Enable/disable a sense
   */
  setSenseEnabled(modality: SenseModality, enabled: boolean): void {
    this.config[modality].enabled = enabled;
    if (enabled) {
      this.startSense(modality);
    } else {
      this.stopSense(modality);
    }
  }

  /* ---------- Health & Status ---------- */

  /**
   * Get health status for all senses
   */
  getHealthStatus(): SenseHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Get status for a specific sense
   */
  getSenseStatus(modality: SenseModality): SenseStatus {
    return { ...this.healthStatus[modality] };
  }

  /**
   * Check if coordinator is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get active senses count
   */
  getActiveSensesCount(): number {
    return Array.from(this.senses.values()).filter(
      s => this.healthStatus[s.name].active
    ).length;
  }

  /**
   * Get sense by modality
   */
  getSense(modality: SenseModality): Sense | undefined {
    return this.senses.get(modality);
  }

  /**
   * Get current configuration
   */
  getConfig(): SensesConfig {
    return { ...this.config };
  }

  /* ---------- Private Helpers ---------- */

  private createInitialHealthStatus(): SenseHealthStatus {
    const createStatus = (): SenseStatus => ({
      active: false,
      lastPercept: null,
      errorCount: 0,
      lastError: null,
    });

    return {
      vision: createStatus(),
      hearing: createStatus(),
      touch: createStatus(),
      environment: createStatus(),
      proprioception: createStatus(),
    };
  }
}

/* ---------- Singleton Export ---------- */

export const senseCoordinator = SenseCoordinator.getInstance();
