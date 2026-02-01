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
   * Linear O(n) search fallback
   */
  private async searchSimilarLinear(queryEmbedding: number[], maxResults: number): Promise<Array<Memory & { similarity: number }>> {
    // Récupérer tous les souvenirs
    const context = memoryService.getContext();
    const allMemories = [...context.shortTerm, ...context.longTerm];

    // Scorer les souvenirs par similarité
    const scored = await Promise.all(
      allMemories.map(async (memory) => {
        const memoryEmbedding = await this.generateEmbedding(memory.content);
        const similarity = embeddingService.cosineSimilarity(queryEmbedding, memoryEmbedding);
        return { ...memory, similarity };
      })
    );

    // Filtrer par seuil de similarité et trier
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
      // Rechercher les souvenirs similaires
      const scoredMemories = await this.searchSimilar(query, limit);

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
}

// Exporter une instance singleton
export const ragService = new RAGServiceImpl();
