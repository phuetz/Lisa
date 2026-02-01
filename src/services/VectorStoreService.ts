/**
 * Vector Store Service - HNSW-based Vector Search
 *
 * Provides high-performance approximate nearest neighbor (ANN) search
 * using a pure JavaScript HNSW (Hierarchical Navigable Small World) implementation.
 *
 * Features:
 * - O(log n) search complexity vs O(n) linear search
 * - Cosine similarity metric
 * - IndexedDB persistence
 * - Memory-efficient with typed arrays
 *
 * Based on the HNSW algorithm paper:
 * "Efficient and robust approximate nearest neighbor search using HNSW graphs"
 */

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

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
  neighbors: Map<number, Set<number>>; // level -> neighbor indices
  level: number;
}

interface VectorStoreConfig {
  dimensions: number;
  M: number; // Max connections per layer
  efConstruction: number; // Size of dynamic candidate list during construction
  efSearch: number; // Size of dynamic candidate list during search
  mL: number; // Level multiplier (1/ln(M))
}

// ============================================================================
// IndexedDB Schema
// ============================================================================

interface VectorStoreDB extends DBSchema {
  vectors: {
    key: string;
    value: {
      id: string;
      vector: number[];
      metadata: Record<string, unknown>;
      neighbors: Array<[number, number[]]>; // Serialized Map
      level: number;
    };
    indexes: {
      'by-level': number;
    };
  };
  config: {
    key: string;
    value: {
      entryPoint: number | null;
      maxLevel: number;
      nextIndex: number;
    };
  };
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
  private db: IDBPDatabase<VectorStoreDB> | null = null;
  private initialized = false;

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

  /**
   * Initialize the vector store
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.db = await openDB<VectorStoreDB>('lisa-vector-store', 1, {
        upgrade(db) {
          const vectorStore = db.createObjectStore('vectors', { keyPath: 'id' });
          vectorStore.createIndex('by-level', 'level');
          db.createObjectStore('config', { keyPath: 'key' });
        }
      });

      // Load existing data
      await this.loadFromDB();
      this.initialized = true;
      console.log(`[VectorStore] Initialized with ${this.nodes.size} vectors, ${this.config.dimensions} dims`);
    } catch (error) {
      console.warn('[VectorStore] IndexedDB init failed, using memory only:', error);
      this.initialized = true;
    }
  }

  private async loadFromDB(): Promise<void> {
    if (!this.db) return;

    try {
      // Load config
      const config = await this.db.get('config', 'main');
      if (config) {
        this.entryPoint = config.entryPoint;
        this.maxLevel = config.maxLevel;
        this.nextIndex = config.nextIndex;
      }

      // Load vectors
      const allVectors = await this.db.getAll('vectors');
      for (const stored of allVectors) {
        const node: HNSWNode = {
          id: stored.id,
          vector: new Float32Array(stored.vector),
          metadata: stored.metadata,
          neighbors: new Map(stored.neighbors.map(([level, indices]) => [level, new Set(indices)])),
          level: stored.level
        };

        const index = this.idToIndex.size;
        this.nodes.set(index, node);
        this.idToIndex.set(stored.id, index);
      }
    } catch (error) {
      console.warn('[VectorStore] Failed to load from IndexedDB:', error);
    }
  }

  private async saveNode(index: number): Promise<void> {
    if (!this.db) return;

    const node = this.nodes.get(index);
    if (!node) return;

    try {
      await this.db.put('vectors', {
        id: node.id,
        vector: Array.from(node.vector),
        metadata: node.metadata,
        neighbors: Array.from(node.neighbors.entries()).map(([level, set]) => [level, Array.from(set)]),
        level: node.level
      });

      await this.db.put('config', {
        key: 'main',
        entryPoint: this.entryPoint,
        maxLevel: this.maxLevel,
        nextIndex: this.nextIndex
      });
    } catch (error) {
      console.warn('[VectorStore] Failed to save node:', error);
    }
  }

  // ==========================================================================
  // Core HNSW Operations
  // ==========================================================================

  /**
   * Add a vector to the index
   */
  async add(entry: VectorEntry): Promise<number> {
    if (!this.initialized) await this.initialize();

    // Check if ID already exists
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

    // Initialize neighbor sets for each level
    for (let l = 0; l <= level; l++) {
      node.neighbors.set(l, new Set());
    }

    this.nodes.set(index, node);
    this.idToIndex.set(entry.id, index);

    // Insert into graph
    if (this.entryPoint === null) {
      this.entryPoint = index;
      this.maxLevel = level;
    } else {
      await this.insertNode(index, vector, level);
    }

    // Persist
    await this.saveNode(index);

    return index;
  }

  /**
   * Add multiple vectors (batch)
   */
  async addBatch(entries: VectorEntry[]): Promise<number[]> {
    const indices: number[] = [];
    for (const entry of entries) {
      indices.push(await this.add(entry));
    }
    return indices;
  }

  /**
   * Search for similar vectors
   */
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
        score: 1 - distance, // Convert distance to similarity
        metadata: node.metadata
      };
    });
  }

  /**
   * Remove a vector by ID
   */
  async remove(id: string): Promise<boolean> {
    const index = this.idToIndex.get(id);
    if (index === undefined) return false;

    const node = this.nodes.get(index);
    if (!node) return false;

    // Remove from neighbors' lists
    for (const [level, neighbors] of node.neighbors) {
      for (const neighborIdx of neighbors) {
        const neighbor = this.nodes.get(neighborIdx);
        if (neighbor) {
          neighbor.neighbors.get(level)?.delete(index);
        }
      }
    }

    // Remove node
    this.nodes.delete(index);
    this.idToIndex.delete(id);

    // Update entry point if needed
    if (this.entryPoint === index) {
      this.entryPoint = this.nodes.size > 0 ? this.nodes.keys().next().value : null;
      if (this.entryPoint !== null) {
        this.maxLevel = this.nodes.get(this.entryPoint)!.level;
      } else {
        this.maxLevel = 0;
      }
    }

    // Remove from DB
    if (this.db) {
      try {
        await this.db.delete('vectors', id);
      } catch {
        // Ignore
      }
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

    // Search from top to level+1
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

    // Insert at each level
    for (let l = Math.min(level, this.maxLevel); l >= 0; l--) {
      const candidates = this.searchLayer(vector, currentNode, this.config.efConstruction, l);
      const neighbors = this.selectNeighbors(vector, candidates, this.config.M);

      // Add neighbors
      const node = this.nodes.get(index)!;
      for (const [neighborIdx] of neighbors) {
        node.neighbors.get(l)!.add(neighborIdx);

        // Add reverse connection
        const neighbor = this.nodes.get(neighborIdx)!;
        if (!neighbor.neighbors.has(l)) {
          neighbor.neighbors.set(l, new Set());
        }
        neighbor.neighbors.get(l)!.add(index);

        // Trim if needed
        if (neighbor.neighbors.get(l)!.size > this.config.M) {
          this.trimConnections(neighborIdx, l);
        }
      }

      if (candidates.length > 0) {
        currentNode = candidates[0][0];
      }
    }

    // Update max level if needed
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
      // Get closest candidate
      candidates.sort((a, b) => a[1] - b[1]);
      const [currentIdx, currentDist] = candidates.shift()!;

      // Check if we should stop
      results.sort((a, b) => a[1] - b[1]);
      if (results.length >= ef && currentDist > results[ef - 1][1]) {
        break;
      }

      // Explore neighbors
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
    // Simple selection: take M closest
    candidates.sort((a, b) => a[1] - b[1]);
    return candidates.slice(0, M);
  }

  private trimConnections(nodeIdx: number, level: number): void {
    const node = this.nodes.get(nodeIdx)!;
    const neighbors = node.neighbors.get(level)!;

    if (neighbors.size <= this.config.M) return;

    // Calculate distances and keep M closest
    const distances: Array<[number, number]> = [];
    for (const neighborIdx of neighbors) {
      const neighbor = this.nodes.get(neighborIdx);
      if (neighbor) {
        distances.push([neighborIdx, this.distance(node.vector, neighbor.vector)]);
      }
    }

    distances.sort((a, b) => a[1] - b[1]);
    const toKeep = new Set(distances.slice(0, this.config.M).map(d => d[0]));

    // Remove excess connections
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

    // Search from top to level 1
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

    // Search at level 0 with ef = max(k, efSearch)
    const ef = Math.max(k, this.config.efSearch);
    const results = this.searchLayer(query, currentNode, ef, 0);

    return results.slice(0, k);
  }

  // ==========================================================================
  // Distance Metrics
  // ==========================================================================

  /**
   * Cosine distance (1 - cosine similarity)
   */
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
    return 1 - similarity; // Convert to distance
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get index statistics
   */
  getStats(): { size: number; dimensions: number; maxLevel: number; entryPoint: string | null } {
    return {
      size: this.nodes.size,
      dimensions: this.config.dimensions,
      maxLevel: this.maxLevel,
      entryPoint: this.entryPoint !== null ? this.nodes.get(this.entryPoint)?.id || null : null
    };
  }

  /**
   * Check if ID exists
   */
  has(id: string): boolean {
    return this.idToIndex.has(id);
  }

  /**
   * Get vector by ID
   */
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

  /**
   * Clear all vectors
   */
  async clear(): Promise<void> {
    this.nodes.clear();
    this.idToIndex.clear();
    this.entryPoint = null;
    this.maxLevel = 0;
    this.nextIndex = 0;

    if (this.db) {
      try {
        await this.db.clear('vectors');
        await this.db.clear('config');
      } catch {
        // Ignore
      }
    }

    console.log('[VectorStore] Cleared');
  }

  /**
   * Export all vectors
   */
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

  /**
   * Import vectors
   */
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
