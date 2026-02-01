/**
 * Lisa Health Monitor
 * System health monitoring and diagnostics
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  checks: HealthCheck[];
  metrics: SystemMetrics;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  duration?: number;
  lastCheck: Date;
  metadata?: Record<string, unknown>;
}

export interface SystemMetrics {
  memory: MemoryMetrics;
  performance: PerformanceMetrics;
  connections: ConnectionMetrics;
  errors: ErrorMetrics;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
  heapUsed?: number;
  heapTotal?: number;
}

export interface PerformanceMetrics {
  responseTime: number;
  requestsPerSecond: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
}

export interface ConnectionMetrics {
  websockets: number;
  httpConnections: number;
  databaseConnections: number;
  activeChannels: number;
}

export interface ErrorMetrics {
  total: number;
  rate: number;
  recentErrors: ErrorEntry[];
}

export interface ErrorEntry {
  timestamp: Date;
  type: string;
  message: string;
  count: number;
}

export interface HealthCheckConfig {
  name: string;
  interval: number;
  timeout: number;
  checker: () => Promise<{ status: 'pass' | 'warn' | 'fail'; message?: string }>;
}

export class HealthMonitor extends BrowserEventEmitter {
  private startTime: Date;
  private checks: Map<string, HealthCheckConfig> = new Map();
  private lastResults: Map<string, HealthCheck> = new Map();
  private metrics: SystemMetrics;
  private latencies: number[] = [];
  private requestCount = 0;
  private requestTimestamp = Date.now();
  private errors: ErrorEntry[] = [];
  private checkIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  constructor() {
    super();
    this.startTime = new Date();
    this.metrics = this.initializeMetrics();
    this.registerDefaultChecks();
    this.startMetricsCollection();
  }

  private initializeMetrics(): SystemMetrics {
    return {
      memory: { used: 0, total: 0, percentage: 0 },
      performance: {
        responseTime: 0,
        requestsPerSecond: 0,
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0
      },
      connections: {
        websockets: 0,
        httpConnections: 0,
        databaseConnections: 0,
        activeChannels: 0
      },
      errors: { total: 0, rate: 0, recentErrors: [] }
    };
  }

  private registerDefaultChecks(): void {
    // Memory check
    this.registerCheck({
      name: 'memory',
      interval: 30000,
      timeout: 5000,
      checker: async () => {
        const memory = this.getMemoryUsage();
        if (memory.percentage > 90) {
          return { status: 'fail', message: `Memory usage critical: ${memory.percentage.toFixed(1)}%` };
        }
        if (memory.percentage > 75) {
          return { status: 'warn', message: `Memory usage high: ${memory.percentage.toFixed(1)}%` };
        }
        return { status: 'pass', message: `Memory usage: ${memory.percentage.toFixed(1)}%` };
      }
    });

    // Response time check
    this.registerCheck({
      name: 'response_time',
      interval: 15000,
      timeout: 5000,
      checker: async () => {
        const avg = this.metrics.performance.averageLatency;
        if (avg > 5000) {
          return { status: 'fail', message: `Response time critical: ${avg.toFixed(0)}ms` };
        }
        if (avg > 2000) {
          return { status: 'warn', message: `Response time slow: ${avg.toFixed(0)}ms` };
        }
        return { status: 'pass', message: `Response time: ${avg.toFixed(0)}ms` };
      }
    });

    // Error rate check
    this.registerCheck({
      name: 'error_rate',
      interval: 60000,
      timeout: 5000,
      checker: async () => {
        const rate = this.metrics.errors.rate;
        if (rate > 0.1) {
          return { status: 'fail', message: `Error rate critical: ${(rate * 100).toFixed(1)}%` };
        }
        if (rate > 0.05) {
          return { status: 'warn', message: `Error rate elevated: ${(rate * 100).toFixed(1)}%` };
        }
        return { status: 'pass', message: `Error rate: ${(rate * 100).toFixed(1)}%` };
      }
    });

    // Uptime check
    this.registerCheck({
      name: 'uptime',
      interval: 60000,
      timeout: 5000,
      checker: async () => {
        const uptime = this.getUptime();
        return { status: 'pass', message: `Uptime: ${this.formatUptime(uptime)}` };
      }
    });
  }

  private startMetricsCollection(): void {
    // Collect metrics every 5 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 5000);
  }

  private collectMetrics(): void {
    // Memory
    this.metrics.memory = this.getMemoryUsage();

    // Performance
    const now = Date.now();
    const elapsed = (now - this.requestTimestamp) / 1000;
    this.metrics.performance.requestsPerSecond = elapsed > 0 ? this.requestCount / elapsed : 0;
    
    if (this.latencies.length > 0) {
      const sorted = [...this.latencies].sort((a, b) => a - b);
      this.metrics.performance.averageLatency = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      this.metrics.performance.p95Latency = sorted[Math.floor(sorted.length * 0.95)] || 0;
      this.metrics.performance.p99Latency = sorted[Math.floor(sorted.length * 0.99)] || 0;
    }

    // Cleanup old latencies (keep last 1000)
    if (this.latencies.length > 1000) {
      this.latencies = this.latencies.slice(-1000);
    }

    // Reset request counter periodically
    if (elapsed > 60) {
      this.requestCount = 0;
      this.requestTimestamp = now;
    }

    // Errors
    const oneMinuteAgo = new Date(now - 60000);
    this.errors = this.errors.filter(e => e.timestamp >= oneMinuteAgo);
    this.metrics.errors.recentErrors = this.errors.slice(0, 10);
    this.metrics.errors.rate = this.requestCount > 0 
      ? this.errors.length / this.requestCount 
      : 0;

    this.emit('metrics:collected', this.metrics);
  }

  private getMemoryUsage(): MemoryMetrics {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      return {
        used: mem.rss,
        total: mem.heapTotal,
        percentage: (mem.heapUsed / mem.heapTotal) * 100,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal
      };
    }
    
    // Browser fallback
    if (typeof performance !== 'undefined' && (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory) {
      const mem = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      return {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
        percentage: (mem.usedJSHeapSize / mem.totalJSHeapSize) * 100
      };
    }

    return { used: 0, total: 0, percentage: 0 };
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Health check management
  registerCheck(config: HealthCheckConfig): void {
    this.checks.set(config.name, config);
    
    // Run immediately
    this.runCheck(config);
    
    // Schedule periodic checks
    const interval = setInterval(() => this.runCheck(config), config.interval);
    this.checkIntervals.set(config.name, interval);
    
    this.emit('check:registered', config);
  }

  unregisterCheck(name: string): boolean {
    const interval = this.checkIntervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(name);
    }
    
    this.lastResults.delete(name);
    return this.checks.delete(name);
  }

  private async runCheck(config: HealthCheckConfig): Promise<void> {
    const start = Date.now();
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Check timeout')), config.timeout);
      });
      
      const result = await Promise.race([config.checker(), timeoutPromise]);
      const duration = Date.now() - start;
      
      const check: HealthCheck = {
        name: config.name,
        status: result.status,
        message: result.message,
        duration,
        lastCheck: new Date()
      };
      
      this.lastResults.set(config.name, check);
      this.emit('check:completed', check);
      
      if (result.status === 'fail') {
        this.emit('check:failed', check);
      }
    } catch (error) {
      const check: HealthCheck = {
        name: config.name,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start,
        lastCheck: new Date()
      };
      
      this.lastResults.set(config.name, check);
      this.emit('check:failed', check);
    }
  }

  // Record metrics
  recordLatency(latency: number): void {
    this.latencies.push(latency);
    this.requestCount++;
    this.metrics.performance.responseTime = latency;
  }

  recordError(type: string, message: string): void {
    const existing = this.errors.find(e => e.type === type && e.message === message);
    
    if (existing) {
      existing.count++;
      existing.timestamp = new Date();
    } else {
      this.errors.push({
        timestamp: new Date(),
        type,
        message,
        count: 1
      });
    }
    
    this.metrics.errors.total++;
    this.emit('error:recorded', { type, message });
  }

  updateConnections(connections: Partial<ConnectionMetrics>): void {
    this.metrics.connections = { ...this.metrics.connections, ...connections };
  }

  // Get status
  getStatus(): HealthStatus {
    const checks = Array.from(this.lastResults.values());
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    const failCount = checks.filter(c => c.status === 'fail').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;
    
    if (failCount > 0) {
      status = 'unhealthy';
    } else if (warnCount > 0) {
      status = 'degraded';
    }
    
    return {
      status,
      timestamp: new Date(),
      uptime: this.getUptime(),
      checks,
      metrics: { ...this.metrics }
    };
  }

  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  getChecks(): HealthCheck[] {
    return Array.from(this.lastResults.values());
  }

  getCheck(name: string): HealthCheck | undefined {
    return this.lastResults.get(name);
  }

  // Quick health check
  isHealthy(): boolean {
    return this.getStatus().status === 'healthy';
  }

  // Liveness probe (for Kubernetes)
  async liveness(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      // Basic check - can we respond?
      return { status: 'ok' };
    } catch (error) {
      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Readiness probe (for Kubernetes)
  async readiness(): Promise<{ status: 'ok' | 'error'; checks: HealthCheck[] }> {
    const status = this.getStatus();
    
    if (status.status === 'unhealthy') {
      return { status: 'error', checks: status.checks };
    }
    
    return { status: 'ok', checks: status.checks };
  }

  // Export for monitoring systems
  toPrometheus(): string {
    const lines: string[] = [];
    const prefix = 'lisa';

    // Uptime
    lines.push(`# HELP ${prefix}_uptime_seconds Application uptime in seconds`);
    lines.push(`# TYPE ${prefix}_uptime_seconds gauge`);
    lines.push(`${prefix}_uptime_seconds ${this.getUptime() / 1000}`);

    // Memory
    lines.push(`# HELP ${prefix}_memory_used_bytes Memory used in bytes`);
    lines.push(`# TYPE ${prefix}_memory_used_bytes gauge`);
    lines.push(`${prefix}_memory_used_bytes ${this.metrics.memory.used}`);

    // Response time
    lines.push(`# HELP ${prefix}_response_time_ms Response time in milliseconds`);
    lines.push(`# TYPE ${prefix}_response_time_ms gauge`);
    lines.push(`${prefix}_response_time_ms ${this.metrics.performance.responseTime}`);

    // Requests per second
    lines.push(`# HELP ${prefix}_requests_per_second Requests per second`);
    lines.push(`# TYPE ${prefix}_requests_per_second gauge`);
    lines.push(`${prefix}_requests_per_second ${this.metrics.performance.requestsPerSecond}`);

    // Error count
    lines.push(`# HELP ${prefix}_errors_total Total error count`);
    lines.push(`# TYPE ${prefix}_errors_total counter`);
    lines.push(`${prefix}_errors_total ${this.metrics.errors.total}`);

    // Connections
    lines.push(`# HELP ${prefix}_websocket_connections Active WebSocket connections`);
    lines.push(`# TYPE ${prefix}_websocket_connections gauge`);
    lines.push(`${prefix}_websocket_connections ${this.metrics.connections.websockets}`);

    // Health checks
    for (const check of this.lastResults.values()) {
      const value = check.status === 'pass' ? 1 : check.status === 'warn' ? 0.5 : 0;
      lines.push(`${prefix}_health_check{name="${check.name}"} ${value}`);
    }

    return lines.join('\n');
  }

  dispose(): void {
    for (const interval of this.checkIntervals.values()) {
      clearInterval(interval);
    }
    this.checkIntervals.clear();
  }
}

// Singleton
let healthMonitorInstance: HealthMonitor | null = null;

export function getHealthMonitor(): HealthMonitor {
  if (!healthMonitorInstance) {
    healthMonitorInstance = new HealthMonitor();
  }
  return healthMonitorInstance;
}

export function resetHealthMonitor(): void {
  if (healthMonitorInstance) {
    healthMonitorInstance.dispose();
    healthMonitorInstance.removeAllListeners();
    healthMonitorInstance = null;
  }
}

