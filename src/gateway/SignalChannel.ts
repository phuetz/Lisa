/**
 * Lisa Signal Channel
 * Signal integration via signal-cli or libsignal
 * Inspired by OpenClaw's Signal channel
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface SignalConfig {
  phoneNumber: string;
  configPath?: string;
  allowedNumbers?: string[];
  blockedNumbers?: string[];
  adminNumbers?: string[];
  trustAllKeys?: boolean;
}

export interface SignalMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  text: string;
  timestamp: Date;
  isGroup: boolean;
  groupId?: string;
  groupName?: string;
  quotedMessageId?: string;
  attachments?: SignalAttachment[];
  reaction?: { emoji: string; targetMessageId: string };
}

export interface SignalAttachment {
  id: string;
  contentType: string;
  filename?: string;
  size: number;
  localPath?: string;
}

export interface SignalGroup {
  id: string;
  name: string;
  memberCount: number;
  isAdmin: boolean;
}

export interface SignalContact {
  number: string;
  name?: string;
  profileName?: string;
  isBlocked: boolean;
}

export type SignalStatus = 'disconnected' | 'connecting' | 'linked' | 'connected' | 'error';

const DEFAULT_CONFIG: Partial<SignalConfig> = {
  trustAllKeys: false
};

export class SignalChannel extends BrowserEventEmitter {
  private config: SignalConfig;
  private status: SignalStatus = 'disconnected';
  private linkUri: string | null = null;
  private messageHistory: SignalMessage[] = [];
  private groups: Map<string, SignalGroup> = new Map();
  private maxHistorySize = 100;
  private process: unknown = null;

  constructor(config: SignalConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Connection via signal-cli daemon (demo mode in browser)
  async connect(): Promise<boolean> {
    this.status = 'connecting';
    this.emit('status:changed', this.status);

    try {
      // In browser context, use demo mode
      // signal-cli requires Node.js environment
      // Install signal-cli for full functionality in Node backend
      
      // Demo mode: simulate link flow
      this.status = 'linked';
      this.linkUri = `sgnl://linkdevice?uuid=${Date.now()}&pub_key=demo`;
      this.emit('link', this.linkUri);
      
      // Simulate successful connection
      setTimeout(() => {
        this.status = 'connected';
        this.emit('connected', { phoneNumber: this.config.phoneNumber });
        console.log('[Signal] Running in demo mode - install signal-cli for real connection');
      }, 3000);
      
      return true;
    } catch (error) {
      this.status = 'error';
      const msg = error instanceof Error ? error.message : String(error);
      this.emit('error', { message: msg });
      return false;
    }
  }

  private handleEvent(event: Record<string, unknown>): void {
    const envelope = event.envelope as Record<string, unknown> | undefined;
    if (!envelope) return;

    const dataMessage = envelope.dataMessage as Record<string, unknown> | undefined;
    if (dataMessage) {
      const msg = this.parseMessage(envelope, dataMessage);
      if (msg && this.isAllowed(msg)) {
        this.messageHistory.push(msg);
        if (this.messageHistory.length > this.maxHistorySize) {
          this.messageHistory.shift();
        }
        this.emit('message', msg);
      }
    }

    const receiptMessage = envelope.receiptMessage as Record<string, unknown> | undefined;
    if (receiptMessage) {
      this.emit('receipt', {
        type: receiptMessage.type,
        timestamps: receiptMessage.timestamps
      });
    }

    const typingMessage = envelope.typingMessage as Record<string, unknown> | undefined;
    if (typingMessage) {
      this.emit('typing', {
        senderId: envelope.source,
        isTyping: typingMessage.action === 'STARTED'
      });
    }
  }

  private parseMessage(envelope: Record<string, unknown>, dataMessage: Record<string, unknown>): SignalMessage | null {
    const groupInfo = dataMessage.groupInfo as Record<string, unknown> | undefined;
    
    return {
      id: `${envelope.timestamp}`,
      chatId: groupInfo ? groupInfo.groupId as string : envelope.source as string,
      senderId: envelope.source as string,
      senderName: envelope.sourceName as string | undefined,
      text: dataMessage.message as string || '',
      timestamp: new Date(envelope.timestamp as number),
      isGroup: !!groupInfo,
      groupId: groupInfo?.groupId as string | undefined,
      groupName: groupInfo?.name as string | undefined,
      quotedMessageId: dataMessage.quote ? 
        `${(dataMessage.quote as Record<string, unknown>).id}` : undefined,
      attachments: ((dataMessage.attachments as unknown[]) || []).map((a: unknown) => {
        const att = a as Record<string, unknown>;
        return {
          id: att.id as string,
          contentType: att.contentType as string,
          filename: att.filename as string | undefined,
          size: att.size as number
        };
      }),
      reaction: dataMessage.reaction ? {
        emoji: (dataMessage.reaction as Record<string, unknown>).emoji as string,
        targetMessageId: `${(dataMessage.reaction as Record<string, unknown>).targetTimestamp}`
      } : undefined
    };
  }

  private isAllowed(msg: SignalMessage): boolean {
    if (this.config.blockedNumbers?.includes(msg.senderId)) {
      return false;
    }

    if (this.config.allowedNumbers?.length) {
      if (!this.config.allowedNumbers.includes(msg.senderId)) {
        return false;
      }
    }

    return true;
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      const proc = this.process as { kill: () => void };
      proc.kill();
      this.process = null;
    }
    this.status = 'disconnected';
    this.emit('disconnected');
  }

  getStatus(): SignalStatus {
    return this.status;
  }

  getLinkUri(): string | null {
    return this.linkUri;
  }

  // Send messages (demo mode in browser)
  async sendMessage(recipient: string, text: string, _options?: {
    quotedMessageId?: string;
    attachments?: string[];
  }): Promise<{ success: boolean; timestamp?: number }> {
    if (this.status !== 'connected') {
      return { success: false };
    }

    // Demo mode - simulate message sending
    const timestamp = Date.now();
    this.emit('message:sent', { recipient, text, timestamp });
    return { success: true, timestamp };
  }

  async reply(message: SignalMessage, text: string): Promise<{ success: boolean; timestamp?: number }> {
    const recipient = message.isGroup ? message.groupId! : message.senderId;
    return this.sendMessage(recipient, text, {
      quotedMessageId: message.id
    });
  }

  async sendReaction(_recipient: string, _targetMessageId: string, _emoji: string): Promise<{ success: boolean }> {
    if (this.status !== 'connected') {
      return { success: false };
    }
    // Demo mode
    return { success: true };
  }

  // Group management
  async getGroups(): Promise<SignalGroup[]> {
    return Array.from(this.groups.values());
  }

  async createGroup(name: string, _members: string[]): Promise<{ success: boolean; groupId?: string }> {
    if (this.status !== 'connected') {
      return { success: false };
    }
    // Demo mode
    return { success: true, groupId: `group_${name}_${Date.now()}` };
  }

  isAdmin(senderId: string): boolean {
    return this.config.adminNumbers?.includes(senderId) || false;
  }

  // History
  getMessageHistory(chatId?: string, limit?: number): SignalMessage[] {
    let messages = [...this.messageHistory];
    
    if (chatId) {
      messages = messages.filter(m => m.chatId === chatId);
    }
    
    return limit ? messages.slice(-limit) : messages;
  }

  // Stats
  getStats(): {
    status: SignalStatus;
    phoneNumber: string;
    messageCount: number;
    groupCount: number;
  } {
    return {
      status: this.status,
      phoneNumber: this.config.phoneNumber,
      messageCount: this.messageHistory.length,
      groupCount: this.groups.size
    };
  }
}

// Singleton
let signalChannelInstance: SignalChannel | null = null;

export function getSignalChannel(config?: SignalConfig): SignalChannel {
  if (!signalChannelInstance && config) {
    signalChannelInstance = new SignalChannel(config);
  }
  if (!signalChannelInstance) {
    throw new Error('SignalChannel not initialized. Provide config first.');
  }
  return signalChannelInstance;
}

export function resetSignalChannel(): void {
  if (signalChannelInstance) {
    signalChannelInstance.disconnect();
    signalChannelInstance.removeAllListeners();
    signalChannelInstance = null;
  }
}

