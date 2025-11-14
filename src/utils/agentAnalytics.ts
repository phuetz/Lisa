/**
 * Agent Analytics and Performance Monitoring
 * Tracks agent execution metrics, success rates, and performance
 */

export interface AgentMetrics {
  agentName: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  lastExecutionTime?: number;
  lastError?: string;
  errorRate: number;
  throughput: number; // requests per minute
}

export interface ExecutionRecord {
  agentName: string;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
  inputSize?: number;
  outputSize?: number;
}

export interface AnalyticsOptions {
  /** Maximum number of execution records to keep in memory */
  maxRecords?: number;
  /** Enable detailed logging */
  enableLogging?: boolean;
  /** Callback for metric updates */
  onMetricUpdate?: (metrics: AgentMetrics) => void;
  /** Persist to localStorage */
  persistToStorage?: boolean;
}

const DEFAULT_OPTIONS: Required<AnalyticsOptions> = {
  maxRecords: 1000,
  enableLogging: false,
  onMetricUpdate: () => {},
  persistToStorage: true,
};

/**
 * Agent Analytics Tracker
 * Singleton for tracking agent performance across the application
 */
export class AgentAnalytics {
  private static instance: AgentAnalytics;
  private records: ExecutionRecord[] = [];
  private metricsCache: Map<string, AgentMetrics> = new Map();
  private options: Required<AnalyticsOptions>;
  private readonly STORAGE_KEY = 'lisa_agent_analytics';

  private constructor(options: AnalyticsOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.loadFromStorage();
  }

  static getInstance(options?: AnalyticsOptions): AgentAnalytics {
    if (!AgentAnalytics.instance) {
      AgentAnalytics.instance = new AgentAnalytics(options);
    }
    return AgentAnalytics.instance;
  }

  /**
   * Record an agent execution
   */
  recordExecution(record: ExecutionRecord): void {
    this.records.push(record);

    // Maintain max records limit
    if (this.records.length > this.options.maxRecords) {
      this.records = this.records.slice(-this.options.maxRecords);
    }

    // Update metrics cache
    this.updateMetrics(record.agentName);

    // Persist if enabled
    if (this.options.persistToStorage) {
      this.saveToStorage();
    }

    if (this.options.enableLogging) {
      console.log(`[AgentAnalytics] ${record.agentName}:`, {
        duration: `${record.duration}ms`,
        success: record.success,
      });
    }
  }

  /**
   * Track an agent execution with automatic timing
   */
  async trackExecution<T>(
    agentName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    let success = false;
    let error: string | undefined;

    try {
      const result = await fn();
      success = true;
      return result;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      this.recordExecution({
        agentName,
        timestamp: Date.now(),
        duration,
        success,
        error,
      });
    }
  }

  /**
   * Get metrics for a specific agent
   */
  getMetrics(agentName: string): AgentMetrics | undefined {
    if (this.metricsCache.has(agentName)) {
      return this.metricsCache.get(agentName);
    }
    this.updateMetrics(agentName);
    return this.metricsCache.get(agentName);
  }

  /**
   * Get metrics for all agents
   */
  getAllMetrics(): AgentMetrics[] {
    const agentNames = new Set(this.records.map(r => r.agentName));
    agentNames.forEach(name => this.updateMetrics(name));
    return Array.from(this.metricsCache.values());
  }

  /**
   * Get top performing agents by success rate
   */
  getTopPerformers(limit: number = 10): AgentMetrics[] {
    return this.getAllMetrics()
      .filter(m => m.totalExecutions >= 5) // Minimum executions for statistical relevance
      .sort((a, b) => (b.successCount / b.totalExecutions) - (a.successCount / a.totalExecutions))
      .slice(0, limit);
  }

  /**
   * Get slowest agents by average execution time
   */
  getSlowestAgents(limit: number = 10): AgentMetrics[] {
    return this.getAllMetrics()
      .filter(m => m.totalExecutions >= 5)
      .sort((a, b) => b.averageExecutionTime - a.averageExecutionTime)
      .slice(0, limit);
  }

  /**
   * Get agents with highest error rates
   */
  getMostProblematic(limit: number = 10): AgentMetrics[] {
    return this.getAllMetrics()
      .filter(m => m.totalExecutions >= 5)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit);
  }

  /**
   * Get execution history for an agent
   */
  getExecutionHistory(agentName: string, limit?: number): ExecutionRecord[] {
    const filtered = this.records.filter(r => r.agentName === agentName);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Calculate metrics for an agent
   */
  private updateMetrics(agentName: string): void {
    const agentRecords = this.records.filter(r => r.agentName === agentName);

    if (agentRecords.length === 0) {
      return;
    }

    const successRecords = agentRecords.filter(r => r.success);
    const failureRecords = agentRecords.filter(r => !r.success);
    const durations = agentRecords.map(r => r.duration);

    const totalExecutions = agentRecords.length;
    const successCount = successRecords.length;
    const failureCount = failureRecords.length;
    const averageExecutionTime = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minExecutionTime = Math.min(...durations);
    const maxExecutionTime = Math.max(...durations);
    const lastRecord = agentRecords[agentRecords.length - 1];
    const errorRate = failureCount / totalExecutions;

    // Calculate throughput (requests per minute) over last hour
    const oneHourAgo = Date.now() - 3600000;
    const recentRecords = agentRecords.filter(r => r.timestamp > oneHourAgo);
    const throughput = (recentRecords.length / 60) || 0;

    const metrics: AgentMetrics = {
      agentName,
      totalExecutions,
      successCount,
      failureCount,
      averageExecutionTime,
      minExecutionTime,
      maxExecutionTime,
      lastExecutionTime: lastRecord.timestamp,
      lastError: failureRecords[failureRecords.length - 1]?.error,
      errorRate,
      throughput,
    };

    this.metricsCache.set(agentName, metrics);
    this.options.onMetricUpdate(metrics);
  }

  /**
   * Get analytics summary
   */
  getSummary(): {
    totalAgents: number;
    totalExecutions: number;
    overallSuccessRate: number;
    averageExecutionTime: number;
    topAgent: string | null;
  } {
    const allMetrics = this.getAllMetrics();
    const totalExecutions = this.records.length;
    const successfulExecutions = this.records.filter(r => r.success).length;
    const allDurations = this.records.map(r => r.duration);
    const avgDuration = allDurations.length > 0
      ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length
      : 0;

    const topAgent = allMetrics.length > 0
      ? allMetrics.reduce((prev, current) =>
          current.successCount > prev.successCount ? current : prev
        ).agentName
      : null;

    return {
      totalAgents: allMetrics.length,
      totalExecutions,
      overallSuccessRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      averageExecutionTime: avgDuration,
      topAgent,
    };
  }

  /**
   * Clear all analytics data
   */
  clear(): void {
    this.records = [];
    this.metricsCache.clear();
    if (this.options.persistToStorage) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Export analytics data as JSON
   */
  export(): string {
    return JSON.stringify({
      records: this.records,
      metrics: Array.from(this.metricsCache.entries()),
      exportedAt: Date.now(),
    });
  }

  /**
   * Import analytics data from JSON
   */
  import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.records = parsed.records || [];
      this.metricsCache = new Map(parsed.metrics || []);
    } catch (error) {
      console.error('[AgentAnalytics] Failed to import data:', error);
    }
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = this.export();
      localStorage.setItem(this.STORAGE_KEY, data);
    } catch (error) {
      console.error('[AgentAnalytics] Failed to save to storage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.import(data);
      }
    } catch (error) {
      console.error('[AgentAnalytics] Failed to load from storage:', error);
    }
  }

  /**
   * Get performance percentiles for an agent
   */
  getPercentiles(agentName: string): { p50: number; p95: number; p99: number } | null {
    const records = this.getExecutionHistory(agentName);
    if (records.length === 0) return null;

    const durations = records.map(r => r.duration).sort((a, b) => a - b);
    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    return { p50, p95, p99 };
  }
}

/**
 * Decorator for tracking agent method execution
 */
export function TrackExecution(agentName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = agentName || target.constructor.name;

    descriptor.value = async function (...args: any[]) {
      const analytics = AgentAnalytics.getInstance();
      return analytics.trackExecution(name, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// Export singleton instance
export const analytics = AgentAnalytics.getInstance();
