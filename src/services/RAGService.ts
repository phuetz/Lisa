/**
 * 🔍 RAG Service - Retrieval Augmented Generation
 * Augmente le contexte avec des souvenirs pertinents via embeddings
 */

import type { Memory } from './MemoryService';
import { memoryService } from './MemoryService';
import { auditActions } from './AuditService';

export interface Embedding {
  text: string;
  vector: number[];
  timestamp: string;
}

export interface AugmentedContext {
  query: string;
  relevantMemories: Memory[];
  context: string;
  confidence: number;
  timestamp: string;
}

class RAGServiceImpl {
  private embeddings: Map<string, Embedding> = new Map();
  private embeddingDimension = 384; // Dimension standard pour les embeddings

  constructor() {
    this.loadEmbeddingsFromStorage();
  }

  /**
   * Générer un embedding pour un texte
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Utiliser une approche simple basée sur le hash pour la démo
      // En production, utiliser une vraie API d'embeddings (OpenAI, Hugging Face, etc.)
      const embedding = this.simpleEmbedding(text);
      
      // Sauvegarder l'embedding
      this.embeddings.set(text, {
        text,
        vector: embedding,
        timestamp: new Date().toISOString()
      });

      this.saveEmbeddingsToStorage();
      return embedding;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      auditActions.errorOccurred(`RAG embedding generation failed: ${errorMsg}`, { text });
      throw error;
    }
  }

  /**
   * Embedding simple basé sur le hash (pour la démo)
   * En production, utiliser une vraie API d'embeddings
   */
  private simpleEmbedding(text: string): number[] {
    const embedding: number[] = [];
    
    // Créer un vecteur basé sur les caractéristiques du texte
    const hash = this.hashCode(text);
    
    for (let i = 0; i < this.embeddingDimension; i++) {
      // Générer des valeurs pseudo-aléatoires basées sur le hash
      const seed = (hash + i * 73856093) ^ (i * 19349663);
      const value = Math.sin(seed) * 0.5 + 0.5; // Normaliser entre 0 et 1
      embedding.push(value);
    }

    return embedding;
  }

  /**
   * Fonction de hash simple
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir en 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Calculer la similarité cosinus entre deux vecteurs
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Rechercher des souvenirs similaires
   */
  async searchSimilar(query: string, limit: number = 5): Promise<Memory[]> {
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
          const similarity = this.cosineSimilarity(queryEmbedding, memoryEmbedding);
          return { memory, similarity };
        })
      );

      // Trier par similarité et retourner les top N
      return scored
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.memory);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      auditActions.errorOccurred(`RAG search failed: ${errorMsg}`, { query });
      return [];
    }
  }

  /**
   * Augmenter le contexte avec des souvenirs pertinents
   */
  async augmentContext(query: string, limit: number = 5): Promise<AugmentedContext> {
    try {
      // Rechercher les souvenirs similaires
      const relevantMemories = await this.searchSimilar(query, limit);

      // Construire le contexte augmenté
      const contextParts = relevantMemories.map(memory => {
        const relevanceIndicator = '█'.repeat(Math.ceil(memory.relevance / 10));
        return `[${memory.type}] ${memory.content} (${relevanceIndicator})`;
      });

      const context = contextParts.join('\n');
      const confidence = relevantMemories.length > 0
        ? Math.round(
            relevantMemories.reduce((sum, m) => sum + m.relevance, 0) / 
            (relevantMemories.length * 100) * 100
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
        confidence
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
}

// Exporter une instance singleton
export const ragService = new RAGServiceImpl();
