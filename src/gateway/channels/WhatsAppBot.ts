/**
 * Lisa WhatsApp Bot - Real WhatsApp integration using Baileys
 * Based on OpenClaw's WhatsApp implementation
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

const DEFAULT_CONFIG: WhatsAppConfig = {
  sessionPath: './whatsapp-session',
  printQRInTerminal: true,
  autoReconnect: true,
  maxReconnectAttempts: 5,
};

export class WhatsAppBot extends BrowserEventEmitter {
  private config: WhatsAppConfig;
  private state: WhatsAppState = {
    isConnected: false,
    isAuthenticated: false,
    messageCount: 0,
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private socket: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private store: any = null;
  private messageHandler?: (msg: WhatsAppMessage) => Promise<string>;
  private conversationHistory: Map<string, Array<{ role: string; content: string }>> = new Map();
  private reconnectAttempts = 0;

  constructor(config?: Partial<WhatsAppConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    try {
      // Dynamic import for Node.js compatibility
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } =
        await import('@whiskeysockets/baileys');
      const { Boom } = await import('@hapi/boom');

      // Get latest version
      const { version } = await fetchLatestBaileysVersion();

      // Load auth state
      // eslint-disable-next-line react-hooks/rules-of-hooks -- useMultiFileAuthState is not a React hook, it's a Baileys auth utility
      const { state: authState, saveCreds } = await useMultiFileAuthState(
        this.config.sessionPath || './whatsapp-session'
      );

      // Create socket
      this.socket = makeWASocket({
        version,
        auth: authState,
        printQRInTerminal: this.config.printQRInTerminal,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getMessage: async (key: any) => {
          if (this.store) {
            const msg = await this.store.loadMessage(key.remoteJid!, key.id!);
            return msg?.message || undefined;
          }
          return { conversation: '' };
        },
      });

      // Handle connection updates
      this.socket.ev.on('connection.update', async (update: { connection?: string; lastDisconnect?: { error?: Error }; qr?: string }) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.state.qrCode = qr;
          this.emit('qr', qr);
        }

        if (connection === 'close') {
          this.state.isConnected = false;
          const shouldReconnect = 
            (lastDisconnect?.error as typeof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          
          if (shouldReconnect && this.config.autoReconnect && 
              this.reconnectAttempts < (this.config.maxReconnectAttempts || 5)) {
            this.reconnectAttempts++;
            this.emit('reconnecting', { attempt: this.reconnectAttempts });
            setTimeout(() => this.start(), 5000);
          } else {
            this.emit('disconnected', { reason: 'logged_out' });
          }
        } else if (connection === 'open') {
          this.state.isConnected = true;
          this.state.isAuthenticated = true;
          this.reconnectAttempts = 0;
          
          const user = this.socket.user;
          this.state.phoneNumber = user?.id?.split(':')[0];
          
          this.emit('connected', { 
            phoneNumber: this.state.phoneNumber,
            name: user?.name 
          });
        }
      });

      // Save credentials on update
      this.socket.ev.on('creds.update', saveCreds);

      // Handle messages
      this.socket.ev.on('messages.upsert', async (m: { messages: Array<{ key: { remoteJid?: string; fromMe?: boolean; id?: string }; message?: { conversation?: string; extendedTextMessage?: { text?: string }; imageMessage?: object; videoMessage?: object; audioMessage?: object; documentMessage?: object; stickerMessage?: object }; pushName?: string; messageTimestamp?: number }> }) => {
        for (const msg of m.messages) {
          if (!msg.message || msg.key.fromMe) continue;

          const parsedMsg = this.parseMessage(msg);
          if (!parsedMsg) continue;

          if (!this.isAllowed(parsedMsg)) continue;

          this.state.messageCount++;
          this.state.lastActivity = new Date();

          // Add to history
          this.addToHistory(parsedMsg.chatId, 'user', parsedMsg.text);

          this.emit('message', parsedMsg);

          // Handle with custom handler
          if (this.messageHandler) {
            try {
              const response = await this.messageHandler(parsedMsg);
              if (response) {
                await this.sendMessage(parsedMsg.chatId, response);
                this.addToHistory(parsedMsg.chatId, 'assistant', response);
              }
            } catch (error) {
              this.emit('error', error);
            }
          }
        }
      });

      this.emit('started');
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error);
      this.emit('error', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseMessage(raw: any): WhatsAppMessage | null {
    const key = raw.key;
    const message = raw.message;
    if (!key?.remoteJid || !message) return null;

    const isGroup = key.remoteJid.endsWith('@g.us');
    const text = message.conversation || 
                 message.extendedTextMessage?.text || 
                 message.imageMessage?.caption ||
                 message.videoMessage?.caption ||
                 '';

    if (!text.trim()) return null;

    let mediaType: WhatsAppMessage['mediaType'];
    if (message.imageMessage) mediaType = 'image';
    else if (message.videoMessage) mediaType = 'video';
    else if (message.audioMessage) mediaType = 'audio';
    else if (message.documentMessage) mediaType = 'document';
    else if (message.stickerMessage) mediaType = 'sticker';

    return {
      id: key.id || '',
      chatId: key.remoteJid,
      senderId: key.participant || key.remoteJid,
      senderName: raw.pushName,
      senderNumber: (key.participant || key.remoteJid).split('@')[0],
      text,
      isGroup,
      mediaType,
      timestamp: new Date((raw.messageTimestamp || 0) * 1000),
    };
  }

  private isAllowed(msg: WhatsAppMessage): boolean {
    // If no whitelist, allow all
    if (!this.config.allowedNumbers?.length && !this.config.allowedGroups?.length) {
      return true;
    }

    // Check number whitelist
    if (this.config.allowedNumbers?.length) {
      if (this.config.allowedNumbers.includes(msg.senderNumber)) {
        return true;
      }
    }

    // Check group whitelist
    if (msg.isGroup && this.config.allowedGroups?.length) {
      if (this.config.allowedGroups.includes(msg.chatId)) {
        return true;
      }
    }

    return false;
  }

  private addToHistory(chatId: string, role: string, content: string): void {
    const history = this.conversationHistory.get(chatId) || [];
    history.push({ role, content });
    
    // Keep last 50 messages
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.conversationHistory.set(chatId, history);
  }

  setMessageHandler(handler: (msg: WhatsAppMessage) => Promise<string>): void {
    this.messageHandler = handler;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.socket || !this.state.isConnected) {
      throw new Error('WhatsApp not connected');
    }

    // Chunk long messages (WhatsApp limit ~65536 but better to chunk at 4096)
    const chunks = this.chunkText(text, 4096);
    
    for (const chunk of chunks) {
      await this.socket.sendMessage(chatId, { text: chunk });
    }
  }

  async sendImage(chatId: string, imageUrl: string, caption?: string): Promise<void> {
    if (!this.socket || !this.state.isConnected) {
      throw new Error('WhatsApp not connected');
    }

    await this.socket.sendMessage(chatId, {
      image: { url: imageUrl },
      caption,
    });
  }

  async sendDocument(chatId: string, documentUrl: string, filename: string, caption?: string): Promise<void> {
    if (!this.socket || !this.state.isConnected) {
      throw new Error('WhatsApp not connected');
    }

    await this.socket.sendMessage(chatId, {
      document: { url: documentUrl },
      fileName: filename,
      caption,
    });
  }

  async sendAudio(chatId: string, audioUrl: string, ptt = false): Promise<void> {
    if (!this.socket || !this.state.isConnected) {
      throw new Error('WhatsApp not connected');
    }

    await this.socket.sendMessage(chatId, {
      audio: { url: audioUrl },
      ptt, // Push to talk (voice note style)
    });
  }

  private chunkText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];
    
    const chunks: string[] = [];
    let remaining = text;
    
    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }
      
      // Find last space before maxLength
      let splitIndex = remaining.lastIndexOf(' ', maxLength);
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        splitIndex = maxLength;
      }
      
      chunks.push(remaining.substring(0, splitIndex));
      remaining = remaining.substring(splitIndex).trim();
    }
    
    return chunks;
  }

  async logout(): Promise<void> {
    if (this.socket) {
      await this.socket.logout();
      this.state.isAuthenticated = false;
      this.state.isConnected = false;
      this.emit('logout');
    }
  }

  async stop(): Promise<void> {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
    this.state.isConnected = false;
    this.emit('stopped');
  }

  getState(): WhatsAppState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }

  getConversationHistory(chatId: string): Array<{ role: string; content: string }> {
    return this.conversationHistory.get(chatId) || [];
  }

  clearHistory(chatId: string): void {
    this.conversationHistory.delete(chatId);
  }
}

// Singleton
let instance: WhatsAppBot | null = null;

export function getWhatsAppBot(config?: Partial<WhatsAppConfig>): WhatsAppBot {
  if (!instance) {
    instance = new WhatsAppBot(config);
  }
  return instance;
}

export function resetWhatsAppBot(): void {
  if (instance) {
    instance.stop();
    instance.removeAllListeners();
    instance = null;
  }
}
