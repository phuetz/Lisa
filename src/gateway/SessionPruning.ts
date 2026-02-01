/**
 * Lisa Session Pruning
 * Automatic context memory management and compaction
 * Inspired by OpenClaw's session pruning
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface PruningConfig {
  enabled: boolean;
  maxTokens: number;
  targetTokens: number;
  strategy: PruningStrategy;
  summarizeOld: boolean;
  preserveSystemMessages: boolean;
  preserveRecentCount: number;
  autoCompactThreshold: number; // percentage
}

export type PruningStrategy = 
  | 'sliding-window'
  | 'summarize'
  | 'semantic-clustering'
  | 'importance-based'
  | 'hybrid';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: number;
  timestamp: Date;
  importance?: number;
  metadata?: Record<string, unknown>;
}

export interface SessionContext {
  id: string;
  messages: Message[];
  totalTokens: number;
  summaries: ContextSummary[];
  createdAt: Date;
  lastPrunedAt?: Date;
}

export interface ContextSummary {
  id: string;
  content: string;
  tokens: number;
  messageRange: { start: number; end: number };
  createdAt: Date;
}

export interface PruningResult {
  success: boolean;
  removedMessages: number;
  removedTokens: number;
  newSummary?: ContextSummary;
  finalTokenCount: number;
}

const DEFAULT_CONFIG: PruningConfig = {
  enabled: true,
  maxTokens: 128000,
  targetTokens: 100000,
  strategy: 'hybrid',
  summarizeOld: true,
  preserveSystemMessages: true,
  preserveRecentCount: 10,
  autoCompactThreshold: 80 // 80% of max
};

export class SessionPruning extends BrowserEventEmitter {
  private config: PruningConfig;
  private sessions: Map<string, SessionContext> = new Map();
  private activeSessionId: string | null = null;

  constructor(config: Partial<PruningConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  // Configuration
  configure(config: Partial<PruningConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:changed', this.config);
  }

  getConfig(): PruningConfig {
    return { ...this.config };
  }

  // Session management
  createSession(): SessionContext {
    const session: SessionContext = {
      id: this.generateId('session'),
      messages: [],
      totalTokens: 0,
      summaries: [],
      createdAt: new Date()
    };

    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;
    this.emit('session:created', session);
    return session;
  }

  getSession(sessionId?: string): SessionContext | null {
    const id = sessionId || this.activeSessionId;
    return id ? this.sessions.get(id) || null : null;
  }

  setActiveSession(sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) return false;
    this.activeSessionId = sessionId;
    return true;
  }

  // Message management
  addMessage(message: Omit<Message, 'id' | 'timestamp'>, sessionId?: string): Message | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const newMessage: Message = {
      ...message,
      id: this.generateId('msg'),
      timestamp: new Date()
    };

    session.messages.push(newMessage);
    session.totalTokens += newMessage.tokens;

    // Check if auto-compact needed
    if (this.config.enabled && this.shouldAutoCompact(session)) {
      this.prune(session.id);
    }

    this.emit('message:added', { sessionId: session.id, message: newMessage });
    return newMessage;
  }

  private shouldAutoCompact(session: SessionContext): boolean {
    const threshold = (this.config.autoCompactThreshold / 100) * this.config.maxTokens;
    return session.totalTokens >= threshold;
  }

  // Pruning
  async prune(sessionId?: string): Promise<PruningResult> {
    const session = this.getSession(sessionId);
    if (!session) {
      return { success: false, removedMessages: 0, removedTokens: 0, finalTokenCount: 0 };
    }

    this.emit('pruning:started', { sessionId: session.id, currentTokens: session.totalTokens });

    let result: PruningResult;

    switch (this.config.strategy) {
      case 'sliding-window':
        result = this.pruneSlidingWindow(session);
        break;
      case 'summarize':
        result = await this.pruneSummarize(session);
        break;
      case 'semantic-clustering':
        result = this.pruneSemanticClustering(session);
        break;
      case 'importance-based':
        result = this.pruneImportanceBased(session);
        break;
      case 'hybrid':
      default:
        result = await this.pruneHybrid(session);
    }

    if (result.success) {
      session.lastPrunedAt = new Date();
      this.emit('pruning:completed', { sessionId: session.id, result });
    }

    return result;
  }

  // Sliding window - keep most recent messages
  private pruneSlidingWindow(session: SessionContext): PruningResult {
    const { preserveSystemMessages, preserveRecentCount, targetTokens } = this.config;
    
    const messages = [...session.messages];
    let totalTokens = session.totalTokens;
    let removedCount = 0;
    let removedTokens = 0;

    // Separate system messages if preserving
    const systemMessages = preserveSystemMessages 
      ? messages.filter(m => m.role === 'system')
      : [];
    
    const otherMessages = preserveSystemMessages
      ? messages.filter(m => m.role !== 'system')
      : messages;

    // Keep recent messages
    const recentMessages = otherMessages.slice(-preserveRecentCount);
    const olderMessages = otherMessages.slice(0, -preserveRecentCount);

    // Remove older messages until under target
    while (totalTokens > targetTokens && olderMessages.length > 0) {
      const removed = olderMessages.shift()!;
      totalTokens -= removed.tokens;
      removedCount++;
      removedTokens += removed.tokens;
    }

    // Reconstruct messages
    session.messages = [...systemMessages, ...olderMessages, ...recentMessages];
    session.totalTokens = totalTokens;

    return {
      success: true,
      removedMessages: removedCount,
      removedTokens,
      finalTokenCount: totalTokens
    };
  }

  // Summarize old messages
  private async pruneSummarize(session: SessionContext): Promise<PruningResult> {
    const { preserveRecentCount, targetTokens: _targetTokens } = this.config;

    const recentMessages = session.messages.slice(-preserveRecentCount);
    const olderMessages = session.messages.slice(0, -preserveRecentCount);

    if (olderMessages.length === 0) {
      return { success: true, removedMessages: 0, removedTokens: 0, finalTokenCount: session.totalTokens };
    }

    // Create summary of older messages
    const summaryContent = this.generateSummary(olderMessages);
    const summaryTokens = this.estimateTokens(summaryContent);

    const summary: ContextSummary = {
      id: this.generateId('summary'),
      content: summaryContent,
      tokens: summaryTokens,
      messageRange: { start: 0, end: olderMessages.length },
      createdAt: new Date()
    };

    session.summaries.push(summary);

    // Calculate removed tokens
    const removedTokens = olderMessages.reduce((sum, m) => sum + m.tokens, 0);
    
    // Keep only recent messages
    session.messages = recentMessages;
    session.totalTokens = recentMessages.reduce((sum, m) => sum + m.tokens, 0) + summaryTokens;

    return {
      success: true,
      removedMessages: olderMessages.length,
      removedTokens: removedTokens - summaryTokens,
      newSummary: summary,
      finalTokenCount: session.totalTokens
    };
  }

  // Semantic clustering - group similar messages
  private pruneSemanticClustering(session: SessionContext): PruningResult {
    // Simplified implementation - in real version would use embeddings
    // For now, falls back to sliding window with some clustering logic
    
    const { targetTokens, preserveRecentCount } = this.config;
    
    // Group consecutive messages by role
    const groups: Message[][] = [];
    let currentGroup: Message[] = [];
    let currentRole = '';

    for (const msg of session.messages) {
      if (msg.role !== currentRole && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(msg);
      currentRole = msg.role;
    }
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    // Keep recent groups and compact older ones
    const recentGroups = groups.slice(-preserveRecentCount);
    const olderGroups = groups.slice(0, -preserveRecentCount);

    let removedTokens = 0;
    let removedMessages = 0;

    // Remove older groups until under target
    while (session.totalTokens > targetTokens && olderGroups.length > 0) {
      const removed = olderGroups.shift()!;
      for (const msg of removed) {
        removedTokens += msg.tokens;
        removedMessages++;
      }
      session.totalTokens -= removedTokens;
    }

    // Flatten remaining groups
    session.messages = [...olderGroups.flat(), ...recentGroups.flat()];

    return {
      success: true,
      removedMessages,
      removedTokens,
      finalTokenCount: session.totalTokens
    };
  }

  // Importance-based - keep important messages
  private pruneImportanceBased(session: SessionContext): PruningResult {
    const { targetTokens, preserveSystemMessages } = this.config;

    // Score messages by importance
    const scoredMessages = session.messages.map(msg => ({
      message: msg,
      score: this.calculateImportance(msg)
    }));

    // Sort by importance (lower score = less important)
    scoredMessages.sort((a, b) => a.score - b.score);

    let removedTokens = 0;
    let removedMessages = 0;
    const toRemove = new Set<string>();

    // Remove least important messages until under target
    for (const { message } of scoredMessages) {
      if (session.totalTokens - removedTokens <= targetTokens) break;
      
      // Don't remove system messages if preserving
      if (preserveSystemMessages && message.role === 'system') continue;

      toRemove.add(message.id);
      removedTokens += message.tokens;
      removedMessages++;
    }

    // Filter out removed messages
    session.messages = session.messages.filter(m => !toRemove.has(m.id));
    session.totalTokens -= removedTokens;

    return {
      success: true,
      removedMessages,
      removedTokens,
      finalTokenCount: session.totalTokens
    };
  }

  private calculateImportance(message: Message): number {
    let score = message.importance || 50;

    // System messages are most important
    if (message.role === 'system') score += 100;

    // Recent messages are more important
    const ageMinutes = (Date.now() - message.timestamp.getTime()) / 60000;
    score -= Math.min(ageMinutes / 10, 30); // Max -30 for old messages

    // Longer messages might be more important (contain more context)
    score += Math.min(message.tokens / 100, 20);

    // Messages with metadata are likely important
    if (message.metadata && Object.keys(message.metadata).length > 0) {
      score += 10;
    }

    return score;
  }

  // Hybrid - combine strategies
  private async pruneHybrid(session: SessionContext): Promise<PruningResult> {
    // First, try importance-based to remove clearly unimportant messages
    const importanceResult = this.pruneImportanceBased(session);
    
    // If still over target, summarize older messages
    if (session.totalTokens > this.config.targetTokens) {
      const summarizeResult = await this.pruneSummarize(session);
      return {
        success: true,
        removedMessages: importanceResult.removedMessages + summarizeResult.removedMessages,
        removedTokens: importanceResult.removedTokens + summarizeResult.removedTokens,
        newSummary: summarizeResult.newSummary,
        finalTokenCount: session.totalTokens
      };
    }

    return importanceResult;
  }

  // Helper methods
  private generateSummary(messages: Message[]): string {
    // In real implementation, would use AI to generate summary
    // For now, create a simple concatenated summary
    const roleLabels: Record<string, string> = {
      user: 'Utilisateur',
      assistant: 'Lisa',
      system: 'Système'
    };

    const summaryParts = messages
      .slice(0, 10) // Limit to first 10 messages for summary
      .map(m => `${roleLabels[m.role]}: ${m.content.slice(0, 100)}...`);

    return `[Résumé de ${messages.length} messages précédents]\n${summaryParts.join('\n')}`;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for French/English
    return Math.ceil(text.length / 4);
  }

  // Get context for LLM (with summaries)
  getContextForLLM(sessionId?: string): { messages: Message[]; summaries: string[] } {
    const session = this.getSession(sessionId);
    if (!session) return { messages: [], summaries: [] };

    return {
      messages: session.messages,
      summaries: session.summaries.map(s => s.content)
    };
  }

  // Stats
  getStats(sessionId?: string): {
    messageCount: number;
    totalTokens: number;
    summaryCount: number;
    usagePercent: number;
    needsPruning: boolean;
  } {
    const session = this.getSession(sessionId);
    if (!session) {
      return { messageCount: 0, totalTokens: 0, summaryCount: 0, usagePercent: 0, needsPruning: false };
    }

    const usagePercent = (session.totalTokens / this.config.maxTokens) * 100;
    
    return {
      messageCount: session.messages.length,
      totalTokens: session.totalTokens,
      summaryCount: session.summaries.length,
      usagePercent: Math.round(usagePercent),
      needsPruning: usagePercent >= this.config.autoCompactThreshold
    };
  }
}

// Singleton
let sessionPruningInstance: SessionPruning | null = null;

export function getSessionPruning(): SessionPruning {
  if (!sessionPruningInstance) {
    sessionPruningInstance = new SessionPruning();
  }
  return sessionPruningInstance;
}

export function resetSessionPruning(): void {
  if (sessionPruningInstance) {
    sessionPruningInstance.removeAllListeners();
    sessionPruningInstance = null;
  }
}

