/**
 * Lisa Slack Bot - Browser Stub
 * The real Slack bot (Bolt) only works in Node.js
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
  private state: SlackState = {
    isConnected: false,
    messageCount: 0,
    error: 'Slack bot is only available server-side (Node.js)',
  };

  constructor(_config: SlackConfig) {
    super();
    console.warn('[SlackBot] Bolt requires Node.js. This is a browser stub.');
  }

  async start(): Promise<void> {
    throw new Error('Slack bot cannot run in browser. Use server-side Node.js.');
  }

  async stop(): Promise<void> {
    // No-op
  }

  getState(): SlackState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return false;
  }

  setMessageHandler(_handler: (msg: SlackMessage) => Promise<string>): void {
    console.warn('[SlackBot] Message handler ignored in browser stub');
  }

  async sendMessage(_channelId: string, _text: string, _threadTs?: string): Promise<void> {
    throw new Error('Slack bot cannot run in browser');
  }

  async uploadFile(_channelId: string, _fileBuffer: Buffer, _filename: string): Promise<void> {
    throw new Error('Slack bot cannot run in browser');
  }
}

let instance: SlackBot | null = null;

export function getSlackBot(config?: SlackConfig): SlackBot {
  if (!instance && config) {
    instance = new SlackBot(config);
  }
  if (!instance) {
    throw new Error('SlackBot not initialized');
  }
  return instance;
}

export function resetSlackBot(): void {
  instance = null;
}
