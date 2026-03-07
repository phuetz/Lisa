import { describe, it, expect, vi } from 'vitest';
import { ReasoningFacade, type ThinkingMode } from '../ReasoningFacade';
import type { LLMCallFn } from '../WideResearch';

describe('ReasoningFacade', () => {
  function createMockLLM(): LLMCallFn {
    return vi.fn(async (messages) => {
      const systemMsg = messages[0]?.content || '';
      const userMsg = messages[messages.length - 1]?.content || '';

      // Chain-of-thought
      if (systemMsg.includes('Think step by step')) {
        return 'Step 1: Analyze the problem.\nStep 2: Consider options.\nStep 3: The answer is 42.';
      }

      // Generate approaches
      if (systemMsg.includes('DISTINCT approaches')) {
        return 'APPROACH 1: Use dynamic programming.\nAPPROACH 2: Use greedy algorithm.\nAPPROACH 3: Use divide and conquer.';
      }

      // Evaluate
      if (systemMsg.includes('Rate it')) {
        return '0.7';
      }

      // Refine
      if (systemMsg.includes('Refine')) {
        return 'Refined solution combining the best aspects of all approaches.';
      }

      return 'Generic response';
    });
  }

  describe('solve', () => {
    it('should solve with shallow mode (CoT)', async () => {
      const llm = createMockLLM();
      const facade = new ReasoningFacade(llm);

      const result = await facade.solve(
        { description: 'What is 2+2?' },
        { mode: 'shallow' }
      );

      expect(result.mode).toBe('shallow');
      expect(result.solution).toContain('Step 1');
      expect(result.thoughts).toHaveLength(1);
      expect(result.thoughts[0].isSelected).toBe(true);
    });

    it('should solve with medium mode (ToT)', async () => {
      const llm = createMockLLM();
      const facade = new ReasoningFacade(llm);

      const result = await facade.solve(
        { description: 'Design a sorting algorithm' },
        { mode: 'medium' }
      );

      expect(result.mode).toBe('medium');
      expect(result.thoughts.length).toBeGreaterThanOrEqual(1);
      expect(result.thoughts.some(t => t.isSelected)).toBe(true);
    });

    it('should solve with deep mode (ToT + refine)', async () => {
      const llm = createMockLLM();
      const facade = new ReasoningFacade(llm);

      const result = await facade.solve(
        { description: 'Optimize database query performance' },
        { mode: 'deep' }
      );

      expect(result.mode).toBe('deep');
      // Should have refined thoughts
      expect(result.thoughts.some(t => t.id.startsWith('refined'))).toBe(true);
    });

    it('should auto-select mode based on problem complexity', async () => {
      const llm = createMockLLM();
      const facade = new ReasoningFacade(llm);

      // Short problem → shallow
      const simple = await facade.solve({ description: 'Hi' });
      expect(simple.mode).toBe('shallow');

      // Long problem with constraints → medium or higher
      const complex = await facade.solve({
        description: 'Design a distributed system for a social media platform that handles millions of concurrent users with real-time updates across multiple data centers.',
        constraints: ['Must be fault-tolerant', 'Sub-100ms latency'],
        examples: ['Example: Twitter uses a pub/sub architecture'],
      });
      expect(['medium', 'deep', 'exhaustive']).toContain(complex.mode);
    });

    it('should auto-escalate when confidence is low', async () => {
      let evaluateCallCount = 0;
      const lowConfidenceLLM: LLMCallFn = vi.fn(async (messages) => {
        const systemMsg = messages[0]?.content || '';

        if (systemMsg.includes('Think step by step')) {
          // Very short response → low confidence (0.5 base, no steps/code)
          return 'Hmm.';
        }
        if (systemMsg.includes('DISTINCT approaches')) {
          return 'APPROACH 1: Try A.\nAPPROACH 2: Try B.\nAPPROACH 3: Try C.';
        }
        if (systemMsg.includes('Rate it')) {
          evaluateCallCount++;
          // Return high score after escalation
          return evaluateCallCount > 3 ? '0.8' : '0.3';
        }
        if (systemMsg.includes('Refine')) {
          return 'Much better refined solution with detailed steps.\n1. First step\n2. Second step';
        }
        return 'response';
      });

      const facade = new ReasoningFacade(lowConfidenceLLM);
      const result = await facade.solve(
        { description: 'Solve this complex problem' },
        { mode: 'shallow', autoEscalate: true }
      );

      // Should have escalated from shallow → medium or deeper
      expect(result.escalated).toBe(true);
      expect(result.mode).not.toBe('shallow');
    });
  });

  describe('formatResult', () => {
    it('should format a result for display', async () => {
      const llm = createMockLLM();
      const facade = new ReasoningFacade(llm);

      const result = await facade.solve(
        { description: 'Test problem' },
        { mode: 'shallow' }
      );

      const formatted = facade.formatResult(result);
      expect(formatted).toContain('Reasoning Mode');
      expect(formatted).toContain('Confidence');
      expect(formatted).toContain('Duration');
    });

    it('should show alternative approaches for ToT results', async () => {
      const llm = createMockLLM();
      const facade = new ReasoningFacade(llm);

      const result = await facade.solve(
        { description: 'Complex problem requiring multiple approaches' },
        { mode: 'medium' }
      );

      const formatted = facade.formatResult(result);
      if (result.thoughts.length > 1) {
        expect(formatted).toContain('Alternative approaches');
      }
    });
  });

  describe('problem formatting', () => {
    it('should include constraints and examples', async () => {
      const llm: LLMCallFn = vi.fn(async (messages) => {
        const userMsg = messages[messages.length - 1]?.content || '';
        expect(userMsg).toContain('Must be fast');
        expect(userMsg).toContain('Example input');
        return 'Step 1: Solution';
      });

      const facade = new ReasoningFacade(llm);
      await facade.solve({
        description: 'Sort an array',
        constraints: ['Must be fast'],
        examples: ['Example input: [3,1,2]'],
      }, { mode: 'shallow' });

      expect(llm).toHaveBeenCalled();
    });
  });
});
