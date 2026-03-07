/**
 * CircuitBreaker - Fail-Fast Pattern
 *
 * Re-exports shared types and error from @phuetz/ai-providers.
 * Keeps Lisa-specific CircuitBreaker class which exposes a different public API
 * (isAllowed, recordSuccess, recordFailure, trip, halfOpen) used by AIService.
 */

// Re-export shared types and error from @phuetz/ai-providers
export {
  CircuitBreakerError,
  resetAllCircuitBreakers,
} from '@phuetz/ai-providers';
export type {
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerStats,
} from '@phuetz/ai-providers';

// Import types and values locally for use in the Lisa-specific class
import type {
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerStats,
} from '@phuetz/ai-providers';
import type { CircuitBreaker as SharedCircuitBreaker } from '@phuetz/ai-providers';
import { CircuitBreakerError } from '@phuetz/ai-providers';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000,
  successThreshold: 2,
  failureWindow: 60000,
};

// ============================================================================
// Lisa-Specific CircuitBreaker Class
//
// This class has a different public API from the shared @phuetz/ai-providers
// CircuitBreaker: it exposes isAllowed(), recordSuccess(), recordFailure(),
// trip(), halfOpen(), executeWithFallback() which are used throughout Lisa's
// AIService. The shared version uses execute() and private success/failure
// tracking, so we keep this for backward compatibility.
// ============================================================================

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'closed';
  private failures: number = 0;
  private successes: number = 0;
  private openedAt: number | null = null;
  private failureTimestamps: number[] = [];

  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private totalRejected: number = 0;

  constructor(
    public readonly name: string,
    config?: Partial<CircuitBreakerConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getState(): CircuitState {
    return this.state;
  }

  isAllowed(): boolean {
    this.checkStateTransition();
    return this.state !== 'open';
  }

  private checkStateTransition(): void {
    if (this.state === 'open' && this.openedAt) {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.config.resetTimeout) {
        this.transitionTo('half-open');
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    if (newState === 'open') {
      this.openedAt = Date.now();
      this.successes = 0;
    } else if (newState === 'closed') {
      this.failures = 0;
      this.failureTimestamps = [];
      this.openedAt = null;
      this.successes = 0;
    } else if (newState === 'half-open') {
      this.successes = 0;
    }

    console.log(
      `[CircuitBreaker:${this.name}] State: ${oldState} -> ${newState}`
    );

    if (this.config.onStateChange) {
      this.config.onStateChange(oldState, newState, this as unknown as SharedCircuitBreaker);
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;
    this.checkStateTransition();

    if (this.state === 'open') {
      this.totalRejected++;
      if (this.config.onReject) {
        this.config.onReject(this as unknown as SharedCircuitBreaker);
      }

      const nextAttempt = this.openedAt
        ? this.openedAt + this.config.resetTimeout
        : null;

      throw new CircuitBreakerError(
        `Circuit breaker '${this.name}' is open. Service unavailable.`,
        this.state,
        nextAttempt
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async executeWithFallback<T>(
    fn: () => Promise<T>,
    fallback: () => Promise<T> | T
  ): Promise<T> {
    try {
      return await this.execute(fn);
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        console.log(
          `[CircuitBreaker:${this.name}] Using fallback due to open circuit`
        );
        return await fallback();
      }
      throw error;
    }
  }

  recordSuccess(): void {
    this.totalSuccesses++;

    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo('closed');
      }
    } else if (this.state === 'closed') {
      this.cleanupFailureTimestamps();
    }
  }

  recordFailure(): void {
    this.totalFailures++;
    const now = Date.now();

    if (this.state === 'half-open') {
      this.transitionTo('open');
    } else if (this.state === 'closed') {
      this.failureTimestamps.push(now);
      this.cleanupFailureTimestamps();
      this.failures = this.failureTimestamps.length;

      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo('open');
      }
    }
  }

  private cleanupFailureTimestamps(): void {
    const cutoff = Date.now() - this.config.failureWindow;
    this.failureTimestamps = this.failureTimestamps.filter(ts => ts > cutoff);
    this.failures = this.failureTimestamps.length;
  }

  trip(): void {
    this.transitionTo('open');
  }

  reset(): void {
    this.transitionTo('closed');
  }

  halfOpen(): void {
    this.transitionTo('half-open');
  }

  getStats(): CircuitBreakerStats {
    this.checkStateTransition();

    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      openedAt: this.openedAt,
      nextAttemptAt: this.openedAt
        ? this.openedAt + this.config.resetTimeout
        : null,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      totalRejected: this.totalRejected
    };
  }

  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Lisa-Specific Circuit Breaker Registry
// ============================================================================

class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: Partial<CircuitBreakerConfig> = {};

  get(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    let breaker = this.breakers.get(name);

    if (!breaker) {
      breaker = new CircuitBreaker(name, {
        ...this.defaultConfig,
        ...config
      });
      this.breakers.set(name, breaker);
    }

    return breaker;
  }

  has(name: string): boolean {
    return this.breakers.has(name);
  }

  remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  setDefaultConfig(config: Partial<CircuitBreakerConfig>): void {
    this.defaultConfig = config;
  }

  clear(): void {
    this.breakers.clear();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Get a circuit breaker by name (convenience function).
 * Returns a Lisa-specific CircuitBreaker with isAllowed/recordSuccess/recordFailure API.
 */
export function getCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return circuitBreakerRegistry.get(name, config);
}

export default CircuitBreaker;
