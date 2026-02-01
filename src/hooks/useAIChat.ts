/**
 * useAIChat Hook
 * Hook pour gérer les conversations avec l'IA
 * Intégration OpenClaw-inspired avec Gateway Skills
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { aiService, type AIMessage, type AIProvider } from '../services/aiService';
import { aiWithToolsService, type ToolUsageInfo } from '../services/AIWithToolsService';
import { useChatHistoryStore } from '../store/chatHistoryStore';
import { useChatSettingsStore, DEFAULT_MODELS } from '../store/chatSettingsStore';
import { ragService } from '../services/RAGService';
import { buildSystemPrompt, getAvailableToolsList } from '../gateway/buildSystemPrompt';
import { getSkillExecutor } from '../gateway/SkillExecutor';
import { getSkillsManager } from '../gateway/SkillsManager';
import { useSessionCompaction } from './useSessionCompaction';
import type { Message } from '../types/chat';

/**
 * Detect if user message requires a web search
 */
function detectSearchIntent(message: string): { needsSearch: boolean; query: string } {
  const lowerMessage = message.toLowerCase();

  // Patterns that indicate search intent
  const searchPatterns = [
    /(?:cherche|recherche|trouve|trouver)\s+(?:moi\s+)?(.+)/i,
    /(?:quels?|quelles?)\s+(?:sont\s+)?(?:les?\s+)?(.+)/i,
    /(?:où|ou)\s+(?:puis-je\s+)?(?:trouver|avoir)\s+(.+)/i,
    /(?:donne|donne-moi|donnez)\s+(?:moi\s+)?(?:les?\s+)?(?:coordonnées?|adresses?|contacts?|infos?|informations?)\s+(.+)/i,
    /(?:liste|lister)\s+(?:des?\s+|les?\s+)?(.+)/i,
    /(?:adresses?|coordonnées?|contacts?)\s+(?:de\s+|des?\s+|d')?(.+)/i,
  ];

  // Keywords that strongly suggest search
  const searchKeywords = [
    'architectes', 'médecins', 'avocats', 'restaurants', 'hôtels', 'magasins',
    'entreprises', 'sociétés', 'agences', 'cabinets', 'coordonnées', 'adresses',
    'trouver', 'chercher', 'rechercher', 'liste de', 'où sont'
  ];

  // Check patterns
  for (const pattern of searchPatterns) {
    const match = message.match(pattern);
    if (match) {
      return { needsSearch: true, query: match[1] || message };
    }
  }

  // Check keywords
  const hasSearchKeyword = searchKeywords.some(kw => lowerMessage.includes(kw));
  if (hasSearchKeyword && (lowerMessage.includes('ile de france') || lowerMessage.includes('île-de-france') || lowerMessage.includes('paris') || lowerMessage.includes('région'))) {
    return { needsSearch: true, query: message };
  }

  return { needsSearch: false, query: '' };
}

export type StreamingStage = 'idle' | 'thinking' | 'searching' | 'tools' | 'generating' | 'complete';

export interface UseAIChatOptions {
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  onError?: (error: Error) => void;
  enableRAG?: boolean;
  enableGatewaySkills?: boolean; // Enable OpenClaw-inspired tools
  enableSessionCompaction?: boolean; // Enable OpenClaw-inspired context compaction
  /** Enable native LLM tool calling (web_search, fetch_url, etc.) - OpenClaw-inspired */
  enableNativeTools?: boolean;
  /** Show tool usage indicators in streaming */
  showToolUsage?: boolean;
  /** Maximum tool call iterations (default: 5) */
  maxToolIterations?: number;
}

export const useAIChat = (conversationId?: string, options: UseAIChatOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStage, setStreamingStage] = useState<StreamingStage>('idle');
  const [ragContext, setRagContext] = useState<string | null>(null);
  const [toolsUsed, setToolsUsed] = useState<ToolUsageInfo[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { addMessage, updateMessage, getCurrentConversation, currentConversationId } = useChatHistoryStore();
  const { ragEnabled, ragProvider, ragSimilarityThreshold, ragMaxResults, selectedModelId, temperature, maxTokens } = useChatSettingsStore();

  // Resolve conversation ID - use provided or current
  const resolvedConversationId = conversationId || currentConversationId || '';

  // Get current model config from settings
  const currentModel = DEFAULT_MODELS.find(m => m.id === selectedModelId) || DEFAULT_MODELS[0];

  // Session compaction for long conversations (OpenClaw-inspired)
  const enableCompaction = options.enableSessionCompaction !== false;
  const {
    status: compactionStatus,
    needsCompaction,
    summary: compactedSummary,
    facts: extractedFacts,
    getOptimizedContext,
    compact: triggerCompaction
  } = useSessionCompaction({
    autoCompact: enableCompaction,
    onCompactionComplete: (result) => {
      console.log('[useAIChat] Session compacted, saved', result.compactionMeta.totalTokensSaved, 'tokens');
    }
  });

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
        conversationId: resolvedConversationId,
        role: 'user',
        content,
        ...(image && { image })
      });

      // Stage: Thinking
      setStreamingStage('thinking');

      // Préparer le contexte pour l'IA
      const conversation = getCurrentConversation();
      const messages: AIMessage[] = [];

      // Auto-detect search intent and execute web search if needed
      let webSearchContext = '';
      const enableSkills = options.enableGatewaySkills !== false;

      if (enableSkills) {
        const searchIntent = detectSearchIntent(content);
        if (searchIntent.needsSearch) {
          setStreamingStage('searching');
          console.log('[useAIChat] Detected search intent:', searchIntent.query);

          try {
            const skillExecutor = getSkillExecutor();
            const skillsManager = getSkillsManager();

            // Grant network permission for search
            skillExecutor.grantPermission('network_access');

            // Get the web-search skill
            const webSearchSkill = skillsManager.getSkill('web-search');

            if (webSearchSkill) {
              const searchResult = await skillExecutor.execute(
                webSearchSkill,
                'search_web',
                { query: searchIntent.query }
              );

              if (searchResult.success && searchResult.data) {
                const data = searchResult.data as { results: Array<{ title: string; url: string; snippet: string }> };
                if (data.results && data.results.length > 0) {
                  webSearchContext = `\n\n## Résultats de recherche web pour "${searchIntent.query}":\n\n`;
                  data.results.forEach((r, i) => {
                    webSearchContext += `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}\n\n`;
                  });
                  console.log('[useAIChat] Web search returned', data.results.length, 'results');
                }
              }
            }
          } catch (searchError) {
            console.warn('[useAIChat] Web search failed:', searchError);
          }
        }
      }

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

      // Build system prompt
      let systemContent = '';
      const useNativeTools = options.enableNativeTools === true;

      if (useNativeTools) {
        // System prompt optimized for native tool calling
        systemContent = `Tu es Lisa, une assistante IA intelligente et serviable.

IMPORTANT - CAPACITÉS DE RECHERCHE WEB:
Tu as accès à des outils de recherche web que tu DOIS utiliser pour:
- Les programmes TV, films, séries en cours de diffusion
- Les actualités et événements récents
- Les informations qui changent fréquemment (météo, horaires, prix, etc.)
- Tout ce qui nécessite des données à jour

Quand l'utilisateur pose une question sur des informations actuelles ou récentes, utilise TOUJOURS l'outil web_search pour trouver la réponse.

Outils disponibles:
- web_search: Recherche sur le web (utilise-le pour programme TV, actualités, etc.)
- fetch_url: Récupère le contenu d'une page web spécifique
- get_current_datetime: Obtient la date et l'heure actuelles

Réponds toujours en français de manière naturelle et utile.
Aujourd'hui nous sommes le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

${options.systemPrompt || ''}`;
      } else if (enableSkills) {
        // Build enhanced system prompt with available tools
        systemContent = buildSystemPrompt({
          enableWebSearch: true,
          enableCodeInterpreter: true,
          enableMemory: true,
          language: 'fr',
          customInstructions: options.systemPrompt
        });
      } else {
        systemContent = options.systemPrompt || '';
      }

      // Add web search results if available
      if (webSearchContext) {
        systemContent = systemContent
          ? `${systemContent}\n\n---\n${webSearchContext}`
          : webSearchContext;
      }

      // Add RAG context if available
      if (ragContextString) {
        systemContent = systemContent
          ? `${systemContent}\n\n---\nContexte mémorisé:\n${ragContextString}`
          : ragContextString;
      }

      if (systemContent) {
        messages.push({
          role: 'system',
          content: systemContent
        });
      }

      // Use optimized context if compaction is enabled and session has been compacted
      if (enableCompaction && compactedSummary) {
        // Add compacted summary as context
        const optimizedContext = getOptimizedContext();
        if (optimizedContext) {
          systemContent = systemContent
            ? `${systemContent}\n\n---\n<session_context>\n${optimizedContext}\n</session_context>`
            : `<session_context>\n${optimizedContext}\n</session_context>`;
        }
      }

      // Add extracted facts as persistent memory
      if (extractedFacts.length > 0) {
        const factsContext = extractedFacts
          .filter(f => f.confidence > 0.6)
          .map(f => `- [${f.category}] ${f.content}`)
          .join('\n');
        if (factsContext) {
          systemContent = systemContent
            ? `${systemContent}\n\n<user_facts>\n${factsContext}\n</user_facts>`
            : `<user_facts>\n${factsContext}\n</user_facts>`;
        }
      }

      // Ajouter les messages de l'historique (limiter à 10 derniers pour contexte, or use compacted recent)
      const history = conversation?.messages.slice(-10) || [];
      for (const msg of history) {
        messages.push({
          role: msg.role,
          content: msg.content,
          ...(msg.image && { image: msg.image })
        });
      }

      // Configurer le service IA avec le modèle sélectionné
      // IMPORTANT: Si native tools est activé et le provider est LM Studio, utiliser Gemini
      // car LM Studio ne supporte pas le tool calling natif
      const TOOL_CALLING_PROVIDERS = ['gemini', 'openai', 'anthropic'];
      let selectedProvider = options.provider || currentModel.provider as AIProvider;
      let selectedModel = options.model || currentModel.id;

      if (useNativeTools && !TOOL_CALLING_PROVIDERS.includes(selectedProvider)) {
        console.log('[useAIChat] Native tools enabled but provider', selectedProvider, 'does not support tool calling. Switching to Gemini.');
        selectedProvider = 'gemini' as AIProvider;
        selectedModel = 'gemini-2.0-flash'; // Use fast model for tool calling
      }

      console.log('[useAIChat] Using provider:', selectedProvider, 'model:', selectedModel, 'enableNativeTools:', useNativeTools);

      aiService.updateConfig({
        provider: selectedProvider,
        model: selectedModel,
        temperature: options.temperature || temperature,
        maxTokens: maxTokens,
        baseURL: currentModel.provider === 'lmstudio' ? '/lmstudio/v1' : undefined
      });

      // Configure native tools if enabled
      if (useNativeTools) {
        aiWithToolsService.setConfig({
          enableTools: true,
          showToolUsage: options.showToolUsage !== false,
          maxIterations: options.maxToolIterations || 5
        });
        setToolsUsed([]);
      }

      // Créer un message assistant vide pour le streaming
      addMessage({
        conversationId: resolvedConversationId,
        role: 'assistant',
        content: ''
      });

      // Récupérer l'ID du dernier message ajouté
      const updatedConv = getCurrentConversation();
      const assistantMessageId = updatedConv?.messages[updatedConv.messages.length - 1]?.id || '';

      // Stream la réponse
      let fullContent = '';
      const allToolsUsed: ToolUsageInfo[] = [];

      // Choose streaming method based on native tools option
      const streamGenerator = useNativeTools
        ? aiWithToolsService.streamMessage(messages)
        : aiService.streamMessage(messages);

      for await (const chunk of streamGenerator) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        if (chunk.error) {
          throw new Error(chunk.error);
        }

        // Track tool usage (only with native tools)
        if (useNativeTools && 'toolUsage' in chunk && chunk.toolUsage) {
          allToolsUsed.push(chunk.toolUsage);
          setToolsUsed([...allToolsUsed]);
          setStreamingStage('tools');
        }

        if (chunk.content) {
          fullContent += chunk.content;

          // Mettre à jour le message avec le contenu accumulé
          updateMessage(assistantMessageId, fullContent);

          // Update stage to generating if not using tools
          if (!('toolUsage' in chunk && chunk.toolUsage)) {
            setStreamingStage('generating');
          }
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
  }, [resolvedConversationId, isLoading, isStreaming, options, addMessage, updateMessage, getCurrentConversation, ragEnabled, ragProvider, ragSimilarityThreshold, ragMaxResults, currentModel, temperature, maxTokens]);

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

  // Get available tools for UI display
  const availableTools = useCallback(() => {
    return getAvailableToolsList();
  }, []);

  // Clear tools used
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
    ragContext,
    availableTools,
    // Native tool calling (OpenClaw-inspired)
    toolsUsed,
    clearToolsUsed,
    // Session compaction (OpenClaw-inspired)
    compactionStatus,
    needsCompaction,
    compactedSummary,
    extractedFacts,
    triggerCompaction
  };
};

export default useAIChat;
