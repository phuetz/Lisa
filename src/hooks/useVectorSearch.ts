/**
 * useVectorSearch Hook - React Hook for Vector Similarity Search
 *
 * Provides a React-friendly interface for semantic search using the VectorStoreService.
 * Handles embedding generation, search execution, and result management.
 *
 * Features:
 * - Async search with loading states
 * - Debounced search for real-time input
 * - Search history tracking
 * - Error handling and recovery
 * - Vector store statistics
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { vectorStore, type SearchResult } from '../services/VectorStoreService';
import { embeddingService } from '../services/EmbeddingService';

// ============================================================================
// Types
// ============================================================================

export interface VectorSearchState {
  /** Search results */
  results: SearchResult[];
  /** Whether search is in progress */
  isSearching: boolean;
  /** Error message if search failed */
  error: string | null;
  /** Last successful query */
  lastQuery: string | null;
  /** Search history */
  history: Array<{ query: string; results: SearchResult[]; timestamp: number }>;
}

export interface VectorSearchOptions {
  /** Number of results to return (default: 10) */
  k?: number;
  /** Minimum similarity score (0-1, default: 0) */
  minScore?: number;
  /** Debounce delay in ms for real-time search (default: 300) */
  debounceMs?: number;
  /** Maximum history entries to keep (default: 10) */
  maxHistory?: number;
  /** Auto-initialize vector store (default: true) */
  autoInitialize?: boolean;
}

export interface UseVectorSearchReturn {
  /** Execute a search query */
  search: (query: string) => Promise<SearchResult[]>;
  /** Execute a search with debouncing (for real-time input) */
  searchDebounced: (query: string) => void;
  /** Clear search results and error */
  clear: () => void;
  /** Clear search history */
  clearHistory: () => void;
  /** Current search results */
  results: SearchResult[];
  /** Whether search is in progress */
  isSearching: boolean;
  /** Error message if any */
  error: string | null;
  /** Last successful query */
  lastQuery: string | null;
  /** Search history */
  history: VectorSearchState['history'];
  /** Vector store statistics */
  stats: { size: number; dimensions: number; maxLevel: number };
  /** Whether vector store is initialized */
  isReady: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVectorSearch(options: VectorSearchOptions = {}): UseVectorSearchReturn {
  const {
    k = 10,
    minScore = 0,
    debounceMs = 300,
    maxHistory = 10,
    autoInitialize = true
  } = options;

  const [state, setState] = useState<VectorSearchState>({
    results: [],
    isSearching: false,
    error: null,
    lastQuery: null,
    history: []
  });

  const [isReady, setIsReady] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // Initialize vector store
  useEffect(() => {
    if (autoInitialize) {
      vectorStore.initialize()
        .then(() => setIsReady(true))
        .catch(err => {
          console.error('[useVectorSearch] Initialization failed:', err);
          setState(prev => ({ ...prev, error: 'Vector store initialization failed' }));
        });
    }
  }, [autoInitialize]);

  /**
   * Execute a search query
   */
  const search = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, results: [], error: null }));
      return [];
    }

    // Cancel any pending search
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setState(prev => ({ ...prev, isSearching: true, error: null }));

    try {
      // Generate embedding for query
      const embedding = await embeddingService.generateEmbedding(query);

      if (!embedding) {
        throw new Error('Failed to generate embedding for query');
      }

      // Check if aborted
      if (abortController.current?.signal.aborted) {
        return [];
      }

      // Execute search
      let results = vectorStore.search(embedding, k);

      // Filter by minimum score
      if (minScore > 0) {
        results = results.filter(r => r.score >= minScore);
      }

      // Update state
      setState(prev => {
        const newHistory = [
          { query, results, timestamp: Date.now() },
          ...prev.history.slice(0, maxHistory - 1)
        ];

        return {
          ...prev,
          results,
          isSearching: false,
          lastQuery: query,
          history: newHistory
        };
      });

      return results;
    } catch (err) {
      // Don't report aborted errors
      if (err instanceof Error && err.name === 'AbortError') {
        return [];
      }

      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      console.error('[useVectorSearch] Search error:', err);

      setState(prev => ({
        ...prev,
        isSearching: false,
        error: errorMessage,
        results: []
      }));

      return [];
    }
  }, [k, minScore, maxHistory]);

  /**
   * Execute a debounced search (for real-time input)
   */
  const searchDebounced = useCallback((query: string) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      search(query);
    }, debounceMs);
  }, [search, debounceMs]);

  /**
   * Clear search results and error
   */
  const clear = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (abortController.current) {
      abortController.current.abort();
    }

    setState(prev => ({
      ...prev,
      results: [],
      error: null,
      isSearching: false
    }));
  }, []);

  /**
   * Clear search history
   */
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return {
    search,
    searchDebounced,
    clear,
    clearHistory,
    results: state.results,
    isSearching: state.isSearching,
    error: state.error,
    lastQuery: state.lastQuery,
    history: state.history,
    stats: vectorStore.getStats(),
    isReady
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook for adding vectors to the store
 */
export function useVectorIndex() {
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addVector = useCallback(async (
    id: string,
    text: string,
    metadata: Record<string, unknown> = {}
  ): Promise<boolean> => {
    setIsIndexing(true);
    setError(null);

    try {
      const embedding = await embeddingService.generateEmbedding(text);
      if (!embedding) {
        throw new Error('Failed to generate embedding');
      }

      await vectorStore.add({
        id,
        vector: embedding,
        metadata: { text, ...metadata }
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Indexing failed';
      setError(message);
      return false;
    } finally {
      setIsIndexing(false);
    }
  }, []);

  const addVectorBatch = useCallback(async (
    items: Array<{ id: string; text: string; metadata?: Record<string, unknown> }>
  ): Promise<{ success: number; failed: number }> => {
    setIsIndexing(true);
    setError(null);

    let success = 0;
    let failed = 0;

    try {
      for (const item of items) {
        try {
          const embedding = await embeddingService.generateEmbedding(item.text);
          if (embedding) {
            await vectorStore.add({
              id: item.id,
              vector: embedding,
              metadata: { text: item.text, ...item.metadata }
            });
            success++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }
    } finally {
      setIsIndexing(false);
    }

    return { success, failed };
  }, []);

  const removeVector = useCallback(async (id: string): Promise<boolean> => {
    return vectorStore.remove(id);
  }, []);

  return {
    addVector,
    addVectorBatch,
    removeVector,
    isIndexing,
    error,
    stats: vectorStore.getStats()
  };
}

/**
 * Hook for semantic similarity between two texts
 */
export function useSemanticSimilarity() {
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeSimilarity = useCallback(async (
    text1: string,
    text2: string
  ): Promise<number | null> => {
    setIsComputing(true);
    setError(null);

    try {
      const [embedding1, embedding2] = await Promise.all([
        embeddingService.generateEmbedding(text1),
        embeddingService.generateEmbedding(text2)
      ]);

      if (!embedding1 || !embedding2) {
        throw new Error('Failed to generate embeddings');
      }

      // Compute cosine similarity
      const dotProduct = embedding1.reduce((sum, a, i) => sum + a * embedding2[i], 0);
      const norm1 = Math.sqrt(embedding1.reduce((sum, a) => sum + a * a, 0));
      const norm2 = Math.sqrt(embedding2.reduce((sum, a) => sum + a * a, 0));

      const cosineSimilarity = dotProduct / (norm1 * norm2);
      setSimilarity(cosineSimilarity);

      return cosineSimilarity;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Similarity computation failed';
      setError(message);
      return null;
    } finally {
      setIsComputing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSimilarity(null);
    setError(null);
  }, []);

  return {
    computeSimilarity,
    similarity,
    isComputing,
    error,
    reset
  };
}

export default useVectorSearch;
