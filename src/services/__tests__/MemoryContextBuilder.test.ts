/**
 * MemoryContextBuilder Tests
 *
 * Tests for the memory context builder that queries the knowledge graph
 * and formats relevant facts for injection into the LLM system prompt.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeGraph } from '../KnowledgeGraphService';
import { MemoryContextBuilder } from '../MemoryContextBuilder';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _reset: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
let builder: MemoryContextBuilder;

beforeEach(() => {
  KnowledgeGraph.resetInstance();
  MemoryContextBuilder.resetInstance();
  localStorageMock._reset();
  builder = MemoryContextBuilder.getInstance();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MemoryContextBuilder', () => {
  describe('getRelevantContext', () => {
    it('returns null when knowledge graph is empty', () => {
      const result = builder.getRelevantContext('Bonjour, comment vas-tu ?');
      expect(result).toBeNull();
    });

    it('returns User facts for any query when User triples exist', () => {
      const kg = KnowledgeGraph.getInstance();
      kg.add('User', 'hasName', 'Patrice');
      kg.add('User', 'livesIn', 'Alsace');

      const result = builder.getRelevantContext('Quel temps fait-il ?');

      expect(result).not.toBeNull();
      expect(result).toContain('<memory_context>');
      expect(result).toContain('</memory_context>');
      expect(result).toContain('Patrice');
      expect(result).toContain('Alsace');
    });

    it('returns keyword-matched facts from query content', () => {
      const kg = KnowledgeGraph.getInstance();
      kg.add('User', 'likes', 'TypeScript');
      kg.add('User', 'uses', 'React');
      kg.add('Lisa', 'uses', 'Vite');

      const result = builder.getRelevantContext('Parle-moi de React');

      expect(result).not.toBeNull();
      expect(result).toContain('React');
    });

    it('matches entity names (capitalized words) as subjects', () => {
      const kg = KnowledgeGraph.getInstance();
      kg.add('Lisa', 'isA', 'AI assistant');
      kg.add('Lisa', 'uses', 'React 19');

      const result = builder.getRelevantContext('Que sais-tu sur Lisa ?');

      expect(result).not.toBeNull();
      expect(result).toContain('Lisa');
      expect(result).toContain('AI assistant');
    });

    it('limits results to maxFacts', () => {
      const kg = KnowledgeGraph.getInstance();
      for (let i = 0; i < 20; i++) {
        kg.add('User', 'knows', `fact_${i}`);
      }

      const result = builder.getRelevantContext('Dis-moi tout', 3);

      expect(result).not.toBeNull();
      // Count the number of "- " lines in the output
      const lines = result!.split('\n').filter(l => l.startsWith('- '));
      expect(lines.length).toBeLessThanOrEqual(3);
    });

    it('deduplicates triples found via multiple search paths', () => {
      const kg = KnowledgeGraph.getInstance();
      // This triple will match both as a User fact AND keyword search for "TypeScript"
      kg.add('User', 'likes', 'TypeScript');

      const result = builder.getRelevantContext('J\'aime TypeScript');

      expect(result).not.toBeNull();
      // Should appear exactly once
      const occurrences = (result!.match(/TypeScript/g) || []).length;
      expect(occurrences).toBe(1);
    });

    it('returns null when no facts match the query', () => {
      const kg = KnowledgeGraph.getInstance();
      kg.add('Project', 'uses', 'Rust');

      // "bonjour" doesn't match "Rust" or "Project"
      const result = builder.getRelevantContext('bonjour');

      // Could be null if no User facts and "bonjour" doesn't match
      // The keyword "bonjour" won't match "Rust" or "Project"
      expect(result).toBeNull();
    });
  });

  describe('formatMemoryBlock', () => {
    it('returns empty string for empty facts array', () => {
      const result = builder.formatMemoryBlock([]);
      expect(result).toBe('');
    });

    it('formats facts with memory_context tags', () => {
      const facts = [
        { subject: 'User', predicate: 'hasName', object: 'Patrice', metadata: undefined },
        { subject: 'User', predicate: 'livesIn', object: 'Alsace', metadata: undefined },
      ];

      const result = builder.formatMemoryBlock(facts);

      expect(result).toContain('<memory_context>');
      expect(result).toContain('</memory_context>');
      expect(result).toContain('Informations m\u00e9moris\u00e9es');
    });

    it('formats each fact as a bullet point', () => {
      const facts = [
        { subject: 'User', predicate: 'likes', object: 'TypeScript' },
        { subject: 'User', predicate: 'worksAt', object: 'Acme Corp' },
      ];

      const result = builder.formatMemoryBlock(facts);

      const lines = result.split('\n').filter(l => l.startsWith('- '));
      expect(lines.length).toBe(2);
      expect(lines[0]).toContain('User');
      expect(lines[0]).toContain('TypeScript');
      expect(lines[1]).toContain('User');
      expect(lines[1]).toContain('Acme Corp');
    });

    it('humanizes predicate names into French', () => {
      const facts = [
        { subject: 'User', predicate: 'likes', object: 'Python' },
      ];

      const result = builder.formatMemoryBlock(facts);

      // "likes" should be translated to "aime"
      expect(result).toContain('aime');
      expect(result).not.toContain('likes');
    });

    it('leaves unknown predicates as-is', () => {
      const facts = [
        { subject: 'User', predicate: 'customRelation', object: 'something' },
      ];

      const result = builder.formatMemoryBlock(facts);
      expect(result).toContain('customRelation');
    });
  });

  describe('singleton pattern', () => {
    it('returns the same instance', () => {
      const a = MemoryContextBuilder.getInstance();
      const b = MemoryContextBuilder.getInstance();
      expect(a).toBe(b);
    });

    it('resetInstance creates a new instance', () => {
      const a = MemoryContextBuilder.getInstance();
      MemoryContextBuilder.resetInstance();
      const b = MemoryContextBuilder.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('User facts always included', () => {
    it('includes User facts even when query has no matching keywords', () => {
      const kg = KnowledgeGraph.getInstance();
      kg.add('User', 'hasName', 'Patrice');

      // A query that has nothing to do with the stored fact
      const result = builder.getRelevantContext('Quelle heure est-il ?');

      expect(result).not.toBeNull();
      expect(result).toContain('Patrice');
    });

    it('includes Utilisateur facts as well', () => {
      const kg = KnowledgeGraph.getInstance();
      kg.add('Utilisateur', 'livesIn', 'Paris');

      const result = builder.getRelevantContext('test');

      expect(result).not.toBeNull();
      expect(result).toContain('Paris');
    });
  });

  describe('keyword extraction', () => {
    it('finds facts matching keywords in the query', () => {
      const kg = KnowledgeGraph.getInstance();
      kg.add('React', 'isA', 'framework JavaScript');
      kg.add('Vue', 'isA', 'framework JavaScript');

      const result = builder.getRelevantContext('Comment utiliser React pour un projet ?');

      expect(result).not.toBeNull();
      expect(result).toContain('React');
    });

    it('filters out French stop words', () => {
      const kg = KnowledgeGraph.getInstance();
      // "les" and "des" are stop words, they shouldn't trigger matches
      kg.add('les', 'isA', 'article');

      // Only stop words in query - no real keywords
      const result = builder.getRelevantContext('les des dans');

      // Should be null since all words are stop words
      expect(result).toBeNull();
    });
  });
});
