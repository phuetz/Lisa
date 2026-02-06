/**
 * Lisa Gateway - Types
 * Inspired by OpenClaw's Gateway architecture
 */

// Session types
export interface Session {
  id: string;
  agentId: string;
  channelId: string;
  channelType: ChannelType;
  userId: string;
  metadata: SessionMetadata;
  status: SessionStatus;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface SessionMetadata {
  model?: string;
  thinkingLevel?: ThinkingLevel;
  verboseLevel?: boolean;
  customPrompt?: string;
  workspace?: string;
  skills?: string[];
  compact?: boolean;
  temperature?: number;
  language?: string;
}

export type SessionStatus = 'active' | 'idle' | 'suspended' | 'closed';
export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high';

// Channel types
export type ChannelType =
  | 'webchat'
  | 'telegram'
  | 'discord'
  | 'slack'
  | 'whatsapp'
  | 'api';

export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  config: ChannelConfig;
  status: ChannelStatus;
}

export interface ChannelConfig {
  token?: string;
  webhookUrl?: string;
  botUsername?: string;
  allowedUsers?: string[];
  allowedGroups?: string[];
}

export type ChannelStatus = 'connected' | 'disconnected' | 'error';

// WebSocket Message types
export type GatewayMessageType =
  | 'session.create'
  | 'session.update'
  | 'session.close'
  | 'session.list'
  | 'session.subscribe'
  | 'session.unsubscribe'
  | 'message.send'
  | 'message.receive'
  | 'message.stream'
  | 'tool.invoke'
  | 'tool.result'
  | 'skill.install'
  | 'skill.uninstall'
  | 'skill.list'
  | 'channel.connect'
  | 'channel.disconnect'
  | 'channel.status'
  | 'agent.spawn'
  | 'agent.stop'
  | 'agent.list'
  | 'presence.update'
  | 'error';

export interface GatewayMessage<T = unknown> {
  id: string;
  type: GatewayMessageType;
  sessionId?: string;
  channelId?: string;
  payload: T;
  timestamp: number;
}

// Message payloads
export interface MessagePayload {
  content: string;
  role: 'user' | 'assistant' | 'system';
  attachments?: Attachment[];
  replyTo?: string;
}

export interface Attachment {
  type: 'image' | 'audio' | 'video' | 'file';
  url?: string;
  data?: string; // base64
  mimeType: string;
  filename?: string;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

// Tool types
export interface ToolInvocation {
  toolId: string;
  parameters: Record<string, unknown>;
  sessionId: string;
}

export interface ToolResult {
  toolId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
}

// Skill types
export interface SkillDescriptor {
  name: string;
  version: string;
  description: string;
  entryPoint: string;
  permissions?: string[];
}

export interface InstalledSkill extends SkillDescriptor {
  installedAt: Date;
  enabled: boolean;
}

// Agent routing types
export interface AgentRoute {
  agentId: string;
  channelTypes?: ChannelType[];
  userPatterns?: string[];       // glob patterns for user IDs
  priority: number;              // higher = preferred
  capabilities?: string[];       // required capabilities for routing
}

export interface AgentInfo {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  sessionIds: string[];
  startedAt: Date;
  capabilities: string[];
}

// Presence
export interface Presence {
  sessionId: string;
  status: 'online' | 'typing' | 'idle' | 'offline';
  lastSeen: Date;
}

// Auth types
export type AuthMode = 'none' | 'token' | 'jwt';

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  role?: 'admin' | 'user' | 'guest';
  error?: string;
}

// Permission map
export interface PermissionMap {
  canCreateSession: boolean;
  canManageChannels: boolean;
  canInvokeTools: boolean;
  canManageSkills: boolean;
  canSpawnAgents: boolean;
  canManagePresence: boolean;
  maxSessions: number;
}

export const ROLE_PERMISSIONS: Record<string, PermissionMap> = {
  admin: {
    canCreateSession: true,
    canManageChannels: true,
    canInvokeTools: true,
    canManageSkills: true,
    canSpawnAgents: true,
    canManagePresence: true,
    maxSessions: 50
  },
  user: {
    canCreateSession: true,
    canManageChannels: false,
    canInvokeTools: true,
    canManageSkills: false,
    canSpawnAgents: false,
    canManagePresence: true,
    maxSessions: 10
  },
  guest: {
    canCreateSession: true,
    canManageChannels: false,
    canInvokeTools: false,
    canManageSkills: false,
    canSpawnAgents: false,
    canManagePresence: false,
    maxSessions: 1
  }
};

// Message type to required permission mapping
export const MESSAGE_PERMISSIONS: Partial<Record<GatewayMessageType, keyof PermissionMap>> = {
  'session.create': 'canCreateSession',
  'channel.connect': 'canManageChannels',
  'channel.disconnect': 'canManageChannels',
  'tool.invoke': 'canInvokeTools',
  'skill.install': 'canManageSkills',
  'skill.uninstall': 'canManageSkills',
  'agent.spawn': 'canSpawnAgents',
  'agent.stop': 'canSpawnAgents',
  'presence.update': 'canManagePresence'
};

// Gateway events
export interface GatewayEventMap {
  'session:created': Session;
  'session:updated': Session;
  'session:closed': { sessionId: string };
  'message:received': GatewayMessage<MessagePayload>;
  'message:streamed': GatewayMessage<StreamChunk>;
  'tool:invoked': ToolInvocation;
  'tool:completed': ToolResult;
  'channel:connected': Channel;
  'channel:disconnected': { channelId: string };
  'presence:changed': Presence;
  'skill:installed': InstalledSkill;
  'skill:uninstalled': { name: string };
  'agent:spawned': AgentInfo;
  'agent:stopped': { agentId: string };
  'error': { code: string; message: string };
}

// Message validation
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Gateway configuration
export interface GatewayConfig {
  port: number;
  host: string;
  cors: {
    origins: string[];
  };
  auth: {
    mode: AuthMode;
    secret?: string;
    jwtPublicKey?: string;
  };
  sessions: {
    maxPerUser: number;
    idleTimeout: number; // ms
    pruneInterval: number; // ms
  };
  channels: {
    enabled: ChannelType[];
  };
  routing: {
    defaultAgentId: string;
    routes: AgentRoute[];
  };
}

export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  port: 18789,
  host: '127.0.0.1',
  cors: {
    origins: ['http://localhost:5173', 'http://localhost:5180']
  },
  auth: {
    mode: 'none'
  },
  sessions: {
    maxPerUser: 10,
    idleTimeout: 30 * 60 * 1000, // 30 minutes
    pruneInterval: 5 * 60 * 1000 // 5 minutes
  },
  channels: {
    enabled: ['webchat', 'api']
  },
  routing: {
    defaultAgentId: 'lisa-main',
    routes: []
  }
};
