/**
 * Client-side rate limiter implementations
 * Provides token bucket and sliding window algorithms
 */

export interface RateLimiterOptions {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Callback when rate limit is exceeded */
  onLimitExceeded?: (retryAfter: number) => void;
}

/**
 * Token Bucket rate limiter
 * Tokens are added at a constant rate, requests consume tokens
 */
export class TokenBucketLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly tokensPerInterval: number;
  private readonly refillInterval: number;

  constructor(private readonly options: RateLimiterOptions) {
    this.tokens = options.maxRequests;
    this.lastRefill = Date.now();
    this.refillInterval = options.windowMs;
    this.tokensPerInterval = options.maxRequests;
  }

  /**
   * Try to consume a token for a request
   * @returns true if request is allowed, false if rate limited
   */
  tryAcquire(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    const retryAfter = this.getRetryAfter();
    this.options.onLimitExceeded?.(retryAfter);
    return false;
  }

  /**
   * Wait until a token is available
   */
  async acquire(tokens: number = 1): Promise<void> {
    while (!this.tryAcquire(tokens)) {
      const retryAfter = this.getRetryAfter();
      await new Promise(resolve => setTimeout(resolve, retryAfter));
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const intervalsElapsed = Math.floor(elapsed / this.refillInterval);

    if (intervalsElapsed > 0) {
      this.tokens = Math.min(
        this.options.maxRequests,
        this.tokens + (intervalsElapsed * this.tokensPerInterval)
      );
      this.lastRefill = now;
    }
  }

  /**
   * Get time in ms until next token is available
   */
  private getRetryAfter(): number {
    const now = Date.now();
    const timeSinceRefill = now - this.lastRefill;
    return Math.max(0, this.refillInterval - timeSinceRefill);
  }

  /**
   * Get current number of available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Reset the limiter
   */
  reset(): void {
    this.tokens = this.options.maxRequests;
    this.lastRefill = Date.now();
  }
}

/**
 * Sliding Window rate limiter
 * Tracks exact timestamps of requests in a sliding time window
 */
export class SlidingWindowLimiter {
  private timestamps: number[] = [];

  constructor(private readonly options: RateLimiterOptions) {}

  /**
   * Try to record a request
   * @returns true if request is allowed, false if rate limited
   */
  tryAcquire(): boolean {
    const now = Date.now();
    this.cleanup(now);

    if (this.timestamps.length < this.options.maxRequests) {
      this.timestamps.push(now);
      return true;
    }

    const retryAfter = this.getRetryAfter(now);
    this.options.onLimitExceeded?.(retryAfter);
    return false;
  }

  /**
   * Wait until request can be made
   */
  async acquire(): Promise<void> {
    while (!this.tryAcquire()) {
      const retryAfter = this.getRetryAfter(Date.now());
      await new Promise(resolve => setTimeout(resolve, retryAfter));
    }
  }

  /**
   * Remove timestamps outside the current window
   */
  private cleanup(now: number): void {
    const cutoff = now - this.options.windowMs;
    this.timestamps = this.timestamps.filter(ts => ts > cutoff);
  }

  /**
   * Get time in ms until next request can be made
   */
  private getRetryAfter(now: number): number {
    if (this.timestamps.length === 0) {
      return 0;
    }
    const oldestTimestamp = this.timestamps[0];
    return Math.max(0, oldestTimestamp + this.options.windowMs - now);
  }

  /**
   * Get current request count in window
   */
  getRequestCount(): number {
    this.cleanup(Date.now());
    return this.timestamps.length;
  }

  /**
   * Reset the limiter
   */
  reset(): void {
    this.timestamps = [];
  }
}

/**
 * Rate limiter with multiple tiers (burst and sustained)
 */
export class TieredRateLimiter {
  private burstLimiter: TokenBucketLimiter;
  private sustainedLimiter: SlidingWindowLimiter;

  constructor(
    burstOptions: RateLimiterOptions,
    sustainedOptions: RateLimiterOptions
  ) {
    this.burstLimiter = new TokenBucketLimiter(burstOptions);
    this.sustainedLimiter = new SlidingWindowLimiter(sustainedOptions);
  }

  /**
   * Try to acquire permission for request
   * Must pass both burst and sustained limits
   */
  tryAcquire(): boolean {
    return this.burstLimiter.tryAcquire() && this.sustainedLimiter.tryAcquire();
  }

  /**
   * Wait until request can be made
   */
  async acquire(): Promise<void> {
    await this.burstLimiter.acquire();
    await this.sustainedLimiter.acquire();
  }

  /**
   * Reset both limiters
   */
  reset(): void {
    this.burstLimiter.reset();
    this.sustainedLimiter.reset();
  }
}

/**
 * Decorator for rate limiting class methods
 */
export function RateLimit(limiter: TokenBucketLimiter | SlidingWindowLimiter) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (!limiter.tryAcquire()) {
        throw new RateLimitExceededError('Rate limit exceeded');
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitExceededError extends Error {
  constructor(message: string, public readonly retryAfter?: number) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

/**
 * Create a rate-limited version of a function
 */
export function withRateLimit<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  limiter: TokenBucketLimiter | SlidingWindowLimiter
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs) => {
    await limiter.acquire();
    return fn(...args);
  };
}
