/**
 * Lisa Model Failover - Multi-provider with automatic fallback
 * Based on OpenClaw's model failover system
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'ollama' | 'groq' | 'mistral';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  priority?: number;
}

export interface FailoverConfig {
  models: ModelConfig[];
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  healthCheckIntervalMs?: number;
}

export interface ModelHealth {
  provider: ModelProvider;
  model: string;
  isHealthy: boolean;
  lastCheck: Date;
  latencyMs?: number;
  errorCount: number;
  successCount: number;
  lastError?: string;
}

export interface CompletionRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  content: string;
  provider: ModelProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export class ModelFailover extends BrowserEventEmitter {
  private config: FailoverConfig;
  private healthStatus: Map<string, ModelHealth> = new Map();
  private healthCheckInterval?: ReturnType<typeof setInterval>;

  constructor(config: FailoverConfig) {
    super();
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      healthCheckIntervalMs: 60000,
      ...config,
    };

    // Sort models by priority
    this.config.models.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    // Initialize health status
    this.initializeHealth();
  }

  private initializeHealth(): void {
    for (const model of this.config.models) {
      const key = this.getModelKey(model);
      this.healthStatus.set(key, {
        provider: model.provider,
        model: model.model,
        isHealthy: true,
        lastCheck: new Date(),
        errorCount: 0,
        successCount: 0,
      });
    }
  }

  private getModelKey(model: ModelConfig): string {
    return `${model.provider}:${model.model}`;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const errors: Error[] = [];

    // Get healthy models first, then unhealthy ones
    const sortedModels = [...this.config.models].sort((a, b) => {
      const healthA = this.healthStatus.get(this.getModelKey(a));
      const healthB = this.healthStatus.get(this.getModelKey(b));
      if (healthA?.isHealthy && !healthB?.isHealthy) return -1;
      if (!healthA?.isHealthy && healthB?.isHealthy) return 1;
      return (a.priority || 0) - (b.priority || 0);
    });

    for (const modelConfig of sortedModels) {
      const key = this.getModelKey(modelConfig);
      const health = this.healthStatus.get(key)!;

      for (let retry = 0; retry < (this.config.maxRetries || 3); retry++) {
        try {
          const startTime = Date.now();
          const response = await this.callProvider(modelConfig, request);
          const latencyMs = Date.now() - startTime;

          // Update health
          health.isHealthy = true;
          health.successCount++;
          health.latencyMs = latencyMs;
          health.lastCheck = new Date();
          health.lastError = undefined;

          this.emit('completion', {
            provider: modelConfig.provider,
            model: modelConfig.model,
            latencyMs,
          });

          return {
            ...response,
            provider: modelConfig.provider,
            model: modelConfig.model,
            latencyMs,
          };
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push(err);

          health.errorCount++;
          health.lastError = err.message;
          health.lastCheck = new Date();

          // Mark as unhealthy after multiple failures
          if (health.errorCount >= 3) {
            health.isHealthy = false;
          }

          this.emit('error', {
            provider: modelConfig.provider,
            model: modelConfig.model,
            error: err,
            retry,
          });

          // Wait before retry
          if (retry < (this.config.maxRetries || 3) - 1) {
            await this.delay(this.config.retryDelayMs || 1000);
          }
        }
      }
    }

    // All models failed
    const aggregateError = new Error(
      `All models failed: ${errors.map((e) => e.message).join('; ')}`
    );
    this.emit('allModelsFailed', { errors });
    throw aggregateError;
  }

  private async callProvider(
    config: ModelConfig,
    request: CompletionRequest
  ): Promise<Omit<CompletionResponse, 'provider' | 'model' | 'latencyMs'>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs || 30000
    );

    try {
      switch (config.provider) {
        case 'openai':
          return await this.callOpenAI(config, request, controller.signal);
        case 'anthropic':
          return await this.callAnthropic(config, request, controller.signal);
        case 'google':
          return await this.callGoogle(config, request, controller.signal);
        case 'ollama':
          return await this.callOllama(config, request, controller.signal);
        case 'groq':
          return await this.callGroq(config, request, controller.signal);
        case 'mistral':
          return await this.callMistral(config, request, controller.signal);
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async callOpenAI(
    config: ModelConfig,
    request: CompletionRequest,
    signal: AbortSignal
  ): Promise<Omit<CompletionResponse, 'provider' | 'model' | 'latencyMs'>> {
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        max_tokens: request.maxTokens || config.maxTokens || 4096,
        temperature: request.temperature ?? config.temperature ?? 0.7,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  private async callAnthropic(
    config: ModelConfig,
    request: CompletionRequest,
    signal: AbortSignal
  ): Promise<Omit<CompletionResponse, 'provider' | 'model' | 'latencyMs'>> {
    const baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    
    // Extract system message
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const otherMessages = request.messages.filter((m) => m.role !== 'system');

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        system: systemMessage?.content,
        messages: otherMessages,
        max_tokens: request.maxTokens || config.maxTokens || 4096,
        temperature: request.temperature ?? config.temperature ?? 0.7,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
    };
  }

  private async callGoogle(
    config: ModelConfig,
    request: CompletionRequest,
    signal: AbortSignal
  ): Promise<Omit<CompletionResponse, 'provider' | 'model' | 'latencyMs'>> {
    const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`;
    
    // Convert messages to Google format
    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = request.messages.find((m) => m.role === 'system');

    const response = await fetch(`${baseUrl}?key=${config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction
          ? { parts: [{ text: systemInstruction.content }] }
          : undefined,
        generationConfig: {
          maxOutputTokens: request.maxTokens || config.maxTokens || 4096,
          temperature: request.temperature ?? config.temperature ?? 0.7,
        },
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  private async callOllama(
    config: ModelConfig,
    request: CompletionRequest,
    signal: AbortSignal
  ): Promise<Omit<CompletionResponse, 'provider' | 'model' | 'latencyMs'>> {
    const baseUrl = config.baseUrl || 'http://localhost:11434';
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature ?? config.temperature ?? 0.7,
          num_predict: request.maxTokens || config.maxTokens || 4096,
        },
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.message.content,
      usage: data.eval_count
        ? {
            promptTokens: data.prompt_eval_count || 0,
            completionTokens: data.eval_count || 0,
            totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
          }
        : undefined,
    };
  }

  private async callGroq(
    config: ModelConfig,
    request: CompletionRequest,
    signal: AbortSignal
  ): Promise<Omit<CompletionResponse, 'provider' | 'model' | 'latencyMs'>> {
    const baseUrl = config.baseUrl || 'https://api.groq.com/openai/v1';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        max_tokens: request.maxTokens || config.maxTokens || 4096,
        temperature: request.temperature ?? config.temperature ?? 0.7,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  private async callMistral(
    config: ModelConfig,
    request: CompletionRequest,
    signal: AbortSignal
  ): Promise<Omit<CompletionResponse, 'provider' | 'model' | 'latencyMs'>> {
    const baseUrl = config.baseUrl || 'https://api.mistral.ai/v1';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        max_tokens: request.maxTokens || config.maxTokens || 4096,
        temperature: request.temperature ?? config.temperature ?? 0.7,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mistral error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  startHealthChecks(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckIntervalMs || 60000);
  }

  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  private async performHealthChecks(): Promise<void> {
    for (const modelConfig of this.config.models) {
      try {
        const startTime = Date.now();
        await this.callProvider(modelConfig, {
          messages: [{ role: 'user', content: 'ping' }],
          maxTokens: 5,
        });
        const latencyMs = Date.now() - startTime;

        const key = this.getModelKey(modelConfig);
        const health = this.healthStatus.get(key)!;
        health.isHealthy = true;
        health.latencyMs = latencyMs;
        health.lastCheck = new Date();
      } catch (error) {
        const key = this.getModelKey(modelConfig);
        const health = this.healthStatus.get(key)!;
        health.isHealthy = false;
        health.lastCheck = new Date();
        health.lastError = error instanceof Error ? error.message : String(error);
      }
    }

    this.emit('healthCheck', this.getHealthStatus());
  }

  getHealthStatus(): ModelHealth[] {
    return Array.from(this.healthStatus.values());
  }

  getHealthyModels(): ModelConfig[] {
    return this.config.models.filter((model) => {
      const health = this.healthStatus.get(this.getModelKey(model));
      return health?.isHealthy;
    });
  }
}

// Singleton with default config
let instance: ModelFailover | null = null;

export function getModelFailover(config?: FailoverConfig): ModelFailover {
  if (!instance && config) {
    instance = new ModelFailover(config);
  }
  if (!instance) {
    throw new Error('ModelFailover not initialized. Provide config first.');
  }
  return instance;
}

export function resetModelFailover(): void {
  if (instance) {
    instance.stopHealthChecks();
    instance.removeAllListeners();
    instance = null;
  }
}
