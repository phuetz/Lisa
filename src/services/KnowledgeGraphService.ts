/**
 * Knowledge Graph Service — Lightweight In-Memory Triple Store
 *
 * Stores entity relationships as RDF-like triples (subject, predicate, object).
 * Queryable via pattern matching with indexed lookups for fast retrieval.
 *
 * Browser-compatible: uses localStorage for persistence, no Node.js APIs.
 * Ported from Code Buddy's knowledge-graph.ts with Lisa-specific additions:
 *   - toJSON() / fromJSON() for localStorage persistence
 *   - toVisualization() for graph rendering (nodes/edges)
 *   - search() for full-text keyword search across triples
 */

// ============================================================================
// Types
// ============================================================================

export interface Triple {
  subject: string;
  predicate: string;
  object: string;
  metadata?: Record<string, string>;
}

export type Predicate =
  | 'imports'
  | 'exports'
  | 'calls'
  | 'extends'
  | 'implements'
  | 'dependsOn'
  | 'contains'
  | 'definedIn'
  | 'usedBy'
  | 'typeof'
  | 'relatedTo'
  | 'knows'
  | 'likes'
  | 'remembers'
  | 'mentionedIn';

export interface TriplePattern {
  subject?: string | RegExp;
  predicate?: string;
  object?: string | RegExp;
}

export interface GraphStats {
  tripleCount: number;
  subjectCount: number;
  predicateCount: number;
  objectCount: number;
}

export interface SubgraphResult {
  triples: Triple[];
  entities: Set<string>;
  depth: number;
}

export interface VisualizationNode {
  id: string;
  label: string;
}

export interface VisualizationEdge {
  source: string;
  target: string;
  label: string;
}

export interface VisualizationData {
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
}

// ============================================================================
// Serialization Types (for localStorage)
// ============================================================================

interface SerializedGraph {
  version: number;
  triples: Triple[];
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'lisa_knowledge_graph';

// ============================================================================
// Knowledge Graph (Singleton)
// ============================================================================

export class KnowledgeGraph {
  private static instance: KnowledgeGraph | null = null;

  /** All triples */
  private triples: Triple[] = [];

  /** Index: subject -> triple indices */
  private subjectIndex = new Map<string, Set<number>>();

  /** Index: predicate -> triple indices */
  private predicateIndex = new Map<string, Set<number>>();

  /** Index: object -> triple indices */
  private objectIndex = new Map<string, Set<number>>();

  static getInstance(): KnowledgeGraph {
    if (!KnowledgeGraph.instance) {
      KnowledgeGraph.instance = new KnowledgeGraph();
    }
    return KnowledgeGraph.instance;
  }

  static resetInstance(): void {
    KnowledgeGraph.instance = null;
  }

  // ==========================================================================
  // Core Operations
  // ==========================================================================

  /**
   * Add a triple to the graph (deduplicated)
   */
  add(
    subject: string,
    predicate: string,
    object: string,
    metadata?: Record<string, string>,
  ): void {
    if (this.has(subject, predicate, object)) return;

    const idx = this.triples.length;
    this.triples.push({ subject, predicate, object, metadata });

    this.addToIndex(this.subjectIndex, subject, idx);
    this.addToIndex(this.predicateIndex, predicate, idx);
    this.addToIndex(this.objectIndex, object, idx);
  }

  /**
   * Add multiple triples at once. Returns the number actually added.
   */
  addBatch(
    triples: Array<{
      subject: string;
      predicate: string;
      object: string;
      metadata?: Record<string, string>;
    }>,
  ): number {
    let added = 0;
    for (const t of triples) {
      if (!this.has(t.subject, t.predicate, t.object)) {
        this.add(t.subject, t.predicate, t.object, t.metadata);
        added++;
      }
    }
    return added;
  }

  /**
   * Check if a triple exists
   */
  has(subject: string, predicate: string, object: string): boolean {
    const subjectSet = this.subjectIndex.get(subject);
    if (!subjectSet) return false;

    for (const idx of subjectSet) {
      const t = this.triples[idx];
      if (t.predicate === predicate && t.object === object) return true;
    }
    return false;
  }

  /**
   * Query triples matching a pattern (indexed lookup + regex support)
   */
  query(pattern: TriplePattern): Triple[] {
    let candidates: Set<number> | null = null;

    // Use indices to narrow candidates
    if (pattern.subject && typeof pattern.subject === 'string') {
      candidates = this.subjectIndex.get(pattern.subject) ?? new Set();
    }
    if (pattern.predicate) {
      const predSet = this.predicateIndex.get(pattern.predicate) ?? new Set();
      candidates = candidates ? this.intersect(candidates, predSet) : predSet;
    }
    if (pattern.object && typeof pattern.object === 'string') {
      const objSet = this.objectIndex.get(pattern.object) ?? new Set();
      candidates = candidates ? this.intersect(candidates, objSet) : objSet;
    }

    // If no index hit, scan all
    const indices = candidates ?? new Set(this.triples.keys());

    const results: Triple[] = [];
    for (const idx of indices) {
      const t = this.triples[idx];
      if (this.matchesPattern(t, pattern)) {
        results.push(t);
      }
    }

    return results;
  }

  /**
   * Get all triples connected to an entity (1-hop neighbors)
   */
  neighbors(entity: string): Triple[] {
    return [
      ...this.query({ subject: entity }),
      ...this.query({ object: entity }),
    ];
  }

  /**
   * Get a subgraph around an entity up to a given depth (BFS)
   */
  subgraph(entity: string, maxDepth: number = 2): SubgraphResult {
    const visited = new Set<string>();
    const resultTriples: Triple[] = [];
    const queue: Array<{ entity: string; depth: number }> = [
      { entity, depth: 0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.entity) || current.depth > maxDepth) continue;
      visited.add(current.entity);

      const related = this.neighbors(current.entity);
      for (const triple of related) {
        resultTriples.push(triple);
        const other =
          triple.subject === current.entity ? triple.object : triple.subject;
        if (!visited.has(other) && current.depth < maxDepth) {
          queue.push({ entity: other, depth: current.depth + 1 });
        }
      }
    }

    return {
      triples: resultTriples,
      entities: visited,
      depth: maxDepth,
    };
  }

  /**
   * Find paths between two entities (BFS shortest path)
   */
  findPath(from: string, to: string, maxDepth: number = 5): Triple[][] {
    if (from === to) return [[]];

    const queue: Array<{ entity: string; path: Triple[] }> = [
      { entity: from, path: [] },
    ];
    const visited = new Set<string>([from]);
    const paths: Triple[][] = [];

    while (queue.length > 0) {
      const { entity, path } = queue.shift()!;
      if (path.length >= maxDepth) continue;

      const related = this.neighbors(entity);
      for (const triple of related) {
        const next =
          triple.subject === entity ? triple.object : triple.subject;
        if (next === to) {
          paths.push([...path, triple]);
          continue;
        }
        if (!visited.has(next)) {
          visited.add(next);
          queue.push({ entity: next, path: [...path, triple] });
        }
      }
    }

    return paths;
  }

  /**
   * Remove triples matching a pattern. Returns count removed.
   */
  remove(pattern: TriplePattern): number {
    const matching = this.query(pattern);
    if (matching.length === 0) return 0;

    const toRemove = new Set(
      matching.map((m) =>
        this.triples.findIndex(
          (t) =>
            t.subject === m.subject &&
            t.predicate === m.predicate &&
            t.object === m.object,
        ),
      ),
    );

    const newTriples = this.triples.filter((_, i) => !toRemove.has(i));
    this.rebuildIndices(newTriples);

    return matching.length;
  }

  /**
   * Get graph statistics
   */
  stats(): GraphStats {
    return {
      tripleCount: this.triples.length,
      subjectCount: this.subjectIndex.size,
      predicateCount: this.predicateIndex.size,
      objectCount: this.objectIndex.size,
    };
  }

  /**
   * Clear all triples and indices
   */
  clear(): void {
    this.triples = [];
    this.subjectIndex.clear();
    this.predicateIndex.clear();
    this.objectIndex.clear();
  }

  // ==========================================================================
  // Lisa Additions: Persistence
  // ==========================================================================

  /**
   * Serialize graph to a JSON-safe object (for localStorage)
   */
  toJSON(): SerializedGraph {
    return {
      version: 1,
      triples: [...this.triples],
      timestamp: Date.now(),
    };
  }

  /**
   * Restore graph from serialized data
   */
  fromJSON(data: SerializedGraph): void {
    this.clear();
    if (!data || !Array.isArray(data.triples)) {
      console.debug('KnowledgeGraph: invalid data, skipping load');
      return;
    }
    for (const t of data.triples) {
      this.add(t.subject, t.predicate, t.object, t.metadata);
    }
    console.debug(
      `KnowledgeGraph: loaded ${this.triples.length} triples from serialized data`,
    );
  }

  /**
   * Persist graph to localStorage
   */
  persist(): void {
    try {
      const json = JSON.stringify(this.toJSON());
      localStorage.setItem(STORAGE_KEY, json);
      console.debug(
        `KnowledgeGraph: persisted ${this.triples.length} triples to localStorage`,
      );
    } catch (e) {
      console.debug('KnowledgeGraph: failed to persist to localStorage', e);
    }
  }

  /**
   * Load graph from localStorage
   */
  load(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data: SerializedGraph = JSON.parse(raw);
      this.fromJSON(data);
      return true;
    } catch (e) {
      console.debug('KnowledgeGraph: failed to load from localStorage', e);
      return false;
    }
  }

  // ==========================================================================
  // Lisa Additions: Visualization
  // ==========================================================================

  /**
   * Return data structure for graph rendering (nodes/edges format).
   * Optionally scoped to a subgraph around a specific entity.
   */
  toVisualization(entity?: string, maxDepth?: number): VisualizationData {
    const triplesToRender = entity
      ? this.subgraph(entity, maxDepth ?? 2).triples
      : [...this.triples];

    const nodeSet = new Set<string>();
    const edges: VisualizationEdge[] = [];

    for (const t of triplesToRender) {
      nodeSet.add(t.subject);
      nodeSet.add(t.object);
      edges.push({
        source: t.subject,
        target: t.object,
        label: t.predicate,
      });
    }

    const nodes: VisualizationNode[] = Array.from(nodeSet).map((id) => ({
      id,
      label: id,
    }));

    return { nodes, edges };
  }

  // ==========================================================================
  // Lisa Additions: Full-Text Search
  // ==========================================================================

  /**
   * Full-text search across all triple fields (subject, predicate, object, metadata values).
   * Case-insensitive keyword matching.
   */
  search(keyword: string): Triple[] {
    if (!keyword) return [];
    const lower = keyword.toLowerCase();
    const results: Triple[] = [];

    for (const t of this.triples) {
      if (
        t.subject.toLowerCase().includes(lower) ||
        t.predicate.toLowerCase().includes(lower) ||
        t.object.toLowerCase().includes(lower) ||
        (t.metadata &&
          Object.values(t.metadata).some((v) =>
            v.toLowerCase().includes(lower),
          ))
      ) {
        results.push(t);
      }
    }

    return results;
  }

  // ==========================================================================
  // Context Formatting (for AI injection)
  // ==========================================================================

  /**
   * Format subgraph as readable text for LLM context injection
   */
  formatForContext(entity: string, maxDepth: number = 2): string {
    const sg = this.subgraph(entity, maxDepth);
    if (sg.triples.length === 0) return '';

    const lines = sg.triples.map(
      (t) => `  ${t.subject} --${t.predicate}--> ${t.object}`,
    );
    return `<context type="knowledge">\nKnowledge Graph for "${entity}":\n${lines.join('\n')}\n</context>`;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private addToIndex(
    index: Map<string, Set<number>>,
    key: string,
    idx: number,
  ): void {
    let set = index.get(key);
    if (!set) {
      set = new Set();
      index.set(key, set);
    }
    set.add(idx);
  }

  private intersect(a: Set<number>, b: Set<number>): Set<number> {
    const result = new Set<number>();
    const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
    for (const item of smaller) {
      if (larger.has(item)) result.add(item);
    }
    return result;
  }

  private matchesPattern(triple: Triple, pattern: TriplePattern): boolean {
    if (pattern.subject) {
      if (pattern.subject instanceof RegExp) {
        if (!pattern.subject.test(triple.subject)) return false;
      } else if (triple.subject !== pattern.subject) {
        return false;
      }
    }
    if (pattern.predicate && triple.predicate !== pattern.predicate)
      return false;
    if (pattern.object) {
      if (pattern.object instanceof RegExp) {
        if (!pattern.object.test(triple.object)) return false;
      } else if (triple.object !== pattern.object) {
        return false;
      }
    }
    return true;
  }

  private rebuildIndices(triples: Triple[]): void {
    this.triples = triples;
    this.subjectIndex.clear();
    this.predicateIndex.clear();
    this.objectIndex.clear();

    for (let i = 0; i < triples.length; i++) {
      const t = triples[i];
      this.addToIndex(this.subjectIndex, t.subject, i);
      this.addToIndex(this.predicateIndex, t.predicate, i);
      this.addToIndex(this.objectIndex, t.object, i);
    }
  }
}

/**
 * Convenience accessor
 */
export function getKnowledgeGraph(): KnowledgeGraph {
  return KnowledgeGraph.getInstance();
}
