/**
 * hooks/useProactiveSuggestions.ts
 * Hook React pour accéder aux suggestions proactives
 */

import { useState, useEffect, useCallback } from 'react';
import { agentRegistry } from '../features/agents/core/registry';
import { useContextManager } from './useContextManager';
import type { ProactiveSuggestionsAgent, Suggestion } from '../agents/ProactiveSuggestionsAgent';
import type { ContextItem } from '../context/types';

/**
 * Hook pour accéder aux fonctionnalités de suggestions proactives
 */
export function useProactiveSuggestions() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  
  // Récupération du gestionnaire de contexte
  const contextManager = useContextManager();
  
  /**
   * Récupère l'agent de suggestions proactives
   */
  const getSuggestionsAgent = useCallback(async (): Promise<ProactiveSuggestionsAgent> => {
    const agent = await agentRegistry.getAgentAsync('Proactive Suggestions');
    if (!agent) {
      throw new Error("Agent de suggestions proactives non disponible");
    }
    // Cast sécurisé car nous vérifions que le nom correspond
    return agent as unknown as ProactiveSuggestionsAgent;
  }, []);

  /**
   * Génère des suggestions basées sur le contexte actuel
   */
  const generateSuggestions = useCallback(async (contextItems?: ContextItem[]): Promise<Suggestion[]> => {
    try {
      setIsLoading(true);
      
      // Si aucun contexte n'est fourni, récupérer le contexte pertinent
      const context = contextItems || await contextManager.getRelevantContext('suggest_proactive_actions', 10);
      
      if (!context || context.length === 0) {
        throw new Error("Aucun contexte disponible pour générer des suggestions");
      }
      
      const agent = getSuggestionsAgent();
      const result = await agent.execute({
        intent: 'generate_suggestions',
        parameters: { context }
      });
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la génération des suggestions");
      }
      
      const newSuggestions = result.output?.suggestions || [];
      setSuggestions(newSuggestions);
      
      return newSuggestions;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [contextManager, getSuggestionsAgent]);

  /**
   * Récupère les suggestions actuelles
   */
  const getSuggestions = useCallback(async (): Promise<Suggestion[]> => {
    try {
      setIsLoading(true);
      
      const agent = getSuggestionsAgent();
      const result = await agent.execute({
        intent: 'get_suggestions'
      });
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la récupération des suggestions");
      }
      
      const currentSuggestions = result.output?.suggestions || [];
      setSuggestions(currentSuggestions);
      
      return currentSuggestions;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getSuggestionsAgent]);

  /**
   * Ignore une suggestion spécifique
   */
  const dismissSuggestion = useCallback(async (suggestionId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const agent = getSuggestionsAgent();
      const result = await agent.execute({
        intent: 'dismiss_suggestion',
        parameters: { suggestionId }
      });
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la suppression de la suggestion");
      }
      
      // Met à jour l'état local
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId || s.dismissed === true));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getSuggestionsAgent]);

  /**
   * Supprime toutes les suggestions
   */
  const clearAllSuggestions = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const agent = getSuggestionsAgent();
      const result = await agent.execute({
        intent: 'clear_suggestions'
      });
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de la suppression des suggestions");
      }
      
      // Met à jour l'état local
      setSuggestions([]);
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getSuggestionsAgent]);

  /**
   * Exécute une suggestion spécifique
   */
  const executeSuggestion = useCallback(async (suggestionId: string): Promise<{
    success: boolean;
    intent?: string;
    parameters?: Record<string, any>;
  }> => {
    try {
      setIsLoading(true);
      
      const agent = getSuggestionsAgent();
      const result = await agent.execute({
        intent: 'execute_suggestion',
        parameters: { suggestionId }
      });
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Échec de l'exécution de la suggestion");
      }
      
      // Met à jour l'état local
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId || s.dismissed === true));
      
      return {
        success: true,
        intent: result.output?.intent,
        parameters: result.output?.parameters
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [getSuggestionsAgent]);

  /**
   * Rafraîchit périodiquement les suggestions
   */
  useEffect(() => {
    // Génère des suggestions initiales
    void getSuggestions();

    // Rafraîchit les suggestions toutes les 5 minutes
    const refreshInterval = setInterval(() => {
      void generateSuggestions();
    }, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [getSuggestions, generateSuggestions]);

  return {
    // État
    suggestions,
    isLoading,
    error,
    
    // Actions
    generateSuggestions,
    getSuggestions,
    dismissSuggestion,
    clearAllSuggestions,
    executeSuggestion,
  };
}
