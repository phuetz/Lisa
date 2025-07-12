/**
 * agents/ContextAgent.ts
 * Agent responsable de la gestion du contexte de l'application
 */

import { Agent, AgentResponse, AgentRequest, BaseAgent, AgentDomains, AgentExecuteProps, AgentExecuteResult } from './types';
import { AgentType } from './agentTypes';
import { ContextManager } from '../context/ContextManager';
import {
  ContextItem,
  ContextTypes,
  ContextPriority,
  ContextLifespan,
  ContextQueryOptions,
  ConversationContextItem,
  EntityContextItem,
  IntentHistoryContextItem,
  ContextType
} from '../context/types';

/**
 * Types de requêtes pour l'agent de contexte
 */
export enum ContextRequestType {
  ADD_CONTEXT = 'add_context',
  GET_CONTEXT = 'get_context',
  UPDATE_CONTEXT = 'update_context',
  DELETE_CONTEXT = 'delete_context',
  QUERY_CONTEXT = 'query_context',
  GET_RELEVANT_CONTEXT = 'get_relevant_context',
  MERGE_CONTEXTS = 'merge_contexts',
  PRUNE_CONTEXTS = 'prune_contexts',
  CLEAR_CONTEXTS = 'clear_contexts',
  GET_STATS = 'get_stats',
  EXPORT_CONTEXTS = 'export_contexts',
  IMPORT_CONTEXTS = 'import_contexts'
}

/**
 * Interface de requête pour l'agent de contexte
 */
export interface ContextAgentRequest extends AgentRequest {
  requestType: ContextRequestType;
  payload?: any;
}

/**
 * Agent responsable de la gestion du contexte
 */
export class ContextAgent implements Agent, BaseAgent {
  readonly type = AgentType.CONTEXT;
  readonly name = 'Context Manager';
  readonly description = 'Gère le système de contexte avancé pour améliorer la mémoire et la cohérence des interactions';
  readonly version = '1.0.0';
  readonly domain = AgentDomains.KNOWLEDGE;
  readonly capabilities = ['context_tracking', 'conversation_memory', 'entity_tracking', 'intent_history'];
  readonly status = 'active';
  private contextManager: ContextManager;

  constructor() {
    this.contextManager = new ContextManager();
  }

  /**
   * Méthode principale d'exécution pour les requêtes de contexte
   * Implémentation de l'interface BaseAgent
   */
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    try {
      // Si l'intent est spécifié, nous le traitons comme une action
      if (props.intent && props.parameters) {
        const request: ContextAgentRequest = {
          action: props.intent as any,
          ...props.parameters
        };
        
        const response = await this.processRequest(request);
        
        return {
          success: response.success,
          output: response.data,
          metadata: {
            executionTime: response.metadata?.executionTime || 0,
            confidence: 1.0,
            source: 'ContextAgent',
            timestamp: Date.now()
          }
        };
      }
      
      return {
        success: false,
        output: null,
        error: 'Intent non spécifié dans la requête'
      };
    } catch (error) {
      console.error('Erreur dans l\'exécution du ContextAgent:', error);
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Traite une requête spécifique au contexte
   */
  async processRequest(request: ContextAgentRequest): Promise<AgentResponse> {
    switch (request.requestType) {
      case ContextRequestType.ADD_CONTEXT:
        return this.handleAddContext(request);
      case ContextRequestType.GET_CONTEXT:
        return this.handleGetContext(request);
      case ContextRequestType.UPDATE_CONTEXT:
        return this.handleUpdateContext(request);
      case ContextRequestType.DELETE_CONTEXT:
        return this.handleDeleteContext(request);
      case ContextRequestType.QUERY_CONTEXT:
        return this.handleQueryContext(request);
      case ContextRequestType.GET_RELEVANT_CONTEXT:
        return this.handleGetRelevantContext(request);
      case ContextRequestType.MERGE_CONTEXTS:
        return this.handleMergeContexts();
      case ContextRequestType.PRUNE_CONTEXTS:
        return this.handlePruneContexts();
      case ContextRequestType.CLEAR_CONTEXTS:
        return this.handleClearContexts(request);
      case ContextRequestType.GET_STATS:
        return this.handleGetStats();
      case ContextRequestType.EXPORT_CONTEXTS:
        return this.handleExportContexts();
      case ContextRequestType.IMPORT_CONTEXTS:
        return this.handleImportContexts(request);
      default:
        return {
          success: false,
          error: `Type de requête inconnu: ${request.requestType}`
        };
    }
  }

  /**
   * Ajoute un élément de contexte
   */
  private handleAddContext(request: ContextAgentRequest): AgentResponse {
    try {
      const { contextItem } = request.payload;

      if (!contextItem) {
        return {
          success: false,
          error: 'Élément de contexte manquant'
        };
      }

      const newItem = this.contextManager.addContext(contextItem);

      return {
        success: true,
        data: { contextItem: newItem }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de l'ajout du contexte: ${error}`
      };
    }
  }

  /**
   * Récupère un élément de contexte
   */
  private handleGetContext(request: ContextAgentRequest): AgentResponse {
    try {
      const { id } = request.payload;

      if (!id) {
        return {
          success: false,
          error: 'ID de contexte manquant'
        };
      }

      const contextItem = this.contextManager.getContextById(id);

      if (!contextItem) {
        return {
          success: false,
          error: `Contexte avec ID ${id} non trouvé`
        };
      }

      return {
        success: true,
        data: { contextItem }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération du contexte: ${error}`
      };
    }
  }

  /**
   * Met à jour un élément de contexte
   */
  private handleUpdateContext(request: ContextAgentRequest): AgentResponse {
    try {
      const { id, updates } = request.payload;

      if (!id || !updates) {
        return {
          success: false,
          error: 'ID de contexte ou mises à jour manquants'
        };
      }

      const updatedItem = this.contextManager.updateContext(id, updates);

      if (!updatedItem) {
        return {
          success: false,
          error: `Contexte avec ID ${id} non trouvé`
        };
      }

      return {
        success: true,
        data: { contextItem: updatedItem }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la mise à jour du contexte: ${error}`
      };
    }
  }

  /**
   * Supprime un élément de contexte
   */
  private handleDeleteContext(request: ContextAgentRequest): AgentResponse {
    try {
      const { id } = request.payload;

      if (!id) {
        return {
          success: false,
          error: 'ID de contexte manquant'
        };
      }

      const deleted = this.contextManager.removeContext(id);

      if (!deleted) {
        return {
          success: false,
          error: `Contexte avec ID ${id} non trouvé`
        };
      }

      return {
        success: true,
        data: { deleted: true }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la suppression du contexte: ${error}`
      };
    }
  }

  /**
   * Recherche des éléments de contexte
   */
  private handleQueryContext(request: ContextAgentRequest): AgentResponse {
    try {
      const options = request.payload?.options || {};
      const results = this.contextManager.queryContext(options as ContextQueryOptions);

      return {
        success: true,
        data: { results }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la recherche de contexte: ${error}`
      };
    }
  }

  /**
   * Récupère le contexte pertinent
   */
  private handleGetRelevantContext(request: ContextAgentRequest): AgentResponse {
    try {
      const { input, maxItems } = request.payload;

      if (!input) {
        return {
          success: false,
          error: 'Entrée manquante'
        };
      }

      const relevantContexts = this.contextManager.getRelevantContext(
        input,
        maxItems || 10
      );

      return {
        success: true,
        data: { relevantContexts }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération du contexte pertinent: ${error}`
      };
    }
  }

  /**
   * Fusionne les contextes similaires
   */
  private handleMergeContexts(): AgentResponse {
    try {
      this.contextManager.mergeContexts();

      return {
        success: true,
        data: { merged: true }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la fusion des contextes: ${error}`
      };
    }
  }

  /**
   * Nettoie les contextes expirés
   */
  private handlePruneContexts(): AgentResponse {
    try {
      this.contextManager.pruneContexts();

      return {
        success: true,
        data: { pruned: true }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors du nettoyage des contextes: ${error}`
      };
    }
  }

  /**
   * Supprime tous les contextes
   */
  private handleClearContexts(request: ContextAgentRequest): AgentResponse {
    try {
      const { types } = request.payload || {};
      this.contextManager.clearContexts(types as ContextType[]);

      return {
        success: true,
        data: { cleared: true }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la suppression des contextes: ${error}`
      };
    }
  }

  /**
   * Récupère les statistiques du contexte
   */
  private handleGetStats(): AgentResponse {
    try {
      const stats = this.contextManager.getStats();

      return {
        success: true,
        data: { stats }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération des statistiques: ${error}`
      };
    }
  }

  /**
   * Exporte tous les éléments de contexte
   */
  private handleExportContexts(): AgentResponse {
    try {
      const contexts = this.contextManager.exportContexts();

      return {
        success: true,
        data: { contexts }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de l'exportation des contextes: ${error}`
      };
    }
  }

  /**
   * Importe des éléments de contexte
   */
  private handleImportContexts(request: ContextAgentRequest): AgentResponse {
    try {
      const { contexts } = request.payload;

      if (!contexts || !Array.isArray(contexts)) {
        return {
          success: false,
          error: 'Contextes manquants ou invalides'
        };
      }

      this.contextManager.importContexts(contexts as ContextItem[]);

      return {
        success: true,
        data: { imported: true }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de l'importation des contextes: ${error}`
      };
    }
  }

  /**
   * Ajoute un élément de contexte de conversation
   */
  async addConversationContext(
    text: string,
    role: 'user' | 'assistant',
    metadata: { intent?: string; sentiment?: string; language?: string } = {}
  ): Promise<ConversationContextItem | null> {
    try {
      const contextItem = this.contextManager.addConversationContext(text, role, metadata) as ConversationContextItem;
      return contextItem;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du contexte de conversation:', error);
      return null;
    }
  }

  /**
   * Ajoute un élément de contexte d'entité
   */
  async addEntityContext(
    entityType: string,
    name: string,
    attributes: Record<string, any> = {},
    references: string[] = []
  ): Promise<EntityContextItem | null> {
    try {
      const contextItem = this.contextManager.addEntityContext(
        entityType,
        name,
        attributes,
        references
      ) as EntityContextItem;
      return contextItem;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du contexte d\'entité:', error);
      return null;
    }
  }

  /**
   * Ajoute un élément de contexte d'intention
   */
  async addIntentContext(
    intent: string,
    parameters: Record<string, any> = {},
    fulfilled: boolean = false,
    followUpIntent?: string
  ): Promise<IntentHistoryContextItem | null> {
    try {
      const contextItem = this.contextManager.addIntentContext(
        intent,
        parameters,
        fulfilled,
        followUpIntent
      ) as IntentHistoryContextItem;
      return contextItem;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du contexte d\'intention:', error);
      return null;
    }
  }

  /**
   * Récupère le contexte pertinent pour une entrée
   */
  async getContextForInput(input: string, maxItems: number = 10): Promise<ContextItem[]> {
    return this.contextManager.getRelevantContext(input, maxItems);
  }
}
