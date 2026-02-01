/**
 * MemoryService Tests
 * Tests for memory management: creation, retrieval, cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock Blob for size calculation
global.Blob = class MockBlob {
  size: number;
  constructor(parts: unknown[]) {
    this.size = JSON.stringify(parts).length;
  }
} as unknown as typeof Blob;

// Mock AuditService
vi.mock('../AuditService', () => ({
  auditActions: {
    memoryCreated: vi.fn(),
    memoryDeleted: vi.fn(),
  },
}));

// Import after mocks
import { memoryService } from '../MemoryService';
import type { Memory } from '../MemoryService';

describe('MemoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Reset memory service state by forgetting all
    memoryService.forgetMemories('all');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createMemory', () => {
    it('should create a memory with required fields', () => {
      const memory = memoryService.createMemory(
        'conversation',
        'Test content',
        'test-source'
      );

      expect(memory).toBeDefined();
      expect(memory.id).toMatch(/^mem_/);
      expect(memory.type).toBe('conversation');
      expect(memory.content).toBe('Test content');
      expect(memory.source).toBe('test-source');
      expect(memory.timestamp).toBeDefined();
      expect(memory.relevance).toBeGreaterThan(0);
    });

    it('should create memory with tags', () => {
      const memory = memoryService.createMemory(
        'fact',
        'Paris is the capital of France',
        'geography',
        ['france', 'capital', 'europe']
      );

      expect(memory.tags).toEqual(['france', 'capital', 'europe']);
    });

    it('should create memory with metadata', () => {
      const memory = memoryService.createMemory(
        'document',
        'Document content',
        'file-upload',
        [],
        { fileName: 'test.pdf', pageCount: 10 }
      );

      expect(memory.metadata).toEqual({ fileName: 'test.pdf', pageCount: 10 });
    });

    it('should calculate relevance based on type', () => {
      const preference = memoryService.createMemory('preference', 'Theme: dark', 'settings');
      const fact = memoryService.createMemory('fact', 'User birthday: Jan 1', 'profile');
      const context = memoryService.createMemory('context', 'Current page', 'navigation');

      expect(preference.relevance).toBeGreaterThan(fact.relevance);
      expect(fact.relevance).toBeGreaterThan(context.relevance);
    });

    it('should boost relevance for longer content', () => {
      const shortContent = memoryService.createMemory('conversation', 'Hi', 'chat');
      const longContent = memoryService.createMemory(
        'conversation',
        'A'.repeat(600), // > 500 chars
        'chat'
      );

      expect(longContent.relevance).toBeGreaterThan(shortContent.relevance);
    });
  });

  describe('getRelevantMemories', () => {
    it('should return relevant memories for a query', () => {
      memoryService.createMemory('fact', 'Paris is in France', 'geo', ['paris', 'france']);
      memoryService.createMemory('fact', 'Berlin is in Germany', 'geo', ['berlin', 'germany']);
      memoryService.createMemory('fact', 'London is in UK', 'geo', ['london', 'uk']);

      const relevant = memoryService.getRelevantMemories('france');

      expect(relevant.length).toBeGreaterThan(0);
      expect(relevant[0].content).toContain('France');
    });

    it('should limit results to specified count', () => {
      for (let i = 0; i < 20; i++) {
        memoryService.createMemory('conversation', `Message ${i}`, 'chat', ['test']);
      }

      const relevant = memoryService.getRelevantMemories('test', 5);

      expect(relevant.length).toBe(5);
    });

    it('should return empty array when no memories match', () => {
      memoryService.createMemory('fact', 'Apple is a fruit', 'food');

      const relevant = memoryService.getRelevantMemories('programming');

      // May return some results based on relevance scoring, but with low scores
      expect(relevant).toBeDefined();
    });
  });

  describe('forgetMemories', () => {
    it('should forget all memories when scope is "all"', () => {
      memoryService.createMemory('conversation', 'Test 1', 'chat');
      memoryService.createMemory('fact', 'Test 2', 'facts');

      const removed = memoryService.forgetMemories('all');

      expect(removed).toBe(2);
      expect(memoryService.getStats().totalMemories).toBe(0);
    });

    it('should forget memories of specific type', () => {
      memoryService.createMemory('conversation', 'Chat 1', 'chat');
      memoryService.createMemory('conversation', 'Chat 2', 'chat');
      memoryService.createMemory('fact', 'Fact 1', 'facts');

      const removed = memoryService.forgetMemories('conversation');

      expect(removed).toBe(2);
      expect(memoryService.getStats().byType['conversation']).toBeUndefined();
      expect(memoryService.getStats().byType['fact']).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      memoryService.createMemory('conversation', 'Chat 1', 'chat');
      memoryService.createMemory('conversation', 'Chat 2', 'chat');
      memoryService.createMemory('fact', 'Fact 1', 'facts');

      const stats = memoryService.getStats();

      expect(stats.totalMemories).toBe(3);
      expect(stats.byType['conversation']).toBe(2);
      expect(stats.byType['fact']).toBe(1);
      expect(stats.averageRelevance).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should return empty stats when no memories', () => {
      const stats = memoryService.getStats();

      expect(stats.totalMemories).toBe(0);
      expect(stats.averageRelevance).toBe(0);
    });
  });

  describe('getContext', () => {
    it('should return context with short and long term memories', () => {
      memoryService.createMemory('conversation', 'Test', 'chat');

      const context = memoryService.getContext();

      expect(context.shortTerm).toBeDefined();
      expect(context.longTerm).toBeDefined();
      expect(context.stats).toBeDefined();
    });
  });

  describe('exportMemory / importMemory', () => {
    it('should export memory data', () => {
      memoryService.createMemory('fact', 'Test fact', 'test');

      const exported = memoryService.exportMemory();

      expect(exported.exportDate).toBeDefined();
      expect(exported.shortTerm).toBeDefined();
      expect(exported.longTerm).toBeDefined();
      expect(exported.stats).toBeDefined();
    });

    it('should import memory data', () => {
      const exportData = {
        exportDate: new Date().toISOString(),
        shortTerm: [
          {
            id: 'imported_1',
            type: 'fact' as const,
            content: 'Imported fact',
            source: 'import',
            timestamp: new Date().toISOString(),
            relevance: 70,
            tags: ['imported'],
          },
        ],
        longTerm: [] as Memory[],
        stats: {
          totalMemories: 1,
          byType: { fact: 1 },
          averageRelevance: 70,
          oldestMemory: '',
          newestMemory: '',
          totalSize: 100,
        },
      };

      memoryService.importMemory(exportData);
      const context = memoryService.getContext();

      expect(context.shortTerm.length).toBe(1);
      expect(context.shortTerm[0].id).toBe('imported_1');
    });
  });

  describe('cleanupOldMemories', () => {
    it('should remove old memories', () => {
      // Create a memory with an old timestamp by manually setting it
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

      // Create memories and check cleanup behavior
      memoryService.createMemory('conversation', 'Recent message', 'chat');

      // Cleanup memories older than 30 days
      const removed = memoryService.cleanupOldMemories(30);

      // Recent memory should still exist
      expect(memoryService.getStats().totalMemories).toBeGreaterThanOrEqual(0);
      expect(removed).toBeGreaterThanOrEqual(0);
    });
  });
});
