/**
 * Performance profiling and monitoring utilities
 * Provides comprehensive performance tracking and analysis
 */

export interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  name: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Performance profiler for tracking execution times
 */
export class PerformanceProfiler {
  private static instance: PerformanceProfiler;
  private marks: Map<string, PerformanceMark[]> = new Map();
  private activeMarks: Map<string, number> = new Map();
  private enabled: boolean = true;

  private constructor() {}

  static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler.instance) {
      PerformanceProfiler.instance = new PerformanceProfiler();
    }
    return PerformanceProfiler.instance;
  }

  /**
   * Start a performance measurement
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const startTime = performance.now();
    this.activeMarks.set(name, startTime);

    if (!this.marks.has(name)) {
      this.marks.set(name, []);
    }

    this.marks.get(name)!.push({
      name,
      startTime,
      metadata,
    });
  }

  /**
   * End a performance measurement
   */
  end(name: string): number | null {
    if (!this.enabled) return null;

    const startTime = this.activeMarks.get(name);
    if (startTime === undefined) {
      console.warn(`[Profiler] No start mark found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Update the last mark
    const marks = this.marks.get(name);
    if (marks && marks.length > 0) {
      const lastMark = marks[marks.length - 1];
      lastMark.endTime = endTime;
      lastMark.duration = duration;
    }

    this.activeMarks.delete(name);
    return duration;
  }

  /**
   * Measure a function execution
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      return result;
    } finally {
      this.end(name);
    }
  }

  /**
   * Get metrics for a specific measurement
   */
  getMetrics(name: string): PerformanceMetrics | null {
    const marks = this.marks.get(name);
    if (!marks || marks.length === 0) {
      return null;
    }

    const completedMarks = marks.filter(m => m.duration !== undefined);
    if (completedMarks.length === 0) {
      return null;
    }

    const durations = completedMarks.map(m => m.duration!).sort((a, b) => a - b);
    const count = durations.length;
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = totalDuration / count;
    const minDuration = durations[0];
    const maxDuration = durations[count - 1];

    // Calculate percentiles
    const p50 = durations[Math.floor(count * 0.5)];
    const p95 = durations[Math.floor(count * 0.95)];
    const p99 = durations[Math.floor(count * 0.99)];

    return {
      name,
      count,
      totalDuration,
      averageDuration,
      minDuration,
      maxDuration,
      p50,
      p95,
      p99,
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    const allMetrics: PerformanceMetrics[] = [];

    for (const name of this.marks.keys()) {
      const metrics = this.getMetrics(name);
      if (metrics) {
        allMetrics.push(metrics);
      }
    }

    return allMetrics.sort((a, b) => b.averageDuration - a.averageDuration);
  }

  /**
   * Get slowest operations
   */
  getSlowest(limit: number = 10): PerformanceMetrics[] {
    return this.getAllMetrics()
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, limit);
  }

  /**
   * Clear all marks
   */
  clear(name?: string): void {
    if (name) {
      this.marks.delete(name);
      this.activeMarks.delete(name);
    } else {
      this.marks.clear();
      this.activeMarks.clear();
    }
  }

  /**
   * Enable/disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Export profiling data
   */
  export(): string {
    const data = {
      marks: Array.from(this.marks.entries()),
      exportedAt: Date.now(),
    };
    return JSON.stringify(data);
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getAllMetrics();
    let report = '=== Performance Report ===\n\n';

    for (const metric of metrics) {
      report += `${metric.name}:\n`;
      report += `  Count: ${metric.count}\n`;
      report += `  Average: ${metric.averageDuration.toFixed(2)}ms\n`;
      report += `  Min: ${metric.minDuration.toFixed(2)}ms\n`;
      report += `  Max: ${metric.maxDuration.toFixed(2)}ms\n`;
      report += `  P50: ${metric.p50.toFixed(2)}ms\n`;
      report += `  P95: ${metric.p95.toFixed(2)}ms\n`;
      report += `  P99: ${metric.p99.toFixed(2)}ms\n`;
      report += `  Total: ${metric.totalDuration.toFixed(2)}ms\n\n`;
    }

    return report;
  }
}

/**
 * Decorator for automatic performance tracking
 */
export function Profile(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const profiler = PerformanceProfiler.getInstance();
    const measurementName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return profiler.measure(measurementName, () =>
        originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

/**
 * React component performance monitor
 */
export class ComponentProfiler {
  private renderTimes: Map<string, number[]> = new Map();

  recordRender(componentName: string, duration: number): void {
    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, []);
    }
    this.renderTimes.get(componentName)!.push(duration);

    // Keep only last 100 renders
    const times = this.renderTimes.get(componentName)!;
    if (times.length > 100) {
      times.shift();
    }
  }

  getStats(componentName: string): {
    average: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const times = this.renderTimes.get(componentName);
    if (!times || times.length === 0) return null;

    return {
      average: times.reduce((sum, t) => sum + t, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      count: times.length,
    };
  }

  getAllStats(): Map<string, ReturnType<ComponentProfiler['getStats']>> {
    const stats = new Map();
    for (const [name] of this.renderTimes) {
      stats.set(name, this.getStats(name));
    }
    return stats;
  }
}

/**
 * Memory usage monitor
 */
export class MemoryMonitor {
  private snapshots: Array<{ timestamp: number; usage: any }> = [];

  takeSnapshot(): void {
    if ('memory' in performance) {
      const usage = (performance as any).memory;
      this.snapshots.push({
        timestamp: Date.now(),
        usage: {
          usedJSHeapSize: usage.usedJSHeapSize,
          totalJSHeapSize: usage.totalJSHeapSize,
          jsHeapSizeLimit: usage.jsHeapSizeLimit,
        },
      });

      // Keep only last 100 snapshots
      if (this.snapshots.length > 100) {
        this.snapshots.shift();
      }
    }
  }

  getLatestSnapshot() {
    return this.snapshots[this.snapshots.length - 1];
  }

  getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' | 'unknown' {
    if (this.snapshots.length < 2) return 'unknown';

    const recent = this.snapshots.slice(-10);
    const first = recent[0].usage.usedJSHeapSize;
    const last = recent[recent.length - 1].usage.usedJSHeapSize;

    const change = (last - first) / first;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  clear(): void {
    this.snapshots = [];
  }
}

/**
 * FPS (Frames Per Second) monitor
 */
export class FPSMonitor {
  private fps: number = 0;
  private lastFrameTime: number = performance.now();
  private frameCount: number = 0;
  private running: boolean = false;
  private rafId?: number;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  private tick = (): void => {
    if (!this.running) return;

    const now = performance.now();
    this.frameCount++;

    const elapsed = now - this.lastFrameTime;
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  getFPS(): number {
    return this.fps;
  }
}

/**
 * Network performance monitor
 */
export class NetworkMonitor {
  private requests: Array<{
    url: string;
    startTime: number;
    duration: number;
    size: number;
    success: boolean;
  }> = [];

  recordRequest(
    url: string,
    startTime: number,
    duration: number,
    size: number,
    success: boolean
  ): void {
    this.requests.push({ url, startTime, duration, size, success });

    // Keep only last 100 requests
    if (this.requests.length > 100) {
      this.requests.shift();
    }
  }

  getStats(): {
    totalRequests: number;
    successRate: number;
    averageDuration: number;
    totalData: number;
  } {
    const total = this.requests.length;
    const successful = this.requests.filter(r => r.success).length;
    const avgDuration =
      total > 0
        ? this.requests.reduce((sum, r) => sum + r.duration, 0) / total
        : 0;
    const totalData = this.requests.reduce((sum, r) => sum + r.size, 0);

    return {
      totalRequests: total,
      successRate: total > 0 ? successful / total : 0,
      averageDuration: avgDuration,
      totalData,
    };
  }

  clear(): void {
    this.requests = [];
  }
}

// Export singleton instances
export const profiler = PerformanceProfiler.getInstance();
export const componentProfiler = new ComponentProfiler();
export const memoryMonitor = new MemoryMonitor();
export const fpsMonitor = new FPSMonitor();
export const networkMonitor = new NetworkMonitor();

/**
 * Start monitoring all performance metrics
 */
export function startPerformanceMonitoring(): void {
  fpsMonitor.start();

  // Take memory snapshots every 10 seconds
  setInterval(() => {
    memoryMonitor.takeSnapshot();
  }, 10000);
}

/**
 * Stop all performance monitoring
 */
export function stopPerformanceMonitoring(): void {
  fpsMonitor.stop();
}
