/**
 * 🔍 RAG Service - Retrieval Augmented Generation
 * Augmente le contexte avec des souvenirs pertinents via embeddings
 *
 * Enhanced with HNSW vector index for O(log n) similarity search.
 * Falls back to linear search when vector index is not available.
 */

import type { Memory } from './MemoryService';
import { memoryService } from './MemoryService';
import { auditActions } from './AuditService';
import { embeddingService, type EmbeddingProvider } from './EmbeddingService';
import { vectorStore } from './VectorStoreService';

export interface Embedding {
  text: string;
  vector: number[];
  timestamp: string;
  model?: string;
}

export interface AugmentedContext {
  query: string;
  relevantMemories: Memory[];
  context: string;
  confidence: number;
  timestamp: string;
}

export interface RAGConfig {
  enabled: boolean;
  provider: EmbeddingProvider;
  similarityThreshold: number;
  maxResults: number;
  includeConversationHistory: boolean;
  /** Use HNSW vector index for fast search (default: true) */
  useVectorIndex: boolean;
}

const DEFAULT_RAG_CONFIG: RAGConfig = {
  enabled: true,
  provider: 'local',
  similarityThreshold: 0.5,
  maxResults: 5,
  includeConversationHistory: true,
  useVectorIndex: true
};

class RAGServiceImpl {
  private embeddings: Map<string, Embedding> = new Map();
  private config: RAGConfig = DEFAULT_RAG_CONFIG;
  private vectorIndexInitialized = false;
  private indexedMemoryIds: Set<string> = new Set();

  constructor() {
    this.loadEmbeddingsFromStorage();
    this.loadConfigFromStorage();
    this.initializeVectorIndex();

    // Auto-cleanup embeddings older than 30 days on startup
    const removed = this.cleanupOldEmbeddings(30);
    if (removed > 0) {
      console.log(`[RAG] Auto-cleaned ${removed} stale embeddings`);
    }
  }

  /**
   * Initialize the HNSW vector index
   */
  private async initializeVectorIndex(): Promise<void> {
    if (!this.config.useVectorIndex || this.vectorIndexInitialized) return;

    try {
      await vectorStore.initialize();
      this.vectorIndexInitialized = true;

      // Migrate existing embeddings to vector index
      await this.migrateEmbeddingsToVectorIndex();

      console.log('[RAG] Vector index initialized');
    } catch (error) {
      console.warn('[RAG] Vector index initialization failed, using linear search:', error);
      this.vectorIndexInitialized = false;
    }
  }

  /**
   * Migrate existing embeddings to the vector index
   */
  private async migrateEmbeddingsToVectorIndex(): Promise<void> {
    if (!this.vectorIndexInitialized) return;

    let migrated = 0;
    for (const [text, embedding] of this.embeddings) {
      const id = this.textToId(text);
      if (!this.indexedMemoryIds.has(id)) {
        try {
          await vectorStore.add({
            id,
            vector: embedding.vector,
            metadata: { text, timestamp: embedding.timestamp, model: embedding.model }
          });
          this.indexedMemoryIds.add(id);
          migrated++;
        } catch {
          // Skip individual failures
        }
      }
    }

    if (migrated > 0) {
      console.log(`[RAG] Migrated ${migrated} embeddings to vector index`);
    }
  }

  /**
   * Generate a stable ID from text
   */
  private textToId(text: string): string {
    // Simple hash for ID generation
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `emb-${Math.abs(hash).toString(36)}`;
  }

  /**
   * Update RAG configuration
   */
  updateConfig(config: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...config };

    // Update embedding service provider
    if (config.provider) {
      embeddingService.updateConfig({ provider: config.provider });
    }

    this.saveConfigToStorage();
  }

  /**
   * Get current configuration
   */
  getConfig(): RAGConfig {
    return { ...this.config };
  }

  /**
   * Check if RAG is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Générer un embedding pour un texte
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await embeddingService.generateEmbedding(text);

      // Sauvegarder l'embedding
      this.embeddings.set(text, {
        text,
        vector: result.vector,
        timestamp: new Date().toISOString(),
        model: result.model
      });

      // Also add to vector index
      if (this.config.useVectorIndex && this.vectorIndexInitialized) {
        const id = this.textToId(text);
        if (!this.indexedMemoryIds.has(id)) {
          try {
            await vectorStore.add({
              id,
              vector: result.vector,
              metadata: { text, timestamp: new Date().toISOString(), model: result.model }
            });
            this.indexedMemoryIds.add(id);
          } catch {
            // Non-critical, continue
          }
        }
      }

      this.saveEmbeddingsToStorage();
      return result.vector;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      auditActions.errorOccurred(`RAG embedding generation failed: ${errorMsg}`, { text });
      throw error;
    }
  }

  /**
   * Rechercher des souvenirs similaires
   * Uses HNSW vector index for O(log n) search when available,
   * falls back to linear O(n) search otherwise.
   */
  async searchSimilar(query: string, limit?: number): Promise<Array<Memory & { similarity: number }>> {
    if (!this.config.enabled) {
      return [];
    }

    const maxResults = limit || this.config.maxResults;

    try {
      // Générer l'embedding de la requête
      const queryEmbedding = await this.generateEmbedding(query);

      // Use HNSW vector index if available
      if (this.config.useVectorIndex && this.vectorIndexInitialized && vectorStore.getStats().size > 0) {
        return this.searchSimilarFast(queryEmbedding, maxResults);
      }

      // Fallback to linear search
      return this.searchSimilarLinear(queryEmbedding, maxResults);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      auditActions.errorOccurred(`RAG search failed: ${errorMsg}`, { query });
      return [];
    }
  }

  /**
   * Fast O(log n) search using HNSW vector index
   */
  private async searchSimilarFast(queryEmbedding: number[], maxResults: number): Promise<Array<Memory & { similarity: number }>> {
    const results = vectorStore.search(queryEmbedding, maxResults * 2); // Get extra for threshold filtering

    // Get all memories for ID lookup
    const context = memoryService.getContext();
    const allMemories = [...context.shortTerm, ...context.longTerm];
    const memoryMap = new Map(allMemories.map(m => [this.textToId(m.content), m]));

    // Map results back to memories
    const scored: Array<Memory & { similarity: number }> = [];

    for (const result of results) {
      // Try to find memory by ID
      let memory = memoryMap.get(result.id);

      // If not found by ID, try to find by text from metadata
      if (!memory && result.metadata.text) {
        memory = allMemories.find(m => m.content === result.metadata.text);
      }

      if (memory && result.score >= this.config.similarityThreshold) {
        scored.push({ ...memory, similarity: result.score });
      }
    }

    return scored.slice(0, maxResults);
  }

  /**
   * Linear O(n) search fallback — uses cached embeddings when available
   */
  private async searchSimilarLinear(queryEmbedding: number[], maxResults: number): Promise<Array<Memory & { similarity: number }>> {
    const context = memoryService.getContext();
    const allMemories = [...context.shortTerm, ...context.longTerm];

    // Separate memories with/without cached embeddings
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    for (let i = 0; i < allMemories.length; i++) {
      if (!this.embeddings.has(allMemories[i].content)) {
        uncachedTexts.push(allMemories[i].content);
        uncachedIndices.push(i);
      }
    }

    // Batch-generate missing embeddings
    if (uncachedTexts.length > 0) {
      const batchResults = await embeddingService.generateBatchEmbeddings(uncachedTexts);
      for (let j = 0; j < batchResults.length; j++) {
        const text = uncachedTexts[j];
        const timestamp = new Date().toISOString();
        this.embeddings.set(text, {
          text,
          vector: batchResults[j].vector,
          timestamp,
          model: batchResults[j].model
        });

        // Sync to HNSW vector index for fast search on next call
        if (this.config.useVectorIndex && this.vectorIndexInitialized) {
          const id = this.textToId(text);
          if (!this.indexedMemoryIds.has(id)) {
            try {
              await vectorStore.add({
                id,
                vector: batchResults[j].vector,
                metadata: { text, timestamp, model: batchResults[j].model }
              });
              this.indexedMemoryIds.add(id);
            } catch {
              // Non-critical, linear search still works
            }
          }
        }
      }
      this.saveEmbeddingsToStorage();
    }

    // Score all memories using cached embeddings
    const scored = allMemories.map((memory) => {
      const cached = this.embeddings.get(memory.content);
      const similarity = cached
        ? embeddingService.cosineSimilarity(queryEmbedding, cached.vector)
        : 0;
      return { ...memory, similarity };
    });

    return scored
      .filter(item => item.similarity >= this.config.similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  /**
   * Augmenter le contexte avec des souvenirs pertinents
   */
  async augmentContext(query: string, limit?: number): Promise<AugmentedContext> {
    if (!this.config.enabled) {
      return {
        query,
        relevantMemories: [],
        context: '',
        confidence: 0,
        timestamp: new Date().toISOString()
      };
    }

    try {
      // Recherche hybride (BM25 + vecteurs) pour un meilleur rappel
      const scoredMemories = await this.hybridSearch(query, { limit });

      // Convert to Memory[] (strip similarity for compatibility)
      const relevantMemories: Memory[] = scoredMemories.map(({ similarity: _similarity, ...memory }) => memory);

      // Construire le contexte augmenté avec scores de similarité
      const contextParts = scoredMemories.map((memory, index) => {
        const similarityPercent = Math.round(memory.similarity * 100);
        return `[${index + 1}] (${similarityPercent}% match) [${memory.type}] ${memory.content}`;
      });

      const context = contextParts.length > 0
        ? `Relevant context from memory:\n${contextParts.join('\n')}`
        : '';

      // Calculate confidence based on similarity scores
      const confidence = scoredMemories.length > 0
        ? Math.round(
            scoredMemories.reduce((sum, m) => sum + m.similarity, 0) /
            scoredMemories.length * 100
          )
        : 0;

      const result: AugmentedContext = {
        query,
        relevantMemories,
        context,
        confidence,
        timestamp: new Date().toISOString()
      };

      auditActions.toolExecuted('RAG_augmentContext', {
        query,
        memoriesFound: relevantMemories.length,
        confidence,
        provider: this.config.provider
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      auditActions.errorOccurred(`RAG augmentation failed: ${errorMsg}`, { query });

      return {
        query,
        relevantMemories: [],
        context: '',
        confidence: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Recherche hybride BM25 + vecteurs (inspiré OpenClaw)
   * Union-based: les résultats des deux méthodes contribuent au score final.
   */
  async hybridSearch(
    query: string,
    options: { limit?: number; vectorWeight?: number; textWeight?: number } = {}
  ): Promise<Array<Memory & { similarity: number }>> {
    const {
      limit = this.config.maxResults,
      vectorWeight = 0.7,
      textWeight = 0.3,
    } = options;

    if (!this.config.enabled) return [];

    try {
      // 1. Vector search (existant) — 4× candidates for better recall
      const vectorResults = await this.searchSimilar(query, limit * 4);

      // 2. BM25 keyword search — 4× candidates for better recall
      const keywordResults = this.bm25Search(query, limit * 4);

      // 3. Union et merge des scores
      const scoreMap = new Map<string, {
        memory: Memory;
        vectorScore: number;
        textScore: number;
      }>();

      for (const result of vectorResults) {
        scoreMap.set(result.id, {
          memory: result,
          vectorScore: result.similarity,
          textScore: 0,
        });
      }

      for (const { memory, score } of keywordResults) {
        const existing = scoreMap.get(memory.id);
        if (existing) {
          existing.textScore = score;
        } else {
          scoreMap.set(memory.id, {
            memory,
            vectorScore: 0,
            textScore: score,
          });
        }
      }

      // 4. Score hybride et tri
      return Array.from(scoreMap.values())
        .map(({ memory, vectorScore, textScore }) => ({
          ...memory,
          similarity: vectorWeight * vectorScore + textWeight * textScore,
        }))
        .filter(item => item.similarity >= this.config.similarityThreshold * 0.8)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.warn('[RAG] Hybrid search failed, falling back to vector-only:', error);
      return this.searchSimilar(query, limit);
    }
  }

  /**
   * BM25-like keyword scoring sur les mémoires en cache.
   * TF-IDF avec normalisation longueur document.
   */
  private bm25Search(query: string, limit: number): Array<{ memory: Memory; score: number }> {
    const context = memoryService.getContext();
    const allMemories = [...context.shortTerm, ...context.longTerm];
    if (allMemories.length === 0) return [];

    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (queryTerms.length === 0) return [];

    const k1 = 1.5;
    const b = 0.75;
    const N = allMemories.length;
    const avgDocLen = allMemories.reduce((sum, m) => sum + m.content.length, 0) / N;

    // IDF: nombre de docs contenant chaque terme
    const termDocCounts = new Map<string, number>();
    for (const term of queryTerms) {
      let count = 0;
      for (const memory of allMemories) {
        if (memory.content.toLowerCase().includes(term)) count++;
      }
      termDocCounts.set(term, count);
    }

    const scored = allMemories.map(memory => {
      const docLower = memory.content.toLowerCase();
      const docLen = memory.content.length;
      let score = 0;

      for (const term of queryTerms) {
        const tf = docLower.split(term).length - 1;
        if (tf === 0) continue;

        const df = termDocCounts.get(term) || 0;
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
        const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen)));
        score += idf * tfNorm;
      }

      return { memory, score };
    });

    const maxScore = Math.max(...scored.map(s => s.score), 0.001);

    return scored
      .map(s => ({ ...s, score: s.score / maxScore }))
      .filter(s => s.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Obtenir les embeddings stockés
   */
  getEmbeddings(): Embedding[] {
    return Array.from(this.embeddings.values());
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    const embeddings = Array.from(this.embeddings.values());
    const totalSize = embeddings.reduce(
      (sum, e) => sum + new Blob([JSON.stringify(e)]).size,
      0
    );

    const vectorStats = this.vectorIndexInitialized ? vectorStore.getStats() : null;

    return {
      totalEmbeddings: embeddings.length,
      embeddingDimension: embeddingService.getConfig().dimension ?? 384,
      totalSize,
      oldestEmbedding: embeddings.length > 0 ? embeddings[0].timestamp : '',
      newestEmbedding: embeddings.length > 0 ? embeddings[embeddings.length - 1].timestamp : '',
      vectorIndex: {
        enabled: this.config.useVectorIndex,
        initialized: this.vectorIndexInitialized,
        size: vectorStats?.size ?? 0,
        maxLevel: vectorStats?.maxLevel ?? 0
      }
    };
  }

  /**
   * Sauvegarder les embeddings dans localStorage
   */
  private saveEmbeddingsToStorage(): void {
    const embeddingsArray = Array.from(this.embeddings.values());
    localStorage.setItem('lisa:rag:embeddings', JSON.stringify(embeddingsArray));
  }

  /**
   * Charger les embeddings depuis localStorage
   */
  private loadEmbeddingsFromStorage(): void {
    try {
      const stored = localStorage.getItem('lisa:rag:embeddings');
      if (stored) {
        const embeddingsArray = JSON.parse(stored);
        embeddingsArray.forEach((emb: Embedding) => {
          this.embeddings.set(emb.text, emb);
        });
      }
    } catch (e) {
      console.error('Erreur chargement embeddings:', e);
    }
  }

  /**
   * Nettoyer les embeddings obsolètes
   */
  cleanupOldEmbeddings(daysOld: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const beforeCount = this.embeddings.size;

    for (const [key, embedding] of this.embeddings.entries()) {
      if (new Date(embedding.timestamp) < cutoffDate) {
        this.embeddings.delete(key);
      }
    }

    const removed = beforeCount - this.embeddings.size;
    this.saveEmbeddingsToStorage();

    return removed;
  }

  /**
   * Exporter les embeddings
   */
  exportEmbeddings() {
    return {
      exportDate: new Date().toISOString(),
      embeddings: Array.from(this.embeddings.values()),
      stats: this.getStats()
    };
  }

  /**
   * Importer les embeddings
   */
  importEmbeddings(data: ReturnType<typeof this.exportEmbeddings>): void {
    data.embeddings.forEach(emb => {
      this.embeddings.set(emb.text, emb);
    });
    this.saveEmbeddingsToStorage();
  }

  /**
   * Sauvegarder la configuration dans localStorage
   */
  private saveConfigToStorage(): void {
    try {
      localStorage.setItem('lisa:rag:config', JSON.stringify(this.config));
    } catch (e) {
      console.error('Erreur sauvegarde config RAG:', e);
    }
  }

  /**
   * Charger la configuration depuis localStorage
   */
  private loadConfigFromStorage(): void {
    try {
      const stored = localStorage.getItem('lisa:rag:config');
      if (stored) {
        const config = JSON.parse(stored);
        this.config = { ...DEFAULT_RAG_CONFIG, ...config };

        // Sync embedding service config
        embeddingService.updateConfig({ provider: this.config.provider });
      }
    } catch (e) {
      console.error('Erreur chargement config RAG:', e);
    }
  }

  /**
   * Set embedding provider API key
   */
  setApiKey(apiKey: string): void {
    embeddingService.updateConfig({ apiKey });
  }

  /**
   * Index a document by chunking its text and storing embeddings.
   * Each chunk is stored as a separate embedding for fine-grained retrieval.
   */
  async indexDocument(text: string, metadata: { filename: string; keywords?: string[] }): Promise<number> {
    if (!this.config.enabled || !text.trim()) return 0;

    const chunks = this.chunkText(text);
    let indexed = 0;

    for (const chunk of chunks) {
      try {
        await this.generateEmbedding(chunk);
        indexed++;
      } catch {
        // Skip individual chunk failures
      }
    }

    console.log(`[RAG] Indexed document "${metadata.filename}": ${indexed}/${chunks.length} chunks`);
    return indexed;
  }

  /**
   * Split text into overlapping chunks for embedding.
   * Uses ~1000 char chunks with ~200 char overlap, splitting on sentence boundaries.
   */
  private chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    if (text.length <= chunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      // Try to break at a sentence boundary
      if (end < text.length) {
        const lastSentenceEnd = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastSentenceEnd, lastNewline);
        if (breakPoint > start + chunkSize * 0.5) {
          end = breakPoint + 1;
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = end - overlap;
      if (start >= text.length) break;
    }

    return chunks.filter(c => c.length > 50); // Skip tiny fragments
  }
}

// Exporter une instance singleton
export const ragService = new RAGServiceImpl();
