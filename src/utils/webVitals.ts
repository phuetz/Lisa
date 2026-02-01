/**
 * Web Vitals Monitoring - Core Web Vitals Metrics
 *
 * Monitors and reports Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FCP (First Contentful Paint): Initial render
 * - TTFB (Time to First Byte): Server response time
 * - INP (Interaction to Next Paint): Overall responsiveness
 *
 * Integrates with analytics and provides real-time monitoring.
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric, type MetricType } from 'web-vitals';

// ============================================================================
// Types
// ============================================================================

export interface WebVitalsMetric {
  name: MetricType;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  timestamp: number;
}

export interface WebVitalsThresholds {
  LCP: { good: number; needsImprovement: number };
  FID: { good: number; needsImprovement: number };
  CLS: { good: number; needsImprovement: number };
  FCP: { good: number; needsImprovement: number };
  TTFB: { good: number; needsImprovement: number };
  INP: { good: number; needsImprovement: number };
}

export interface WebVitalsReport {
  metrics: Record<MetricType, WebVitalsMetric | null>;
  score: number;
  timestamp: number;
  url: string;
}

export type WebVitalsCallback = (metric: WebVitalsMetric) => void;

// ============================================================================
// Thresholds (Based on Google's recommendations)
// ============================================================================

export const WEB_VITALS_THRESHOLDS: WebVitalsThresholds = {
  LCP: { good: 2500, needsImprovement: 4000 },     // ms
  FID: { good: 100, needsImprovement: 300 },       // ms (deprecated, use INP)
  CLS: { good: 0.1, needsImprovement: 0.25 },      // score
  FCP: { good: 1800, needsImprovement: 3000 },     // ms
  TTFB: { good: 800, needsImprovement: 1800 },     // ms
  INP: { good: 200, needsImprovement: 500 }        // ms
};

// ============================================================================
// Rating Calculation
// ============================================================================

/**
 * Calculate rating based on thresholds
 */
function getRating(name: MetricType, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[name as keyof WebVitalsThresholds];
  if (!thresholds) return 'good';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

// ============================================================================
// Web Vitals Monitor
// ============================================================================

class WebVitalsMonitor {
  private metrics: Map<MetricType, WebVitalsMetric> = new Map();
  private callbacks: Set<WebVitalsCallback> = new Set();
  private history: WebVitalsMetric[] = [];
  private maxHistorySize = 100;
  private initialized = false;

  /**
   * Initialize Web Vitals monitoring
   */
  init(): void {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    this.initialized = true;

    const handleMetric = (metric: Metric) => {
      const webVitalsMetric: WebVitalsMetric = {
        name: metric.name,
        value: metric.value,
        rating: getRating(metric.name, metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        timestamp: Date.now()
      };

      this.metrics.set(metric.name, webVitalsMetric);
      this.history.push(webVitalsMetric);

      // Trim history
      if (this.history.length > this.maxHistorySize) {
        this.history = this.history.slice(-this.maxHistorySize);
      }

      // Notify callbacks
      for (const callback of this.callbacks) {
        try {
          callback(webVitalsMetric);
        } catch (error) {
          console.error('[WebVitals] Callback error:', error);
        }
      }

      // Log in development
      if (import.meta.env.DEV) {
        const emoji = webVitalsMetric.rating === 'good' ? '✅' :
                      webVitalsMetric.rating === 'needs-improvement' ? '⚠️' : '❌';
        console.log(
          `[WebVitals] ${emoji} ${metric.name}: ${metric.value.toFixed(2)} (${webVitalsMetric.rating})`
        );
      }
    };

    // Register all metrics
    onCLS(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
    onINP(handleMetric);

    console.log('[WebVitals] Monitoring initialized');
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(callback: WebVitalsCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Get current metrics
   */
  getMetrics(): Record<MetricType, WebVitalsMetric | null> {
    return {
      LCP: this.metrics.get('LCP') || null,
      FID: this.metrics.get('FID') || null,
      CLS: this.metrics.get('CLS') || null,
      FCP: this.metrics.get('FCP') || null,
      TTFB: this.metrics.get('TTFB') || null,
      INP: this.metrics.get('INP') || null
    };
  }

  /**
   * Get a specific metric
   */
  getMetric(name: MetricType): WebVitalsMetric | null {
    return this.metrics.get(name) || null;
  }

  /**
   * Calculate overall performance score (0-100)
   */
  getScore(): number {
    const weights: Record<MetricType, number> = {
      LCP: 0.25,
      FID: 0.0,  // Deprecated, weight goes to INP
      CLS: 0.25,
      FCP: 0.15,
      TTFB: 0.10,
      INP: 0.25
    };

    let totalWeight = 0;
    let weightedScore = 0;

    for (const [name, weight] of Object.entries(weights)) {
      if (weight === 0) continue;

      const metric = this.metrics.get(name as MetricType);
      if (!metric) continue;

      totalWeight += weight;

      const thresholds = WEB_VITALS_THRESHOLDS[name as keyof WebVitalsThresholds];
      if (!thresholds) continue;

      // Calculate score 0-100 based on thresholds
      let score: number;
      if (metric.value <= thresholds.good) {
        score = 100;
      } else if (metric.value <= thresholds.needsImprovement) {
        const range = thresholds.needsImprovement - thresholds.good;
        const position = metric.value - thresholds.good;
        score = 100 - (position / range) * 50; // 50-100
      } else {
        const overThreshold = metric.value - thresholds.needsImprovement;
        const maxOver = thresholds.needsImprovement; // Assume 2x threshold is 0
        score = Math.max(0, 50 - (overThreshold / maxOver) * 50); // 0-50
      }

      weightedScore += score * weight;
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }

  /**
   * Get full report
   */
  getReport(): WebVitalsReport {
    return {
      metrics: this.getMetrics(),
      score: this.getScore(),
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : ''
    };
  }

  /**
   * Get metric history
   */
  getHistory(): WebVitalsMetric[] {
    return [...this.history];
  }

  /**
   * Check if all core metrics have been captured
   */
  isComplete(): boolean {
    const coreMetrics: MetricType[] = ['LCP', 'CLS', 'INP'];
    return coreMetrics.every(name => this.metrics.has(name));
  }

  /**
   * Reset metrics (useful for SPA navigation)
   */
  reset(): void {
    this.metrics.clear();
    console.log('[WebVitals] Metrics reset');
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const webVitalsMonitor = new WebVitalsMonitor();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals(callback?: WebVitalsCallback): void {
  webVitalsMonitor.init();

  if (callback) {
    webVitalsMonitor.subscribe(callback);
  }
}

/**
 * Send metrics to analytics endpoint
 */
export async function sendToAnalytics(
  endpoint: string,
  report?: WebVitalsReport
): Promise<void> {
  const data = report || webVitalsMonitor.getReport();

  try {
    // Use sendBeacon for reliability
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(data));
    } else {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true
      });
    }
  } catch (error) {
    console.error('[WebVitals] Failed to send to analytics:', error);
  }
}

/**
 * Log metrics to console with formatting
 */
export function logWebVitals(): void {
  const metrics = webVitalsMonitor.getMetrics();
  const score = webVitalsMonitor.getScore();

  console.group('🔬 Web Vitals Report');
  console.log(`Overall Score: ${score}/100`);
  console.log('---');

  for (const [name, metric] of Object.entries(metrics)) {
    if (!metric) {
      console.log(`${name}: Not measured yet`);
      continue;
    }

    const emoji = metric.rating === 'good' ? '✅' :
                  metric.rating === 'needs-improvement' ? '⚠️' : '❌';

    const unit = name === 'CLS' ? '' : 'ms';
    console.log(`${emoji} ${name}: ${metric.value.toFixed(2)}${unit} (${metric.rating})`);
  }

  console.groupEnd();
}

/**
 * React hook for Web Vitals (can be used with useSyncExternalStore)
 */
export function getWebVitalsSnapshot(): WebVitalsReport {
  return webVitalsMonitor.getReport();
}

export function subscribeToWebVitals(callback: () => void): () => void {
  return webVitalsMonitor.subscribe(() => callback());
}

// ============================================================================
// Performance Marks and Measures
// ============================================================================

/**
 * Create a performance mark
 */
export function mark(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure between two marks
 */
export function measure(name: string, startMark: string, endMark?: string): number | null {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      const options = endMark
        ? { start: startMark, end: endMark }
        : { start: startMark };

      const entry = performance.measure(name, options);
      return entry.duration;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Time a function execution
 */
export async function timeAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (import.meta.env.DEV) {
    console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

/**
 * Time a sync function execution
 */
export function timeSync<T>(
  name: string,
  fn: () => T
): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  if (import.meta.env.DEV) {
    console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

export default webVitalsMonitor;
