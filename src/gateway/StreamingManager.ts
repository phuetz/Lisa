/**
 * Lisa Streaming Manager
 * Advanced streaming, chunking, and retry policies
 * Inspired by OpenClaw's streaming/chunking system
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface StreamConfig {
  chunkSize: number;
  chunkDelay: number; // ms between chunks
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  typingIndicator: boolean;
}

export interface StreamChunk {
  id: string;
  index: number;
  content: string;
  isLast: boolean;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface StreamSession {
  id: string;
  status: StreamStatus;
  chunks: StreamChunk[];
  totalChunks: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
}

export type StreamStatus = 'pending' | 'streaming' | 'paused' | 'completed' | 'error' | 'cancelled';

export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryOn: string[]; // error types to retry on
}

const DEFAULT_CONFIG: StreamConfig = {
  chunkSize: 500, // characters per chunk
  chunkDelay: 50, // ms
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  typingIndicator: true
};

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT', '5xx']
};

export class StreamingManager extends BrowserEventEmitter {
  private config: StreamConfig;
  private retryPolicy: RetryPolicy;
  private sessions: Map<string, StreamSession> = new Map();
  private activeSessionId: string | null = null;

  constructor(config: Partial<StreamConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.retryPolicy = { ...DEFAULT_RETRY_POLICY };
  }

  private generateSessionId(): string {
    return `stream_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private generateChunkId(): string {
    return `chunk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 4)}`;
  }

  // Configuration
  setConfig(config: Partial<StreamConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:changed', this.config);
  }

  getConfig(): StreamConfig {
    return { ...this.config };
  }

  setRetryPolicy(policy: Partial<RetryPolicy>): void {
    this.retryPolicy = { ...this.retryPolicy, ...policy };
    this.emit('retryPolicy:changed', this.retryPolicy);
  }

  getRetryPolicy(): RetryPolicy {
    return { ...this.retryPolicy };
  }

  // Chunking
  chunkText(text: string, chunkSize?: number): string[] {
    const size = chunkSize || this.config.chunkSize;
    const chunks: string[] = [];

    // Smart chunking - try to break at sentence/paragraph boundaries
    let remaining = text;
    
    while (remaining.length > 0) {
      if (remaining.length <= size) {
        chunks.push(remaining);
        break;
      }

      // Find best break point
      let breakPoint = size;
      
      // Try paragraph break
      const paragraphBreak = remaining.lastIndexOf('\n\n', size);
      if (paragraphBreak > size * 0.5) {
        breakPoint = paragraphBreak + 2;
      } else {
        // Try sentence break
        const sentenceBreaks = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
        for (const sep of sentenceBreaks) {
          const idx = remaining.lastIndexOf(sep, size);
          if (idx > size * 0.5) {
            breakPoint = idx + sep.length;
            break;
          }
        }
      }

      // If no good break point, try word boundary
      if (breakPoint === size) {
        const spaceIdx = remaining.lastIndexOf(' ', size);
        if (spaceIdx > size * 0.7) {
          breakPoint = spaceIdx + 1;
        }
      }

      chunks.push(remaining.slice(0, breakPoint).trim());
      remaining = remaining.slice(breakPoint).trim();
    }

    return chunks;
  }

  // Streaming
  async stream(
    content: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<StreamSession> {
    const sessionId = this.generateSessionId();
    const chunks = this.chunkText(content);

    const session: StreamSession = {
      id: sessionId,
      status: 'pending',
      chunks: [],
      totalChunks: chunks.length,
      startedAt: new Date(),
      retryCount: 0
    };

    this.sessions.set(sessionId, session);
    this.activeSessionId = sessionId;

    session.status = 'streaming';
    this.emit('stream:started', { sessionId, totalChunks: chunks.length });

    if (this.config.typingIndicator) {
      this.emit('typing:start', { sessionId });
    }

    try {
      for (let i = 0; i < chunks.length; i++) {
        // Check current status (cast to allow all status checks)
        const currentStatus = session.status as StreamStatus;
        
        // Check if cancelled
        if (currentStatus === 'cancelled') {
          break;
        }

        // Check if paused
        while ((session.status as StreamStatus) === 'paused') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const chunk: StreamChunk = {
          id: this.generateChunkId(),
          index: i,
          content: chunks[i],
          isLast: i === chunks.length - 1,
          timestamp: new Date()
        };

        session.chunks.push(chunk);
        this.emit('chunk', chunk);
        onChunk?.(chunk);

        // Delay between chunks
        if (!chunk.isLast && this.config.chunkDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.chunkDelay));
        }
      }

      if (session.status !== 'cancelled') {
        session.status = 'completed';
        session.completedAt = new Date();
      }

      this.emit('stream:completed', session);
    } catch (error) {
      session.status = 'error';
      session.error = error instanceof Error ? error.message : String(error);
      this.emit('stream:error', { sessionId, error: session.error });
    } finally {
      if (this.config.typingIndicator) {
        this.emit('typing:stop', { sessionId });
      }
    }

    return session;
  }

  // Stream control
  pause(sessionId?: string): boolean {
    const session = this.getSession(sessionId);
    if (!session || session.status !== 'streaming') return false;

    session.status = 'paused';
    this.emit('stream:paused', { sessionId: session.id });
    return true;
  }

  resume(sessionId?: string): boolean {
    const session = this.getSession(sessionId);
    if (!session || session.status !== 'paused') return false;

    session.status = 'streaming';
    this.emit('stream:resumed', { sessionId: session.id });
    return true;
  }

  cancel(sessionId?: string): boolean {
    const session = this.getSession(sessionId);
    if (!session || session.status === 'completed' || session.status === 'cancelled') return false;

    session.status = 'cancelled';
    this.emit('stream:cancelled', { sessionId: session.id });
    return true;
  }

  // Retry logic
  async withRetry<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryPolicy.baseDelay;

    for (let attempt = 0; attempt <= this.retryPolicy.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.emit('retry:attempt', { attempt, context, delay });
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * this.retryPolicy.backoffMultiplier, this.retryPolicy.maxDelay);
        }

        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const shouldRetry = this.shouldRetry(lastError, attempt);
        if (!shouldRetry) {
          break;
        }

        this.emit('retry:scheduled', { attempt: attempt + 1, error: lastError.message, context });
      }
    }

    this.emit('retry:exhausted', { context, error: lastError?.message });
    throw lastError;
  }

  private shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.retryPolicy.maxRetries) return false;

    const errorType = this.classifyError(error);
    return this.retryPolicy.retryOn.includes(errorType);
  }

  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('timeout')) {
      return 'TIMEOUT';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'RATE_LIMIT';
    }
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return '5xx';
    }
    return 'UNKNOWN';
  }

  // Session management
  getSession(sessionId?: string): StreamSession | null {
    const id = sessionId || this.activeSessionId;
    return id ? this.sessions.get(id) || null : null;
  }

  getSessions(): StreamSession[] {
    return Array.from(this.sessions.values());
  }

  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  clearAllSessions(): void {
    this.sessions.clear();
    this.activeSessionId = null;
  }

  // Typing indicator helpers
  startTyping(channelId?: string): void {
    this.emit('typing:start', { channelId });
  }

  stopTyping(channelId?: string): void {
    this.emit('typing:stop', { channelId });
  }

  // Stats
  getStats(): {
    activeSessions: number;
    completedSessions: number;
    errorSessions: number;
    totalChunks: number;
  } {
    const sessions = Array.from(this.sessions.values());
    return {
      activeSessions: sessions.filter(s => s.status === 'streaming' || s.status === 'paused').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      errorSessions: sessions.filter(s => s.status === 'error').length,
      totalChunks: sessions.reduce((sum, s) => sum + s.chunks.length, 0)
    };
  }
}

// Singleton
let streamingManagerInstance: StreamingManager | null = null;

export function getStreamingManager(): StreamingManager {
  if (!streamingManagerInstance) {
    streamingManagerInstance = new StreamingManager();
  }
  return streamingManagerInstance;
}

export function resetStreamingManager(): void {
  if (streamingManagerInstance) {
    streamingManagerInstance.removeAllListeners();
    streamingManagerInstance = null;
  }
}

