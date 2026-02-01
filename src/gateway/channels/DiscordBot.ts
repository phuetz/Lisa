/**
 * Lisa Discord Bot - Real Implementation using discord.js
 * Based on OpenClaw's discord integration
 */

import {
  Client,
  GatewayIntentBits,
  Message,
  TextChannel,
  DMChannel,
  Partials,
  ActivityType,
  ChannelType,
} from 'discord.js';
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

export class DiscordBot extends BrowserEventEmitter {
  private client: Client | null = null;
  private config: DiscordConfig;
  private state: DiscordState = {
    isConnected: false,
    guildCount: 0,
    messageCount: 0,
  };
  private messageHandler?: (msg: DiscordMessage) => Promise<string>;
  private conversationHistory: Map<string, Array<{ role: string; content: string }>> = new Map();

  constructor(config: DiscordConfig) {
    super();
    this.config = {
      commandPrefix: '!lisa',
      activityMessage: 'avec toi 💜',
      ...config,
    };
  }

  async start(): Promise<void> {
    if (!this.config.token) {
      throw new Error('Discord bot token is required');
    }

    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMembers,
        ],
        partials: [Partials.Channel, Partials.Message],
      });

      this.setupHandlers();

      await this.client.login(this.config.token);
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      this.state.isConnected = false;
      this.emit('error', error);
      throw error;
    }
  }

  private setupHandlers(): void {
    if (!this.client) return;

    // Ready event
    this.client.on('ready', () => {
      if (!this.client?.user) return;

      this.state.isConnected = true;
      this.state.botUsername = this.client.user.username;
      this.state.botId = this.client.user.id;
      this.state.guildCount = this.client.guilds.cache.size;
      this.state.lastActivity = new Date();

      // Set activity
      this.client.user.setActivity(this.config.activityMessage || 'avec toi', {
        type: ActivityType.Playing,
      });

      this.emit('connected', {
        username: this.state.botUsername,
        guildCount: this.state.guildCount,
      });
    });

    // Message event
    this.client.on('messageCreate', async (message: Message) => {
      // Ignore bot messages
      if (message.author.bot) return;

      // Check if allowed
      if (!this.isAllowed(message)) return;

      // Check if message is directed at Lisa
      const isDM = message.channel.type === ChannelType.DM;
      const isMentioned = message.mentions.has(this.client!.user!.id);
      const hasPrefix = message.content.startsWith(this.config.commandPrefix!);

      if (!isDM && !isMentioned && !hasPrefix) return;

      // Parse message
      const discordMessage = this.parseMessage(message);
      this.state.messageCount++;
      this.state.lastActivity = new Date();

      this.emit('message', discordMessage);

      // Handle commands
      if (hasPrefix) {
        const handled = await this.handleCommand(message);
        if (handled) return;
      }

      // Process with handler
      if (this.messageHandler) {
        try {
          await message.channel.sendTyping();

          // Get text without mention/prefix
          let text = discordMessage.text;
          if (isMentioned) {
            text = text.replace(/<@!?\d+>/g, '').trim();
          }
          if (hasPrefix) {
            text = text.slice(this.config.commandPrefix!.length).trim();
          }

          const modifiedMessage = { ...discordMessage, text };
          const response = await this.messageHandler(modifiedMessage);

          // Store conversation
          const channelHistory = this.conversationHistory.get(message.channel.id) || [];
          channelHistory.push(
            { role: 'user', content: text },
            { role: 'assistant', content: response }
          );
          if (channelHistory.length > 20) channelHistory.splice(0, 2);
          this.conversationHistory.set(message.channel.id, channelHistory);

          // Send response
          await this.sendResponse(message, response);
        } catch (error) {
          console.error('Error handling Discord message:', error);
          await message.reply('😔 Désolée, une erreur est survenue.');
        }
      }
    });

    // Error event
    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
      this.emit('error', error);
    });

    // Disconnection
    this.client.on('shardDisconnect', () => {
      this.state.isConnected = false;
      this.emit('disconnected');
    });
  }

  private async handleCommand(message: Message): Promise<boolean> {
    const content = message.content.slice(this.config.commandPrefix!.length).trim();
    const [command, ..._args] = content.split(/\s+/);

    switch (command.toLowerCase()) {
      case 'help':
        await message.reply(
          '**🌸 Commandes Lisa**\n' +
          `\`${this.config.commandPrefix} help\` - Cette aide\n` +
          `\`${this.config.commandPrefix} status\` - Mon état\n` +
          `\`${this.config.commandPrefix} mood\` - Mon humeur\n` +
          `\`${this.config.commandPrefix} reset\` - Réinitialiser la conversation\n` +
          `\`${this.config.commandPrefix} <message>\` - Me parler\n\n` +
          'Tu peux aussi me mentionner @Lisa!'
        );
        return true;

      case 'status':
        await message.reply(
          `**📊 Status Lisa**\n` +
          `• Serveurs: ${this.state.guildCount}\n` +
          `• Messages traités: ${this.state.messageCount}\n` +
          `• Connectée: ${this.state.isConnected ? '✅' : '❌'}\n` +
          `• Dernière activité: ${this.state.lastActivity?.toLocaleString() || 'N/A'}`
        );
        return true;

      case 'mood': {
        const moods = ['😊 Joyeuse', '😌 Sereine', '🥰 Affectueuse', '🤗 Chaleureuse', '💫 Inspirée'];
        const randomMood = moods[Math.floor(Math.random() * moods.length)];
        await message.reply(`Mon humeur: ${randomMood}`);
        return true;
      }

      case 'reset':
        this.conversationHistory.delete(message.channel.id);
        await message.reply('🔄 Conversation réinitialisée!');
        return true;

      default:
        return false;
    }
  }

  private isAllowed(message: Message): boolean {
    const userId = message.author.id;
    const guildId = message.guildId;
    const channelId = message.channel.id;

    // If no restrictions, allow all
    if (
      !this.config.allowedUsers?.length &&
      !this.config.allowedGuilds?.length &&
      !this.config.allowedChannels?.length
    ) {
      return true;
    }

    // Check user allowlist
    if (this.config.allowedUsers?.includes(userId)) return true;

    // Check guild allowlist
    if (guildId && this.config.allowedGuilds?.includes(guildId)) return true;

    // Check channel allowlist
    if (this.config.allowedChannels?.includes(channelId)) return true;

    return false;
  }

  private parseMessage(message: Message): DiscordMessage {
    return {
      id: message.id,
      channelId: message.channel.id,
      guildId: message.guildId || undefined,
      userId: message.author.id,
      username: message.author.username,
      displayName: message.member?.displayName || message.author.displayName,
      text: message.content,
      isDM: message.channel.type === ChannelType.DM,
      isBot: message.author.bot,
      replyToMessageId: message.reference?.messageId || undefined,
      attachments: message.attachments.map((a) => ({
        url: a.url,
        type: a.contentType || 'unknown',
        name: a.name || 'attachment',
      })),
      timestamp: message.createdAt,
    };
  }

  private async sendResponse(message: Message, text: string): Promise<void> {
    const MAX_LENGTH = 2000;

    if (text.length <= MAX_LENGTH) {
      await message.reply(text);
      return;
    }

    // Chunk long messages
    const chunks = this.chunkText(text, MAX_LENGTH);
    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) {
        await message.reply(chunks[i]);
      } else {
        await message.channel.send(chunks[i]);
      }
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

  setMessageHandler(handler: (msg: DiscordMessage) => Promise<string>): void {
    this.messageHandler = handler;
  }

  async sendToChannel(channelId: string, text: string): Promise<void> {
    if (!this.client) throw new Error('Bot not started');
    const channel = await this.client.channels.fetch(channelId);
    if (channel && (channel instanceof TextChannel || channel instanceof DMChannel)) {
      await channel.send(text);
    }
  }

  async stop(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.state.isConnected = false;
      this.emit('stopped');
    }
  }

  getState(): DiscordState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }

  getConversationHistory(channelId: string): Array<{ role: string; content: string }> {
    return this.conversationHistory.get(channelId) || [];
  }
}

// Singleton instance
let instance: DiscordBot | null = null;

export function getDiscordBot(config?: DiscordConfig): DiscordBot {
  if (!instance && config) {
    instance = new DiscordBot(config);
  }
  if (!instance) {
    throw new Error('DiscordBot not initialized. Provide config first.');
  }
  return instance;
}

export function resetDiscordBot(): void {
  if (instance) {
    instance.stop();
    instance.removeAllListeners();
    instance = null;
  }
}
