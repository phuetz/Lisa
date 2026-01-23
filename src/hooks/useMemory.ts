/**
 * useMemory.ts
 * 
 * React hook for interacting with the MemoryAgent to store and retrieve memories.
 * Provides an easy-to-use interface for components to leverage the memory system.
 */

import { useCallback, useState } from 'react';
import { agentRegistry } from '../features/agents/core/registry';
import type { Memory, MemoryQuery } from '../agents/MemoryAgent';
import { useVisionAudioStore } from '../store/visionAudioStore';

interface UseMemoryOptions {
  defaultLimit?: number;
}

interface UseMemoryResult {
  // Core memory operations
  storeMemory: (content: string, options?: {
    type?: 'fact' | 'preference' | 'interaction' | 'context';
    tags?: string[];
    source?: string;
    confidence?: number;
    metadata?: Record<string, any>;
  }) => Promise<Memory | null>;
  
  retrieveMemories: (query: MemoryQuery) => Promise<Memory[]>;
  
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<Memory | null>;
  
  deleteMemory: (id: string) => Promise<boolean>;
  
  // Utility functions
  summarizeMemories: (context: string, limit?: number) => Promise<string>;
  
  getRecentMemories: (limit?: number) => Promise<Memory[]>;
  
  // State
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useMemory = (options: UseMemoryOptions = {}): UseMemoryResult => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { defaultLimit = 5 } = options;
  
  const setState = useVisionAudioStore(s => s.setState);

  /**
   * Store a new memory
   */
  const storeMemory = useCallback(async (
    content: string, 
    options: {
      type?: 'fact' | 'preference' | 'interaction' | 'context';
      tags?: string[];
      source?: string;
      confidence?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<Memory | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const memoryAgent = await agentRegistry.getAgentAsync('MemoryAgent');
      
      if (!memoryAgent) {
        throw new Error('MemoryAgent not found in registry');
      }
      
      const result = await memoryAgent.execute({
        action: 'store',
        content,
        type: options.type || 'fact',
        tags: options.tags || [],
        source: options.source || 'user_interaction',
        confidence: options.confidence || 0.9,
        metadata: options.metadata
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to store memory');
      }
      
      // Update store with latest memory for context
      setState(state => ({
        lastMemoryOperation: {
          type: 'store',
          timestamp: Date.now(),
          memory: result.output
        }
      }));
      
      return result.output as Memory;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error storing memory';
      setError(errorMessage);
      console.error('[useMemory] Error storing memory:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setState]);

  /**
   * Retrieve memories based on a query
   */
  const retrieveMemories = useCallback(async (query: MemoryQuery): Promise<Memory[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const memoryAgent = await agentRegistry.getAgentAsync('MemoryAgent');
      
      if (!memoryAgent) {
        throw new Error('MemoryAgent not found in registry');
      }
      
      const result = await memoryAgent.execute({
        action: 'retrieve',
        query: {
          ...query,
          limit: query.limit || defaultLimit
        }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to retrieve memories');
      }
      
      // Update store with latest memory operation
      setState(state => ({
        lastMemoryOperation: {
          type: 'retrieve',
          timestamp: Date.now(),
          query
        }
      }));
      
      return result.output as Memory[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error retrieving memories';
      setError(errorMessage);
      console.error('[useMemory] Error retrieving memories:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [defaultLimit, setState]);

  /**
   * Update an existing memory
   */
  const updateMemory = useCallback(async (id: string, updates: Partial<Memory>): Promise<Memory | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const memoryAgent = await agentRegistry.getAgentAsync('MemoryAgent');
      
      if (!memoryAgent) {
        throw new Error('MemoryAgent not found in registry');
      }
      
      const result = await memoryAgent.execute({
        action: 'update',
        id,
        updates
      });
      
      if (!result.success) {
        throw new Error(result.error || `Failed to update memory with ID ${id}`);
      }
      
      // Update store with latest memory operation
      setState(state => ({
        lastMemoryOperation: {
          type: 'update',
          timestamp: Date.now(),
          memoryId: id
        }
      }));
      
      return result.output as Memory;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Unknown error updating memory ${id}`;
      setError(errorMessage);
      console.error(`[useMemory] Error updating memory ${id}:`, err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setState]);

  /**
   * Delete a memory
   */
  const deleteMemory = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const memoryAgent = await agentRegistry.getAgentAsync('MemoryAgent');
      
      if (!memoryAgent) {
        throw new Error('MemoryAgent not found in registry');
      }
      
      const result = await memoryAgent.execute({
        action: 'delete',
        id
      });
      
      if (!result.success) {
        throw new Error(result.error || `Failed to delete memory with ID ${id}`);
      }
      
      // Update store with latest memory operation
      setState(state => ({
        lastMemoryOperation: {
          type: 'delete',
          timestamp: Date.now(),
          memoryId: id
        }
      }));
      
      return result.output as boolean;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Unknown error deleting memory ${id}`;
      setError(errorMessage);
      console.error(`[useMemory] Error deleting memory ${id}:`, err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setState]);

  /**
   * Get a summary of memories related to a context
   */
  const summarizeMemories = useCallback(async (context: string, limit = defaultLimit): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const memoryAgent = await agentRegistry.getAgentAsync('MemoryAgent');
      
      if (!memoryAgent) {
        throw new Error('MemoryAgent not found in registry');
      }
      
      const result = await memoryAgent.execute({
        action: 'summarize',
        context,
        limit
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to summarize memories');
      }
      
      return result.output as string;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error summarizing memories';
      setError(errorMessage);
      console.error('[useMemory] Error summarizing memories:', err);
      return 'Unable to summarize memories at this time.';
    } finally {
      setIsLoading(false);
    }
  }, [defaultLimit]);

  /**
   * Get the most recent memories
   */
  const getRecentMemories = useCallback(async (limit = defaultLimit): Promise<Memory[]> => {
    return retrieveMemories({
      limit,
      sortBy: 'timestamp'
    });
  }, [defaultLimit, retrieveMemories]);

  /**
   * Clear any errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    storeMemory,
    retrieveMemories,
    updateMemory,
    deleteMemory,
    summarizeMemories,
    getRecentMemories,
    isLoading,
    error,
    clearError
  };
};
