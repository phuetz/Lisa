/**
 * Agent Instrumentation Utilities
 *
 * Provides decorators and wrappers to automatically instrument agents
 * with analytics, logging, retry logic, and circuit breaker patterns.
 */

import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../agents/types';
import { analytics } from './agentAnalytics';
import { logInfo, logError, logWarn } from './logger';
import { retryWithBackoff } from './retry';
import { circuitBreaker } from './circuitBreaker';
import { featureFlags } from './featureFlags';

/**
 * Wraps an agent's execute method with automatic instrumentation
 *
 * Features:
 * - Execution time tracking
 * - Success/failure analytics
 * - Structured logging
 * - Error handling
 * - Optional retry logic
 * - Optional circuit breaker
 *
 * @param agent - The agent to instrument
 * @param options - Instrumentation options
 * @returns Instrumented agent
 */
export function instrumentAgent(
  agent: BaseAgent,
  options: {
    enableRetry?: boolean;
    enableCircuitBreaker?: boolean;
    retryAttempts?: number;
  } = {}
): BaseAgent {
  const originalExecute = agent.execute.bind(agent);

  // Create instrumented execute function
  const instrumentedExecute = async (props: AgentExecuteProps): Promise<AgentExecuteResult> => {
    const startTime = performance.now();
    const agentName = agent.name;

    try {
      // Log execution start
      if (featureFlags.isEnabled('analytics')) {
        logInfo(`Agent execution started`, 'Agent', {
          agent: agentName,
          intent: props.intent,
          context: props.context,
        });
      }

      let result: AgentExecuteResult;

      // Apply retry logic if enabled
      if (options.enableRetry && featureFlags.isEnabled('retry-logic')) {
        const retryResult = await retryWithBackoff(
          () => originalExecute(props),
          {
            maxAttempts: options.retryAttempts || 3,
            shouldRetry: (error) => {
              // Retry on network errors or temporary failures
              return error instanceof Error &&
                (error.message.includes('network') ||
                 error.message.includes('timeout') ||
                 error.message.includes('503'));
            },
            onRetry: (attempt, error, delay) => {
              logWarn(`Retrying agent execution`, 'Agent', {
                agent: agentName,
                attempt,
                error: error instanceof Error ? error.message : String(error),
                delay,
              });
            },
          }
        );

        if (!retryResult.success) {
          throw retryResult.error;
        }
        result = retryResult.data;
      }
      // Apply circuit breaker if enabled
      else if (options.enableCircuitBreaker && featureFlags.isEnabled('circuit-breaker')) {
        result = await circuitBreaker.execute(
          agentName,
          () => originalExecute(props),
          {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 30000,
          }
        );
      }
      // Standard execution
      else {
        result = await originalExecute(props);
      }

      // Calculate execution time
      const executionTime = performance.now() - startTime;

      // Track analytics
      if (featureFlags.isEnabled('analytics')) {
        analytics.trackExecution(agentName, executionTime, result.success);

        logInfo(`Agent execution completed`, 'Agent', {
          agent: agentName,
          success: result.success,
          executionTime: Math.round(executionTime),
          intent: props.intent,
        });
      }

      // Add execution time to metadata
      if (!result.metadata) {
        result.metadata = {};
      }
      result.metadata.executionTime = executionTime;
      result.metadata.timestamp = Date.now();

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;

      // Track failed execution
      if (featureFlags.isEnabled('analytics')) {
        analytics.trackExecution(agentName, executionTime, false);

        logError(`Agent execution failed`, 'Agent', {
          agent: agentName,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Math.round(executionTime),
          intent: props.intent,
        });
      }

      // Return standardized error result
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          executionTime,
          timestamp: Date.now(),
        },
      };
    }
  };

  // Replace the execute method with instrumented version
  return {
    ...agent,
    execute: instrumentedExecute,
  };
}

/**
 * Decorator to automatically instrument an agent class
 *
 * Usage:
 * ```typescript
 * @InstrumentAgent({ enableRetry: true })
 * class MyAgent implements BaseAgent {
 *   // ... agent implementation
 * }
 * ```
 */
export function InstrumentAgent(options: {
  enableRetry?: boolean;
  enableCircuitBreaker?: boolean;
  retryAttempts?: number;
} = {}) {
  return function <T extends { new (...args: any[]): BaseAgent }>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        const instrumented = instrumentAgent(this, options);
        Object.assign(this, instrumented);
      }
    };
  };
}

/**
 * Batch instrument multiple agents
 *
 * @param agents - Array of agents to instrument
 * @param options - Instrumentation options
 * @returns Array of instrumented agents
 */
export function instrumentAgents(
  agents: BaseAgent[],
  options: {
    enableRetry?: boolean;
    enableCircuitBreaker?: boolean;
    retryAttempts?: number;
  } = {}
): BaseAgent[] {
  return agents.map(agent => instrumentAgent(agent, options));
}

/**
 * Get agent performance summary
 *
 * @param agentName - Name of the agent
 * @returns Performance summary or null if no data
 */
export function getAgentPerformance(agentName: string) {
  const metrics = analytics.getMetrics(agentName);

  if (!metrics) {
    return null;
  }

  return {
    agent: agentName,
    totalExecutions: metrics.successCount + metrics.failureCount,
    successRate: metrics.successRate,
    averageTime: metrics.averageExecutionTime,
    percentiles: {
      p50: metrics.p50,
      p95: metrics.p95,
      p99: metrics.p99,
    },
    lastExecution: metrics.lastExecutionTime,
  };
}

/**
 * Get performance summary for all agents
 *
 * @returns Array of performance summaries sorted by execution count
 */
export function getAllAgentPerformance() {
  const allMetrics = analytics.getAllMetrics();

  return Object.keys(allMetrics)
    .map(agentName => getAgentPerformance(agentName))
    .filter((summary): summary is NonNullable<typeof summary> => summary !== null)
    .sort((a, b) => b.totalExecutions - a.totalExecutions);
}

/**
 * Export agent analytics to JSON
 *
 * @returns JSON string of all analytics data
 */
export function exportAgentAnalytics(): string {
  return analytics.export();
}

/**
 * Reset analytics for a specific agent
 *
 * @param agentName - Name of the agent to reset
 */
export function resetAgentAnalytics(agentName: string): void {
  analytics.reset(agentName);
  logInfo(`Analytics reset for agent: ${agentName}`, 'Instrumentation');
}

/**
 * Reset analytics for all agents
 */
export function resetAllAgentAnalytics(): void {
  const allMetrics = analytics.getAllMetrics();
  Object.keys(allMetrics).forEach(agentName => {
    analytics.reset(agentName);
  });
  logInfo('Analytics reset for all agents', 'Instrumentation');
}
