/**
 * Tests for retry utility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithBackoff, withRetry, RetryPredicates } from '../retry';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(fn);

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const result = await retryWithBackoff(fn, { maxAttempts: 3, initialDelay: 10 });

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should fail after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fail'));

    const result = await retryWithBackoff(fn, { maxAttempts: 3, initialDelay: 10 });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should respect shouldRetry predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('non-retryable'));
    const shouldRetry = vi.fn().mockReturnValue(false);

    const result = await retryWithBackoff(fn, { shouldRetry, initialDelay: 10 });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    const onRetry = vi.fn();

    await retryWithBackoff(fn, { maxAttempts: 2, onRetry, initialDelay: 10 });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number));
  });
});

describe('withRetry', () => {
  it('should create retryable function', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const retryableFn = withRetry(fn, { maxAttempts: 3 });

    const result = await retryableFn('arg1', 'arg2');

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('RetryPredicates', () => {
  it('should identify network errors', () => {
    const networkError = new TypeError('fetch failed');
    expect(RetryPredicates.networkErrors(networkError)).toBe(true);

    const serverError = { status: 503 };
    expect(RetryPredicates.networkErrors(serverError)).toBe(true);

    const clientError = { status: 404 };
    expect(RetryPredicates.networkErrors(clientError)).toBe(false);
  });

  it('should identify timeout errors', () => {
    const timeoutError = new Error('Request timeout');
    expect(RetryPredicates.timeoutErrors(timeoutError)).toBe(true);

    const otherError = new Error('Other error');
    expect(RetryPredicates.timeoutErrors(otherError)).toBe(false);
  });

  it('should combine predicates', () => {
    const combined = RetryPredicates.any(
      RetryPredicates.networkErrors,
      RetryPredicates.timeoutErrors
    );

    expect(combined(new TypeError('fetch failed'))).toBe(true);
    expect(combined(new Error('timeout'))).toBe(true);
    expect(combined(new Error('other'))).toBe(false);
  });
});
