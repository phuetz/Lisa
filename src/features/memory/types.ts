/**
 * Unified Memory Types for Lisa AI
 *
 * Provides consistent types across all memory systems:
 * - Short-term (conversation context)
 * - Long-term (persistent storage)
 * - Semantic (RAG with embeddings)
 */

/* ---------- Memory Entry Types ---------- */

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  source: string;
  timestamp: string;
  relevance: number; // 0-100
  tags: string[];
  embedding?: number[];
  metadata?: MemoryMetadata;
}

export type MemoryType =
  | 'conversation'
  | 'document'
  | 'fact'
  | 'preference'
  | 'context'
  | 'instruction';

export interface MemoryMetadata {
  userId?: string;
  sessionId?: string;
  importance?: number; // 0-1
  accessCount?: number;
  lastAccessedAt?: string;
  expiresAt?: string;
  [key: string]: unknown;
}

/* ---------- Memory Storage Types ---------- */

export type MemoryTier = 'short' | 'long' | 'semantic';

export interface MemoryStore {
  tier: MemoryTier;
  store(memory: Memory): Promise<void>;
  retrieve(id: string): Promise<Memory | null>;
  search(query: MemoryQuery): Promise<Memory[]>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<void>;
}

/* ---------- Query Types ---------- */

export interface MemoryQuery {
  text?: string;
  type?: MemoryType | MemoryType[];
  tags?: string[];
  minRelevance?: number;
  limit?: number;
  offset?: number;
  since?: string;
  until?: string;
  source?: string;
}

export interface MemorySearchResult {
  memories: Memory[];
  total: number;
  query: MemoryQuery;
  searchTime: number;
}

/* ---------- RAG Types ---------- */

export interface SemanticQuery {
  text: string;
  embedding?: number[];
  threshold?: number;
  maxResults?: number;
  includeScores?: boolean;
}

export interface SemanticResult {
  memory: Memory;
  score: number;
  distance?: number;
}

export interface AugmentedContext {
  query: string;
  relevantMemories: Memory[];
  context: string;
  confidence: number;
  timestamp: string;
}

/* ---------- Stats Types ---------- */

export interface MemoryStats {
  totalMemories: number;
  byType: Record<MemoryType, number>;
  byTier: Record<MemoryTier, number>;
  averageRelevance: number;
  oldestMemory: string | null;
  newestMemory: string | null;
  totalSize: number;
}

/* ---------- Configuration ---------- */

export interface MemoryConfig {
  shortTerm: ShortTermConfig;
  longTerm: LongTermConfig;
  semantic: SemanticConfig;
}

export interface ShortTermConfig {
  maxEntries: number;
  promotionThreshold: number; // relevance threshold to promote to long-term
  ttlMs?: number;
}

export interface LongTermConfig {
  maxEntries: number;
  pruneOlderThanDays?: number;
  pruneMinAccessCount?: number;
}

export interface SemanticConfig {
  enabled: boolean;
  provider: 'local' | 'openai' | 'cohere';
  similarityThreshold: number;
  maxResults: number;
  useVectorIndex: boolean;
}

/* ---------- Manager Events ---------- */

export type MemoryEvent =
  | 'memory:created'
  | 'memory:updated'
  | 'memory:deleted'
  | 'memory:promoted'
  | 'memory:pruned';

export interface MemoryEventData {
  event: MemoryEvent;
  memory?: Memory;
  tier?: MemoryTier;
  count?: number;
}

/* ---------- Forget Types ---------- */

export interface ForgetCriteria {
  olderThan?: string;
  type?: MemoryType;
  tags?: string[];
  source?: string;
  belowRelevance?: number;
}

export interface ForgetResult {
  deletedCount: number;
  freedBytes?: number;
  criteria: ForgetCriteria;
}
