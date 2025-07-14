import { describe, it, expect, vi } from 'vitest';
import { VisionScheduler, VisionProvider } from '../../src/vision/scheduler/VisionScheduler';

const createProvider = (name: string) => {
  return {
    name,
    detect: vi.fn().mockResolvedValue(0),
  } as unknown as VisionProvider;
};

describe('VisionScheduler', () => {
  it('does not exceed GPU time budget', async () => {
    const sched = new VisionScheduler({ maxGPUTimeMs: 5 });
    const p1 = createProvider('face');
    const p2 = createProvider('object');
    const p3 = createProvider('text');
    sched.register(p1, 2);
    sched.register(p2, 2);
    sched.register(p3, 2);

    sched.request('face');
    sched.request('object');
    sched.request('text');

    sched.start();

    await new Promise((r) => setTimeout(r, 10));
    sched.stop();

    const calls = (p1.detect as any).mock.calls.length + (p2.detect as any).mock.calls.length + (p3.detect as any).mock.calls.length;
    expect(calls).toBeLessThanOrEqual(2);
  });
});
