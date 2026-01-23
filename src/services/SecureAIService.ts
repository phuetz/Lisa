/**
 * 🔒 Secure AI Service
 * Client pour communiquer avec le backend proxy
 * Les clés API ne sont jamais exposées côté client
 */

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: Message;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface VisionFeature {
  type: string;
  maxResults?: number;
}

interface VisionResponse {
  responses: Array<{
    faceAnnotations?: Array<unknown>;
    labelAnnotations?: Array<unknown>;
    textAnnotations?: Array<unknown>;
    error?: { code: number; message: string };
  }>;
}

interface SearchResult {
  items: Array<{
    title: string;
    link: string;
    snippet: string;
  }>;
}

export class SecureAIService {
  private baseURL: string;
  
  constructor(baseURL = '/api/proxy') {
    this.baseURL = baseURL;
  }
  
  /**
   * Appel OpenAI via proxy sécurisé
   */
  async callOpenAI(
    messages: Message[],
    model = 'gpt-4o-mini'
  ): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/openai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ messages, model })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API call failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Appel Google Vision via proxy sécurisé
   */
  async callGoogleVision(
    imageBase64: string,
    features: VisionFeature[]
  ): Promise<VisionResponse> {
    const response = await fetch(`${this.baseURL}/google/vision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        image: imageBase64,
        features
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Vision API call failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Appel Google Search via proxy sécurisé
   */
  async callGoogleSearch(
    query: string,
    maxResults = 10
  ): Promise<SearchResult> {
    const response = await fetch(`${this.baseURL}/google/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ query, maxResults })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Search API call failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Vérifier la santé du proxy
   */
  async checkHealth(): Promise<{
    status: string;
    timestamp: string;
    services: {
      openai: boolean;
      googleVision: boolean;
      googleSearch: boolean;
    };
  }> {
    const response = await fetch(`${this.baseURL}/health`);
    
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    
    return response.json();
  }
  
  /**
   * Récupérer le token d'authentification
   */
  private getAuthToken(): string {
    // Récupère le token depuis localStorage ou sessionStorage
    return localStorage.getItem('auth_token') || 
           sessionStorage.getItem('auth_token') || 
           '';
  }
}

// Instance singleton
export const secureAI = new SecureAIService();
