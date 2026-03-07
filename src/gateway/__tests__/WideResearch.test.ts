import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WideResearchOrchestrator, type LLMCallFn, type WideResearchProgress } from '../WideResearch';

describe('WideResearchOrchestrator', () => {
  let mockLLM: LLMCallFn;

  beforeEach(() => {
    mockLLM = vi.fn(async (messages) => {
      const systemMsg = messages[0]?.content || '';

      // Decompose request
      if (systemMsg.includes('coordinator')) {
        return '["Aspect 1", "Aspect 2", "Aspect 3"]';
      }

      // Worker request
      if (systemMsg.includes('analyst')) {
        return 'Research findings for this subtopic are quite interesting.';
      }

      // Aggregate request
      if (systemMsg.includes('synthesizer')) {
        return '# Final Report\n\nComprehensive synthesis of all findings.';
      }

      return 'Generic response';
    });
  });

  it('should decompose, run workers, and aggregate', async () => {
    const orch = new WideResearchOrchestrator({ workers: 3 });
    const result = await orch.research('AI Agents', mockLLM);

    expect(result.topic).toBe('AI Agents');
    expect(result.subtopics).toHaveLength(3);
    expect(result.workerResults).toHaveLength(3);
    expect(result.successCount).toBe(3);
    expect(result.report).toContain('Final Report');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should limit workers to max 20', () => {
    const orch = new WideResearchOrchestrator({ workers: 50 });
    // Access private field via type casting for test
    expect((orch as unknown as { options: { workers: number } }).options.workers).toBe(20);
  });

  it('should emit progress events', async () => {
    const orch = new WideResearchOrchestrator({ workers: 2 });
    const events: WideResearchProgress[] = [];

    orch.on('progress', (e: WideResearchProgress) => events.push(e));

    // Mock to return 2 subtopics
    const llm: LLMCallFn = vi.fn(async (messages) => {
      if (messages[0].content.includes('coordinator')) return '["A", "B"]';
      if (messages[messages.length - 1].content.includes('subtopic')) return 'Research output';
      return 'Synthesized report';
    });

    await orch.research('Test Topic', llm);

    const types = events.map(e => e.type);
    expect(types).toContain('decomposed');
    expect(types).toContain('worker_start');
    expect(types).toContain('worker_done');
    expect(types).toContain('aggregating');
    expect(types).toContain('done');
  });

  it('should handle decompose failure with fallback subtopics', async () => {
    const failLLM: LLMCallFn = vi.fn(async (messages) => {
      if (messages[0].content.includes('coordinator')) throw new Error('LLM down');
      return 'Worker output';
    });

    const orch = new WideResearchOrchestrator({ workers: 3 });
    const result = await orch.research('Fallback Test', failLLM);

    expect(result.subtopics).toHaveLength(3);
    expect(result.subtopics[0]).toContain('Fallback Test');
    expect(result.subtopics[0]).toContain('aspect 1');
  });

  it('should handle worker failure gracefully', async () => {
    let callCount = 0;
    const failWorkerLLM: LLMCallFn = vi.fn(async (messages) => {
      if (messages[0].content.includes('coordinator')) return '["A", "B"]';
      callCount++;
      if (callCount === 2) throw new Error('Worker crashed');
      return 'Success output';
    });

    const orch = new WideResearchOrchestrator({ workers: 2 });
    const result = await orch.research('Mixed', failWorkerLLM);

    expect(result.workerResults.some(r => r.success)).toBe(true);
    expect(result.workerResults.some(r => !r.success)).toBe(true);
  });

  it('should handle aggregate failure with fallback report', async () => {
    let phase = 'decompose';
    const llm: LLMCallFn = vi.fn(async (messages) => {
      if (messages[0].content.includes('coordinator')) {
        phase = 'worker';
        return '["A"]';
      }
      if (phase === 'worker' && messages[0].content.includes('analyst')) {
        phase = 'aggregate';
        return 'Worker output';
      }
      throw new Error('Aggregate failed');
    });

    const orch = new WideResearchOrchestrator({ workers: 1 });
    const result = await orch.research('Agg Fail', llm);

    expect(result.report).toContain('Research Report');
  });
});
