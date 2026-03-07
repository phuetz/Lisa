/**
 * KnowledgeTools Integration Tests
 *
 * Tests the full pipeline: tool handlers → KnowledgeGraph → persist → recall
 * Simulates what happens when the LLM calls knowledge tools.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getKnowledgeTools, registerKnowledgeTools } from '../KnowledgeTools';
import { KnowledgeGraph } from '../KnowledgeGraphService';
import { toolCallingService } from '../ToolCallingService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('KnowledgeTools', () => {
  let tools: ReturnType<typeof getKnowledgeTools>;

  beforeEach(() => {
    KnowledgeGraph.resetInstance();
    localStorageMock.clear();
    tools = getKnowledgeTools();
  });

  describe('tool definitions', () => {
    it('exports 4 tools', () => {
      expect(tools).toHaveLength(4);
      expect(tools.map(t => t.name)).toEqual([
        'knowledge_store',
        'knowledge_query',
        'knowledge_search',
        'knowledge_about',
      ]);
    });

    it('all tools have handlers', () => {
      for (const tool of tools) {
        expect(tool.handler).toBeDefined();
        expect(typeof tool.handler).toBe('function');
      }
    });
  });

  describe('knowledge_store', () => {
    it('stores a fact and returns success', async () => {
      const store = tools.find(t => t.name === 'knowledge_store')!;
      const result = await store.handler!({
        subject: 'Patrice',
        predicate: 'isA',
        object: 'developer',
      });

      const r = result as Record<string, unknown>;
      expect(r.success).toBe(true);
      expect(r.alreadyExisted).toBeUndefined();
      expect(r.message).toContain('Patrice');
    });

    it('detects duplicate facts', async () => {
      const store = tools.find(t => t.name === 'knowledge_store')!;

      await store.handler!({ subject: 'Patrice', predicate: 'likes', object: 'TypeScript' });
      const result = await store.handler!({ subject: 'Patrice', predicate: 'likes', object: 'TypeScript' });

      expect(result).toMatchObject({
        success: true,
        alreadyExisted: true,
      });
    });

    it('persists to localStorage', async () => {
      const store = tools.find(t => t.name === 'knowledge_store')!;
      await store.handler!({ subject: 'Lisa', predicate: 'isA', object: 'assistant' });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lisa_knowledge_graph',
        expect.any(String)
      );
    });
  });

  describe('knowledge_query', () => {
    it('finds facts by subject', async () => {
      const store = tools.find(t => t.name === 'knowledge_store')!;
      const query = tools.find(t => t.name === 'knowledge_query')!;

      await store.handler!({ subject: 'Patrice', predicate: 'likes', object: 'React' });
      await store.handler!({ subject: 'Patrice', predicate: 'lives_in', object: 'Strasbourg' });
      await store.handler!({ subject: 'Lisa', predicate: 'isA', object: 'AI' });

      const result = await query.handler!({ subject: 'Patrice' }) as Record<string, unknown>;
      expect(result.count).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it('returns empty for unknown subject', async () => {
      const query = tools.find(t => t.name === 'knowledge_query')!;
      const result = await query.handler!({ subject: 'Unknown' }) as Record<string, unknown>;
      expect(result.count).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('knowledge_search', () => {
    it('finds facts by keyword', async () => {
      const store = tools.find(t => t.name === 'knowledge_store')!;
      const search = tools.find(t => t.name === 'knowledge_search')!;

      await store.handler!({ subject: 'Patrice', predicate: 'likes', object: 'TypeScript' });
      await store.handler!({ subject: 'Lisa', predicate: 'uses', object: 'React' });

      const result = await search.handler!({ keyword: 'Patrice' }) as Record<string, unknown>;
      expect(result.count).toBe(1);
    });

    it('is case-insensitive', async () => {
      const store = tools.find(t => t.name === 'knowledge_store')!;
      const search = tools.find(t => t.name === 'knowledge_search')!;

      await store.handler!({ subject: 'Patrice', predicate: 'likes', object: 'TypeScript' });
      const result = await search.handler!({ keyword: 'patrice' }) as Record<string, unknown>;
      expect(result.count).toBe(1);
    });
  });

  describe('knowledge_about', () => {
    it('returns all facts about an entity', async () => {
      const store = tools.find(t => t.name === 'knowledge_store')!;
      const about = tools.find(t => t.name === 'knowledge_about')!;

      await store.handler!({ subject: 'Patrice', predicate: 'likes', object: 'TypeScript' });
      await store.handler!({ subject: 'Patrice', predicate: 'lives_in', object: 'Strasbourg' });
      await store.handler!({ subject: 'React', predicate: 'createdBy', object: 'Patrice' });

      const result = await about.handler!({ entity: 'Patrice' }) as Record<string, unknown>;
      // 2 as subject + 1 as object = 3
      expect(result.count).toBe(3);
      expect(result.entity).toBe('Patrice');
    });

    it('returns empty for unknown entity', async () => {
      const about = tools.find(t => t.name === 'knowledge_about')!;
      const result = await about.handler!({ entity: 'Nobody' }) as Record<string, unknown>;
      expect(result.count).toBe(0);
    });
  });

  describe('full round-trip: store → persist → reload → recall', () => {
    it('survives a knowledge graph reset (simulates page reload)', async () => {
      const store = tools.find(t => t.name === 'knowledge_store')!;
      const about = tools.find(t => t.name === 'knowledge_about')!;

      // Store facts
      await store.handler!({ subject: 'Patrice', predicate: 'isA', object: 'developer' });
      await store.handler!({ subject: 'Patrice', predicate: 'likes', object: 'TypeScript' });
      await store.handler!({ subject: 'Patrice', predicate: 'lives_in', object: 'Alsace' });

      // Simulate page reload — reset singleton, load from localStorage
      KnowledgeGraph.resetInstance();
      const kg = KnowledgeGraph.getInstance();
      kg.load(); // load from localStorage

      // Query via tool (uses new singleton instance)
      const result = await about.handler!({ entity: 'Patrice' }) as Record<string, unknown>;
      expect(result.count).toBe(3);
      const facts = result.facts as Array<{ subject: string; predicate: string; object: string }>;
      expect(facts.some(f => f.object === 'developer')).toBe(true);
      expect(facts.some(f => f.object === 'TypeScript')).toBe(true);
      expect(facts.some(f => f.object === 'Alsace')).toBe(true);
    });
  });

  describe('registration', () => {
    it('registers all tools with toolCallingService', () => {
      const before = toolCallingService.getTools().length;
      registerKnowledgeTools();
      const after = toolCallingService.getTools().length;
      expect(after).toBeGreaterThanOrEqual(before + 4);
      expect(toolCallingService.hasTool('knowledge_store')).toBe(true);
      expect(toolCallingService.hasTool('knowledge_query')).toBe(true);
      expect(toolCallingService.hasTool('knowledge_search')).toBe(true);
      expect(toolCallingService.hasTool('knowledge_about')).toBe(true);
    });
  });
});
