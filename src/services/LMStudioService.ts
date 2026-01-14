import { Capacitor, CapacitorHttp, HttpResponse } from '@capacitor/core';
import { getLMStudioUrl } from '../config/networkConfig';

/**
 * LM Studio Service
 * Service pour communiquer avec LM Studio (API compatible OpenAI)
 * Modèle: mistralai/devstral-small-2-2512
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LMStudioConfig {
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

// Try multiple URLs in order of preference
// Use networkConfig first, then Vite proxy, then env variable, then direct URLs
const LM_STUDIO_URLS = [
  getLMStudioUrl(), // Primary choice based on platform detection
  '/lmstudio/v1',  // Vite proxy (recommended for dev)
  import.meta.env.VITE_LM_STUDIO_URL || 'http://localhost:1234/v1', // Environment variable or hardcoded fallback
  'http://10.0.2.2:1234/v1', // Android Emulator host access
  'http://127.0.0.1:1234/v1',
  'http://10.5.0.2:1234/v1',
];

const DEFAULT_CONFIG: LMStudioConfig = {
  baseUrl: LM_STUDIO_URLS[0],
  model: 'mistralai/devstral-small-2-2512',
  temperature: 0.7,
  maxTokens: 4096,
};

const SYSTEM_PROMPT = `Tu es Lisa, une assistante IA intelligente et bienveillante. Réponds en français.

## RÈGLE OBLIGATOIRE POUR LES GRAPHIQUES
Si l'utilisateur demande: "trace", "courbe", "graphique", "PIB", "évolution", "visualise", "chart", tu DOIS IMMÉDIATEMENT répondre avec ce format EXACT (pas de texte avant):

\`\`\`chart
{"type":"line","title":"Titre","data":[{"x":"2020","y":100},{"x":"2021","y":110}],"xKey":"x","yKey":"y"}
\`\`\`

Exemple pour "PIB de la France":
\`\`\`chart
{"type":"line","title":"PIB France (milliards €)","data":[{"annee":"2018","pib":2353},{"annee":"2019","pib":2426},{"annee":"2020","pib":2303},{"annee":"2021","pib":2501},{"annee":"2022","pib":2639},{"annee":"2023","pib":2803}],"xKey":"annee","yKey":"pib"}
\`\`\`

NE JAMAIS dire "je ne peux pas tracer" ou "je n'ai pas accès". TOUJOURS générer le bloc chart avec des données réalistes.`;

class LMStudioService {
  private config: LMStudioConfig;

  constructor(config: Partial<LMStudioConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Helper to make HTTP requests using either fetch (Web) or CapacitorHttp (Native)
   */
  private async makeRequest(endpoint: string, options: any): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const isNative = Capacitor.isNativePlatform();
    
    console.log(`[LMStudioService] Requesting ${url} (${isNative ? 'Native' : 'Web'})`);

    try {
      if (isNative) {
        // Use CapacitorHttp for native devices to bypass CORS
        const response: HttpResponse = await CapacitorHttp.request({
          method: options.method,
          url: url,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
          },
          data: options.body ? JSON.parse(options.body) : undefined,
          readTimeout: 30000, // 30s timeout
          connectTimeout: 15000,
        });

        if (response.status < 200 || response.status >= 300) {
          throw new Error(`LM Studio error (Native): ${response.status} ${JSON.stringify(response.data)}`);
        }
        
        return response.data;
      } else {
        // Use standard fetch for Web
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`LM Studio error (Web): ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      }
    } catch (error) {
      console.error(`[LMStudioService] Request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Filtre les messages pour garantir l'alternance user/assistant
   * Mistral exige: system (optionnel), puis alternance stricte user/assistant
   */
  private sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
    const result: ChatMessage[] = [];
    let lastRole: string | null = null;

    for (const msg of messages) {
      // Skip empty messages
      if (!msg.content || msg.content.trim() === '') continue;
      
      // Skip consecutive messages with same role (merge or skip)
      if (msg.role === lastRole && msg.role !== 'system') {
        // Merge with previous message
        if (result.length > 0) {
          result[result.length - 1].content += '\n' + msg.content;
        }
        continue;
      }

      result.push({ ...msg });
      lastRole = msg.role;
    }

    // Ensure conversation starts with user after system
    const firstNonSystem = result.findIndex(m => m.role !== 'system');
    if (firstNonSystem !== -1 && result[firstNonSystem].role === 'assistant') {
      // Remove leading assistant messages
      result.splice(firstNonSystem, 1);
    }

    return result;
  }

  /**
   * Envoie un message et reçoit une réponse complète
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    const sanitized = this.sanitizeMessages(messages);
    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...sanitized,
    ];
    
    console.log('[LMStudioService] Sending', messagesWithSystem.length, 'messages');

    try {
      const data = await this.makeRequest('/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: this.config.model,
          messages: messagesWithSystem,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: false,
        }),
      });

      return data.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    } catch (error) {
      console.error('[LMStudioService] Chat Error:', error);
      throw error;
    }
  }

  /**
   * Envoie un message et reçoit une réponse en streaming
   * NOTE: Streaming is not fully supported on CapacitorHttp native plugin yet.
   * Fallback to standard fetch on native, but if that fails (CORS), we might need to fallback to non-streaming.
   */
  async *chatStream(messages: ChatMessage[]): AsyncGenerator<StreamChunk> {
    const isNative = Capacitor.isNativePlatform();
    
    // If native, we can't easily stream with CapacitorHttp.
    // We try fetch first (requires correct IP/CORS), if it fails, we fallback to non-streaming chat using CapacitorHttp.
    
    const sanitized = this.sanitizeMessages(messages);
    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...sanitized,
    ];

    console.log('[LMStudioService] chatStream starting');

    try {
      // Attempt streaming via Fetch
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messagesWithSystem,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          yield { content: '', done: true };
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                yield { content, done: false };
              }
            } catch {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('[LMStudioService] Stream error:', error);
      
      if (isNative) {
        console.warn('[LMStudioService] Streaming failed on native, falling back to non-streaming via CapacitorHttp');
        // Fallback to non-streaming request using CapacitorHttp (bypasses CORS)
        try {
          const content = await this.chat(messages);
          // Yield the whole content as one chunk
          yield { content, done: false };
          yield { content: '', done: true };
        } catch (fallbackError) {
          console.error('[LMStudioService] Fallback error:', fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Vérifie si LM Studio est accessible et trouve l'URL qui fonctionne
   */
  async isAvailable(): Promise<boolean> {
    // Refresh URLs list with potentially updated config
    const currentUrls = [
       this.config.baseUrl, // Current config first
       getLMStudioUrl(),    // Network config second
       ...LM_STUDIO_URLS.filter(u => u !== this.config.baseUrl && u !== getLMStudioUrl())
    ];

    for (const url of currentUrls) {
      try {
        console.log(`[LMStudioService] Testing availability of ${url}...`);
        
        // Use makeRequest logic but simplified for health check
        const isNative = Capacitor.isNativePlatform();
        let ok = false;

        if (isNative) {
             const response = await CapacitorHttp.get({
                 url: `${url}/models`,
                 connectTimeout: 2000,
                 readTimeout: 2000
             });
             ok = response.status >= 200 && response.status < 300;
        } else {
             const response = await fetch(`${url}/models`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000),
             });
             ok = response.ok;
        }

        if (ok) {
          console.log(`[LMStudioService] ✅ Connected to ${url}`);
          this.config.baseUrl = url;
          return true;
        }
      } catch (error) {
        console.log(`[LMStudioService] ❌ ${url}:`, error instanceof Error ? error.message : error);
      }
    }
    console.error('[LMStudioService] Could not connect to any LM Studio URL.');
    return false;
  }

  /**
   * Récupère la liste des modèles disponibles
   */
  async getModels(): Promise<string[]> {
    try {
      const data = await this.makeRequest('/models', { method: 'GET' });
      return data.data?.map((m: { id: string }) => m.id) || [];
    } catch {
      return [];
    }
  }

  /**
   * Met à jour la configuration
   */
  setConfig(config: Partial<LMStudioConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LMStudioConfig {
    return { ...this.config };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    latencyMs: number;
    model: string | null;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const data = await this.makeRequest('/models', { method: 'GET' });
      const latencyMs = Date.now() - startTime;
      
      const models = data.data?.map((m: { id: string }) => m.id) || [];
      const currentModel = models.find((m: string) => m.includes('devstral') || m.includes('mistral')) || models[0] || null;
      
      return {
        status: latencyMs < 1000 ? 'healthy' : 'degraded',
        latencyMs,
        model: currentModel,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        model: null,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Vérifie si le service est prêt
   */
  async isReady(): Promise<boolean> {
    const health = await this.healthCheck();
    return health.status !== 'unhealthy';
  }
}

// Export singleton instance
export const lmStudioService = new LMStudioService();
export default LMStudioService;
