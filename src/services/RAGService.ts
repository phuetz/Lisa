/**
 * 🔍 RAG Service - Retrieval Augmented Generation
 * Augmente le contexte avec des souvenirs pertinents via embeddings
 */

import type { Memory } from './MemoryService';
import { memoryService } from './MemoryService';
import { auditActions } from './AuditService';
import { embeddingService, type EmbeddingProvider } from './EmbeddingService';

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
}

const DEFAULT_RAG_CONFIG: RAGConfig = {
  enabled: true,
  provider: 'local',
  similarityThreshold: 0.5,
  maxResults: 5,
  includeConversationHistory: true
};

class RAGServiceImpl {
  private embeddings: Map<string, Embedding> = new Map();
  private config: RAGConfig = DEFAULT_RAG_CONFIG;

  constructor() {
    this.loadEmbeddingsFromStorage();
    this.loadConfigFromStorage();
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
   */
  async searchSimilar(query: string, limit?: number): Promise<Array<Memory & { similarity: number }>> {
    if (!this.config.enabled) {
      return [];
    }

    const maxResults = limit || this.config.maxResults;

    try {
      // Générer l'embedding de la requête
      const queryEmbedding = await this.generateEmbedding(query);

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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      auditActions.errorOccurred(`RAG search failed: ${errorMsg}`, { query });
      return [];
    }
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

    return {
      totalEmbeddings: embeddings.length,
      embeddingDimension: this.embeddingDimension,
      totalSize,
      oldestEmbedding: embeddings.length > 0 ? embeddings[0].timestamp : '',
      newestEmbedding: embeddings.length > 0 ? embeddings[embeddings.length - 1].timestamp : ''
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
