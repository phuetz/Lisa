/**
 * Wide Research — Manus AI-inspired parallel research pattern
 *
 * Decomposes a topic into N subtopics, runs independent research
 * workers in parallel, then aggregates results into a comprehensive report.
 *
 * Architecture:
 *   WideResearchOrchestrator
 *       |
 *       +-- decompose(topic) → string[]   (subtopics via LLM)
 *       |
 *       +-- worker[0..N-1]                (parallel LLM calls)
 *       |       each: "Research: <subtopic>"
 *       |
 *       +-- aggregate(results) → string   (synthesize via LLM)
 *
 * Ported from Code Buddy's wide-research.ts, adapted for Lisa's
 * @phuetz/ai-providers architecture.
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

// ============================================================================
// Types
// ============================================================================

export interface WideResearchOptions {
  workers?: number;
  maxTokensPerWorker?: number;
  context?: string;
  model?: string;
  timeoutMs?: number;
}

export interface ResearchWorkerResult {
  subtopic: string;
  workerIndex: number;
  output: string;
  success: boolean;
  error?: string;
  durationMs: number;
}

export interface WideResearchResult {
  topic: string;
  subtopics: string[];
  workerResults: ResearchWorkerResult[];
  report: string;
  durationMs: number;
  successCount: number;
}

export type WideResearchProgress =
  | { type: 'decomposed'; subtopics: string[] }
  | { type: 'worker_start'; workerIndex: number; subtopic: string }
  | { type: 'worker_done'; workerIndex: number; subtopic: string; success: boolean }
  | { type: 'aggregating' }
  | { type: 'done'; result: WideResearchResult };

/** Interface for the LLM call function (injected by consumer) */
export type LLMCallFn = (
  messages: Array<{ role: string; content: string }>,
  options?: { model?: string; maxTokens?: number }
) => Promise<string>;

// ============================================================================
// Orchestrator
// ============================================================================

export class WideResearchOrchestrator extends BrowserEventEmitter {
  private options: Required<WideResearchOptions>;

  constructor(options: WideResearchOptions = {}) {
    super();
    this.options = {
      workers: Math.min(options.workers ?? 5, 20),
      maxTokensPerWorker: options.maxTokensPerWorker ?? 2048,
      context: options.context ?? '',
      model: options.model ?? '',
      timeoutMs: Math.max(30_000, options.timeoutMs ?? 300_000),
    };
  }

  /**
   * Run wide research on a topic.
   *
   * @param topic  - The research question/topic
   * @param llmCall - Injected LLM call function
   */
  async research(topic: string, llmCall: LLMCallFn): Promise<WideResearchResult> {
    const startTime = Date.now();

    // Step 1: Decompose into subtopics
    let subtopics: string[];
    try {
      subtopics = await this.decompose(topic, llmCall);
    } catch {
      subtopics = Array.from(
        { length: this.options.workers },
        (_, i) => `${topic} - aspect ${i + 1}`
      );
    }
    this.emit('progress', { type: 'decomposed', subtopics } as WideResearchProgress);

    // Step 2: Run workers in parallel
    const workerResults: ResearchWorkerResult[] = [];
    const promises = subtopics.slice(0, this.options.workers).map(
      (subtopic, workerIndex) => this.runWorker(subtopic, topic, workerIndex, llmCall)
    );

    for (const promise of promises) {
      const idx = workerResults.length;
      this.emit('progress', {
        type: 'worker_start',
        workerIndex: idx,
        subtopic: subtopics[idx] || '',
      } as WideResearchProgress);

      try {
        const result = await promise;
        workerResults.push(result);
        this.emit('progress', {
          type: 'worker_done',
          workerIndex: result.workerIndex,
          subtopic: result.subtopic,
          success: result.success,
        } as WideResearchProgress);
      } catch (err) {
        workerResults.push({
          subtopic: subtopics[idx] || '',
          workerIndex: idx,
          output: '',
          success: false,
          error: err instanceof Error ? err.message : String(err),
          durationMs: 0,
        });
      }
    }

    // Step 3: Aggregate
    this.emit('progress', { type: 'aggregating' } as WideResearchProgress);
    let report: string;
    try {
      report = await this.aggregate(topic, workerResults, llmCall);
    } catch {
      report = this.buildFallbackReport(topic, workerResults);
    }

    const finalResult: WideResearchResult = {
      topic,
      subtopics,
      workerResults,
      report,
      durationMs: Date.now() - startTime,
      successCount: workerResults.filter(r => r.success).length,
    };

    this.emit('progress', { type: 'done', result: finalResult } as WideResearchProgress);
    return finalResult;
  }

  // --------------------------------------------------------------------------
  // Decompose
  // --------------------------------------------------------------------------

  private async decompose(topic: string, llmCall: LLMCallFn): Promise<string[]> {
    const response = await llmCall([
      {
        role: 'system',
        content: `You are a research coordinator. Break the given topic into ${this.options.workers} independent, non-overlapping subtopics for comprehensive coverage. Return ONLY a JSON array of strings, no explanation.`,
      },
      { role: 'user', content: topic },
    ], { model: this.options.model, maxTokens: 1024 });

    try {
      const match = response.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(String);
        }
      }
    } catch { /* fallback below */ }

    return response
      .split('\n')
      .filter(l => l.trim().length > 5)
      .slice(0, this.options.workers);
  }

  // --------------------------------------------------------------------------
  // Worker
  // --------------------------------------------------------------------------

  private async runWorker(
    subtopic: string,
    originalTopic: string,
    workerIndex: number,
    llmCall: LLMCallFn,
  ): Promise<ResearchWorkerResult> {
    const workerStart = Date.now();

    try {
      const output = await llmCall([
        {
          role: 'system',
          content: `You are a focused research analyst. Research the specific subtopic thoroughly within the broader context.${this.options.context ? `\n\nAdditional context: ${this.options.context}` : ''}`,
        },
        {
          role: 'user',
          content: `Broader topic: ${originalTopic}\n\nYour assigned subtopic: ${subtopic}\n\nProvide a comprehensive analysis of this subtopic. Include key findings, relevant details, and insights.`,
        },
      ], { model: this.options.model, maxTokens: this.options.maxTokensPerWorker });

      return {
        subtopic,
        workerIndex,
        output,
        success: true,
        durationMs: Date.now() - workerStart,
      };
    } catch (err) {
      return {
        subtopic,
        workerIndex,
        output: '',
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - workerStart,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Aggregate
  // --------------------------------------------------------------------------

  private async aggregate(
    topic: string,
    results: ResearchWorkerResult[],
    llmCall: LLMCallFn,
  ): Promise<string> {
    const successResults = results.filter(r => r.success);
    if (successResults.length === 0) {
      return this.buildFallbackReport(topic, results);
    }

    const sections = successResults
      .map(r => `## ${r.subtopic}\n${r.output}`)
      .join('\n\n---\n\n');

    return await llmCall([
      {
        role: 'system',
        content: 'You are a senior research synthesizer. Given multiple research sections on subtopics, create a unified, well-structured report. Eliminate redundancy, highlight key findings, and provide a coherent narrative.',
      },
      {
        role: 'user',
        content: `Topic: ${topic}\n\nResearch sections:\n\n${sections}\n\nSynthesize into a comprehensive report.`,
      },
    ], { model: this.options.model, maxTokens: this.options.maxTokensPerWorker * 2 });
  }

  private buildFallbackReport(topic: string, results: ResearchWorkerResult[]): string {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    let report = `# Research Report: ${topic}\n\n`;

    if (successful.length > 0) {
      for (const r of successful) {
        report += `## ${r.subtopic}\n${r.output}\n\n`;
      }
    }

    if (failed.length > 0) {
      report += `\n## Incomplete Sections\n`;
      for (const r of failed) {
        report += `- ${r.subtopic}: ${r.error || 'Unknown error'}\n`;
      }
    }

    return report;
  }
}
