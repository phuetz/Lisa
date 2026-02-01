/**
 * Lisa WhatsApp Channel
 * WhatsApp integration via Baileys (unofficial API)
 * Inspired by OpenClaw's WhatsApp channel
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface WhatsAppConfig {
  sessionId: string;
  dataPath?: string;
  allowedNumbers?: string[];
  blockedNumbers?: string[];
  adminNumbers?: string[];
  autoRead?: boolean;
  typingDelay?: number;
}

export interface WhatsAppMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  senderPushName?: string;
  text: string;
  timestamp: Date;
  isGroup: boolean;
  isFromMe: boolean;
  quotedMessageId?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  mediaUrl?: string;
  mentions?: string[];
}

export interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  participantCount?: number;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export interface WhatsAppContact {
  id: string;
  name?: string;
  pushName?: string;
  isMyContact: boolean;
  isBlocked: boolean;
}

export type WhatsAppStatus = 'disconnected' | 'connecting' | 'qr_pending' | 'connected' | 'error';

const DEFAULT_CONFIG: Partial<WhatsAppConfig> = {
  autoRead: false,
  typingDelay: 1000
};

export class WhatsAppChannel extends BrowserEventEmitter {
  private config: WhatsAppConfig;
  private status: WhatsAppStatus = 'disconnected';
  private qrCode: string | null = null;
  private phoneNumber: string | null = null;
  private messageHistory: WhatsAppMessage[] = [];
  private chats: Map<string, WhatsAppChat> = new Map();
  private maxHistorySize = 100;
  private socket: unknown = null;

  constructor(config: WhatsAppConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Connection via Baileys (demo mode in browser)
  async connect(): Promise<boolean> {
    this.status = 'connecting';
    this.emit('status:changed', this.status);

    try {
      // In browser context, use demo mode
      // Baileys requires Node.js environment
      // Install @whiskeysockets/baileys for full functionality in Node backend
      
      // Demo mode: simulate QR code flow
      this.status = 'qr_pending';
      this.qrCode = this.generateDemoQR();
      this.emit('qr', this.qrCode);
      
      // Simulate successful connection after QR scan (5 seconds)
      setTimeout(() => {
        this.status = 'connected';
        this.phoneNumber = '+33612345678';
        this.emit('connected', { phoneNumber: this.phoneNumber });
        
        // Start simulated message polling
        this.startDemoMode();
      }, 5000);
      
      return true;
    } catch (error) {
      this.status = 'error';
      const msg = error instanceof Error ? error.message : String(error);
      this.emit('error', { message: msg });
      return false;
    }
  }

  private startDemoMode(): void {
    // Demo mode: emit occasional test messages
    console.log('[WhatsApp] Running in demo mode - install @whiskeysockets/baileys for real connection');
  }

  private generateDemoQR(): string {
    // Generate a placeholder QR code data
    return 'DEMO_QR_CODE_' + Date.now();
  }

  private parseMessage(raw: Record<string, unknown>): WhatsAppMessage | null {
    const key = raw.key as Record<string, unknown> | undefined;
    const message = raw.message as Record<string, unknown> | undefined;
    
    if (!key || !message) return null;

    const conversation = message.conversation as string | undefined;
    const extendedText = message.extendedTextMessage as Record<string, unknown> | undefined;
    const text = conversation || extendedText?.text as string || '';

    return {
      id: key.id as string,
      chatId: key.remoteJid as string,
      senderId: key.participant as string || key.remoteJid as string,
      senderName: (raw.pushName as string) || undefined,
      senderPushName: raw.pushName as string | undefined,
      text,
      timestamp: new Date((raw.messageTimestamp as number) * 1000),
      isGroup: (key.remoteJid as string)?.endsWith('@g.us') || false,
      isFromMe: key.fromMe as boolean || false,
      quotedMessageId: extendedText?.contextInfo ? 
        (extendedText.contextInfo as Record<string, unknown>).stanzaId as string : undefined,
      mediaType: this.getMediaType(message),
      mentions: extendedText?.contextInfo ?
        (extendedText.contextInfo as Record<string, unknown>).mentionedJid as string[] : undefined
    };
  }

  private getMediaType(message: Record<string, unknown>): WhatsAppMessage['mediaType'] | undefined {
    if (message.imageMessage) return 'image';
    if (message.videoMessage) return 'video';
    if (message.audioMessage) return 'audio';
    if (message.documentMessage) return 'document';
    if (message.stickerMessage) return 'sticker';
    return undefined;
  }

  private isAllowed(msg: WhatsAppMessage): boolean {
    if (msg.isFromMe) return false;

    const senderId = msg.senderId.split('@')[0];

    if (this.config.blockedNumbers?.includes(senderId)) {
      return false;
    }

    if (this.config.allowedNumbers?.length) {
      if (!this.config.allowedNumbers.includes(senderId)) {
        return false;
      }
    }

    return true;
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      const sock = this.socket as { end?: () => void };
      sock.end?.();
      this.socket = null;
    }
    this.status = 'disconnected';
    this.emit('disconnected');
  }

  getStatus(): WhatsAppStatus {
    return this.status;
  }

  getQRCode(): string | null {
    return this.qrCode;
  }

  getPhoneNumber(): string | null {
    return this.phoneNumber;
  }

  // Send messages
  async sendMessage(chatId: string, text: string, options?: {
    quotedMessageId?: string;
    mentions?: string[];
  }): Promise<{ success: boolean; messageId?: string }> {
    if (!this.socket || this.status !== 'connected') {
      return { success: false };
    }

    try {
      const sock = this.socket as { 
        sendMessage: (jid: string, content: unknown, options?: unknown) => Promise<{ key: { id: string } }> 
      };

      // Typing indicator
      await this.sendTyping(chatId);
      await this.delay(this.config.typingDelay || 1000);

      const result = await sock.sendMessage(chatId, { text }, {
        quoted: options?.quotedMessageId ? { key: { id: options.quotedMessageId } } : undefined
      });

      this.emit('message:sent', { chatId, messageId: result.key.id });
      return { success: true, messageId: result.key.id };
    } catch {
      return { success: false };
    }
  }

  async reply(message: WhatsAppMessage, text: string): Promise<{ success: boolean; messageId?: string }> {
    return this.sendMessage(message.chatId, text, {
      quotedMessageId: message.id
    });
  }

  async sendImage(chatId: string, imageUrl: string, caption?: string): Promise<{ success: boolean }> {
    if (!this.socket || this.status !== 'connected') {
      return { success: false };
    }

    try {
      const sock = this.socket as { sendMessage: (jid: string, content: unknown) => Promise<unknown> };
      await sock.sendMessage(chatId, {
        image: { url: imageUrl },
        caption
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async sendDocument(chatId: string, documentUrl: string, filename: string): Promise<{ success: boolean }> {
    if (!this.socket || this.status !== 'connected') {
      return { success: false };
    }

    try {
      const sock = this.socket as { sendMessage: (jid: string, content: unknown) => Promise<unknown> };
      await sock.sendMessage(chatId, {
        document: { url: documentUrl },
        fileName: filename
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  // Typing indicator
  async sendTyping(chatId: string): Promise<void> {
    if (!this.socket) return;

    try {
      const sock = this.socket as { sendPresenceUpdate: (presence: string, jid: string) => Promise<void> };
      await sock.sendPresenceUpdate('composing', chatId);
    } catch {
      // Ignore errors
    }
  }

  // Read receipts
  async markAsRead(chatId: string, messageIds: string[]): Promise<void> {
    if (!this.socket) return;

    try {
      const sock = this.socket as { readMessages: (keys: unknown[]) => Promise<void> };
      await sock.readMessages(messageIds.map(id => ({ remoteJid: chatId, id })));
    } catch {
      // Ignore errors
    }
  }

  // Chat management
  async getChats(): Promise<WhatsAppChat[]> {
    return Array.from(this.chats.values());
  }

  isAdmin(senderId: string): boolean {
    const number = senderId.split('@')[0];
    return this.config.adminNumbers?.includes(number) || false;
  }

  // History
  getMessageHistory(chatId?: string, limit?: number): WhatsAppMessage[] {
    let messages = [...this.messageHistory];
    
    if (chatId) {
      messages = messages.filter(m => m.chatId === chatId);
    }
    
    return limit ? messages.slice(-limit) : messages;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Stats
  getStats(): {
    status: WhatsAppStatus;
    phoneNumber: string | null;
    messageCount: number;
    chatCount: number;
  } {
    return {
      status: this.status,
      phoneNumber: this.phoneNumber,
      messageCount: this.messageHistory.length,
      chatCount: this.chats.size
    };
  }
}

// Singleton
let whatsappChannelInstance: WhatsAppChannel | null = null;

export function getWhatsAppChannel(config?: WhatsAppConfig): WhatsAppChannel {
  if (!whatsappChannelInstance && config) {
    whatsappChannelInstance = new WhatsAppChannel(config);
  }
  if (!whatsappChannelInstance) {
    throw new Error('WhatsAppChannel not initialized. Provide config first.');
  }
  return whatsappChannelInstance;
}

export function resetWhatsAppChannel(): void {
  if (whatsappChannelInstance) {
    whatsappChannelInstance.disconnect();
    whatsappChannelInstance.removeAllListeners();
    whatsappChannelInstance = null;
  }
}

