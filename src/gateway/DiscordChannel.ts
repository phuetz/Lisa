/**
 * Lisa Discord Channel
 * Discord bot integration (discord.js-compatible)
 * Inspired by OpenClaw's Discord channel
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface DiscordConfig {
  botToken: string;
  clientId?: string;
  guildIds?: string[];
  allowedChannels?: string[];
  allowedUsers?: string[];
  adminUsers?: string[];
  prefix?: string;
}

export interface DiscordMessage {
  id: string;
  channelId: string;
  guildId?: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName?: string;
  content: string;
  timestamp: Date;
  replyToMessageId?: string;
  isBot: boolean;
  isDM: boolean;
  attachments: DiscordAttachment[];
  mentions: string[];
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType?: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  memberCount: number;
  iconUrl?: string;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'dm' | 'thread' | 'forum';
  guildId?: string;
}

export type DiscordChannelStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const DEFAULT_CONFIG: Partial<DiscordConfig> = {
  prefix: '!'
};

export class DiscordChannelManager extends BrowserEventEmitter {
  private config: DiscordConfig;
  private status: DiscordChannelStatus = 'disconnected';
  private botUser: { id: string; username: string; discriminator: string } | null = null;
  private guilds: Map<string, DiscordGuild> = new Map();
  private messageHistory: DiscordMessage[] = [];
  private maxHistorySize = 100;
  private ws: WebSocket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private _sessionId: string | null = null;
  private sequence: number | null = null;

  constructor(config: Partial<DiscordConfig> & { botToken: string }) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as DiscordConfig;
  }

  // Connection via Discord Gateway
  async connect(): Promise<boolean> {
    if (!this.config.botToken) {
      this.status = 'error';
      this.emit('error', { message: 'Bot token required' });
      return false;
    }

    this.status = 'connecting';
    this.emit('status:changed', this.status);

    try {
      // Get gateway URL
      const gatewayResponse = await fetch('https://discord.com/api/v10/gateway/bot', {
        headers: { Authorization: `Bot ${this.config.botToken}` }
      });
      
      if (!gatewayResponse.ok) {
        throw new Error('Failed to get gateway URL');
      }

      const { url } = await gatewayResponse.json();
      
      // Connect to WebSocket
      this.ws = new WebSocket(`${url}?v=10&encoding=json`);
      
      this.ws.onmessage = (event) => this.handleMessage(JSON.parse(event.data));
      this.ws.onerror = () => {
        this.status = 'error';
        this.emit('error', { message: 'WebSocket error' });
      };
      this.ws.onclose = () => {
        this.status = 'disconnected';
        this.stopHeartbeat();
        this.emit('disconnected');
      };

      return true;
    } catch (error) {
      this.status = 'error';
      const msg = error instanceof Error ? error.message : String(error);
      this.emit('error', { message: msg });
      return false;
    }
  }

  private handleMessage(data: { op: number; d: unknown; s?: number; t?: string }): void {
    if (data.s) this.sequence = data.s;

    switch (data.op) {
      case 10: // Hello
        this.startHeartbeat((data.d as { heartbeat_interval: number }).heartbeat_interval);
        this.identify();
        break;
      case 0: // Dispatch
        this.handleDispatch(data.t!, data.d);
        break;
      case 11: // Heartbeat ACK
        break;
    }
  }

  private handleDispatch(event: string, data: unknown): void {
    switch (event) {
      case 'READY': {
        const ready = data as { user: { id: string; username: string; discriminator: string }; guilds: { id: string }[]; session_id: string };
        this.botUser = ready.user;
        this._sessionId = ready.session_id;
        this.status = 'connected';
        this.emit('connected', this.botUser);
        break;
      }

      case 'GUILD_CREATE': {
        const guild = data as { id: string; name: string; member_count: number; icon?: string };
        this.guilds.set(guild.id, {
          id: guild.id,
          name: guild.name,
          memberCount: guild.member_count,
          iconUrl: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : undefined
        });
        break;
      }

      case 'MESSAGE_CREATE': {
        const msg = this.parseMessage(data as Record<string, unknown>);
        if (msg && this.isAllowed(msg)) {
          this.messageHistory.push(msg);
          if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory.shift();
          }
          this.emit('message', msg);
        }
        break;
      }
    }
  }

  private parseMessage(raw: Record<string, unknown>): DiscordMessage | null {
    const author = raw.author as Record<string, unknown>;
    if (!author) return null;

    return {
      id: raw.id as string,
      channelId: raw.channel_id as string,
      guildId: raw.guild_id as string | undefined,
      authorId: author.id as string,
      authorUsername: author.username as string,
      authorDisplayName: (raw.member as Record<string, unknown>)?.nick as string | undefined,
      content: raw.content as string,
      timestamp: new Date(raw.timestamp as string),
      replyToMessageId: (raw.message_reference as Record<string, unknown>)?.message_id as string | undefined,
      isBot: author.bot as boolean || false,
      isDM: !raw.guild_id,
      attachments: ((raw.attachments as unknown[]) || []).map((a: unknown) => {
        const att = a as Record<string, unknown>;
        return {
          id: att.id as string,
          filename: att.filename as string,
          url: att.url as string,
          size: att.size as number,
          contentType: att.content_type as string | undefined
        };
      }),
      mentions: ((raw.mentions as unknown[]) || []).map((m: unknown) => (m as Record<string, unknown>).id as string)
    };
  }

  private isAllowed(msg: DiscordMessage): boolean {
    // Ignore bot messages
    if (msg.isBot) return false;

    // Check channel allowlist
    if (this.config.allowedChannels?.length) {
      if (!this.config.allowedChannels.includes(msg.channelId)) {
        return false;
      }
    }

    // Check user allowlist
    if (this.config.allowedUsers?.length) {
      if (!this.config.allowedUsers.includes(msg.authorId)) {
        return false;
      }
    }

    return true;
  }

  private identify(): void {
    this.ws?.send(JSON.stringify({
      op: 2,
      d: {
        token: this.config.botToken,
        intents: 513 | 32768, // GUILDS | GUILD_MESSAGES | MESSAGE_CONTENT
        properties: {
          os: 'linux',
          browser: 'lisa',
          device: 'lisa'
        }
      }
    }));
  }

  private startHeartbeat(interval: number): void {
    this.heartbeatInterval = setInterval(() => {
      this.ws?.send(JSON.stringify({ op: 1, d: this.sequence }));
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
    this.status = 'disconnected';
    this.emit('disconnected');
  }

  getStatus(): DiscordChannelStatus {
    return this.status;
  }

  // REST API calls
  private async apiCall(endpoint: string, method = 'GET', body?: unknown): Promise<unknown> {
    const response = await fetch(`https://discord.com/api/v10${endpoint}`, {
      method,
      headers: {
        Authorization: `Bot ${this.config.botToken}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    return response.json();
  }

  // Send messages
  async sendMessage(channelId: string, content: string, options?: {
    replyToMessageId?: string;
    embeds?: unknown[];
  }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const result = await this.apiCall(`/channels/${channelId}/messages`, 'POST', {
        content,
        message_reference: options?.replyToMessageId ? { message_id: options.replyToMessageId } : undefined,
        embeds: options?.embeds
      }) as { id: string };

      this.emit('message:sent', { channelId, messageId: result.id });
      return { success: true, messageId: result.id };
    } catch {
      return { success: false };
    }
  }

  async reply(message: DiscordMessage, content: string): Promise<{ success: boolean; messageId?: string }> {
    return this.sendMessage(message.channelId, content, {
      replyToMessageId: message.id
    });
  }

  // Typing indicator
  async sendTyping(channelId: string): Promise<void> {
    await this.apiCall(`/channels/${channelId}/typing`, 'POST');
  }

  // Guild info
  getGuilds(): DiscordGuild[] {
    return Array.from(this.guilds.values());
  }

  // History
  getMessageHistory(channelId?: string, limit?: number): DiscordMessage[] {
    let messages = [...this.messageHistory];
    
    if (channelId) {
      messages = messages.filter(m => m.channelId === channelId);
    }
    
    return limit ? messages.slice(-limit) : messages;
  }

  isAdmin(userId: string): boolean {
    return this.config.adminUsers?.includes(userId) || false;
  }

  // Stats
  getStats(): {
    status: DiscordChannelStatus;
    botUsername: string | null;
    guildCount: number;
    messageCount: number;
  } {
    return {
      status: this.status,
      botUsername: this.botUser?.username || null,
      guildCount: this.guilds.size,
      messageCount: this.messageHistory.length
    };
  }
}

// Singleton
let discordChannelInstance: DiscordChannelManager | null = null;

export function getDiscordChannel(config?: Partial<DiscordConfig> & { botToken: string }): DiscordChannelManager {
  if (!discordChannelInstance && config) {
    discordChannelInstance = new DiscordChannelManager(config);
  }
  if (!discordChannelInstance) {
    throw new Error('DiscordChannel not initialized. Provide config first.');
  }
  return discordChannelInstance;
}

export function resetDiscordChannel(): void {
  if (discordChannelInstance) {
    discordChannelInstance.disconnect();
    discordChannelInstance.removeAllListeners();
    discordChannelInstance = null;
  }
}

