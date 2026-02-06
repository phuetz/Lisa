/**
 * MemoryManager - Unified memory management for Lisa AI
 *
 * Provides a single interface for:
 * - Short-term memory (conversation context)
 * - Long-term memory (persistent storage)
 * - Semantic memory (RAG with embeddings)
 *
 * @example
 * ```typescript
 * const manager = MemoryManager.getInstance();
 *
 * // Store a memory
 * await manager.remember('fact', 'User prefers dark mode', {
 *   tags: ['preference', 'ui'],
 *   source: 'settings'
 * });
 *
 * // Recall memories
 * const memories = await manager.recall({ type: 'fact', limit: 10 });
 *
 * // Semantic search
 * const relevant = await manager.search('user preferences', { threshold: 0.7 });
 * ```
 */

import type {
  Memory,
  MemoryType,
  MemoryTier,
  MemoryQuery,
  MemorySearchResult,
  MemoryStats,
  MemoryConfig,
  MemoryMetadata,
  SemanticQuery,
  SemanticResult,
  ForgetCriteria,
  ForgetResult,
  AugmentedContext,
} from './types';

/* ---------- Default Configuration ---------- */

const DEFAULT_CONFIG: MemoryConfig = {
  shortTerm: {
    maxEntries: 100,
    promotionThreshold: 50,
    ttlMs: 30 * 60 * 1000, // 30 minutes
  },
  longTerm: {
    maxEntries: 1000,
    pruneOlderThanDays: 90,
    pruneMinAccessCount: 2,
  },
  semantic: {
    enabled: true,
    provider: 'local',
    similarityThreshold: 0.5,
    maxResults: 5,
    useVectorIndex: true,
  },
};

/* ---------- MemoryManager Class ---------- */

export class MemoryManager {
  private static instance: MemoryManager | null = null;

  private shortTermMemory: Memory[] = [];
  private longTermMemory: Memory[] = [];
  private config: MemoryConfig;
  private initialized = false;

  // Lazy-loaded services
  private memoryService: typeof import('../../services/MemoryService').memoryService | null = null;
  private longTermService: typeof import('../../services/LongTermMemoryService').longTermMemoryService | null = null;
  private ragService: typeof import('../../services/RAGService').ragService | null = null;

  private constructor() {
    this.config = DEFAULT_CONFIG;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    MemoryManager.instance = null;
  }

  /* ---------- Initialization ---------- */

  /**
   * Initialize memory systems
   */
  async initialize(config?: Partial<MemoryConfig>): Promise<void> {
    if (this.initialized) return;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log('[MemoryManager] Initializing memory systems...');

    try {
      // Load services lazily
      const [memModule, ltmModule, ragModule] = await Promise.all([
        import('../../services/MemoryService'),
        import('../../services/LongTermMemoryService'),
        import('../../services/RAGService'),
      ]);

      this.memoryService = memModule.memoryService;
      this.longTermService = ltmModule.longTermMemoryService;
      this.ragService = ragModule.ragService;

      // Initialize long-term memory
      await this.longTermService.init();

      this.initialized = true;
      console.log('[MemoryManager] Memory systems initialized');
    } catch (error) {
      console.error('[MemoryManager] Initialization failed:', error);
      throw error;
    }
  }

  /* ---------- Core Operations ---------- */

  /**
   * Store a new memory
   */
  async remember(
    type: MemoryType,
    content: string,
    options: {
      source?: string;
      tags?: string[];
      metadata?: MemoryMetadata;
      tier?: MemoryTier;
    } = {}
  ): Promise<Memory> {
    await this.ensureInitialized();

    const memory: Memory = {
      id: this.generateId(),
      type,
      content,
      source: options.source || 'user',
      timestamp: new Date().toISOString(),
      relevance: this.calculateRelevance(type, content),
      tags: options.tags || [],
      metadata: options.metadata,
    };

    const tier = options.tier || 'short';

    if (tier === 'short' && this.memoryService) {
      this.memoryService.createMemory(type, content, memory.source, memory.tags, memory.metadata);
    } else if (tier === 'long' && this.longTermService) {
      await this.longTermService.remember(type as 'fact' | 'preference' | 'context' | 'instruction', content, content, {
        importance: (memory.relevance || 50) / 100,
        tags: memory.tags,
      });
    }

    // Add to local cache
    if (tier === 'short') {
      this.shortTermMemory.push(memory);
      this.pruneShortTerm();
    } else {
      this.longTermMemory.push(memory);
    }

    return memory;
  }

  /**
   * Recall memories matching query
   */
  async recall(query: MemoryQuery): Promise<MemorySearchResult> {
    await this.ensureInitialized();
    const startTime = Date.now();

    let memories: Memory[] = [];

    // Search short-term
    memories.push(...this.searchLocal(this.shortTermMemory, query));

    // Search long-term
    memories.push(...this.searchLocal(this.longTermMemory, query));

    // Apply limit and offset
    const total = memories.length;
    if (query.offset) {
      memories = memories.slice(query.offset);
    }
    if (query.limit) {
      memories = memories.slice(0, query.limit);
    }

    return {
      memories,
      total,
      query,
      searchTime: Date.now() - startTime,
    };
  }

  /**
   * Semantic search using embeddings
   */
  async search(text: string, options: Partial<SemanticQuery> = {}): Promise<SemanticResult[]> {
    await this.ensureInitialized();

    if (!this.ragService || !this.config.semantic.enabled) {
      // Fallback to keyword search
      const result = await this.recall({ text, limit: options.maxResults || 5 });
      return result.memories.map(m => ({ memory: m, score: m.relevance / 100 }));
    }

    const threshold = options.threshold || this.config.semantic.similarityThreshold;
    const maxResults = options.maxResults || this.config.semantic.maxResults;

    const augmented = await this.ragService.augmentContext(text);

    return augmented.relevantMemories
      .slice(0, maxResults)
      .map(m => ({
        memory: m,
        score: m.relevance / 100,
      }))
      .filter(r => r.score >= threshold);
  }

  /**
   * Get augmented context for RAG
   */
  async augment(query: string): Promise<AugmentedContext> {
    await this.ensureInitialized();

    if (!this.ragService || !this.config.semantic.enabled) {
      const result = await this.recall({ text: query, limit: 5 });
      return {
        query,
        relevantMemories: result.memories,
        context: result.memories.map(m => m.content).join('\n'),
        confidence: result.memories.length > 0 ? 0.5 : 0,
        timestamp: new Date().toISOString(),
      };
    }

    return this.ragService.augmentContext(query);
  }

  /**
   * Forget memories matching criteria
   */
  async forget(criteria: ForgetCriteria): Promise<ForgetResult> {
    await this.ensureInitialized();

    let deletedCount = 0;

    // Filter short-term
    const shortBefore = this.shortTermMemory.length;
    this.shortTermMemory = this.shortTermMemory.filter(m => !this.matchesCriteria(m, criteria));
    deletedCount += shortBefore - this.shortTermMemory.length;

    // Filter long-term
    const longBefore = this.longTermMemory.length;
    this.longTermMemory = this.longTermMemory.filter(m => !this.matchesCriteria(m, criteria));
    deletedCount += longBefore - this.longTermMemory.length;

    return {
      deletedCount,
      criteria,
    };
  }

  /* ---------- Stats ---------- */

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    const allMemories = [...this.shortTermMemory, ...this.longTermMemory];

    const byType: Record<MemoryType, number> = {
      conversation: 0,
      document: 0,
      fact: 0,
      preference: 0,
      context: 0,
      instruction: 0,
    };

    for (const m of allMemories) {
      byType[m.type] = (byType[m.type] || 0) + 1;
    }

    const timestamps = allMemories.map(m => m.timestamp).sort();

    return {
      totalMemories: allMemories.length,
      byType,
      byTier: {
        short: this.shortTermMemory.length,
        long: this.longTermMemory.length,
        semantic: 0, // Would need RAG service to count
      },
      averageRelevance:
        allMemories.length > 0
          ? allMemories.reduce((sum, m) => sum + m.relevance, 0) / allMemories.length
          : 0,
      oldestMemory: timestamps[0] || null,
      newestMemory: timestamps[timestamps.length - 1] || null,
      totalSize: JSON.stringify(allMemories).length,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  /* ---------- Private Helpers ---------- */

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateRelevance(type: MemoryType, content: string): number {
    // Base relevance by type
    const typeRelevance: Record<MemoryType, number> = {
      preference: 80,
      fact: 70,
      instruction: 90,
      context: 60,
      conversation: 50,
      document: 40,
    };

    let relevance = typeRelevance[type] || 50;

    // Adjust by content length (longer = more specific = more relevant)
    if (content.length > 200) relevance += 10;
    if (content.length > 500) relevance += 5;

    return Math.min(100, Math.max(0, relevance));
  }

  private searchLocal(memories: Memory[], query: MemoryQuery): Memory[] {
    return memories.filter(m => {
      // Type filter
      if (query.type) {
        const types = Array.isArray(query.type) ? query.type : [query.type];
        if (!types.includes(m.type)) return false;
      }

      // Tags filter
      if (query.tags && query.tags.length > 0) {
        if (!query.tags.some(t => m.tags.includes(t))) return false;
      }

      // Relevance filter
      if (query.minRelevance && m.relevance < query.minRelevance) return false;

      // Source filter
      if (query.source && m.source !== query.source) return false;

      // Date filters
      if (query.since && m.timestamp < query.since) return false;
      if (query.until && m.timestamp > query.until) return false;

      // Text search (simple contains)
      if (query.text) {
        const searchText = query.text.toLowerCase();
        if (!m.content.toLowerCase().includes(searchText)) return false;
      }

      return true;
    });
  }

  private matchesCriteria(memory: Memory, criteria: ForgetCriteria): boolean {
    if (criteria.olderThan && memory.timestamp >= criteria.olderThan) return false;
    if (criteria.type && memory.type !== criteria.type) return false;
    if (criteria.source && memory.source !== criteria.source) return false;
    if (criteria.belowRelevance && memory.relevance >= criteria.belowRelevance) return false;
    if (criteria.tags && criteria.tags.length > 0) {
      if (!criteria.tags.some(t => memory.tags.includes(t))) return false;
    }
    return true;
  }

  private pruneShortTerm(): void {
    const max = this.config.shortTerm.maxEntries;
    while (this.shortTermMemory.length > max) {
      const removed = this.shortTermMemory.shift();
      if (removed && removed.relevance >= this.config.shortTerm.promotionThreshold) {
        this.longTermMemory.push(removed);
      }
    }
  }
}

/* ---------- Singleton Export ---------- */

export const memoryManager = MemoryManager.getInstance();
