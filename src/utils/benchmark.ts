/**
 * Benchmark utilities for performance testing
 * Measures execution time and throughput of operations
 */

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
  samples: number[];
}

export interface BenchmarkOptions {
  /** Number of iterations to run */
  iterations?: number;
  /** Warmup iterations (not counted) */
  warmup?: number;
  /** Minimum time to run in milliseconds */
  minTime?: number;
  /** Setup function run before each iteration */
  setup?: () => void | Promise<void>;
  /** Teardown function run after each iteration */
  teardown?: () => void | Promise<void>;
}

const DEFAULT_OPTIONS: Required<Omit<BenchmarkOptions, 'setup' | 'teardown'>> = {
  iterations: 1000,
  warmup: 100,
  minTime: 1000,
};

/**
 * Run a benchmark test
 *
 * @param name - Name of the benchmark
 * @param fn - Function to benchmark
 * @param options - Benchmark options
 * @returns Benchmark results
 *
 * @example
 * const result = await benchmark('Array.map', () => {
 *   const arr = Array.from({ length: 1000 }, (_, i) => i);
 *   return arr.map(x => x * 2);
 * });
 * console.log(`Average: ${result.averageTime}ms`);
 */
export async function benchmark(
  name: string,
  fn: () => void | Promise<void>,
  options: BenchmarkOptions = {}
): Promise<BenchmarkResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const samples: number[] = [];

  // Warmup
  for (let i = 0; i < opts.warmup; i++) {
    await options.setup?.();
    await fn();
    await options.teardown?.();
  }

  // Actual benchmark
  const startTime = performance.now();
  let iterations = 0;

  while (
    iterations < opts.iterations &&
    performance.now() - startTime < opts.minTime
  ) {
    await options.setup?.();

    const iterStart = performance.now();
    await fn();
    const iterEnd = performance.now();

    await options.teardown?.();

    samples.push(iterEnd - iterStart);
    iterations++;
  }

  const totalTime = performance.now() - startTime;
  const averageTime = samples.reduce((sum, t) => sum + t, 0) / samples.length;
  const minTime = Math.min(...samples);
  const maxTime = Math.max(...samples);
  const opsPerSecond = (iterations / totalTime) * 1000;

  return {
    name,
    iterations,
    totalTime,
    averageTime,
    minTime,
    maxTime,
    opsPerSecond,
    samples,
  };
}

/**
 * Run multiple benchmarks and compare results
 *
 * @param benchmarks - Map of benchmark name to function
 * @param options - Shared benchmark options
 * @returns Array of results sorted by average time
 *
 * @example
 * const results = await suite({
 *   'for loop': () => {
 *     const arr = Array.from({ length: 1000 }, (_, i) => i);
 *     for (let i = 0; i < arr.length; i++) arr[i] * 2;
 *   },
 *   'Array.map': () => {
 *     const arr = Array.from({ length: 1000 }, (_, i) => i);
 *     arr.map(x => x * 2);
 *   },
 * });
 */
export async function suite(
  benchmarks: Record<string, () => void | Promise<void>>,
  options: BenchmarkOptions = {}
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  for (const [name, fn] of Object.entries(benchmarks)) {
    const result = await benchmark(name, fn, options);
    results.push(result);
  }

  return results.sort((a, b) => a.averageTime - b.averageTime);
}

/**
 * Format benchmark results for console output
 *
 * @param results - Benchmark results
 * @returns Formatted string
 */
export function formatResults(results: BenchmarkResult[]): string {
  let output = '\n=== Benchmark Results ===\n\n';

  const fastest = results[0];

  for (const result of results) {
    const relativeDiff =
      ((result.averageTime - fastest.averageTime) / fastest.averageTime) * 100;

    output += `${result.name}:\n`;
    output += `  Iterations: ${result.iterations}\n`;
    output += `  Average: ${result.averageTime.toFixed(3)}ms\n`;
    output += `  Min: ${result.minTime.toFixed(3)}ms\n`;
    output += `  Max: ${result.maxTime.toFixed(3)}ms\n`;
    output += `  Ops/sec: ${result.opsPerSecond.toFixed(0)}\n`;

    if (result !== fastest) {
      output += `  ${relativeDiff.toFixed(1)}% slower than fastest\n`;
    } else {
      output += `  ⚡ FASTEST\n`;
    }

    output += '\n';
  }

  return output;
}

/**
 * Compare two implementations
 *
 * @param name - Comparison name
 * @param baseline - Baseline implementation
 * @param optimized - Optimized implementation
 * @param options - Benchmark options
 * @returns Comparison results
 *
 * @example
 * const comparison = await compare(
 *   'Array iteration',
 *   () => { /* old way */ },
 *   () => { /* new way */ }
 * );
 * console.log(`Improvement: ${comparison.improvement}%`);
 */
export async function compare(
  name: string,
  baseline: () => void | Promise<void>,
  optimized: () => void | Promise<void>,
  options: BenchmarkOptions = {}
): Promise<{
  name: string;
  baseline: BenchmarkResult;
  optimized: BenchmarkResult;
  improvement: number;
  fasterBy: number;
}> {
  console.log(`Running comparison: ${name}`);

  const baselineResult = await benchmark(`${name} (baseline)`, baseline, options);
  const optimizedResult = await benchmark(
    `${name} (optimized)`,
    optimized,
    options
  );

  const improvement =
    ((baselineResult.averageTime - optimizedResult.averageTime) /
      baselineResult.averageTime) *
    100;

  const fasterBy = baselineResult.averageTime / optimizedResult.averageTime;

  return {
    name,
    baseline: baselineResult,
    optimized: optimizedResult,
    improvement,
    fasterBy,
  };
}

/**
 * Calculate percentiles from samples
 */
export function calculatePercentiles(
  samples: number[]
): { p50: number; p75: number; p95: number; p99: number } {
  const sorted = [...samples].sort((a, b) => a - b);
  const len = sorted.length;

  return {
    p50: sorted[Math.floor(len * 0.5)],
    p75: sorted[Math.floor(len * 0.75)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)],
  };
}

/**
 * Memory usage tracker
 */
export class MemoryBenchmark {
  private baseline: number = 0;

  start(): void {
    if ('memory' in performance) {
      this.baseline = (performance as any).memory.usedJSHeapSize;
    }
  }

  end(): number {
    if ('memory' in performance) {
      const current = (performance as any).memory.usedJSHeapSize;
      return current - this.baseline;
    }
    return 0;
  }

  format(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  }
}

/**
 * Throughput test
 */
export async function throughputTest(
  fn: () => Promise<void>,
  duration: number = 10000
): Promise<{
  operations: number;
  opsPerSecond: number;
  duration: number;
}> {
  const startTime = performance.now();
  let operations = 0;

  while (performance.now() - startTime < duration) {
    await fn();
    operations++;
  }

  const actualDuration = performance.now() - startTime;
  const opsPerSecond = (operations / actualDuration) * 1000;

  return {
    operations,
    opsPerSecond,
    duration: actualDuration,
  };
}
