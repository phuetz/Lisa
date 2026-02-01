/**
 * Lisa Discord Bot - Browser Stub
 * The real Discord bot only works in Node.js (server-side)
 * This stub provides type exports for browser usage
 */

import { BrowserEventEmitter } from '../BrowserEventEmitter';

export interface DiscordConfig {
  token: string;
  allowedUsers?: string[];
  allowedGuilds?: string[];
  allowedChannels?: string[];
  commandPrefix?: string;
  activityMessage?: string;
}

export interface DiscordMessage {
  id: string;
  channelId: string;
  guildId?: string;
  userId: string;
  username: string;
  displayName: string;
  text: string;
  isDM: boolean;
  isBot: boolean;
  replyToMessageId?: string;
  attachments: Array<{ url: string; type: string; name: string }>;
  timestamp: Date;
}

export interface DiscordState {
  isConnected: boolean;
  botUsername?: string;
  botId?: string;
  guildCount: number;
  messageCount: number;
  lastActivity?: Date;
  error?: string;
}

/**
 * Browser stub for DiscordBot
 * Discord.js requires Node.js and cannot run in the browser
 */
export class DiscordBot extends BrowserEventEmitter {
  private state: DiscordState = {
    isConnected: false,
    guildCount: 0,
    messageCount: 0,
    error: 'Discord bot is only available server-side (Node.js)',
  };

  constructor(_config: DiscordConfig) {
    super();
    console.warn('[DiscordBot] Discord.js requires Node.js. This is a browser stub.');
  }

  async start(): Promise<void> {
    throw new Error('Discord bot cannot run in browser. Use server-side Node.js.');
  }

  async stop(): Promise<void> {
    // No-op in browser
  }

  getState(): DiscordState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return false;
  }

  setMessageHandler(_handler: (msg: DiscordMessage) => Promise<string>): void {
    console.warn('[DiscordBot] Message handler ignored in browser stub');
  }

  async sendToChannel(_channelId: string, _text: string): Promise<void> {
    throw new Error('Discord bot cannot run in browser');
  }

  getConversationHistory(_channelId: string): Array<{ role: string; content: string }> {
    return [];
  }
}

// Singleton stub
let instance: DiscordBot | null = null;

export function getDiscordBot(config?: DiscordConfig): DiscordBot {
  if (!instance && config) {
    instance = new DiscordBot(config);
  }
  if (!instance) {
    throw new Error('DiscordBot not initialized');
  }
  return instance;
}

export function resetDiscordBot(): void {
  instance = null;
}
