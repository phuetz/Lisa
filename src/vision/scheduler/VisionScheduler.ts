export type VisionTask = 'face' | 'object' | 'text' | 'pose';

export interface VisionSchedulerOptions {
  maxGPUTimeMs: number;
}

export interface VisionProvider {
  name: string;
  detect(task: VisionTask, frame: VideoFrame): Promise<number>;
}

interface ScheduledTask {
  task: VisionTask;
  priority: number;
  deadline: number;
}

export class VisionScheduler {
  private queue: ScheduledTask[] = [];
  private providers = new Map<VisionTask, { provider: VisionProvider; cost: number }>();
  private running = false;

  constructor(private opts: VisionSchedulerOptions) {}

  register(provider: VisionProvider, costMs: number): void {
    this.providers.set(provider.name as VisionTask, { provider, cost: costMs });
  }

  request(task: VisionTask, priority = 0): void {
    this.queue.push({ task, priority, deadline: performance.now() });
  }

  start(): void {
    this.running = true;
    requestAnimationFrame(this.step);
  }

  stop(): void {
    this.running = false;
  }

  private step = () => {
    if (!this.running) return;
    const frameStart = performance.now();
    let budget = this.opts.maxGPUTimeMs;
    while (budget > 0 && this.queue.length) {
      const job = this.queue.shift()!;
      const providerInfo = this.providers.get(job.task);
      if (!providerInfo) continue;
      if (providerInfo.cost > budget) break;
      budget -= providerInfo.cost;
      providerInfo.provider.detect(job.task, new VideoFrame(document.createElement('canvas')));
    }
    const elapsed = performance.now() - frameStart;
    if (elapsed < this.opts.maxGPUTimeMs) {
      requestAnimationFrame(this.step);
    } else {
      setTimeout(() => requestAnimationFrame(this.step), 0);
    }
  };
}
