/**
 * Lisa Slack Bot - Real Slack integration using Bolt
 * Based on OpenClaw's Slack implementation
 */

import { BrowserEventEmitter } from '../BrowserEventEmitter';

export interface SlackConfig {
  botToken: string;
  appToken?: string;
  signingSecret?: string;
  socketMode?: boolean;
  allowedChannels?: string[];
  allowedUsers?: string[];
  allowedWorkspaces?: string[];
}

export interface SlackMessage {
  id: string;
  channelId: string;
  channelName?: string;
  userId: string;
  userName?: string;
  userDisplayName?: string;
  text: string;
  threadTs?: string;
  isThread: boolean;
  isDM: boolean;
  isMention: boolean;
  timestamp: Date;
  files?: Array<{ url: string; type: string; name: string }>;
}

export interface SlackState {
  isConnected: boolean;
  botId?: string;
  botName?: string;
  teamId?: string;
  teamName?: string;
  messageCount: number;
  lastActivity?: Date;
  error?: string;
}

export class SlackBot extends BrowserEventEmitter {
  private config: SlackConfig;
  private state: SlackState = {
    isConnected: false,
    messageCount: 0,
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private app: any = null;
  private messageHandler?: (msg: SlackMessage) => Promise<string>;
  private conversationHistory: Map<string, Array<{ role: string; content: string }>> = new Map();

  constructor(config: SlackConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    try {
      // Dynamic import for Node.js compatibility
      const { App } = await import('@slack/bolt');

      // Create Bolt app
      this.app = new App({
        token: this.config.botToken,
        appToken: this.config.appToken,
        signingSecret: this.config.signingSecret,
        socketMode: this.config.socketMode ?? true,
      });

      // Get bot info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authResult = await this.app.client.auth.test() as any;
      this.state.botId = authResult.user_id;
      this.state.botName = authResult.user;
      this.state.teamId = authResult.team_id;
      this.state.teamName = authResult.team;

      // Handle messages
      this.app.message(async ({ message, say, client }: { message: { text?: string; user?: string; channel?: string; ts?: string; thread_ts?: string; channel_type?: string; files?: Array<{ url_private?: string; mimetype?: string; name?: string }> }; say: (text: string | { text: string; thread_ts?: string }) => Promise<void>; client: { users: { info: (params: { user: string }) => Promise<{ user?: { real_name?: string; profile?: { display_name?: string } } }> }; conversations: { info: (params: { channel: string }) => Promise<{ channel?: { name?: string; is_im?: boolean } }> } } }) => {
        // Ignore bot messages
        if (!message.text || !message.user) return;

        // Get user info
        let userName = '';
        let userDisplayName = '';
        try {
          const userInfo = await client.users.info({ user: message.user });
          userName = userInfo.user?.real_name || '';
          userDisplayName = userInfo.user?.profile?.display_name || userName;
        } catch {
          // Ignore user info errors
        }

        // Get channel info
        let channelName = '';
        let isDM = false;
        try {
          const channelInfo = await client.conversations.info({ channel: message.channel! });
          channelName = channelInfo.channel?.name || '';
          isDM = channelInfo.channel?.is_im || false;
        } catch {
          // Ignore channel info errors
        }

        const parsedMsg: SlackMessage = {
          id: message.ts || '',
          channelId: message.channel || '',
          channelName,
          userId: message.user,
          userName,
          userDisplayName,
          text: message.text,
          threadTs: message.thread_ts,
          isThread: !!message.thread_ts,
          isDM,
          isMention: message.text.includes(`<@${this.state.botId}>`),
          timestamp: new Date(parseFloat(message.ts || '0') * 1000),
          files: message.files?.map(f => ({
            url: f.url_private || '',
            type: f.mimetype || '',
            name: f.name || '',
          })),
        };

        // Check if allowed
        if (!this.isAllowed(parsedMsg)) return;

        this.state.messageCount++;
        this.state.lastActivity = new Date();

        // Add to history
        this.addToHistory(parsedMsg.channelId, 'user', parsedMsg.text);

        this.emit('message', parsedMsg);

        // Handle with custom handler
        if (this.messageHandler) {
          try {
            const response = await this.messageHandler(parsedMsg);
            if (response) {
              // Reply in thread if message was in thread
              if (parsedMsg.threadTs) {
                await say({ text: response, thread_ts: parsedMsg.threadTs });
              } else {
                await say(response);
              }
              this.addToHistory(parsedMsg.channelId, 'assistant', response);
            }
          } catch (error) {
            this.emit('error', error);
          }
        }
      });

      // Handle app mentions
      this.app.event('app_mention', async ({ event, say }: { event: { text?: string; user?: string; channel?: string; ts?: string; thread_ts?: string }; say: (text: string | { text: string; thread_ts?: string }) => Promise<void> }) => {
        if (!event.text || !event.user) return;

        const parsedMsg: SlackMessage = {
          id: event.ts || '',
          channelId: event.channel || '',
          userId: event.user,
          text: event.text.replace(`<@${this.state.botId}>`, '').trim(),
          threadTs: event.thread_ts,
          isThread: !!event.thread_ts,
          isDM: false,
          isMention: true,
          timestamp: new Date(parseFloat(event.ts || '0') * 1000),
        };

        if (!this.isAllowed(parsedMsg)) return;

        this.state.messageCount++;
        this.state.lastActivity = new Date();

        this.addToHistory(parsedMsg.channelId, 'user', parsedMsg.text);
        this.emit('mention', parsedMsg);

        if (this.messageHandler) {
          try {
            const response = await this.messageHandler(parsedMsg);
            if (response) {
              if (parsedMsg.threadTs) {
                await say({ text: response, thread_ts: parsedMsg.threadTs });
              } else {
                await say({ text: response, thread_ts: event.ts });
              }
              this.addToHistory(parsedMsg.channelId, 'assistant', response);
            }
          } catch (error) {
            this.emit('error', error);
          }
        }
      });

      // Handle slash commands
      this.app.command('/lisa', async ({ command, ack, respond }: { command: { text?: string; user_id?: string; channel_id?: string }; ack: () => Promise<void>; respond: (text: string) => Promise<void> }) => {
        await ack();

        const text = command.text?.trim() || '';
        const subCommand = text.split(' ')[0].toLowerCase();

        switch (subCommand) {
          case 'help':
            await respond(
              '*🌸 Commandes Lisa*\n' +
              '• `/lisa help` - Cette aide\n' +
              '• `/lisa status` - Mon état\n' +
              '• `/lisa mood` - Mon humeur\n' +
              '• `/lisa <message>` - Me parler'
            );
            break;

          case 'status':
            await respond(
              `*📊 Status Lisa*\n` +
              `• Messages traités: ${this.state.messageCount}\n` +
              `• Connectée: ${this.state.isConnected ? '✅' : '❌'}\n` +
              `• Dernière activité: ${this.state.lastActivity?.toLocaleString() || 'N/A'}`
            );
            break;

          case 'mood': {
            const moods = ['😊 Joyeuse', '😌 Sereine', '🥰 Affectueuse', '🤗 Chaleureuse', '💫 Inspirée'];
            const randomMood = moods[Math.floor(Math.random() * moods.length)];
            await respond(`Mon humeur: ${randomMood}`);
            break;
          }

          default:
            if (text && this.messageHandler) {
              const parsedMsg: SlackMessage = {
                id: '',
                channelId: command.channel_id || '',
                userId: command.user_id || '',
                text,
                isThread: false,
                isDM: false,
                isMention: false,
                timestamp: new Date(),
              };

              try {
                const response = await this.messageHandler(parsedMsg);
                if (response) {
                  await respond(response);
                }
              } catch (_error) {
                await respond('Désolée, une erreur est survenue. 😔');
              }
            } else {
              await respond('Utilise `/lisa help` pour voir les commandes disponibles.');
            }
        }
      });

      // Start the app
      await this.app.start();
      
      this.state.isConnected = true;
      this.emit('connected', {
        botId: this.state.botId,
        botName: this.state.botName,
        teamName: this.state.teamName,
      });

    } catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error);
      this.emit('error', error);
      throw error;
    }
  }

  private isAllowed(msg: SlackMessage): boolean {
    // If no whitelist, allow all
    if (!this.config.allowedChannels?.length && 
        !this.config.allowedUsers?.length && 
        !this.config.allowedWorkspaces?.length) {
      return true;
    }

    // Check channel whitelist
    if (this.config.allowedChannels?.length) {
      if (this.config.allowedChannels.includes(msg.channelId)) {
        return true;
      }
    }

    // Check user whitelist
    if (this.config.allowedUsers?.length) {
      if (this.config.allowedUsers.includes(msg.userId)) {
        return true;
      }
    }

    return false;
  }

  private addToHistory(channelId: string, role: string, content: string): void {
    const history = this.conversationHistory.get(channelId) || [];
    history.push({ role, content });
    
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.conversationHistory.set(channelId, history);
  }

  setMessageHandler(handler: (msg: SlackMessage) => Promise<string>): void {
    this.messageHandler = handler;
  }

  async sendMessage(channelId: string, text: string, threadTs?: string): Promise<void> {
    if (!this.app || !this.state.isConnected) {
      throw new Error('Slack not connected');
    }

    await this.app.client.chat.postMessage({
      channel: channelId,
      text,
      thread_ts: threadTs,
    });
  }

  async sendFile(channelId: string, fileUrl: string, filename: string, title?: string): Promise<void> {
    if (!this.app || !this.state.isConnected) {
      throw new Error('Slack not connected');
    }

    await this.app.client.files.uploadV2({
      channel_id: channelId,
      file: fileUrl,
      filename,
      title,
    });
  }

  async stop(): Promise<void> {
    if (this.app) {
      await this.app.stop();
      this.app = null;
    }
    this.state.isConnected = false;
    this.emit('stopped');
  }

  getState(): SlackState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }

  getConversationHistory(channelId: string): Array<{ role: string; content: string }> {
    return this.conversationHistory.get(channelId) || [];
  }
}

// Singleton
let instance: SlackBot | null = null;

export function getSlackBot(config?: SlackConfig): SlackBot {
  if (!instance && config) {
    instance = new SlackBot(config);
  }
  if (!instance) {
    throw new Error('SlackBot not initialized. Provide config first.');
  }
  return instance;
}

export function resetSlackBot(): void {
  if (instance) {
    instance.stop();
    instance.removeAllListeners();
    instance = null;
  }
}
