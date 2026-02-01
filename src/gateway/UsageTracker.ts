/**
 * Lisa Usage Tracker
 * Track API usage, costs, and implement model failover
 * Inspired by OpenClaw's usage tracking system
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface UsageRecord {
  id: string;
  sessionId: string;
  model: string;
  provider: ModelProvider;
  timestamp: Date;
  tokens: TokenUsage;
  cost: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'xai' | 'local';

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow: number;
  maxOutput: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  priority: number; // Lower = higher priority for failover
  enabled: boolean;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  byModel: Record<string, ModelStats>;
  byProvider: Record<string, ProviderStats>;
}

export interface ModelStats {
  requests: number;
  tokens: number;
  cost: number;
  avgLatency: number;
  successRate: number;
}

export interface ProviderStats {
  requests: number;
  tokens: number;
  cost: number;
  avgLatency: number;
  successRate: number;
  lastError?: string;
  lastErrorTime?: Date;
}

// Default model configurations
const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    maxOutput: 4096,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    priority: 1,
    enabled: true,
    rateLimit: { requestsPerMinute: 500, tokensPerMinute: 30000 }
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    maxOutput: 4096,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
    priority: 2,
    enabled: true
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutput: 4096,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    priority: 3,
    enabled: true
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutput: 4096,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    priority: 4,
    enabled: true
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    contextWindow: 32000,
    maxOutput: 2048,
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.0005,
    priority: 5,
    enabled: true
  },
  {
    id: 'grok-2',
    name: 'Grok 2',
    provider: 'xai',
    contextWindow: 131072,
    maxOutput: 4096,
    costPer1kInput: 0.002,
    costPer1kOutput: 0.01,
    priority: 6,
    enabled: true
  }
];

export class UsageTracker extends BrowserEventEmitter {
  private records: UsageRecord[] = [];
  private models: Map<string, ModelConfig> = new Map();
  private providerHealth: Map<ModelProvider, { failures: number; lastFailure: Date | null }> = new Map();
  private maxRecords = 10000;

  constructor() {
    super();
    this.initializeModels();
    this.initializeProviderHealth();
  }

  private initializeModels(): void {
    for (const model of DEFAULT_MODELS) {
      this.models.set(model.id, model);
    }
  }

  private initializeProviderHealth(): void {
    const providers: ModelProvider[] = ['openai', 'anthropic', 'google', 'xai', 'local'];
    for (const provider of providers) {
      this.providerHealth.set(provider, { failures: 0, lastFailure: null });
    }
  }

  // Usage tracking
  recordUsage(record: Omit<UsageRecord, 'id' | 'cost'>): UsageRecord {
    const model = this.models.get(record.model);
    const cost = model 
      ? (record.tokens.prompt * model.costPer1kInput / 1000) + 
        (record.tokens.completion * model.costPer1kOutput / 1000)
      : 0;

    const fullRecord: UsageRecord = {
      ...record,
      id: `usage_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      cost
    };

    this.records.push(fullRecord);
    
    // Trim old records
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }

    // Update provider health
    if (!record.success) {
      const health = this.providerHealth.get(record.provider);
      if (health) {
        health.failures++;
        health.lastFailure = new Date();
      }
    }

    this.emit('usage:recorded', fullRecord);
    return fullRecord;
  }

  // Model management
  getModel(id: string): ModelConfig | undefined {
    return this.models.get(id);
  }

  listModels(filter?: { provider?: ModelProvider; enabled?: boolean }): ModelConfig[] {
    let models = Array.from(this.models.values());
    
    if (filter?.provider) {
      models = models.filter(m => m.provider === filter.provider);
    }
    if (filter?.enabled !== undefined) {
      models = models.filter(m => m.enabled === filter.enabled);
    }
    
    return models.sort((a, b) => a.priority - b.priority);
  }

  enableModel(id: string): boolean {
    const model = this.models.get(id);
    if (model) {
      model.enabled = true;
      return true;
    }
    return false;
  }

  disableModel(id: string): boolean {
    const model = this.models.get(id);
    if (model) {
      model.enabled = false;
      return true;
    }
    return false;
  }

  addModel(config: ModelConfig): void {
    this.models.set(config.id, config);
    this.emit('model:added', config);
  }

  // Failover
  getNextAvailableModel(excludeModels: string[] = []): ModelConfig | null {
    const models = this.listModels({ enabled: true })
      .filter(m => !excludeModels.includes(m.id))
      .filter(m => this.isProviderHealthy(m.provider));

    return models[0] || null;
  }

  private isProviderHealthy(provider: ModelProvider): boolean {
    const health = this.providerHealth.get(provider);
    if (!health) return true;

    // Consider unhealthy if 3+ failures in last 5 minutes
    if (health.failures >= 3 && health.lastFailure) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (health.lastFailure > fiveMinutesAgo) {
        return false;
      }
      // Reset failures after cooldown
      health.failures = 0;
    }

    return true;
  }

  resetProviderHealth(provider: ModelProvider): void {
    const health = this.providerHealth.get(provider);
    if (health) {
      health.failures = 0;
      health.lastFailure = null;
    }
  }

  // Statistics
  getStats(options?: { 
    since?: Date; 
    sessionId?: string;
    model?: string;
  }): UsageStats {
    let records = this.records;

    if (options?.since) {
      records = records.filter(r => r.timestamp >= options.since!);
    }
    if (options?.sessionId) {
      records = records.filter(r => r.sessionId === options.sessionId);
    }
    if (options?.model) {
      records = records.filter(r => r.model === options.model);
    }

    const totalRequests = records.length;
    const successfulRequests = records.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const totalTokens = records.reduce((sum, r) => sum + r.tokens.total, 0);
    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalLatency = records.reduce((sum, r) => sum + r.latencyMs, 0);
    const averageLatency = totalRequests > 0 ? totalLatency / totalRequests : 0;

    // By model
    const byModel: Record<string, ModelStats> = {};
    for (const record of records) {
      if (!byModel[record.model]) {
        byModel[record.model] = {
          requests: 0,
          tokens: 0,
          cost: 0,
          avgLatency: 0,
          successRate: 0
        };
      }
      const stats = byModel[record.model];
      stats.requests++;
      stats.tokens += record.tokens.total;
      stats.cost += record.cost;
      stats.avgLatency = (stats.avgLatency * (stats.requests - 1) + record.latencyMs) / stats.requests;
    }

    // Calculate success rates for models
    for (const model of Object.keys(byModel)) {
      const modelRecords = records.filter(r => r.model === model);
      byModel[model].successRate = modelRecords.filter(r => r.success).length / modelRecords.length;
    }

    // By provider
    const byProvider: Record<string, ProviderStats> = {};
    for (const record of records) {
      if (!byProvider[record.provider]) {
        byProvider[record.provider] = {
          requests: 0,
          tokens: 0,
          cost: 0,
          avgLatency: 0,
          successRate: 0
        };
      }
      const stats = byProvider[record.provider];
      stats.requests++;
      stats.tokens += record.tokens.total;
      stats.cost += record.cost;
      stats.avgLatency = (stats.avgLatency * (stats.requests - 1) + record.latencyMs) / stats.requests;
      
      if (!record.success && record.error) {
        stats.lastError = record.error;
        stats.lastErrorTime = record.timestamp;
      }
    }

    // Calculate success rates for providers
    for (const provider of Object.keys(byProvider)) {
      const providerRecords = records.filter(r => r.provider === provider);
      byProvider[provider].successRate = providerRecords.filter(r => r.success).length / providerRecords.length;
    }

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalTokens,
      totalCost,
      averageLatency,
      byModel,
      byProvider
    };
  }

  // Daily/Monthly stats
  getDailyStats(date: Date = new Date()): UsageStats {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return this.getStats({ since: startOfDay });
  }

  getMonthlyStats(date: Date = new Date()): UsageStats {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    return this.getStats({ since: startOfMonth });
  }

  // Cost estimation
  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    const config = this.models.get(model);
    if (!config) return 0;
    
    return (promptTokens * config.costPer1kInput / 1000) + 
           (completionTokens * config.costPer1kOutput / 1000);
  }

  // Export records
  exportRecords(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['id', 'sessionId', 'model', 'provider', 'timestamp', 'promptTokens', 'completionTokens', 'totalTokens', 'cost', 'latencyMs', 'success', 'error'];
      const rows = this.records.map(r => [
        r.id,
        r.sessionId,
        r.model,
        r.provider,
        r.timestamp.toISOString(),
        r.tokens.prompt,
        r.tokens.completion,
        r.tokens.total,
        r.cost.toFixed(6),
        r.latencyMs,
        r.success,
        r.error || ''
      ].join(','));
      return [headers.join(','), ...rows].join('\n');
    }
    
    return JSON.stringify(this.records, null, 2);
  }

  // Clear records
  clearRecords(): void {
    this.records = [];
    this.emit('records:cleared');
  }
}

// Singleton
let usageTrackerInstance: UsageTracker | null = null;

export function getUsageTracker(): UsageTracker {
  if (!usageTrackerInstance) {
    usageTrackerInstance = new UsageTracker();
  }
  return usageTrackerInstance;
}

export function resetUsageTracker(): void {
  if (usageTrackerInstance) {
    usageTrackerInstance.removeAllListeners();
    usageTrackerInstance = null;
  }
}

