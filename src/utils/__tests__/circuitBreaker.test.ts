/**
 * Tests for Circuit Breaker
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitState, CircuitBreakerOpenError } from '../circuitBreaker';
import { wait, createFlakeyMock } from './testHelpers';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in CLOSED state', () => {
    const fn = vi.fn().mockResolvedValue('success');
    const breaker = new CircuitBreaker(fn);

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should execute function when CLOSED', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const breaker = new CircuitBreaker(fn);

    const result = await breaker.execute('arg1');

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledWith('arg1');
  });

  it('should open circuit after threshold failures', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const breaker = new CircuitBreaker(fn, { failureThreshold: 3 });

    // First 3 failures should open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute()).rejects.toThrow('fail');
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Next call should be blocked
    await expect(breaker.execute()).rejects.toThrow(CircuitBreakerOpenError);
    expect(fn).toHaveBeenCalledTimes(3); // Not called the 4th time
  });

  it('should transition to HALF_OPEN after reset timeout', async () => {
    vi.useFakeTimers();

    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const breaker = new CircuitBreaker(fn, {
      failureThreshold: 2,
      resetTimeout: 5000,
    });

    // Open the circuit
    await expect(breaker.execute()).rejects.toThrow('fail');
    await expect(breaker.execute()).rejects.toThrow('fail');
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Advance time
    vi.advanceTimersByTime(5000);
    await wait(0); // Let promises resolve

    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    vi.useRealTimers();
  });

  it('should close circuit after successful calls in HALF_OPEN', async () => {
    const fn = createFlakeyMock('success', 2);
    const breaker = new CircuitBreaker(fn, {
      failureThreshold: 2,
      successThreshold: 2,
      resetTimeout: 100,
    });

    // Open circuit
    await expect(breaker.execute()).rejects.toThrow();
    await expect(breaker.execute()).rejects.toThrow();
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Wait for reset
    await wait(150);

    // Should be HALF_OPEN, need 2 successes
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    await breaker.execute(); // Success 1
    await breaker.execute(); // Success 2

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should reopen circuit on failure in HALF_OPEN', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockRejectedValueOnce(new Error('fail3'));

    const breaker = new CircuitBreaker(fn, {
      failureThreshold: 2,
      resetTimeout: 100,
    });

    // Open circuit
    await expect(breaker.execute()).rejects.toThrow('fail1');
    await expect(breaker.execute()).rejects.toThrow('fail2');
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Wait for reset to HALF_OPEN
    await wait(150);
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    // Failure in HALF_OPEN should reopen
    await expect(breaker.execute()).rejects.toThrow('fail3');
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should call onStateChange callback', async () => {
    const onStateChange = vi.fn();
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    const breaker = new CircuitBreaker(fn, {
      failureThreshold: 2,
      onStateChange,
    });

    await expect(breaker.execute()).rejects.toThrow();
    await expect(breaker.execute()).rejects.toThrow();

    expect(onStateChange).toHaveBeenCalledWith(
      CircuitState.CLOSED,
      CircuitState.OPEN
    );
  });

  it('should track statistics', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce('success1')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success2');

    const breaker = new CircuitBreaker(fn, { failureThreshold: 10 });

    await breaker.execute();
    await expect(breaker.execute()).rejects.toThrow();
    await breaker.execute();

    const stats = breaker.getStats();
    expect(stats.totalRequests).toBe(3);
    expect(stats.failures).toBe(1);
    expect(stats.successes).toBe(2);
  });

  it('should manually reset circuit', () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const breaker = new CircuitBreaker(fn, { failureThreshold: 1 });

    breaker.execute().catch(() => {});
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    breaker.reset();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker.getStats().failures).toBe(0);
  });

  it('should manually open circuit', () => {
    const fn = vi.fn().mockResolvedValue('success');
    const breaker = new CircuitBreaker(fn);

    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    breaker.open();
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should respect isFailure predicate', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 400 }) // Client error - don't count
      .mockRejectedValueOnce({ status: 500 }); // Server error - count

    const isFailure = (error: any) => {
      return error.status >= 500;
    };

    const breaker = new CircuitBreaker(fn, {
      failureThreshold: 1,
      isFailure,
    });

    // First error shouldn't count
    await expect(breaker.execute()).rejects.toEqual({ status: 400 });
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    // Second error should open circuit
    await expect(breaker.execute()).rejects.toEqual({ status: 500 });
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });
});
