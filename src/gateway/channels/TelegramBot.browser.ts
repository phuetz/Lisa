/**
 * Lisa Telegram Bot - Browser Stub
 * The real Telegram bot (grammy) only works in Node.js
 */

import { BrowserEventEmitter } from '../BrowserEventEmitter';

export interface TelegramConfig {
  token: string;
  allowedUsers?: string[];
  allowedGroups?: string[];
  webhookUrl?: string;
  pollingMode?: boolean;
  rateLimitPerSecond?: number;
}

export interface TelegramMessage {
  id: number;
  chatId: number;
  userId: number;
  username?: string;
  firstName?: string;
  text: string;
  isGroup: boolean;
  replyToMessageId?: number;
  mediaType?: 'photo' | 'audio' | 'video' | 'document' | 'voice' | 'sticker';
  mediaFileId?: string;
  timestamp: Date;
}

export interface TelegramState {
  isConnected: boolean;
  botUsername?: string;
  botId?: number;
  messageCount: number;
  lastActivity?: Date;
  error?: string;
}

export class TelegramBot extends BrowserEventEmitter {
  private state: TelegramState = {
    isConnected: false,
    messageCount: 0,
    error: 'Telegram bot is only available server-side (Node.js)',
  };

  constructor(_config: TelegramConfig) {
    super();
    console.warn('[TelegramBot] grammy requires Node.js. This is a browser stub.');
  }

  async start(): Promise<void> {
    throw new Error('Telegram bot cannot run in browser. Use server-side Node.js.');
  }

  async stop(): Promise<void> {
    // No-op
  }

  getState(): TelegramState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return false;
  }

  setMessageHandler(_handler: (msg: TelegramMessage) => Promise<string>): void {
    console.warn('[TelegramBot] Message handler ignored in browser stub');
  }

  async sendMessage(_chatId: number, _text: string): Promise<void> {
    throw new Error('Telegram bot cannot run in browser');
  }

  async sendPhoto(_chatId: number, _photoUrl: string, _caption?: string): Promise<void> {
    throw new Error('Telegram bot cannot run in browser');
  }
}

let instance: TelegramBot | null = null;

export function getTelegramBot(config?: TelegramConfig): TelegramBot {
  if (!instance && config) {
    instance = new TelegramBot(config);
  }
  if (!instance) {
    throw new Error('TelegramBot not initialized');
  }
  return instance;
}

export function resetTelegramBot(): void {
  instance = null;
}
