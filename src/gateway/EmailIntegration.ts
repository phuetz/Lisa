/**
 * Lisa Email Integration
 * Email webhooks and IMAP/Gmail integration
 * Inspired by OpenClaw's Gmail Pub/Sub
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface EmailConfig {
  provider: EmailProvider;
  enabled: boolean;
  autoProcess: boolean;
  pollingInterval: number; // ms
  maxEmails: number;
  filters: EmailFilter[];
}

export type EmailProvider = 'gmail' | 'outlook' | 'imap' | 'smtp';

export interface EmailFilter {
  id: string;
  name: string;
  conditions: FilterCondition[];
  action: FilterAction;
  enabled: boolean;
}

export interface FilterCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'label';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex';
  value: string;
}

export interface FilterAction {
  type: 'notify' | 'summarize' | 'forward' | 'label' | 'archive' | 'custom';
  params?: Record<string, unknown>;
}

export interface Email {
  id: string;
  threadId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  body: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  receivedAt: Date;
  snippet?: string;
}

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailDraft {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: File[];
  replyTo?: string;
}

export interface EmailWebhook {
  id: string;
  provider: EmailProvider;
  url: string;
  secret: string;
  events: string[];
  createdAt: Date;
  lastTriggered?: Date;
}

const DEFAULT_CONFIG: EmailConfig = {
  provider: 'gmail',
  enabled: false,
  autoProcess: true,
  pollingInterval: 60000, // 1 minute
  maxEmails: 50,
  filters: []
};

export class EmailIntegration extends BrowserEventEmitter {
  private config: EmailConfig;
  private emails: Map<string, Email> = new Map();
  private webhooks: Map<string, EmailWebhook> = new Map();
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private isConnected = false;

  constructor(config: Partial<EmailConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('lisa-email');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.filters) {
          this.config.filters = data.filters;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = {
        filters: this.config.filters
      };
      localStorage.setItem('lisa-email', JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  // Configuration
  configure(config: Partial<EmailConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:changed', this.config);
  }

  getConfig(): EmailConfig {
    return { ...this.config };
  }

  // Connection
  async connect(): Promise<boolean> {
    if (this.isConnected) return true;

    try {
      // In real implementation, would authenticate with email provider
      this.isConnected = true;
      this.emit('connected');
      
      if (this.config.autoProcess) {
        this.startPolling();
      }
      
      return true;
    } catch (error) {
      this.emit('error', { error });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    this.isConnected = false;
    this.emit('disconnected');
  }

  isActive(): boolean {
    return this.isConnected;
  }

  // Polling
  startPolling(): void {
    if (this.pollingTimer) return;

    this.pollingTimer = setInterval(async () => {
      await this.fetchEmails();
    }, this.config.pollingInterval);

    this.emit('polling:started');
  }

  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
      this.emit('polling:stopped');
    }
  }

  // Email operations
  async fetchEmails(query?: string): Promise<Email[]> {
    // In real implementation, would fetch from email provider API
    // Simulating with mock data
    const mockEmails: Email[] = [];
    
    this.emit('emails:fetched', { count: mockEmails.length, query });
    return mockEmails;
  }

  async getEmail(id: string): Promise<Email | null> {
    return this.emails.get(id) || null;
  }

  async searchEmails(query: string): Promise<Email[]> {
    const allEmails = Array.from(this.emails.values());
    const q = query.toLowerCase();
    
    return allEmails.filter(email =>
      email.subject.toLowerCase().includes(q) ||
      email.body.toLowerCase().includes(q) ||
      email.from.email.toLowerCase().includes(q)
    );
  }

  // Send email
  async send(draft: EmailDraft): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // In real implementation, would send via email provider API
      const messageId = this.generateId('msg');
      
      this.emit('email:sent', { messageId, to: draft.to, subject: draft.subject });
      return { success: true, messageId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('email:error', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  // Reply
  async reply(emailId: string, body: string, options?: { replyAll?: boolean }): Promise<{ success: boolean; messageId?: string }> {
    const original = await this.getEmail(emailId);
    if (!original) {
      return { success: false };
    }

    const to = [original.from];
    if (options?.replyAll && original.cc) {
      to.push(...original.cc);
    }

    return this.send({
      to,
      subject: `Re: ${original.subject}`,
      body,
      replyTo: emailId
    });
  }

  // Forward
  async forward(emailId: string, to: EmailAddress[], message?: string): Promise<{ success: boolean; messageId?: string }> {
    const original = await this.getEmail(emailId);
    if (!original) {
      return { success: false };
    }

    const body = message 
      ? `${message}\n\n---------- Forwarded message ----------\n${original.body}`
      : `---------- Forwarded message ----------\n${original.body}`;

    return this.send({
      to,
      subject: `Fwd: ${original.subject}`,
      body
    });
  }

  // Actions
  async markAsRead(emailId: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email) return false;
    
    email.isRead = true;
    this.emit('email:read', { emailId });
    return true;
  }

  async markAsUnread(emailId: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email) return false;
    
    email.isRead = false;
    this.emit('email:unread', { emailId });
    return true;
  }

  async star(emailId: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email) return false;
    
    email.isStarred = true;
    this.emit('email:starred', { emailId });
    return true;
  }

  async unstar(emailId: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email) return false;
    
    email.isStarred = false;
    this.emit('email:unstarred', { emailId });
    return true;
  }

  async archive(emailId: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email) return false;
    
    email.labels = email.labels.filter(l => l !== 'INBOX');
    this.emit('email:archived', { emailId });
    return true;
  }

  async addLabel(emailId: string, label: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email) return false;
    
    if (!email.labels.includes(label)) {
      email.labels.push(label);
    }
    this.emit('email:labeled', { emailId, label });
    return true;
  }

  // Filters
  createFilter(filter: Omit<EmailFilter, 'id'>): EmailFilter {
    const newFilter: EmailFilter = {
      ...filter,
      id: this.generateId('filter')
    };

    this.config.filters.push(newFilter);
    this.saveToStorage();
    this.emit('filter:created', newFilter);
    return newFilter;
  }

  updateFilter(filterId: string, updates: Partial<EmailFilter>): boolean {
    const index = this.config.filters.findIndex(f => f.id === filterId);
    if (index === -1) return false;

    this.config.filters[index] = { ...this.config.filters[index], ...updates };
    this.saveToStorage();
    this.emit('filter:updated', this.config.filters[index]);
    return true;
  }

  deleteFilter(filterId: string): boolean {
    const index = this.config.filters.findIndex(f => f.id === filterId);
    if (index === -1) return false;

    this.config.filters.splice(index, 1);
    this.saveToStorage();
    this.emit('filter:deleted', { filterId });
    return true;
  }

  getFilters(): EmailFilter[] {
    return [...this.config.filters];
  }

  // Process email through filters
  processEmail(email: Email): FilterAction | null {
    for (const filter of this.config.filters) {
      if (!filter.enabled) continue;

      const matches = filter.conditions.every(condition => {
        const fieldValue = this.getEmailField(email, condition.field);
        return this.matchCondition(fieldValue, condition);
      });

      if (matches) {
        this.emit('filter:matched', { emailId: email.id, filterId: filter.id });
        return filter.action;
      }
    }

    return null;
  }

  private getEmailField(email: Email, field: FilterCondition['field']): string {
    switch (field) {
      case 'from': return email.from.email;
      case 'to': return email.to.map(t => t.email).join(', ');
      case 'subject': return email.subject;
      case 'body': return email.body;
      case 'label': return email.labels.join(', ');
      default: return '';
    }
  }

  private matchCondition(value: string, condition: FilterCondition): boolean {
    const v = value.toLowerCase();
    const c = condition.value.toLowerCase();

    switch (condition.operator) {
      case 'contains': return v.includes(c);
      case 'equals': return v === c;
      case 'startsWith': return v.startsWith(c);
      case 'endsWith': return v.endsWith(c);
      case 'regex':
        try {
          return new RegExp(condition.value, 'i').test(value);
        } catch {
          return false;
        }
      default: return false;
    }
  }

  // Webhooks
  createWebhook(webhook: Omit<EmailWebhook, 'id' | 'createdAt'>): EmailWebhook {
    const newWebhook: EmailWebhook = {
      ...webhook,
      id: this.generateId('webhook'),
      createdAt: new Date()
    };

    this.webhooks.set(newWebhook.id, newWebhook);
    this.emit('webhook:created', newWebhook);
    return newWebhook;
  }

  deleteWebhook(webhookId: string): boolean {
    const deleted = this.webhooks.delete(webhookId);
    if (deleted) {
      this.emit('webhook:deleted', { webhookId });
    }
    return deleted;
  }

  getWebhooks(): EmailWebhook[] {
    return Array.from(this.webhooks.values());
  }

  // Summarize email
  async summarize(emailId: string): Promise<string | null> {
    const email = await this.getEmail(emailId);
    if (!email) return null;

    // In real implementation, would use AI to summarize
    // For now, return snippet or truncated body
    const summary = email.snippet || email.body.slice(0, 200) + '...';
    this.emit('email:summarized', { emailId, summary });
    return summary;
  }

  // Stats
  getStats(): {
    isConnected: boolean;
    emailCount: number;
    unreadCount: number;
    filterCount: number;
    webhookCount: number;
  } {
    const emails = Array.from(this.emails.values());
    return {
      isConnected: this.isConnected,
      emailCount: emails.length,
      unreadCount: emails.filter(e => !e.isRead).length,
      filterCount: this.config.filters.length,
      webhookCount: this.webhooks.size
    };
  }
}

// Singleton
let emailIntegrationInstance: EmailIntegration | null = null;

export function getEmailIntegration(): EmailIntegration {
  if (!emailIntegrationInstance) {
    emailIntegrationInstance = new EmailIntegration();
  }
  return emailIntegrationInstance;
}

export function resetEmailIntegration(): void {
  if (emailIntegrationInstance) {
    emailIntegrationInstance.disconnect();
    emailIntegrationInstance.removeAllListeners();
    emailIntegrationInstance = null;
  }
}

