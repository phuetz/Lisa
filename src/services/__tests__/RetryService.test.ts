import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryService, calculateDelay } from '../RetryService';

describe('RetryService', () => {
  let service: RetryService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new RetryService({
      attempts: 3,
      minDelayMs: 100,
      maxDelayMs: 5000,
      jitter: 0, // Disable jitter for deterministic tests
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first try without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const promise = service.withRetry(fn);
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable failure and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce('success');

    const promise = service.withRetry(fn);

    // Advance past the first retry delay (100ms for attempt 1)
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after exhausting all retry attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network error'));

    const promise = service.withRetry(fn).catch((e: Error) => {
      expect(e.message).toBe('network error');
      return '__rejected__';
    });

    // Advance past all retry delays
    await vi.advanceTimersByTimeAsync(10000);

    const result = await promise;
    expect(result).toBe('__rejected__');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('syntax error in your code'));

    const promise = service.withRetry(fn);

    await expect(promise).rejects.toThrow('syntax error in your code');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call the onRetry callback on each retry', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('ok');

    const promise = service.withRetry(fn, { onRetry });

    // Advance past all retry delays
    await vi.advanceTimersByTimeAsync(10000);

    await promise;
    expect(onRetry).toHaveBeenCalledTimes(2);
    // First retry: attempt 1, the error, and the calculated delay
    expect(onRetry.mock.calls[0][0]).toBe(1);
    expect(onRetry.mock.calls[0][1]).toBeInstanceOf(Error);
    expect(typeof onRetry.mock.calls[0][2]).toBe('number');
  });

  it('should return detailed result via withRetryResult on success', async () => {
    const fn = vi.fn().mockResolvedValue('data');

    const result = await service.withRetryResult(fn);

    expect(result.success).toBe(true);
    expect(result.result).toBe('data');
    expect(result.attempts).toBe(1);
    expect(typeof result.totalTimeMs).toBe('number');
  });

  it('should return detailed result via withRetryResult on failure', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network error'));

    const promise = service.withRetryResult(fn);
    await vi.advanceTimersByTimeAsync(10000);
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.attempts).toBe(3);
  });

  it('should wrap a function to be automatically retried', async () => {
    const original = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('wrapped-result');

    const wrapped = service.wrap(original);
    const promise = wrapped();

    await vi.advanceTimersByTimeAsync(10000);

    const result = await promise;
    expect(result).toBe('wrapped-result');
    expect(original).toHaveBeenCalledTimes(2);
  });
});

describe('calculateDelay', () => {
  it('should use exponential backoff (minDelay * 2^(attempt-1))', () => {
    const config = {
      attempts: 5,
      minDelayMs: 100,
      maxDelayMs: 10000,
      jitter: 0,
      retryableErrors: [],
    };

    expect(calculateDelay(1, config)).toBe(100);  // 100 * 2^0
    expect(calculateDelay(2, config)).toBe(200);  // 100 * 2^1
    expect(calculateDelay(3, config)).toBe(400);  // 100 * 2^2
    expect(calculateDelay(4, config)).toBe(800);  // 100 * 2^3
  });

  it('should cap delay at maxDelayMs', () => {
    const config = {
      attempts: 10,
      minDelayMs: 1000,
      maxDelayMs: 5000,
      jitter: 0,
      retryableErrors: [],
    };

    // 1000 * 2^5 = 32000 but capped at 5000
    expect(calculateDelay(6, config)).toBe(5000);
  });
});
