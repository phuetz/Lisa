/**
 * useChannelSession Hook
 * React hook for per-channel session management
 *
 * OpenClaw-inspired patterns:
 * - Isolated sessions per channel/context
 * - Cross-channel memory sharing (opt-in)
 * - Automatic session lifecycle management
 * - Rate limiting per channel
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  channelSessionManager,
  type Channel,
  type ChannelType,
  type ChannelConfig,
  type ChannelSession,
  type ChannelEvent
} from '../services/ChannelSessionManager';
import type { SessionMessage } from '../services/SessionStore';

// ============================================================================
// Types
// ============================================================================

export interface UseChannelSessionOptions {
  /** Channel type */
  type?: ChannelType;
  /** Custom channel name */
  name?: string;
  /** Channel configuration overrides */
  config?: Partial<ChannelConfig>;
  /** User ID for session */
  userId?: string;
  /** Auto-create session on mount */
  autoCreate?: boolean;
}

export interface UseChannelSessionResult {
  /** Current channel */
  channel: Channel | null;
  /** Current session */
  session: ChannelSession | null;
  /** Messages in current session */
  messages: SessionMessage[];
  /** Whether session is active */
  isActive: boolean;
  /** Whether rate limited */
  isRateLimited: boolean;
  /** Rate limit retry time (ms) */
  rateLimitRetryAfter: number | null;
  /** Add a message to the session */
  addMessage: (message: Omit<SessionMessage, 'id' | 'timestamp'>) => Promise<SessionMessage | null>;
  /** Reset the current session */
  resetSession: (reason?: string) => Promise<void>;
  /** Get session statistics */
  stats: ChannelStats;
  /** Trigger manual compaction */
  compact: () => Promise<void>;
  /** Delete the channel */
  deleteChannel: () => void;
}

export interface ChannelStats {
  messageCount: number;
  interactionCount: number;
  sessionAge: number;
  idleTime: number;
  isCompacted: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useChannelSession(
  channelId: string,
  options: UseChannelSessionOptions = {}
): UseChannelSessionResult {
  const {
    type = 'chat',
    name,
    config,
    userId,
    autoCreate = true
  } = options;

  // State
  const [channel, setChannel] = useState<Channel | null>(null);
  const [session, setSession] = useState<ChannelSession | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(null);

  // ============================================================================
  // Initialize Channel and Session
  // ============================================================================

  useEffect(() => {
    if (!channelId || !autoCreate) return;

    // Get or create channel
    const ch = channelSessionManager.getOrCreateChannel(
      channelId,
      type,
      name,
      config,
      userId
    );
    setChannel(ch);

    // Get or create session
    channelSessionManager.getOrCreateSession(channelId)
      .then(sess => {
        setSession(sess);
        setMessages(sess.session.messages);
      })
      .catch(err => {
        console.error('[useChannelSession] Failed to create session:', err);
      });

    // Listen for channel events
    const handleEvent = (event: ChannelEvent) => {
      if ('channelId' in event && event.channelId !== channelId) return;

      switch (event.type) {
        case 'session_created':
          channelSessionManager.getOrCreateSession(channelId)
            .then(sess => {
              setSession(sess);
              setMessages(sess.session.messages);
            });
          break;

        case 'session_reset':
        case 'session_expired':
          setSession(null);
          setMessages([]);
          break;

        case 'rate_limited':
          setIsRateLimited(true);
          setRateLimitRetryAfter(event.retryAfterMs);
          // Auto-clear rate limit after timeout
          setTimeout(() => {
            setIsRateLimited(false);
            setRateLimitRetryAfter(null);
          }, event.retryAfterMs);
          break;

        case 'channel_deleted':
          setChannel(null);
          setSession(null);
          setMessages([]);
          break;
      }
    };

    channelSessionManager.on('channel_created', handleEvent);
    channelSessionManager.on('session_created', handleEvent);
    channelSessionManager.on('session_reset', handleEvent);
    channelSessionManager.on('session_expired', handleEvent);
    channelSessionManager.on('rate_limited', handleEvent);
    channelSessionManager.on('channel_deleted', handleEvent);

    return () => {
      channelSessionManager.off('channel_created', handleEvent);
      channelSessionManager.off('session_created', handleEvent);
      channelSessionManager.off('session_reset', handleEvent);
      channelSessionManager.off('session_expired', handleEvent);
      channelSessionManager.off('rate_limited', handleEvent);
      channelSessionManager.off('channel_deleted', handleEvent);
    };
  }, [channelId, type, name, config, userId, autoCreate]);

  // ============================================================================
  // Actions
  // ============================================================================

  const addMessage = useCallback(async (
    message: Omit<SessionMessage, 'id' | 'timestamp'>
  ): Promise<SessionMessage | null> => {
    if (!channelId || isRateLimited) {
      return null;
    }

    try {
      const newMessage = await channelSessionManager.addMessage(channelId, message);
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (error) {
      console.error('[useChannelSession] Failed to add message:', error);
      return null;
    }
  }, [channelId, isRateLimited]);

  const resetSession = useCallback(async (reason: string = 'user_request'): Promise<void> => {
    if (!channelId) return;

    await channelSessionManager.resetSession(channelId, reason);
    setSession(null);
    setMessages([]);

    // Recreate session immediately
    const newSession = await channelSessionManager.getOrCreateSession(channelId);
    setSession(newSession);
  }, [channelId]);

  const compact = useCallback(async (): Promise<void> => {
    if (!channelId) return;

    await channelSessionManager.compactSession(channelId);

    // Refresh session
    const refreshed = await channelSessionManager.getOrCreateSession(channelId);
    setSession(refreshed);
    setMessages(refreshed.session.messages);
  }, [channelId]);

  const deleteChannel = useCallback((): void => {
    if (!channelId) return;
    channelSessionManager.deleteChannel(channelId);
  }, [channelId]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isActive = useMemo(() => {
    return channel !== null && session !== null;
  }, [channel, session]);

  const stats = useMemo((): ChannelStats => {
    if (!session) {
      return {
        messageCount: 0,
        interactionCount: 0,
        sessionAge: 0,
        idleTime: 0,
        isCompacted: false
      };
    }

    const now = Date.now();
    const createdAt = new Date(session.session.createdAt).getTime();
    const updatedAt = new Date(session.session.updatedAt).getTime();

    return {
      messageCount: session.session.messageCount,
      interactionCount: session.interactionCount,
      sessionAge: now - createdAt,
      idleTime: now - updatedAt,
      isCompacted: !!session.compacted
    };
  }, [session]);

  return {
    channel,
    session,
    messages,
    isActive,
    isRateLimited,
    rateLimitRetryAfter,
    addMessage,
    resetSession,
    stats,
    compact,
    deleteChannel
  };
}

// ============================================================================
// Utility Hook: useChannelList
// ============================================================================

export function useChannelList(filter?: { type?: ChannelType; userId?: string }) {
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    // Initial load
    setChannels(channelSessionManager.listChannels(filter));

    // Listen for changes
    const handleChange = () => {
      setChannels(channelSessionManager.listChannels(filter));
    };

    channelSessionManager.on('channel_created', handleChange);
    channelSessionManager.on('channel_deleted', handleChange);

    return () => {
      channelSessionManager.off('channel_created', handleChange);
      channelSessionManager.off('channel_deleted', handleChange);
    };
  }, [filter?.type, filter?.userId]);

  return channels;
}

// ============================================================================
// Utility Hook: useChannelStats
// ============================================================================

export function useChannelStats() {
  const [stats, setStats] = useState(channelSessionManager.getStats());

  useEffect(() => {
    const updateStats = () => {
      setStats(channelSessionManager.getStats());
    };

    // Update on any event
    channelSessionManager.on('channel_created', updateStats);
    channelSessionManager.on('channel_deleted', updateStats);
    channelSessionManager.on('session_created', updateStats);
    channelSessionManager.on('session_reset', updateStats);
    channelSessionManager.on('session_expired', updateStats);

    // Periodic update
    const interval = setInterval(updateStats, 30000);

    return () => {
      channelSessionManager.off('channel_created', updateStats);
      channelSessionManager.off('channel_deleted', updateStats);
      channelSessionManager.off('session_created', updateStats);
      channelSessionManager.off('session_reset', updateStats);
      channelSessionManager.off('session_expired', updateStats);
      clearInterval(interval);
    };
  }, []);

  return stats;
}

export default useChannelSession;
