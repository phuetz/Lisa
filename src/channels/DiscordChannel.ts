/**
 * Lisa Discord Channel
 * Integration with Discord Bot API using discord.js patterns
 * Inspired by OpenClaw's multi-channel architecture
 */

import { getGateway } from '../gateway/GatewayServer';
import type { Session, MessagePayload } from '../gateway/types';

export interface DiscordConfig {
  botToken: string;
  clientId?: string;
  guildId?: string;
  allowedChannels?: string[];
  allowedRoles?: string[];
  prefix?: string;
  enableSlashCommands?: boolean;
}

export interface DiscordMessage {
  id: string;
  channelId: string;
  guildId?: string;
  authorId: string;
  authorUsername: string;
  content: string;
  attachments?: DiscordAttachment[];
  replyToId?: string;
  timestamp: Date;
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  url: string;
  contentType?: string;
  size: number;
}

type MessageHandler = (message: DiscordMessage) => Promise<void>;
type ErrorHandler = (error: Error) => void;

export class DiscordChannel {
  private config: DiscordConfig;
  private sessions: Map<string, Session> = new Map(); // channelId -> session
  private messageHandlers: MessageHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private isRunning = false;
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sequence: number | null = null;
  private sessionId: string | null = null;
  private resumeGatewayUrl: string | null = null;

  constructor(config: DiscordConfig) {
    this.config = {
      prefix: '!lisa ',
      enableSlashCommands: true,
      ...config
    };
  }

  // Bot lifecycle
  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      // Get gateway URL
      const gatewayUrl = await this.getGatewayUrl();
      
      // Connect to Discord Gateway
      await this.connectWebSocket(gatewayUrl);
      
      this.isRunning = true;
      console.log('[Discord] Bot started');
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Bot stopping');
      this.ws = null;
    }
    
    console.log('[Discord] Bot stopped');
  }

  private async getGatewayUrl(): Promise<string> {
    const response = await fetch('https://discord.com/api/v10/gateway/bot', {
      headers: {
        Authorization: `Bot ${this.config.botToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get Discord gateway: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url;
  }

  private async connectWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${url}?v=10&encoding=json`);

      this.ws.onopen = () => {
        console.log('[Discord] WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        this.handleGatewayMessage(JSON.parse(event.data as string), resolve, reject);
      };

      this.ws.onerror = (error) => {
        reject(new Error(`WebSocket error: ${error}`));
      };

      this.ws.onclose = (event) => {
        console.log(`[Discord] WebSocket closed: ${event.code} ${event.reason}`);
        this.handleDisconnect(event.code);
      };
    });
  }

  private handleGatewayMessage(
    data: { op: number; d: unknown; s: number | null; t: string | null },
    resolve?: () => void,
    reject?: (error: Error) => void
  ): void {
    const { op, d, s, t } = data;

    // Update sequence number
    if (s !== null) {
      this.sequence = s;
    }

    switch (op) {
      case 10: // Hello
        this.startHeartbeat((d as { heartbeat_interval: number }).heartbeat_interval);
        this.identify();
        break;

      case 11: // Heartbeat ACK
        // Heartbeat acknowledged
        break;

      case 0: // Dispatch
        this.handleDispatch(t!, d);
        if (t === 'READY') {
          const readyData = d as { session_id: string; resume_gateway_url: string };
          this.sessionId = readyData.session_id;
          this.resumeGatewayUrl = readyData.resume_gateway_url;
          resolve?.();
        }
        break;

      case 9: // Invalid Session
        reject?.(new Error('Invalid session'));
        break;

      case 7: // Reconnect
        this.reconnect();
        break;
    }
  }

  private startHeartbeat(interval: number): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, interval);
  }

  private sendHeartbeat(): void {
    this.send({ op: 1, d: this.sequence });
  }

  private identify(): void {
    this.send({
      op: 2,
      d: {
        token: this.config.botToken,
        intents: 33281, // GUILDS | GUILD_MESSAGES | MESSAGE_CONTENT | DIRECT_MESSAGES
        properties: {
          os: 'linux',
          browser: 'lisa',
          device: 'lisa'
        }
      }
    });
  }

  private send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private async reconnect(): Promise<void> {
    if (this.resumeGatewayUrl && this.sessionId) {
      try {
        await this.connectWebSocket(this.resumeGatewayUrl);
        this.send({
          op: 6,
          d: {
            token: this.config.botToken,
            session_id: this.sessionId,
            seq: this.sequence
          }
        });
      } catch {
        // Full reconnect
        await this.start();
      }
    }
  }

  private handleDisconnect(code: number): void {
    if (this.isRunning && code !== 1000) {
      // Attempt to reconnect after a delay
      setTimeout(() => {
        this.reconnect();
      }, 5000);
    }
  }

  private handleDispatch(eventName: string, data: unknown): void {
    switch (eventName) {
      case 'MESSAGE_CREATE':
        this.handleMessageCreate(data as DiscordApiMessage);
        break;
      case 'INTERACTION_CREATE':
        this.handleInteraction(data);
        break;
    }
  }

  private async handleMessageCreate(msg: DiscordApiMessage): Promise<void> {
    // Ignore bot messages
    if (msg.author.bot) return;

    // Check if it's a command or mention
    const isMention = msg.mentions?.some((m: { id: string }) => m.id === this.config.clientId);
    const isCommand = msg.content.startsWith(this.config.prefix!);

    if (!isMention && !isCommand) return;

    // Check channel permissions
    if (this.config.allowedChannels && !this.config.allowedChannels.includes(msg.channel_id)) {
      return;
    }

    const discordMessage: DiscordMessage = {
      id: msg.id,
      channelId: msg.channel_id,
      guildId: msg.guild_id,
      authorId: msg.author.id,
      authorUsername: msg.author.username,
      content: isCommand ? msg.content.slice(this.config.prefix!.length) : msg.content,
      attachments: msg.attachments?.map((a: DiscordApiAttachment) => ({
        id: a.id,
        filename: a.filename,
        url: a.url,
        contentType: a.content_type,
        size: a.size
      })),
      replyToId: msg.referenced_message?.id,
      timestamp: new Date(msg.timestamp)
    };

    await this.processMessage(discordMessage);

    // Notify handlers
    for (const handler of this.messageHandlers) {
      await handler(discordMessage);
    }
  }

  private async handleInteraction(data: unknown): Promise<void> {
    const interaction = data as DiscordInteraction;
    
    // Handle slash commands
    if (interaction.type === 2) { // APPLICATION_COMMAND
      await this.handleSlashCommand(interaction);
    }
  }

  private async handleSlashCommand(interaction: DiscordInteraction): Promise<void> {
    const commandName = interaction.data?.name;
    
    // Acknowledge the interaction
    await this.respondToInteraction(interaction.id, interaction.token, {
      type: 5 // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    });

    // Process based on command
    let response = '';
    
    switch (commandName) {
      case 'lisa': {
        const query = interaction.data?.options?.find((o: { name: string }) => o.name === 'query')?.value as string;
        if (query) {
          response = await this.processQuery(interaction.channel_id, query, interaction.user?.id || interaction.member?.user?.id || 'unknown');
        } else {
          response = '👋 Je suis Lisa! Posez-moi une question avec `/lisa query:<votre question>`';
        }
        break;
      }
        
      case 'lisa-status': {
        const session = this.sessions.get(interaction.channel_id);
        response = session 
          ? `📊 Session active: ${session.id.slice(0, 8)}...`
          : '📊 Aucune session active dans ce canal';
        break;
      }
        
      case 'lisa-reset': {
        const existingSession = this.sessions.get(interaction.channel_id);
        if (existingSession) {
          const gateway = getGateway();
          await gateway.closeSession(existingSession.id);
          this.sessions.delete(interaction.channel_id);
        }
        response = '🔄 Conversation réinitialisée!';
        break;
      }
        
      default:
        response = '❓ Commande inconnue';
    }

    // Edit the deferred response
    await this.editInteractionResponse(interaction.token, response);
  }

  private async processMessage(msg: DiscordMessage): Promise<void> {
    const response = await this.processQuery(msg.channelId, msg.content, msg.authorId);
    await this.sendDiscordMessage(msg.channelId, response, msg.id);
  }

  private async processQuery(channelId: string, content: string, userId: string): Promise<string> {
    const gateway = getGateway();
    
    // Get or create session
    let session = this.sessions.get(channelId);
    if (!session) {
      session = await gateway.createSession(`discord:${userId}`, 'discord', {
        skills: []
      });
      this.sessions.set(channelId, session);
    }

    // Send message to gateway
    const payload: MessagePayload = {
      content,
      role: 'user'
    };

    await gateway.sendMessage(session.id, payload);

    // Wait for response
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve('⏳ Désolé, la réponse prend trop de temps. Réessayez plus tard.');
      }, 30000);

      gateway.once('message:received', (response: { sessionId: string; payload: MessagePayload }) => {
        if (response.sessionId === session!.id && response.payload.role === 'assistant') {
          clearTimeout(timeout);
          resolve(response.payload.content);
        }
      });
    });
  }

  // Discord API methods
  private async sendDiscordMessage(channelId: string, content: string, replyToId?: string): Promise<void> {
    const maxLength = 2000;
    const chunks = this.splitMessage(content, maxLength);

    for (let i = 0; i < chunks.length; i++) {
      await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${this.config.botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: chunks[i],
          message_reference: i === 0 && replyToId ? { message_id: replyToId } : undefined
        })
      });
    }
  }

  private splitMessage(content: string, maxLength: number): string[] {
    if (content.length <= maxLength) return [content];

    const chunks: string[] = [];
    let remaining = content;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      let splitIndex = remaining.lastIndexOf('\n', maxLength);
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        splitIndex = remaining.lastIndexOf(' ', maxLength);
      }
      if (splitIndex === -1) {
        splitIndex = maxLength;
      }

      chunks.push(remaining.slice(0, splitIndex));
      remaining = remaining.slice(splitIndex).trim();
    }

    return chunks;
  }

  private async respondToInteraction(interactionId: string, token: string, data: unknown): Promise<void> {
    await fetch(`https://discord.com/api/v10/interactions/${interactionId}/${token}/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }

  private async editInteractionResponse(token: string, content: string): Promise<void> {
    await fetch(`https://discord.com/api/v10/webhooks/${this.config.clientId}/${token}/messages/@original`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });
  }

  // Register slash commands
  async registerSlashCommands(): Promise<void> {
    if (!this.config.clientId) {
      throw new Error('clientId is required to register slash commands');
    }

    const commands = [
      {
        name: 'lisa',
        description: 'Poser une question à Lisa',
        options: [
          {
            name: 'query',
            description: 'Votre question',
            type: 3, // STRING
            required: true
          }
        ]
      },
      {
        name: 'lisa-status',
        description: 'Voir le statut de la session Lisa'
      },
      {
        name: 'lisa-reset',
        description: 'Réinitialiser la conversation avec Lisa'
      }
    ];

    const url = this.config.guildId
      ? `https://discord.com/api/v10/applications/${this.config.clientId}/guilds/${this.config.guildId}/commands`
      : `https://discord.com/api/v10/applications/${this.config.clientId}/commands`;

    await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${this.config.botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    });

    console.log('[Discord] Slash commands registered');
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
    console.error('[Discord] Error:', error.message);
    for (const handler of this.errorHandlers) {
      handler(error);
    }
  }

  // Getters
  isConnected(): boolean {
    return this.isRunning && this.ws?.readyState === WebSocket.OPEN;
  }

  getConfig(): DiscordConfig {
    return { ...this.config };
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

// Types for Discord API responses
interface DiscordApiMessage {
  id: string;
  channel_id: string;
  guild_id?: string;
  author: {
    id: string;
    username: string;
    bot?: boolean;
  };
  content: string;
  timestamp: string;
  attachments?: DiscordApiAttachment[];
  mentions?: Array<{ id: string }>;
  referenced_message?: { id: string };
}

interface DiscordApiAttachment {
  id: string;
  filename: string;
  url: string;
  content_type?: string;
  size: number;
}

interface DiscordInteraction {
  id: string;
  token: string;
  type: number;
  channel_id: string;
  guild_id?: string;
  user?: { id: string };
  member?: { user: { id: string } };
  data?: {
    name: string;
    options?: Array<{ name: string; value: unknown }>;
  };
}

// Factory function
export function createDiscordChannel(botToken: string, options: Partial<DiscordConfig> = {}): DiscordChannel {
  return new DiscordChannel({
    botToken,
    ...options
  });
}
