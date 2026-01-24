/**
 * useAIChat Hook
 * Hook pour gérer les conversations avec l'IA
 */

import { useState, useCallback, useRef } from 'react';
import { aiService, type AIMessage, type AIProvider } from '../services/aiService';
import { useChatHistoryStore } from '../store/chatHistoryStore';
import { useChatSettingsStore } from '../store/chatSettingsStore';
import { ragService } from '../services/RAGService';
import type { Message } from '../types/chat';

export type StreamingStage = 'idle' | 'thinking' | 'searching' | 'generating' | 'complete';

export interface UseAIChatOptions {
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  onError?: (error: Error) => void;
  enableRAG?: boolean;
}

export const useAIChat = (conversationId: string, options: UseAIChatOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStage, setStreamingStage] = useState<StreamingStage>('idle');
  const [ragContext, setRagContext] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { addMessage, updateMessage, getCurrentConversation } = useChatHistoryStore();
  const { ragEnabled, ragProvider, ragSimilarityThreshold, ragMaxResults } = useChatSettingsStore();

  /**
   * Envoyer un message avec streaming
   */
  const sendMessage = useCallback(async (
    content: string,
    image?: string
  ): Promise<void> => {
    if (isLoading || isStreaming) return;

    setIsLoading(true);
    setIsStreaming(true);

    // Créer AbortController pour annulation
    abortControllerRef.current = new AbortController();

    try {
      // Ajouter le message utilisateur
      addMessage({
        conversationId,
        role: 'user',
        content,
        ...(image && { image })
      });

      // Stage: Thinking
      setStreamingStage('thinking');

      // Préparer le contexte pour l'IA
      const conversation = getCurrentConversation();
      const messages: AIMessage[] = [];

      // RAG: Augment context if enabled
      let ragContextString = '';
      const shouldUseRAG = options.enableRAG !== false && ragEnabled;

      if (shouldUseRAG) {
        setStreamingStage('searching');
        try {
          // Update RAG service config
          ragService.updateConfig({
            enabled: true,
            provider: ragProvider,
            similarityThreshold: ragSimilarityThreshold,
            maxResults: ragMaxResults
          });

          const augmented = await ragService.augmentContext(content);
          if (augmented.context && augmented.relevantMemories.length > 0) {
            ragContextString = augmented.context;
            setRagContext(ragContextString);
          }
        } catch (ragError) {
          console.warn('RAG augmentation failed, continuing without context:', ragError);
        }
      }

      // Stage: Generating
      setStreamingStage('generating');

      // Ajouter system prompt avec contexte RAG si disponible
      let systemContent = options.systemPrompt || '';
      if (ragContextString) {
        systemContent = systemContent
          ? `${systemContent}\n\n---\n${ragContextString}`
          : ragContextString;
      }

      if (systemContent) {
        messages.push({
          role: 'system',
          content: systemContent
        });
      }

      // Ajouter les messages de l'historique (limiter à 10 derniers pour contexte)
      const history = conversation?.messages.slice(-10) || [];
      for (const msg of history) {
        messages.push({
          role: msg.role,
          content: msg.content,
          ...(msg.image && { image: msg.image })
        });
      }

      // Configurer le service IA
      if (options.provider) {
        aiService.updateConfig({
          provider: options.provider,
          model: options.model,
          temperature: options.temperature
        });
      }

      // Créer un message assistant vide pour le streaming
      addMessage({
        conversationId,
        role: 'assistant',
        content: ''
      });

      // Récupérer l'ID du dernier message ajouté
      const updatedConv = getCurrentConversation();
      const assistantMessageId = updatedConv?.messages[updatedConv.messages.length - 1]?.id || '';

      // Stream la réponse
      let fullContent = '';
      for await (const chunk of aiService.streamMessage(messages)) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        if (chunk.error) {
          throw new Error(chunk.error);
        }

        if (chunk.content) {
          fullContent += chunk.content;
          
          // Mettre à jour le message avec le contenu accumulé
          updateMessage(assistantMessageId, fullContent);
        }

        if (chunk.done) {
          break;
        }
      }

      // Finaliser le message
      updateMessage(assistantMessageId, fullContent);
      setStreamingStage('complete');

    } catch (error) {
      console.error('Error sending message:', error);

      // Ajouter un message d'erreur
      addMessage({
        conversationId,
        role: 'assistant',
        content: `Erreur: ${(error as Error).message}`
      });

      if (options.onError) {
        options.onError(error as Error);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingStage('idle');
      setRagContext(null);
      abortControllerRef.current = null;
    }
  }, [conversationId, isLoading, isStreaming, options, addMessage, updateMessage, getCurrentConversation, ragEnabled, ragProvider, ragSimilarityThreshold, ragMaxResults]);

  /**
   * Annuler la génération en cours
   */
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, []);

  /**
   * Régénérer la dernière réponse
   */
  const regenerateLastResponse = useCallback(async () => {
    const conversation = getCurrentConversation();
    if (!conversation || conversation.messages.length < 2) return;

    // Trouver le dernier message utilisateur
    const messages = [...conversation.messages].reverse();
    const lastUserMessage = messages.find((m: Message) => m.role === 'user');
    
    if (lastUserMessage) {
      // Supprimer les messages après le dernier message utilisateur
      const userMessageIndex = conversation.messages.findIndex(m => m.id === lastUserMessage.id);
      const messagesToKeep = conversation.messages.slice(0, userMessageIndex + 1);
      
      // Mettre à jour la conversation
      useChatHistoryStore.setState(state => ({
        conversations: state.conversations.map(conv =>
          conv.id === conversation.id
            ? { ...conv, messages: messagesToKeep }
            : conv
        )
      }));

      // Renvoyer le message
      await sendMessage(lastUserMessage.content, lastUserMessage.image);
    }
  }, [getCurrentConversation, sendMessage]);

  return {
    sendMessage,
    cancelGeneration,
    regenerateLastResponse,
    isLoading,
    isStreaming,
    streamingStage,
    ragContext
  };
};

export default useAIChat;
