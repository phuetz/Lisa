/**
 * AI Service - Service unifié pour les API IA
 * Supporte OpenAI, Anthropic (Claude), Gemini, et API locales (LM Studio, Ollama)
 */

import { getLMStudioUrl, getOllamaUrl, logNetworkConfig } from '../config/networkConfig';
import { lmStudioService } from './LMStudioService';
import { useChatSettingsStore } from '../store/chatSettingsStore';

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'xai' | 'local' | 'lmstudio' | 'ollama';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  image?: string; // Base64 ou URL
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

class AIService {
  private config: AIServiceConfig;

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
  }

  /**
   * Récupérer la clé API pour un provider donné
   * Priorité: store > environment
   */
  private getApiKeyForProvider(provider: AIProvider): string | undefined {
    // Essayer d'abord le store (clés configurées par l'utilisateur)
    const store = useChatSettingsStore.getState();
    const storeKey = store.getApiKeyForProvider(provider);
    if (storeKey) return storeKey;

    // Fallback sur les variables d'environnement
    switch (provider) {
      case 'openai':
        return import.meta.env.VITE_OPENAI_API_KEY;
      case 'anthropic':
        return import.meta.env.VITE_ANTHROPIC_API_KEY;
      case 'gemini':
        return import.meta.env.VITE_GEMINI_API_KEY;
      case 'xai':
        return import.meta.env.GROK_API_KEY;
      default:
        return undefined;
    }
  }

  /**
   * Envoyer un message et recevoir une réponse complète
   */
  async sendMessage(messages: AIMessage[]): Promise<string> {
    const provider = this.config.provider;
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
   */
  async *streamMessage(messages: AIMessage[]): AsyncGenerator<AIStreamChunk> {
    const provider = this.config.provider;
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
    if (!this.config.apiKey) {
      yield { content: '', done: true, error: 'VITE_GEMINI_API_KEY non configurée' };
      return;
    }

    const requestBody = this.formatBodyForGemini(messages, true);

    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${this.config.model || 'gemini-1.5-flash'}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        yield { content: '', done: true, error: error.error?.message || `Gemini API error: ${response.status}` };
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        yield { content: '', done: true, error: 'No response body' };
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                yield { content: text, done: false };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      yield { content: '', done: true };
    } catch (error) {
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
    if (!this.config.apiKey) {
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

      yield { content: '', done: true };
    } catch (error) {
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
    if (!this.config.apiKey) {
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

      yield { content: '', done: true };
    } catch (error) {
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
    if (!this.config.apiKey) {
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

      yield { content: '', done: true };
    } catch (error) {
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
