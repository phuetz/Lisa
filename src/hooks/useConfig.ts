/**
 * useConfig Hook - React Hook for Hot-Reload Configuration
 *
 * Provides type-safe access to configuration with automatic updates.
 * Integrates with ConfigStore for persistence and cross-tab sync.
 */

import { useCallback, useMemo } from 'react';
import {
  useConfigStore,
  selectConfig,
  selectFeatures,
  selectThresholds,
  selectRetryConfig,
  selectCircuitBreakerConfig,
  selectSessionConfig,
  type HotConfig,
  type FeatureFlags,
  type MLThresholds,
  type RetryConfig,
  type CircuitBreakerConfig,
  type SessionConfig
} from '../store/configStore';

// ============================================================================
// Generic Config Selector Hook
// ============================================================================

/**
 * Generic hook to select a portion of the config
 */
export function useConfig<T>(selector: (config: HotConfig) => T): T {
  return useConfigStore(state => selector(state.config));
}

// ============================================================================
// Feature Flags Hooks
// ============================================================================

/**
 * Get all feature flags
 */
export function useFeatures(): FeatureFlags {
  return useConfigStore(selectFeatures);
}

/**
 * Get a single feature flag
 */
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  return useConfigStore(state => state.config.features[flag]);
}

/**
 * Get feature flag with setter
 */
export function useFeatureFlagWithSetter(flag: keyof FeatureFlags): [boolean, (value: boolean) => void] {
  const value = useConfigStore(state => state.config.features[flag]);
  const setFeature = useConfigStore(state => state.setFeature);

  const setValue = useCallback(
    (newValue: boolean) => setFeature(flag, newValue),
    [flag, setFeature]
  );

  return [value, setValue];
}

// ============================================================================
// Threshold Hooks
// ============================================================================

/**
 * Get all ML thresholds
 */
export function useThresholds(): MLThresholds {
  return useConfigStore(selectThresholds);
}

/**
 * Get a single threshold value
 */
export function useThreshold(key: keyof MLThresholds): number {
  return useConfigStore(state => state.config.thresholds[key]);
}

/**
 * Get threshold with setter
 */
export function useThresholdWithSetter(key: keyof MLThresholds): [number, (value: number) => void] {
  const value = useConfigStore(state => state.config.thresholds[key]);
  const setThreshold = useConfigStore(state => state.setThreshold);

  const setValue = useCallback(
    (newValue: number) => setThreshold(key, newValue),
    [key, setThreshold]
  );

  return [value, setValue];
}

// ============================================================================
// Retry Config Hook
// ============================================================================

/**
 * Get retry configuration
 */
export function useRetryConfig(): RetryConfig {
  return useConfigStore(selectRetryConfig);
}

// ============================================================================
// Circuit Breaker Config Hook
// ============================================================================

/**
 * Get circuit breaker configuration
 */
export function useCircuitBreakerConfig(): CircuitBreakerConfig {
  return useConfigStore(selectCircuitBreakerConfig);
}

// ============================================================================
// Session Config Hook
// ============================================================================

/**
 * Get session configuration
 */
export function useSessionConfig(): SessionConfig {
  return useConfigStore(selectSessionConfig);
}

// ============================================================================
// Full Config Hook
// ============================================================================

/**
 * Get full configuration with all update methods
 */
export function useFullConfig() {
  const config = useConfigStore(selectConfig);
  const updateConfig = useConfigStore(state => state.updateConfig);
  const setFeature = useConfigStore(state => state.setFeature);
  const setThreshold = useConfigStore(state => state.setThreshold);
  const resetConfig = useConfigStore(state => state.resetConfig);
  const exportConfig = useConfigStore(state => state.exportConfig);
  const importConfig = useConfigStore(state => state.importConfig);
  const lastUpdated = useConfigStore(state => state.lastUpdated);

  return useMemo(() => ({
    config,
    lastUpdated,
    updateConfig,
    setFeature,
    setThreshold,
    resetConfig,
    exportConfig,
    importConfig
  }), [config, lastUpdated, updateConfig, setFeature, setThreshold, resetConfig, exportConfig, importConfig]);
}

// ============================================================================
// Model Fallbacks Hook
// ============================================================================

/**
 * Get model fallback configuration
 */
export function useModelFallbacks(): Record<string, string[]> {
  return useConfigStore(state => state.config.modelFallbacks);
}

/**
 * Get fallbacks for a specific model
 */
export function useFallbacksForModel(model: string): string[] {
  return useConfigStore(state => state.config.modelFallbacks[model] || []);
}

// ============================================================================
// Convenience Hooks for Common Patterns
// ============================================================================

/**
 * Check if vision features are enabled
 */
export function useVisionEnabled(): boolean {
  return useFeatureFlag('advancedVision');
}

/**
 * Check if hearing features are enabled
 */
export function useHearingEnabled(): boolean {
  return useFeatureFlag('advancedHearing');
}

/**
 * Check if debug mode is enabled
 */
export function useDebugMode(): boolean {
  return useFeatureFlag('debugMode');
}

/**
 * Check if session compaction is enabled
 */
export function useSessionCompactionEnabled(): boolean {
  return useFeatureFlag('sessionCompaction');
}

/**
 * Check if model failover is enabled
 */
export function useModelFailoverEnabled(): boolean {
  return useFeatureFlag('modelFailover');
}

// ============================================================================
// Config Status Hook
// ============================================================================

/**
 * Get configuration status and metadata
 */
export function useConfigStatus() {
  const lastUpdated = useConfigStore(state => state.lastUpdated);
  const version = useConfigStore(state => state.version);

  return useMemo(() => ({
    lastUpdated: new Date(lastUpdated),
    lastUpdatedMs: lastUpdated,
    version,
    isStale: Date.now() - lastUpdated > 24 * 60 * 60 * 1000 // > 24 hours old
  }), [lastUpdated, version]);
}

export default useConfig;
