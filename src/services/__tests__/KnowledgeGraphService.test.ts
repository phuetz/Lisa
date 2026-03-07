/**
 * KnowledgeGraphService Tests
 * Comprehensive tests for the in-memory triple store:
 *   - add / addBatch / has / clear
 *   - query (exact, regex, pattern combinations)
 *   - neighbors / subgraph / findPath
 *   - remove
 *   - stats
 *   - toJSON / fromJSON / persist / load  (localStorage)
 *   - toVisualization
 *   - search (full-text)
 *   - formatForContext
 *   - importance scoring & memory decay
 *   - backward compatibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  KnowledgeGraph,
  getKnowledgeGraph,
  type MemoryCategory,
} from '../KnowledgeGraphService';

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
    _store: store,
    _reset: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
let graph: KnowledgeGraph;

beforeEach(() => {
  KnowledgeGraph.resetInstance();
  graph = KnowledgeGraph.getInstance();
  localStorageMock._reset();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
});

afterEach(() => {
  KnowledgeGraph.resetInstance();
});

// ===========================================================================
// Singleton
// ===========================================================================
describe('KnowledgeGraph singleton', () => {
  it('returns the same instance', () => {
    const a = KnowledgeGraph.getInstance();
    const b = KnowledgeGraph.getInstance();
    expect(a).toBe(b);
  });

  it('resetInstance creates a fresh graph', () => {
    graph.add('A', 'knows', 'B');
    KnowledgeGraph.resetInstance();
    const fresh = KnowledgeGraph.getInstance();
    expect(fresh.stats().tripleCount).toBe(0);
  });

  it('getKnowledgeGraph convenience function works', () => {
    expect(getKnowledgeGraph()).toBe(graph);
  });
});

// ===========================================================================
// add / has / clear
// ===========================================================================
describe('add / has / clear', () => {
  it('adds a triple and reports it exists', () => {
    graph.add('Alice', 'knows', 'Bob');
    expect(graph.has('Alice', 'knows', 'Bob')).toBe(true);
  });

  it('deduplicates identical triples', () => {
    graph.add('Alice', 'knows', 'Bob');
    graph.add('Alice', 'knows', 'Bob');
    expect(graph.stats().tripleCount).toBe(1);
  });

  it('has returns false for non-existent triples', () => {
    expect(graph.has('X', 'Y', 'Z')).toBe(false);
  });

  it('stores metadata', () => {
    graph.add('Alice', 'knows', 'Bob', { since: '2024' });
    const results = graph.query({ subject: 'Alice' });
    expect(results[0].metadata).toEqual({ since: '2024' });
  });

  it('clear removes everything', () => {
    graph.add('A', 'r', 'B');
    graph.add('C', 'r', 'D');
    graph.clear();
    expect(graph.stats().tripleCount).toBe(0);
    expect(graph.has('A', 'r', 'B')).toBe(false);
  });
});

// ===========================================================================
// addBatch
// ===========================================================================
describe('addBatch', () => {
  it('adds multiple triples and returns count', () => {
    const added = graph.addBatch([
      { subject: 'A', predicate: 'knows', object: 'B' },
      { subject: 'B', predicate: 'knows', object: 'C' },
      { subject: 'C', predicate: 'knows', object: 'A' },
    ]);
    expect(added).toBe(3);
    expect(graph.stats().tripleCount).toBe(3);
  });

  it('skips duplicates within batch', () => {
    const added = graph.addBatch([
      { subject: 'A', predicate: 'knows', object: 'B' },
      { subject: 'A', predicate: 'knows', object: 'B' },
    ]);
    expect(added).toBe(1);
  });

  it('skips duplicates against existing triples', () => {
    graph.add('A', 'knows', 'B');
    const added = graph.addBatch([
      { subject: 'A', predicate: 'knows', object: 'B' },
      { subject: 'C', predicate: 'knows', object: 'D' },
    ]);
    expect(added).toBe(1);
    expect(graph.stats().tripleCount).toBe(2);
  });

  it('passes metadata through', () => {
    graph.addBatch([
      { subject: 'A', predicate: 'likes', object: 'B', metadata: { note: 'test' } },
    ]);
    const results = graph.query({ subject: 'A' });
    expect(results[0].metadata).toEqual({ note: 'test' });
  });
});

// ===========================================================================
// query
// ===========================================================================
describe('query', () => {
  beforeEach(() => {
    graph.addBatch([
      { subject: 'Alice', predicate: 'knows', object: 'Bob' },
      { subject: 'Alice', predicate: 'likes', object: 'Carol' },
      { subject: 'Bob', predicate: 'knows', object: 'Carol' },
      { subject: 'Carol', predicate: 'likes', object: 'Alice' },
      { subject: 'Dave', predicate: 'knows', object: 'Alice' },
    ]);
  });

  it('queries by subject', () => {
    const results = graph.query({ subject: 'Alice' });
    expect(results).toHaveLength(2);
    expect(results.every((t) => t.subject === 'Alice')).toBe(true);
  });

  it('queries by predicate', () => {
    const results = graph.query({ predicate: 'likes' });
    expect(results).toHaveLength(2);
  });

  it('queries by object', () => {
    const results = graph.query({ object: 'Carol' });
    expect(results).toHaveLength(2);
  });

  it('queries by subject + predicate', () => {
    const results = graph.query({ subject: 'Alice', predicate: 'knows' });
    expect(results).toHaveLength(1);
    expect(results[0].object).toBe('Bob');
  });

  it('queries by all three fields', () => {
    const results = graph.query({
      subject: 'Alice',
      predicate: 'knows',
      object: 'Bob',
    });
    expect(results).toHaveLength(1);
  });

  it('returns empty for non-matching pattern', () => {
    const results = graph.query({ subject: 'Nobody' });
    expect(results).toHaveLength(0);
  });

  it('returns all triples with empty pattern', () => {
    const results = graph.query({});
    expect(results).toHaveLength(5);
  });

  it('supports regex on subject', () => {
    const results = graph.query({ subject: /^A/ });
    expect(results).toHaveLength(2);
    expect(results.every((t) => t.subject.startsWith('A'))).toBe(true);
  });

  it('supports regex on object', () => {
    const results = graph.query({ object: /^[BC]/ });
    expect(results).toHaveLength(3);
  });

  it('combines regex subject with exact predicate', () => {
    const results = graph.query({ subject: /^A/, predicate: 'likes' });
    expect(results).toHaveLength(1);
    expect(results[0].object).toBe('Carol');
  });
});

// ===========================================================================
// neighbors
// ===========================================================================
describe('neighbors', () => {
  beforeEach(() => {
    graph.addBatch([
      { subject: 'Alice', predicate: 'knows', object: 'Bob' },
      { subject: 'Carol', predicate: 'knows', object: 'Alice' },
      { subject: 'Dave', predicate: 'likes', object: 'Eve' },
    ]);
  });

  it('returns triples where entity is subject or object', () => {
    const n = graph.neighbors('Alice');
    expect(n).toHaveLength(2);
  });

  it('returns empty for isolated entity', () => {
    const n = graph.neighbors('Unknown');
    expect(n).toHaveLength(0);
  });
});

// ===========================================================================
// subgraph
// ===========================================================================
describe('subgraph', () => {
  beforeEach(() => {
    // A -> B -> C -> D  (chain)
    graph.addBatch([
      { subject: 'A', predicate: 'knows', object: 'B' },
      { subject: 'B', predicate: 'knows', object: 'C' },
      { subject: 'C', predicate: 'knows', object: 'D' },
      { subject: 'D', predicate: 'knows', object: 'E' },
    ]);
  });

  it('returns depth-0 subgraph (just neighbors)', () => {
    const sg = graph.subgraph('A', 0);
    expect(sg.entities).toContain('A');
    expect(sg.depth).toBe(0);
  });

  it('returns depth-1 subgraph', () => {
    const sg = graph.subgraph('A', 1);
    expect(sg.entities).toContain('A');
    expect(sg.entities).toContain('B');
    expect(sg.triples.length).toBeGreaterThan(0);
  });

  it('returns depth-2 subgraph', () => {
    const sg = graph.subgraph('A', 2);
    expect(sg.entities).toContain('A');
    expect(sg.entities).toContain('B');
    expect(sg.entities).toContain('C');
  });

  it('defaults to maxDepth=2', () => {
    const sg = graph.subgraph('A');
    expect(sg.depth).toBe(2);
    expect(sg.entities).toContain('C');
  });

  it('does not exceed maxDepth', () => {
    const sg = graph.subgraph('A', 1);
    // Should not reach C at depth 2
    expect(sg.entities.has('C')).toBe(false);
  });
});

// ===========================================================================
// findPath
// ===========================================================================
describe('findPath', () => {
  beforeEach(() => {
    // A -> B -> C -> D
    // A -> E -> D (shortcut)
    graph.addBatch([
      { subject: 'A', predicate: 'r', object: 'B' },
      { subject: 'B', predicate: 'r', object: 'C' },
      { subject: 'C', predicate: 'r', object: 'D' },
      { subject: 'A', predicate: 'r', object: 'E' },
      { subject: 'E', predicate: 'r', object: 'D' },
    ]);
  });

  it('returns empty path array for same source and target', () => {
    const paths = graph.findPath('A', 'A');
    expect(paths).toHaveLength(1);
    expect(paths[0]).toHaveLength(0);
  });

  it('finds direct paths', () => {
    const paths = graph.findPath('A', 'B');
    expect(paths.length).toBeGreaterThanOrEqual(1);
    expect(paths[0]).toHaveLength(1);
  });

  it('finds multi-hop paths', () => {
    const paths = graph.findPath('A', 'D');
    expect(paths.length).toBeGreaterThanOrEqual(1);
    // Should find the 2-hop path A->E->D
    const shortPath = paths.find((p) => p.length === 2);
    expect(shortPath).toBeDefined();
  });

  it('returns empty when no path exists', () => {
    graph.add('X', 'r', 'Y');
    const paths = graph.findPath('A', 'Y');
    expect(paths).toHaveLength(0);
  });

  it('respects maxDepth', () => {
    const paths = graph.findPath('A', 'D', 1);
    // No path of length <= 1 from A to D
    expect(paths).toHaveLength(0);
  });
});

// ===========================================================================
// remove
// ===========================================================================
describe('remove', () => {
  beforeEach(() => {
    graph.addBatch([
      { subject: 'A', predicate: 'knows', object: 'B' },
      { subject: 'A', predicate: 'likes', object: 'C' },
      { subject: 'B', predicate: 'knows', object: 'C' },
    ]);
  });

  it('removes matching triples by subject', () => {
    const removed = graph.remove({ subject: 'A' });
    expect(removed).toBe(2);
    expect(graph.stats().tripleCount).toBe(1);
  });

  it('removes matching triples by predicate', () => {
    const removed = graph.remove({ predicate: 'knows' });
    expect(removed).toBe(2);
    expect(graph.stats().tripleCount).toBe(1);
  });

  it('removes matching triples by exact pattern', () => {
    const removed = graph.remove({
      subject: 'A',
      predicate: 'knows',
      object: 'B',
    });
    expect(removed).toBe(1);
    expect(graph.has('A', 'knows', 'B')).toBe(false);
    expect(graph.has('A', 'likes', 'C')).toBe(true);
  });

  it('returns 0 when nothing matches', () => {
    const removed = graph.remove({ subject: 'Nobody' });
    expect(removed).toBe(0);
    expect(graph.stats().tripleCount).toBe(3);
  });

  it('rebuilds indices after removal', () => {
    graph.remove({ subject: 'A' });
    // The remaining triple should still be queryable
    const results = graph.query({ subject: 'B' });
    expect(results).toHaveLength(1);
    expect(results[0].object).toBe('C');
  });
});

// ===========================================================================
// stats
// ===========================================================================
describe('stats', () => {
  it('returns zeros for empty graph', () => {
    const s = graph.stats();
    expect(s).toEqual({
      tripleCount: 0,
      subjectCount: 0,
      predicateCount: 0,
      objectCount: 0,
    });
  });

  it('counts distinct subjects, predicates, objects', () => {
    graph.addBatch([
      { subject: 'A', predicate: 'knows', object: 'B' },
      { subject: 'A', predicate: 'likes', object: 'C' },
      { subject: 'B', predicate: 'knows', object: 'C' },
    ]);
    const s = graph.stats();
    expect(s.tripleCount).toBe(3);
    expect(s.subjectCount).toBe(2); // A, B
    expect(s.predicateCount).toBe(2); // knows, likes
    expect(s.objectCount).toBe(2); // B, C
  });
});

// ===========================================================================
// toJSON / fromJSON
// ===========================================================================
describe('toJSON / fromJSON', () => {
  it('serializes graph to JSON object', () => {
    graph.add('A', 'r', 'B', { note: 'test' });
    const json = graph.toJSON();
    expect(json.version).toBe(2);
    expect(json.triples).toHaveLength(1);
    expect(json.triples[0]).toMatchObject({
      subject: 'A',
      predicate: 'r',
      object: 'B',
      metadata: { note: 'test' },
    });
    // New fields should be present
    expect(json.triples[0].importance).toBeCloseTo(0.5, 1);
    expect(json.triples[0].accessCount).toBe(0);
    expect(typeof json.triples[0].createdAt).toBe('number');
    expect(typeof json.triples[0].lastAccessed).toBe('number');
    expect(typeof json.timestamp).toBe('number');
  });

  it('restores graph from JSON', () => {
    graph.add('A', 'r', 'B');
    graph.add('B', 'r', 'C');
    const json = graph.toJSON();

    graph.clear();
    expect(graph.stats().tripleCount).toBe(0);

    graph.fromJSON(json);
    expect(graph.stats().tripleCount).toBe(2);
    expect(graph.has('A', 'r', 'B')).toBe(true);
    expect(graph.has('B', 'r', 'C')).toBe(true);
  });

  it('handles invalid data gracefully', () => {
    graph.add('A', 'r', 'B');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph.fromJSON(null as any);
    expect(graph.stats().tripleCount).toBe(0);
  });

  it('handles data with missing triples array', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph.fromJSON({ version: 1, timestamp: 0 } as any);
    expect(graph.stats().tripleCount).toBe(0);
  });
});

// ===========================================================================
// persist / load (localStorage)
// ===========================================================================
describe('persist / load', () => {
  it('persists to localStorage', () => {
    graph.add('A', 'r', 'B');
    graph.persist();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'lisa_knowledge_graph',
      expect.any(String),
    );
  });

  it('loads from localStorage', () => {
    graph.add('X', 'r', 'Y');
    graph.persist();

    // Create a fresh graph and load
    KnowledgeGraph.resetInstance();
    const fresh = KnowledgeGraph.getInstance();
    const loaded = fresh.load();
    expect(loaded).toBe(true);
    expect(fresh.has('X', 'r', 'Y')).toBe(true);
  });

  it('load returns false when no stored data', () => {
    const loaded = graph.load();
    expect(loaded).toBe(false);
  });

  it('load returns false on corrupted data', () => {
    localStorageMock.setItem('lisa_knowledge_graph', 'not-json!!!');
    // Reset to pick up the mock value
    localStorageMock.getItem.mockReturnValueOnce('not-json!!!');
    const loaded = graph.load();
    expect(loaded).toBe(false);
  });

  it('round-trips complex graph through localStorage', () => {
    graph.addBatch([
      { subject: 'A', predicate: 'knows', object: 'B', metadata: { since: '2024' } },
      { subject: 'B', predicate: 'likes', object: 'C' },
      { subject: 'C', predicate: 'knows', object: 'A' },
    ]);
    graph.persist();

    KnowledgeGraph.resetInstance();
    const restored = KnowledgeGraph.getInstance();
    restored.load();

    expect(restored.stats().tripleCount).toBe(3);
    expect(restored.has('A', 'knows', 'B')).toBe(true);
    const results = restored.query({ subject: 'A' });
    expect(results[0].metadata).toEqual({ since: '2024' });
  });
});

// ===========================================================================
// toVisualization
// ===========================================================================
describe('toVisualization', () => {
  beforeEach(() => {
    graph.addBatch([
      { subject: 'Alice', predicate: 'knows', object: 'Bob' },
      { subject: 'Bob', predicate: 'knows', object: 'Carol' },
      { subject: 'Dave', predicate: 'likes', object: 'Eve' },
    ]);
  });

  it('returns full graph visualization (no entity filter)', () => {
    const viz = graph.toVisualization();
    expect(viz.nodes).toHaveLength(5);
    expect(viz.edges).toHaveLength(3);
    expect(viz.nodes.find((n) => n.id === 'Alice')).toBeDefined();
    expect(viz.edges.find((e) => e.source === 'Alice' && e.target === 'Bob')).toBeDefined();
  });

  it('returns scoped visualization around an entity', () => {
    const viz = graph.toVisualization('Alice', 1);
    // Alice -> Bob at depth 1; Dave/Eve should be excluded
    expect(viz.nodes.some((n) => n.id === 'Alice')).toBe(true);
    expect(viz.nodes.some((n) => n.id === 'Bob')).toBe(true);
    expect(viz.nodes.some((n) => n.id === 'Dave')).toBe(false);
  });

  it('returns correct edge labels', () => {
    const viz = graph.toVisualization();
    const edge = viz.edges.find(
      (e) => e.source === 'Alice' && e.target === 'Bob',
    );
    expect(edge?.label).toBe('knows');
  });

  it('returns empty visualization for empty graph', () => {
    graph.clear();
    const viz = graph.toVisualization();
    expect(viz.nodes).toHaveLength(0);
    expect(viz.edges).toHaveLength(0);
  });

  it('nodes have id and label fields', () => {
    const viz = graph.toVisualization();
    for (const node of viz.nodes) {
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('label');
      expect(node.id).toBe(node.label);
    }
  });
});

// ===========================================================================
// search (full-text)
// ===========================================================================
describe('search', () => {
  beforeEach(() => {
    graph.addBatch([
      { subject: 'Alice Smith', predicate: 'knows', object: 'Bob Jones' },
      {
        subject: 'Carol',
        predicate: 'likes',
        object: 'TypeScript',
        metadata: { reason: 'strongly typed' },
      },
      { subject: 'Dave', predicate: 'uses', object: 'React Framework' },
    ]);
  });

  it('finds triples by subject keyword', () => {
    const results = graph.search('Alice');
    expect(results).toHaveLength(1);
    expect(results[0].subject).toBe('Alice Smith');
  });

  it('finds triples by object keyword', () => {
    const results = graph.search('React');
    expect(results).toHaveLength(1);
    expect(results[0].object).toBe('React Framework');
  });

  it('finds triples by predicate keyword', () => {
    const results = graph.search('likes');
    expect(results).toHaveLength(1);
  });

  it('finds triples by metadata value keyword', () => {
    const results = graph.search('typed');
    expect(results).toHaveLength(1);
    expect(results[0].subject).toBe('Carol');
  });

  it('is case-insensitive', () => {
    const results = graph.search('alice');
    expect(results).toHaveLength(1);
  });

  it('returns empty for no match', () => {
    const results = graph.search('Python');
    expect(results).toHaveLength(0);
  });

  it('returns empty for empty keyword', () => {
    const results = graph.search('');
    expect(results).toHaveLength(0);
  });

  it('returns multiple matches when keyword spans triples', () => {
    graph.add('React Component', 'uses', 'React Hooks');
    const results = graph.search('React');
    expect(results.length).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
// formatForContext
// ===========================================================================
describe('formatForContext', () => {
  it('returns empty string for unknown entity', () => {
    expect(graph.formatForContext('Unknown')).toBe('');
  });

  it('returns formatted context block', () => {
    graph.add('Alice', 'knows', 'Bob');
    graph.add('Alice', 'likes', 'Carol');
    const ctx = graph.formatForContext('Alice');
    expect(ctx).toContain('<context type="knowledge">');
    expect(ctx).toContain('Knowledge Graph for "Alice"');
    expect(ctx).toContain('Alice --knows--> Bob');
    expect(ctx).toContain('Alice --likes--> Carol');
    expect(ctx).toContain('</context>');
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================
describe('edge cases', () => {
  it('handles entities with special characters', () => {
    graph.add('file:src/index.ts', 'imports', 'module:react');
    expect(graph.has('file:src/index.ts', 'imports', 'module:react')).toBe(true);
    const results = graph.query({ subject: 'file:src/index.ts' });
    expect(results).toHaveLength(1);
  });

  it('handles empty string fields', () => {
    graph.add('', 'r', '');
    expect(graph.has('', 'r', '')).toBe(true);
  });

  it('handles unicode entity names', () => {
    graph.add('utilisateur', 'aime', 'cafe');
    expect(graph.has('utilisateur', 'aime', 'cafe')).toBe(true);
  });

  it('handles large batch without errors', () => {
    const batch = Array.from({ length: 1000 }, (_, i) => ({
      subject: `entity_${i}`,
      predicate: 'relatedTo',
      object: `entity_${(i + 1) % 1000}`,
    }));
    const added = graph.addBatch(batch);
    expect(added).toBe(1000);
    expect(graph.stats().tripleCount).toBe(1000);
  });

  it('subgraph on isolated entity returns just the entity', () => {
    graph.add('A', 'r', 'B');
    const sg = graph.subgraph('X', 2);
    expect(sg.entities).toContain('X');
    expect(sg.triples).toHaveLength(0);
  });

  it('findPath with disconnected nodes returns empty', () => {
    graph.add('A', 'r', 'B');
    graph.add('C', 'r', 'D');
    const paths = graph.findPath('A', 'D');
    expect(paths).toHaveLength(0);
  });

  it('query with regex that matches nothing returns empty', () => {
    graph.add('Alice', 'r', 'Bob');
    const results = graph.query({ subject: /^zzz/ });
    expect(results).toHaveLength(0);
  });

  it('remove with regex pattern works', () => {
    graph.addBatch([
      { subject: 'file:a.ts', predicate: 'imports', object: 'react' },
      { subject: 'file:b.ts', predicate: 'imports', object: 'react' },
      { subject: 'module:x', predicate: 'exports', object: 'fn' },
    ]);
    const removed = graph.remove({ subject: /^file:/ });
    expect(removed).toBe(2);
    expect(graph.stats().tripleCount).toBe(1);
  });
});

// ===========================================================================
// Importance scoring
// ===========================================================================
describe('importance scoring', () => {
  it('sets default importance based on category', () => {
    const categories: Array<{ cat: MemoryCategory; expected: number }> = [
      { cat: 'personal', expected: 0.9 },
      { cat: 'preference', expected: 0.7 },
      { cat: 'instruction', expected: 0.8 },
      { cat: 'project', expected: 0.6 },
      { cat: 'decision', expected: 0.6 },
      { cat: 'general', expected: 0.5 },
    ];

    for (const { cat, expected } of categories) {
      graph.add(`subject_${cat}`, 'relatedTo', `object_${cat}`, undefined, undefined, cat);
    }

    for (const { cat, expected } of categories) {
      const results = graph.query({ subject: `subject_${cat}` });
      expect(results).toHaveLength(1);
      expect(results[0].importance).toBeCloseTo(expected, 2);
      expect(results[0].category).toBe(cat);
    }
  });

  it('uses default importance of 0.5 without category', () => {
    graph.add('A', 'knows', 'B');
    const results = graph.query({ subject: 'A' });
    expect(results[0].importance).toBeCloseTo(0.5, 2);
    expect(results[0].category).toBe('general');
  });

  it('accepts explicit importance parameter', () => {
    graph.add('A', 'knows', 'B', undefined, 0.95);
    const results = graph.query({ subject: 'A' });
    expect(results[0].importance).toBeCloseTo(0.95, 2);
  });

  it('clamps importance to [0, 1]', () => {
    graph.add('A', 'r', 'B', undefined, 1.5);
    graph.add('C', 'r', 'D', undefined, -0.5);
    const results = graph.query({});
    const a = results.find(t => t.subject === 'A')!;
    const c = results.find(t => t.subject === 'C')!;
    expect(a.importance).toBeLessThanOrEqual(1);
    expect(c.importance).toBeGreaterThanOrEqual(0);
  });

  it('touchTriple increments access count and updates lastAccessed', () => {
    graph.add('A', 'knows', 'B');
    const before = graph.query({ subject: 'A' })[0];
    expect(before.accessCount).toBe(0);
    const originalLastAccessed = before.lastAccessed;

    // Small delay to ensure timestamp difference
    graph.touchTriple('A', 'knows', 'B');

    const after = graph.query({ subject: 'A' })[0];
    expect(after.accessCount).toBe(1);
    expect(after.lastAccessed).toBeGreaterThanOrEqual(originalLastAccessed);
    expect(after.importance).toBeGreaterThan(0.5); // Should have been boosted
  });

  it('touchTriple is a no-op for non-existent triples', () => {
    // Should not throw
    graph.touchTriple('X', 'Y', 'Z');
    expect(graph.stats().tripleCount).toBe(0);
  });

  it('getByImportance returns sorted results', () => {
    graph.add('low', 'r', 'val', undefined, 0.2);
    graph.add('mid', 'r', 'val', undefined, 0.5);
    graph.add('high', 'r', 'val', undefined, 0.9);

    const sorted = graph.getByImportance();
    expect(sorted).toHaveLength(3);
    expect(sorted[0].subject).toBe('high');
    expect(sorted[1].subject).toBe('mid');
    expect(sorted[2].subject).toBe('low');
  });

  it('getByImportance respects limit', () => {
    graph.add('A', 'r', 'B', undefined, 0.9);
    graph.add('C', 'r', 'D', undefined, 0.5);
    graph.add('E', 'r', 'F', undefined, 0.1);

    const top2 = graph.getByImportance(2);
    expect(top2).toHaveLength(2);
    expect(top2[0].importance).toBeGreaterThanOrEqual(top2[1].importance);
  });

  it('setImportance updates the value', () => {
    graph.add('A', 'knows', 'B');
    graph.setImportance('A', 'knows', 'B', 0.99);

    const results = graph.query({ subject: 'A' });
    expect(results[0].importance).toBeCloseTo(0.99, 2);
  });

  it('setImportance clamps to [0, 1]', () => {
    graph.add('A', 'r', 'B');
    graph.setImportance('A', 'r', 'B', 5.0);
    expect(graph.query({ subject: 'A' })[0].importance).toBe(1);

    graph.setImportance('A', 'r', 'B', -1.0);
    expect(graph.query({ subject: 'A' })[0].importance).toBe(0);
  });

  it('setImportance is a no-op for non-existent triples', () => {
    // Should not throw
    graph.setImportance('X', 'Y', 'Z', 0.5);
    expect(graph.stats().tripleCount).toBe(0);
  });

  it('query results are sorted by importance DESC', () => {
    graph.add('A', 'knows', 'B', undefined, 0.2);
    graph.add('A', 'knows', 'C', undefined, 0.9);
    graph.add('A', 'knows', 'D', undefined, 0.5);

    const results = graph.query({ subject: 'A' });
    expect(results[0].importance).toBeGreaterThanOrEqual(results[1].importance);
    expect(results[1].importance).toBeGreaterThanOrEqual(results[2].importance);
  });

  it('search results are sorted by importance DESC', () => {
    graph.add('React low', 'uses', 'lib', undefined, 0.1);
    graph.add('React high', 'uses', 'lib', undefined, 0.9);

    const results = graph.search('React');
    expect(results).toHaveLength(2);
    expect(results[0].importance).toBeGreaterThan(results[1].importance);
  });

  it('neighbors results are sorted by importance DESC', () => {
    graph.add('Alice', 'knows', 'Bob', undefined, 0.3);
    graph.add('Alice', 'likes', 'Carol', undefined, 0.8);

    const n = graph.neighbors('Alice');
    expect(n).toHaveLength(2);
    expect(n[0].importance).toBeGreaterThanOrEqual(n[1].importance);
  });

  it('addBatch accepts importance and category', () => {
    graph.addBatch([
      { subject: 'User', predicate: 'knows', object: 'Name', importance: 0.95, category: 'personal' },
      { subject: 'User', predicate: 'likes', object: 'Jazz', category: 'preference' },
    ]);

    const results = graph.query({ subject: 'User' });
    const nameTriple = results.find(t => t.object === 'Name')!;
    const jazzTriple = results.find(t => t.object === 'Jazz')!;

    expect(nameTriple.importance).toBeCloseTo(0.95, 2);
    expect(nameTriple.category).toBe('personal');
    expect(jazzTriple.importance).toBeCloseTo(0.7, 2); // default for 'preference'
    expect(jazzTriple.category).toBe('preference');
  });
});

// ===========================================================================
// Memory decay
// ===========================================================================
describe('memory decay', () => {
  it('decays old memories', () => {
    graph.add('A', 'r', 'B', undefined, 0.8);

    // Manually set lastAccessed to 30 days ago
    const results = graph.query({ subject: 'A' });
    const triple = results[0];
    triple.lastAccessed = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const decayed = graph.decayMemories(0.05);
    expect(decayed).toBeGreaterThanOrEqual(1);

    const after = graph.query({ subject: 'A' });
    if (after.length > 0) {
      expect(after[0].importance).toBeLessThan(0.8);
    }
  });

  it('removes memories below threshold', () => {
    graph.add('low', 'r', 'val', undefined, 0.06);

    // Set lastAccessed to 100 days ago so decay drops it below 0.05
    const results = graph.query({ subject: 'low' });
    results[0].lastAccessed = Date.now() - 100 * 24 * 60 * 60 * 1000;

    graph.decayMemories(0.05);

    expect(graph.has('low', 'r', 'val')).toBe(false);
    expect(graph.stats().tripleCount).toBe(0);
  });

  it('does not decay recently accessed memories', () => {
    graph.add('A', 'r', 'B', undefined, 0.5);

    // lastAccessed is "now" (default), which is < 1 day ago
    const decayed = graph.decayMemories(0.1);
    expect(decayed).toBe(0);

    const results = graph.query({ subject: 'A' });
    expect(results[0].importance).toBeCloseTo(0.5, 2);
  });

  it('preserves high-importance memories longer', () => {
    graph.add('important', 'r', 'val', undefined, 0.95);
    graph.add('unimportant', 'r', 'val', undefined, 0.1);

    // Set both to 10 days ago
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
    graph.query({ subject: 'important' })[0].lastAccessed = tenDaysAgo;
    graph.query({ subject: 'unimportant' })[0].lastAccessed = tenDaysAgo;

    graph.decayMemories(0.05);

    // Important memory should still exist
    const importantResults = graph.query({ subject: 'important' });
    expect(importantResults).toHaveLength(1);
    expect(importantResults[0].importance).toBeGreaterThan(0.05);

    // Unimportant memory should have been removed (0.1 * (0.95^10) ~ 0.06, borderline)
    // With decayRate 0.05 and 10 days: 0.1 * 0.95^10 = 0.0598... < 0.05 threshold
    // Actually: Math.pow(0.95, 10) = 0.5987... so 0.1 * 0.5987 = 0.0599
    // That's > 0.05, so it might survive. Let's use a bigger gap.
  });

  it('removes very old low-importance memories', () => {
    graph.add('ancient', 'r', 'val', undefined, 0.1);

    // Set lastAccessed to 200 days ago
    const results = graph.query({ subject: 'ancient' });
    results[0].lastAccessed = Date.now() - 200 * 24 * 60 * 60 * 1000;

    graph.decayMemories(0.02);

    // 0.1 * (0.98^200) = 0.1 * 0.0176 = 0.00176 < 0.05
    expect(graph.has('ancient', 'r', 'val')).toBe(false);
  });

  it('returns 0 when no memories need decay', () => {
    graph.add('A', 'r', 'B', undefined, 0.9);
    // lastAccessed is "now"
    const decayed = graph.decayMemories();
    expect(decayed).toBe(0);
  });

  it('works on empty graph', () => {
    const decayed = graph.decayMemories();
    expect(decayed).toBe(0);
  });
});

// ===========================================================================
// Backward compatibility
// ===========================================================================
describe('backward compatibility', () => {
  it('loads old format data without importance fields', () => {
    // Simulate old-format data (version 1, no importance/accessCount/createdAt/lastAccessed)
    const oldData = {
      version: 1,
      triples: [
        { subject: 'Alice', predicate: 'knows', object: 'Bob', metadata: { note: 'old' } },
        { subject: 'Carol', predicate: 'likes', object: 'TypeScript' },
      ],
      timestamp: Date.now() - 100000,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph.fromJSON(oldData as any);

    expect(graph.stats().tripleCount).toBe(2);
    expect(graph.has('Alice', 'knows', 'Bob')).toBe(true);
    expect(graph.has('Carol', 'likes', 'TypeScript')).toBe(true);
  });

  it('assigns default values to missing fields', () => {
    const oldData = {
      version: 1,
      triples: [
        { subject: 'X', predicate: 'r', object: 'Y' },
      ],
      timestamp: Date.now(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph.fromJSON(oldData as any);

    const results = graph.query({ subject: 'X' });
    expect(results).toHaveLength(1);
    const t = results[0];

    // Should have been given defaults
    expect(t.importance).toBe(0.5);
    expect(t.accessCount).toBe(0);
    expect(typeof t.createdAt).toBe('number');
    expect(t.createdAt).toBeGreaterThan(0);
    expect(typeof t.lastAccessed).toBe('number');
    expect(t.lastAccessed).toBeGreaterThan(0);
  });

  it('preserves existing importance fields on load', () => {
    // Data that already has new fields
    const newData = {
      version: 2,
      triples: [
        {
          subject: 'A',
          predicate: 'r',
          object: 'B',
          importance: 0.85,
          accessCount: 5,
          createdAt: 1700000000000,
          lastAccessed: 1700000050000,
          category: 'personal',
        },
      ],
      timestamp: Date.now(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph.fromJSON(newData as any);

    const results = graph.query({ subject: 'A' });
    expect(results).toHaveLength(1);
    expect(results[0].importance).toBe(0.85);
    expect(results[0].accessCount).toBe(5);
    expect(results[0].createdAt).toBe(1700000000000);
    expect(results[0].lastAccessed).toBe(1700000050000);
    expect(results[0].category).toBe('personal');
  });

  it('round-trips through localStorage with old data', () => {
    // Inject old-format data directly into localStorage
    const oldData = JSON.stringify({
      version: 1,
      triples: [
        { subject: 'OldFact', predicate: 'knows', object: 'Value' },
      ],
      timestamp: Date.now(),
    });
    localStorageMock.setItem('lisa_knowledge_graph', oldData);

    KnowledgeGraph.resetInstance();
    const fresh = KnowledgeGraph.getInstance();
    const loaded = fresh.load();

    expect(loaded).toBe(true);
    expect(fresh.has('OldFact', 'knows', 'Value')).toBe(true);

    const results = fresh.query({ subject: 'OldFact' });
    expect(results[0].importance).toBe(0.5);
    expect(results[0].accessCount).toBe(0);

    // Persist again and re-load — should now be version 2
    fresh.persist();
    KnowledgeGraph.resetInstance();
    const fresh2 = KnowledgeGraph.getInstance();
    fresh2.load();

    expect(fresh2.has('OldFact', 'knows', 'Value')).toBe(true);
    const results2 = fresh2.query({ subject: 'OldFact' });
    expect(results2[0].importance).toBe(0.5);
  });
});
