/**
 * Lisa Gateway Server
 * WebSocket-based control plane for sessions, channels, tools, and events
 * Inspired by OpenClaw's Gateway architecture
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';
import type {
  GatewayConfig,
  GatewayMessage,
  GatewayMessageType,
  Session,
  SessionMetadata,
  Channel,
  ChannelType,
  Presence,
  MessagePayload,
  StreamChunk,
  ToolInvocation,
  ToolResult
} from './types';
import { DEFAULT_GATEWAY_CONFIG } from './types';

type MessageHandler = (message: GatewayMessage, ws: WebSocket) => Promise<void>;

export class GatewayServer extends BrowserEventEmitter {
  private config: GatewayConfig;
  private sessions: Map<string, Session> = new Map();
  private channels: Map<string, Channel> = new Map();
  private presence: Map<string, Presence> = new Map();
  private clients: Map<string, WebSocket> = new Map();
  private messageHandlers: Map<GatewayMessageType, MessageHandler> = new Map();
  private pruneInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<GatewayConfig> = {}) {
    super();
    this.config = { ...DEFAULT_GATEWAY_CONFIG, ...config };
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Session handlers
    this.messageHandlers.set('session.create', this.handleSessionCreate.bind(this));
    this.messageHandlers.set('session.update', this.handleSessionUpdate.bind(this));
    this.messageHandlers.set('session.close', this.handleSessionClose.bind(this));
    this.messageHandlers.set('session.list', this.handleSessionList.bind(this));

    // Message handlers
    this.messageHandlers.set('message.send', this.handleMessageSend.bind(this));

    // Tool handlers
    this.messageHandlers.set('tool.invoke', this.handleToolInvoke.bind(this));

    // Channel handlers
    this.messageHandlers.set('channel.connect', this.handleChannelConnect.bind(this));
    this.messageHandlers.set('channel.disconnect', this.handleChannelDisconnect.bind(this));
    this.messageHandlers.set('channel.status', this.handleChannelStatus.bind(this));

    // Presence handlers
    this.messageHandlers.set('presence.update', this.handlePresenceUpdate.bind(this));
  }

  // Session Management
  async createSession(
    userId: string,
    channelType: ChannelType,
    metadata: SessionMetadata = {}
  ): Promise<Session> {
    const sessionId = this.generateId('sess');
    const now = new Date();

    const session: Session = {
      id: sessionId,
      agentId: 'lisa-main',
      channelId: channelType,
      channelType,
      userId,
      metadata,
      status: 'active',
      createdAt: now,
      lastActivityAt: now
    };

    this.sessions.set(sessionId, session);
    this.emit('session:created', session);
    this.broadcast({
      id: this.generateId('msg'),
      type: 'session.create',
      sessionId,
      payload: session,
      timestamp: Date.now()
    });

    return session;
  }

  async updateSession(sessionId: string, updates: Partial<SessionMetadata>): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.metadata = { ...session.metadata, ...updates };
    session.lastActivityAt = new Date();
    this.sessions.set(sessionId, session);

    this.emit('session:updated', session);
    return session;
  }

  async closeSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'closed';
    this.sessions.delete(sessionId);
    this.presence.delete(sessionId);

    this.emit('session:closed', { sessionId });
    return true;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(userId?: string): Session[] {
    const sessions = Array.from(this.sessions.values());
    if (userId) {
      return sessions.filter(s => s.userId === userId);
    }
    return sessions;
  }

  // Message Handling
  async sendMessage(sessionId: string, payload: MessagePayload): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.lastActivityAt = new Date();
    
    const message: GatewayMessage<MessagePayload> = {
      id: this.generateId('msg'),
      type: 'message.receive',
      sessionId,
      channelId: session.channelId,
      payload,
      timestamp: Date.now()
    };

    this.emit('message:received', message);
    this.broadcastToSession(sessionId, message);
  }

  async streamMessage(sessionId: string, chunk: StreamChunk): Promise<void> {
    const message: GatewayMessage<StreamChunk> = {
      id: this.generateId('chunk'),
      type: 'message.stream',
      sessionId,
      payload: chunk,
      timestamp: Date.now()
    };

    this.emit('message:streamed', message);
    this.broadcastToSession(sessionId, message);
  }

  // Tool Handling
  async invokeTool(invocation: ToolInvocation): Promise<ToolResult> {
    const startTime = Date.now();
    
    this.emit('tool:invoked', invocation);

    try {
      // Tool execution will be handled by the tool registry
      const result = await this.executeToolInternal(invocation);
      
      const toolResult: ToolResult = {
        toolId: invocation.toolId,
        success: true,
        result,
        duration: Date.now() - startTime
      };

      this.emit('tool:completed', toolResult);
      return toolResult;
    } catch (error) {
      const toolResult: ToolResult = {
        toolId: invocation.toolId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      };

      this.emit('tool:completed', toolResult);
      return toolResult;
    }
  }

  private async executeToolInternal(invocation: ToolInvocation): Promise<unknown> {
    // This will be connected to Lisa's tool system
    // For now, emit an event for external handling
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tool execution timeout'));
      }, 30000);

      this.once(`tool:result:${invocation.toolId}`, (result: unknown) => {
        clearTimeout(timeout);
        resolve(result);
      });
    });
  }

  // Channel Management
  async connectChannel(type: ChannelType, config: Channel['config']): Promise<Channel> {
    const channelId = this.generateId('ch');
    
    const channel: Channel = {
      id: channelId,
      type,
      name: `${type}-${channelId.slice(-4)}`,
      config,
      status: 'connected'
    };

    this.channels.set(channelId, channel);
    this.emit('channel:connected', channel);
    
    return channel;
  }

  async disconnectChannel(channelId: string): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    channel.status = 'disconnected';
    this.channels.delete(channelId);
    
    this.emit('channel:disconnected', { channelId });
    return true;
  }

  getChannel(channelId: string): Channel | undefined {
    return this.channels.get(channelId);
  }

  listChannels(): Channel[] {
    return Array.from(this.channels.values());
  }

  // Presence Management
  updatePresence(sessionId: string, status: Presence['status']): void {
    const presence: Presence = {
      sessionId,
      status,
      lastSeen: new Date()
    };

    this.presence.set(sessionId, presence);
    this.emit('presence:changed', presence);
    
    this.broadcast({
      id: this.generateId('pres'),
      type: 'presence.update',
      sessionId,
      payload: presence,
      timestamp: Date.now()
    });
  }

  getPresence(sessionId: string): Presence | undefined {
    return this.presence.get(sessionId);
  }

  // WebSocket Client Management
  registerClient(clientId: string, ws: WebSocket): void {
    this.clients.set(clientId, ws);
  }

  unregisterClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  // Message Handlers
  private async handleSessionCreate(message: GatewayMessage, _ws: WebSocket): Promise<void> {
    const { userId, channelType, metadata } = message.payload as {
      userId: string;
      channelType: ChannelType;
      metadata?: SessionMetadata;
    };
    await this.createSession(userId, channelType, metadata);
  }

  private async handleSessionUpdate(message: GatewayMessage, _ws: WebSocket): Promise<void> {
    const { sessionId, updates } = message.payload as {
      sessionId: string;
      updates: Partial<SessionMetadata>;
    };
    await this.updateSession(sessionId, updates);
  }

  private async handleSessionClose(message: GatewayMessage, _ws: WebSocket): Promise<void> {
    const { sessionId } = message.payload as { sessionId: string };
    await this.closeSession(sessionId);
  }

  private async handleSessionList(message: GatewayMessage, ws: WebSocket): Promise<void> {
    const { userId } = message.payload as { userId?: string };
    const sessions = this.listSessions(userId);
    
    this.sendToClient(ws, {
      id: this.generateId('resp'),
      type: 'session.list',
      payload: sessions,
      timestamp: Date.now()
    });
  }

  private async handleMessageSend(message: GatewayMessage, _ws: WebSocket): Promise<void> {
    const { sessionId, content, attachments } = message.payload as {
      sessionId: string;
      content: string;
      attachments?: MessagePayload['attachments'];
    };
    
    await this.sendMessage(sessionId, {
      content,
      role: 'user',
      attachments
    });
  }

  private async handleToolInvoke(message: GatewayMessage, ws: WebSocket): Promise<void> {
    const invocation = message.payload as ToolInvocation;
    const result = await this.invokeTool(invocation);
    
    this.sendToClient(ws, {
      id: this.generateId('resp'),
      type: 'tool.result',
      sessionId: invocation.sessionId,
      payload: result,
      timestamp: Date.now()
    });
  }

  private async handleChannelConnect(message: GatewayMessage, ws: WebSocket): Promise<void> {
    const { type, config } = message.payload as {
      type: ChannelType;
      config: Channel['config'];
    };
    
    const channel = await this.connectChannel(type, config);
    
    this.sendToClient(ws, {
      id: this.generateId('resp'),
      type: 'channel.connect',
      payload: channel,
      timestamp: Date.now()
    });
  }

  private async handleChannelDisconnect(message: GatewayMessage, _ws: WebSocket): Promise<void> {
    const { channelId } = message.payload as { channelId: string };
    await this.disconnectChannel(channelId);
  }

  private async handleChannelStatus(_message: GatewayMessage, ws: WebSocket): Promise<void> {
    const channels = this.listChannels();
    
    this.sendToClient(ws, {
      id: this.generateId('resp'),
      type: 'channel.status',
      payload: channels,
      timestamp: Date.now()
    });
  }

  private async handlePresenceUpdate(message: GatewayMessage, _ws: WebSocket): Promise<void> {
    const { sessionId, status } = message.payload as {
      sessionId: string;
      status: Presence['status'];
    };
    this.updatePresence(sessionId, status);
  }

  // Process incoming message
  async processMessage(message: GatewayMessage, ws: WebSocket): Promise<void> {
    const handler = this.messageHandlers.get(message.type);
    
    if (!handler) {
      this.sendError(ws, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${message.type}`);
      return;
    }

    try {
      await handler(message, ws);
    } catch (error) {
      this.sendError(
        ws,
        'HANDLER_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // Broadcasting
  private broadcast(message: GatewayMessage): void {
    const data = JSON.stringify(message);
    this.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  private broadcastToSession(_sessionId: string, message: GatewayMessage): void {
    // In a real implementation, track which clients are subscribed to which sessions
    this.broadcast(message);
  }

  private sendToClient(ws: WebSocket, message: GatewayMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, code: string, errorMessage: string): void {
    this.sendToClient(ws, {
      id: this.generateId('err'),
      type: 'error',
      payload: { code, message: errorMessage },
      timestamp: Date.now()
    });
  }

  // Session Pruning
  startPruning(): void {
    this.pruneInterval = setInterval(() => {
      this.pruneSessions();
    }, this.config.sessions.pruneInterval);
  }

  stopPruning(): void {
    if (this.pruneInterval) {
      clearInterval(this.pruneInterval);
      this.pruneInterval = null;
    }
  }

  private pruneSessions(): void {
    const now = Date.now();
    const idleTimeout = this.config.sessions.idleTimeout;

    this.sessions.forEach((session, _sessionId) => {
      const idleTime = now - session.lastActivityAt.getTime();
      if (idleTime > idleTimeout && session.status === 'active') {
        session.status = 'idle';
        this.emit('session:updated', session);
      }
    });
  }

  // Utilities
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // Getters
  getConfig(): GatewayConfig {
    return this.config;
  }

  getStats(): {
    sessions: number;
    channels: number;
    clients: number;
  } {
    return {
      sessions: this.sessions.size,
      channels: this.channels.size,
      clients: this.clients.size
    };
  }
}

// Singleton instance
let gatewayInstance: GatewayServer | null = null;

export function getGateway(config?: Partial<GatewayConfig>): GatewayServer {
  if (!gatewayInstance) {
    gatewayInstance = new GatewayServer(config);
  }
  return gatewayInstance;
}

export function resetGateway(): void {
  if (gatewayInstance) {
    gatewayInstance.stopPruning();
    gatewayInstance.removeAllListeners();
    gatewayInstance = null;
  }
}

