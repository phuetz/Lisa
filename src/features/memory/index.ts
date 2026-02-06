/**
 * Lisa Memory Module - Unified memory management
 *
 * This module provides the MemoryManager for unified memory access.
 *
 * @example
 * ```typescript
 * import { memoryManager } from '@/features/memory';
 *
 * // Initialize
 * await memoryManager.initialize();
 *
 * // Store a memory
 * await memoryManager.remember('fact', 'User lives in Paris', {
 *   tags: ['location', 'user-info']
 * });
 *
 * // Recall memories
 * const memories = await memoryManager.recall({ type: 'fact' });
 *
 * // Semantic search
 * const relevant = await memoryManager.search('where does user live?');
 * ```
 */

// Main manager
export { MemoryManager, memoryManager } from './MemoryManager';

// Types
export type {
  Memory,
  MemoryType,
  MemoryTier,
  MemoryMetadata,
  MemoryStore,
  MemoryQuery,
  MemorySearchResult,
  SemanticQuery,
  SemanticResult,
  AugmentedContext,
  MemoryStats,
  MemoryConfig,
  ShortTermConfig,
  LongTermConfig,
  SemanticConfig,
  MemoryEvent,
  MemoryEventData,
  ForgetCriteria,
  ForgetResult,
} from './types';
