/**
 * ProactiveSuggestionsAgent.ts
 * Agent spécialisé pour les suggestions proactives basées sur le contexte
 */

import { BaseAgent, AgentResult, AgentProps } from './types';
import { useContextManager } from '../hooks/useContextManager';
import { ContextItem } from '../context/types';

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  intent: string;
  parameters: Record<string, any>;
  contextSource: string;
  confidence: number;
  icon?: string;
  timestamp: number;
  category: 'task' | 'reminder' | 'info' | 'action';
  expiresAt?: number;
  dismissed?: boolean;
}

/**
 * Agent spécialisé pour générer des suggestions proactives
 * basées sur le contexte utilisateur actuel
 */
export class ProactiveSuggestionsAgent implements BaseAgent {
  public readonly name = 'Proactive Suggestions';
  public readonly description = 'Génère des suggestions proactives basées sur le contexte utilisateur';
  public readonly domain = 'suggestions';
  public readonly version = '1.0.0';
  public readonly capabilities = ['suggestions', 'context_analysis', 'proactive_recommendations'];

  private currentSuggestions: Suggestion[] = [];

  /**
   * Méthode principale pour exécuter l'agent
   */
  public async execute(props: AgentProps): Promise<AgentResult> {
    try {
      switch (props.intent) {
        case 'generate_suggestions':
          return await this.generateSuggestions(props.parameters?.context);
        case 'get_suggestions':
          return this.getSuggestions();
        case 'dismiss_suggestion':
          return this.dismissSuggestion(props.parameters?.suggestionId);
        case 'clear_suggestions':
          return this.clearSuggestions();
        case 'execute_suggestion':
          return this.executeSuggestion(props.parameters?.suggestionId);
        default:
          return {
            success: false,
            error: `Intent non supporté: ${props.intent}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Génère des suggestions proactives basées sur le contexte actuel
   */
  private async generateSuggestions(contextItems?: ContextItem[]): Promise<AgentResult> {
    try {
      if (!contextItems || contextItems.length === 0) {
        return {
          success: false,
          error: 'Aucun contexte fourni pour générer des suggestions',
        };
      }

      // Analyse le contexte pour générer des suggestions
      const suggestions = await this.analyzeContextForSuggestions(contextItems);

      // Met à jour les suggestions actuelles
      this.currentSuggestions = [
        ...this.currentSuggestions.filter(s => !s.dismissed && (!s.expiresAt || s.expiresAt > Date.now())),
        ...suggestions
      ];

      return {
        success: true,
        output: {
          suggestions: this.currentSuggestions,
          count: this.currentSuggestions.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Analyse le contexte pour générer des suggestions pertinentes
   */
  private async analyzeContextForSuggestions(contextItems: ContextItem[]): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const now = Date.now();

    // Traite les différents types de contexte
    for (const item of contextItems) {
      switch (item.type) {
        case 'conversation':
          suggestions.push(...this.generateConversationSuggestions(item));
          break;
        case 'entity':
          suggestions.push(...this.generateEntitySuggestions(item));
          break;
        case 'intent_history':
          suggestions.push(...this.generateIntentHistorySuggestions(item));
          break;
        case 'user_preference':
          suggestions.push(...this.generatePreferenceSuggestions(item));
          break;
        case 'system_state':
          suggestions.push(...this.generateSystemStateSuggestions(item));
          break;
      }
    }

    // Filtre et ordonne les suggestions par pertinence (confiance)
    return suggestions
      .filter(s => s.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Limite à 5 suggestions maximum
  }

  /**
   * Génère des suggestions basées sur les conversations récentes
   */
  private generateConversationSuggestions(context: ContextItem): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Si la conversation contient des mots-clés liés à des tâches
    if (context.content?.text?.toLowerCase().includes('rappel') || 
        context.content?.text?.toLowerCase().includes('rappelle-moi')) {
      suggestions.push({
        id: `reminder-${Date.now()}`,
        title: 'Créer un rappel',
        description: 'Voulez-vous créer un rappel basé sur votre conversation?',
        intent: 'create_reminder',
        parameters: {
          source: context.id,
          text: context.content?.text
        },
        contextSource: context.id,
        confidence: 0.85,
        icon: 'alarm',
        timestamp: Date.now(),
        category: 'reminder',
        expiresAt: Date.now() + 1800000, // 30 minutes
      });
    }

    // Si la conversation mentionne la météo
    if (context.content?.text?.toLowerCase().includes('météo') ||
        context.content?.text?.toLowerCase().includes('temps')) {
      suggestions.push({
        id: `weather-${Date.now()}`,
        title: 'Vérifier la météo',
        description: 'Consulter les prévisions météo actuelles',
        intent: 'check_weather',
        parameters: {},
        contextSource: context.id,
        confidence: 0.75,
        icon: 'cloud',
        timestamp: Date.now(),
        category: 'info',
      });
    }

    return suggestions;
  }

  /**
   * Génère des suggestions basées sur les entités reconnues
   */
  private generateEntitySuggestions(context: ContextItem): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const entity = context.content;

    // Si l'entité est une date future
    if (entity?.type === 'date' && entity.value && new Date(entity.value).getTime() > Date.now()) {
      suggestions.push({
        id: `calendar-${Date.now()}`,
        title: 'Consulter l\'agenda',
        description: `Voir vos événements pour ${new Date(entity.value).toLocaleDateString()}`,
        intent: 'check_calendar',
        parameters: {
          date: entity.value
        },
        contextSource: context.id,
        confidence: 0.8,
        icon: 'calendar',
        timestamp: Date.now(),
        category: 'action',
      });
    }

    // Si l'entité est un lieu
    if (entity?.type === 'location') {
      suggestions.push({
        id: `location-${Date.now()}`,
        title: `Informations sur ${entity.value}`,
        description: `Rechercher des informations sur ${entity.value}`,
        intent: 'search_location',
        parameters: {
          location: entity.value
        },
        contextSource: context.id,
        confidence: 0.7,
        icon: 'place',
        timestamp: Date.now(),
        category: 'info',
      });
    }

    return suggestions;
  }

  /**
   * Génère des suggestions basées sur l'historique des intentions
   */
  private generateIntentHistorySuggestions(context: ContextItem): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const intentHistory = context.content;

    // Si l'utilisateur a récemment vérifié la météo plusieurs fois
    if (intentHistory?.intent === 'check_weather' && intentHistory.count && intentHistory.count > 2) {
      suggestions.push({
        id: `weather-shortcut-${Date.now()}`,
        title: 'Ajouter un raccourci météo',
        description: 'Ajouter un raccourci météo à votre écran d\'accueil',
        intent: 'create_shortcut',
        parameters: {
          type: 'weather'
        },
        contextSource: context.id,
        confidence: 0.65,
        icon: 'add_to_home_screen',
        timestamp: Date.now(),
        category: 'action',
      });
    }

    return suggestions;
  }

  /**
   * Génère des suggestions basées sur les préférences utilisateur
   */
  private generatePreferenceSuggestions(context: ContextItem): Suggestion[] {
    return []; // À implémenter
  }

  /**
   * Génère des suggestions basées sur l'état du système
   */
  private generateSystemStateSuggestions(context: ContextItem): Suggestion[] {
    return []; // À implémenter
  }

  /**
   * Récupère les suggestions actuelles
   */
  private getSuggestions(): AgentResult {
    // Filtre les suggestions périmées ou ignorées
    this.currentSuggestions = this.currentSuggestions.filter(
      s => !s.dismissed && (!s.expiresAt || s.expiresAt > Date.now())
    );

    return {
      success: true,
      output: {
        suggestions: this.currentSuggestions,
        count: this.currentSuggestions.length,
      },
    };
  }

  /**
   * Marque une suggestion comme ignorée
   */
  private dismissSuggestion(suggestionId?: string): AgentResult {
    if (!suggestionId) {
      return {
        success: false,
        error: 'ID de suggestion non fourni',
      };
    }

    const suggestionIndex = this.currentSuggestions.findIndex(s => s.id === suggestionId);
    if (suggestionIndex === -1) {
      return {
        success: false,
        error: `Suggestion non trouvée: ${suggestionId}`,
      };
    }

    this.currentSuggestions[suggestionIndex].dismissed = true;

    return {
      success: true,
      output: {
        dismissed: suggestionId,
        remainingCount: this.currentSuggestions.filter(s => !s.dismissed).length,
      },
    };
  }

  /**
   * Supprime toutes les suggestions
   */
  private clearSuggestions(): AgentResult {
    const previousCount = this.currentSuggestions.filter(s => !s.dismissed).length;
    this.currentSuggestions = [];

    return {
      success: true,
      output: {
        clearedCount: previousCount,
      },
    };
  }

  /**
   * Exécute une suggestion
   */
  private executeSuggestion(suggestionId?: string): AgentResult {
    if (!suggestionId) {
      return {
        success: false,
        error: 'ID de suggestion non fourni',
      };
    }

    const suggestion = this.currentSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      return {
        success: false,
        error: `Suggestion non trouvée: ${suggestionId}`,
      };
    }

    // Marque la suggestion comme traitée
    suggestion.dismissed = true;

    return {
      success: true,
      output: {
        executed: suggestionId,
        intent: suggestion.intent,
        parameters: suggestion.parameters,
      },
    };
  }
}
