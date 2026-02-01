/**
 * Error Handling Decorator & Utilities
 *
 * Provides standardized error handling for all services and methods.
 * Integrates with ErrorService for user-friendly error messages.
 */

import { errorService } from '../services/ErrorService';

export interface ErrorDecoratorOptions {
  /** Service name for error context */
  serviceName: string;
  /** Whether to rethrow the error after handling */
  rethrow?: boolean;
  /** Custom error code mapping */
  errorCodeMap?: Record<string, string>;
  /** Whether to log the error */
  log?: boolean;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier?: number;
  };
}

/**
 * Error categories for classification
 */
export type ErrorCategory =
  | 'network'
  | 'validation'
  | 'permission'
  | 'timeout'
  | 'execution'
  | 'resource'
  | 'unknown';

/**
 * Classify an error into a category based on its message/type
 */
export function classifyError(error: unknown): ErrorCategory {
  if (!(error instanceof Error)) return 'unknown';

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('cors') ||
    message.includes('failed to fetch') ||
    name === 'typeerror' && message.includes('fetch')
  ) {
    return 'network';
  }

  // Timeout errors
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('deadline')
  ) {
    return 'timeout';
  }

  // Permission errors
  if (
    message.includes('permission') ||
    message.includes('denied') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('not allowed')
  ) {
    return 'permission';
  }

  // Validation errors
  if (
    message.includes('invalid') ||
    message.includes('validation') ||
    message.includes('required') ||
    message.includes('missing')
  ) {
    return 'validation';
  }

  // Resource errors
  if (
    message.includes('not found') ||
    message.includes('does not exist') ||
    message.includes('unavailable')
  ) {
    return 'resource';
  }

  return 'execution';
}

/**
 * Decorator for async methods that standardizes error handling
 */
export function withErrorHandling(options: ErrorDecoratorOptions) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    _target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const { serviceName, rethrow = true, log = true, retry } = options;
      let lastError: Error | null = null;
      const maxAttempts = retry?.maxAttempts ?? 1;
      let delay = retry?.delayMs ?? 1000;
      const backoff = retry?.backoffMultiplier ?? 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const category = classifyError(lastError);

          // Log if enabled
          if (log) {
            console.error(
              `[${serviceName}] ${propertyKey} failed (attempt ${attempt}/${maxAttempts}):`,
              lastError.message
            );
          }

          // Report to ErrorService
          errorService.fromException(lastError, {
            component: serviceName,
            action: propertyKey,
          });

          // Only retry on network/timeout errors
          const shouldRetry =
            attempt < maxAttempts &&
            (category === 'network' || category === 'timeout');

          if (shouldRetry) {
            console.log(`[${serviceName}] Retrying ${propertyKey} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= backoff;
          }
        }
      }

      // If we've exhausted retries and rethrow is enabled
      if (rethrow && lastError) {
        throw lastError;
      }

      return undefined;
    } as T;
  };
}

/**
 * Wrapper function for error handling (non-decorator version)
 * Use this when decorators aren't practical
 */
export async function handleErrors<T>(
  fn: () => Promise<T>,
  context: { serviceName: string; action: string }
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    errorService.fromException(err, {
      component: context.serviceName,
      action: context.action,
    });

    throw err;
  }
}

/**
 * Wrapper with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    shouldRetry = (err) => {
      const cat = classifyError(err);
      return cat === 'network' || cat === 'timeout';
    },
    onRetry,
  } = options;

  let delay = delayMs;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts && shouldRetry(lastError)) {
        onRetry?.(attempt, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= backoffMultiplier;
      }
    }
  }

  throw lastError;
}

/**
 * Create a timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Aggregate multiple errors into one
 */
export class AggregateError extends Error {
  public readonly errors: Error[];

  constructor(errors: Error[], message = 'Multiple errors occurred') {
    super(message);
    this.name = 'AggregateError';
    this.errors = errors;
  }
}

export default {
  withErrorHandling,
  handleErrors,
  withRetry,
  withTimeout,
  classifyError,
  safeJsonParse,
  AggregateError,
};
