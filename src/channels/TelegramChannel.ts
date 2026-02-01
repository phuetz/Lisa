/**
 * Lisa Telegram Channel
 * Integration with Telegram Bot API using grammY
 * Inspired by OpenClaw's multi-channel architecture
 */

import { getGateway } from '../gateway/GatewayServer';
import type { Session, MessagePayload, Attachment } from '../gateway/types';

// Types for Telegram integration
export interface TelegramConfig {
  botToken: string;
  webhookUrl?: string;
  allowedUsers?: string[];
  allowedGroups?: string[];
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  maxMessageLength?: number;
}

export interface TelegramMessage {
  messageId: number;
  chatId: number;
  userId: number;
  username?: string;
  text?: string;
  photo?: TelegramPhoto[];
  audio?: TelegramAudio;
  document?: TelegramDocument;
  replyToMessageId?: number;
  date: number;
}

export interface TelegramPhoto {
  fileId: string;
  fileUniqueId: string;
  width: number;
  height: number;
  fileSize?: number;
}

export interface TelegramAudio {
  fileId: string;
  fileUniqueId: string;
  duration: number;
  mimeType?: string;
  fileSize?: number;
}

export interface TelegramDocument {
  fileId: string;
  fileUniqueId: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

type MessageHandler = (message: TelegramMessage) => Promise<void>;
type ErrorHandler = (error: Error) => void;

export class TelegramChannel {
  private config: TelegramConfig;
  private sessions: Map<number, Session> = new Map(); // chatId -> session
  private messageHandlers: MessageHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private isRunning = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastUpdateId = 0;

  constructor(config: TelegramConfig) {
    this.config = {
      parseMode: 'HTML',
      maxMessageLength: 4096,
      ...config
    };
  }

  // Bot lifecycle
  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      // Verify bot token
      const me = await this.apiCall<{ username: string }>('getMe');
      console.log(`[Telegram] Bot started: @${me.username}`);
      
      this.isRunning = true;
      
      // Start polling for updates
      this.startPolling();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    console.log('[Telegram] Bot stopped');
  }

  // Polling
  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollUpdates();
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
      }
    }, 1000);
  }

  private async pollUpdates(): Promise<void> {
    const updates = await this.apiCall<Array<{ update_id: number; message?: TelegramMessage }>>('getUpdates', {
      offset: this.lastUpdateId + 1,
      timeout: 30,
      allowed_updates: ['message', 'callback_query']
    });

    for (const update of updates) {
      this.lastUpdateId = update.update_id;
      
      if (update.message) {
        await this.handleIncomingMessage(update.message);
      }
    }
  }

  // Message handling
  private async handleIncomingMessage(msg: TelegramMessage): Promise<void> {
    const chatId = msg.chatId;
    const userId = msg.userId;

    // Check if user is allowed
    if (this.config.allowedUsers && !this.config.allowedUsers.includes(String(userId))) {
      await this.sendMessage(chatId, '⛔ Désolé, vous n\'êtes pas autorisé à utiliser ce bot.');
      return;
    }

    // Get or create session
    let session = this.sessions.get(chatId);
    if (!session) {
      session = await this.createSession(chatId, userId, msg.username);
      this.sessions.set(chatId, session);
    }

    // Handle commands
    if (msg.text?.startsWith('/')) {
      await this.handleCommand(chatId, msg.text, session);
      return;
    }

    // Process message through Gateway
    await this.processMessage(chatId, msg, session);

    // Notify handlers
    for (const handler of this.messageHandlers) {
      await handler(msg);
    }
  }

  private async createSession(_chatId: number, userId: number, _username?: string): Promise<Session> {
    const gateway = getGateway();
    return gateway.createSession(
      `telegram:${userId}`,
      'telegram',
      {
        customPrompt: undefined,
        workspace: undefined,
        skills: []
      }
    );
  }

  private async handleCommand(chatId: number, command: string, session: Session): Promise<void> {
    const [cmd, ..._args] = command.split(' ');
    
    switch (cmd.toLowerCase()) {
      case '/start':
        await this.sendMessage(chatId, 
          '👋 Bonjour! Je suis Lisa, votre assistante IA.\n\n' +
          'Commandes disponibles:\n' +
          '/help - Afficher l\'aide\n' +
          '/new - Nouvelle conversation\n' +
          '/status - Voir le statut\n' +
          '/skills - Voir les skills actifs'
        );
        break;
        
      case '/help':
        await this.sendMessage(chatId,
          '📚 <b>Aide Lisa</b>\n\n' +
          'Je peux vous aider avec:\n' +
          '• Répondre à vos questions\n' +
          '• Analyser des images (envoyez une photo)\n' +
          '• Exécuter du code\n' +
          '• Rechercher sur le web\n\n' +
          'Envoyez simplement votre message!'
        );
        break;
        
      case '/new':
      case '/reset': {
        const gateway = getGateway();
        await gateway.closeSession(session.id);
        this.sessions.delete(chatId);
        await this.sendMessage(chatId, '🔄 Conversation réinitialisée. Comment puis-je vous aider?');
        break;
      }
        
      case '/status': {
        await this.sendMessage(chatId,
          `📊 <b>Statut</b>\n\n` +
          `Session: ${session.id.slice(0, 8)}...\n` +
          `Modèle: ${session.metadata.model || 'default'}\n` +
          `Skills: ${session.metadata.skills?.length || 0} actifs`
        );
        break;
      }
        
      case '/skills': {
        const skills = session.metadata.skills || [];
        if (skills.length === 0) {
          await this.sendMessage(chatId, '🔧 Aucun skill activé pour cette session.');
        } else {
          await this.sendMessage(chatId,
            `🔧 <b>Skills actifs</b>\n\n${skills.map(s => `• ${s}`).join('\n')}`
          );
        }
        break;
      }
        
      default:
        await this.sendMessage(chatId, `❓ Commande inconnue: ${cmd}`);
    }
  }

  private async processMessage(chatId: number, msg: TelegramMessage, session: Session): Promise<void> {
    const gateway = getGateway();
    
    // Build attachments from media
    const attachments: Attachment[] = [];
    
    if (msg.photo && msg.photo.length > 0) {
      // Get highest resolution photo
      const photo = msg.photo[msg.photo.length - 1];
      const fileUrl = await this.getFileUrl(photo.fileId);
      if (fileUrl) {
        attachments.push({
          type: 'image',
          url: fileUrl,
          mimeType: 'image/jpeg'
        });
      }
    }
    
    if (msg.audio) {
      const fileUrl = await this.getFileUrl(msg.audio.fileId);
      if (fileUrl) {
        attachments.push({
          type: 'audio',
          url: fileUrl,
          mimeType: msg.audio.mimeType || 'audio/ogg'
        });
      }
    }
    
    if (msg.document) {
      const fileUrl = await this.getFileUrl(msg.document.fileId);
      if (fileUrl) {
        attachments.push({
          type: 'file',
          url: fileUrl,
          mimeType: msg.document.mimeType || 'application/octet-stream',
          filename: msg.document.fileName
        });
      }
    }

    // Send message to Gateway
    const payload: MessagePayload = {
      content: msg.text || '[Media]',
      role: 'user',
      attachments: attachments.length > 0 ? attachments : undefined
    };

    // Show typing indicator
    await this.sendChatAction(chatId, 'typing');

    // Send to gateway and stream response
    try {
      await gateway.sendMessage(session.id, payload);
      
      // Listen for response (in real impl, subscribe to session events)
      gateway.once('message:received', async (response: { payload: MessagePayload; sessionId: string }) => {
        if (response.sessionId === session.id && response.payload.role === 'assistant') {
          await this.sendLongMessage(chatId, response.payload.content);
        }
      });
    } catch (error) {
      await this.sendMessage(chatId, '❌ Erreur lors du traitement de votre message.');
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Telegram API methods
  async sendMessage(chatId: number, text: string, options: Record<string, unknown> = {}): Promise<TelegramMessage> {
    return this.apiCall('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: this.config.parseMode,
      ...options
    });
  }

  async sendLongMessage(chatId: number, text: string): Promise<void> {
    const maxLength = this.config.maxMessageLength || 4096;
    
    if (text.length <= maxLength) {
      await this.sendMessage(chatId, text);
      return;
    }

    // Split into chunks
    const chunks: string[] = [];
    let remaining = text;
    
    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }
      
      // Try to split at a newline
      let splitIndex = remaining.lastIndexOf('\n', maxLength);
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        // Split at space
        splitIndex = remaining.lastIndexOf(' ', maxLength);
      }
      if (splitIndex === -1) {
        splitIndex = maxLength;
      }
      
      chunks.push(remaining.slice(0, splitIndex));
      remaining = remaining.slice(splitIndex).trim();
    }

    for (const chunk of chunks) {
      await this.sendMessage(chatId, chunk);
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async sendChatAction(chatId: number, action: string): Promise<boolean> {
    return this.apiCall('sendChatAction', {
      chat_id: chatId,
      action
    });
  }

  async getFileUrl(fileId: string): Promise<string | null> {
    try {
      const file = await this.apiCall<{ file_path: string }>('getFile', { file_id: fileId });
      return `https://api.telegram.org/file/bot${this.config.botToken}/${file.file_path}`;
    } catch {
      return null;
    }
  }

  private async apiCall<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const url = `https://api.telegram.org/bot${this.config.botToken}/${method}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }
    
    return data.result as T;
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
    console.error('[Telegram] Error:', error.message);
    for (const handler of this.errorHandlers) {
      handler(error);
    }
  }

  // Getters
  isConnected(): boolean {
    return this.isRunning;
  }

  getConfig(): TelegramConfig {
    return { ...this.config };
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

// Factory function
export function createTelegramChannel(botToken: string, options: Partial<TelegramConfig> = {}): TelegramChannel {
  return new TelegramChannel({
    botToken,
    ...options
  });
}
