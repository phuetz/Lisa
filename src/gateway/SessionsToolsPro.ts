/**
 * Lisa Sessions Tools Pro - Agent-to-Agent Communication
 * Based on OpenClaw's sessions_* tools implementation
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface Session {
  id: string;
  name: string;
  agentId: string;
  channelType: 'telegram' | 'discord' | 'whatsapp' | 'webchat' | 'internal';
  channelId?: string;
  peerId?: string;
  peerName?: string;
  status: 'active' | 'idle' | 'busy' | 'offline';
  createdAt: Date;
  lastActivity: Date;
  metadata?: Record<string, unknown>;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface SessionHistory {
  sessionId: string;
  messages: SessionMessage[];
  totalMessages: number;
  truncated: boolean;
}

export interface SendOptions {
  replyBack?: boolean;
  announceSkip?: boolean;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
}

export interface SpawnOptions {
  channelType: Session['channelType'];
  agentConfig?: Record<string, unknown>;
  initialMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export class SessionsToolsPro extends BrowserEventEmitter {
  private sessions: Map<string, Session> = new Map();
  private histories: Map<string, SessionMessage[]> = new Map();
  private messageHandlers: Map<string, (msg: SessionMessage) => Promise<string>> = new Map();

  constructor() {
    super();
  }

  /**
   * List all active sessions
   */
  async sessionsList(filter?: { status?: Session['status']; channelType?: Session['channelType'] }): Promise<Session[]> {
    let sessions = Array.from(this.sessions.values());

    if (filter?.status) {
      sessions = sessions.filter((s) => s.status === filter.status);
    }
    if (filter?.channelType) {
      sessions = sessions.filter((s) => s.channelType === filter.channelType);
    }

    return sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  /**
   * Get session history (transcript)
   */
  async sessionsHistory(
    sessionId: string,
    options?: { limit?: number; before?: Date; after?: Date }
  ): Promise<SessionHistory> {
    const messages = this.histories.get(sessionId) || [];
    let filtered = [...messages];

    if (options?.before) {
      filtered = filtered.filter((m) => m.timestamp < options.before!);
    }
    if (options?.after) {
      filtered = filtered.filter((m) => m.timestamp > options.after!);
    }

    const limit = options?.limit || 50;
    const truncated = filtered.length > limit;
    const result = filtered.slice(-limit);

    return {
      sessionId,
      messages: result,
      totalMessages: messages.length,
      truncated,
    };
  }

  /**
   * Send a message to another session
   */
  async sessionsSend(
    targetSessionId: string,
    content: string,
    options?: SendOptions
  ): Promise<SendResult> {
    const session = this.sessions.get(targetSessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.status === 'offline') {
      return { success: false, error: 'Session is offline' };
    }

    const messageId = this.generateId();
    const message: SessionMessage = {
      id: messageId,
      sessionId: targetSessionId,
      role: 'user',
      content,
      timestamp: new Date(),
      metadata: { priority: options?.priority || 'normal' },
    };

    // Add to history
    this.addToHistory(targetSessionId, message);
    session.lastActivity = new Date();

    this.emit('messageSent', { sessionId: targetSessionId, message });

    // Get handler for this session
    const handler = this.messageHandlers.get(targetSessionId);
    
    if (options?.replyBack && handler) {
      try {
        const response = await Promise.race([
          handler(message),
          this.timeout(options.timeout || 30000),
        ]);

        if (typeof response === 'string') {
          const responseMessage: SessionMessage = {
            id: this.generateId(),
            sessionId: targetSessionId,
            role: 'assistant',
            content: response,
            timestamp: new Date(),
          };
          this.addToHistory(targetSessionId, responseMessage);

          return { success: true, messageId, response };
        }
      } catch (error) {
        return {
          success: false,
          messageId,
          error: error instanceof Error ? error.message : 'Timeout',
        };
      }
    }

    return { success: true, messageId };
  }

  /**
   * Spawn a new session
   */
  async sessionsSpawn(name: string, options: SpawnOptions): Promise<Session> {
    const sessionId = this.generateId();
    
    const session: Session = {
      id: sessionId,
      name,
      agentId: `agent-${sessionId}`,
      channelType: options.channelType,
      status: 'active',
      createdAt: new Date(),
      lastActivity: new Date(),
      metadata: options.agentConfig,
    };

    this.sessions.set(sessionId, session);
    this.histories.set(sessionId, []);

    // Add initial messages if provided
    if (options.initialMessages) {
      for (const msg of options.initialMessages) {
        this.addToHistory(sessionId, {
          id: this.generateId(),
          sessionId,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(),
        });
      }
    }

    this.emit('sessionSpawned', session);
    return session;
  }

  /**
   * Close/terminate a session
   */
  async sessionsClose(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'offline';
    this.emit('sessionClosed', session);

    // Optionally remove from active sessions after a delay
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 60000);

    return true;
  }

  /**
   * Register the current session
   */
  registerSession(session: Omit<Session, 'id' | 'createdAt' | 'lastActivity'>): Session {
    const sessionId = this.generateId();
    const fullSession: Session = {
      ...session,
      id: sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, fullSession);
    this.histories.set(sessionId, []);

    this.emit('sessionRegistered', fullSession);
    return fullSession;
  }

  /**
   * Set message handler for a session
   */
  setMessageHandler(
    sessionId: string,
    handler: (msg: SessionMessage) => Promise<string>
  ): void {
    this.messageHandlers.set(sessionId, handler);
  }

  /**
   * Update session status
   */
  updateSessionStatus(sessionId: string, status: Session['status']): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.lastActivity = new Date();
      this.emit('sessionStatusChanged', { sessionId, status });
    }
  }

  /**
   * Add a message to session history
   */
  addToHistory(sessionId: string, message: SessionMessage): void {
    const history = this.histories.get(sessionId) || [];
    history.push(message);
    
    // Keep only last 1000 messages
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    this.histories.set(sessionId, history);
    this.emit('messageAdded', { sessionId, message });
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a channel
   */
  getSessionsByChannel(channelType: Session['channelType']): Session[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.channelType === channelType
    );
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), ms);
    });
  }
}

// Singleton instance
let instance: SessionsToolsPro | null = null;

export function getSessionsTools(): SessionsToolsPro {
  if (!instance) {
    instance = new SessionsToolsPro();
  }
  return instance;
}

export function resetSessionsTools(): void {
  if (instance) {
    instance.removeAllListeners();
    instance = null;
  }
}
