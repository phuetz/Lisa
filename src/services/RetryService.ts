/**
 * RetryService - OpenClaw-Inspired Retry with Exponential Backoff
 *
 * Provides automatic retry logic for transient failures with:
 * - Exponential backoff with configurable delays
 * - Jitter to prevent thundering herd
 * - Retryable error classification
 * - Attempt tracking and logging
 */

// ============================================================================
// Types
// ============================================================================

export interface RetryConfig {
  /** Maximum number of retry attempts */
  attempts: number;
  /** Minimum delay between retries (ms) */
  minDelayMs: number;
  /** Maximum delay between retries (ms) */
  maxDelayMs: number;
  /** Jitter factor (0-1, e.g., 0.1 = +/-10%) */
  jitter: number;
  /** Error types that should trigger retry */
  retryableErrors: string[];
  /** Callback on each retry attempt */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export interface RetryResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** The result if successful */
  result?: T;
  /** The error if all retries failed */
  error?: Error;
  /** Number of attempts made */
  attempts: number;
  /** Total time spent including delays (ms) */
  totalTimeMs: number;
}

export type RetryableError =
  | 'rate_limit'
  | 'timeout'
  | 'network'
  | 'server_error'
  | 'unavailable'
  | 'overloaded';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: RetryConfig = {
  attempts: 3,
  minDelayMs: 400,
  maxDelayMs: 30000,
  jitter: 0.1,
  retryableErrors: [
    'rate_limit',
    'timeout',
    'network',
    'server_error',
    'unavailable',
    'overloaded',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    '429',
    '500',
    '502',
    '503',
    '504'
  ]
};

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Classify an error to determine if it's retryable
 */
export function classifyError(error: Error): RetryableError | 'non_retryable' {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Rate limiting
  if (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests') ||
    message.includes('quota exceeded')
  ) {
    return 'rate_limit';
  }

  // Timeout
  if (
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('timed out') ||
    name.includes('timeout')
  ) {
    return 'timeout';
  }

  // Network errors
  if (
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('eai_again') ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch')
  ) {
    return 'network';
  }

  // Server errors (5xx)
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('internal server error')
  ) {
    return 'server_error';
  }

  // Service unavailable
  if (
    message.includes('503') ||
    message.includes('unavailable') ||
    message.includes('service unavailable')
  ) {
    return 'unavailable';
  }

  // Overloaded
  if (
    message.includes('504') ||
    message.includes('overloaded') ||
    message.includes('capacity')
  ) {
    return 'overloaded';
  }

  return 'non_retryable';
}

/**
 * Check if an error is retryable based on configuration
 */
export function isRetryableError(error: Error, config: RetryConfig): boolean {
  const classification = classifyError(error);

  if (classification === 'non_retryable') {
    // Check if any retryable keyword is in the error
    const message = error.message.toLowerCase();
    return config.retryableErrors.some(keyword =>
      message.includes(keyword.toLowerCase())
    );
  }

  return config.retryableErrors.includes(classification);
}

// ============================================================================
// Delay Calculation
// ============================================================================

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Exponential backoff: minDelay * 2^attempt
  const exponentialDelay = config.minDelayMs * Math.pow(2, attempt - 1);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter (+/- jitter%)
  const jitterRange = cappedDelay * config.jitter;
  const jitter = (Math.random() * 2 - 1) * jitterRange;

  return Math.round(cappedDelay + jitter);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// RetryService Class
// ============================================================================

export class RetryService {
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function with automatic retry on failure
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const mergedConfig = { ...this.config, ...config };
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= mergedConfig.attempts; attempt++) {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        if (attempt >= mergedConfig.attempts) {
          break; // No more retries
        }

        if (!isRetryableError(lastError, mergedConfig)) {
          throw lastError; // Non-retryable error
        }

        // Calculate delay
        const delay = calculateDelay(attempt, mergedConfig);

        // Notify callback
        if (mergedConfig.onRetry) {
          mergedConfig.onRetry(attempt, lastError, delay);
        }

        console.warn(
          `[RetryService] Attempt ${attempt}/${mergedConfig.attempts} failed:`,
          lastError.message,
          `Retrying in ${delay}ms...`
        );

        // Wait before retry
        await sleep(delay);
      }
    }

    // All retries exhausted
    const totalTime = Date.now() - startTime;
    console.error(
      `[RetryService] All ${mergedConfig.attempts} attempts failed after ${totalTime}ms`
    );

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Execute a function with retry and return detailed result
   */
  async withRetryResult<T>(
    fn: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const mergedConfig = { ...this.config, ...config };
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= mergedConfig.attempts; attempt++) {
      attempts = attempt;

      try {
        const result = await fn();
        return {
          success: true,
          result,
          attempts,
          totalTimeMs: Date.now() - startTime
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt >= mergedConfig.attempts) {
          break;
        }

        if (!isRetryableError(lastError, mergedConfig)) {
          break;
        }

        const delay = calculateDelay(attempt, mergedConfig);

        if (mergedConfig.onRetry) {
          mergedConfig.onRetry(attempt, lastError, delay);
        }

        await sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
      totalTimeMs: Date.now() - startTime
    };
  }

  /**
   * Create a retryable version of a function
   */
  wrap<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    config?: Partial<RetryConfig>
  ): (...args: T) => Promise<R> {
    return (...args: T) => this.withRetry(() => fn(...args), config);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const retryService = new RetryService();

export default RetryService;
