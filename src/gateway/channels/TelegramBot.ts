/**
 * Lisa Telegram Bot - Real Implementation using grammy
 * Based on OpenClaw's telegram integration
 */

import { Bot, Context, session, InputFile } from 'grammy';
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

type SessionData = {
  conversationHistory: Array<{ role: string; content: string }>;
  lastMessageId?: number;
};

type LisaContext = Context & { session: SessionData };

export class TelegramBot extends BrowserEventEmitter {
  private bot: Bot<LisaContext> | null = null;
  private config: TelegramConfig;
  private state: TelegramState = {
    isConnected: false,
    messageCount: 0,
  };
  private messageHandler?: (msg: TelegramMessage) => Promise<string>;

  constructor(config: TelegramConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    if (!this.config.token) {
      throw new Error('Telegram bot token is required');
    }

    try {
      this.bot = new Bot<LisaContext>(this.config.token);

      // Setup session middleware
      this.bot.use(session({
        initial: (): SessionData => ({
          conversationHistory: [],
        }),
      }));

      // Get bot info
      const me = await this.bot.api.getMe();
      this.state.botUsername = me.username;
      this.state.botId = me.id;

      // Setup handlers
      this.setupHandlers();

      // Start bot
      if (this.config.webhookUrl) {
        await this.bot.api.setWebhook(this.config.webhookUrl);
      } else {
        this.bot.start({
          drop_pending_updates: true,
          onStart: () => {
            this.state.isConnected = true;
            this.state.lastActivity = new Date();
            this.emit('connected', { username: this.state.botUsername });
          },
        });
      }

      this.state.isConnected = true;
      this.emit('started', this.state);
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      this.state.isConnected = false;
      this.emit('error', error);
      throw error;
    }
  }

  private setupHandlers(): void {
    if (!this.bot) return;

    // Handle /start command
    this.bot.command('start', async (ctx) => {
      if (!this.isAllowed(ctx)) {
        await ctx.reply('⛔ Accès non autorisé');
        return;
      }
      await ctx.reply(
        '👋 Salut! Je suis Lisa, ta compagne virtuelle.\n\n' +
        'Commandes disponibles:\n' +
        '/status - Mon état actuel\n' +
        '/reset - Réinitialiser la conversation\n' +
        '/mood - Mon humeur actuelle\n' +
        '/help - Aide'
      );
    });

    // Handle /status command
    this.bot.command('status', async (ctx) => {
      if (!this.isAllowed(ctx)) return;
      await ctx.reply(
        `📊 **Status Lisa**\n` +
        `• Messages: ${this.state.messageCount}\n` +
        `• Connectée: ${this.state.isConnected ? '✅' : '❌'}\n` +
        `• Dernière activité: ${this.state.lastActivity?.toLocaleString() || 'N/A'}`,
        { parse_mode: 'Markdown' }
      );
    });

    // Handle /reset command
    this.bot.command('reset', async (ctx) => {
      if (!this.isAllowed(ctx)) return;
      ctx.session.conversationHistory = [];
      await ctx.reply('🔄 Conversation réinitialisée!');
    });

    // Handle /mood command
    this.bot.command('mood', async (ctx) => {
      if (!this.isAllowed(ctx)) return;
      const moods = ['😊 Joyeuse', '😌 Sereine', '🥰 Affectueuse', '🤗 Chaleureuse', '💫 Inspirée'];
      const randomMood = moods[Math.floor(Math.random() * moods.length)];
      await ctx.reply(`Mon humeur: ${randomMood}`);
    });

    // Handle text messages
    this.bot.on('message:text', async (ctx) => {
      if (!this.isAllowed(ctx)) {
        await ctx.reply('⛔ Accès non autorisé');
        return;
      }

      const message = this.parseMessage(ctx);
      this.state.messageCount++;
      this.state.lastActivity = new Date();

      this.emit('message', message);

      // Process with handler if set
      if (this.messageHandler) {
        try {
          await ctx.replyWithChatAction('typing');
          const response = await this.messageHandler(message);
          
          // Store in session
          ctx.session.conversationHistory.push(
            { role: 'user', content: message.text },
            { role: 'assistant', content: response }
          );

          // Send response (chunked if too long)
          await this.sendResponse(ctx, response);
        } catch (error) {
          console.error('Error handling message:', error);
          await ctx.reply('😔 Désolée, une erreur est survenue.');
        }
      }
    });

    // Handle photos
    this.bot.on('message:photo', async (ctx) => {
      if (!this.isAllowed(ctx)) return;
      
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const message = this.parseMessage(ctx);
      message.mediaType = 'photo';
      message.mediaFileId = photo.file_id;

      this.emit('photo', message);
      await ctx.reply('📷 Photo reçue! Je peux l\'analyser si tu veux.');
    });

    // Handle voice messages
    this.bot.on('message:voice', async (ctx) => {
      if (!this.isAllowed(ctx)) return;
      
      const message = this.parseMessage(ctx);
      message.mediaType = 'voice';
      message.mediaFileId = ctx.message.voice.file_id;

      this.emit('voice', message);
      await ctx.reply('🎤 Message vocal reçu! Transcription en cours...');
    });

    // Handle errors
    this.bot.catch((err) => {
      console.error('Telegram bot error:', err);
      this.emit('error', err);
    });
  }

  private isAllowed(ctx: Context): boolean {
    const userId = ctx.from?.id?.toString();
    const username = ctx.from?.username;
    const chatId = ctx.chat?.id?.toString();

    // If no restrictions, allow all
    if (!this.config.allowedUsers?.length && !this.config.allowedGroups?.length) {
      return true;
    }

    // Check user allowlist
    if (this.config.allowedUsers?.length) {
      if (userId && this.config.allowedUsers.includes(userId)) return true;
      if (username && this.config.allowedUsers.includes(username)) return true;
    }

    // Check group allowlist
    if (this.config.allowedGroups?.length && chatId) {
      if (this.config.allowedGroups.includes(chatId)) return true;
    }

    return false;
  }

  private parseMessage(ctx: Context): TelegramMessage {
    return {
      id: ctx.message?.message_id || 0,
      chatId: ctx.chat?.id || 0,
      userId: ctx.from?.id || 0,
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      text: ctx.message && 'text' in ctx.message ? ctx.message.text || '' : '',
      isGroup: ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup',
      replyToMessageId: ctx.message?.reply_to_message?.message_id,
      timestamp: new Date(),
    };
  }

  private async sendResponse(ctx: Context, text: string): Promise<void> {
    const MAX_LENGTH = 4096;

    if (text.length <= MAX_LENGTH) {
      await ctx.reply(text, { parse_mode: 'Markdown' });
      return;
    }

    // Chunk long messages
    const chunks = this.chunkText(text, MAX_LENGTH);
    for (const chunk of chunks) {
      await ctx.reply(chunk, { parse_mode: 'Markdown' });
    }
  }

  private chunkText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Find a good break point
      let breakPoint = remaining.lastIndexOf('\n', maxLength);
      if (breakPoint === -1 || breakPoint < maxLength / 2) {
        breakPoint = remaining.lastIndexOf(' ', maxLength);
      }
      if (breakPoint === -1 || breakPoint < maxLength / 2) {
        breakPoint = maxLength;
      }

      chunks.push(remaining.slice(0, breakPoint));
      remaining = remaining.slice(breakPoint).trim();
    }

    return chunks;
  }

  setMessageHandler(handler: (msg: TelegramMessage) => Promise<string>): void {
    this.messageHandler = handler;
  }

  async sendMessage(chatId: number, text: string): Promise<void> {
    if (!this.bot) throw new Error('Bot not started');
    await this.bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }

  async sendPhoto(chatId: number, photo: string | InputFile, caption?: string): Promise<void> {
    if (!this.bot) throw new Error('Bot not started');
    await this.bot.api.sendPhoto(chatId, photo, { caption });
  }

  async sendVoice(chatId: number, voice: string | InputFile): Promise<void> {
    if (!this.bot) throw new Error('Bot not started');
    await this.bot.api.sendVoice(chatId, voice);
  }

  async stop(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
      this.state.isConnected = false;
      this.emit('stopped');
    }
  }

  getState(): TelegramState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }
}

// Singleton instance
let instance: TelegramBot | null = null;

export function getTelegramBot(config?: TelegramConfig): TelegramBot {
  if (!instance && config) {
    instance = new TelegramBot(config);
  }
  if (!instance) {
    throw new Error('TelegramBot not initialized. Provide config first.');
  }
  return instance;
}

export function resetTelegramBot(): void {
  if (instance) {
    instance.stop();
    instance.removeAllListeners();
    instance = null;
  }
}
