/**
 * context/ContextManager.ts
 * Implémentation du gestionnaire de contexte
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type ContextItem,
  type ContextType,
  ContextTypes,
  ContextPriority,
  ContextLifespan,
  type ContextQueryOptions,
  type ContextRelevanceMetric,
  type ContextStrategy,
  type SpecificContextItem
} from './types';

/**
 * Stratégie de contexte par défaut
 */
class DefaultContextStrategy implements ContextStrategy {
  name = 'DefaultStrategy';
  description = 'Stratégie par défaut pour la gestion du contexte';

  evaluateRelevance(item: ContextItem, currentInput: string): ContextRelevanceMetric {
    // Calcul simple basé sur l'âge, la priorité et les correspondances de texte
    const ageInMinutes = (Date.now() - item.timestamp) / (1000 * 60);
    const ageWeight = Math.max(0, 1 - ageInMinutes / 60); // Diminue avec le temps (1 heure max)
    
    let textMatchScore = 0;
    if (currentInput && typeof item.value === 'object') {
      const itemText = JSON.stringify(item.value).toLowerCase();
      const inputTerms = currentInput.toLowerCase().split(/\s+/);
      
      // Cherche des correspondances de termes
      inputTerms.forEach(term => {
        if (term.length > 3 && itemText.includes(term)) {
          textMatchScore += 0.2; // +0.2 pour chaque terme correspondant
        }
      });
    }
    
    // Applique la pondération basée sur la priorité
    const priorityWeight = item.priority / 5;
    
    // Calcule un score global
    const relevanceScore = Math.min(
      1, 
      (ageWeight * 0.3) + (priorityWeight * 0.4) + (textMatchScore * 0.3)
    );
    
    return {
      contextId: item.id,
      relevanceScore,
      reason: `Age: ${ageWeight.toFixed(2)}, Priority: ${priorityWeight.toFixed(2)}, TextMatch: ${textMatchScore.toFixed(2)}`,
      expirationWeight: ageWeight
    };
  }

  selectContextItems(items: ContextItem[], currentInput: string, maxItems: number): ContextItem[] {
    // Évalue la pertinence de chaque élément
    const evaluations = items.map(item => ({
      item,
      relevance: this.evaluateRelevance(item, currentInput)
    }));
    
    // Trie par score de pertinence décroissant
    evaluations.sort((a, b) => b.relevance.relevanceScore - a.relevance.relevanceScore);
    
    // Retourne les éléments les plus pertinents
    return evaluations.slice(0, maxItems).map(e => e.item);
  }

  mergeContextItems(items: ContextItem[]): ContextItem[] {
    // Regroupe les éléments par type
    const groupedByType: Record<string, ContextItem[]> = {};
    
    items.forEach(item => {
      if (!groupedByType[item.type]) {
        groupedByType[item.type] = [];
      }
      groupedByType[item.type].push(item);
    });
    
    const mergedItems: ContextItem[] = [];
    
    // Pour chaque groupe, essaie de fusionner les éléments similaires
    Object.values(groupedByType).forEach(typeItems => {
      // Stratégie simple: garde les items les plus récents et prioritaires
      if (typeItems.length === 1) {
        mergedItems.push(typeItems[0]);
        return;
      }
      
      // Pour les items multiples, vérifie s'ils peuvent être fusionnés
      const itemsBySource: Record<string, ContextItem[]> = {};
      typeItems.forEach(item => {
        const sourceKey = String(item.source);
        if (!itemsBySource[sourceKey]) {
          itemsBySource[sourceKey] = [];
        }
        itemsBySource[sourceKey].push(item);
      });
      
      // Prend l'élément le plus récent de chaque source
      Object.values(itemsBySource).forEach(sourceItems => {
        if (sourceItems.length === 1) {
          mergedItems.push(sourceItems[0]);
          return;
        }
        
        // Trie par timestamp décroissant
        sourceItems.sort((a, b) => b.timestamp - a.timestamp);
        
        // Si les éléments sont très proches dans le temps, tente de fusionner
        const latest = sourceItems[0];
        const timeClose = sourceItems.filter(item => 
          latest.timestamp - item.timestamp < 5 * 60 * 1000 // 5 minutes
        );
        
        if (timeClose.length > 1) {
          // Garde l'élément de priorité la plus élevée
          timeClose.sort((a, b) => b.priority - a.priority);
          mergedItems.push(timeClose[0]);
        } else {
          // Sinon, garde le plus récent
          mergedItems.push(latest);
        }
      });
    });
    
    return mergedItems;
  }

  pruneContextItems(items: ContextItem[]): ContextItem[] {
    const now = Date.now();
    
    // Supprime les éléments expirés
    return items.filter(item => {
      // Les éléments permanents ne sont jamais supprimés
      if (item.lifespan === ContextLifespan.PERMANENT) return true;
      
      // Si expiresAt est défini, vérifie s'il est dépassé
      if (item.expiresAt && item.expiresAt < now) return false;
      
      // Sinon, applique des règles basées sur le lifespan
      switch (item.lifespan) {
        case ContextLifespan.EPHEMERAL:
          return (now - item.timestamp) < 5 * 60 * 1000; // 5 minutes
        case ContextLifespan.SHORT_TERM:
          return (now - item.timestamp) < 24 * 60 * 60 * 1000; // 1 jour
        case ContextLifespan.MEDIUM_TERM:
          return (now - item.timestamp) < 7 * 24 * 60 * 60 * 1000; // 1 semaine
        case ContextLifespan.LONG_TERM:
          return (now - item.timestamp) < 30 * 24 * 60 * 60 * 1000; // 1 mois
        default:
          return true;
      }
    });
  }
}

/**
 * Gestionnaire principal du contexte
 */
export class ContextManager {
  private contextItems: ContextItem[] = [];
  private strategy: ContextStrategy;
  private maxContextSize = 1000; // Limite de taille du contexte
  
  constructor(strategy?: ContextStrategy) {
    this.strategy = strategy || new DefaultContextStrategy();
  }
  
  /**
   * Ajoute un nouvel élément de contexte
   */
  addContext(item: Omit<ContextItem, 'id' | 'timestamp'>): ContextItem {
    const newItem: ContextItem = {
      ...item,
      id: uuidv4(),
      timestamp: Date.now()
    };
    
    // Calcule expiresAt si non fourni
    if (!newItem.expiresAt) {
      switch (newItem.lifespan) {
        case ContextLifespan.EPHEMERAL:
          newItem.expiresAt = newItem.timestamp + 5 * 60 * 1000; // 5 minutes
          break;
        case ContextLifespan.SHORT_TERM:
          newItem.expiresAt = newItem.timestamp + 24 * 60 * 60 * 1000; // 1 jour
          break;
        case ContextLifespan.MEDIUM_TERM:
          newItem.expiresAt = newItem.timestamp + 7 * 24 * 60 * 60 * 1000; // 1 semaine
          break;
        case ContextLifespan.LONG_TERM:
          newItem.expiresAt = newItem.timestamp + 30 * 24 * 60 * 60 * 1000; // 1 mois
          break;
        case ContextLifespan.PERMANENT:
          // Pas d'expiration pour les contextes permanents
          break;
      }
    }
    
    this.contextItems.push(newItem);
    
    // Limite le nombre d'éléments de contexte
    if (this.contextItems.length > this.maxContextSize) {
      this.contextItems = this.strategy.selectContextItems(
        this.contextItems, 
        '', 
        this.maxContextSize
      );
    }
    
    return newItem;
  }
  
  /**
   * Récupère un élément de contexte par son ID
   */
  getContextById(id: string): ContextItem | undefined {
    return this.contextItems.find(item => item.id === id);
  }
  
  /**
   * Met à jour un élément de contexte existant
   */
  updateContext(id: string, updates: Partial<Omit<ContextItem, 'id' | 'type'>>): ContextItem | null {
    const index = this.contextItems.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    const updatedItem = {
      ...this.contextItems[index],
      ...updates,
      timestamp: Date.now() // Mise à jour de l'horodatage
    };
    
    this.contextItems[index] = updatedItem;
    return updatedItem;
  }
  
  /**
   * Supprime un élément de contexte
   */
  removeContext(id: string): boolean {
    const initialLength = this.contextItems.length;
    this.contextItems = this.contextItems.filter(item => item.id !== id);
    return this.contextItems.length < initialLength;
  }
  
  /**
   * Recherche des éléments de contexte selon des critères
   */
  queryContext(options: ContextQueryOptions = {}): ContextItem[] {
    let results = [...this.contextItems];
    
    // Applique les filtres
    if (options.types && options.types.length > 0) {
      results = results.filter(item => options.types!.includes(item.type));
    }
    
    if (options.sources && options.sources.length > 0) {
      results = results.filter(item => 
        options.sources!.some(source => source === item.source)
      );
    }
    
    if (options.minPriority) {
      results = results.filter(item => item.priority >= options.minPriority!);
    }
    
    if (options.tags && options.tags.length > 0) {
      results = results.filter(item => 
        options.tags!.some(tag => item.tags.includes(tag))
      );
    }
    
    if (options.fromTimestamp) {
      results = results.filter(item => item.timestamp >= options.fromTimestamp!);
    }
    
    if (options.toTimestamp) {
      results = results.filter(item => item.timestamp <= options.toTimestamp!);
    }
    
    if (!options.includeExpired) {
      results = results.filter(item => !item.expiresAt || item.expiresAt > Date.now());
    }
    
    if (options.searchText) {
      const searchLower = options.searchText.toLowerCase();
      results = results.filter(item => {
        const itemText = JSON.stringify(item.value).toLowerCase();
        return itemText.includes(searchLower);
      });
    }
    
    // Tri
    if (options.sortBy) {
      results.sort((a, b) => {
        let comparison = 0;
        if (options.sortBy === 'timestamp') {
          comparison = a.timestamp - b.timestamp;
        } else if (options.sortBy === 'priority') {
          comparison = a.priority - b.priority;
        }
        
        return options.sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    // Limite
    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }
  
  /**
   * Récupère le contexte le plus pertinent pour l'entrée actuelle
   */
  getRelevantContext(input: string, maxItems: number = 10): ContextItem[] {
    // Nettoie d'abord les contextes expirés
    this.contextItems = this.strategy.pruneContextItems(this.contextItems);
    
    // Sélectionne les éléments les plus pertinents
    const relevant = this.strategy.selectContextItems(
      this.contextItems,
      input,
      maxItems
    );
    
    return relevant;
  }
  
  /**
   * Ajoute un élément de contexte de conversation
   */
  addConversationContext(
    text: string, 
    role: 'user' | 'assistant', 
    metadata: { intent?: string; sentiment?: string; language?: string; } = {}
  ): ContextItem {
    return this.addContext({
      type: ContextTypes.CONVERSATION,
      value: {
        text,
        role,
        intent: metadata.intent,
        sentiment: metadata.sentiment,
        language: metadata.language
      },
      source: role === 'user' ? 'user' : 'lisa',
      priority: role === 'user' ? ContextPriority.HIGH : ContextPriority.MEDIUM,
      lifespan: ContextLifespan.MEDIUM_TERM,
      tags: ['conversation', role]
    });
  }
  
  /**
   * Ajoute un élément de contexte d'entité
   */
  addEntityContext(
    entityType: string,
    name: string,
    attributes: Record<string, any> = {},
    references: string[] = []
  ): ContextItem {
    return this.addContext({
      type: ContextTypes.ENTITY,
      value: {
        entityType,
        name,
        attributes,
        references
      },
      source: 'context_manager',
      priority: ContextPriority.MEDIUM,
      lifespan: ContextLifespan.MEDIUM_TERM,
      tags: ['entity', entityType]
    });
  }
  
  /**
   * Ajoute un élément de contexte d'intention
   */
  addIntentContext(
    intent: string,
    parameters: Record<string, any> = {},
    fulfilled: boolean = false,
    followUpIntent?: string
  ): ContextItem {
    return this.addContext({
      type: ContextTypes.INTENT_HISTORY,
      value: {
        intent,
        parameters,
        fulfilled,
        timestamp: Date.now(),
        followUpIntent
      },
      source: 'intent_handler',
      priority: ContextPriority.HIGH,
      lifespan: ContextLifespan.SHORT_TERM,
      tags: ['intent', intent]
    });
  }
  
  /**
   * Fusionne les contextes similaires
   */
  mergeContexts(): void {
    this.contextItems = this.strategy.mergeContextItems(this.contextItems);
  }
  
  /**
   * Nettoie les contextes expirés
   */
  pruneContexts(): void {
    this.contextItems = this.strategy.pruneContextItems(this.contextItems);
  }
  
  /**
   * Récupère les statistiques du contexte
   */
  getStats(): {
    totalItems: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byLifespan: Record<string, number>;
  } {
    const stats = {
      totalItems: this.contextItems.length,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byLifespan: {} as Record<string, number>
    };
    
    this.contextItems.forEach(item => {
      // Compte par type
      if (!stats.byType[item.type]) {
        stats.byType[item.type] = 0;
      }
      stats.byType[item.type]++;
      
      // Compte par priorité
      const priorityKey = `priority_${item.priority}`;
      if (!stats.byPriority[priorityKey]) {
        stats.byPriority[priorityKey] = 0;
      }
      stats.byPriority[priorityKey]++;
      
      // Compte par lifespan
      if (!stats.byLifespan[item.lifespan]) {
        stats.byLifespan[item.lifespan] = 0;
      }
      stats.byLifespan[item.lifespan]++;
    });
    
    return stats;
  }
  
  /**
   * Exporte tous les éléments de contexte
   */
  exportContexts(): ContextItem[] {
    return [...this.contextItems];
  }
  
  /**
   * Importe des éléments de contexte
   */
  importContexts(items: ContextItem[]): void {
    // Fusionne avec les contextes existants
    const newItems = items.filter(newItem => 
      !this.contextItems.some(existingItem => existingItem.id === newItem.id)
    );
    
    this.contextItems = [...this.contextItems, ...newItems];
    
    // Applique la stratégie de fusion
    this.mergeContexts();
    
    // Limite la taille
    if (this.contextItems.length > this.maxContextSize) {
      this.contextItems = this.strategy.selectContextItems(
        this.contextItems, 
        '', 
        this.maxContextSize
      );
    }
  }
  
  /**
   * Nettoie tous les contextes
   */
  clearContexts(types?: ContextType[]): void {
    if (!types) {
      this.contextItems = [];
    } else {
      this.contextItems = this.contextItems.filter(
        item => !types.includes(item.type)
      );
    }
  }
}
