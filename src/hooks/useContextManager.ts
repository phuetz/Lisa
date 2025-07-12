/**
 * hooks/useContextManager.ts
 * Hook React pour accéder au gestionnaire de contexte
 */

import { useState, useEffect, useCallback } from 'react';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { agentRegistry } from '../agents/registry';
import { ContextAgent } from '../agents/ContextAgent';
import type {
  ContextItem,
  ContextType,
  ContextQueryOptions,
  ConversationContextItem,
  EntityContextItem,
  IntentHistoryContextItem
} from '../context/types';

/**
 * Hook pour accéder au gestionnaire de contexte
 */
export function useContextManager() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recentContexts, setRecentContexts] = useState<ContextItem[]>([]);
  
  const store = useVisionAudioStore();
  
  /**
   * Obtient l'agent de contexte du registre
   */
  const getContextAgent = useCallback((): ContextAgent => {
    const agent = agentRegistry.getAgent('Context Manager');
    if (!agent) {
      throw new Error("Agent de contexte non disponible");
    }
    return agent as ContextAgent;
  }, []);
  
  /**
   * Ajoute un élément au contexte
   */
  const addContext = useCallback(async (contextItem: Omit<ContextItem, 'id' | 'timestamp'>): Promise<ContextItem | null> => {
    try {
      setIsLoading(true);
      
      const agent = getContextAgent();
      const props = {
        intent: 'add_context',
        parameters: { contextItem }
      };
      
      const result = await agent.execute(props);
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de l'ajout du contexte");
      }
      
      // Rafraîchit la liste des contextes récents
      void refreshRecentContexts();
      
      return result.output?.contextItem || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getContextAgent]);
  
  /**
   * Obtient un élément de contexte par ID
   */
  const getContext = useCallback(async (id: string): Promise<ContextItem | null> => {
    try {
      setIsLoading(true);
      
      const agent = getContextAgent();
      const props = {
        intent: 'get_context',
        parameters: { id }
      };
      
      const result = await agent.execute(props);
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la récupération du contexte");
      }
      
      return result.output?.contextItem || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getContextAgent]);
  
  /**
   * Met à jour un élément de contexte
   */
  const updateContext = useCallback(async (id: string, updates: Partial<Omit<ContextItem, 'id' | 'type'>>): Promise<ContextItem | null> => {
    try {
      setIsLoading(true);
      
      const agent = getContextAgent();
      const props = {
        intent: 'update_context',
        parameters: { id, updates }
      };
      
      const result = await agent.execute(props);
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la mise à jour du contexte");
      }
      
      // Rafraîchit la liste des contextes récents
      void refreshRecentContexts();
      
      return result.output?.contextItem || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getContextAgent]);
  
  /**
   * Supprime un élément de contexte
   */
  const removeContext = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const agent = getContextAgent();
      const props = {
        intent: 'delete_context',
        parameters: { id }
      };
      
      const result = await agent.execute(props);
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la suppression du contexte");
      }
      
      // Rafraîchit la liste des contextes récents
      void refreshRecentContexts();
      
      return result.output?.deleted || false;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContextAgent]);
  
  /**
   * Recherche des éléments de contexte
   */
  const queryContext = useCallback(async (options?: ContextQueryOptions): Promise<ContextItem[]> => {
    try {
      setIsLoading(true);
      
      const agent = getContextAgent();
      const props = {
        intent: 'query_context',
        parameters: { options }
      };
      
      const result = await agent.execute(props);
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la recherche de contexte");
      }
      
      return result.output?.results || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getContextAgent]);
  
  /**
   * Obtient le contexte pertinent pour une entrée
   */
  const getRelevantContext = useCallback(async (input: string, maxItems: number = 10): Promise<ContextItem[]> => {
    try {
      setIsLoading(true);
      
      const agent = getContextAgent();
      const props = {
        intent: 'get_relevant_context',
        parameters: { input, maxItems }
      };
      
      const result = await agent.execute(props);
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la récupération du contexte pertinent");
      }
      
      return result.output?.relevantContexts || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getContextAgent]);
  
  /**
   * Ajoute un élément de contexte de conversation
   */
  const addConversationContext = useCallback(async (
    text: string,
    role: 'user' | 'assistant',
    metadata: { intent?: string; sentiment?: string; language?: string } = {}
  ): Promise<ConversationContextItem | null> => {
    try {
      const agent = getContextAgent();
      const result = await agent.addConversationContext(text, role, metadata);
      
      // Rafraîchit la liste des contextes récents
      void refreshRecentContexts();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [getContextAgent]);
  
  /**
   * Ajoute un élément de contexte d'entité
   */
  const addEntityContext = useCallback(async (
    entityType: string,
    name: string,
    attributes: Record<string, any> = {},
    references: string[] = []
  ): Promise<EntityContextItem | null> => {
    try {
      const agent = getContextAgent();
      const result = await agent.addEntityContext(entityType, name, attributes, references);
      
      // Rafraîchit la liste des contextes récents
      void refreshRecentContexts();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [getContextAgent]);
  
  /**
   * Ajoute un élément de contexte d'intention
   */
  const addIntentContext = useCallback(async (
    intent: string,
    parameters: Record<string, any> = {},
    fulfilled: boolean = false,
    followUpIntent?: string
  ): Promise<IntentHistoryContextItem | null> => {
    try {
      const agent = getContextAgent();
      const result = await agent.addIntentContext(intent, parameters, fulfilled, followUpIntent);
      
      // Rafraîchit la liste des contextes récents
      void refreshRecentContexts();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [getContextAgent]);
  
  /**
   * Fusionne les contextes similaires
   */
  const mergeContexts = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const agent = getContextAgent();
      const props = {
        intent: 'merge_contexts'
      };
      
      const result = await agent.execute(props);
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la fusion des contextes");
      }
      
      // Rafraîchit la liste des contextes récents
      void refreshRecentContexts();
      
      return result.output?.merged || false;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContextAgent]);
  
  /**
   * Nettoie les contextes expirés
   */
  const pruneContexts = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const agent = getContextAgent();
      const props = {
        intent: 'prune_contexts'
      };
      
      const result = await agent.execute(props);
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec du nettoyage des contextes");
      }
      
      // Rafraîchit la liste des contextes récents
      void refreshRecentContexts();
      
      return result.output?.pruned || false;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContextAgent]);
  
  /**
   * Supprime tous les contextes
   */
  const clearContexts = useCallback(async (types?: ContextType[]): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const agent = getContextAgent();
      const props = {
        intent: 'clear_contexts',
        parameters: { types }
      };
      
      const result = await agent.execute(props);
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la suppression des contextes");
      }
      
      // Rafraîchit la liste des contextes récents
      void refreshRecentContexts();
      
      return result.output?.cleared || false;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContextAgent]);
  
  /**
   * Récupère les statistiques du contexte
   */
  const getContextStats = useCallback(async (): Promise<any> => {
    try {
      setIsLoading(true);
      
      const agent = getContextAgent();
      const props = {
        intent: 'get_stats'
      };
      
      const result = await agent.execute(props);
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la récupération des statistiques");
      }
      
      return result.output?.stats || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getContextAgent]);
  
  /**
   * Exporte tous les éléments de contexte
   */
  const exportContexts = useCallback(async (): Promise<ContextItem[]> => {
    try {
      setIsLoading(true);
      
      const agent = getContextAgent();
      const props = {
        intent: 'export_contexts'
      };
      
      const result = await agent.execute(props);
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de l'exportation des contextes");
      }
      
      return result.output?.contexts || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getContextAgent]);
  
  /**
   * Importe des éléments de contexte
   */
  const importContexts = useCallback(async (contexts: ContextItem[]): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const agent = getContextAgent();
      const props = {
        intent: 'import_contexts',
        parameters: { contexts }
      };
      
      const result = await agent.execute(props);
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de l'importation des contextes");
      }
      
      // Rafraîchit la liste des contextes récents
      void refreshRecentContexts();
      
      return result.output?.imported || false;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContextAgent]);
  
  /**
   * Rafraîchit la liste des contextes récents
   */
  const refreshRecentContexts = useCallback(async (): Promise<ContextItem[]> => {
    try {
      setIsLoading(true);
      
      const agent = getContextAgent();
      const props = {
        intent: 'get_recent_contexts',
        parameters: { limit: 5 }
      };
      
      const result = await agent.execute(props);
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la récupération des contextes récents");
      }
      
      const contexts = result.output?.contexts || [];
      setRecentContexts(contexts);
      return contexts;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getContextAgent]);
  
  useEffect(() => {
    if (store.lastIntent) {
      // Ajoute l'intention détectée au contexte de la conversation
      void addIntentContext(
        store.lastIntent.intent,
        store.lastIntent.entities || {},
        true
      );
      
      // Ajoute au contexte de conversation si lastSpokenText est disponible
      if (store.lastSpokenText) {
        void addConversationContext({
          type: 'conversation',
          text: store.lastSpokenText,
          intent: store.lastIntent.intent,
          parameters: store.lastIntent.entities || {}
        });
      }
    }
  }, [store.lastIntent, store.lastSpokenText, addConversationContext, addIntentContext]);
  
  /**
   * Initialisation: rafraîchit la liste des contextes récents
   */
  useEffect(() => {
    void refreshRecentContexts();
  }, [refreshRecentContexts]);
  
  return {
    // État
    isLoading,
    error,
    recentContexts,
    
    // Actions de base
    addContext,
    getContext,
    updateContext,
    removeContext,
    queryContext,
    getRelevantContext,
    mergeContexts,
    pruneContexts,
    clearContexts,
    
    // Actions spécifiques
    addConversationContext,
    addEntityContext,
    addIntentContext,
    
    // Actions d'administration
    getContextStats,
    exportContexts,
    importContexts,
    refreshRecentContexts
  };
}
