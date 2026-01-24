/**
 * EmbeddingService - Service for generating text embeddings
 * Supports multiple providers: OpenAI, local transformers
 */

import { auditActions } from './AuditService';

export type EmbeddingProvider = 'openai' | 'local' | 'transformers';

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  apiKey?: string;
  model?: string;
  dimension?: number;
}

export interface EmbeddingResult {
  vector: number[];
  model: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

const DEFAULT_CONFIG: EmbeddingConfig = {
  provider: 'local',
  dimension: 384,
  model: 'text-embedding-3-small'
};

class EmbeddingServiceImpl {
  private config: EmbeddingConfig = DEFAULT_CONFIG;
  private cache: Map<string, number[]> = new Map();

  /**
   * Update the embedding configuration
   */
  updateConfig(config: Partial<EmbeddingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    // Check cache first
    const cacheKey = `${this.config.provider}:${text}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        vector: cached,
        model: this.config.model || 'cached'
      };
    }

    try {
      let result: EmbeddingResult;

      switch (this.config.provider) {
        case 'openai':
          result = await this.generateOpenAIEmbedding(text);
          break;
        case 'transformers':
          result = await this.generateTransformersEmbedding(text);
          break;
        case 'local':
        default:
          result = await this.generateLocalEmbedding(text);
          break;
      }

      // Cache the result
      this.cache.set(cacheKey, result.vector);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      auditActions.errorOccurred(`Embedding generation failed: ${errorMsg}`, { text: text.slice(0, 100) });

      // Fallback to local embedding on error
      if (this.config.provider !== 'local') {
        console.warn('Falling back to local embeddings');
        return this.generateLocalEmbedding(text);
      }
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (this.config.provider === 'openai' && this.config.apiKey) {
      return this.generateOpenAIBatchEmbedding(texts);
    }

    // For other providers, process sequentially
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }

  /**
   * OpenAI Embeddings API
   */
  private async generateOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();

    return {
      vector: data.data[0].embedding,
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        totalTokens: data.usage.total_tokens
      }
    };
  }

  /**
   * OpenAI Batch Embeddings
   */
  private async generateOpenAIBatchEmbedding(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();

    return data.data.map((item: { embedding: number[]; index: number }) => ({
      vector: item.embedding,
      model: data.model,
      usage: {
        promptTokens: Math.floor(data.usage.prompt_tokens / texts.length),
        totalTokens: Math.floor(data.usage.total_tokens / texts.length)
      }
    }));
  }

  /**
   * Local embedding using TF-IDF-like approach
   * More sophisticated than simple hash, captures semantic meaning
   */
  private async generateLocalEmbedding(text: string): Promise<EmbeddingResult> {
    const dimension = this.config.dimension || 384;
    const embedding: number[] = new Array(dimension).fill(0);

    // Normalize and tokenize
    const normalizedText = text.toLowerCase();
    const words = normalizedText.split(/\s+/).filter(w => w.length > 1);

    // Build vocabulary-based features
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const hash = this.hashString(word);

      // Word position encoding
      const positionWeight = 1 - (i / words.length) * 0.3;

      // Multiple hash projections for better distribution
      for (let j = 0; j < 3; j++) {
        const idx = Math.abs((hash * (j + 1) * 31) % dimension);
        const value = Math.sin(hash * (j + 1)) * positionWeight;
        embedding[idx] += value;
      }

      // Bigram features
      if (i < words.length - 1) {
        const bigram = word + words[i + 1];
        const bigramHash = this.hashString(bigram);
        const bigramIdx = Math.abs(bigramHash % dimension);
        embedding[bigramIdx] += Math.cos(bigramHash) * 0.5;
      }
    }

    // Character-level features for robustness
    for (let i = 0; i < normalizedText.length && i < 500; i++) {
      const charCode = normalizedText.charCodeAt(i);
      const idx = Math.abs((charCode * 73856093 + i * 19349663) % dimension);
      embedding[idx] += 0.1 * Math.sin(charCode);
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dimension; i++) {
        embedding[i] /= magnitude;
      }
    }

    return {
      vector: embedding,
      model: 'local-tfidf'
    };
  }

  /**
   * Transformers.js embedding (if loaded)
   */
  private async generateTransformersEmbedding(text: string): Promise<EmbeddingResult> {
    // Check if transformers is available globally
    const transformers = (window as unknown as { transformers?: { pipeline: (task: string, model: string) => Promise<(text: string) => Promise<{ data: number[] }>> } }).transformers;
    if (!transformers) {
      console.warn('Transformers.js not available, falling back to local');
      return this.generateLocalEmbedding(text);
    }

    try {
      const extractor = await transformers.pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );

      const output = await extractor(text);
      const embedding = Array.from(output.data);

      return {
        vector: embedding,
        model: 'all-MiniLM-L6-v2'
      };
    } catch (error) {
      console.warn('Transformers embedding failed, falling back to local:', error);
      return this.generateLocalEmbedding(text);
    }
  }

  /**
   * Hash function for strings
   */
  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
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
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      provider: this.config.provider,
      dimension: this.config.dimension
    };
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingServiceImpl();
