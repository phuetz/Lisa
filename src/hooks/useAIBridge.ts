/**
 * useAIBridge - Hook React pour l'intégration du pont Lisa ↔ ChatGPT ↔ Claude
 * 
 * Permet d'utiliser le bridge AI depuis les composants React.
 */

import { useState, useCallback, useRef } from 'react';

// Types
export interface BridgeMessage {
  id: string;
  source: 'lisa' | 'chatgpt' | 'claude' | 'user';
  content: string;
  toolsUsed?: string[];
  timestamp: string;
}

export interface BridgeSession {
  id: string;
  participants: Array<'lisa' | 'chatgpt' | 'claude'>;
  messageCount: number;
  createdAt: string;
}

export interface UseBridgeOptions {
  baseUrl?: string;
  apiKey?: string;
  defaultTarget?: 'lisa' | 'chatgpt' | 'claude';
  autoCreateSession?: boolean;
}

export interface BridgeState {
  session: BridgeSession | null;
  messages: BridgeMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
}

const DEFAULT_BASE_URL = '/api/bridge';

export function useAIBridge(options: UseBridgeOptions = {}) {
  const {
    baseUrl = DEFAULT_BASE_URL,
    apiKey,
    defaultTarget = 'lisa',
    autoCreateSession = true
  } = options;

  const [state, setState] = useState<BridgeState>({
    session: null,
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Headers pour les requêtes
  const getHeaders = useCallback((): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['X-Lisa-API-Key'] = apiKey;
    }
    return headers;
  }, [apiKey]);

  // Créer une session
  const createSession = useCallback(async (
    participants: Array<'lisa' | 'chatgpt' | 'claude'> = ['lisa']
  ): Promise<BridgeSession> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${baseUrl}/session`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ participants })
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const data = await response.json();
      const session = data.session as BridgeSession;

      setState(prev => ({
        ...prev,
        session,
        isLoading: false
      }));

      return session;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [baseUrl, getHeaders]);

  // Envoyer un message
  const sendMessage = useCallback(async (
    message: string,
    target: 'lisa' | 'chatgpt' | 'claude' = defaultTarget
  ): Promise<BridgeMessage> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Créer une session si nécessaire
      let sessionId = state.session?.id;
      if (!sessionId && autoCreateSession) {
        const newSession = await createSession([target]);
        sessionId = newSession.id;
      }

      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          message,
          sessionId,
          target
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();

      // Ajouter le message utilisateur
      const userMessage: BridgeMessage = {
        id: crypto.randomUUID(),
        source: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      // Ajouter la réponse
      const assistantMessage: BridgeMessage = {
        id: crypto.randomUUID(),
        source: target,
        content: data.response,
        toolsUsed: data.toolsUsed,
        timestamp: data.metadata?.timestamp || new Date().toISOString()
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage, assistantMessage],
        isLoading: false
      }));

      return assistantMessage;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [state.session, baseUrl, getHeaders, defaultTarget, autoCreateSession, createSession]);

  // Envoyer un message en streaming
  const streamMessage = useCallback(async (
    message: string,
    target: 'lisa' | 'chatgpt' | 'claude' = defaultTarget,
    onChunk?: (content: string) => void
  ): Promise<string> => {
    setState(prev => ({ ...prev, isStreaming: true, error: null }));

    // Annuler le stream précédent si en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Créer une session si nécessaire
      let sessionId = state.session?.id;
      if (!sessionId && autoCreateSession) {
        const newSession = await createSession([target]);
        sessionId = newSession.id;
      }

      const response = await fetch(`${baseUrl}/chat/stream`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          message,
          sessionId,
          target
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to stream message: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  onChunk?.(parsed.content);
                }
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch {
                // Ignorer les erreurs de parsing
              }
            }
          }
        }
      }

      // Ajouter les messages
      const userMessage: BridgeMessage = {
        id: crypto.randomUUID(),
        source: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      const assistantMessage: BridgeMessage = {
        id: crypto.randomUUID(),
        source: target,
        content: fullContent,
        timestamp: new Date().toISOString()
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage, assistantMessage],
        isStreaming: false
      }));

      return fullContent;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setState(prev => ({ ...prev, isStreaming: false }));
        return '';
      }
      const errorMessage = (error as Error).message;
      setState(prev => ({ ...prev, isStreaming: false, error: errorMessage }));
      throw error;
    }
  }, [state.session, baseUrl, getHeaders, defaultTarget, autoCreateSession, createSession]);

  // Annuler le streaming
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  // Invoquer un outil directement
  const invokeTool = useCallback(async (
    tool: string,
    args: Record<string, unknown> = {}
  ): Promise<unknown> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${baseUrl}/invoke`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ tool, arguments: args })
      });

      if (!response.ok) {
        throw new Error(`Failed to invoke tool: ${response.statusText}`);
      }

      const data = await response.json();
      setState(prev => ({ ...prev, isLoading: false }));

      return data.result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [baseUrl, getHeaders]);

  // Obtenir les outils disponibles
  const getTools = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/tools`, {
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get tools: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [baseUrl, getHeaders]);

  // Obtenir le schema OpenAPI
  const getOpenAPISchema = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/openapi.json`, {
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get OpenAPI schema: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = (error as Error).message;
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [baseUrl, getHeaders]);

  // Effacer les messages
  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }));
  }, []);

  // Effacer l'erreur
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Changer de cible par défaut
  const setDefaultTarget = useCallback((target: 'lisa' | 'chatgpt' | 'claude') => {
    // Créer une nouvelle session avec la nouvelle cible
    createSession([target]);
  }, [createSession]);

  return {
    // État
    session: state.session,
    messages: state.messages,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    error: state.error,

    // Actions
    createSession,
    sendMessage,
    streamMessage,
    cancelStream,
    invokeTool,
    getTools,
    getOpenAPISchema,
    clearMessages,
    clearError,
    setDefaultTarget
  };
}

export default useAIBridge;
