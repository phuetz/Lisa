import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerError } from '../CircuitBreaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    breaker = new CircuitBreaker('test', {
      failureThreshold: 3,
      resetTimeout: 5000,
      successThreshold: 2,
      failureWindow: 60000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be closed initially', () => {
    expect(breaker.getState()).toBe('closed');
  });

  it('should allow requests when closed', async () => {
    const result = await breaker.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(breaker.getState()).toBe('closed');
  });

  it('should open after reaching the failure threshold', async () => {
    const failingFn = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await breaker.execute(failingFn).catch(() => {});
    }

    expect(breaker.getState()).toBe('open');
  });

  it('should reject requests immediately when open', async () => {
    breaker.trip(); // Force open

    await expect(
      breaker.execute(() => Promise.resolve('ok'))
    ).rejects.toThrow(CircuitBreakerError);

    const stats = breaker.getStats();
    expect(stats.totalRejected).toBe(1);
  });

  it('should transition to half-open after the reset timeout elapses', () => {
    breaker.trip(); // Force open
    expect(breaker.getState()).toBe('open');

    // Advance time past the reset timeout
    vi.advanceTimersByTime(5001);

    // isAllowed triggers the state check
    expect(breaker.isAllowed()).toBe(true);
    expect(breaker.getState()).toBe('half-open');
  });

  it('should close again after enough successful half-open requests', async () => {
    breaker.halfOpen(); // Force half-open

    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.getState()).toBe('half-open'); // Still half-open (need 2 successes)

    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.getState()).toBe('closed'); // Now closed
  });

  it('should re-open on a failed half-open request', async () => {
    breaker.halfOpen(); // Force half-open

    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});

    expect(breaker.getState()).toBe('open');
  });

  it('should call onStateChange callback when state transitions', async () => {
    const onStateChange = vi.fn();
    breaker = new CircuitBreaker('test-callback', {
      failureThreshold: 1,
      resetTimeout: 5000,
      successThreshold: 1,
      failureWindow: 60000,
      onStateChange,
    });

    // Trigger failure to open the circuit
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});

    expect(onStateChange).toHaveBeenCalledWith('closed', 'open', breaker);
  });

  it('should use executeWithFallback when circuit is open', async () => {
    breaker.trip(); // Force open

    const result = await breaker.executeWithFallback(
      () => Promise.resolve('primary'),
      () => 'fallback'
    );

    expect(result).toBe('fallback');
  });

  it('should track statistics correctly', async () => {
    // 2 successes
    await breaker.execute(() => Promise.resolve('ok'));
    await breaker.execute(() => Promise.resolve('ok'));

    // 3 failures -> opens circuit
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }

    // 1 rejected (circuit is open)
    await breaker.execute(() => Promise.resolve('ok')).catch(() => {});

    const stats = breaker.getStats();
    expect(stats.totalRequests).toBe(6);
    expect(stats.totalSuccesses).toBe(2);
    expect(stats.totalFailures).toBe(3);
    expect(stats.totalRejected).toBe(1);
    expect(stats.state).toBe('open');
  });
});
