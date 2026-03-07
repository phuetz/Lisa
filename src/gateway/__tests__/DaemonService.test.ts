import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DaemonService, resetDaemonService, getDaemonService } from '../DaemonService';

describe('DaemonService', () => {
  let daemon: DaemonService;

  beforeEach(() => {
    vi.useFakeTimers();
    resetDaemonService();
    daemon = new DaemonService({ heartbeatIntervalMs: 1000, activeHoursStart: 0, activeHoursEnd: 24 });
  });

  afterEach(() => {
    daemon.stop();
    daemon.removeAllListeners();
    vi.useRealTimers();
  });

  describe('lifecycle', () => {
    it('should start and stop', async () => {
      expect(daemon.isRunning()).toBe(false);
      await daemon.start();
      expect(daemon.isRunning()).toBe(true);
      expect(daemon.getUptime()).toBeGreaterThanOrEqual(0);
      await daemon.stop();
      expect(daemon.isRunning()).toBe(false);
    });

    it('should emit started/stopped events', async () => {
      const started = vi.fn();
      const stopped = vi.fn();
      daemon.on('daemon:started', started);
      daemon.on('daemon:stopped', stopped);

      await daemon.start();
      expect(started).toHaveBeenCalledTimes(1);
      await daemon.stop();
      expect(stopped).toHaveBeenCalledTimes(1);
    });

    it('should not start twice', async () => {
      await daemon.start();
      await daemon.start(); // No-op
      expect(daemon.isRunning()).toBe(true);
    });
  });

  describe('service management', () => {
    it('should register and start a service', async () => {
      const startFn = vi.fn().mockResolvedValue(undefined);
      const stopFn = vi.fn().mockResolvedValue(undefined);

      daemon.registerService('test-svc', startFn, stopFn);
      await daemon.startService('test-svc');

      expect(startFn).toHaveBeenCalledTimes(1);
      const svc = daemon.getService('test-svc');
      expect(svc?.status).toBe('running');
    });

    it('should stop a running service', async () => {
      const stopFn = vi.fn().mockResolvedValue(undefined);
      daemon.registerService('svc', vi.fn().mockResolvedValue(undefined), stopFn);
      await daemon.startService('svc');
      await daemon.stopService('svc');

      expect(stopFn).toHaveBeenCalledTimes(1);
      expect(daemon.getService('svc')?.status).toBe('stopped');
    });

    it('should restart a service', async () => {
      const startFn = vi.fn().mockResolvedValue(undefined);
      const stopFn = vi.fn().mockResolvedValue(undefined);
      daemon.registerService('svc', startFn, stopFn);
      await daemon.startService('svc');
      await daemon.restartService('svc');

      expect(stopFn).toHaveBeenCalledTimes(1);
      expect(startFn).toHaveBeenCalledTimes(2);
      expect(daemon.getService('svc')?.status).toBe('running');
    });

    it('should mark service as failed on start error', async () => {
      daemon.registerService(
        'bad-svc',
        vi.fn().mockRejectedValue(new Error('boom')),
        vi.fn().mockResolvedValue(undefined),
      );
      await daemon.startService('bad-svc');

      const svc = daemon.getService('bad-svc');
      expect(svc?.status).toBe('failed');
      expect(svc?.failureCount).toBe(1);
      expect(svc?.lastError).toBe('boom');
    });

    it('should auto-start services when daemon starts', async () => {
      const startFn = vi.fn().mockResolvedValue(undefined);
      daemon.registerService('auto', startFn, vi.fn().mockResolvedValue(undefined));
      await daemon.start();

      expect(startFn).toHaveBeenCalledTimes(1);
    });

    it('should prevent duplicate registration', () => {
      daemon.registerService('dup', vi.fn().mockResolvedValue(undefined), vi.fn().mockResolvedValue(undefined));
      expect(() => daemon.registerService('dup', vi.fn().mockResolvedValue(undefined), vi.fn().mockResolvedValue(undefined)))
        .toThrow('already registered');
    });

    it('should unregister a stopped service', async () => {
      daemon.registerService('rem', vi.fn().mockResolvedValue(undefined), vi.fn().mockResolvedValue(undefined));
      expect(daemon.unregisterService('rem')).toBe(true);
      expect(daemon.getService('rem')).toBeUndefined();
    });

    it('should throw when unregistering a running service', async () => {
      daemon.registerService('running-svc', vi.fn().mockResolvedValue(undefined), vi.fn().mockResolvedValue(undefined));
      await daemon.startService('running-svc');
      expect(() => daemon.unregisterService('running-svc')).toThrow('Stop it first');
    });

    it('should throw for unknown service', async () => {
      await expect(daemon.startService('nope')).rejects.toThrow('Unknown service');
    });

    it('should list service names', () => {
      daemon.registerService('a', vi.fn().mockResolvedValue(undefined), vi.fn().mockResolvedValue(undefined));
      daemon.registerService('b', vi.fn().mockResolvedValue(undefined), vi.fn().mockResolvedValue(undefined));
      expect(daemon.getServiceNames()).toEqual(['a', 'b']);
    });
  });

  describe('heartbeat', () => {
    it('should tick at configured interval', async () => {
      const tickFn = vi.fn();
      daemon.on('heartbeat:tick', tickFn);

      daemon.registerService('svc', vi.fn().mockResolvedValue(undefined), vi.fn().mockResolvedValue(undefined));
      await daemon.start();

      // Advance past one heartbeat interval
      await vi.advanceTimersByTimeAsync(1100);
      expect(tickFn).toHaveBeenCalled();
    });

    it('should skip ticks outside active hours', async () => {
      const restrictedDaemon = new DaemonService({
        heartbeatIntervalMs: 1000,
        activeHoursStart: 10,
        activeHoursEnd: 11,
      });

      const skippedFn = vi.fn();
      restrictedDaemon.on('heartbeat:skipped', skippedFn);

      await restrictedDaemon.start();

      // Unless current hour is 10, ticks should be skipped
      const hour = new Date().getHours();
      await vi.advanceTimersByTimeAsync(1100);

      if (hour < 10 || hour >= 11) {
        expect(skippedFn).toHaveBeenCalled();
      }

      await restrictedDaemon.stop();
    });

    it('should auto-restart unhealthy service after max failures', async () => {
      let callCount = 0;
      const healthFn = vi.fn().mockImplementation(async () => {
        callCount++;
        return false; // Always unhealthy
      });
      const startFn = vi.fn().mockResolvedValue(undefined);
      const stopFn = vi.fn().mockResolvedValue(undefined);

      const d = new DaemonService({
        heartbeatIntervalMs: 100,
        maxConsecutiveFailures: 2,
        autoRestart: true,
        activeHoursStart: 0,
        activeHoursEnd: 24,
      });

      d.registerService('flaky', startFn, stopFn, healthFn);
      await d.start();

      // Advance through enough ticks to trigger auto-restart (2 failures)
      await vi.advanceTimersByTimeAsync(350);

      expect(healthFn.mock.calls.length).toBeGreaterThanOrEqual(2);
      // stopFn would be called during auto-restart
      expect(stopFn.mock.calls.length).toBeGreaterThanOrEqual(1);

      await d.stop();
    });
  });

  describe('session tracking', () => {
    it('should track session count', () => {
      daemon.updateSessionCount(5);
      const status = daemon.getStatus();
      expect(status.sessions.active).toBe(5);
    });

    it('should prune sessions during heartbeat', async () => {
      daemon.setSessionPruneFn(async () => ({ pruned: 2, remaining: 3 }));
      await daemon.start();

      await vi.advanceTimersByTimeAsync(1100);

      const status = daemon.getStatus();
      expect(status.sessions.pruned).toBeGreaterThanOrEqual(2);
      expect(status.sessions.active).toBe(3);

      await daemon.stop();
    });
  });

  describe('status', () => {
    it('should return comprehensive status', async () => {
      daemon.registerService('svc1', vi.fn().mockResolvedValue(undefined), vi.fn().mockResolvedValue(undefined));
      await daemon.start();

      const status = daemon.getStatus();
      expect(status.running).toBe(true);
      expect(status.startedAt).toBeInstanceOf(Date);
      expect(status.services).toHaveLength(1);
      expect(status.services[0].name).toBe('svc1');
      expect(status.heartbeat.totalTicks).toBeGreaterThanOrEqual(0);
      expect(status.sessions.maxAllowed).toBe(50);
    });
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const a = getDaemonService();
      const b = getDaemonService();
      expect(a).toBe(b);
      resetDaemonService();
    });

    it('should reset the singleton', () => {
      const a = getDaemonService();
      resetDaemonService();
      const b = getDaemonService();
      expect(a).not.toBe(b);
      resetDaemonService();
    });
  });

  describe('active hours', () => {
    it('should detect inside active hours (normal range)', () => {
      const d = new DaemonService({ activeHoursStart: 0, activeHoursEnd: 24 });
      expect(d.isInsideActiveHours()).toBe(true);
    });

    it('should detect outside active hours (narrow range)', () => {
      // Set a very narrow active window that's unlikely to be now
      const hour = new Date().getHours();
      const start = (hour + 2) % 24;
      const end = (hour + 3) % 24;
      const d = new DaemonService({ activeHoursStart: start, activeHoursEnd: end });
      expect(d.isInsideActiveHours()).toBe(false);
    });
  });
});
