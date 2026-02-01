/**
 * Lisa Session Tools
 * Agent-to-Agent communication inspired by OpenClaw's sessions_* tools
 */

import { getGateway } from './GatewayServer';
import type { Session, MessagePayload } from './types';

export interface SessionInfo {
  id: string;
  agentId: string;
  channelType: string;
  userId: string;
  status: string;
  createdAt: Date;
  lastActivityAt: Date;
  metadata: {
    model?: string;
    skills?: string[];
  };
}

export interface SessionMessage {
  sessionId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

export interface SessionHistoryOptions {
  limit?: number;
  before?: Date;
  after?: Date;
}

export interface SessionSendOptions {
  replyBack?: boolean;
  announce?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * sessions_list - Discover active sessions (agents) and their metadata
 * Like OpenClaw's sessions_list tool
 */
export async function sessions_list(filter?: {
  agentId?: string;
  channelType?: string;
  status?: string;
}): Promise<SessionInfo[]> {
  const gateway = getGateway();
  let sessions = gateway.listSessions();

  // Apply filters
  if (filter?.agentId) {
    sessions = sessions.filter(s => s.agentId === filter.agentId);
  }
  if (filter?.channelType) {
    sessions = sessions.filter(s => s.channelType === filter.channelType);
  }
  if (filter?.status) {
    sessions = sessions.filter(s => s.status === filter.status);
  }

  return sessions.map(s => ({
    id: s.id,
    agentId: s.agentId,
    channelType: s.channelType,
    userId: s.userId,
    status: s.status,
    createdAt: s.createdAt,
    lastActivityAt: s.lastActivityAt,
    metadata: {
      model: s.metadata.model,
      skills: s.metadata.skills
    }
  }));
}

/**
 * sessions_history - Fetch transcript/logs for a session
 * Like OpenClaw's sessions_history tool
 */
export async function sessions_history(
  sessionId: string,
  _options: SessionHistoryOptions = {}
): Promise<SessionMessage[]> {
  const gateway = getGateway();
  const session = gateway.getSession(sessionId);

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // In a real implementation, this would fetch from a message store
  // For now, return empty array - messages would be stored in a database
  // This is a placeholder for the actual implementation
  return [];
}

/**
 * sessions_send - Send a message to another session
 * Like OpenClaw's sessions_send tool
 */
export async function sessions_send(
  targetSessionId: string,
  content: string,
  options: SessionSendOptions = {}
): Promise<{
  success: boolean;
  messageId: string;
  replyReceived?: string;
}> {
  const gateway = getGateway();
  const targetSession = gateway.getSession(targetSessionId);

  if (!targetSession) {
    throw new Error(`Target session ${targetSessionId} not found`);
  }

  const payload: MessagePayload = {
    content,
    role: 'system' // Inter-agent messages are system messages
  };

  // Send the message
  await gateway.sendMessage(targetSessionId, payload);

  const messageId = `msg_${Date.now().toString(36)}`;

  // If reply-back is requested, wait for response
  if (options.replyBack) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: true,
          messageId,
          replyReceived: undefined
        });
      }, 30000); // 30 second timeout

      gateway.once('message:received', (msg: { sessionId: string; payload: MessagePayload }) => {
        if (msg.sessionId === targetSessionId && msg.payload.role === 'assistant') {
          clearTimeout(timeout);
          resolve({
            success: true,
            messageId,
            replyReceived: msg.payload.content
          });
        }
      });
    });
  }

  return {
    success: true,
    messageId
  };
}

/**
 * sessions_spawn - Create a new agent session
 * Like spawning a new agent in OpenClaw
 */
export async function sessions_spawn(config: {
  agentId?: string;
  channelType?: string;
  userId?: string;
  metadata?: {
    model?: string;
    skills?: string[];
    customPrompt?: string;
  };
}): Promise<Session> {
  const gateway = getGateway();
  
  const session = await gateway.createSession(
    config.userId || 'spawned-agent',
    (config.channelType as 'webchat' | 'telegram' | 'discord' | 'slack' | 'whatsapp' | 'api') || 'api',
    {
      model: config.metadata?.model,
      skills: config.metadata?.skills,
      customPrompt: config.metadata?.customPrompt
    }
  );

  return session;
}

/**
 * sessions_close - Close a session
 */
export async function sessions_close(sessionId: string): Promise<boolean> {
  const gateway = getGateway();
  return gateway.closeSession(sessionId);
}

/**
 * sessions_update - Update session metadata
 */
export async function sessions_update(
  sessionId: string,
  updates: {
    model?: string;
    skills?: string[];
    customPrompt?: string;
  }
): Promise<Session | null> {
  const gateway = getGateway();
  return gateway.updateSession(sessionId, updates);
}

// Export all session tools as a collection
export const sessionTools = {
  list: sessions_list,
  history: sessions_history,
  send: sessions_send,
  spawn: sessions_spawn,
  close: sessions_close,
  update: sessions_update
};

export default sessionTools;

