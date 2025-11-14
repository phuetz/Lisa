/**
 * Retry utility with exponential backoff
 * Provides resilient execution of async operations with configurable retry logic
 */

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Function to determine if error is retryable */
  shouldRetry?: (error: unknown) => boolean;
  /** Callback called before each retry */
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
  totalTime: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
  onRetry: () => {},
};

/**
 * Execute an async operation with exponential backoff retry logic
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns RetryResult with success status and data/error
 *
 * @example
 * const result = await retryWithBackoff(
 *   async () => await fetchData(),
 *   { maxAttempts: 5, initialDelay: 500 }
 * );
 * if (result.success) {
 *   console.log('Data:', result.data);
 * }
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error;

      // If this was the last attempt or error is not retryable, fail
      if (attempt >= opts.maxAttempts || !opts.shouldRetry(error)) {
        return {
          success: false,
          error,
          attempts: attempt,
          totalTime: Date.now() - startTime,
        };
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      );

      // Add jitter to prevent thundering herd (±10%)
      const jitter = delay * 0.1 * (Math.random() * 2 - 1);
      const actualDelay = Math.round(delay + jitter);

      opts.onRetry(attempt, error, actualDelay);

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, actualDelay));
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    success: false,
    error: lastError,
    attempts: opts.maxAttempts,
    totalTime: Date.now() - startTime,
  };
}

/**
 * Create a retryable version of an async function
 * @param fn - The async function to wrap
 * @param options - Retry configuration options
 * @returns A new function that executes with retry logic
 *
 * @example
 * const resilientFetch = withRetry(
 *   async (url: string) => await fetch(url),
 *   { maxAttempts: 3 }
 * );
 * const result = await resilientFetch('https://api.example.com');
 */
export function withRetry<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<RetryResult<TReturn>> {
  return async (...args: TArgs) => {
    return retryWithBackoff(() => fn(...args), options);
  };
}

/**
 * Common retry predicates for network errors
 */
export const RetryPredicates = {
  /** Retry on network errors and 5xx status codes */
  networkErrors: (error: unknown): boolean => {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true; // Network error
    }
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;
      return status >= 500 && status < 600; // Server errors
    }
    return false;
  },

  /** Retry on timeout errors */
  timeoutErrors: (error: unknown): boolean => {
    if (error instanceof Error) {
      return error.message.toLowerCase().includes('timeout');
    }
    return false;
  },

  /** Retry on rate limit errors (429) */
  rateLimitErrors: (error: unknown): boolean => {
    if (error && typeof error === 'object' && 'status' in error) {
      return (error as any).status === 429;
    }
    return false;
  },

  /** Combine multiple predicates with OR logic */
  any: (...predicates: Array<(error: unknown) => boolean>) => {
    return (error: unknown): boolean => {
      return predicates.some(predicate => predicate(error));
    };
  },
};

/**
 * Retry decorator for class methods (TypeScript decorator)
 * @param options - Retry configuration options
 *
 * @example
 * class MyService {
 *   @Retry({ maxAttempts: 3 })
 *   async fetchData() {
 *     return await fetch('/api/data');
 *   }
 * }
 */
export function Retry(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await retryWithBackoff(
        () => originalMethod.apply(this, args),
        options
      );

      if (result.success) {
        return result.data;
      } else {
        throw result.error;
      }
    };

    return descriptor;
  };
}
