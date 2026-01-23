declare module 'prom-client' {
  export interface BaseMetricConfiguration {
    name: string;
    help: string;
    labelNames?: string[];
    registers?: Registry[];
  }

  export interface HistogramConfiguration extends BaseMetricConfiguration {
    buckets?: number[];
  }

  export class Registry {
    contentType: string;
    metrics(): Promise<string>;
    getMetricsAsJSON(): Promise<unknown>;
  }

  export function collectDefaultMetrics(options?: { register?: Registry }): void;

  export class Counter {
    constructor(configuration: BaseMetricConfiguration);
    inc(value?: number): void;
    inc(labels: Record<string, string | number>, value?: number): void;
    labels(...labelValues: (string | number)[]): Counter;
  }

  export class Histogram {
    constructor(configuration: HistogramConfiguration);
    startTimer(labels?: Record<string, string | number>): (labels?: Record<string, string | number>) => void;
    observe(value: number): void;
    observe(labels: Record<string, string | number>, value: number): void;
    labels(...labelValues: (string | number)[]): { observe(value: number): void };
  }
}
