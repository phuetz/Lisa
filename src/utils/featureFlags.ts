/**
 * Feature Flags System
 * Allows dynamic enabling/disabling of features
 */

import { logInfo, logWarn } from './logger';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  category?: string;
  dependencies?: string[];
  minVersion?: string;
}

export interface FeatureFlagOptions {
  /** Enable persistence to localStorage */
  persist?: boolean;
  /** Storage key for persisted flags */
  storageKey?: string;
  /** Callback when flag changes */
  onChange?: (key: string, enabled: boolean) => void;
}

const DEFAULT_OPTIONS: Required<FeatureFlagOptions> = {
  persist: true,
  storageKey: 'lisa_feature_flags',
  onChange: () => {},
};

/**
 * Feature Flag Manager
 * Manages feature flags with persistence and dependencies
 */
export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: Map<string, FeatureFlag> = new Map();
  private options: Required<FeatureFlagOptions>;
  private listeners: Map<string, Set<(enabled: boolean) => void>> = new Map();

  private constructor(options: FeatureFlagOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initializeDefaultFlags();
    this.loadFromStorage();
  }

  static getInstance(options?: FeatureFlagOptions): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager(options);
    }
    return FeatureFlagManager.instance;
  }

  /**
   * Initialize default feature flags
   */
  private initializeDefaultFlags(): void {
    // Performance features
    this.register({
      key: 'lazy-loading',
      enabled: true,
      description: 'Enable lazy loading of agents',
      category: 'performance',
    });

    this.register({
      key: 'model-cache',
      enabled: true,
      description: 'Enable IndexedDB model caching',
      category: 'performance',
    });

    this.register({
      key: 'webgpu-acceleration',
      enabled: false,
      description: 'Enable WebGPU acceleration for vision',
      category: 'performance',
    });

    // Reliability features
    this.register({
      key: 'circuit-breaker',
      enabled: true,
      description: 'Enable circuit breaker pattern',
      category: 'reliability',
    });

    this.register({
      key: 'retry-logic',
      enabled: true,
      description: 'Enable automatic retry with backoff',
      category: 'reliability',
    });

    this.register({
      key: 'offline-sync',
      enabled: true,
      description: 'Enable offline synchronization',
      category: 'reliability',
    });

    // Monitoring features
    this.register({
      key: 'analytics',
      enabled: true,
      description: 'Enable agent analytics tracking',
      category: 'monitoring',
    });

    this.register({
      key: 'performance-profiling',
      enabled: false,
      description: 'Enable performance profiling',
      category: 'monitoring',
    });

    this.register({
      key: 'error-tracking',
      enabled: true,
      description: 'Enable error tracking and reporting',
      category: 'monitoring',
    });

    // UI features
    this.register({
      key: 'monitoring-dashboard',
      enabled: false,
      description: 'Show monitoring dashboard',
      category: 'ui',
    });

    this.register({
      key: 'workflow-templates',
      enabled: true,
      description: 'Enable workflow templates',
      category: 'ui',
    });

    this.register({
      key: 'proactive-suggestions',
      enabled: true,
      description: 'Enable proactive suggestions',
      category: 'ui',
    });

    // Experimental features
    this.register({
      key: 'experimental-agents',
      enabled: false,
      description: 'Enable experimental agent features',
      category: 'experimental',
    });

    this.register({
      key: 'voice-controls',
      enabled: true,
      description: 'Enable voice control features',
      category: 'experimental',
    });

    this.register({
      key: 'ar-features',
      enabled: false,
      description: 'Enable AR/VR features',
      category: 'experimental',
      dependencies: ['webgpu-acceleration'],
    });
  }

  /**
   * Register a new feature flag
   */
  register(flag: FeatureFlag): void {
    this.flags.set(flag.key, flag);
    logInfo(`Feature flag registered: ${flag.key}`, 'FeatureFlags');
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(key: string): boolean {
    const flag = this.flags.get(key);
    if (!flag) {
      logWarn(`Unknown feature flag: ${key}`, 'FeatureFlags');
      return false;
    }

    // Check dependencies
    if (flag.dependencies) {
      for (const dep of flag.dependencies) {
        if (!this.isEnabled(dep)) {
          return false;
        }
      }
    }

    return flag.enabled;
  }

  /**
   * Enable a feature flag
   */
  enable(key: string): void {
    this.setEnabled(key, true);
  }

  /**
   * Disable a feature flag
   */
  disable(key: string): void {
    this.setEnabled(key, false);
  }

  /**
   * Toggle a feature flag
   */
  toggle(key: string): void {
    const flag = this.flags.get(key);
    if (flag) {
      this.setEnabled(key, !flag.enabled);
    }
  }

  /**
   * Set feature flag state
   */
  setEnabled(key: string, enabled: boolean): void {
    const flag = this.flags.get(key);
    if (!flag) {
      logWarn(`Unknown feature flag: ${key}`, 'FeatureFlags');
      return;
    }

    flag.enabled = enabled;
    this.saveToStorage();
    this.options.onChange(key, enabled);

    // Notify listeners
    this.notifyListeners(key, enabled);

    logInfo(
      `Feature flag ${enabled ? 'enabled' : 'disabled'}: ${key}`,
      'FeatureFlags'
    );
  }

  /**
   * Get feature flag details
   */
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get flags by category
   */
  getFlagsByCategory(category: string): FeatureFlag[] {
    return this.getAllFlags().filter(flag => flag.category === category);
  }

  /**
   * Get all enabled flags
   */
  getEnabledFlags(): FeatureFlag[] {
    return this.getAllFlags().filter(flag => flag.enabled);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const flag of this.flags.values()) {
      if (flag.category) {
        categories.add(flag.category);
      }
    }
    return Array.from(categories);
  }

  /**
   * Subscribe to flag changes
   */
  subscribe(key: string, callback: (enabled: boolean) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  /**
   * Notify listeners of flag change
   */
  private notifyListeners(key: string, enabled: boolean): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => callback(enabled));
    }
  }

  /**
   * Save flags to localStorage
   */
  private saveToStorage(): void {
    if (!this.options.persist) return;

    try {
      const data: Record<string, boolean> = {};
      for (const [key, flag] of this.flags) {
        data[key] = flag.enabled;
      }
      localStorage.setItem(this.options.storageKey, JSON.stringify(data));
    } catch (error) {
      logWarn('Failed to save feature flags', 'FeatureFlags', error);
    }
  }

  /**
   * Load flags from localStorage
   */
  private loadFromStorage(): void {
    if (!this.options.persist) return;

    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [key, enabled] of Object.entries(data)) {
          const flag = this.flags.get(key);
          if (flag) {
            flag.enabled = enabled as boolean;
          }
        }
        logInfo('Feature flags loaded from storage', 'FeatureFlags');
      }
    } catch (error) {
      logWarn('Failed to load feature flags', 'FeatureFlags', error);
    }
  }

  /**
   * Reset all flags to defaults
   */
  reset(): void {
    this.flags.clear();
    this.initializeDefaultFlags();
    this.saveToStorage();
    logInfo('Feature flags reset to defaults', 'FeatureFlags');
  }

  /**
   * Export flags as JSON
   */
  export(): string {
    const data: Record<string, boolean> = {};
    for (const [key, flag] of this.flags) {
      data[key] = flag.enabled;
    }
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import flags from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json);
      for (const [key, enabled] of Object.entries(data)) {
        if (typeof enabled === 'boolean') {
          this.setEnabled(key, enabled);
        }
      }
      logInfo('Feature flags imported', 'FeatureFlags');
    } catch (error) {
      logWarn('Failed to import feature flags', 'FeatureFlags', error);
    }
  }

  /**
   * Enable experimental features
   */
  enableExperimental(): void {
    const experimental = this.getFlagsByCategory('experimental');
    experimental.forEach(flag => this.enable(flag.key));
  }

  /**
   * Disable experimental features
   */
  disableExperimental(): void {
    const experimental = this.getFlagsByCategory('experimental');
    experimental.forEach(flag => this.disable(flag.key));
  }
}

/**
 * React hook for feature flags
 */
export function useFeatureFlag(key: string) {
  const [enabled, setEnabled] = React.useState(() =>
    featureFlags.isEnabled(key)
  );

  React.useEffect(() => {
    const unsubscribe = featureFlags.subscribe(key, setEnabled);
    return unsubscribe;
  }, [key]);

  return enabled;
}

/**
 * Conditional component based on feature flag
 */
export function FeatureGate({
  flag,
  children,
  fallback,
}: {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const enabled = useFeatureFlag(flag);
  return enabled ? <>{children}</> : <>{fallback || null}</>;
}

/**
 * Higher-order component for feature gating
 */
export function withFeatureFlag<P extends object>(
  flag: string,
  Component: React.ComponentType<P>,
  Fallback?: React.ComponentType<P>
): React.ComponentType<P> {
  return function FeatureGatedComponent(props: P) {
    const enabled = useFeatureFlag(flag);

    if (enabled) {
      return <Component {...props} />;
    }

    if (Fallback) {
      return <Fallback {...props} />;
    }

    return null;
  };
}

// Export singleton instance
export const featureFlags = FeatureFlagManager.getInstance();

// For use in React contexts
import * as React from 'react';
