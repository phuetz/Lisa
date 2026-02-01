/**
 * useAIChatWithTools Hook
 *
 * Hook pour gérer les conversations avec l'IA avec support natif des tools.
 * Le LLM décide automatiquement quand utiliser les outils (recherche web, fetch URL, etc.)
 *
 * Ce hook est une alternative à useAIChat qui utilise le tool calling natif
 * au lieu du système Gateway/Skills.
 */

import { useState, useCallback, useRef } from 'react';
import { aiWithToolsService, type ToolUsageInfo } from '../services/AIWithToolsService';
import { aiService, type AIMessage, type AIProvider } from '../services/aiService';
import { useChatHistoryStore } from '../store/chatHistoryStore';
import { useChatSettingsStore, DEFAULT_MODELS } from '../store/chatSettingsStore';
import { ragService } from '../services/RAGService';
import type { Message } from '../types/chat';

// ============================================================================
// Types
// ============================================================================

export type StreamingStage = 'idle' | 'thinking' | 'tools' | 'generating' | 'complete';

export interface UseAIChatWithToolsOptions {
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  onError?: (error: Error) => void;
  enableRAG?: boolean;
  enableTools?: boolean;
  showToolUsage?: boolean;
  maxToolIterations?: number;
}

export interface UseAIChatWithToolsReturn {
  sendMessage: (content: string, image?: string) => Promise<void>;
  cancelGeneration: () => void;
  regenerateLastResponse: () => Promise<void>;
  isLoading: boolean;
  isStreaming: boolean;
  streamingStage: StreamingStage;
  toolsUsed: ToolUsageInfo[];
  ragContext: string | null;
  clearToolsUsed: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export const useAIChatWithTools = (
  conversationId?: string,
  options: UseAIChatWithToolsOptions = {}
): UseAIChatWithToolsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStage, setStreamingStage] = useState<StreamingStage>('idle');
  const [toolsUsed, setToolsUsed] = useState<ToolUsageInfo[]>([]);
  const [ragContext, setRagContext] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { addMessage, updateMessage, getCurrentConversation, currentConversationId } = useChatHistoryStore();
  const { ragEnabled, ragProvider, ragSimilarityThreshold, ragMaxResults, selectedModelId, temperature, maxTokens } = useChatSettingsStore();

  // Resolve conversation ID
  const resolvedConversationId = conversationId || currentConversationId || '';

  // Get current model config
  const currentModel = DEFAULT_MODELS.find(m => m.id === selectedModelId) || DEFAULT_MODELS[0];

  /**
   * Send message with tool support
   */
  const sendMessage = useCallback(async (
    content: string,
    image?: string
  ): Promise<void> => {
    if (isLoading || isStreaming) return;

    setIsLoading(true);
    setIsStreaming(true);
    setToolsUsed([]);

    abortControllerRef.current = new AbortController();

    try {
      // Add user message
      addMessage({
        conversationId: resolvedConversationId,
        role: 'user',
        content,
        ...(image && { image })
      });

      setStreamingStage('thinking');

      // Prepare messages
      const conversation = getCurrentConversation();
      const messages: AIMessage[] = [];

      // Build system prompt
      let systemContent = options.systemPrompt || `Tu es Lisa, une assistante IA intelligente et serviable.
Tu peux utiliser des outils pour rechercher des informations sur le web quand nécessaire.
Réponds toujours en français de manière naturelle et utile.
Aujourd'hui nous sommes le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

      // RAG context
      const shouldUseRAG = options.enableRAG !== false && ragEnabled;
      if (shouldUseRAG) {
        try {
          ragService.updateConfig({
            enabled: true,
            provider: ragProvider,
            similarityThreshold: ragSimilarityThreshold,
            maxResults: ragMaxResults
          });

          const augmented = await ragService.augmentContext(content);
          if (augmented.context && augmented.relevantMemories.length > 0) {
            setRagContext(augmented.context);
            systemContent += `\n\n---\nContexte mémorisé:\n${augmented.context}`;
          }
        } catch (ragError) {
          console.warn('[useAIChatWithTools] RAG failed:', ragError);
        }
      }

      messages.push({ role: 'system', content: systemContent });

      // Add history (last 10 messages)
      const history = conversation?.messages.slice(-10) || [];
      for (const msg of history) {
        messages.push({
          role: msg.role,
          content: msg.content,
          ...(msg.image && { image: msg.image })
        });
      }

      // Configure AI service
      aiService.updateConfig({
        provider: options.provider || currentModel.provider as AIProvider,
        model: options.model || currentModel.id,
        temperature: options.temperature || temperature,
        maxTokens: maxTokens
      });

      // Configure tools service
      aiWithToolsService.setConfig({
        enableTools: options.enableTools !== false,
        showToolUsage: options.showToolUsage !== false,
        maxIterations: options.maxToolIterations || 5
      });

      // Create empty assistant message for streaming
      addMessage({
        conversationId: resolvedConversationId,
        role: 'assistant',
        content: ''
      });

      const updatedConv = getCurrentConversation();
      const assistantMessageId = updatedConv?.messages[updatedConv.messages.length - 1]?.id || '';

      // Stream response with tools
      let fullContent = '';
      const allToolsUsed: ToolUsageInfo[] = [];

      for await (const chunk of aiWithToolsService.streamMessage(messages)) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        if (chunk.error) {
          throw new Error(chunk.error);
        }

        // Track tool usage
        if (chunk.toolUsage) {
          allToolsUsed.push(chunk.toolUsage);
          setToolsUsed([...allToolsUsed]);
          setStreamingStage('tools');
        }

        if (chunk.content) {
          fullContent += chunk.content;
          updateMessage(assistantMessageId, fullContent);

          if (!chunk.toolUsage) {
            setStreamingStage('generating');
          }
        }

        if (chunk.done) {
          break;
        }
      }

      // Finalize
      updateMessage(assistantMessageId, fullContent);
      setStreamingStage('complete');

    } catch (error) {
      console.error('[useAIChatWithTools] Error:', error);

      addMessage({
        conversationId: resolvedConversationId,
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
  }, [
    resolvedConversationId, isLoading, isStreaming, options,
    addMessage, updateMessage, getCurrentConversation,
    ragEnabled, ragProvider, ragSimilarityThreshold, ragMaxResults,
    currentModel, temperature, maxTokens
  ]);

  /**
   * Cancel current generation
   */
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingStage('idle');
    }
  }, []);

  /**
   * Regenerate last response
   */
  const regenerateLastResponse = useCallback(async () => {
    const conversation = getCurrentConversation();
    if (!conversation || conversation.messages.length < 2) return;

    const messages = [...conversation.messages].reverse();
    const lastUserMessage = messages.find((m: Message) => m.role === 'user');

    if (lastUserMessage) {
      const userMessageIndex = conversation.messages.findIndex(m => m.id === lastUserMessage.id);
      const messagesToKeep = conversation.messages.slice(0, userMessageIndex + 1);

      useChatHistoryStore.setState(state => ({
        conversations: state.conversations.map(conv =>
          conv.id === conversation.id
            ? { ...conv, messages: messagesToKeep }
            : conv
        )
      }));

      await sendMessage(lastUserMessage.content, lastUserMessage.image);
    }
  }, [getCurrentConversation, sendMessage]);

  /**
   * Clear tools used
   */
  const clearToolsUsed = useCallback(() => {
    setToolsUsed([]);
  }, []);

  return {
    sendMessage,
    cancelGeneration,
    regenerateLastResponse,
    isLoading,
    isStreaming,
    streamingStage,
    toolsUsed,
    ragContext,
    clearToolsUsed
  };
};

export default useAIChatWithTools;
