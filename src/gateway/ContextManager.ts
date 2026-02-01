/**
 * Lisa Context Manager
 * Manages conversation context, memory windows, and context compression
 * Inspired by OpenClaw's context management system
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface ContextEntry {
  id: string;
  type: ContextEntryType;
  content: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  timestamp: Date;
  tokens: number;
  metadata?: ContextMetadata;
  pinned?: boolean;
  compressed?: boolean;
}

export type ContextEntryType = 
  | 'message'
  | 'tool_call'
  | 'tool_result'
  | 'system_prompt'
  | 'memory'
  | 'file_content'
  | 'web_content'
  | 'summary';

export interface ContextMetadata {
  toolName?: string;
  toolId?: string;
  fileUrl?: string;
  fileName?: string;
  webUrl?: string;
  sourceId?: string;
  importance?: number; // 0-1
}

export interface ContextWindow {
  sessionId: string;
  entries: ContextEntry[];
  totalTokens: number;
  maxTokens: number;
  systemPrompt?: string;
  summaries: ContextSummary[];
}

export interface ContextSummary {
  id: string;
  content: string;
  tokens: number;
  coveredEntries: string[]; // Entry IDs that were summarized
  createdAt: Date;
}

export interface ContextConfig {
  maxTokens: number;
  reservedTokens: number; // For system prompt and response
  compressionThreshold: number; // Start compressing at this %
  summaryMaxTokens: number;
  keepLastN: number; // Always keep last N messages
  pinImportantThreshold: number; // Auto-pin if importance >= this
}

const DEFAULT_CONFIG: ContextConfig = {
  maxTokens: 128000,
  reservedTokens: 4096,
  compressionThreshold: 0.8,
  summaryMaxTokens: 500,
  keepLastN: 10,
  pinImportantThreshold: 0.9
};

export class ContextManager extends BrowserEventEmitter {
  private windows: Map<string, ContextWindow> = new Map();
  private config: ContextConfig;

  constructor(config: Partial<ContextConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Window management
  createWindow(sessionId: string, systemPrompt?: string): ContextWindow {
    const window: ContextWindow = {
      sessionId,
      entries: [],
      totalTokens: 0,
      maxTokens: this.config.maxTokens,
      systemPrompt,
      summaries: []
    };

    if (systemPrompt) {
      this.addEntry(sessionId, {
        type: 'system_prompt',
        content: systemPrompt,
        role: 'system',
        tokens: this.estimateTokens(systemPrompt),
        pinned: true
      });
    }

    this.windows.set(sessionId, window);
    this.emit('window:created', window);
    
    return window;
  }

  getWindow(sessionId: string): ContextWindow | undefined {
    return this.windows.get(sessionId);
  }

  deleteWindow(sessionId: string): boolean {
    const deleted = this.windows.delete(sessionId);
    if (deleted) {
      this.emit('window:deleted', { sessionId });
    }
    return deleted;
  }

  // Entry management
  addEntry(sessionId: string, entry: Omit<ContextEntry, 'id' | 'timestamp'>): ContextEntry {
    let window = this.windows.get(sessionId);
    
    if (!window) {
      window = this.createWindow(sessionId);
    }

    const fullEntry: ContextEntry = {
      ...entry,
      id: `ctx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date()
    };

    // Auto-pin if important
    if (entry.metadata?.importance && entry.metadata.importance >= this.config.pinImportantThreshold) {
      fullEntry.pinned = true;
    }

    window.entries.push(fullEntry);
    window.totalTokens += fullEntry.tokens;

    // Check if compression needed
    const usageRatio = window.totalTokens / (window.maxTokens - this.config.reservedTokens);
    if (usageRatio >= this.config.compressionThreshold) {
      this.compressContext(sessionId);
    }

    this.emit('entry:added', { sessionId, entry: fullEntry });
    
    return fullEntry;
  }

  addMessage(sessionId: string, role: 'user' | 'assistant', content: string, metadata?: ContextMetadata): ContextEntry {
    return this.addEntry(sessionId, {
      type: 'message',
      content,
      role,
      tokens: this.estimateTokens(content),
      metadata
    });
  }

  addToolCall(sessionId: string, toolName: string, toolId: string, params: string): ContextEntry {
    return this.addEntry(sessionId, {
      type: 'tool_call',
      content: params,
      role: 'assistant',
      tokens: this.estimateTokens(params),
      metadata: { toolName, toolId }
    });
  }

  addToolResult(sessionId: string, toolId: string, result: string): ContextEntry {
    return this.addEntry(sessionId, {
      type: 'tool_result',
      content: result,
      role: 'tool',
      tokens: this.estimateTokens(result),
      metadata: { toolId }
    });
  }

  addFileContent(sessionId: string, fileName: string, content: string, fileUrl?: string): ContextEntry {
    return this.addEntry(sessionId, {
      type: 'file_content',
      content,
      role: 'system',
      tokens: this.estimateTokens(content),
      metadata: { fileName, fileUrl }
    });
  }

  addWebContent(sessionId: string, webUrl: string, content: string): ContextEntry {
    return this.addEntry(sessionId, {
      type: 'web_content',
      content,
      role: 'system',
      tokens: this.estimateTokens(content),
      metadata: { webUrl }
    });
  }

  addMemory(sessionId: string, content: string, sourceId?: string): ContextEntry {
    return this.addEntry(sessionId, {
      type: 'memory',
      content,
      role: 'system',
      tokens: this.estimateTokens(content),
      metadata: { sourceId, importance: 0.7 }
    });
  }

  // Pin/unpin entries
  pinEntry(sessionId: string, entryId: string): boolean {
    const window = this.windows.get(sessionId);
    const entry = window?.entries.find(e => e.id === entryId);
    
    if (entry) {
      entry.pinned = true;
      this.emit('entry:pinned', { sessionId, entryId });
      return true;
    }
    return false;
  }

  unpinEntry(sessionId: string, entryId: string): boolean {
    const window = this.windows.get(sessionId);
    const entry = window?.entries.find(e => e.id === entryId);
    
    if (entry) {
      entry.pinned = false;
      this.emit('entry:unpinned', { sessionId, entryId });
      return true;
    }
    return false;
  }

  // Context compression
  compressContext(sessionId: string): void {
    const window = this.windows.get(sessionId);
    if (!window) return;

    const targetTokens = (window.maxTokens - this.config.reservedTokens) * 0.6;
    
    if (window.totalTokens <= targetTokens) return;

    // Find entries to compress (not pinned, not recent)
    const recentIds = new Set(
      window.entries.slice(-this.config.keepLastN).map(e => e.id)
    );

    const compressibleEntries = window.entries.filter(
      e => !e.pinned && !recentIds.has(e.id) && !e.compressed && e.type === 'message'
    );

    if (compressibleEntries.length < 3) return;

    // Create summary of compressible entries
    const summaryContent = this.createSummaryContent(compressibleEntries);
    const summaryTokens = Math.min(
      this.estimateTokens(summaryContent),
      this.config.summaryMaxTokens
    );

    const summary: ContextSummary = {
      id: `sum_${Date.now().toString(36)}`,
      content: summaryContent,
      tokens: summaryTokens,
      coveredEntries: compressibleEntries.map(e => e.id),
      createdAt: new Date()
    };

    window.summaries.push(summary);

    // Mark entries as compressed and reduce their tokens
    const tokensFreed = compressibleEntries.reduce((sum, e) => {
      e.compressed = true;
      const originalTokens = e.tokens;
      e.tokens = 0; // Compressed entries don't count towards context
      return sum + originalTokens;
    }, 0);

    window.totalTokens -= tokensFreed;
    window.totalTokens += summaryTokens;

    // Add summary as an entry
    this.addEntry(sessionId, {
      type: 'summary',
      content: summaryContent,
      role: 'system',
      tokens: summaryTokens,
      metadata: { importance: 0.5 }
    });

    this.emit('context:compressed', { 
      sessionId, 
      tokensFreed, 
      entriesCompressed: compressibleEntries.length,
      summaryId: summary.id
    });
  }

  private createSummaryContent(entries: ContextEntry[]): string {
    // Simple summary - in production, use LLM for better summaries
    const messages = entries
      .filter(e => e.type === 'message')
      .map(e => `${e.role}: ${e.content.slice(0, 100)}${e.content.length > 100 ? '...' : ''}`);

    return `[Résumé de ${entries.length} messages précédents]\n` +
      `Points clés: ${messages.slice(0, 5).join(' | ')}\n` +
      `[Fin du résumé]`;
  }

  // Build context for API call
  buildContext(sessionId: string, options?: {
    maxTokens?: number;
    includeSystemPrompt?: boolean;
    includeSummaries?: boolean;
  }): ContextEntry[] {
    const window = this.windows.get(sessionId);
    if (!window) return [];

    const maxTokens = options?.maxTokens || (window.maxTokens - this.config.reservedTokens);
    const _includeSystemPrompt = options?.includeSystemPrompt ?? true;
    const includeSummaries = options?.includeSummaries ?? true;

    const result: ContextEntry[] = [];
    let currentTokens = 0;

    // Always include pinned entries first
    const pinnedEntries = window.entries.filter(e => e.pinned && !e.compressed);
    for (const entry of pinnedEntries) {
      if (currentTokens + entry.tokens <= maxTokens) {
        result.push(entry);
        currentTokens += entry.tokens;
      }
    }

    // Include summaries
    if (includeSummaries) {
      for (const summary of window.summaries) {
        if (currentTokens + summary.tokens <= maxTokens) {
          result.push({
            id: summary.id,
            type: 'summary',
            content: summary.content,
            role: 'system',
            timestamp: summary.createdAt,
            tokens: summary.tokens
          });
          currentTokens += summary.tokens;
        }
      }
    }

    // Add remaining entries (most recent first priority)
    const unpinnedEntries = window.entries
      .filter(e => !e.pinned && !e.compressed)
      .reverse();

    for (const entry of unpinnedEntries) {
      if (currentTokens + entry.tokens <= maxTokens) {
        result.unshift(entry); // Add to beginning to maintain order
        currentTokens += entry.tokens;
      }
    }

    // Sort by timestamp
    result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return result;
  }

  // Token estimation (simple approximation)
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    // More accurate for French: ~3.5 characters per token
    return Math.ceil(text.length / 3.5);
  }

  // Stats
  getStats(sessionId: string): {
    totalEntries: number;
    totalTokens: number;
    maxTokens: number;
    usagePercent: number;
    pinnedEntries: number;
    compressedEntries: number;
    summaries: number;
  } | null {
    const window = this.windows.get(sessionId);
    if (!window) return null;

    return {
      totalEntries: window.entries.length,
      totalTokens: window.totalTokens,
      maxTokens: window.maxTokens,
      usagePercent: (window.totalTokens / window.maxTokens) * 100,
      pinnedEntries: window.entries.filter(e => e.pinned).length,
      compressedEntries: window.entries.filter(e => e.compressed).length,
      summaries: window.summaries.length
    };
  }

  // Clear context
  clearContext(sessionId: string, keepPinned: boolean = true): void {
    const window = this.windows.get(sessionId);
    if (!window) return;

    if (keepPinned) {
      window.entries = window.entries.filter(e => e.pinned);
      window.totalTokens = window.entries.reduce((sum, e) => sum + e.tokens, 0);
    } else {
      window.entries = [];
      window.totalTokens = 0;
    }

    window.summaries = [];
    
    this.emit('context:cleared', { sessionId, keepPinned });
  }

  // Update config
  updateConfig(config: Partial<ContextConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ContextConfig {
    return { ...this.config };
  }
}

// Singleton
let contextManagerInstance: ContextManager | null = null;

export function getContextManager(): ContextManager {
  if (!contextManagerInstance) {
    contextManagerInstance = new ContextManager();
  }
  return contextManagerInstance;
}

export function resetContextManager(): void {
  if (contextManagerInstance) {
    contextManagerInstance.removeAllListeners();
    contextManagerInstance = null;
  }
}

