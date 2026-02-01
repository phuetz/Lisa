/**
 * Lisa Slack Channel
 * Integration with Slack Bot API
 * Inspired by OpenClaw's multi-channel architecture
 */

import { getGateway } from '../gateway/GatewayServer';
import type { Session, MessagePayload } from '../gateway/types';

export interface SlackConfig {
  botToken: string;
  appToken?: string;
  signingSecret?: string;
  allowedChannels?: string[];
  allowedUsers?: string[];
}

export interface SlackMessage {
  ts: string;
  channelId: string;
  userId: string;
  text: string;
  threadTs?: string;
  files?: SlackFile[];
}

export interface SlackFile {
  id: string;
  name: string;
  mimetype: string;
  url: string;
  size: number;
}

type MessageHandler = (message: SlackMessage) => Promise<void>;
type ErrorHandler = (error: Error) => void;

export class SlackChannel {
  private config: SlackConfig;
  private sessions: Map<string, Session> = new Map();
  private messageHandlers: MessageHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private isRunning = false;
  private ws: WebSocket | null = null;

  constructor(config: SlackConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      // Get WebSocket URL via apps.connections.open
      const wsUrl = await this.getWebSocketUrl();
      await this.connectWebSocket(wsUrl);
      
      this.isRunning = true;
      console.log('[Slack] Bot started');
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.ws) {
      this.ws.close(1000, 'Bot stopping');
      this.ws = null;
    }
    
    console.log('[Slack] Bot stopped');
  }

  private async getWebSocketUrl(): Promise<string> {
    if (!this.config.appToken) {
      throw new Error('App token required for Socket Mode');
    }

    const response = await fetch('https://slack.com/api/apps.connections.open', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.appToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }
    
    return data.url;
  }

  private async connectWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[Slack] WebSocket connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(JSON.parse(event.data as string));
      };

      this.ws.onerror = (error) => {
        reject(new Error(`WebSocket error: ${error}`));
      };

      this.ws.onclose = (event) => {
        console.log(`[Slack] WebSocket closed: ${event.code}`);
        if (this.isRunning && event.code !== 1000) {
          // Reconnect
          setTimeout(() => this.start(), 5000);
        }
      };
    });
  }

  private handleWebSocketMessage(data: SlackSocketMessage): void {
    // Acknowledge the message
    if (data.envelope_id) {
      this.sendAck(data.envelope_id);
    }

    if (data.type === 'events_api') {
      this.handleEvent(data.payload);
    }
  }

  private sendAck(envelopeId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ envelope_id: envelopeId }));
    }
  }

  private handleEvent(payload: SlackEventPayload): void {
    const event = payload.event;
    
    if (event.type === 'message' && !event.bot_id) {
      this.handleMessageEvent(event);
    } else if (event.type === 'app_mention') {
      this.handleMentionEvent(event);
    }
  }

  private async handleMessageEvent(event: SlackMessageEvent): Promise<void> {
    // Check if it's a DM or allowed channel
    if (this.config.allowedChannels && 
        !event.channel.startsWith('D') && // DMs always allowed
        !this.config.allowedChannels.includes(event.channel)) {
      return;
    }

    // Check if user is allowed
    if (this.config.allowedUsers && !this.config.allowedUsers.includes(event.user)) {
      return;
    }

    const message: SlackMessage = {
      ts: event.ts,
      channelId: event.channel,
      userId: event.user,
      text: event.text || '',
      threadTs: event.thread_ts,
      files: event.files?.map(f => ({
        id: f.id,
        name: f.name,
        mimetype: f.mimetype,
        url: f.url_private,
        size: f.size
      }))
    };

    await this.processMessage(message);

    for (const handler of this.messageHandlers) {
      await handler(message);
    }
  }

  private async handleMentionEvent(event: SlackMessageEvent): Promise<void> {
    const message: SlackMessage = {
      ts: event.ts,
      channelId: event.channel,
      userId: event.user,
      text: this.removeMention(event.text || ''),
      threadTs: event.thread_ts
    };

    await this.processMessage(message);
  }

  private removeMention(text: string): string {
    return text.replace(/<@[A-Z0-9]+>/g, '').trim();
  }

  private async processMessage(msg: SlackMessage): Promise<void> {
    const gateway = getGateway();
    
    // Get or create session
    let session = this.sessions.get(msg.channelId);
    if (!session) {
      session = await gateway.createSession(`slack:${msg.userId}`, 'slack', {
        skills: []
      });
      this.sessions.set(msg.channelId, session);
    }

    // Send message to gateway
    const payload: MessagePayload = {
      content: msg.text,
      role: 'user'
    };

    await gateway.sendMessage(session.id, payload);

    // Wait for response
    gateway.once('message:received', async (response: { sessionId: string; payload: MessagePayload }) => {
      if (response.sessionId === session!.id && response.payload.role === 'assistant') {
        await this.sendMessage(msg.channelId, response.payload.content, msg.threadTs || msg.ts);
      }
    });
  }

  // Slack API methods
  async sendMessage(channel: string, text: string, threadTs?: string): Promise<void> {
    const blocks = this.formatBlocks(text);
    
    await this.apiCall('chat.postMessage', {
      channel,
      text,
      blocks,
      thread_ts: threadTs,
      unfurl_links: false
    });
  }

  private formatBlocks(text: string): SlackBlock[] {
    // Simple markdown to Slack blocks conversion
    const blocks: SlackBlock[] = [];
    
    // Split by code blocks
    const parts = text.split(/```(\w*)\n?([\s\S]*?)```/g);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;
      
      if (i % 3 === 2) {
        // Code block content
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '```' + part + '```'
          }
        });
      } else if (i % 3 === 0) {
        // Regular text
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: part
          }
        });
      }
    }

    return blocks.length > 0 ? blocks : [{
      type: 'section',
      text: { type: 'mrkdwn', text }
    }];
  }

  private async apiCall(method: string, params: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }
    
    return data;
  }

  // Event handlers
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) this.messageHandlers.splice(index, 1);
    };
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) this.errorHandlers.splice(index, 1);
    };
  }

  private handleError(error: Error): void {
    console.error('[Slack] Error:', error.message);
    for (const handler of this.errorHandlers) {
      handler(error);
    }
  }

  isConnected(): boolean {
    return this.isRunning && this.ws?.readyState === WebSocket.OPEN;
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

// Types for Slack API
interface SlackSocketMessage {
  type: string;
  envelope_id?: string;
  payload: SlackEventPayload;
}

interface SlackEventPayload {
  event: SlackMessageEvent;
}

interface SlackMessageEvent {
  type: string;
  user: string;
  text?: string;
  ts: string;
  channel: string;
  thread_ts?: string;
  bot_id?: string;
  files?: Array<{
    id: string;
    name: string;
    mimetype: string;
    url_private: string;
    size: number;
  }>;
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
}

// Factory function
export function createSlackChannel(botToken: string, options: Partial<SlackConfig> = {}): SlackChannel {
  return new SlackChannel({
    botToken,
    ...options
  });
}
