/**
 * Session Compactor Service - OpenClaw-Inspired Context Management
 *
 * Implements intelligent session compaction to maintain context within
 * model token limits while preserving important information.
 *
 * Features:
 * - JSONL transcript format for efficient storage
 * - LLM-powered summarization before context window limit
 * - NO_REPLY silent housekeeping turns for background maintenance
 * - Adaptive compression based on message importance
 * - Multi-tier memory (recent + summary + facts)
 */

import type { Message } from '../types/chat';
import type { SessionMessage, Session } from './SessionStore';

// ============================================================================
// Types
// ============================================================================

export interface CompactionConfig {
  /** Maximum tokens before triggering compaction */
  maxTokens: number;
  /** Target tokens after compaction */
  targetTokens: number;
  /** Minimum messages to keep uncompressed */
  minRecentMessages: number;
  /** Maximum messages before forced compaction */
  maxMessages: number;
  /** Enable LLM-powered summarization */
  useLLMSummary: boolean;
  /** Model to use for summarization */
  summaryModel?: string;
  /** Importance threshold (0-1) for keeping messages */
  importanceThreshold: number;
}

export interface CompactedSession {
  /** Original session ID */
  sessionId: string;
  /** Compressed summary of older messages */
  summary: string;
  /** Key facts extracted from conversation */
  facts: ExtractedFact[];
  /** Recent messages (uncompressed) */
  recentMessages: SessionMessage[];
  /** Metadata about compaction */
  compactionMeta: CompactionMeta;
}

export interface ExtractedFact {
  id: string;
  category: 'preference' | 'context' | 'decision' | 'task' | 'entity';
  content: string;
  confidence: number;
  sourceMessageIds: string[];
  timestamp: string;
}

export interface CompactionMeta {
  lastCompactedAt: string;
  totalMessagesCompacted: number;
  totalTokensSaved: number;
  compressionRatio: number;
  summaryVersion: number;
}

export interface TranscriptEntry {
  timestamp: string;
  role: SessionMessage['role'];
  content: string;
  importance: number;
  tokens: number;
  toolCalls?: Array<{ name: string; result?: string }>;
}

export type CompactionEvent =
  | { type: 'compaction_started'; sessionId: string; messageCount: number }
  | { type: 'compaction_completed'; sessionId: string; tokensSaved: number }
  | { type: 'summary_generated'; sessionId: string; summaryLength: number }
  | { type: 'facts_extracted'; sessionId: string; factCount: number }
  | { type: 'no_reply_housekeeping'; sessionId: string; action: string };

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Estimate token count for a string (roughly 4 chars per token for English)
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  // More accurate estimation: ~4 chars per token for English
  // But code and special characters may vary
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total tokens for messages
 */
function estimateSessionTokens(messages: SessionMessage[]): number {
  return messages.reduce((total, msg) => {
    let tokens = estimateTokens(msg.content);
    // Add overhead for role, formatting
    tokens += 4; // Role token + formatting
    // Tool calls add extra tokens
    if (msg.toolCalls) {
      msg.toolCalls.forEach(tc => {
        tokens += estimateTokens(tc.name);
        tokens += estimateTokens(JSON.stringify(tc.arguments || {}));
        if (tc.result) {
          tokens += estimateTokens(typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result));
        }
      });
    }
    return total + tokens;
  }, 0);
}

// ============================================================================
// Message Importance Scoring
// ============================================================================

/**
 * Calculate importance score for a message (0-1)
 */
function calculateImportance(message: SessionMessage): number {
  let score = 0.5; // Base score

  // System messages are always important
  if (message.role === 'system') {
    return 1.0;
  }

  // Tool usage indicates actionable content
  if (message.toolCalls && message.toolCalls.length > 0) {
    score += 0.2;
  }

  // Longer messages may contain more context
  const contentLength = message.content.length;
  if (contentLength > 500) score += 0.1;
  if (contentLength > 1000) score += 0.1;

  // Questions are important (user intent)
  if (message.role === 'user' && message.content.includes('?')) {
    score += 0.15;
  }

  // Code blocks indicate technical discussion
  if (message.content.includes('```')) {
    score += 0.1;
  }

  // Key decision markers
  const decisionMarkers = ['decided', 'agreed', 'confirmed', 'will do', 'chose', 'selected'];
  if (decisionMarkers.some(marker => message.content.toLowerCase().includes(marker))) {
    score += 0.2;
  }

  // Preference expressions
  const preferenceMarkers = ['prefer', 'like', 'want', 'need', 'always', 'never'];
  if (preferenceMarkers.some(marker => message.content.toLowerCase().includes(marker))) {
    score += 0.15;
  }

  return Math.min(1.0, score);
}

// ============================================================================
// Session Compactor Class
// ============================================================================

export class SessionCompactor {
  private config: CompactionConfig;
  private eventListeners: Set<(event: CompactionEvent) => void> = new Set();

  constructor(config?: Partial<CompactionConfig>) {
    this.config = {
      maxTokens: 8000,           // Trigger compaction at 8k tokens
      targetTokens: 4000,        // Compact down to 4k tokens
      minRecentMessages: 10,     // Always keep last 10 messages
      maxMessages: 100,          // Force compact at 100 messages
      useLLMSummary: true,       // Use LLM for smart summaries
      summaryModel: 'gemini-2.5-flash',
      importanceThreshold: 0.4,  // Keep messages above this threshold
      ...config
    };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  on(listener: (event: CompactionEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emit(event: CompactionEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  // ============================================================================
  // Core Compaction Logic
  // ============================================================================

  /**
   * Check if a session needs compaction
   */
  needsCompaction(messages: SessionMessage[]): boolean {
    const tokenCount = estimateSessionTokens(messages);
    return tokenCount > this.config.maxTokens || messages.length > this.config.maxMessages;
  }

  /**
   * Perform compaction on a session
   */
  async compact(session: Session): Promise<CompactedSession> {
    this.emit({
      type: 'compaction_started',
      sessionId: session.id,
      messageCount: session.messages.length
    });

    const startTokens = estimateSessionTokens(session.messages);

    // Score all messages for importance
    const scoredMessages = session.messages.map(msg => ({
      message: msg,
      importance: calculateImportance(msg)
    }));

    // Separate messages to keep vs compress
    const { toKeep, toCompress } = this.partitionMessages(scoredMessages);

    // Generate summary of compressed messages
    const summary = await this.generateSummary(toCompress.map(s => s.message), session.summary);

    // Extract key facts from compressed messages
    const facts = this.extractFacts(toCompress.map(s => s.message));

    this.emit({
      type: 'facts_extracted',
      sessionId: session.id,
      factCount: facts.length
    });

    const endTokens = estimateSessionTokens(toKeep.map(s => s.message)) + estimateTokens(summary);
    const tokensSaved = startTokens - endTokens;

    this.emit({
      type: 'compaction_completed',
      sessionId: session.id,
      tokensSaved
    });

    return {
      sessionId: session.id,
      summary,
      facts,
      recentMessages: toKeep.map(s => s.message),
      compactionMeta: {
        lastCompactedAt: new Date().toISOString(),
        totalMessagesCompacted: toCompress.length,
        totalTokensSaved: tokensSaved,
        compressionRatio: tokensSaved / startTokens,
        summaryVersion: (session.compressedAt ? 2 : 1)
      }
    };
  }

  /**
   * Partition messages into keep vs compress sets
   */
  private partitionMessages(
    scoredMessages: Array<{ message: SessionMessage; importance: number }>
  ): {
    toKeep: Array<{ message: SessionMessage; importance: number }>;
    toCompress: Array<{ message: SessionMessage; importance: number }>;
  } {
    const totalMessages = scoredMessages.length;

    // Always keep the minimum recent messages
    const mustKeep = scoredMessages.slice(-this.config.minRecentMessages);
    const candidates = scoredMessages.slice(0, -this.config.minRecentMessages);

    // Sort candidates by importance (high to low)
    const sortedCandidates = [...candidates].sort((a, b) => b.importance - a.importance);

    // Calculate how many more we can keep within token budget
    let currentTokens = estimateSessionTokens(mustKeep.map(s => s.message));
    const toKeepFromCandidates: typeof sortedCandidates = [];

    for (const scored of sortedCandidates) {
      const msgTokens = estimateSessionTokens([scored.message]);
      if (currentTokens + msgTokens <= this.config.targetTokens &&
          scored.importance >= this.config.importanceThreshold) {
        toKeepFromCandidates.push(scored);
        currentTokens += msgTokens;
      }
    }

    // Combine kept candidates with must-keep messages, maintaining original order
    const toKeep = [...toKeepFromCandidates, ...mustKeep].sort((a, b) => {
      const aIdx = scoredMessages.indexOf(a);
      const bIdx = scoredMessages.indexOf(b);
      return aIdx - bIdx;
    });

    const toCompress = scoredMessages.filter(s => !toKeep.includes(s));

    return { toKeep, toCompress };
  }

  // ============================================================================
  // Summary Generation
  // ============================================================================

  /**
   * Generate a summary of compressed messages
   * Falls back to extractive summary if LLM is not available
   */
  async generateSummary(messages: SessionMessage[], existingSummary?: string): Promise<string> {
    if (messages.length === 0) {
      return existingSummary || '';
    }

    // Build transcript for summarization
    const transcript = this.buildTranscript(messages);

    if (this.config.useLLMSummary) {
      try {
        return await this.generateLLMSummary(transcript, existingSummary);
      } catch (error) {
        console.warn('[SessionCompactor] LLM summary failed, using extractive:', error);
      }
    }

    // Fallback: Extractive summary
    return this.generateExtractiveSummary(messages, existingSummary);
  }

  /**
   * Build a transcript from messages for summarization
   */
  private buildTranscript(messages: SessionMessage[]): TranscriptEntry[] {
    return messages.map(msg => ({
      timestamp: msg.timestamp,
      role: msg.role,
      content: msg.content.slice(0, 500), // Truncate for efficiency
      importance: calculateImportance(msg),
      tokens: estimateTokens(msg.content),
      toolCalls: msg.toolCalls?.map(tc => ({
        name: tc.name,
        result: tc.result ? String(tc.result).slice(0, 200) : undefined
      }))
    }));
  }

  /**
   * Generate summary using LLM (NO_REPLY pattern for housekeeping)
   */
  private async generateLLMSummary(
    transcript: TranscriptEntry[],
    existingSummary?: string
  ): Promise<string> {
    this.emit({
      type: 'no_reply_housekeeping',
      sessionId: 'compactor',
      action: 'generating_summary'
    });

    // Format transcript for summarization
    const transcriptText = transcript.map(entry => {
      let line = `[${entry.role}]: ${entry.content}`;
      if (entry.toolCalls && entry.toolCalls.length > 0) {
        line += ` [Tools: ${entry.toolCalls.map(t => t.name).join(', ')}]`;
      }
      return line;
    }).join('\n');

    const prompt = `Summarize this conversation segment concisely, preserving:
- Key decisions and preferences expressed by the user
- Important context about the task or topic
- Any commitments or action items
- Technical details that might be referenced later

${existingSummary ? `Previous summary to incorporate:\n${existingSummary}\n\n` : ''}
Conversation segment:
${transcriptText}

Provide a concise summary (max 300 words):`;

    // Use the AI service for summarization
    try {
      const { aiService } = await import('./aiService');

      const messages = [
        {
          role: 'system' as const,
          content: 'You are a concise summarizer. Extract and preserve the most important information from conversations. Respond only with the summary, no preamble.'
        },
        {
          role: 'user' as const,
          content: prompt
        }
      ];

      const summary = await aiService.sendMessage(messages);

      this.emit({
        type: 'summary_generated',
        sessionId: 'compactor',
        summaryLength: summary.length
      });

      return summary;
    } catch (error) {
      console.error('[SessionCompactor] LLM summary error:', error);
      throw error;
    }
  }

  /**
   * Generate extractive summary (fallback, no LLM needed)
   */
  private generateExtractiveSummary(messages: SessionMessage[], existingSummary?: string): string {
    const parts: string[] = [];

    if (existingSummary) {
      parts.push(existingSummary);
    }

    // Extract user questions/requests
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      const topics = userMessages
        .slice(0, 5)
        .map(m => m.content.slice(0, 100))
        .join('; ');
      parts.push(`User discussed: ${topics}`);
    }

    // Extract tool usage
    const toolUses = messages
      .filter(m => m.toolCalls && m.toolCalls.length > 0)
      .flatMap(m => m.toolCalls!.map(tc => tc.name));

    if (toolUses.length > 0) {
      const uniqueTools = [...new Set(toolUses)];
      parts.push(`Tools used: ${uniqueTools.join(', ')}`);
    }

    // Extract any decisions
    const decisions = messages.filter(m =>
      m.content.toLowerCase().includes('decided') ||
      m.content.toLowerCase().includes('will do') ||
      m.content.toLowerCase().includes('agreed')
    );

    if (decisions.length > 0) {
      parts.push(`Decisions made: ${decisions.length}`);
    }

    return parts.join('\n\n');
  }

  // ============================================================================
  // Fact Extraction
  // ============================================================================

  /**
   * Extract key facts from messages
   */
  extractFacts(messages: SessionMessage[]): ExtractedFact[] {
    const facts: ExtractedFact[] = [];

    for (const msg of messages) {
      // Extract preferences
      const preferencePatterns = [
        /I (?:prefer|like|want|need) (.+?)(?:\.|,|$)/gi,
        /(?:always|never) (.+?)(?:\.|,|$)/gi
      ];

      for (const pattern of preferencePatterns) {
        let match;
        while ((match = pattern.exec(msg.content)) !== null) {
          facts.push({
            id: `fact_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            category: 'preference',
            content: match[0],
            confidence: 0.7,
            sourceMessageIds: [msg.id],
            timestamp: msg.timestamp
          });
        }
      }

      // Extract decisions
      if (msg.content.toLowerCase().includes('decided') ||
          msg.content.toLowerCase().includes('chose') ||
          msg.content.toLowerCase().includes('selected')) {
        facts.push({
          id: `fact_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          category: 'decision',
          content: msg.content.slice(0, 200),
          confidence: 0.8,
          sourceMessageIds: [msg.id],
          timestamp: msg.timestamp
        });
      }

      // Extract context about entities (names, files, projects)
      const entityPatterns = [
        /(?:file|project|app|component|service) (?:called|named) ["']?(\w+)["']?/gi,
        /working on (.+?)(?:\.|,|$)/gi
      ];

      for (const pattern of entityPatterns) {
        let match;
        while ((match = pattern.exec(msg.content)) !== null) {
          facts.push({
            id: `fact_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            category: 'entity',
            content: match[0],
            confidence: 0.6,
            sourceMessageIds: [msg.id],
            timestamp: msg.timestamp
          });
        }
      }
    }

    // Deduplicate similar facts
    return this.deduplicateFacts(facts);
  }

  /**
   * Remove duplicate or very similar facts
   */
  private deduplicateFacts(facts: ExtractedFact[]): ExtractedFact[] {
    const unique: ExtractedFact[] = [];

    for (const fact of facts) {
      const isDuplicate = unique.some(existing =>
        this.factSimilarity(existing, fact) > 0.8
      );

      if (!isDuplicate) {
        unique.push(fact);
      }
    }

    return unique;
  }

  /**
   * Calculate similarity between two facts (0-1)
   */
  private factSimilarity(a: ExtractedFact, b: ExtractedFact): number {
    if (a.category !== b.category) return 0;

    // Simple word overlap for now
    const wordsA = new Set(a.content.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.content.toLowerCase().split(/\s+/));

    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    return intersection.size / union.size;
  }

  // ============================================================================
  // JSONL Transcript Format
  // ============================================================================

  /**
   * Export session as JSONL transcript (one JSON per line)
   */
  exportAsJSONL(session: Session): string {
    const lines: string[] = [];

    // Session metadata
    lines.push(JSON.stringify({
      _type: 'session_meta',
      id: session.id,
      userId: session.userId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }));

    // Summary if exists
    if (session.summary) {
      lines.push(JSON.stringify({
        _type: 'summary',
        content: session.summary,
        compressedAt: session.compressedAt
      }));
    }

    // Messages
    for (const msg of session.messages) {
      lines.push(JSON.stringify({
        _type: 'message',
        ...msg
      }));
    }

    return lines.join('\n');
  }

  /**
   * Import session from JSONL transcript
   */
  importFromJSONL(jsonl: string): Partial<Session> {
    const lines = jsonl.trim().split('\n');
    let meta: Partial<Session> = { messages: [] };

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        switch (entry._type) {
          case 'session_meta':
            meta = { ...meta, ...entry };
            delete (meta as Record<string, unknown>)._type;
            break;
          case 'summary':
            meta.summary = entry.content;
            meta.compressedAt = entry.compressedAt;
            break;
          case 'message':
            delete entry._type;
            meta.messages!.push(entry);
            break;
        }
      } catch (e) {
        console.warn('[SessionCompactor] Failed to parse JSONL line:', line);
      }
    }

    return meta;
  }

  // ============================================================================
  // Context Window Building
  // ============================================================================

  /**
   * Build optimized context for LLM from compacted session
   */
  buildContext(compacted: CompactedSession): string {
    const parts: string[] = [];

    // Add summary as system context
    if (compacted.summary) {
      parts.push(`<conversation_summary>\n${compacted.summary}\n</conversation_summary>`);
    }

    // Add key facts
    if (compacted.facts.length > 0) {
      const factsText = compacted.facts
        .filter(f => f.confidence > 0.6)
        .map(f => `- [${f.category}] ${f.content}`)
        .join('\n');
      parts.push(`<key_facts>\n${factsText}\n</key_facts>`);
    }

    // Add recent messages
    const messagesText = compacted.recentMessages
      .map(m => `[${m.role}]: ${m.content}`)
      .join('\n\n');
    parts.push(messagesText);

    return parts.join('\n\n');
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const sessionCompactor = new SessionCompactor();

export default SessionCompactor;
