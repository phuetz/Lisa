/**
 * RetryService - Retry with Exponential Backoff
 *
 * Delegates to @phuetz/ai-providers for core retry logic.
 * Preserves Lisa-specific RetryService class for stateful config management
 * and backward-compatible API (withRetry, withRetryResult, wrap).
 */

// Re-export shared retry primitives from @phuetz/ai-providers
export {
  retry,
  retryWithResult,
  RetryStrategies,
  RetryPredicates,
} from '@phuetz/ai-providers';
export type { RetryOptions, RetryResult } from '@phuetz/ai-providers';

// ============================================================================
// Lisa-Specific Types (backward compat)
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
// Error Classification (Lisa-specific, keyword-based)
// ============================================================================

/**
 * Classify an error to determine if it's retryable
 */
export function classifyError(error: Error): RetryableError | 'non_retryable' {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  if (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests') ||
    message.includes('quota exceeded')
  ) {
    return 'rate_limit';
  }

  if (
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('timed out') ||
    name.includes('timeout')
  ) {
    return 'timeout';
  }

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

  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('internal server error')
  ) {
    return 'server_error';
  }

  if (
    message.includes('503') ||
    message.includes('unavailable') ||
    message.includes('service unavailable')
  ) {
    return 'unavailable';
  }

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
  const exponentialDelay = config.minDelayMs * Math.pow(2, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  const jitterRange = cappedDelay * config.jitter;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  return Math.round(cappedDelay + jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Lisa-Specific RetryService Class
// ============================================================================

/**
 * Stateful retry service used by AIService.
 * Uses Lisa's RetryConfig (attempts/minDelayMs/maxDelayMs/jitter) API
 * which differs from the shared `retry()` function's RetryOptions API.
 */
export class RetryService {
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async withRetry<T>(
    fn: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const mergedConfig = { ...this.config, ...config };
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= mergedConfig.attempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt >= mergedConfig.attempts) break;
        if (!isRetryableError(lastError, mergedConfig)) throw lastError;

        const delay = calculateDelay(attempt, mergedConfig);
        if (mergedConfig.onRetry) {
          mergedConfig.onRetry(attempt, lastError, delay);
        }

        console.warn(
          `[RetryService] Attempt ${attempt}/${mergedConfig.attempts} failed:`,
          lastError.message,
          `Retrying in ${delay}ms...`
        );

        await sleep(delay);
      }
    }

    const totalTime = Date.now() - startTime;
    console.error(
      `[RetryService] All ${mergedConfig.attempts} attempts failed after ${totalTime}ms`
    );

    throw lastError || new Error('All retry attempts failed');
  }

  async withRetryResult<T>(
    fn: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<{ success: boolean; result?: T; error?: Error; attempts: number; totalTimeMs: number }> {
    const mergedConfig = { ...this.config, ...config };
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= mergedConfig.attempts; attempt++) {
      attempts = attempt;
      try {
        const result = await fn();
        return { success: true, result, attempts, totalTimeMs: Date.now() - startTime };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt >= mergedConfig.attempts) break;
        if (!isRetryableError(lastError, mergedConfig)) break;

        const delay = calculateDelay(attempt, mergedConfig);
        if (mergedConfig.onRetry) {
          mergedConfig.onRetry(attempt, lastError, delay);
        }
        await sleep(delay);
      }
    }

    return { success: false, error: lastError, attempts, totalTimeMs: Date.now() - startTime };
  }

  wrap<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    config?: Partial<RetryConfig>
  ): (...args: T) => Promise<R> {
    return (...args: T) => this.withRetry(() => fn(...args), config);
  }

  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const retryService = new RetryService();

export default RetryService;
