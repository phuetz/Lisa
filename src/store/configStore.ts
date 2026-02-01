/**
 * Config Store - OpenClaw-Inspired Hot-Reload Configuration
 *
 * Provides centralized configuration management with:
 * - Persistence to localStorage
 * - Cross-tab synchronization
 * - Type-safe access with selectors
 * - Feature flags and thresholds
 * - Retry and failover configuration
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface FeatureFlags {
  /** Enable advanced vision (YOLOv8) */
  advancedVision: boolean;
  /** Enable advanced hearing (Whisper) */
  advancedHearing: boolean;
  /** Enable fall detection */
  fallDetector: boolean;
  /** Enable session compaction */
  sessionCompaction: boolean;
  /** Enable model failover */
  modelFailover: boolean;
  /** Enable circuit breaker */
  circuitBreaker: boolean;
  /** Enable cross-channel memory */
  crossChannelMemory: boolean;
  /** Enable RAG */
  ragEnabled: boolean;
  /** Enable debug mode */
  debugMode: boolean;
}

export interface MLThresholds {
  /** Vision confidence threshold (0-1) */
  visionConfidence: number;
  /** Hearing confidence threshold (0-1) */
  hearingConfidence: number;
  /** Fall detection angle threshold (degrees) */
  fallAngle: number;
  /** Fall detection velocity threshold */
  fallVelocity: number;
  /** Smile detection threshold */
  smileThreshold: number;
  /** Speech detection threshold */
  speechThreshold: number;
  /** Object detection IOU threshold */
  iouThreshold: number;
}

export interface RetryConfig {
  /** Maximum retry attempts */
  attempts: number;
  /** Minimum delay between retries (ms) */
  minDelayMs: number;
  /** Maximum delay between retries (ms) */
  maxDelayMs: number;
  /** Jitter factor (0-1) */
  jitter: number;
}

export interface CircuitBreakerConfig {
  /** Failures before opening */
  failureThreshold: number;
  /** Time to wait before half-open (ms) */
  resetTimeout: number;
  /** Successes to close from half-open */
  successThreshold: number;
}

export interface SessionConfig {
  /** Max tokens before compaction */
  compactionThreshold: number;
  /** Target tokens after compaction */
  compactionTarget: number;
  /** Max messages before forced compaction */
  maxMessages: number;
  /** Session idle timeout (ms) */
  idleTimeout: number;
  /** Max session duration (ms) */
  maxDuration: number;
}

export interface HotConfig {
  /** Feature toggles */
  features: FeatureFlags;
  /** ML model thresholds */
  thresholds: MLThresholds;
  /** Retry configuration */
  retry: RetryConfig;
  /** Circuit breaker configuration */
  circuitBreaker: CircuitBreakerConfig;
  /** Session management configuration */
  session: SessionConfig;
  /** Model fallback chains */
  modelFallbacks: Record<string, string[]>;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_CONFIG: HotConfig = {
  features: {
    advancedVision: false,
    advancedHearing: false,
    fallDetector: false,
    sessionCompaction: true,
    modelFailover: true,
    circuitBreaker: true,
    crossChannelMemory: true,
    ragEnabled: false,
    debugMode: false
  },
  thresholds: {
    visionConfidence: 0.5,
    hearingConfidence: 0.6,
    fallAngle: 60,
    fallVelocity: 2.0,
    smileThreshold: 0.6,
    speechThreshold: 0.7,
    iouThreshold: 0.45
  },
  retry: {
    attempts: 3,
    minDelayMs: 400,
    maxDelayMs: 30000,
    jitter: 0.1
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000,
    successThreshold: 2
  },
  session: {
    compactionThreshold: 8000,
    compactionTarget: 4000,
    maxMessages: 100,
    idleTimeout: 30 * 60 * 1000,  // 30 minutes
    maxDuration: 24 * 60 * 60 * 1000  // 24 hours
  },
  modelFallbacks: {
    'gemini-2.0-flash': ['gpt-4o-mini', 'claude-3-haiku-20240307'],
    'gpt-4o': ['claude-3-5-sonnet-20241022', 'gemini-1.5-pro'],
    'claude-3-5-sonnet-20241022': ['gpt-4o', 'gemini-1.5-pro']
  }
};

// ============================================================================
// Store Interface
// ============================================================================

interface ConfigState {
  /** Current configuration */
  config: HotConfig;
  /** Last update timestamp */
  lastUpdated: number;
  /** Configuration version for migrations */
  version: number;

  // Actions
  /** Update partial configuration */
  updateConfig: (partial: DeepPartial<HotConfig>) => void;
  /** Update a specific feature flag */
  setFeature: (flag: keyof FeatureFlags, value: boolean) => void;
  /** Update a specific threshold */
  setThreshold: (key: keyof MLThresholds, value: number) => void;
  /** Reset to default configuration */
  resetConfig: () => void;
  /** Export configuration as JSON string */
  exportConfig: () => string;
  /** Import configuration from JSON string */
  importConfig: (json: string) => boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as DeepPartial<Record<string, unknown>>
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useConfigStore = create<ConfigState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      config: DEFAULT_CONFIG,
      lastUpdated: Date.now(),
      version: 1,

      updateConfig: (partial) => {
        set(state => ({
          config: deepMerge(state.config, partial),
          lastUpdated: Date.now()
        }));
      },

      setFeature: (flag, value) => {
        set(state => ({
          config: {
            ...state.config,
            features: {
              ...state.config.features,
              [flag]: value
            }
          },
          lastUpdated: Date.now()
        }));
      },

      setThreshold: (key, value) => {
        set(state => ({
          config: {
            ...state.config,
            thresholds: {
              ...state.config.thresholds,
              [key]: value
            }
          },
          lastUpdated: Date.now()
        }));
      },

      resetConfig: () => {
        set({
          config: DEFAULT_CONFIG,
          lastUpdated: Date.now()
        });
      },

      exportConfig: () => {
        const { config, version } = get();
        return JSON.stringify({ config, version }, null, 2);
      },

      importConfig: (json) => {
        try {
          const data = JSON.parse(json);
          if (data.config) {
            set({
              config: deepMerge(DEFAULT_CONFIG, data.config),
              lastUpdated: Date.now(),
              version: data.version || 1
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error('[ConfigStore] Import failed:', error);
          return false;
        }
      }
    })),
    {
      name: 'lisa-config',
      version: 1,
      migrate: (persistedState, version) => {
        // Handle migrations for future versions
        if (version === 0) {
          // Migration from version 0 to 1
          return {
            ...(persistedState as ConfigState),
            version: 1
          };
        }
        return persistedState as ConfigState;
      }
    }
  )
);

// ============================================================================
// Cross-Tab Synchronization
// ============================================================================

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'lisa-config' && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        if (data.state?.config) {
          useConfigStore.setState({
            config: data.state.config,
            lastUpdated: data.state.lastUpdated || Date.now()
          });
          console.log('[ConfigStore] Synced from another tab');
        }
      } catch (error) {
        console.warn('[ConfigStore] Cross-tab sync failed:', error);
      }
    }
  });
}

// ============================================================================
// Selectors
// ============================================================================

export const selectConfig = (state: ConfigState) => state.config;
export const selectFeatures = (state: ConfigState) => state.config.features;
export const selectThresholds = (state: ConfigState) => state.config.thresholds;
export const selectRetryConfig = (state: ConfigState) => state.config.retry;
export const selectCircuitBreakerConfig = (state: ConfigState) => state.config.circuitBreaker;
export const selectSessionConfig = (state: ConfigState) => state.config.session;

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get a feature flag value
 */
export function getFeatureFlag(flag: keyof FeatureFlags): boolean {
  return useConfigStore.getState().config.features[flag];
}

/**
 * Get a threshold value
 */
export function getThreshold(key: keyof MLThresholds): number {
  return useConfigStore.getState().config.thresholds[key];
}

/**
 * Get the full configuration
 */
export function getConfig(): HotConfig {
  return useConfigStore.getState().config;
}

export default useConfigStore;
