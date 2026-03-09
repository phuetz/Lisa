/**
 * hooks/useContextManager.ts
 * Hook React pour accéder au gestionnaire de contexte
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { agentRegistry } from '../features/agents/core/registry';
import { ContextAgent } from '../features/agents/implementations/ContextAgent';
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
  // Track concurrent loading operations to prevent premature isLoading=false
  const loadingCountRef = useRef(0);

  const startLoading = useCallback(() => {
    loadingCountRef.current++;
    if (loadingCountRef.current === 1) setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
    if (loadingCountRef.current === 0) setIsLoading(false);
  }, []);

  /**
   * Obtient l'agent de contexte du registre
   */
  const getContextAgent = useCallback((): ContextAgent | null => {
    const agent = agentRegistry.getAgent('context-agent');
    if (!agent) {
      setError("Agent de contexte non disponible");
      return null;
    }
    return agent as ContextAgent;
  }, []);
  
  /**
   * Ajoute un élément au contexte
   */
  const addContext = useCallback(async (contextItem: Omit<ContextItem, 'id' | 'timestamp'>): Promise<ContextItem | null> => {
    try {
      startLoading();

      const agent = getContextAgent();
      if (!agent) return null;
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
      stopLoading();
    }
  }, [getContextAgent, startLoading, stopLoading]);

  /**
   * Obtient un élément de contexte par ID
   */
  const getContext = useCallback(async (id: string): Promise<ContextItem | null> => {
    try {
      startLoading();

      const agent = getContextAgent();
      if (!agent) return null;
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
      stopLoading();
    }
  }, [getContextAgent, startLoading, stopLoading]);
  
  /**
   * Met à jour un élément de contexte
   */
  const updateContext = useCallback(async (id: string, updates: Partial<Omit<ContextItem, 'id' | 'type'>>): Promise<ContextItem | null> => {
    try {
      startLoading();

      const agent = getContextAgent();
      if (!agent) return null;
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
      stopLoading();
    }
  }, [getContextAgent, startLoading, stopLoading]);
  
  /**
   * Supprime un élément de contexte
   */
  const removeContext = useCallback(async (id: string): Promise<boolean> => {
    try {
      startLoading();

      const agent = getContextAgent();
      if (!agent) return false;
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
      stopLoading();
    }
  }, [getContextAgent, startLoading, stopLoading]);
  
  /**
   * Recherche des éléments de contexte
   */
  const queryContext = useCallback(async (options?: ContextQueryOptions): Promise<ContextItem[]> => {
    try {
      startLoading();

      const agent = getContextAgent();
      if (!agent) return [];
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
      stopLoading();
    }
  }, [getContextAgent, startLoading, stopLoading]);
  
  /**
   * Obtient le contexte pertinent pour une entrée
   */
  const getRelevantContext = useCallback(async (input: string, maxItems: number = 10): Promise<ContextItem[]> => {
    try {
      startLoading();

      const agent = getContextAgent();
      if (!agent) return [];
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
      stopLoading();
    }
  }, [getContextAgent, startLoading, stopLoading]);
  
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
      if (!agent) return null;
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
      if (!agent) return null;
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
      if (!agent) return null;
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
      startLoading();

      const agent = getContextAgent();
      if (!agent) return false;
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
      stopLoading();
    }
  }, [getContextAgent, startLoading, stopLoading]);
  
  /**
   * Nettoie les contextes expirés
   */
  const pruneContexts = useCallback(async (): Promise<boolean> => {
    try {
      startLoading();

      const agent = getContextAgent();
      if (!agent) return false;
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
      stopLoading();
    }
  }, [getContextAgent, startLoading, stopLoading]);
  
  /**
   * Supprime tous les contextes
   */
  const clearContexts = useCallback(async (types?: ContextType[]): Promise<boolean> => {
    try {
      startLoading();

      const agent = getContextAgent();
      if (!agent) return false;
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
      stopLoading();
    }
  }, [getContextAgent, startLoading, stopLoading]);
  
  /**
   * Récupère les statistiques du contexte
   */
  const getContextStats = useCallback(async (): Promise<any> => {
    try {
      startLoading();

      const agent = getContextAgent();
      if (!agent) return null;
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
      stopLoading();
    }
  }, [getContextAgent, startLoading, stopLoading]);
  
  /**
   * Exporte tous les éléments de contexte
   */
  const exportContexts = useCallback(async (): Promise<ContextItem[]> => {
    try {
      startLoading();

      const agent = getContextAgent();
      if (!agent) return [];
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
      stopLoading();
    }
  }, [getContextAgent, startLoading, stopLoading]);
  
  /**
   * Importe des éléments de contexte
   */
  const importContexts = useCallback(async (contexts: ContextItem[]): Promise<boolean> => {
    try {
      startLoading();

      const agent = getContextAgent();
      if (!agent) return false;
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
      stopLoading();
    }
  }, [getContextAgent, startLoading, stopLoading]);
  
  /**
   * Rafraîchit la liste des contextes récents
   */
  const refreshRecentContexts = useCallback(async (): Promise<ContextItem[]> => {
    try {
      startLoading();

      const agent = getContextAgent();
      if (!agent) return [];
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
      stopLoading();
    }
  }, [getContextAgent, startLoading, stopLoading]);
  
  // Note: useEffect pour lastIntent/lastSpokenText désactivé car les types ne correspondent pas
  // TODO: Réactiver quand le store sera mis à jour avec les bons types
  
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
