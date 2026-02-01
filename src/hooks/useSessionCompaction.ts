/**
 * useSessionCompaction Hook
 * Provides session compaction functionality for long conversations
 *
 * OpenClaw-inspired patterns:
 * - Automatic compaction before context window limit
 * - Background summarization (NO_REPLY pattern)
 * - Fact extraction and persistence
 * - JSONL transcript export/import
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useChatHistoryStore } from '../store/chatHistoryStore';
import {
  sessionCompactor,
  type CompactedSession,
  type CompactionEvent,
  type ExtractedFact
} from '../services/SessionCompactor';
import type { SessionMessage } from '../services/SessionStore';
import type { Message, Conversation } from '../types/chat';

// ============================================================================
// Types
// ============================================================================

export interface CompactionStatus {
  /** Whether compaction is in progress */
  isCompacting: boolean;
  /** Current stage of compaction */
  stage: 'idle' | 'analyzing' | 'summarizing' | 'extracting' | 'complete';
  /** Progress percentage (0-100) */
  progress: number;
  /** Last compaction timestamp */
  lastCompactedAt: string | null;
  /** Number of messages compacted */
  messagesCompacted: number;
  /** Tokens saved by compaction */
  tokensSaved: number;
}

export interface UseSessionCompactionOptions {
  /** Auto-compact when threshold reached */
  autoCompact?: boolean;
  /** Token threshold for auto-compaction */
  tokenThreshold?: number;
  /** Message count threshold */
  messageThreshold?: number;
  /** Callback when compaction completes */
  onCompactionComplete?: (result: CompactedSession) => void;
}

export interface UseSessionCompactionResult {
  /** Current compaction status */
  status: CompactionStatus;
  /** Check if current conversation needs compaction */
  needsCompaction: boolean;
  /** Extracted facts from conversation */
  facts: ExtractedFact[];
  /** Conversation summary */
  summary: string | null;
  /** Trigger manual compaction */
  compact: () => Promise<CompactedSession | null>;
  /** Export conversation as JSONL */
  exportAsJSONL: () => string;
  /** Get optimized context for LLM */
  getOptimizedContext: () => string;
  /** Clear compaction data */
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSessionCompaction(
  options: UseSessionCompactionOptions = {}
): UseSessionCompactionResult {
  const {
    autoCompact = true,
    tokenThreshold = 8000,
    messageThreshold = 100,
    onCompactionComplete
  } = options;

  // State
  const [status, setStatus] = useState<CompactionStatus>({
    isCompacting: false,
    stage: 'idle',
    progress: 0,
    lastCompactedAt: null,
    messagesCompacted: 0,
    tokensSaved: 0
  });

  const [facts, setFacts] = useState<ExtractedFact[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [needsCompaction, setNeedsCompaction] = useState(false);

  // Refs
  const compactedSessionRef = useRef<CompactedSession | null>(null);
  const isCompactingRef = useRef(false);

  // Get current conversation from store
  const { getCurrentConversation, currentConversationId } = useChatHistoryStore();

  // ============================================================================
  // Event Handling
  // ============================================================================

  useEffect(() => {
    const unsubscribe = sessionCompactor.on((event: CompactionEvent) => {
      switch (event.type) {
        case 'compaction_started':
          setStatus(prev => ({
            ...prev,
            isCompacting: true,
            stage: 'analyzing',
            progress: 10
          }));
          break;

        case 'summary_generated':
          setStatus(prev => ({
            ...prev,
            stage: 'summarizing',
            progress: 60
          }));
          break;

        case 'facts_extracted':
          setStatus(prev => ({
            ...prev,
            stage: 'extracting',
            progress: 80
          }));
          break;

        case 'compaction_completed':
          setStatus(prev => ({
            ...prev,
            isCompacting: false,
            stage: 'complete',
            progress: 100,
            tokensSaved: prev.tokensSaved + event.tokensSaved,
            lastCompactedAt: new Date().toISOString()
          }));
          break;

        case 'no_reply_housekeeping':
          // Silent background work - no UI update needed
          console.debug('[useSessionCompaction] Background:', event.action);
          break;
      }
    });

    return unsubscribe;
  }, []);

  // ============================================================================
  // Convert Chat Messages to Session Messages
  // ============================================================================

  const convertToSessionMessages = useCallback((messages: Message[]): SessionMessage[] => {
    return messages.map(msg => ({
      id: msg.id,
      role: msg.role as SessionMessage['role'],
      content: msg.content,
      timestamp: msg.timestamp?.toISOString?.() ?? new Date().toISOString(),
      metadata: msg.metadata
    }));
  }, []);

  // ============================================================================
  // Check if Compaction Needed
  // ============================================================================

  useEffect(() => {
    const conversation = getCurrentConversation();
    if (!conversation) {
      setNeedsCompaction(false);
      return;
    }

    const sessionMessages = convertToSessionMessages(conversation.messages);
    const needs = sessionCompactor.needsCompaction(sessionMessages);
    setNeedsCompaction(needs);

    // Auto-compact if enabled and needed
    if (autoCompact && needs && !isCompactingRef.current) {
      console.log('[useSessionCompaction] Auto-compaction triggered');
      // Delay to avoid compacting during active typing
      const timer = setTimeout(() => {
        if (needs && !isCompactingRef.current) {
          compact();
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [getCurrentConversation, currentConversationId, autoCompact, convertToSessionMessages]);

  // ============================================================================
  // Manual Compaction
  // ============================================================================

  const compact = useCallback(async (): Promise<CompactedSession | null> => {
    if (isCompactingRef.current) {
      console.warn('[useSessionCompaction] Compaction already in progress');
      return null;
    }

    const conversation = getCurrentConversation();
    if (!conversation || conversation.messages.length === 0) {
      console.warn('[useSessionCompaction] No conversation to compact');
      return null;
    }

    isCompactingRef.current = true;
    setStatus(prev => ({ ...prev, isCompacting: true, stage: 'analyzing', progress: 0 }));

    try {
      // Convert to session format
      const sessionMessages = convertToSessionMessages(conversation.messages);

      // Create a session object
      const session = {
        id: conversation.id,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messages: sessionMessages,
        context: {},
        messageCount: sessionMessages.length,
        summary: summary || undefined
      };

      // Perform compaction
      const result = await sessionCompactor.compact(session);

      // Update state
      compactedSessionRef.current = result;
      setFacts(result.facts);
      setSummary(result.summary);
      setStatus(prev => ({
        ...prev,
        isCompacting: false,
        stage: 'complete',
        progress: 100,
        messagesCompacted: prev.messagesCompacted + result.compactionMeta.totalMessagesCompacted,
        tokensSaved: prev.tokensSaved + result.compactionMeta.totalTokensSaved,
        lastCompactedAt: result.compactionMeta.lastCompactedAt
      }));

      setNeedsCompaction(false);

      // Notify callback
      if (onCompactionComplete) {
        onCompactionComplete(result);
      }

      return result;
    } catch (error) {
      console.error('[useSessionCompaction] Compaction failed:', error);
      setStatus(prev => ({
        ...prev,
        isCompacting: false,
        stage: 'idle',
        progress: 0
      }));
      return null;
    } finally {
      isCompactingRef.current = false;
    }
  }, [getCurrentConversation, convertToSessionMessages, summary, onCompactionComplete]);

  // ============================================================================
  // Export as JSONL
  // ============================================================================

  const exportAsJSONL = useCallback((): string => {
    const conversation = getCurrentConversation();
    if (!conversation) return '';

    const session = {
      id: conversation.id,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: convertToSessionMessages(conversation.messages),
      context: {},
      messageCount: conversation.messages.length,
      summary: summary || undefined
    };

    return sessionCompactor.exportAsJSONL(session);
  }, [getCurrentConversation, convertToSessionMessages, summary]);

  // ============================================================================
  // Get Optimized Context
  // ============================================================================

  const getOptimizedContext = useCallback((): string => {
    if (!compactedSessionRef.current) {
      // No compaction yet, return recent messages only
      const conversation = getCurrentConversation();
      if (!conversation) return '';

      return conversation.messages
        .slice(-10)
        .map(m => `[${m.role}]: ${m.content}`)
        .join('\n\n');
    }

    return sessionCompactor.buildContext(compactedSessionRef.current);
  }, [getCurrentConversation]);

  // ============================================================================
  // Reset
  // ============================================================================

  const reset = useCallback(() => {
    compactedSessionRef.current = null;
    setFacts([]);
    setSummary(null);
    setNeedsCompaction(false);
    setStatus({
      isCompacting: false,
      stage: 'idle',
      progress: 0,
      lastCompactedAt: null,
      messagesCompacted: 0,
      tokensSaved: 0
    });
  }, []);

  // Reset when conversation changes
  useEffect(() => {
    reset();
  }, [currentConversationId, reset]);

  return {
    status,
    needsCompaction,
    facts,
    summary,
    compact,
    exportAsJSONL,
    getOptimizedContext,
    reset
  };
}

export default useSessionCompaction;
