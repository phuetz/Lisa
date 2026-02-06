/**
 * 💡 Proactive Suggestions Service - Assistant Proactif
 * Suggestions basées sur l'historique, le contexte et les patterns utilisateur
 */

import { memoryService } from './MemoryService';

export interface Suggestion {
  id: string;
  type: 'reminder' | 'task' | 'insight' | 'recommendation' | 'alert';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  context?: Record<string, unknown>;
  action?: {
    label: string;
    intent: string;
    payload?: Record<string, unknown>;
  };
  dismissed?: boolean;
  expiresAt?: Date;
}

export interface UserPattern {
  type: string;
  frequency: number;
  lastOccurrence: Date;
  averageTime?: string;
  metadata?: Record<string, unknown>;
}

class ProactiveSuggestionsServiceImpl {
  private suggestions: Suggestion[] = [];
  private patterns: Map<string, UserPattern> = new Map();
  private listeners: Set<(suggestions: Suggestion[]) => void> = new Set();
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Démarrer la surveillance proactive
   */
  start(): void {
    if (this.checkInterval) return;
    
    // Vérifier toutes les 5 minutes
    this.checkInterval = setInterval(() => {
      this.analyzeAndSuggest();
    }, 5 * 60 * 1000);

    // Analyse initiale
    this.analyzeAndSuggest();
  }

  /**
   * Arrêter la surveillance
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Analyser le contexte et générer des suggestions
   */
  analyzeAndSuggest(): void {
    const now = new Date();
    const hour = now.getHours();

    // Suggestions basées sur l'heure
    this.checkTimeBasedSuggestions(hour);

    // Suggestions basées sur la mémoire
    this.checkMemoryBasedSuggestions();

    // Suggestions basées sur les patterns
    this.checkPatternBasedSuggestions();

    // Nettoyer les suggestions expirées
    this.cleanExpiredSuggestions();

    this.notifyListeners();
  }

  /**
   * Suggestions basées sur l'heure
   */
  private checkTimeBasedSuggestions(hour: number): void {
    // Rappel matinal
    if (hour >= 8 && hour < 9) {
      this.addSuggestionIfNotExists({
        type: 'reminder',
        title: 'Bonjour ! 🌅',
        description: 'Voulez-vous voir votre agenda pour aujourd\'hui ?',
        priority: 'medium',
        action: {
          label: 'Voir l\'agenda',
          intent: 'show_calendar',
        },
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2h
      });
    }

    // Rappel pause déjeuner
    if (hour >= 12 && hour < 13) {
      this.addSuggestionIfNotExists({
        type: 'reminder',
        title: 'Pause déjeuner 🍽️',
        description: 'N\'oubliez pas de faire une pause !',
        priority: 'low',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
      });
    }

    // Rappel fin de journée
    if (hour >= 17 && hour < 18) {
      this.addSuggestionIfNotExists({
        type: 'insight',
        title: 'Résumé de la journée 📊',
        description: 'Voulez-vous voir un résumé de vos activités ?',
        priority: 'low',
        action: {
          label: 'Voir le résumé',
          intent: 'show_daily_summary',
        },
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      });
    }
  }

  /**
   * Suggestions basées sur la mémoire
   */
  private checkMemoryBasedSuggestions(): void {
    const context = memoryService.getContext();
    
    // Si beaucoup de conversations récentes sur un sujet
    const recentMemories = context.shortTerm.filter(
      m => m.type === 'conversation' && 
      Date.now() - new Date(m.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    if (recentMemories.length > 5) {
      // Analyser les tags fréquents
      const tagCounts: Record<string, number> = {};
      recentMemories.forEach(m => {
        m.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      const topTag = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)[0];

      if (topTag && topTag[1] >= 3) {
        this.addSuggestionIfNotExists({
          type: 'insight',
          title: `Sujet fréquent: ${topTag[0]}`,
          description: `Vous avez beaucoup parlé de "${topTag[0]}" récemment. Voulez-vous créer un résumé ?`,
          priority: 'low',
          action: {
            label: 'Créer un résumé',
            intent: 'summarize_topic',
            payload: { topic: topTag[0] },
          },
        });
      }
    }
  }

  /**
   * Suggestions basées sur les patterns utilisateur
   */
  private checkPatternBasedSuggestions(): void {
    this.patterns.forEach((pattern, key) => {
      const daysSinceLastOccurrence = 
        (Date.now() - pattern.lastOccurrence.getTime()) / (24 * 60 * 60 * 1000);

      // Si une action habituelle n'a pas été faite depuis longtemps
      if (pattern.frequency > 3 && daysSinceLastOccurrence > 7) {
        this.addSuggestionIfNotExists({
          type: 'recommendation',
          title: `Action habituelle manquée`,
          description: `Vous n'avez pas fait "${key}" depuis ${Math.floor(daysSinceLastOccurrence)} jours.`,
          priority: 'low',
          action: {
            label: 'Faire maintenant',
            intent: key,
          },
        });
      }
    });
  }

  /**
   * Enregistrer un pattern utilisateur
   */
  recordPattern(type: string, metadata?: Record<string, unknown>): void {
    const existing = this.patterns.get(type);
    
    if (existing) {
      existing.frequency++;
      existing.lastOccurrence = new Date();
      if (metadata) existing.metadata = { ...existing.metadata, ...metadata };
    } else {
      this.patterns.set(type, {
        type,
        frequency: 1,
        lastOccurrence: new Date(),
        metadata,
      });
    }

    this.saveToStorage();
  }

  /**
   * Ajouter une suggestion si elle n'existe pas déjà
   */
  private addSuggestionIfNotExists(suggestion: Omit<Suggestion, 'id' | 'timestamp'>): void {
    const exists = this.suggestions.some(
      s => s.title === suggestion.title && !s.dismissed
    );

    if (!exists) {
      this.suggestions.unshift({
        ...suggestion,
        id: `sug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Ajouter une suggestion personnalisée
   */
  addSuggestion(suggestion: Omit<Suggestion, 'id' | 'timestamp'>): Suggestion {
    const newSuggestion: Suggestion = {
      ...suggestion,
      id: `sug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.suggestions.unshift(newSuggestion);
    this.saveToStorage();
    this.notifyListeners();

    return newSuggestion;
  }

  /**
   * Obtenir les suggestions actives
   */
  getActiveSuggestions(): Suggestion[] {
    return this.suggestions.filter(s => !s.dismissed);
  }

  /**
   * Dismisser une suggestion
   */
  dismissSuggestion(id: string): void {
    const suggestion = this.suggestions.find(s => s.id === id);
    if (suggestion) {
      suggestion.dismissed = true;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Nettoyer les suggestions expirées
   */
  private cleanExpiredSuggestions(): void {
    const now = Date.now();
    this.suggestions = this.suggestions.filter(s => {
      if (s.expiresAt && new Date(s.expiresAt).getTime() < now) {
        return false;
      }
      return true;
    });
  }

  /**
   * S'abonner aux changements
   */
  subscribe(callback: (suggestions: Suggestion[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifier les listeners
   */
  private notifyListeners(): void {
    const active = this.getActiveSuggestions();
    this.listeners.forEach(callback => callback(active));
  }

  /**
   * Sauvegarder dans localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('lisa:proactive:suggestions', JSON.stringify(this.suggestions));
      localStorage.setItem('lisa:proactive:patterns', JSON.stringify(Array.from(this.patterns.entries())));
    } catch (e) {
      console.error('Erreur sauvegarde suggestions:', e);
    }
  }

  /**
   * Charger depuis localStorage
   */
  private loadFromStorage(): void {
    try {
      const suggestions = localStorage.getItem('lisa:proactive:suggestions');
      const patterns = localStorage.getItem('lisa:proactive:patterns');

      if (suggestions) {
        this.suggestions = JSON.parse(suggestions).map((s: Suggestion) => ({
          ...s,
          timestamp: new Date(s.timestamp),
          expiresAt: s.expiresAt ? new Date(s.expiresAt) : undefined,
        }));
      }
      if (patterns) {
        const entries = JSON.parse(patterns) as [string, UserPattern][];
        this.patterns = new Map(
          entries.map(([key, value]) => [
            key,
            { ...value, lastOccurrence: new Date(value.lastOccurrence) },
          ])
        );
      }
    } catch (e) {
      console.error('Erreur chargement suggestions:', e);
    }
  }
}

// Export singleton
let proactiveSuggestionsServiceInstance: ProactiveSuggestionsServiceImpl | null = null;

try {
  proactiveSuggestionsServiceInstance = new ProactiveSuggestionsServiceImpl();
} catch (error) {
  console.error('[ProactiveSuggestions] Failed to initialize:', error);
  // Create a minimal stub to prevent import errors
  proactiveSuggestionsServiceInstance = {
    initialize: () => console.warn('[ProactiveSuggestions] Service not available'),
    start: () => {},
    stop: () => {},
  } as unknown as ProactiveSuggestionsServiceImpl;
}

export const proactiveSuggestionsService = proactiveSuggestionsServiceInstance;
