/**
 * Lisa Gateway Server
 * WebSocket-based control plane for sessions, channels, tools, and events
 * Inspired by OpenClaw's Gateway architecture
 *
 * Improvements over initial version:
 * - Tool execution connected to ToolCallingService
 * - Message validation/sanitization on incoming WebSocket messages
 * - maxPerUser enforcement in createSession
 * - Skill install/uninstall/list handlers
 * - Agent spawn/stop/list handlers with multi-agent routing
 * - JWT authentication mode
 * - Permission-based access control
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
  ToolResult,
  SkillDescriptor,
  InstalledSkill,
  AgentInfo,
  AgentRoute,
  AuthResult,
  PermissionMap,
  ValidationResult
} from './types';
import {
  DEFAULT_GATEWAY_CONFIG,
  ROLE_PERMISSIONS,
  MESSAGE_PERMISSIONS
} from './types';

type MessageHandler = (message: GatewayMessage, ws: WebSocket) => Promise<void>;

// Client metadata stored per WebSocket connection
interface ClientInfo {
  id: string;
  ws: WebSocket;
  userId?: string;
  role: 'admin' | 'user' | 'guest';
  connectedAt: Date;
}

// Tool executor interface — allows plugging in ToolCallingService or any executor
export interface ToolExecutor {
  hasTool(name: string): boolean;
  executeTool(call: { id: string; name: string; arguments: Record<string, unknown> }): Promise<{
    tool_call_id: string;
    content: string;
    error?: boolean;
  }>;
}

export class GatewayServer extends BrowserEventEmitter {
  private config: GatewayConfig;
  private sessions: Map<string, Session> = new Map();
  private channels: Map<string, Channel> = new Map();
  private presence: Map<string, Presence> = new Map();
  private clients: Map<string, ClientInfo> = new Map();
  private wsToClientId: Map<WebSocket, string> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // clientId -> set(sessionId)
  private messageHandlers: Map<GatewayMessageType, MessageHandler> = new Map();
  private pruneInterval: ReturnType<typeof setInterval> | null = null;

  // Skills registry
  private skills: Map<string, InstalledSkill> = new Map();

  // Agent registry
  private agents: Map<string, AgentInfo> = new Map();

  // Pluggable tool executor
  private toolExecutor: ToolExecutor | null = null;

  constructor(config: Partial<GatewayConfig> = {}) {
    super();
    this.config = { ...DEFAULT_GATEWAY_CONFIG, ...config };
    this.registerHandlers();
  }

  // ============================================================================
  // Tool Executor Integration
  // ============================================================================

  /**
   * Connect the gateway to Lisa's tool system
   */
  setToolExecutor(executor: ToolExecutor): void {
    this.toolExecutor = executor;
    console.log('[Gateway] Tool executor connected');
  }

  // ============================================================================
  // Message Validation
  // ============================================================================

  /**
   * Validate an incoming gateway message structure
   */
  validateMessage(raw: unknown): ValidationResult {
    const errors: string[] = [];

    if (!raw || typeof raw !== 'object') {
      return { valid: false, errors: ['Message must be a non-null object'] };
    }

    const msg = raw as Record<string, unknown>;

    // Required fields
    if (typeof msg.id !== 'string' || msg.id.length === 0) {
      errors.push('Message must have a non-empty string "id"');
    }
    if (typeof msg.type !== 'string' || msg.type.length === 0) {
      errors.push('Message must have a non-empty string "type"');
    }
    if (typeof msg.timestamp !== 'number' || !Number.isFinite(msg.timestamp)) {
      errors.push('Message must have a finite number "timestamp"');
    }
    if (msg.payload === undefined) {
      errors.push('Message must have a "payload" field');
    }

    // Sanitize string fields to prevent injection
    if (typeof msg.sessionId === 'string' && msg.sessionId.length > 128) {
      errors.push('sessionId exceeds maximum length (128)');
    }
    if (typeof msg.channelId === 'string' && msg.channelId.length > 128) {
      errors.push('channelId exceeds maximum length (128)');
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  /**
   * Authenticate a client based on configured auth mode
   */
  authenticate(authToken?: string): AuthResult {
    const { mode, secret } = this.config.auth;

    if (mode === 'none') {
      return { authenticated: true, role: 'admin' };
    }

    if (!authToken) {
      return { authenticated: false, error: 'Missing authentication token' };
    }

    if (mode === 'token') {
      if (authToken === secret) {
        return { authenticated: true, role: 'admin' };
      }
      return { authenticated: false, error: 'Invalid token' };
    }

    if (mode === 'jwt') {
      return this.validateJwt(authToken);
    }

    return { authenticated: false, error: `Unknown auth mode: ${mode}` };
  }

  private validateJwt(token: string): AuthResult {
    // Decode JWT payload (browser-safe, no external deps)
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { authenticated: false, error: 'Invalid JWT format' };
      }

      // Decode payload (base64url)
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

      // Check expiry
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return { authenticated: false, error: 'Token expired' };
      }

      return {
        authenticated: true,
        userId: payload.sub || payload.userId,
        role: payload.role || 'user'
      };
    } catch {
      return { authenticated: false, error: 'Invalid JWT' };
    }
  }

  /**
   * Get permissions for a role
   */
  getPermissions(role: string): PermissionMap {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.guest;
  }

  /**
   * Check if a client has permission for a message type
   */
  private checkPermission(clientId: string, messageType: GatewayMessageType): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    const requiredPermission = MESSAGE_PERMISSIONS[messageType];
    if (!requiredPermission) return true; // no specific permission required

    const permissions = this.getPermissions(client.role);
    return permissions[requiredPermission] as boolean;
  }

  // ============================================================================
  // Handler Registration
  // ============================================================================

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

    // Subscription handlers
    this.messageHandlers.set('session.subscribe', this.handleSessionSubscribe.bind(this));
    this.messageHandlers.set('session.unsubscribe', this.handleSessionUnsubscribe.bind(this));

    // Skill handlers
    this.messageHandlers.set('skill.install', this.handleSkillInstall.bind(this));
    this.messageHandlers.set('skill.uninstall', this.handleSkillUninstall.bind(this));
    this.messageHandlers.set('skill.list', this.handleSkillList.bind(this));

    // Agent handlers
    this.messageHandlers.set('agent.spawn', this.handleAgentSpawn.bind(this));
    this.messageHandlers.set('agent.stop', this.handleAgentStop.bind(this));
    this.messageHandlers.set('agent.list', this.handleAgentList.bind(this));
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  async createSession(
    userId: string,
    channelType: ChannelType,
    metadata: SessionMetadata = {}
  ): Promise<Session> {
    // Enforce maxPerUser
    const userSessions = this.listSessions(userId);
    const maxPerUser = this.config.sessions.maxPerUser;
    if (userSessions.length >= maxPerUser) {
      throw new Error(
        `User ${userId} has reached maximum sessions (${maxPerUser}). Close an existing session first.`
      );
    }

    // Resolve agent via routing
    const agentId = this.resolveAgent(channelType, userId);
    const sessionId = this.generateId('sess');
    const now = new Date();

    const session: Session = {
      id: sessionId,
      agentId,
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

    // Remove sessionId from all client subscriptions
    this.subscriptions.forEach((set) => set.delete(sessionId));

    // Remove from agent tracking
    this.agents.forEach((agent) => {
      const idx = agent.sessionIds.indexOf(sessionId);
      if (idx !== -1) agent.sessionIds.splice(idx, 1);
    });

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

  // ============================================================================
  // Multi-Agent Routing
  // ============================================================================

  /**
   * Resolve which agent should handle a session based on routing rules
   */
  resolveAgent(channelType: ChannelType, userId: string): string {
    const { routes, defaultAgentId } = this.config.routing;

    // Sort by priority (descending)
    const sorted = [...routes].sort((a, b) => b.priority - a.priority);

    for (const route of sorted) {
      // Check channel type match
      if (route.channelTypes && !route.channelTypes.includes(channelType)) {
        continue;
      }

      // Check user pattern match
      if (route.userPatterns && route.userPatterns.length > 0) {
        const matches = route.userPatterns.some(pattern => {
          if (pattern === '*') return true;
          if (pattern.endsWith('*')) {
            return userId.startsWith(pattern.slice(0, -1));
          }
          return userId === pattern;
        });
        if (!matches) continue;
      }

      // Check agent is running (if tracked)
      const agent = this.agents.get(route.agentId);
      if (agent && agent.status !== 'running') {
        continue;
      }

      return route.agentId;
    }

    return defaultAgentId;
  }

  /**
   * Add a routing rule
   */
  addRoute(route: AgentRoute): void {
    this.config.routing.routes.push(route);
    console.log(`[Gateway] Route added: ${route.agentId} (priority ${route.priority})`);
  }

  /**
   * Remove routing rules for an agent
   */
  removeRoutes(agentId: string): void {
    this.config.routing.routes = this.config.routing.routes.filter(r => r.agentId !== agentId);
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

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

  // ============================================================================
  // Tool Handling (connected to ToolCallingService)
  // ============================================================================

  async invokeTool(invocation: ToolInvocation): Promise<ToolResult> {
    const startTime = Date.now();

    this.emit('tool:invoked', invocation);

    try {
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
    // Use plugged-in tool executor if available
    if (this.toolExecutor) {
      if (!this.toolExecutor.hasTool(invocation.toolId)) {
        throw new Error(`Tool "${invocation.toolId}" not found in tool registry`);
      }

      const result = await this.toolExecutor.executeTool({
        id: `gw-${invocation.toolId}-${Date.now()}`,
        name: invocation.toolId,
        arguments: invocation.parameters
      });

      if (result.error) {
        throw new Error(result.content);
      }

      try {
        return JSON.parse(result.content);
      } catch {
        return result.content;
      }
    }

    // Fallback: emit event for external handling
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

  // ============================================================================
  // Channel Management
  // ============================================================================

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

  // ============================================================================
  // Skill Management
  // ============================================================================

  async installSkill(descriptor: SkillDescriptor): Promise<InstalledSkill> {
    if (this.skills.has(descriptor.name)) {
      throw new Error(`Skill "${descriptor.name}" is already installed`);
    }

    const installed: InstalledSkill = {
      ...descriptor,
      installedAt: new Date(),
      enabled: true
    };

    this.skills.set(descriptor.name, installed);
    this.emit('skill:installed', installed);
    console.log(`[Gateway] Skill installed: ${descriptor.name} v${descriptor.version}`);

    return installed;
  }

  async uninstallSkill(name: string): Promise<boolean> {
    if (!this.skills.has(name)) return false;

    this.skills.delete(name);
    this.emit('skill:uninstalled', { name });
    console.log(`[Gateway] Skill uninstalled: ${name}`);

    return true;
  }

  getSkill(name: string): InstalledSkill | undefined {
    return this.skills.get(name);
  }

  listSkills(): InstalledSkill[] {
    return Array.from(this.skills.values());
  }

  // ============================================================================
  // Agent Management
  // ============================================================================

  async spawnAgent(
    name: string,
    capabilities: string[] = [],
    route?: Partial<AgentRoute>
  ): Promise<AgentInfo> {
    const agentId = this.generateId('agent');

    const agent: AgentInfo = {
      id: agentId,
      name,
      status: 'running',
      sessionIds: [],
      startedAt: new Date(),
      capabilities
    };

    this.agents.set(agentId, agent);

    // Auto-register route if provided
    if (route) {
      this.addRoute({
        agentId,
        priority: route.priority ?? 0,
        channelTypes: route.channelTypes,
        userPatterns: route.userPatterns,
        capabilities: route.capabilities
      });
    }

    this.emit('agent:spawned', agent);
    console.log(`[Gateway] Agent spawned: ${name} (${agentId})`);

    return agent;
  }

  async stopAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.status = 'stopped';

    // Close all sessions belonging to this agent
    for (const sessionId of [...agent.sessionIds]) {
      await this.closeSession(sessionId);
    }

    // Remove routes
    this.removeRoutes(agentId);
    this.agents.delete(agentId);

    this.emit('agent:stopped', { agentId });
    console.log(`[Gateway] Agent stopped: ${agent.name} (${agentId})`);

    return true;
  }

  getAgent(agentId: string): AgentInfo | undefined {
    return this.agents.get(agentId);
  }

  listAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  // ============================================================================
  // Presence Management
  // ============================================================================

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

  // ============================================================================
  // WebSocket Client Management
  // ============================================================================

  registerClient(clientId: string, ws: WebSocket, authToken?: string): boolean {
    const authResult = this.authenticate(authToken);
    if (!authResult.authenticated) {
      return false;
    }

    const clientInfo: ClientInfo = {
      id: clientId,
      ws,
      userId: authResult.userId,
      role: authResult.role || 'user',
      connectedAt: new Date()
    };

    this.clients.set(clientId, clientInfo);
    this.wsToClientId.set(ws, clientId);

    // Ensure subscription set exists
    if (!this.subscriptions.has(clientId)) {
      this.subscriptions.set(clientId, new Set());
    }

    return true;
  }

  unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) this.wsToClientId.delete(client.ws);
    this.clients.delete(clientId);
    this.subscriptions.delete(clientId);
  }

  // ============================================================================
  // Message Handlers
  // ============================================================================

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

  private async handleSessionSubscribe(message: GatewayMessage, ws: WebSocket): Promise<void> {
    const clientId = this.wsToClientId.get(ws);
    if (!clientId) {
      this.sendError(ws, 'UNREGISTERED_CLIENT', 'Client not registered');
      return;
    }

    const { sessionId } = message.payload as { sessionId: string };
    this.subscribeClientToSession(clientId, sessionId);

    this.sendToClient(ws, {
      id: this.generateId('resp'),
      type: 'session.subscribe',
      payload: { sessionId, subscribed: true },
      timestamp: Date.now()
    });
  }

  private async handleSessionUnsubscribe(message: GatewayMessage, ws: WebSocket): Promise<void> {
    const clientId = this.wsToClientId.get(ws);
    if (!clientId) {
      this.sendError(ws, 'UNREGISTERED_CLIENT', 'Client not registered');
      return;
    }

    const { sessionId } = message.payload as { sessionId: string };
    this.unsubscribeClientFromSession(clientId, sessionId);

    this.sendToClient(ws, {
      id: this.generateId('resp'),
      type: 'session.unsubscribe',
      payload: { sessionId, subscribed: false },
      timestamp: Date.now()
    });
  }

  subscribeClientToSession(clientId: string, sessionId: string): void {
    if (!this.subscriptions.has(clientId)) this.subscriptions.set(clientId, new Set());
    this.subscriptions.get(clientId)!.add(sessionId);
  }

  unsubscribeClientFromSession(clientId: string, sessionId: string): void {
    const set = this.subscriptions.get(clientId);
    if (set) set.delete(sessionId);
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

  // Skill handlers
  private async handleSkillInstall(message: GatewayMessage, ws: WebSocket): Promise<void> {
    const descriptor = message.payload as SkillDescriptor;

    try {
      const installed = await this.installSkill(descriptor);
      this.sendToClient(ws, {
        id: this.generateId('resp'),
        type: 'skill.install',
        payload: installed,
        timestamp: Date.now()
      });
    } catch (error) {
      this.sendError(ws, 'SKILL_INSTALL_ERROR', error instanceof Error ? error.message : 'Install failed');
    }
  }

  private async handleSkillUninstall(message: GatewayMessage, ws: WebSocket): Promise<void> {
    const { name } = message.payload as { name: string };
    const removed = await this.uninstallSkill(name);

    this.sendToClient(ws, {
      id: this.generateId('resp'),
      type: 'skill.uninstall',
      payload: { name, removed },
      timestamp: Date.now()
    });
  }

  private async handleSkillList(_message: GatewayMessage, ws: WebSocket): Promise<void> {
    this.sendToClient(ws, {
      id: this.generateId('resp'),
      type: 'skill.list',
      payload: this.listSkills(),
      timestamp: Date.now()
    });
  }

  // Agent handlers
  private async handleAgentSpawn(message: GatewayMessage, ws: WebSocket): Promise<void> {
    const { name, capabilities, route } = message.payload as {
      name: string;
      capabilities?: string[];
      route?: Partial<AgentRoute>;
    };

    try {
      const agent = await this.spawnAgent(name, capabilities, route);
      this.sendToClient(ws, {
        id: this.generateId('resp'),
        type: 'agent.spawn',
        payload: agent,
        timestamp: Date.now()
      });
    } catch (error) {
      this.sendError(ws, 'AGENT_SPAWN_ERROR', error instanceof Error ? error.message : 'Spawn failed');
    }
  }

  private async handleAgentStop(message: GatewayMessage, ws: WebSocket): Promise<void> {
    const { agentId } = message.payload as { agentId: string };
    const stopped = await this.stopAgent(agentId);

    this.sendToClient(ws, {
      id: this.generateId('resp'),
      type: 'agent.stop',
      payload: { agentId, stopped },
      timestamp: Date.now()
    });
  }

  private async handleAgentList(_message: GatewayMessage, ws: WebSocket): Promise<void> {
    this.sendToClient(ws, {
      id: this.generateId('resp'),
      type: 'agent.list',
      payload: this.listAgents(),
      timestamp: Date.now()
    });
  }

  // ============================================================================
  // Process Incoming Message (with validation + permissions)
  // ============================================================================

  async processMessage(message: GatewayMessage, ws: WebSocket): Promise<void> {
    // 1. Validate message structure
    const validation = this.validateMessage(message);
    if (!validation.valid) {
      this.sendError(ws, 'INVALID_MESSAGE', validation.errors.join('; '));
      return;
    }

    // 2. Check client is registered
    const clientId = this.wsToClientId.get(ws);
    if (!clientId) {
      this.sendError(ws, 'UNREGISTERED_CLIENT', 'Client not registered. Call registerClient first.');
      return;
    }

    // 3. Check permissions
    if (!this.checkPermission(clientId, message.type)) {
      this.sendError(ws, 'PERMISSION_DENIED', `Insufficient permissions for "${message.type}"`);
      return;
    }

    // 4. Route to handler
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

  // ============================================================================
  // Broadcasting
  // ============================================================================

  private broadcast(message: GatewayMessage): void {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  private broadcastToSession(sessionId: string, message: GatewayMessage): void {
    const data = JSON.stringify(message);

    this.clients.forEach((client, clientId) => {
      const subs = this.subscriptions.get(clientId);
      if (!subs || !subs.has(sessionId)) return;

      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
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

  // ============================================================================
  // Session Pruning
  // ============================================================================

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

    this.sessions.forEach((session) => {
      const idleTime = now - session.lastActivityAt.getTime();
      if (idleTime > idleTimeout && session.status === 'active') {
        session.status = 'idle';
        this.emit('session:updated', session);
      }
    });
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getConfig(): GatewayConfig {
    return this.config;
  }

  getStats(): {
    sessions: number;
    channels: number;
    clients: number;
    skills: number;
    agents: number;
    routes: number;
  } {
    return {
      sessions: this.sessions.size,
      channels: this.channels.size,
      clients: this.clients.size,
      skills: this.skills.size,
      agents: this.agents.size,
      routes: this.config.routing.routes.length
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
