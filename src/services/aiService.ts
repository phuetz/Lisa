/**
 * AI Service - Service unifié pour les API IA
 * Supporte OpenAI, Anthropic (Claude), Gemini, et API locales (LM Studio, Ollama)
 * OpenClaw-inspired: connection management, retry, circuit breaker, model failover
 */

import { getLMStudioUrl, getOllamaUrl, logNetworkConfig } from '../config/networkConfig';
import { lmStudioService } from './LMStudioService';
import { useChatSettingsStore } from '../store/chatSettingsStore';
import { getConnectionManager, type AIProviderType } from './ConnectionManager';
import { RetryService, isRetryableError } from './RetryService';
import { getCircuitBreaker, CircuitBreakerError } from './CircuitBreaker';

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'xai' | 'local' | 'lmstudio' | 'ollama';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  image?: string; // Base64 ou URL
  // OpenAI tool calling extensions
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
  error?: string;
}

export interface AIServiceConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const XAI_API_BASE = 'https://api.x.ai/v1';

// ============================================================================
// Model Failover Configuration (OpenClaw-inspired)
// ============================================================================

/**
 * Fallback models when primary model fails
 * Order matters: first available fallback will be used
 */
const MODEL_FALLBACKS: Record<string, string[]> = {
  // Gemini fallbacks
  'gemini-2.0-flash': ['gpt-4o-mini', 'claude-3-haiku-20240307'],
  'gemini-2.0-flash-exp': ['gemini-2.0-flash', 'gpt-4o-mini'],
  'gemini-1.5-flash': ['gpt-4o-mini', 'claude-3-haiku-20240307'],
  'gemini-1.5-pro': ['gpt-4o', 'claude-3-5-sonnet-20241022'],

  // OpenAI fallbacks
  'gpt-4o': ['claude-3-5-sonnet-20241022', 'gemini-1.5-pro'],
  'gpt-4o-mini': ['claude-3-haiku-20240307', 'gemini-2.0-flash'],
  'gpt-4-turbo': ['claude-3-opus-20240229', 'gemini-1.5-pro'],

  // Anthropic fallbacks
  'claude-3-5-sonnet-20241022': ['gpt-4o', 'gemini-1.5-pro'],
  'claude-3-opus-20240229': ['gpt-4-turbo', 'gemini-1.5-pro'],
  'claude-3-haiku-20240307': ['gpt-4o-mini', 'gemini-2.0-flash'],

  // xAI fallbacks
  'grok-2-latest': ['gpt-4o', 'claude-3-5-sonnet-20241022'],
  'grok-beta': ['gpt-4o-mini', 'gemini-2.0-flash']
};

/**
 * Map model to its provider
 */
function getProviderForModel(model: string): AIProvider {
  if (model.startsWith('gemini')) return 'gemini';
  if (model.startsWith('gpt')) return 'openai';
  if (model.startsWith('claude')) return 'anthropic';
  if (model.startsWith('grok')) return 'xai';
  return 'lmstudio';
}

/**
 * Check if a provider has a valid API key configured
 */
function hasApiKey(provider: AIProvider): boolean {
  const store = useChatSettingsStore.getState();
  const storeKey = store.getApiKeyForProvider(provider);
  if (storeKey) return true;

  switch (provider) {
    case 'openai':
      return !!import.meta.env.VITE_OPENAI_API_KEY;
    case 'anthropic':
      return !!import.meta.env.VITE_ANTHROPIC_API_KEY;
    case 'gemini':
      return !!import.meta.env.VITE_GEMINI_API_KEY;
    case 'xai':
      return !!import.meta.env.GROK_API_KEY;
    default:
      return true; // Local providers don't need API key
  }
}

class AIService {
  private config: AIServiceConfig;
  private retryService: RetryService;
  private failoverEnabled: boolean = true;
  private failoverAttempts: number = 0;
  private maxFailoverAttempts: number = 2;

  constructor(config?: Partial<AIServiceConfig>) {
    // Configuration par défaut
    this.config = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 4096,
      ...config
    };

    // Récupérer les clés API depuis le store ou l'environnement
    if (!this.config.apiKey) {
      this.config.apiKey = this.getApiKeyForProvider(this.config.provider);
    }

    // Initialize retry service with OpenClaw-inspired config
    this.retryService = new RetryService({
      attempts: 3,
      minDelayMs: 400,
      maxDelayMs: 30000,
      jitter: 0.1,
      onRetry: (attempt, error, delay) => {
        console.log(`[AIService] Retry ${attempt}/3 after ${delay}ms:`, error.message);
      }
    });
  }

  /**
   * Enable/disable automatic model failover
   */
  setFailoverEnabled(enabled: boolean): void {
    this.failoverEnabled = enabled;
  }

  /**
   * Get available fallback models for current model
   */
  getAvailableFallbacks(): string[] {
    const currentModel = this.config.model || 'gpt-4o-mini';
    const fallbacks = MODEL_FALLBACKS[currentModel] || [];

    // Filter to only models with available API keys
    return fallbacks.filter(model => {
      const provider = getProviderForModel(model);
      return hasApiKey(provider);
    });
  }

  /**
   * Get circuit breaker for a provider
   */
  private getCircuitBreaker(provider: AIProvider) {
    return getCircuitBreaker(`ai-${provider}`, {
      failureThreshold: 3,
      resetTimeout: 60000, // 1 minute
      successThreshold: 2,
      onStateChange: (from, to, breaker) => {
        console.log(`[AIService] Circuit breaker ${breaker.name}: ${from} -> ${to}`);
        if (to === 'open') {
          console.warn(`[AIService] Provider ${provider} circuit opened - will fail fast`);
        }
      }
    });
  }

  /**
   * Récupérer la clé API pour un provider donné
   * Priorité: store > environment
   */
  private getApiKeyForProvider(provider: AIProvider): string | undefined {
    // Essayer d'abord le store (clés configurées par l'utilisateur)
    const store = useChatSettingsStore.getState();
    const storeKey = store.getApiKeyForProvider(provider);
    if (storeKey) {
      console.log(`[AIService] API key for ${provider} found in store`);
      return storeKey;
    }

    // Fallback sur les variables d'environnement
    let envKey: string | undefined;
    switch (provider) {
      case 'openai':
        envKey = import.meta.env.VITE_OPENAI_API_KEY;
        break;
      case 'anthropic':
        envKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
        break;
      case 'gemini':
        envKey = import.meta.env.VITE_GEMINI_API_KEY;
        break;
      case 'xai':
        envKey = import.meta.env.GROK_API_KEY;
        break;
      default:
        envKey = undefined;
    }

    console.log(`[AIService] API key for ${provider} from env: ${envKey ? 'found (' + envKey.slice(0, 10) + '...)' : 'NOT FOUND'}`);
    return envKey;
  }

  /**
   * Envoyer un message et recevoir une réponse complète
   * Includes automatic retry and model failover (OpenClaw-inspired)
   */
  async sendMessage(messages: AIMessage[]): Promise<string> {
    this.failoverAttempts = 0;
    return this.sendWithFailover(messages);
  }

  /**
   * Send with automatic failover to backup models
   */
  private async sendWithFailover(messages: AIMessage[]): Promise<string> {
    const provider = this.config.provider;
    const circuitBreaker = this.getCircuitBreaker(provider);

    // Check circuit breaker first
    if (!circuitBreaker.isAllowed()) {
      console.warn(`[AIService] Circuit breaker open for ${provider}, attempting failover`);

      if (this.failoverEnabled && this.failoverAttempts < this.maxFailoverAttempts) {
        return this.attemptSendFailover(messages);
      }

      throw new Error(`Service ${provider} temporarily unavailable`);
    }

    try {
      // Use retry service for transient failures
      const result = await this.retryService.withRetry(
        () => this.doSend(provider, messages)
      );

      // Record success
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      // Record failure
      circuitBreaker.recordFailure();

      // Attempt failover if enabled
      if (this.failoverEnabled && this.failoverAttempts < this.maxFailoverAttempts) {
        console.log(`[AIService] Primary provider failed, attempting failover`);
        return this.attemptSendFailover(messages);
      }

      throw error;
    }
  }

  /**
   * Attempt to failover for non-streaming requests
   */
  private async attemptSendFailover(messages: AIMessage[]): Promise<string> {
    const fallbacks = this.getAvailableFallbacks();

    if (fallbacks.length === 0) {
      throw new Error('No fallback models available. Please check your API keys.');
    }

    this.failoverAttempts++;
    const fallbackModel = fallbacks[0];
    const fallbackProvider = getProviderForModel(fallbackModel);

    console.log(`[AIService] Failing over to ${fallbackModel} (${fallbackProvider})`);

    // Temporarily switch config
    const originalConfig = { ...this.config };
    this.updateConfig({
      provider: fallbackProvider,
      model: fallbackModel
    });

    try {
      return await this.sendWithFailover(messages);
    } finally {
      // Restore original config
      this.config = originalConfig;
    }
  }

  /**
   * Internal send dispatch
   */
  private async doSend(provider: AIProvider, messages: AIMessage[]): Promise<string> {
    if (provider === 'openai') {
      return this.sendOpenAI(messages, false);
    } else if (provider === 'anthropic') {
      return this.sendAnthropic(messages, false);
    } else if (provider === 'gemini') {
      return this.sendGemini(messages, false);
    } else if (provider === 'xai') {
      return this.sendXAI(messages);
    } else if (provider === 'local' || provider === 'lmstudio' || provider === 'ollama') {
      return this.sendLocal(messages);
    }

    throw new Error(`Provider non supporté: ${provider}`);
  }

  /**
   * Envoyer un message avec streaming
   * Includes automatic retry and model failover (OpenClaw-inspired)
   */
  async *streamMessage(messages: AIMessage[]): AsyncGenerator<AIStreamChunk> {
    this.failoverAttempts = 0;
    yield* this.streamWithFailover(messages);
  }

  /**
   * Stream with automatic failover to backup models
   */
  private async *streamWithFailover(messages: AIMessage[]): AsyncGenerator<AIStreamChunk> {
    const provider = this.config.provider;
    const circuitBreaker = this.getCircuitBreaker(provider);

    // Check circuit breaker first
    if (!circuitBreaker.isAllowed()) {
      const stats = circuitBreaker.getStats();
      console.warn(`[AIService] Circuit breaker open for ${provider}, attempting failover`);

      if (this.failoverEnabled && this.failoverAttempts < this.maxFailoverAttempts) {
        yield* this.attemptFailover(messages);
        return;
      }

      yield {
        content: '',
        done: true,
        error: `Service ${provider} temporarily unavailable. Try again in ${Math.ceil((stats.nextAttemptAt! - Date.now()) / 1000)}s`
      };
      return;
    }

    try {
      // Stream from the appropriate provider
      yield* this.doStream(provider, messages);

      // Record success
      circuitBreaker.recordSuccess();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Record failure
      circuitBreaker.recordFailure();

      // Attempt failover if enabled and error is retryable
      if (this.failoverEnabled && this.failoverAttempts < this.maxFailoverAttempts) {
        console.log(`[AIService] Primary provider failed, attempting failover`);
        yield* this.attemptFailover(messages);
        return;
      }

      yield { content: '', done: true, error: err.message };
    }
  }

  /**
   * Attempt to failover to a backup model
   */
  private async *attemptFailover(messages: AIMessage[]): AsyncGenerator<AIStreamChunk> {
    const fallbacks = this.getAvailableFallbacks();

    if (fallbacks.length === 0) {
      yield {
        content: '',
        done: true,
        error: 'No fallback models available. Please check your API keys.'
      };
      return;
    }

    this.failoverAttempts++;
    const fallbackModel = fallbacks[0];
    const fallbackProvider = getProviderForModel(fallbackModel);

    console.log(`[AIService] Failing over to ${fallbackModel} (${fallbackProvider}) - attempt ${this.failoverAttempts}`);

    // Temporarily switch config
    const originalConfig = { ...this.config };
    this.updateConfig({
      provider: fallbackProvider,
      model: fallbackModel
    });

    try {
      // Notify user about failover
      yield {
        content: `[Basculement vers ${fallbackModel}...]\n\n`,
        done: false
      };

      yield* this.streamWithFailover(messages);
    } finally {
      // Restore original config
      this.config = originalConfig;
    }
  }

  /**
   * Internal streaming dispatch
   */
  private async *doStream(provider: AIProvider, messages: AIMessage[]): AsyncGenerator<AIStreamChunk> {
    if (provider === 'openai') {
      yield* this.streamOpenAI(messages);
    } else if (provider === 'anthropic') {
      yield* this.streamAnthropic(messages);
    } else if (provider === 'gemini') {
      yield* this.streamGemini(messages);
    } else if (provider === 'xai') {
      yield* this.streamXAI(messages);
    } else if (provider === 'local' || provider === 'lmstudio' || provider === 'ollama') {
      yield* this.streamLocal(messages);
    } else {
      throw new Error(`Provider non supporté pour le streaming: ${provider}`);
    }
  }

  /**
   * Gemini API - Non-streaming
   */
  private async sendGemini(messages: AIMessage[], _stream: boolean): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('VITE_GEMINI_API_KEY non configurée');
    }

    const requestBody = this.formatBodyForGemini(messages, false);

    const response = await fetch(
      `${GEMINI_API_BASE}/models/${this.config.model || 'gemini-1.5-flash'}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Gemini API - Streaming
   */
  private async *streamGemini(messages: AIMessage[]): AsyncGenerator<AIStreamChunk> {
    const connectionManager = getConnectionManager();

    if (!this.config.apiKey) {
      console.error('[AIService] Gemini API key not configured');
      connectionManager.reportFailure('gemini', 'API key not configured');
      yield { content: '', done: true, error: 'VITE_GEMINI_API_KEY non configurée' };
      return;
    }

    const requestBody = this.formatBodyForGemini(messages, true);
    const model = this.config.model || 'gemini-2.0-flash';
    const url = `${GEMINI_API_BASE}/models/${model}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`;

    console.log('[AIService] Gemini streaming request:', { model, url: url.replace(this.config.apiKey, '***') });

    try {
      const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AIService] Gemini API error:', response.status, errorText);
        connectionManager.reportFailure('gemini', errorText, response.status);
        try {
          const error = JSON.parse(errorText);
          yield { content: '', done: true, error: error.error?.message || `Gemini API error: ${response.status}` };
        } catch {
          yield { content: '', done: true, error: `Gemini API error: ${response.status} - ${errorText}` };
        }
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        yield { content: '', done: true, error: 'No response body' };
        return;
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.slice(6);
            if (jsonStr === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              const finishReason = data.candidates?.[0]?.finishReason;

              if (text) {
                yield { content: text, done: false };
              }

              // Check if this is the final chunk
              if (finishReason === 'STOP') {
                yield { content: '', done: true };
                return;
              }
            } catch (e) {
              console.warn('[AIService] Gemini parse error:', e, 'Line:', jsonStr.slice(0, 100));
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        try {
          const jsonStr = buffer.trim().slice(6);
          const data = JSON.parse(jsonStr);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            yield { content: text, done: false };
          }
        } catch { /* ignore */ }
      }

      // Report success to connection manager
      connectionManager.reportSuccess('gemini');
      yield { content: '', done: true };
    } catch (error) {
      console.error('[AIService] Gemini streaming error:', error);
      connectionManager.reportFailure('gemini', error as Error);
      yield { content: '', done: true, error: (error as Error).message };
    }
  }

  /**
   * Formater le corps de la requête pour Gemini
   */
  private formatBodyForGemini(messages: AIMessage[], _stream: boolean) {
    // Extraire le message système s'il existe
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const contents = conversationMessages.map(msg => {
      const parts = [];
      if (msg.content) parts.push({ text: msg.content });
      
      if (msg.image) {
        const matches = msg.image.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
        }
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts
      };
    });

    return {
      contents,
      systemInstruction: systemMessage ? {
        parts: [{ text: systemMessage.content }]
      } : undefined,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };
  }

  /**
   * API Locale (Ollama, LM Studio, etc.) - Non-streaming
   */
  private async sendLocal(messages: AIMessage[]): Promise<string> {
    const lmStudioURL = getLMStudioUrl();
    const ollamaURL = getOllamaUrl();
    
    const defaultBaseURL = this.config.provider === 'ollama' ? ollamaURL : lmStudioURL;
    const baseURL = this.config.baseURL || defaultBaseURL;
    const isLMStudio = this.config.provider === 'lmstudio' || baseURL.includes('1234') || baseURL.includes('lmstudio');
    
    // Delegate to optimized LM Studio service if applicable
    if (isLMStudio) {
      console.log('[AIService] Delegating to LMStudioService');
      lmStudioService.setConfig({
        baseUrl: baseURL,
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });
      return lmStudioService.chat(messages);
    }

    // Fallback for Ollama (standard fetch for now)
    const response = await fetch(`${baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model || 'llama3',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false
      })
    });

    if (!response.ok) throw new Error(`Local API Error: ${response.statusText}`);
    const data = await response.json();
    return data.message?.content || '';
  }

  /**
   * API Locale - Streaming
   */
  private async *streamLocal(messages: AIMessage[]): AsyncGenerator<AIStreamChunk> {
    const lmStudioURL = getLMStudioUrl();
    const ollamaURL = getOllamaUrl();
    
    logNetworkConfig();
    
    const defaultBaseURL = this.config.provider === 'ollama' ? ollamaURL : lmStudioURL;
    const baseURL = this.config.baseURL || defaultBaseURL;
    const isLMStudio = this.config.provider === 'lmstudio' || baseURL.includes('1234') || baseURL.includes('lmstudio');

    // Delegate to optimized LM Studio service
    if (isLMStudio) {
      console.log('[AIService] Delegating stream to LMStudioService');
      lmStudioService.setConfig({
        baseUrl: baseURL,
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });
      
      try {
        for await (const chunk of lmStudioService.chatStream(messages)) {
          yield { content: chunk.content, done: chunk.done };
        }
      } catch (e) {
        const err = e as Error;
        console.error('[AIService] Stream error:', err);
        let errorMessage = err.message;
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed')) {
          errorMessage = `Impossible de contacter LM Studio (${baseURL}). \n\n📱 MOBILE : Vérifiez l'IP dans src/config/networkConfig.ts et lisez GUIDE_CONNEXION_MOBILE.md`;
        }
        yield { content: '', done: true, error: errorMessage };
      }
      return;
    }

    // Fallback logic for Ollama (Ollama implementation remains as is, using standard fetch)
    const messagesWithSystem = messages; // Simplify for now

    try {
      const endpoint = `${baseURL}/api/chat`;
      const body = {
        model: this.config.model || 'llama3',
        messages: messagesWithSystem.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: true
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        yield { content: '', done: true, error: `Local API Error: ${response.statusText}` };
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        yield { content: '', done: true, error: 'No response body' };
        return;
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const chunks = buffer.split('\n');
        buffer = chunks.pop() || '';
        
        for (const chunk of chunks) {
          if (!chunk.trim()) continue;
          try {
            const json = JSON.parse(chunk);
            const content = json.message?.content || '';
            if (content) {
              yield { content, done: false };
            }
            if (json.done) {
              yield { content: '', done: true };
              return;
            }
          } catch { /* ignore */ }
        }
      }
    } catch (error) {
      const err = error as Error;
      yield { content: '', done: true, error: err.message };
    }
  }

  /**
   * OpenAI API - Non-streaming
   */
  private async sendOpenAI(messages: AIMessage[], _stream: boolean): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('VITE_OPENAI_API_KEY non configurée');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        messages: this.formatMessagesForOpenAI(messages),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * OpenAI API - Streaming
   */
  private async *streamOpenAI(messages: AIMessage[]): AsyncGenerator<AIStreamChunk> {
    const connectionManager = getConnectionManager();

    if (!this.config.apiKey) {
      connectionManager.reportFailure('openai', 'API key not configured');
      yield { content: '', done: true, error: 'VITE_OPENAI_API_KEY non configurée' };
      return;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model || 'gpt-4o-mini',
          messages: this.formatMessagesForOpenAI(messages),
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: true
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        connectionManager.reportFailure('openai', error.error?.message || response.statusText, response.status);
        yield { content: '', done: true, error: error.error?.message || response.statusText };
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        yield { content: '', done: true, error: 'No response body' };
        return;
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          
          const data = trimmedLine.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true };
            return;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices[0]?.delta?.content || '';
            if (content) {
              yield { content, done: false };
            }
          } catch { /* ignore */ }
        }
      }

      connectionManager.reportSuccess('openai');
      yield { content: '', done: true };
    } catch (error) {
      connectionManager.reportFailure('openai', error as Error);
      yield { content: '', done: true, error: (error as Error).message };
    }
  }

  /**
   * Anthropic (Claude) API - Non-streaming
   */
  private async sendAnthropic(messages: AIMessage[], _stream: boolean): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('VITE_ANTHROPIC_API_KEY non configurée');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: this.formatMessagesForAnthropic(messages)
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Anthropic API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  /**
   * Anthropic (Claude) API - Streaming
   */
  private async *streamAnthropic(messages: AIMessage[]): AsyncGenerator<AIStreamChunk> {
    const connectionManager = getConnectionManager();

    if (!this.config.apiKey) {
      connectionManager.reportFailure('anthropic', 'API key not configured');
      yield { content: '', done: true, error: 'VITE_ANTHROPIC_API_KEY non configurée' };
      return;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model || 'claude-3-5-sonnet-20241022',
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          messages: this.formatMessagesForAnthropic(messages),
          stream: true
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        connectionManager.reportFailure('anthropic', error.error?.message || response.statusText, response.status);
        yield { content: '', done: true, error: error.error?.message || response.statusText };
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        yield { content: '', done: true, error: 'No response body' };
        return;
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          
          const data = trimmedLine.slice(6);
          try {
            const json = JSON.parse(data);
            if (json.type === 'content_block_delta') {
              const content = json.delta?.text || '';
              if (content) {
                yield { content, done: false };
              }
            } else if (json.type === 'message_stop') {
              yield { content: '', done: true };
              return;
            }
          } catch { /* ignore */ }
        }
      }

      connectionManager.reportSuccess('anthropic');
      yield { content: '', done: true };
    } catch (error) {
      connectionManager.reportFailure('anthropic', error as Error);
      yield { content: '', done: true, error: (error as Error).message };
    }
  }

  /**
   * xAI (Grok) API - Non-streaming
   */
  private async sendXAI(messages: AIMessage[]): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('GROK_API_KEY non configurée');
    }

    const response = await fetch(`${XAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'grok-2-latest',
        messages: this.formatMessagesForOpenAI(messages),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`xAI API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * xAI (Grok) API - Streaming
   */
  private async *streamXAI(messages: AIMessage[]): AsyncGenerator<AIStreamChunk> {
    const connectionManager = getConnectionManager();

    if (!this.config.apiKey) {
      connectionManager.reportFailure('xai', 'API key not configured');
      yield { content: '', done: true, error: 'GROK_API_KEY non configurée' };
      return;
    }

    try {
      const response = await fetch(`${XAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model || 'grok-2-latest',
          messages: this.formatMessagesForOpenAI(messages),
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: true
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        connectionManager.reportFailure('xai', error.error?.message || response.statusText, response.status);
        yield { content: '', done: true, error: error.error?.message || response.statusText };
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        yield { content: '', done: true, error: 'No response body' };
        return;
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          
          const data = trimmedLine.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true };
            return;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices[0]?.delta?.content || '';
            if (content) {
              yield { content, done: false };
            }
          } catch { /* ignore */ }
        }
      }

      connectionManager.reportSuccess('xai');
      yield { content: '', done: true };
    } catch (error) {
      connectionManager.reportFailure('xai', error as Error);
      yield { content: '', done: true, error: (error as Error).message };
    }
  }

  /**
   * Formater les messages pour OpenAI (support vision)
   */
  private formatMessagesForOpenAI(messages: AIMessage[]) {
    return messages.map(msg => {
      if (msg.image) {
        return {
          role: msg.role,
          content: [
            { type: 'text', text: msg.content },
            {
              type: 'image_url',
              image_url: {
                url: msg.image.startsWith('data:') ? msg.image : `data:image/jpeg;base64,${msg.image}`
              }
            }
          ]
        };
      }
      return {
        role: msg.role,
        content: msg.content
      };
    });
  }

  /**
   * Formater les messages pour Anthropic (support vision)
   */
  private formatMessagesForAnthropic(messages: AIMessage[]) {
    return messages
      .filter(m => m.role !== 'system')
      .map(msg => {
        if (msg.image) {
          return {
            role: msg.role,
            content: [
              { type: 'text', text: msg.content },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: msg.image.startsWith('data:') ? msg.image.split(',')[1] : msg.image
                }
              }
            ]
          };
        }
        return {
          role: msg.role,
          content: msg.content
        };
      });
  }

  /**
   * Changer la configuration
   */
  updateConfig(config: Partial<AIServiceConfig>) {
    this.config = { ...this.config, ...config };

    // Si le provider change, récupérer automatiquement la clé API correspondante
    if (config.provider && !config.apiKey) {
      this.config.apiKey = this.getApiKeyForProvider(config.provider);
      console.log(`[AIService] Provider changed to ${config.provider}, API key ${this.config.apiKey ? 'found' : 'NOT FOUND'}`);
    }
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): AIServiceConfig {
    return { ...this.config };
  }
}

// Instance singleton
export const aiService = new AIService();
export default AIService;
