/**
 * Tool Logger - Structured Logging for Tool Calls
 *
 * Provides structured logging for debugging tool calling:
 * - Logs tool calls with arguments
 * - Logs results with timing
 * - Logs errors
 * - Logs sanitization actions
 * - Provides statistics
 */

export interface ToolLogEntry {
  timestamp: number;
  event: 'call' | 'result' | 'error' | 'sanitized' | 'filtered';
  toolName: string;
  args?: unknown;
  result?: unknown;
  error?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface ToolStats {
  calls: number;
  errors: number;
  avgDuration: number;
  toolBreakdown: Record<string, { calls: number; errors: number; avgDuration: number }>;
}

class ToolLogger {
  private logs: ToolLogEntry[] = [];
  private maxLogs = 100;
  private enabled = true;

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Log a tool call initiation
   */
  logCall(toolName: string, args: unknown, metadata?: Record<string, unknown>): number {
    const timestamp = Date.now();

    if (this.enabled) {
      this.addLog({
        timestamp,
        event: 'call',
        toolName,
        args,
        metadata
      });
      console.log(`[Tool] call ${toolName}`, args);
    }

    return timestamp;
  }

  /**
   * Log a successful tool result
   */
  logResult(toolName: string, result: unknown, startTime: number): void {
    const duration = Date.now() - startTime;

    if (this.enabled) {
      this.addLog({
        timestamp: Date.now(),
        event: 'result',
        toolName,
        result,
        duration
      });
      console.log(`[Tool] result ${toolName} (${duration}ms)`, this.summarizeResult(result));
    }
  }

  /**
   * Log a tool error
   */
  logError(toolName: string, error: string | Error, startTime?: number): void {
    const errorMsg = error instanceof Error ? error.message : error;
    const duration = startTime ? Date.now() - startTime : undefined;

    if (this.enabled) {
      this.addLog({
        timestamp: Date.now(),
        event: 'error',
        toolName,
        error: errorMsg,
        duration
      });
      console.error(`[Tool] error ${toolName}:`, errorMsg);
    }
  }

  /**
   * Log a sanitization action
   */
  logSanitized(action: string, details: unknown): void {
    if (this.enabled) {
      this.addLog({
        timestamp: Date.now(),
        event: 'sanitized',
        toolName: action,
        result: details
      });
      console.log(`[Tool] sanitized ${action}`, details);
    }
  }

  /**
   * Log when a tool is filtered by policy
   */
  logFiltered(toolName: string, reason: string): void {
    if (this.enabled) {
      this.addLog({
        timestamp: Date.now(),
        event: 'filtered',
        toolName,
        metadata: { reason }
      });
      console.log(`[Tool] filtered ${toolName}: ${reason}`);
    }
  }

  /**
   * Add a log entry with size limit
   */
  private addLog(entry: ToolLogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Summarize a result for logging (avoid huge outputs)
   */
  private summarizeResult(result: unknown): unknown {
    if (typeof result === 'string') {
      return result.length > 200 ? result.slice(0, 200) + '...' : result;
    }
    if (Array.isArray(result)) {
      return `[Array(${result.length})]`;
    }
    if (typeof result === 'object' && result !== null) {
      const keys = Object.keys(result);
      if (keys.length > 5) {
        return `{${keys.slice(0, 5).join(', ')}... +${keys.length - 5} more}`;
      }
    }
    return result;
  }

  /**
   * Get all logs
   */
  getLogs(): ToolLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs for a specific tool
   */
  getLogsForTool(toolName: string): ToolLogEntry[] {
    return this.logs.filter(l => l.toolName === toolName);
  }

  /**
   * Get recent logs (last N entries)
   */
  getRecentLogs(count: number = 10): ToolLogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Get statistics about tool usage
   */
  getStats(): ToolStats {
    const calls = this.logs.filter(l => l.event === 'call').length;
    const errors = this.logs.filter(l => l.event === 'error').length;
    const durations = this.logs
      .filter(l => l.event === 'result' && l.duration !== undefined)
      .map(l => l.duration!);

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Per-tool breakdown
    const toolBreakdown: Record<string, { calls: number; errors: number; avgDuration: number }> = {};

    for (const log of this.logs) {
      if (!toolBreakdown[log.toolName]) {
        toolBreakdown[log.toolName] = { calls: 0, errors: 0, avgDuration: 0 };
      }

      const stats = toolBreakdown[log.toolName];
      if (log.event === 'call') stats.calls++;
      if (log.event === 'error') stats.errors++;
      if (log.event === 'result' && log.duration) {
        const prevTotal = stats.avgDuration * (stats.calls - 1);
        stats.avgDuration = (prevTotal + log.duration) / stats.calls;
      }
    }

    return {
      calls,
      errors,
      avgDuration,
      toolBreakdown
    };
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Export logs to JSON
   */
  exportToJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Format logs for display
   */
  formatForDisplay(): string {
    return this.logs.map(log => {
      const time = new Date(log.timestamp).toISOString().slice(11, 23);
      const icon = {
        call: '',
        result: '',
        error: '',
        sanitized: '',
        filtered: ''
      }[log.event];

      let line = `[${time}] ${icon} ${log.event.toUpperCase()} ${log.toolName}`;

      if (log.duration !== undefined) {
        line += ` (${log.duration}ms)`;
      }

      if (log.error) {
        line += ` - ${log.error}`;
      }

      return line;
    }).join('\n');
  }
}

// Singleton instance
export const toolLogger = new ToolLogger();

// Convenience functions
export const logToolCall = toolLogger.logCall.bind(toolLogger);
export const logToolResult = toolLogger.logResult.bind(toolLogger);
export const logToolError = toolLogger.logError.bind(toolLogger);
export const logToolSanitized = toolLogger.logSanitized.bind(toolLogger);
