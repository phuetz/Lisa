/**
 * Lisa WhatsApp Bot - Browser Stub
 * The real WhatsApp bot (Baileys) only works in Node.js
 */

import { BrowserEventEmitter } from '../BrowserEventEmitter';

export interface WhatsAppConfig {
  sessionPath?: string;
  printQRInTerminal?: boolean;
  allowedNumbers?: string[];
  allowedGroups?: string[];
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

export interface WhatsAppMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  senderNumber: string;
  text: string;
  isGroup: boolean;
  groupName?: string;
  quotedMessageId?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  mediaUrl?: string;
  timestamp: Date;
}

export interface WhatsAppState {
  isConnected: boolean;
  isAuthenticated: boolean;
  phoneNumber?: string;
  messageCount: number;
  lastActivity?: Date;
  qrCode?: string;
  error?: string;
}

export class WhatsAppBot extends BrowserEventEmitter {
  private state: WhatsAppState = {
    isConnected: false,
    isAuthenticated: false,
    messageCount: 0,
    error: 'WhatsApp bot is only available server-side (Node.js)',
  };

  constructor(_config?: WhatsAppConfig) {
    super();
    console.warn('[WhatsAppBot] Baileys requires Node.js. This is a browser stub.');
  }

  async start(): Promise<void> {
    throw new Error('WhatsApp bot cannot run in browser. Use server-side Node.js.');
  }

  async stop(): Promise<void> {
    // No-op
  }

  getState(): WhatsAppState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return false;
  }

  setMessageHandler(_handler: (msg: WhatsAppMessage) => Promise<string>): void {
    console.warn('[WhatsAppBot] Message handler ignored in browser stub');
  }

  async sendMessage(_chatId: string, _text: string): Promise<void> {
    throw new Error('WhatsApp bot cannot run in browser');
  }

  async sendImage(_chatId: string, _imageUrl: string, _caption?: string): Promise<void> {
    throw new Error('WhatsApp bot cannot run in browser');
  }
}

let instance: WhatsAppBot | null = null;

export function getWhatsAppBot(config?: WhatsAppConfig): WhatsAppBot {
  if (!instance) {
    instance = new WhatsAppBot(config);
  }
  return instance;
}

export function resetWhatsAppBot(): void {
  instance = null;
}
