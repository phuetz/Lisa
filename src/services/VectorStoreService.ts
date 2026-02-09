/**
 * Vector Store Service - HNSW-based Vector Search
 *
 * Provides high-performance approximate nearest neighbor (ANN) search
 * using a pure JavaScript HNSW (Hierarchical Navigable Small World) implementation.
 *
 * Persistence via SQLite (DatabaseService) instead of IndexedDB.
 * HNSW graph logic stays in JS; nodes/config are serialized to SQL tables.
 */

import { databaseService } from './DatabaseService';

// ============================================================================
// Types
// ============================================================================

export interface VectorEntry {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

interface HNSWNode {
  id: string;
  vector: Float32Array;
  metadata: Record<string, unknown>;
  neighbors: Map<number, Set<number>>;
  level: number;
}

interface VectorStoreConfig {
  dimensions: number;
  M: number;
  efConstruction: number;
  efSearch: number;
  mL: number;
}

// ============================================================================
// HNSW Implementation
// ============================================================================

export class VectorStoreService {
  private nodes: Map<number, HNSWNode> = new Map();
  private idToIndex: Map<string, number> = new Map();
  private entryPoint: number | null = null;
  private maxLevel = 0;
  private nextIndex = 0;
  private config: VectorStoreConfig;
  private initialized = false;
  private dirty = false;

  constructor(dimensions: number = 1536, options?: Partial<VectorStoreConfig>) {
    this.config = {
      dimensions,
      M: options?.M ?? 16,
      efConstruction: options?.efConstruction ?? 200,
      efSearch: options?.efSearch ?? 50,
      mL: options?.mL ?? 1 / Math.log(options?.M ?? 16)
    };
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await databaseService.init();
      await this.loadFromDB();
      this.initialized = true;
      console.log(`[VectorStore] Initialized with ${this.nodes.size} vectors, ${this.config.dimensions} dims`);
    } catch (error) {
      console.warn('[VectorStore] SQLite init failed, using memory only:', error);
      this.initialized = true;
    }
  }

  private async loadFromDB(): Promise<void> {
    if (!databaseService.ready) return;

    try {
      // Load config
      const configRow = await databaseService.get<{
        entry_point: string | null; max_level: number; next_index: number;
      }>('SELECT * FROM vector_config WHERE key = ?', ['main']);

      if (configRow) {
        this.entryPoint = configRow.entry_point !== null ? parseInt(configRow.entry_point) : null;
        this.maxLevel = configRow.max_level;
        this.nextIndex = configRow.next_index;
      }

      // Load vectors
      const rows = await databaseService.all<{
        id: string; vector: string; metadata: string; level: number; neighbors: string;
      }>('SELECT * FROM vectors');

      for (const row of rows) {
        const vectorArr = JSON.parse(row.vector) as number[];
        const neighborsArr = JSON.parse(row.neighbors) as Array<[number, number[]]>;

        const node: HNSWNode = {
          id: row.id,
          vector: new Float32Array(vectorArr),
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
          neighbors: new Map(neighborsArr.map(([level, indices]) => [level, new Set(indices)])),
          level: row.level
        };

        const index = this.idToIndex.size;
        this.nodes.set(index, node);
        this.idToIndex.set(row.id, index);
      }
    } catch (error) {
      console.warn('[VectorStore] Failed to load from SQLite:', error);
    }
  }

  private async saveNode(index: number): Promise<void> {
    if (!databaseService.ready) return;

    const node = this.nodes.get(index);
    if (!node) return;

    try {
      const neighborsArr = Array.from(node.neighbors.entries()).map(
        ([level, set]) => [level, Array.from(set)]
      );

      await databaseService.run(
        'INSERT OR REPLACE INTO vectors (id, vector, metadata, level, neighbors) VALUES (?, ?, ?, ?, ?)',
        [
          node.id,
          JSON.stringify(Array.from(node.vector)),
          JSON.stringify(node.metadata),
          node.level,
          JSON.stringify(neighborsArr)
        ]
      );

      await databaseService.run(
        'INSERT OR REPLACE INTO vector_config (key, entry_point, max_level, next_index) VALUES (?, ?, ?, ?)',
        ['main', this.entryPoint !== null ? String(this.entryPoint) : null, this.maxLevel, this.nextIndex]
      );
    } catch (error) {
      console.warn('[VectorStore] Failed to save node:', error);
    }
  }

  // ==========================================================================
  // Core HNSW Operations
  // ==========================================================================

  async add(entry: VectorEntry): Promise<number> {
    if (!this.initialized) await this.initialize();

    if (this.idToIndex.has(entry.id)) {
      return this.idToIndex.get(entry.id)!;
    }

    const index = this.nextIndex++;
    const vector = new Float32Array(entry.vector);
    const level = this.randomLevel();

    const node: HNSWNode = {
      id: entry.id,
      vector,
      metadata: entry.metadata,
      neighbors: new Map(),
      level
    };

    for (let l = 0; l <= level; l++) {
      node.neighbors.set(l, new Set());
    }

    this.nodes.set(index, node);
    this.idToIndex.set(entry.id, index);

    if (this.entryPoint === null) {
      this.entryPoint = index;
      this.maxLevel = level;
    } else {
      await this.insertNode(index, vector, level);
    }

    await this.saveNode(index);

    return index;
  }

  async addBatch(entries: VectorEntry[]): Promise<number[]> {
    const indices: number[] = [];
    for (const entry of entries) {
      indices.push(await this.add(entry));
    }
    return indices;
  }

  search(queryVector: number[], k: number = 10): SearchResult[] {
    if (!this.initialized || this.entryPoint === null || this.nodes.size === 0) {
      return [];
    }

    const query = new Float32Array(queryVector);
    const results = this.searchKNN(query, k);

    return results.map(([index, distance]) => {
      const node = this.nodes.get(index)!;
      return {
        id: node.id,
        score: 1 - distance,
        metadata: node.metadata
      };
    });
  }

  async remove(id: string): Promise<boolean> {
    const index = this.idToIndex.get(id);
    if (index === undefined) return false;

    const node = this.nodes.get(index);
    if (!node) return false;

    for (const [level, neighbors] of node.neighbors) {
      for (const neighborIdx of neighbors) {
        const neighbor = this.nodes.get(neighborIdx);
        if (neighbor) {
          neighbor.neighbors.get(level)?.delete(index);
        }
      }
    }

    this.nodes.delete(index);
    this.idToIndex.delete(id);

    if (this.entryPoint === index) {
      this.entryPoint = this.nodes.size > 0 ? this.nodes.keys().next().value : null;
      if (this.entryPoint !== null) {
        this.maxLevel = this.nodes.get(this.entryPoint)!.level;
      } else {
        this.maxLevel = 0;
      }
    }

    if (databaseService.ready) {
      databaseService.run('DELETE FROM vectors WHERE id = ?', [id]).catch(() => {});
    }

    return true;
  }

  // ==========================================================================
  // HNSW Algorithm Implementation
  // ==========================================================================

  private randomLevel(): number {
    let level = 0;
    while (Math.random() < this.config.mL && level < 32) {
      level++;
    }
    return level;
  }

  private async insertNode(index: number, vector: Float32Array, level: number): Promise<void> {
    let currentNode = this.entryPoint!;
    let currentDist = this.distance(vector, this.nodes.get(currentNode)!.vector);

    for (let l = this.maxLevel; l > level; l--) {
      let changed = true;
      while (changed) {
        changed = false;
        const neighbors = this.nodes.get(currentNode)!.neighbors.get(l);
        if (neighbors) {
          for (const neighbor of neighbors) {
            const dist = this.distance(vector, this.nodes.get(neighbor)!.vector);
            if (dist < currentDist) {
              currentDist = dist;
              currentNode = neighbor;
              changed = true;
            }
          }
        }
      }
    }

    for (let l = Math.min(level, this.maxLevel); l >= 0; l--) {
      const candidates = this.searchLayer(vector, currentNode, this.config.efConstruction, l);
      const neighbors = this.selectNeighbors(vector, candidates, this.config.M);

      const node = this.nodes.get(index)!;
      for (const [neighborIdx] of neighbors) {
        node.neighbors.get(l)!.add(neighborIdx);

        const neighbor = this.nodes.get(neighborIdx)!;
        if (!neighbor.neighbors.has(l)) {
          neighbor.neighbors.set(l, new Set());
        }
        neighbor.neighbors.get(l)!.add(index);

        if (neighbor.neighbors.get(l)!.size > this.config.M) {
          this.trimConnections(neighborIdx, l);
        }
      }

      if (candidates.length > 0) {
        currentNode = candidates[0][0];
      }
    }

    if (level > this.maxLevel) {
      this.maxLevel = level;
      this.entryPoint = index;
    }
  }

  private searchLayer(
    query: Float32Array,
    entryPoint: number,
    ef: number,
    level: number
  ): Array<[number, number]> {
    const visited = new Set<number>([entryPoint]);
    const candidates: Array<[number, number]> = [[entryPoint, this.distance(query, this.nodes.get(entryPoint)!.vector)]];
    const results: Array<[number, number]> = [...candidates];

    while (candidates.length > 0) {
      candidates.sort((a, b) => a[1] - b[1]);
      const [currentIdx, currentDist] = candidates.shift()!;

      results.sort((a, b) => a[1] - b[1]);
      if (results.length >= ef && currentDist > results[ef - 1][1]) {
        break;
      }

      const neighbors = this.nodes.get(currentIdx)!.neighbors.get(level);
      if (neighbors) {
        for (const neighborIdx of neighbors) {
          if (!visited.has(neighborIdx)) {
            visited.add(neighborIdx);
            const neighborNode = this.nodes.get(neighborIdx);
            if (neighborNode) {
              const dist = this.distance(query, neighborNode.vector);

              if (results.length < ef || dist < results[results.length - 1][1]) {
                candidates.push([neighborIdx, dist]);
                results.push([neighborIdx, dist]);
                results.sort((a, b) => a[1] - b[1]);
                if (results.length > ef) {
                  results.pop();
                }
              }
            }
          }
        }
      }
    }

    return results;
  }

  private selectNeighbors(
    query: Float32Array,
    candidates: Array<[number, number]>,
    M: number
  ): Array<[number, number]> {
    candidates.sort((a, b) => a[1] - b[1]);
    return candidates.slice(0, M);
  }

  private trimConnections(nodeIdx: number, level: number): void {
    const node = this.nodes.get(nodeIdx)!;
    const neighbors = node.neighbors.get(level)!;

    if (neighbors.size <= this.config.M) return;

    const distances: Array<[number, number]> = [];
    for (const neighborIdx of neighbors) {
      const neighbor = this.nodes.get(neighborIdx);
      if (neighbor) {
        distances.push([neighborIdx, this.distance(node.vector, neighbor.vector)]);
      }
    }

    distances.sort((a, b) => a[1] - b[1]);
    const toKeep = new Set(distances.slice(0, this.config.M).map(d => d[0]));

    for (const neighborIdx of neighbors) {
      if (!toKeep.has(neighborIdx)) {
        neighbors.delete(neighborIdx);
      }
    }
  }

  private searchKNN(query: Float32Array, k: number): Array<[number, number]> {
    if (this.entryPoint === null) return [];

    let currentNode = this.entryPoint;
    let currentDist = this.distance(query, this.nodes.get(currentNode)!.vector);

    for (let l = this.maxLevel; l > 0; l--) {
      let changed = true;
      while (changed) {
        changed = false;
        const neighbors = this.nodes.get(currentNode)!.neighbors.get(l);
        if (neighbors) {
          for (const neighbor of neighbors) {
            const neighborNode = this.nodes.get(neighbor);
            if (neighborNode) {
              const dist = this.distance(query, neighborNode.vector);
              if (dist < currentDist) {
                currentDist = dist;
                currentNode = neighbor;
                changed = true;
              }
            }
          }
        }
      }
    }

    const ef = Math.max(k, this.config.efSearch);
    const results = this.searchLayer(query, currentNode, ef, 0);

    return results.slice(0, k);
  }

  // ==========================================================================
  // Distance Metrics
  // ==========================================================================

  private distance(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 1;

    const similarity = dotProduct / (normA * normB);
    return 1 - similarity;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  getStats(): { size: number; dimensions: number; maxLevel: number; entryPoint: string | null } {
    return {
      size: this.nodes.size,
      dimensions: this.config.dimensions,
      maxLevel: this.maxLevel,
      entryPoint: this.entryPoint !== null ? this.nodes.get(this.entryPoint)?.id || null : null
    };
  }

  has(id: string): boolean {
    return this.idToIndex.has(id);
  }

  get(id: string): VectorEntry | null {
    const index = this.idToIndex.get(id);
    if (index === undefined) return null;

    const node = this.nodes.get(index);
    if (!node) return null;

    return {
      id: node.id,
      vector: Array.from(node.vector),
      metadata: node.metadata
    };
  }

  async clear(): Promise<void> {
    this.nodes.clear();
    this.idToIndex.clear();
    this.entryPoint = null;
    this.maxLevel = 0;
    this.nextIndex = 0;

    if (databaseService.ready) {
      databaseService.run('DELETE FROM vectors').catch(() => {});
      databaseService.run('DELETE FROM vector_config').catch(() => {});
    }

    console.log('[VectorStore] Cleared');
  }

  export(): VectorEntry[] {
    const entries: VectorEntry[] = [];
    for (const node of this.nodes.values()) {
      entries.push({
        id: node.id,
        vector: Array.from(node.vector),
        metadata: node.metadata
      });
    }
    return entries;
  }

  async import(entries: VectorEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.add(entry);
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const vectorStore = new VectorStoreService();

export default vectorStore;
