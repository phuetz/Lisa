/**
 * 🚀 usePhase2 - Hook d'Intégration Phase 2
 * Combine CriticAgent, Memory Service, et RAG
 */

import { useState, useCallback } from 'react';
import { criticAgentV2, type ActionProposal, type ValidationResult } from '../agents/CriticAgentV2';
import { memoryService, type Memory } from '../services/MemoryService';
import { ragService, type AugmentedContext } from '../services/RAGService';
import { forgetService, type ForgetResult } from '../services/ForgetService';

export interface Phase2State {
  isValidating: boolean;
  isSearching: boolean;
  isAugmenting: boolean;
  isForgetting: boolean;
  lastValidation: ValidationResult | null;
  lastAugmentation: AugmentedContext | null;
  lastForget: ForgetResult | null;
}

export function usePhase2() {
  const [state, setState] = useState<Phase2State>({
    isValidating: false,
    isSearching: false,
    isAugmenting: false,
    isForgetting: false,
    lastValidation: null,
    lastAugmentation: null,
    lastForget: null
  });

  /**
   * Valider une action
   */
  const validateAction = useCallback(
    async (proposal: ActionProposal): Promise<ValidationResult> => {
      setState(prev => ({ ...prev, isValidating: true }));
      try {
        const result = await criticAgentV2.validateAction(proposal);
        setState(prev => ({ ...prev, lastValidation: result }));
        return result;
      } finally {
        setState(prev => ({ ...prev, isValidating: false }));
      }
    },
    []
  );

  /**
   * Ajouter un souvenir
   */
  const addMemory = useCallback(
    (
      type: Memory['type'],
      content: string,
      source: string,
      tags?: string[]
    ): Memory => {
      return memoryService.createMemory(type, content, source, tags);
    },
    []
  );

  /**
   * Récupérer le contexte
   */
  const getContext = useCallback(() => {
    return memoryService.getContext();
  }, []);

  /**
   * Rechercher des souvenirs pertinents
   */
  const searchMemories = useCallback(
    (query: string, limit?: number): Memory[] => {
      setState(prev => ({ ...prev, isSearching: true }));
      try {
        return memoryService.getRelevantMemories(query, limit);
      } finally {
        setState(prev => ({ ...prev, isSearching: false }));
      }
    },
    []
  );

  /**
   * Augmenter le contexte avec RAG
   */
  const augmentContext = useCallback(
    async (query: string, limit?: number): Promise<AugmentedContext> => {
      setState(prev => ({ ...prev, isAugmenting: true }));
      try {
        const result = await ragService.augmentContext(query, limit);
        setState(prev => ({ ...prev, lastAugmentation: result }));
        return result;
      } finally {
        setState(prev => ({ ...prev, isAugmenting: false }));
      }
    },
    []
  );

  /**
   * Oublier des données
   */
  const forget = useCallback(
    async (
      scope: 'conversation' | 'document' | 'preference' | 'fact' | 'context' | 'all',
      reason?: string
    ): Promise<ForgetResult> => {
      setState(prev => ({ ...prev, isForgetting: true }));
      try {
        const result = await forgetService.forget(scope, reason);
        setState(prev => ({ ...prev, lastForget: result }));
        return result;
      } finally {
        setState(prev => ({ ...prev, isForgetting: false }));
      }
    },
    []
  );

  /**
   * Oublier les conversations
   */
  const forgetConversations = useCallback(
    async (reason?: string): Promise<ForgetResult> => {
      return forget('conversation', reason);
    },
    [forget]
  );

  /**
   * Oublier les documents
   */
  const forgetDocuments = useCallback(
    async (reason?: string): Promise<ForgetResult> => {
      return forget('document', reason);
    },
    [forget]
  );

  /**
   * Oublier tout
   */
  const forgetAll = useCallback(
    async (reason?: string): Promise<ForgetResult> => {
      return forget('all', reason || 'User requested complete data deletion');
    },
    [forget]
  );

  /**
   * Obtenir les statistiques
   */
  const getStats = useCallback(() => {
    return {
      critic: criticAgentV2.getStats(),
      memory: memoryService.getStats(),
      rag: ragService.getStats(),
      forget: forgetService.getStats()
    };
  }, []);

  /**
   * Workflow complet: valider, mémoriser, augmenter
   */
  const executeWithValidation = useCallback(
    async (
      proposal: ActionProposal,
      onApprovalRequired?: (result: ValidationResult) => Promise<boolean>
    ): Promise<boolean> => {
      // 1. Valider l'action
      const validation = await validateAction(proposal);

      // 2. Si approbation requise
      if (validation.requiresUserApproval && onApprovalRequired) {
        const approved = await onApprovalRequired(validation);
        if (!approved) return false;
      }

      // 3. Si approuvé, ajouter à la mémoire
      if (validation.approved) {
        addMemory(
          'fact',
          `Action executed: ${proposal.name}`,
          'system',
          ['action', 'executed']
        );
      }

      return validation.approved;
    },
    [validateAction, addMemory]
  );

  /**
   * Workflow complet: augmenter le contexte et répondre
   */
  const respondWithContext = useCallback(
    async (userMessage: string): Promise<{ context: AugmentedContext; response: string }> => {
      // 1. Ajouter le message à la mémoire
      addMemory('conversation', userMessage, 'user_input', ['user_message']);

      // 2. Augmenter le contexte
      const augmented = await augmentContext(userMessage, 5);

      // 3. Générer une réponse (placeholder)
      const response = `Je me souviens de ${augmented.relevantMemories.length} souvenirs pertinents.`;

      // 4. Ajouter la réponse à la mémoire
      addMemory('conversation', response, 'lisa_response', ['lisa_message']);

      return { context: augmented, response };
    },
    [addMemory, augmentContext]
  );

  return {
    // État
    state,

    // Actions
    validateAction,
    addMemory,
    getContext,
    searchMemories,
    augmentContext,
    forget,
    forgetConversations,
    forgetDocuments,
    forgetAll,
    getStats,

    // Workflows
    executeWithValidation,
    respondWithContext
  };
}
