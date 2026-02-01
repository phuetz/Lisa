/**
 * Lisa Model Manager
 * AI model selection, configuration, and management
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface AIModel {
  id: string;
  name: string;
  provider: ModelProvider;
  type: ModelType;
  contextWindow: number;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  capabilities: ModelCapability[];
  isDefault: boolean;
  isEnabled: boolean;
  apiKeyRequired: boolean;
  endpoint?: string;
}

export type ModelProvider = 
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'groq'
  | 'ollama'
  | 'local'
  | 'azure';

export type ModelType = 
  | 'chat'
  | 'completion'
  | 'embedding'
  | 'vision'
  | 'audio'
  | 'multimodal';

export type ModelCapability = 
  | 'chat'
  | 'code'
  | 'vision'
  | 'function_calling'
  | 'json_mode'
  | 'streaming'
  | 'long_context'
  | 'reasoning';

export interface ModelConfig {
  modelId: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string[];
  systemPrompt?: string;
}

export interface ProviderConfig {
  provider: ModelProvider;
  apiKey?: string;
  baseUrl?: string;
  organizationId?: string;
  isConfigured: boolean;
}

const DEFAULT_MODELS: AIModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    type: 'multimodal',
    contextWindow: 128000,
    maxTokens: 4096,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    capabilities: ['chat', 'code', 'vision', 'function_calling', 'json_mode', 'streaming'],
    isDefault: true,
    isEnabled: true,
    apiKeyRequired: true
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    type: 'multimodal',
    contextWindow: 128000,
    maxTokens: 16384,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    capabilities: ['chat', 'code', 'vision', 'function_calling', 'json_mode', 'streaming'],
    isDefault: false,
    isEnabled: true,
    apiKeyRequired: true
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    type: 'multimodal',
    contextWindow: 200000,
    maxTokens: 8192,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    capabilities: ['chat', 'code', 'vision', 'function_calling', 'streaming', 'long_context', 'reasoning'],
    isDefault: false,
    isEnabled: true,
    apiKeyRequired: true
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    type: 'chat',
    contextWindow: 200000,
    maxTokens: 8192,
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.004,
    capabilities: ['chat', 'code', 'function_calling', 'streaming', 'long_context'],
    isDefault: false,
    isEnabled: true,
    apiKeyRequired: true
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    type: 'multimodal',
    contextWindow: 1000000,
    maxTokens: 8192,
    costPer1kInput: 0.000075,
    costPer1kOutput: 0.0003,
    capabilities: ['chat', 'code', 'vision', 'function_calling', 'streaming', 'long_context'],
    isDefault: false,
    isEnabled: true,
    apiKeyRequired: true
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'mistral',
    type: 'chat',
    contextWindow: 128000,
    maxTokens: 4096,
    costPer1kInput: 0.002,
    costPer1kOutput: 0.006,
    capabilities: ['chat', 'code', 'function_calling', 'json_mode', 'streaming'],
    isDefault: false,
    isEnabled: true,
    apiKeyRequired: true
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    type: 'chat',
    contextWindow: 131072,
    maxTokens: 8192,
    costPer1kInput: 0.00059,
    costPer1kOutput: 0.00079,
    capabilities: ['chat', 'code', 'function_calling', 'streaming'],
    isDefault: false,
    isEnabled: true,
    apiKeyRequired: true
  },
  {
    id: 'ollama-llama3',
    name: 'Llama 3 (Local)',
    provider: 'ollama',
    type: 'chat',
    contextWindow: 8192,
    maxTokens: 4096,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    capabilities: ['chat', 'code', 'streaming'],
    isDefault: false,
    isEnabled: false,
    apiKeyRequired: false,
    endpoint: 'http://localhost:11434'
  }
];

const DEFAULT_CONFIG: ModelConfig = {
  modelId: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stopSequences: []
};

export class ModelManager extends BrowserEventEmitter {
  private models: Map<string, AIModel> = new Map();
  private providers: Map<ModelProvider, ProviderConfig> = new Map();
  private currentConfig: ModelConfig;
  private configHistory: ModelConfig[] = [];

  constructor() {
    super();
    this.currentConfig = { ...DEFAULT_CONFIG };
    this.loadDefaultModels();
    this.loadFromStorage();
  }

  private loadDefaultModels(): void {
    for (const model of DEFAULT_MODELS) {
      this.models.set(model.id, model);
    }

    // Initialize provider configs
    const providerList: ModelProvider[] = ['openai', 'anthropic', 'google', 'mistral', 'groq', 'ollama', 'local', 'azure'];
    for (const provider of providerList) {
      this.providers.set(provider, {
        provider,
        isConfigured: false
      });
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('lisa-model-config');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.currentConfig) {
          this.currentConfig = { ...DEFAULT_CONFIG, ...data.currentConfig };
        }
        if (data.providers) {
          for (const [key, value] of Object.entries(data.providers)) {
            const existing = this.providers.get(key as ModelProvider);
            if (existing) {
              this.providers.set(key as ModelProvider, { ...existing, ...(value as ProviderConfig) });
            }
          }
        }
        if (data.enabledModels) {
          for (const modelId of data.enabledModels) {
            const model = this.models.get(modelId);
            if (model) model.isEnabled = true;
          }
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
        currentConfig: this.currentConfig,
        providers: Object.fromEntries(
          Array.from(this.providers.entries()).map(([k, v]) => [k, { ...v, apiKey: undefined }])
        ),
        enabledModels: Array.from(this.models.values())
          .filter(m => m.isEnabled)
          .map(m => m.id)
      };
      localStorage.setItem('lisa-model-config', JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  // Model management
  getModel(id: string): AIModel | undefined {
    return this.models.get(id);
  }

  listModels(filter?: {
    provider?: ModelProvider;
    type?: ModelType;
    capability?: ModelCapability;
    enabledOnly?: boolean;
  }): AIModel[] {
    let models = Array.from(this.models.values());

    if (filter?.provider) {
      models = models.filter(m => m.provider === filter.provider);
    }
    if (filter?.type) {
      models = models.filter(m => m.type === filter.type);
    }
    if (filter?.capability) {
      models = models.filter(m => m.capabilities.includes(filter.capability!));
    }
    if (filter?.enabledOnly) {
      models = models.filter(m => m.isEnabled);
    }

    return models.sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  getDefaultModel(): AIModel | undefined {
    return Array.from(this.models.values()).find(m => m.isDefault);
  }

  setDefaultModel(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model) return false;

    // Clear existing default
    for (const m of this.models.values()) {
      m.isDefault = false;
    }

    model.isDefault = true;
    this.currentConfig.modelId = modelId;
    this.emit('model:default-changed', model);
    this.saveToStorage();
    return true;
  }

  enableModel(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model) return false;

    model.isEnabled = true;
    this.emit('model:enabled', model);
    this.saveToStorage();
    return true;
  }

  disableModel(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model || model.isDefault) return false;

    model.isEnabled = false;
    this.emit('model:disabled', model);
    this.saveToStorage();
    return true;
  }

  // Provider management
  getProvider(provider: ModelProvider): ProviderConfig | undefined {
    return this.providers.get(provider);
  }

  listProviders(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  configureProvider(provider: ModelProvider, config: Partial<ProviderConfig>): void {
    const existing = this.providers.get(provider) || { provider, isConfigured: false };
    const updated = { ...existing, ...config, isConfigured: !!config.apiKey || !!config.baseUrl };
    this.providers.set(provider, updated);
    this.emit('provider:configured', updated);
    this.saveToStorage();
  }

  isProviderConfigured(provider: ModelProvider): boolean {
    return this.providers.get(provider)?.isConfigured || false;
  }

  // Configuration
  getConfig(): ModelConfig {
    return { ...this.currentConfig };
  }

  setConfig(config: Partial<ModelConfig>): void {
    // Save to history
    this.configHistory.push({ ...this.currentConfig });
    if (this.configHistory.length > 10) {
      this.configHistory.shift();
    }

    this.currentConfig = { ...this.currentConfig, ...config };
    this.emit('config:changed', this.currentConfig);
    this.saveToStorage();
  }

  resetConfig(): void {
    this.currentConfig = { ...DEFAULT_CONFIG };
    this.emit('config:reset', this.currentConfig);
    this.saveToStorage();
  }

  // Presets
  applyPreset(preset: 'creative' | 'precise' | 'balanced' | 'code'): void {
    const presets: Record<string, Partial<ModelConfig>> = {
      creative: { temperature: 1.0, topP: 0.95, frequencyPenalty: 0.3, presencePenalty: 0.3 },
      precise: { temperature: 0.2, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 },
      balanced: { temperature: 0.7, topP: 1, frequencyPenalty: 0, presencePenalty: 0 },
      code: { temperature: 0.3, topP: 0.95, frequencyPenalty: 0.1, presencePenalty: 0 }
    };

    if (presets[preset]) {
      this.setConfig(presets[preset]);
      this.emit('preset:applied', preset);
    }
  }

  // Cost estimation
  estimateCost(inputTokens: number, outputTokens: number, modelId?: string): number {
    const model = this.models.get(modelId || this.currentConfig.modelId);
    if (!model) return 0;

    return (inputTokens / 1000) * model.costPer1kInput + (outputTokens / 1000) * model.costPer1kOutput;
  }

  // Stats
  getStats(): {
    totalModels: number;
    enabledModels: number;
    configuredProviders: number;
    currentModel: string;
  } {
    return {
      totalModels: this.models.size,
      enabledModels: Array.from(this.models.values()).filter(m => m.isEnabled).length,
      configuredProviders: Array.from(this.providers.values()).filter(p => p.isConfigured).length,
      currentModel: this.currentConfig.modelId
    };
  }
}

// Singleton
let modelManagerInstance: ModelManager | null = null;

export function getModelManager(): ModelManager {
  if (!modelManagerInstance) {
    modelManagerInstance = new ModelManager();
  }
  return modelManagerInstance;
}

export function resetModelManager(): void {
  if (modelManagerInstance) {
    modelManagerInstance.removeAllListeners();
    modelManagerInstance = null;
  }
}

