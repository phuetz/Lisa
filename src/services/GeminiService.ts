/**
 * Gemini Service
 * Service pour communiquer avec l'API Google Gemini (derniers modèles 2024-2025)
 * 
 * Modèles supportés:
 * - gemini-2.0-flash-exp (le plus récent, rapide)
 * - gemini-1.5-pro (le plus capable)
 * - gemini-1.5-flash (équilibré)
 * - gemini-1.5-flash-8b (léger, rapide)
 */

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
}

export interface GeminiConfig {
  apiKey: string;
  model: GeminiModel;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

export interface GeminiStreamChunk {
  content: string;
  done: boolean;
}

export type GeminiModel = 
  | 'gemini-2.0-flash-exp'      // Latest experimental (Dec 2024)
  | 'gemini-1.5-pro'            // Most capable
  | 'gemini-1.5-pro-latest'     // Latest 1.5 Pro
  | 'gemini-1.5-flash'          // Fast & efficient
  | 'gemini-1.5-flash-latest'   // Latest Flash
  | 'gemini-1.5-flash-8b'       // Lightweight
  | 'gemini-pro'                // Legacy
  | 'gemini-pro-vision';        // Legacy with vision

export interface GeminiModelInfo {
  id: GeminiModel;
  name: string;
  description: string;
  contextWindow: number;
  outputTokens: number;
  features: string[];
}

export const GEMINI_MODELS: GeminiModelInfo[] = [
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash (Experimental)',
    description: 'Le plus récent - Rapide avec capacités multimodales avancées',
    contextWindow: 1048576,
    outputTokens: 8192,
    features: ['text', 'vision', 'audio', 'code', 'function-calling', 'grounding']
  },
  {
    id: 'gemini-1.5-pro-latest',
    name: 'Gemini 1.5 Pro',
    description: 'Le plus capable - Idéal pour tâches complexes',
    contextWindow: 2097152,
    outputTokens: 8192,
    features: ['text', 'vision', 'audio', 'video', 'code', 'function-calling']
  },
  {
    id: 'gemini-1.5-flash-latest',
    name: 'Gemini 1.5 Flash',
    description: 'Rapide et efficace - Bon équilibre performance/coût',
    contextWindow: 1048576,
    outputTokens: 8192,
    features: ['text', 'vision', 'audio', 'video', 'code', 'function-calling']
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash 8B',
    description: 'Ultra léger - Pour tâches simples et rapides',
    contextWindow: 1048576,
    outputTokens: 8192,
    features: ['text', 'vision', 'code']
  }
];

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const DEFAULT_CONFIG: Partial<GeminiConfig> = {
  model: 'gemini-2.0-flash-exp',
  temperature: 0.7,
  maxOutputTokens: 8192,
  topP: 0.95,
  topK: 40
};

const SYSTEM_INSTRUCTION = `Tu es Lisa, une assistante IA intelligente, bienveillante et experte.
- Experte en programmation, technologie, science et aide générale
- Toujours polie, claire et concise
- Réponds en français par défaut, sauf si l'utilisateur parle une autre langue
- Tu peux analyser des images si on t'en envoie
- Tu peux générer du code dans n'importe quel langage`;

class GeminiService {
  private config: GeminiConfig;
  private conversationHistory: GeminiMessage[] = [];

  constructor(config?: Partial<GeminiConfig>) {
    const apiKey = config?.apiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
    this.config = { 
      ...DEFAULT_CONFIG, 
      ...config,
      apiKey 
    } as GeminiConfig;
  }

  /**
   * Check if the service is configured with an API key
   */
  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }

  /**
   * Set the API key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * Set the model
   */
  setModel(model: GeminiModel): void {
    this.config.model = model;
  }

  /**
   * Get current model
   */
  getModel(): GeminiModel {
    return this.config.model;
  }

  /**
   * Get available models
   */
  getAvailableModels(): GeminiModelInfo[] {
    return GEMINI_MODELS;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Check if API is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    
    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${this.config.model}?key=${this.config.apiKey}`,
        { method: 'GET' }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Send a chat message (non-streaming)
   */
  async chat(userMessage: string, imageBase64?: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env');
    }

    // Build user message parts
    const parts: GeminiMessage['parts'] = [{ text: userMessage }];
    
    if (imageBase64) {
      // Extract mime type and data from base64 string
      const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        parts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        });
      }
    }

    // Add to history
    this.conversationHistory.push({ role: 'user', parts });

    const requestBody = {
      contents: this.conversationHistory,
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
        topP: this.config.topP,
        topK: this.config.topK
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    const response = await fetch(
      `${GEMINI_API_BASE}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
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
    const assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'model',
      parts: [{ text: assistantMessage }]
    });

    return assistantMessage;
  }

  /**
   * Send a chat message with streaming
   */
  async *chatStream(userMessage: string, imageBase64?: string): AsyncGenerator<GeminiStreamChunk> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env');
    }

    // Build user message parts
    const parts: GeminiMessage['parts'] = [{ text: userMessage }];
    
    if (imageBase64) {
      const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        parts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        });
      }
    }

    // Add to history
    this.conversationHistory.push({ role: 'user', parts });

    const requestBody = {
      contents: this.conversationHistory,
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
        topP: this.config.topP,
        topK: this.config.topK
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    const response = await fetch(
      `${GEMINI_API_BASE}/models/${this.config.model}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`,
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

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') {
              yield { content: '', done: true };
              continue;
            }

            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                fullResponse += text;
                yield { content: text, done: false };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'model',
      parts: [{ text: fullResponse }]
    });

    yield { content: '', done: true };
  }

  /**
   * Analyze an image with a prompt
   */
  async analyzeImage(imageBase64: string, prompt: string = 'Décris cette image en détail.'): Promise<string> {
    return this.chat(prompt, imageBase64);
  }

  /**
   * Generate code
   */
  async generateCode(prompt: string, language: string = 'typescript'): Promise<string> {
    const codePrompt = `Génère du code ${language} pour: ${prompt}
    
Réponds uniquement avec le code, sans explications. Utilise des commentaires dans le code si nécessaire.`;
    
    return this.chat(codePrompt);
  }

  /**
   * Translate text
   */
  async translate(text: string, targetLanguage: string): Promise<string> {
    const translatePrompt = `Traduis le texte suivant en ${targetLanguage}. Réponds uniquement avec la traduction, sans explications.

Texte: ${text}`;
    
    return this.chat(translatePrompt);
  }

  /**
   * Summarize text
   */
  async summarize(text: string, maxLength: number = 200): Promise<string> {
    const summarizePrompt = `Résume le texte suivant en maximum ${maxLength} mots. Sois concis et garde les points essentiels.

Texte: ${text}`;
    
    return this.chat(summarizePrompt);
  }
}

// Export singleton instance
export const geminiService = new GeminiService();

// Export class for custom instances
export { GeminiService };
