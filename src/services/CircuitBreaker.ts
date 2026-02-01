/**
 * CircuitBreaker - OpenClaw-Inspired Fail-Fast Pattern
 *
 * Implements the circuit breaker pattern to prevent cascading failures:
 * - Closed: Normal operation, requests pass through
 * - Open: Requests fail immediately (fail-fast)
 * - Half-Open: Limited requests to test if service recovered
 *
 * Benefits:
 * - Prevents overwhelming a failing service
 * - Allows system to recover gracefully
 * - Provides fallback behavior during outages
 */

// ============================================================================
// Types
// ============================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time to wait before trying half-open (ms) */
  resetTimeout: number;
  /** Number of successful requests to close circuit from half-open */
  successThreshold: number;
  /** Time window for counting failures (ms) */
  failureWindow: number;
  /** Callback when state changes */
  onStateChange?: (from: CircuitState, to: CircuitState, breaker: CircuitBreaker) => void;
  /** Callback when request is rejected due to open circuit */
  onReject?: (breaker: CircuitBreaker) => void;
}

export interface CircuitBreakerStats {
  /** Current state */
  state: CircuitState;
  /** Number of failures in current window */
  failures: number;
  /** Number of successes in half-open state */
  successes: number;
  /** Time when circuit opened */
  openedAt: number | null;
  /** Time when circuit will try half-open */
  nextAttemptAt: number | null;
  /** Total requests processed */
  totalRequests: number;
  /** Total failures */
  totalFailures: number;
  /** Total successful requests */
  totalSuccesses: number;
  /** Total rejected requests (due to open circuit) */
  totalRejected: number;
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly state: CircuitState,
    public readonly nextAttemptAt: number | null
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000,      // 1 minute
  successThreshold: 2,
  failureWindow: 60000,     // 1 minute window for counting failures
};

// ============================================================================
// CircuitBreaker Class
// ============================================================================

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'closed';
  private failures: number = 0;
  private successes: number = 0;
  private openedAt: number | null = null;
  private failureTimestamps: number[] = [];

  // Stats tracking
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

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit allows requests
   */
  isAllowed(): boolean {
    this.checkStateTransition();
    return this.state !== 'open';
  }

  /**
   * Check and perform state transitions
   */
  private checkStateTransition(): void {
    if (this.state === 'open' && this.openedAt) {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.config.resetTimeout) {
        this.transitionTo('half-open');
      }
    }
  }

  /**
   * Transition to a new state
   */
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
      this.config.onStateChange(oldState, newState, this);
    }
  }

  // ============================================================================
  // Request Execution
  // ============================================================================

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;
    this.checkStateTransition();

    // If circuit is open, reject immediately
    if (this.state === 'open') {
      this.totalRejected++;

      if (this.config.onReject) {
        this.config.onReject(this);
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

  /**
   * Execute with fallback when circuit is open
   */
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

  // ============================================================================
  // Success/Failure Recording
  // ============================================================================

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.totalSuccesses++;

    if (this.state === 'half-open') {
      this.successes++;

      if (this.successes >= this.config.successThreshold) {
        this.transitionTo('closed');
      }
    } else if (this.state === 'closed') {
      // Clean up old failure timestamps outside the window
      this.cleanupFailureTimestamps();
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.totalFailures++;
    const now = Date.now();

    if (this.state === 'half-open') {
      // Any failure in half-open goes back to open
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

  /**
   * Remove failure timestamps outside the window
   */
  private cleanupFailureTimestamps(): void {
    const cutoff = Date.now() - this.config.failureWindow;
    this.failureTimestamps = this.failureTimestamps.filter(ts => ts > cutoff);
    this.failures = this.failureTimestamps.length;
  }

  // ============================================================================
  // Manual Controls
  // ============================================================================

  /**
   * Manually trip the circuit (force open)
   */
  trip(): void {
    this.transitionTo('open');
  }

  /**
   * Manually reset the circuit (force closed)
   */
  reset(): void {
    this.transitionTo('closed');
  }

  /**
   * Force half-open state for testing
   */
  halfOpen(): void {
    this.transitionTo('half-open');
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get circuit breaker statistics
   */
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

  /**
   * Get configuration
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Circuit Breaker Registry
// ============================================================================

/**
 * Registry for managing multiple circuit breakers
 */
class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: Partial<CircuitBreakerConfig> = {};

  /**
   * Get or create a circuit breaker by name
   */
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

  /**
   * Check if a circuit breaker exists
   */
  has(name: string): boolean {
    return this.breakers.has(name);
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  /**
   * Get all circuit breakers
   */
  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get stats for all circuit breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};

    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }

    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Set default configuration for new circuit breakers
   */
  setDefaultConfig(config: Partial<CircuitBreakerConfig>): void {
    this.defaultConfig = config;
  }

  /**
   * Clear all circuit breakers
   */
  clear(): void {
    this.breakers.clear();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Get a circuit breaker by name (convenience function)
 */
export function getCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return circuitBreakerRegistry.get(name, config);
}

export default CircuitBreaker;
