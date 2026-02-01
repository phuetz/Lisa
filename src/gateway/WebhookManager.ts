/**
 * Lisa Webhook Manager
 * Incoming webhooks for external integrations
 * Inspired by OpenClaw's webhook system
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';
import { getGateway } from './GatewayServer';

export interface Webhook {
  id: string;
  name: string;
  url: string; // The unique URL path for this webhook
  secret?: string; // Optional secret for verification
  enabled: boolean;
  action: WebhookAction;
  filters?: WebhookFilter[];
  lastTriggered?: Date;
  triggerCount: number;
  createdAt: Date;
}

export interface WebhookAction {
  type: 'message' | 'tool' | 'agent' | 'event';
  config: WebhookActionConfig;
}

export type WebhookActionConfig =
  | WebhookMessageConfig
  | WebhookToolConfig
  | WebhookAgentConfig
  | WebhookEventConfig;

export interface WebhookMessageConfig {
  sessionId: string;
  template: string; // Message template with {{payload.field}} placeholders
}

export interface WebhookToolConfig {
  toolId: string;
  parameterMapping: Record<string, string>; // Maps tool params to webhook payload fields
}

export interface WebhookAgentConfig {
  agentId: string;
  taskTemplate: string;
}

export interface WebhookEventConfig {
  eventName: string;
  payloadMapping?: Record<string, string>;
}

export interface WebhookFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'exists';
  value?: string;
}

export interface WebhookRequest {
  webhookId: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  query: Record<string, string>;
  timestamp: Date;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export class WebhookManager extends BrowserEventEmitter {
  private webhooks: Map<string, Webhook> = new Map();
  private urlToId: Map<string, string> = new Map(); // URL path -> webhook ID

  constructor() {
    super();
  }

  // Webhook Management
  createWebhook(config: Omit<Webhook, 'id' | 'url' | 'lastTriggered' | 'triggerCount' | 'createdAt'>): Webhook {
    const id = `wh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const url = `/webhooks/${id}`;

    const webhook: Webhook = {
      id,
      url,
      ...config,
      triggerCount: 0,
      createdAt: new Date()
    };

    this.webhooks.set(id, webhook);
    this.urlToId.set(url, id);
    
    this.emit('webhook:created', webhook);
    console.log(`[Webhook] Created: ${webhook.name} -> ${url}`);
    
    return webhook;
  }

  updateWebhook(id: string, updates: Partial<Omit<Webhook, 'id' | 'url' | 'createdAt'>>): Webhook | null {
    const webhook = this.webhooks.get(id);
    if (!webhook) return null;

    Object.assign(webhook, updates);
    this.emit('webhook:updated', webhook);
    
    return webhook;
  }

  deleteWebhook(id: string): boolean {
    const webhook = this.webhooks.get(id);
    if (!webhook) return false;

    this.urlToId.delete(webhook.url);
    this.webhooks.delete(id);
    
    this.emit('webhook:deleted', { id });
    return true;
  }

  getWebhook(id: string): Webhook | undefined {
    return this.webhooks.get(id);
  }

  getWebhookByUrl(url: string): Webhook | undefined {
    const id = this.urlToId.get(url);
    if (!id) return undefined;
    return this.webhooks.get(id);
  }

  listWebhooks(filter?: { enabled?: boolean }): Webhook[] {
    let webhooks = Array.from(this.webhooks.values());
    
    if (filter?.enabled !== undefined) {
      webhooks = webhooks.filter(w => w.enabled === filter.enabled);
    }
    
    return webhooks;
  }

  enableWebhook(id: string): boolean {
    const webhook = this.webhooks.get(id);
    if (!webhook) return false;
    
    webhook.enabled = true;
    this.emit('webhook:enabled', webhook);
    return true;
  }

  disableWebhook(id: string): boolean {
    const webhook = this.webhooks.get(id);
    if (!webhook) return false;
    
    webhook.enabled = false;
    this.emit('webhook:disabled', webhook);
    return true;
  }

  // Webhook Processing
  async processWebhook(url: string, request: Omit<WebhookRequest, 'webhookId' | 'timestamp'>): Promise<WebhookResponse> {
    const webhook = this.getWebhookByUrl(url);
    
    if (!webhook) {
      return { success: false, message: 'Webhook not found' };
    }

    if (!webhook.enabled) {
      return { success: false, message: 'Webhook is disabled' };
    }

    // Verify secret if configured
    if (webhook.secret) {
      const providedSecret = request.headers['x-webhook-secret'] || request.headers['authorization'];
      if (providedSecret !== webhook.secret && providedSecret !== `Bearer ${webhook.secret}`) {
        return { success: false, message: 'Invalid secret' };
      }
    }

    // Apply filters
    if (webhook.filters && webhook.filters.length > 0) {
      const payload = request.body as Record<string, unknown>;
      const passesFilters = webhook.filters.every(filter => this.evaluateFilter(filter, payload));
      
      if (!passesFilters) {
        return { success: false, message: 'Filters not matched' };
      }
    }

    // Execute action
    try {
      await this.executeAction(webhook.action, request.body);
      
      webhook.lastTriggered = new Date();
      webhook.triggerCount++;
      
      this.emit('webhook:triggered', {
        webhook,
        request: { ...request, webhookId: webhook.id, timestamp: new Date() }
      });

      return { success: true, message: 'Webhook processed successfully' };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.emit('webhook:error', {
        webhook,
        error: errorMessage
      });

      return { success: false, message: errorMessage };
    }
  }

  private evaluateFilter(filter: WebhookFilter, payload: Record<string, unknown>): boolean {
    const value = this.getNestedValue(payload, filter.field);
    
    if (filter.operator === 'exists') {
      return value !== undefined;
    }

    if (value === undefined) return false;
    
    const stringValue = String(value);
    const filterValue = filter.value || '';

    switch (filter.operator) {
      case 'equals':
        return stringValue === filterValue;
      case 'contains':
        return stringValue.includes(filterValue);
      case 'startsWith':
        return stringValue.startsWith(filterValue);
      case 'endsWith':
        return stringValue.endsWith(filterValue);
      case 'regex':
        return new RegExp(filterValue).test(stringValue);
      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private async executeAction(action: WebhookAction, payload: unknown): Promise<void> {
    const gateway = getGateway();

    switch (action.type) {
      case 'message': {
        const config = action.config as WebhookMessageConfig;
        const content = this.interpolateTemplate(config.template, payload as Record<string, unknown>);
        await gateway.sendMessage(config.sessionId, {
          content,
          role: 'system'
        });
        break;
      }
      
      case 'tool': {
        const config = action.config as WebhookToolConfig;
        const parameters: Record<string, unknown> = {};
        
        for (const [param, path] of Object.entries(config.parameterMapping)) {
          parameters[param] = this.getNestedValue(payload as Record<string, unknown>, path);
        }
        
        await gateway.invokeTool({
          toolId: config.toolId,
          parameters,
          sessionId: 'webhook-system'
        });
        break;
      }
      
      case 'agent': {
        const config = action.config as WebhookAgentConfig;
        const task = this.interpolateTemplate(config.taskTemplate, payload as Record<string, unknown>);
        
        const session = await gateway.createSession('webhook-system', 'api');
        await gateway.sendMessage(session.id, {
          content: task,
          role: 'user'
        });
        break;
      }
      
      case 'event': {
        const config = action.config as WebhookEventConfig;
        let eventPayload = payload;
        
        if (config.payloadMapping) {
          eventPayload = {};
          for (const [key, path] of Object.entries(config.payloadMapping)) {
            (eventPayload as Record<string, unknown>)[key] = this.getNestedValue(
              payload as Record<string, unknown>,
              path
            );
          }
        }
        
        this.emit(config.eventName, eventPayload);
        break;
      }
    }
  }

  private interpolateTemplate(template: string, payload: Record<string, unknown>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const value = this.getNestedValue(payload, path.trim());
      return value !== undefined ? String(value) : '';
    });
  }

  // Predefined webhook creators
  createGitHubWebhook(name: string, sessionId: string): Webhook {
    return this.createWebhook({
      name,
      enabled: true,
      action: {
        type: 'message',
        config: {
          sessionId,
          template: '🔔 GitHub: {{action}} on {{repository.full_name}}\n\n{{sender.login}}: {{pull_request.title || issue.title || commits[0].message}}'
        } as WebhookMessageConfig
      },
      filters: [
        { field: 'repository', operator: 'exists' }
      ]
    });
  }

  createSlackWebhook(name: string, sessionId: string): Webhook {
    return this.createWebhook({
      name,
      enabled: true,
      action: {
        type: 'message',
        config: {
          sessionId,
          template: '💬 Slack: {{event.user}} in #{{event.channel}}\n\n{{event.text}}'
        } as WebhookMessageConfig
      }
    });
  }

  createGenericWebhook(name: string, eventName: string): Webhook {
    return this.createWebhook({
      name,
      enabled: true,
      action: {
        type: 'event',
        config: {
          eventName
        } as WebhookEventConfig
      }
    });
  }

  // Stats
  getStats(): {
    total: number;
    enabled: number;
    totalTriggers: number;
  } {
    const webhooks = Array.from(this.webhooks.values());
    return {
      total: webhooks.length,
      enabled: webhooks.filter(w => w.enabled).length,
      totalTriggers: webhooks.reduce((sum, w) => sum + w.triggerCount, 0)
    };
  }

  // Generate webhook URLs for display
  getFullUrl(webhook: Webhook, baseUrl: string = 'http://localhost:3001'): string {
    return `${baseUrl}${webhook.url}`;
  }
}

// Singleton
let webhookManagerInstance: WebhookManager | null = null;

export function getWebhookManager(): WebhookManager {
  if (!webhookManagerInstance) {
    webhookManagerInstance = new WebhookManager();
  }
  return webhookManagerInstance;
}

export function resetWebhookManager(): void {
  if (webhookManagerInstance) {
    webhookManagerInstance.removeAllListeners();
    webhookManagerInstance = null;
  }
}

