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

// Presence
export interface Presence {
  sessionId: string;
  status: 'online' | 'typing' | 'idle' | 'offline';
  lastSeen: Date;
}

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
  'error': { code: string; message: string };
}

// Gateway configuration
export interface GatewayConfig {
  port: number;
  host: string;
  cors: {
    origins: string[];
  };
  auth: {
    mode: 'none' | 'token' | 'password';
    secret?: string;
  };
  sessions: {
    maxPerUser: number;
    idleTimeout: number; // ms
    pruneInterval: number; // ms
  };
  channels: {
    enabled: ChannelType[];
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
  }
};

