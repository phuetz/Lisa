/**
 * Channel Session Manager - OpenClaw-Inspired Per-Channel Isolation
 *
 * Provides isolated session management per channel/context, ensuring
 * conversations in different channels don't leak context to each other.
 *
 * Features:
 * - Per-channel session isolation
 * - Multi-user support within channels
 * - Session lifecycle management (create, reset, expire)
 * - Cross-channel memory sharing (opt-in only)
 * - Channel-specific configuration
 */

import type { Session, SessionMessage } from './SessionStore';

// ============================================================================
// Browser-compatible EventEmitter
// ============================================================================

type EventCallback = (...args: unknown[]) => void;

class BrowserEventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return this;
  }

  off(event: string, callback: EventCallback): this {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const callbacks = this.listeners.get(event);
    if (!callbacks || callbacks.size === 0) {
      return false;
    }
    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`[ChannelSessionManager] Error in event listener for ${event}:`, error);
      }
    });
    return true;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }
}
import { sessionCompactor, type CompactedSession } from './SessionCompactor';

// ============================================================================
// Types
// ============================================================================

export type ChannelType =
  | 'chat'           // Main chat interface
  | 'voice'          // Voice assistant
  | 'workflow'       // Workflow automation
  | 'agent'          // Agent-specific channel
  | 'api'            // External API calls
  | 'mobile'         // Mobile app
  | 'webhook'        // Webhook integrations
  | 'custom';        // Custom channel type

export interface Channel {
  /** Unique channel identifier */
  id: string;
  /** Channel type */
  type: ChannelType;
  /** Human-readable name */
  name: string;
  /** Channel-specific configuration */
  config: ChannelConfig;
  /** Creation timestamp */
  createdAt: string;
  /** Last activity timestamp */
  lastActivityAt: string;
  /** Active session ID for this channel */
  activeSessionId: string | null;
  /** User ID associated with this channel */
  userId?: string;
}

export interface ChannelConfig {
  /** Maximum session duration (ms) */
  maxSessionDuration: number;
  /** Idle timeout before session reset (ms) */
  idleTimeout: number;
  /** Enable session compaction */
  enableCompaction: boolean;
  /** Enable cross-channel memory sharing */
  enableCrossChannelMemory: boolean;
  /** Maximum messages per session */
  maxMessages: number;
  /** Custom system prompt for this channel */
  systemPrompt?: string;
  /** Allowed tools for this channel */
  allowedTools?: string[];
  /** Rate limit (messages per minute) */
  rateLimit?: number;
}

export interface ChannelSession {
  /** Session data */
  session: Session;
  /** Compacted version if available */
  compacted?: CompactedSession;
  /** Channel this session belongs to */
  channelId: string;
  /** Number of interactions in this session */
  interactionCount: number;
  /** Rate limiting state */
  rateLimitState: RateLimitState;
}

interface RateLimitState {
  /** Messages sent in current window */
  count: number;
  /** Window start timestamp */
  windowStart: number;
}

export type ChannelEvent =
  | { type: 'channel_created'; channel: Channel }
  | { type: 'channel_deleted'; channelId: string }
  | { type: 'session_created'; channelId: string; sessionId: string }
  | { type: 'session_reset'; channelId: string; reason: string }
  | { type: 'session_expired'; channelId: string; sessionId: string }
  | { type: 'rate_limited'; channelId: string; retryAfterMs: number }
  | { type: 'cross_channel_sync'; sourceChannelId: string; targetChannelId: string };

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_CHANNEL_CONFIG: ChannelConfig = {
  maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
  idleTimeout: 30 * 60 * 1000,              // 30 minutes
  enableCompaction: true,
  enableCrossChannelMemory: false,
  maxMessages: 100,
  rateLimit: 60                              // 60 messages per minute
};

const CHANNEL_TYPE_CONFIGS: Record<ChannelType, Partial<ChannelConfig>> = {
  chat: {
    maxSessionDuration: 24 * 60 * 60 * 1000,
    idleTimeout: 60 * 60 * 1000,           // 1 hour for chat
    enableCrossChannelMemory: true
  },
  voice: {
    maxSessionDuration: 60 * 60 * 1000,    // 1 hour max for voice
    idleTimeout: 5 * 60 * 1000,            // 5 minutes idle
    maxMessages: 50
  },
  workflow: {
    maxSessionDuration: 4 * 60 * 60 * 1000, // 4 hours for workflows
    idleTimeout: 30 * 60 * 1000,
    enableCompaction: false,                // Keep full context for workflows
    maxMessages: 200
  },
  agent: {
    maxSessionDuration: 2 * 60 * 60 * 1000,
    idleTimeout: 15 * 60 * 1000,
    enableCompaction: true,
    maxMessages: 150
  },
  api: {
    maxSessionDuration: 60 * 60 * 1000,     // 1 hour for API
    idleTimeout: 10 * 60 * 1000,
    enableCrossChannelMemory: false,
    rateLimit: 120
  },
  mobile: {
    maxSessionDuration: 24 * 60 * 60 * 1000,
    idleTimeout: 30 * 60 * 1000,
    enableCrossChannelMemory: true
  },
  webhook: {
    maxSessionDuration: 60 * 60 * 1000,
    idleTimeout: 5 * 60 * 1000,
    enableCrossChannelMemory: false,
    rateLimit: 30
  },
  custom: {}
};

// ============================================================================
// Channel Session Manager
// ============================================================================

class ChannelSessionManagerImpl extends BrowserEventEmitter {
  private channels: Map<string, Channel> = new Map();
  private sessions: Map<string, ChannelSession> = new Map();
  private channelSessions: Map<string, string> = new Map(); // channelId -> sessionId
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private sharedMemory: Map<string, SessionMessage[]> = new Map(); // userId -> shared messages

  constructor() {
    super();
    this.startCleanupTimer();
    this.loadFromStorage();
  }

  // ============================================================================
  // Channel Management
  // ============================================================================

  /**
   * Create or get a channel
   */
  getOrCreateChannel(
    channelId: string,
    type: ChannelType = 'chat',
    name?: string,
    config?: Partial<ChannelConfig>,
    userId?: string
  ): Channel {
    let channel = this.channels.get(channelId);

    if (!channel) {
      const typeConfig = CHANNEL_TYPE_CONFIGS[type];
      channel = {
        id: channelId,
        type,
        name: name || `${type}-${channelId.slice(0, 8)}`,
        config: {
          ...DEFAULT_CHANNEL_CONFIG,
          ...typeConfig,
          ...config
        },
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        activeSessionId: null,
        userId
      };

      this.channels.set(channelId, channel);
      this.emit('channel_created', { type: 'channel_created', channel });
      this.saveToStorage();
    }

    return channel;
  }

  /**
   * Get channel by ID
   */
  getChannel(channelId: string): Channel | null {
    return this.channels.get(channelId) || null;
  }

  /**
   * Delete a channel and its session
   */
  deleteChannel(channelId: string): void {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    // Delete associated session
    if (channel.activeSessionId) {
      this.sessions.delete(channel.activeSessionId);
    }

    this.channelSessions.delete(channelId);
    this.channels.delete(channelId);

    this.emit('channel_deleted', { type: 'channel_deleted', channelId });
    this.saveToStorage();
  }

  /**
   * List all channels, optionally filtered by type or user
   */
  listChannels(filter?: { type?: ChannelType; userId?: string }): Channel[] {
    let channels = Array.from(this.channels.values());

    if (filter?.type) {
      channels = channels.filter(c => c.type === filter.type);
    }

    if (filter?.userId) {
      channels = channels.filter(c => c.userId === filter.userId);
    }

    return channels;
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Get or create a session for a channel
   */
  async getOrCreateSession(channelId: string): Promise<ChannelSession> {
    const channel = this.getChannel(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found. Create it first with getOrCreateChannel().`);
    }

    // Check for existing active session
    const existingSessionId = this.channelSessions.get(channelId);
    if (existingSessionId) {
      const existing = this.sessions.get(existingSessionId);
      if (existing && !this.isSessionExpired(existing, channel)) {
        // Update activity timestamp
        channel.lastActivityAt = new Date().toISOString();
        existing.session.updatedAt = new Date().toISOString();
        return existing;
      }

      // Session expired, clean it up
      if (existing) {
        this.emit('session_expired', {
          type: 'session_expired',
          channelId,
          sessionId: existingSessionId
        });
        this.sessions.delete(existingSessionId);
      }
    }

    // Create new session
    const sessionId = `session_${channelId}_${Date.now()}`;
    const session: Session = {
      id: sessionId,
      userId: channel.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      context: {
        channelId,
        channelType: channel.type
      },
      messageCount: 0
    };

    // Load shared memory if cross-channel memory is enabled
    if (channel.config.enableCrossChannelMemory && channel.userId) {
      const sharedMessages = this.sharedMemory.get(channel.userId) || [];
      if (sharedMessages.length > 0) {
        // Add summary of shared memory as context
        session.context.sharedMemory = sharedMessages.slice(-10).map(m => ({
          role: m.role,
          content: m.content.slice(0, 200),
          timestamp: m.timestamp
        }));
      }
    }

    const channelSession: ChannelSession = {
      session,
      channelId,
      interactionCount: 0,
      rateLimitState: {
        count: 0,
        windowStart: Date.now()
      }
    };

    this.sessions.set(sessionId, channelSession);
    this.channelSessions.set(channelId, sessionId);
    channel.activeSessionId = sessionId;
    channel.lastActivityAt = new Date().toISOString();

    this.emit('session_created', {
      type: 'session_created',
      channelId,
      sessionId
    });

    this.saveToStorage();
    return channelSession;
  }

  /**
   * Check if a session is expired
   */
  private isSessionExpired(session: ChannelSession, channel: Channel): boolean {
    const now = Date.now();
    const createdAt = new Date(session.session.createdAt).getTime();
    const updatedAt = new Date(session.session.updatedAt).getTime();

    // Check max session duration
    if (now - createdAt > channel.config.maxSessionDuration) {
      return true;
    }

    // Check idle timeout
    if (now - updatedAt > channel.config.idleTimeout) {
      return true;
    }

    // Check max messages
    if (session.session.messageCount >= channel.config.maxMessages) {
      return true;
    }

    return false;
  }

  /**
   * Add a message to a channel's session
   */
  async addMessage(
    channelId: string,
    message: Omit<SessionMessage, 'id' | 'timestamp'>
  ): Promise<SessionMessage> {
    const channelSession = await this.getOrCreateSession(channelId);
    const channel = this.getChannel(channelId)!;

    // Check rate limit
    const rateLimited = this.checkRateLimit(channelSession, channel);
    if (rateLimited) {
      const retryAfterMs = 60000 - (Date.now() - channelSession.rateLimitState.windowStart);
      this.emit('rate_limited', {
        type: 'rate_limited',
        channelId,
        retryAfterMs
      });
      throw new Error(`Rate limited. Retry after ${Math.ceil(retryAfterMs / 1000)} seconds.`);
    }

    // Create full message
    const fullMessage: SessionMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString()
    };

    // Add to session
    channelSession.session.messages.push(fullMessage);
    channelSession.session.messageCount++;
    channelSession.session.updatedAt = new Date().toISOString();
    channelSession.interactionCount++;

    // Update rate limit state
    channelSession.rateLimitState.count++;

    // Update channel activity
    channel.lastActivityAt = new Date().toISOString();

    // Add to shared memory if enabled
    if (channel.config.enableCrossChannelMemory && channel.userId) {
      this.addToSharedMemory(channel.userId, fullMessage);
    }

    // Check if compaction needed
    if (channel.config.enableCompaction) {
      const needsCompaction = sessionCompactor.needsCompaction(channelSession.session.messages);
      if (needsCompaction) {
        await this.compactSession(channelId);
      }
    }

    this.saveToStorage();
    return fullMessage;
  }

  /**
   * Check rate limit for a session
   */
  private checkRateLimit(session: ChannelSession, channel: Channel): boolean {
    if (!channel.config.rateLimit) return false;

    const now = Date.now();
    const windowDuration = 60000; // 1 minute window

    // Reset window if expired
    if (now - session.rateLimitState.windowStart >= windowDuration) {
      session.rateLimitState = {
        count: 0,
        windowStart: now
      };
      return false;
    }

    return session.rateLimitState.count >= channel.config.rateLimit;
  }

  /**
   * Add message to cross-channel shared memory
   */
  private addToSharedMemory(userId: string, message: SessionMessage): void {
    if (!this.sharedMemory.has(userId)) {
      this.sharedMemory.set(userId, []);
    }

    const memories = this.sharedMemory.get(userId)!;

    // Only keep important messages in shared memory
    const isImportant =
      message.role === 'user' ||
      message.content.includes('preference') ||
      message.content.includes('always') ||
      message.content.includes('never');

    if (isImportant) {
      memories.push(message);

      // Limit shared memory size
      if (memories.length > 50) {
        memories.shift();
      }
    }
  }

  /**
   * Get messages from a channel's session
   */
  async getMessages(channelId: string, limit?: number): Promise<SessionMessage[]> {
    const channelSession = await this.getOrCreateSession(channelId);

    if (limit) {
      return channelSession.session.messages.slice(-limit);
    }

    return channelSession.session.messages;
  }

  /**
   * Reset a channel's session
   */
  async resetSession(channelId: string, reason: string = 'manual'): Promise<void> {
    const channel = this.getChannel(channelId);
    if (!channel) return;

    // Delete current session
    if (channel.activeSessionId) {
      this.sessions.delete(channel.activeSessionId);
    }

    this.channelSessions.delete(channelId);
    channel.activeSessionId = null;

    this.emit('session_reset', {
      type: 'session_reset',
      channelId,
      reason
    });

    this.saveToStorage();
  }

  /**
   * Compact a channel's session
   */
  async compactSession(channelId: string): Promise<CompactedSession | null> {
    const sessionId = this.channelSessions.get(channelId);
    if (!sessionId) return null;

    const channelSession = this.sessions.get(sessionId);
    if (!channelSession) return null;

    try {
      const compacted = await sessionCompactor.compact(channelSession.session);
      channelSession.compacted = compacted;

      // Update session with compacted messages
      channelSession.session.messages = compacted.recentMessages;
      channelSession.session.summary = compacted.summary;
      channelSession.session.compressedAt = new Date().toISOString();

      this.saveToStorage();
      return compacted;
    } catch (error) {
      console.error('[ChannelSessionManager] Compaction failed:', error);
      return null;
    }
  }

  /**
   * Sync memory between channels for the same user
   */
  syncCrossChannelMemory(sourceChannelId: string, targetChannelId: string): void {
    const sourceChannel = this.getChannel(sourceChannelId);
    const targetChannel = this.getChannel(targetChannelId);

    if (!sourceChannel || !targetChannel) return;
    if (sourceChannel.userId !== targetChannel.userId) {
      console.warn('[ChannelSessionManager] Cannot sync channels with different users');
      return;
    }

    if (!sourceChannel.config.enableCrossChannelMemory ||
        !targetChannel.config.enableCrossChannelMemory) {
      console.warn('[ChannelSessionManager] Cross-channel memory not enabled');
      return;
    }

    this.emit('cross_channel_sync', {
      type: 'cross_channel_sync',
      sourceChannelId,
      targetChannelId
    });
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /**
   * Start periodic cleanup
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    for (const [channelId, channel] of this.channels.entries()) {
      if (!channel.activeSessionId) continue;

      const session = this.sessions.get(channel.activeSessionId);
      if (!session) continue;

      if (this.isSessionExpired(session, channel)) {
        this.emit('session_expired', {
          type: 'session_expired',
          channelId,
          sessionId: channel.activeSessionId
        });

        this.sessions.delete(channel.activeSessionId);
        this.channelSessions.delete(channelId);
        channel.activeSessionId = null;
      }
    }

    this.saveToStorage();
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  private saveToStorage(): void {
    try {
      const data = {
        channels: Array.from(this.channels.entries()),
        sessions: Array.from(this.sessions.entries()),
        channelSessions: Array.from(this.channelSessions.entries()),
        sharedMemory: Array.from(this.sharedMemory.entries())
      };
      localStorage.setItem('lisa:channel-sessions', JSON.stringify(data));
    } catch (error) {
      console.warn('[ChannelSessionManager] Failed to save to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('lisa:channel-sessions');
      if (!stored) return;

      const data = JSON.parse(stored);
      this.channels = new Map(data.channels || []);
      this.sessions = new Map(data.sessions || []);
      this.channelSessions = new Map(data.channelSessions || []);
      this.sharedMemory = new Map(data.sharedMemory || []);
    } catch (error) {
      console.warn('[ChannelSessionManager] Failed to load from storage:', error);
    }
  }

  // ============================================================================
  // Stats and Debugging
  // ============================================================================

  /**
   * Get statistics about channels and sessions
   */
  getStats(): {
    totalChannels: number;
    activeSessions: number;
    channelsByType: Record<ChannelType, number>;
    totalMessages: number;
    sharedMemoryUsers: number;
  } {
    const channelsByType: Record<ChannelType, number> = {
      chat: 0, voice: 0, workflow: 0, agent: 0,
      api: 0, mobile: 0, webhook: 0, custom: 0
    };

    for (const channel of this.channels.values()) {
      channelsByType[channel.type]++;
    }

    let totalMessages = 0;
    for (const session of this.sessions.values()) {
      totalMessages += session.session.messageCount;
    }

    return {
      totalChannels: this.channels.size,
      activeSessions: this.sessions.size,
      channelsByType,
      totalMessages,
      sharedMemoryUsers: this.sharedMemory.size
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const channelSessionManager = new ChannelSessionManagerImpl();

export default ChannelSessionManagerImpl;
