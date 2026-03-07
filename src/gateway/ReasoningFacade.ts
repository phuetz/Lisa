/**
 * Reasoning Facade for Lisa — Tree-of-Thought + Chain-of-Thought
 *
 * Lightweight reasoning engine with 4 depth modes:
 * - shallow: Chain-of-Thought single-pass (fast, cheap)
 * - medium: Generate + evaluate 3 approaches (moderate)
 * - deep: Generate + evaluate + refine best approach
 * - exhaustive: Multiple rounds of generate/evaluate/refine
 *
 * Ported from Code Buddy's reasoning-facade.ts, simplified for
 * Lisa's browser architecture (no disk I/O, no streaming).
 *
 * Ref: "Context Engineering for AI Agents: Lessons from Building Manus"
 */

import type { LLMCallFn } from './WideResearch';

// ============================================================================
// Types
// ============================================================================

export type ThinkingMode = 'shallow' | 'medium' | 'deep' | 'exhaustive';

export interface Problem {
  description: string;
  constraints?: string[];
  examples?: string[];
}

export interface ReasoningResult {
  mode: ThinkingMode;
  solution: string;
  confidence: number;
  thoughts: ThoughtNode[];
  durationMs: number;
  escalated?: boolean;
}

export interface ThoughtNode {
  id: string;
  content: string;
  score: number;
  depth: number;
  isSelected: boolean;
}

export interface ReasoningOptions {
  mode?: ThinkingMode;
  autoEscalate?: boolean;
  maxTokens?: number;
  model?: string;
}

// ============================================================================
// Constants
// ============================================================================

const AUTO_ESCALATE_THRESHOLD = 0.4;
const ESCALATION_ORDER: readonly ThinkingMode[] = ['shallow', 'medium', 'deep', 'exhaustive'];

const MODE_CONFIG: Record<ThinkingMode, { branches: number; refineRounds: number }> = {
  shallow: { branches: 1, refineRounds: 0 },
  medium: { branches: 3, refineRounds: 0 },
  deep: { branches: 3, refineRounds: 1 },
  exhaustive: { branches: 5, refineRounds: 2 },
};

// ============================================================================
// Reasoning Facade
// ============================================================================

export class ReasoningFacade {
  private llmCall: LLMCallFn;
  private model: string;

  constructor(llmCall: LLMCallFn, model?: string) {
    this.llmCall = llmCall;
    this.model = model || '';
  }

  /**
   * Solve a problem using the specified or auto-selected reasoning mode.
   */
  async solve(problem: Problem, options: ReasoningOptions = {}): Promise<ReasoningResult> {
    const startTime = Date.now();
    const mode = options.mode ?? this.autoSelectMode(problem);
    const autoEscalate = options.autoEscalate ?? false;

    let result = await this.runMode(problem, mode, options);

    // Auto-escalate if score is low
    if (autoEscalate && result.confidence < AUTO_ESCALATE_THRESHOLD) {
      const currentIndex = ESCALATION_ORDER.indexOf(mode);
      for (let i = currentIndex + 1; i < ESCALATION_ORDER.length; i++) {
        const nextMode = ESCALATION_ORDER[i];
        const escalatedResult = await this.runMode(problem, nextMode, options);
        escalatedResult.escalated = true;
        if (escalatedResult.confidence >= AUTO_ESCALATE_THRESHOLD) {
          result = escalatedResult;
          break;
        }
        result = escalatedResult;
      }
    }

    result.durationMs = Date.now() - startTime;
    return result;
  }

  /**
   * Format a result for display.
   */
  formatResult(result: ReasoningResult): string {
    const lines = [
      `**Reasoning Mode:** ${result.mode}${result.escalated ? ' (escalated)' : ''}`,
      `**Confidence:** ${(result.confidence * 100).toFixed(0)}%`,
      `**Duration:** ${result.durationMs}ms`,
      `**Thoughts explored:** ${result.thoughts.length}`,
      '',
      '---',
      '',
      result.solution,
    ];

    if (result.thoughts.length > 1) {
      lines.push('', '---', '', '**Alternative approaches considered:**');
      for (const thought of result.thoughts.filter(t => !t.isSelected)) {
        lines.push(`- [Score: ${(thought.score * 100).toFixed(0)}%] ${thought.content.slice(0, 100)}...`);
      }
    }

    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // Mode execution
  // --------------------------------------------------------------------------

  private async runMode(
    problem: Problem,
    mode: ThinkingMode,
    options: ReasoningOptions,
  ): Promise<ReasoningResult> {
    const config = MODE_CONFIG[mode];
    const thoughts: ThoughtNode[] = [];
    const maxTokens = options.maxTokens ?? 2048;

    if (mode === 'shallow') {
      // Chain-of-Thought: single pass
      const solution = await this.llmCall([
        {
          role: 'system',
          content: 'Think step by step to solve this problem. Show your reasoning clearly.',
        },
        { role: 'user', content: this.formatProblem(problem) },
      ], { model: options.model || this.model, maxTokens });

      const confidence = this.estimateConfidence(solution);
      thoughts.push({
        id: 'cot_0',
        content: solution,
        score: confidence,
        depth: 0,
        isSelected: true,
      });

      return { mode, solution, confidence, thoughts, durationMs: 0 };
    }

    // Tree-of-Thought: generate multiple approaches
    const approaches = await this.generateApproaches(problem, config.branches, options);

    for (let i = 0; i < approaches.length; i++) {
      const score = await this.evaluateApproach(problem, approaches[i], options);
      thoughts.push({
        id: `tot_${i}`,
        content: approaches[i],
        score,
        depth: 0,
        isSelected: false,
      });
    }

    // Sort by score, select best
    thoughts.sort((a, b) => b.score - a.score);
    thoughts[0].isSelected = true;

    let bestSolution = thoughts[0].content;
    let bestScore = thoughts[0].score;

    // Refine the best approach
    for (let round = 0; round < config.refineRounds; round++) {
      const refined = await this.refineApproach(problem, bestSolution, thoughts, options);
      const refinedScore = await this.evaluateApproach(problem, refined, options);

      thoughts.push({
        id: `refined_${round}`,
        content: refined,
        score: refinedScore,
        depth: round + 1,
        isSelected: refinedScore > bestScore,
      });

      if (refinedScore > bestScore) {
        // Unselect previous best
        thoughts.find(t => t.isSelected && t.id !== `refined_${round}`)!.isSelected = false;
        bestSolution = refined;
        bestScore = refinedScore;
      }
    }

    return {
      mode,
      solution: bestSolution,
      confidence: bestScore,
      thoughts,
      durationMs: 0,
    };
  }

  // --------------------------------------------------------------------------
  // Tree-of-Thought helpers
  // --------------------------------------------------------------------------

  private async generateApproaches(
    problem: Problem,
    count: number,
    options: ReasoningOptions,
  ): Promise<string[]> {
    const response = await this.llmCall([
      {
        role: 'system',
        content: `You are a problem solver. Generate ${count} DISTINCT approaches to solve the given problem. Format each approach as "APPROACH N:" followed by the solution. Be creative and consider different angles.`,
      },
      { role: 'user', content: this.formatProblem(problem) },
    ], { model: options.model || this.model, maxTokens: (options.maxTokens ?? 2048) * count });

    // Parse approaches
    const approaches: string[] = [];
    const regex = /APPROACH\s*\d+\s*:([\s\S]*?)(?=APPROACH\s*\d+\s*:|$)/gi;
    for (const match of response.matchAll(regex)) {
      approaches.push(match[1].trim());
    }

    // Fallback: split by double newline
    if (approaches.length === 0) {
      return [response];
    }

    return approaches.slice(0, count);
  }

  private async evaluateApproach(
    problem: Problem,
    approach: string,
    options: ReasoningOptions,
  ): Promise<number> {
    try {
      const response = await this.llmCall([
        {
          role: 'system',
          content: 'Evaluate the given solution to the problem. Rate it from 0.0 to 1.0 based on correctness, completeness, and elegance. Return ONLY a number.',
        },
        {
          role: 'user',
          content: `Problem: ${problem.description}\n\nSolution:\n${approach}`,
        },
      ], { model: options.model || this.model, maxTokens: 64 });

      const score = parseFloat(response.match(/[\d.]+/)?.[0] ?? '0.5');
      return Math.max(0, Math.min(1, score));
    } catch {
      return 0.5;
    }
  }

  private async refineApproach(
    problem: Problem,
    bestApproach: string,
    alternatives: ThoughtNode[],
    options: ReasoningOptions,
  ): Promise<string> {
    const altSummary = alternatives
      .filter(t => !t.isSelected)
      .slice(0, 3)
      .map(t => `- [Score: ${t.score.toFixed(2)}] ${t.content.slice(0, 200)}...`)
      .join('\n');

    return await this.llmCall([
      {
        role: 'system',
        content: 'You are a senior expert refining a solution. Improve the best approach by incorporating strengths from alternative approaches. Fix any weaknesses identified.',
      },
      {
        role: 'user',
        content: `Problem: ${problem.description}\n\nBest approach so far:\n${bestApproach}\n\nAlternative approaches considered:\n${altSummary}\n\nRefine and improve the solution.`,
      },
    ], { model: options.model || this.model, maxTokens: options.maxTokens ?? 2048 });
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private autoSelectMode(problem: Problem): ThinkingMode {
    const len = problem.description.length;
    const hasConstraints = (problem.constraints?.length ?? 0) > 0;
    const hasExamples = (problem.examples?.length ?? 0) > 0;

    if (len < 100 && !hasConstraints && !hasExamples) return 'shallow';
    if (len < 500 && !hasExamples) return hasConstraints ? 'medium' : 'shallow';
    if (hasConstraints && hasExamples) return 'deep';
    return 'medium';
  }

  private formatProblem(problem: Problem): string {
    let text = problem.description;
    if (problem.constraints?.length) {
      text += `\n\nConstraints:\n${problem.constraints.map(c => `- ${c}`).join('\n')}`;
    }
    if (problem.examples?.length) {
      text += `\n\nExamples:\n${problem.examples.join('\n')}`;
    }
    return text;
  }

  private estimateConfidence(solution: string): number {
    // Heuristic: longer, more structured solutions = higher confidence
    const len = solution.length;
    const hasSteps = /step\s*\d|^\d+\./im.test(solution);
    const hasCodeBlocks = /```/.test(solution);

    let score = 0.3;
    if (len > 50) score += 0.1;
    if (len > 200) score += 0.1;
    if (len > 500) score += 0.1;
    if (hasSteps) score += 0.1;
    if (hasCodeBlocks) score += 0.1;
    return Math.min(1, score);
  }
}
