/**
 * Circuit Breaker pattern implementation
 * Prevents cascading failures by stopping requests to failing services
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit */
  failureThreshold?: number;
  /** Time in ms before attempting to close circuit */
  resetTimeout?: number;
  /** Number of successful requests needed to close circuit from half-open */
  successThreshold?: number;
  /** Function to determine if error should count as failure */
  isFailure?: (error: unknown) => boolean;
  /** Callback when circuit state changes */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

interface CircuitStats {
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
}

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  successThreshold: 2,
  isFailure: () => true,
  onStateChange: () => {},
};

/**
 * Circuit Breaker implementation for fault tolerance
 * Automatically stops sending requests to failing services
 *
 * @example
 * const breaker = new CircuitBreaker(
 *   async (url: string) => fetch(url),
 *   { failureThreshold: 3, resetTimeout: 30000 }
 * );
 * const result = await breaker.execute('/api/data');
 */
export class CircuitBreaker<TArgs extends any[], TReturn> {
  private state: CircuitState = CircuitState.CLOSED;
  private stats: CircuitStats = {
    failures: 0,
    successes: 0,
    totalRequests: 0,
  };
  private resetTimer?: NodeJS.Timeout;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(
    private readonly fn: (...args: TArgs) => Promise<TReturn>,
    options: CircuitBreakerOptions = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute the protected function through the circuit breaker
   */
  async execute(...args: TArgs): Promise<TReturn> {
    this.stats.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      throw new CircuitBreakerOpenError(
        'Circuit breaker is OPEN - request blocked',
        this.stats
      );
    }

    try {
      const result = await this.fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.stats.successes++;
    this.stats.lastSuccessTime = Date.now();

    // If half-open and enough successes, close the circuit
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.stats.successes >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.stats.failures = 0;
        this.stats.successes = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.stats.failures = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: unknown): void {
    if (!this.options.isFailure(error)) {
      return; // Don't count this as a failure
    }

    this.stats.failures++;
    this.stats.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state reopens circuit
      this.transitionTo(CircuitState.OPEN);
      this.scheduleReset();
    } else if (this.state === CircuitState.CLOSED) {
      // Open circuit if failure threshold reached
      if (this.stats.failures >= this.options.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
        this.scheduleReset();
      }
    }
  }

  /**
   * Schedule circuit reset after timeout
   */
  private scheduleReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        this.transitionTo(CircuitState.HALF_OPEN);
        this.stats.successes = 0; // Reset success counter for half-open test
      }
    }, this.options.resetTimeout);
  }

  /**
   * Transition to a new circuit state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    if (oldState !== newState) {
      this.state = newState;
      this.options.onStateChange(oldState, newState);
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current statistics
   */
  getStats(): Readonly<CircuitStats> {
    return { ...this.stats };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    this.transitionTo(CircuitState.CLOSED);
    this.stats = {
      failures: 0,
      successes: 0,
      totalRequests: 0,
    };
  }

  /**
   * Manually open the circuit breaker
   */
  open(): void {
    this.transitionTo(CircuitState.OPEN);
    this.scheduleReset();
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string, public readonly stats: CircuitStats) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Factory function to create circuit breaker protected function
 */
export function withCircuitBreaker<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: CircuitBreakerOptions = {}
): CircuitBreaker<TArgs, TReturn> {
  return new CircuitBreaker(fn, options);
}
