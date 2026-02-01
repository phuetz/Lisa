/**
 * Lisa Telegram Channel
 * Telegram bot integration (grammY-compatible)
 * Inspired by OpenClaw's Telegram channel
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface TelegramConfig {
  botToken: string;
  webhookUrl?: string;
  allowedUsers?: number[];
  allowedGroups?: number[];
  adminUsers?: number[];
  parseMode: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
}

export interface TelegramMessage {
  id: number;
  chatId: number;
  userId: number;
  username?: string;
  firstName?: string;
  text: string;
  date: Date;
  replyToMessageId?: number;
  isGroup: boolean;
  isPrivate: boolean;
  mediaType?: 'photo' | 'audio' | 'video' | 'document' | 'voice' | 'sticker';
  mediaUrl?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface TelegramUser {
  id: number;
  isBot: boolean;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
}

export type TelegramChannelStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const DEFAULT_CONFIG: Partial<TelegramConfig> = {
  parseMode: 'HTML',
  disableNotification: false
};

export class TelegramChannel extends BrowserEventEmitter {
  private config: TelegramConfig;
  private status: TelegramChannelStatus = 'disconnected';
  private botInfo: TelegramUser | null = null;
  private messageHistory: TelegramMessage[] = [];
  private maxHistorySize = 100;

  constructor(config: Partial<TelegramConfig> & { botToken: string }) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as TelegramConfig;
  }

  // Connection
  async connect(): Promise<boolean> {
    if (!this.config.botToken) {
      this.status = 'error';
      this.emit('error', { message: 'Bot token required' });
      return false;
    }

    this.status = 'connecting';
    this.emit('status:changed', this.status);

    try {
      // Get bot info
      const response = await this.apiCall('getMe');
      if (response.ok) {
        this.botInfo = response.result;
        this.status = 'connected';
        this.emit('connected', this.botInfo);
        
        // Start polling if no webhook
        if (!this.config.webhookUrl) {
          this.startPolling();
        }
        
        return true;
      } else {
        throw new Error(response.description || 'Failed to connect');
      }
    } catch (error) {
      this.status = 'error';
      const msg = error instanceof Error ? error.message : String(error);
      this.emit('error', { message: msg });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    this.status = 'disconnected';
    this.emit('disconnected');
  }

  getStatus(): TelegramChannelStatus {
    return this.status;
  }

  getBotInfo(): TelegramUser | null {
    return this.botInfo;
  }

  // API calls
  private async apiCall(method: string, params?: Record<string, unknown>): Promise<{ ok: boolean; result?: unknown; description?: string }> {
    const url = `https://api.telegram.org/bot${this.config.botToken}/${method}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: params ? JSON.stringify(params) : undefined
      });
      
      return await response.json();
    } catch (error) {
      return { ok: false, description: error instanceof Error ? error.message : String(error) };
    }
  }

  // Polling
  private pollingTimer: ReturnType<typeof setTimeout> | null = null;
  private lastUpdateId = 0;

  private startPolling(): void {
    this.poll();
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async poll(): Promise<void> {
    if (this.status !== 'connected') return;

    try {
      const response = await this.apiCall('getUpdates', {
        offset: this.lastUpdateId + 1,
        timeout: 30,
        allowed_updates: ['message', 'callback_query']
      });

      if (response.ok && Array.isArray(response.result)) {
        for (const update of response.result) {
          this.lastUpdateId = update.update_id;
          this.handleUpdate(update);
        }
      }
    } catch {
      // Ignore polling errors
    }

    // Continue polling
    this.pollingTimer = setTimeout(() => this.poll(), 1000);
  }

  private handleUpdate(update: { update_id: number; message?: Record<string, unknown>; callback_query?: Record<string, unknown> }): void {
    if (update.message) {
      const msg = this.parseMessage(update.message);
      if (msg && this.isAllowed(msg)) {
        this.messageHistory.push(msg);
        if (this.messageHistory.length > this.maxHistorySize) {
          this.messageHistory.shift();
        }
        this.emit('message', msg);
      }
    }

    if (update.callback_query) {
      this.emit('callback_query', update.callback_query);
    }
  }

  private parseMessage(raw: Record<string, unknown>): TelegramMessage | null {
    const chat = raw.chat as Record<string, unknown> | undefined;
    const from = raw.from as Record<string, unknown> | undefined;
    
    if (!chat || !from) return null;

    return {
      id: raw.message_id as number,
      chatId: chat.id as number,
      userId: from.id as number,
      username: from.username as string | undefined,
      firstName: from.first_name as string | undefined,
      text: (raw.text || raw.caption || '') as string,
      date: new Date((raw.date as number) * 1000),
      replyToMessageId: (raw.reply_to_message as Record<string, unknown>)?.message_id as number | undefined,
      isGroup: ['group', 'supergroup'].includes(chat.type as string),
      isPrivate: chat.type === 'private',
      mediaType: this.getMediaType(raw),
      mediaUrl: undefined // Would need to call getFile API
    };
  }

  private getMediaType(raw: Record<string, unknown>): TelegramMessage['mediaType'] | undefined {
    if (raw.photo) return 'photo';
    if (raw.audio) return 'audio';
    if (raw.video) return 'video';
    if (raw.document) return 'document';
    if (raw.voice) return 'voice';
    if (raw.sticker) return 'sticker';
    return undefined;
  }

  private isAllowed(msg: TelegramMessage): boolean {
    // Check user allowlist
    if (this.config.allowedUsers?.length) {
      if (!this.config.allowedUsers.includes(msg.userId)) {
        return false;
      }
    }

    // Check group allowlist
    if (msg.isGroup && this.config.allowedGroups?.length) {
      if (!this.config.allowedGroups.includes(msg.chatId)) {
        return false;
      }
    }

    return true;
  }

  isAdmin(userId: number): boolean {
    return this.config.adminUsers?.includes(userId) || false;
  }

  // Send messages
  async sendMessage(chatId: number, text: string, options?: {
    parseMode?: TelegramConfig['parseMode'];
    replyToMessageId?: number;
    disableNotification?: boolean;
  }): Promise<{ success: boolean; messageId?: number }> {
    const response = await this.apiCall('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode || this.config.parseMode,
      reply_to_message_id: options?.replyToMessageId,
      disable_notification: options?.disableNotification ?? this.config.disableNotification
    });

    if (response.ok) {
      const result = response.result as Record<string, unknown>;
      this.emit('message:sent', { chatId, messageId: result.message_id });
      return { success: true, messageId: result.message_id as number };
    }

    return { success: false };
  }

  async reply(message: TelegramMessage, text: string): Promise<{ success: boolean; messageId?: number }> {
    return this.sendMessage(message.chatId, text, {
      replyToMessageId: message.id
    });
  }

  async sendPhoto(chatId: number, photoUrl: string, caption?: string): Promise<{ success: boolean }> {
    const response = await this.apiCall('sendPhoto', {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: this.config.parseMode
    });

    return { success: response.ok };
  }

  async sendDocument(chatId: number, documentUrl: string, caption?: string): Promise<{ success: boolean }> {
    const response = await this.apiCall('sendDocument', {
      chat_id: chatId,
      document: documentUrl,
      caption,
      parse_mode: this.config.parseMode
    });

    return { success: response.ok };
  }

  // Typing indicator
  async sendTyping(chatId: number): Promise<void> {
    await this.apiCall('sendChatAction', {
      chat_id: chatId,
      action: 'typing'
    });
  }

  // Get chat info
  async getChat(chatId: number): Promise<TelegramChat | null> {
    const response = await this.apiCall('getChat', { chat_id: chatId });
    if (response.ok) {
      return response.result as TelegramChat;
    }
    return null;
  }

  // History
  getMessageHistory(chatId?: number, limit?: number): TelegramMessage[] {
    let messages = [...this.messageHistory];
    
    if (chatId) {
      messages = messages.filter(m => m.chatId === chatId);
    }
    
    return limit ? messages.slice(-limit) : messages;
  }

  // Stats
  getStats(): {
    status: TelegramChannelStatus;
    botUsername: string | null;
    messageCount: number;
    uniqueChats: number;
  } {
    const chatIds = new Set(this.messageHistory.map(m => m.chatId));
    
    return {
      status: this.status,
      botUsername: this.botInfo?.username || null,
      messageCount: this.messageHistory.length,
      uniqueChats: chatIds.size
    };
  }
}

// Singleton
let telegramChannelInstance: TelegramChannel | null = null;

export function getTelegramChannel(config?: Partial<TelegramConfig> & { botToken: string }): TelegramChannel {
  if (!telegramChannelInstance && config) {
    telegramChannelInstance = new TelegramChannel(config);
  }
  if (!telegramChannelInstance) {
    throw new Error('TelegramChannel not initialized. Provide config first.');
  }
  return telegramChannelInstance;
}

export function resetTelegramChannel(): void {
  if (telegramChannelInstance) {
    telegramChannelInstance.disconnect();
    telegramChannelInstance.removeAllListeners();
    telegramChannelInstance = null;
  }
}

