/**
 * Lisa Slack Channel
 * Slack bot integration (Bolt-compatible)
 * Inspired by OpenClaw's Slack channel
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface SlackConfig {
  botToken: string;
  appToken?: string;
  signingSecret?: string;
  allowedChannels?: string[];
  allowedUsers?: string[];
  adminUsers?: string[];
}

export interface SlackMessage {
  ts: string;
  channelId: string;
  userId: string;
  username?: string;
  text: string;
  timestamp: Date;
  threadTs?: string;
  isBot: boolean;
  isDM: boolean;
  files?: SlackFile[];
  blocks?: unknown[];
}

export interface SlackFile {
  id: string;
  name: string;
  mimetype: string;
  url: string;
  size: number;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
}

export interface SlackUser {
  id: string;
  name: string;
  realName?: string;
  isBot: boolean;
  isAdmin: boolean;
}

export type SlackChannelStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export class SlackChannelManager extends BrowserEventEmitter {
  private config: SlackConfig;
  private status: SlackChannelStatus = 'disconnected';
  private botUserId: string | null = null;
  private messageHistory: SlackMessage[] = [];
  private maxHistorySize = 100;
  private ws: WebSocket | null = null;

  constructor(config: SlackConfig) {
    super();
    this.config = config;
  }

  // Connection via Socket Mode
  async connect(): Promise<boolean> {
    if (!this.config.botToken) {
      this.status = 'error';
      this.emit('error', { message: 'Bot token required' });
      return false;
    }

    this.status = 'connecting';
    this.emit('status:changed', this.status);

    try {
      // Test auth
      const authResponse = await this.apiCall('auth.test');
      if (!authResponse.ok) {
        throw new Error(authResponse.error || 'Auth failed');
      }

      this.botUserId = authResponse.user_id as string;

      // If app token provided, use Socket Mode
      if (this.config.appToken) {
        await this.connectSocketMode();
      }

      this.status = 'connected';
      this.emit('connected', { userId: this.botUserId });
      return true;
    } catch (error) {
      this.status = 'error';
      const msg = error instanceof Error ? error.message : String(error);
      this.emit('error', { message: msg });
      return false;
    }
  }

  private async connectSocketMode(): Promise<void> {
    // Get WebSocket URL
    const response = await fetch('https://slack.com/api/apps.connections.open', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.appToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Failed to get socket URL');
    }

    // Connect WebSocket
    this.ws = new WebSocket(data.url);

    this.ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      this.handleSocketMessage(payload);
    };

    this.ws.onerror = () => {
      this.emit('error', { message: 'WebSocket error' });
    };

    this.ws.onclose = () => {
      this.status = 'disconnected';
      this.emit('disconnected');
    };
  }

  private handleSocketMessage(payload: { type: string; envelope_id?: string; payload?: unknown }): void {
    // Acknowledge the message
    if (payload.envelope_id && this.ws) {
      this.ws.send(JSON.stringify({ envelope_id: payload.envelope_id }));
    }

    if (payload.type === 'events_api') {
      const event = (payload.payload as { event: unknown })?.event as Record<string, unknown>;
      if (event?.type === 'message' && !event.subtype) {
        const msg = this.parseMessage(event);
        if (msg && this.isAllowed(msg)) {
          this.messageHistory.push(msg);
          if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory.shift();
          }
          this.emit('message', msg);
        }
      }
    }
  }

  private parseMessage(event: Record<string, unknown>): SlackMessage | null {
    return {
      ts: event.ts as string,
      channelId: event.channel as string,
      userId: event.user as string,
      text: event.text as string || '',
      timestamp: new Date(parseFloat(event.ts as string) * 1000),
      threadTs: event.thread_ts as string | undefined,
      isBot: !!event.bot_id,
      isDM: (event.channel_type as string) === 'im',
      files: ((event.files as unknown[]) || []).map((f: unknown) => {
        const file = f as Record<string, unknown>;
        return {
          id: file.id as string,
          name: file.name as string,
          mimetype: file.mimetype as string,
          url: file.url_private as string,
          size: file.size as number
        };
      })
    };
  }

  private isAllowed(msg: SlackMessage): boolean {
    if (msg.isBot) return false;
    if (msg.userId === this.botUserId) return false;

    if (this.config.allowedChannels?.length) {
      if (!this.config.allowedChannels.includes(msg.channelId)) {
        return false;
      }
    }

    if (this.config.allowedUsers?.length) {
      if (!this.config.allowedUsers.includes(msg.userId)) {
        return false;
      }
    }

    return true;
  }

  async disconnect(): Promise<void> {
    this.ws?.close();
    this.ws = null;
    this.status = 'disconnected';
    this.emit('disconnected');
  }

  getStatus(): SlackChannelStatus {
    return this.status;
  }

  // API calls
  private async apiCall(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const url = `https://slack.com/api/${method}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.botToken}`,
        'Content-Type': 'application/json'
      },
      body: params ? JSON.stringify(params) : undefined
    });

    return await response.json();
  }

  // Send messages
  async sendMessage(channelId: string, text: string, options?: {
    threadTs?: string;
    blocks?: unknown[];
  }): Promise<{ success: boolean; ts?: string }> {
    const response = await this.apiCall('chat.postMessage', {
      channel: channelId,
      text,
      thread_ts: options?.threadTs,
      blocks: options?.blocks
    });

    if (response.ok) {
      this.emit('message:sent', { channelId, ts: response.ts });
      return { success: true, ts: response.ts as string };
    }

    return { success: false };
  }

  async reply(message: SlackMessage, text: string): Promise<{ success: boolean; ts?: string }> {
    return this.sendMessage(message.channelId, text, {
      threadTs: message.threadTs || message.ts
    });
  }

  async sendTyping(channelId: string): Promise<void> {
    // Slack doesn't have a typing indicator API for bots
    // This is a no-op for compatibility
    this.emit('typing', { channelId });
  }

  // Reactions
  async addReaction(channelId: string, ts: string, emoji: string): Promise<boolean> {
    const response = await this.apiCall('reactions.add', {
      channel: channelId,
      timestamp: ts,
      name: emoji
    });
    return response.ok as boolean;
  }

  // Channel info
  async getChannels(): Promise<SlackChannel[]> {
    const response = await this.apiCall('conversations.list', {
      types: 'public_channel,private_channel'
    });

    if (!response.ok) return [];

    return ((response.channels as unknown[]) || []).map((c: unknown) => {
      const ch = c as Record<string, unknown>;
      return {
        id: ch.id as string,
        name: ch.name as string,
        isPrivate: ch.is_private as boolean,
        isMember: ch.is_member as boolean
      };
    });
  }

  // User info
  async getUser(userId: string): Promise<SlackUser | null> {
    const response = await this.apiCall('users.info', { user: userId });

    if (!response.ok) return null;

    const user = response.user as Record<string, unknown>;
    return {
      id: user.id as string,
      name: user.name as string,
      realName: (user.real_name || user.profile && (user.profile as Record<string, unknown>).real_name) as string | undefined,
      isBot: user.is_bot as boolean,
      isAdmin: user.is_admin as boolean
    };
  }

  isAdmin(userId: string): boolean {
    return this.config.adminUsers?.includes(userId) || false;
  }

  // History
  getMessageHistory(channelId?: string, limit?: number): SlackMessage[] {
    let messages = [...this.messageHistory];
    
    if (channelId) {
      messages = messages.filter(m => m.channelId === channelId);
    }
    
    return limit ? messages.slice(-limit) : messages;
  }

  // Stats
  getStats(): {
    status: SlackChannelStatus;
    botUserId: string | null;
    messageCount: number;
    uniqueChannels: number;
  } {
    const channelIds = new Set(this.messageHistory.map(m => m.channelId));
    
    return {
      status: this.status,
      botUserId: this.botUserId,
      messageCount: this.messageHistory.length,
      uniqueChannels: channelIds.size
    };
  }
}

// Singleton
let slackChannelInstance: SlackChannelManager | null = null;

export function getSlackChannel(config?: SlackConfig): SlackChannelManager {
  if (!slackChannelInstance && config) {
    slackChannelInstance = new SlackChannelManager(config);
  }
  if (!slackChannelInstance) {
    throw new Error('SlackChannel not initialized. Provide config first.');
  }
  return slackChannelInstance;
}

export function resetSlackChannel(): void {
  if (slackChannelInstance) {
    slackChannelInstance.disconnect();
    slackChannelInstance.removeAllListeners();
    slackChannelInstance = null;
  }
}

