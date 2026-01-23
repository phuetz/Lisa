/**
 * 💭 Memory Service - Gestion de la Mémoire de Lisa
 * Court-terme (contexte), Long-terme (persistance), Oubli (forget API)
 */

import { auditActions } from './AuditService';

export interface Memory {
  id: string;
  type: 'conversation' | 'document' | 'fact' | 'preference' | 'context';
  content: string;
  source: string;
  timestamp: string;
  relevance: number; // 0-100
  tags: string[];
  embedding?: number[]; // Pour RAG
  metadata?: Record<string, unknown>;
}

export interface MemoryContext {
  shortTerm: Memory[];
  longTerm: Memory[];
  stats: MemoryStats;
}

export interface MemoryStats {
  totalMemories: number;
  byType: Record<string, number>;
  averageRelevance: number;
  oldestMemory: string;
  newestMemory: string;
  totalSize: number; // bytes
}

class MemoryServiceImpl {
  private shortTermMemory: Memory[] = [];
  private longTermMemory: Memory[] = [];
  private maxShortTerm = 100; // Garder les 100 derniers
  private maxLongTerm = 1000; // Garder les 1000 derniers

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Créer un souvenir
   */
  createMemory(
    type: Memory['type'],
    content: string,
    source: string,
    tags: string[] = [],
    metadata?: Record<string, unknown>
  ): Memory {
    const memory: Memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      source,
      timestamp: new Date().toISOString(),
      relevance: this.calculateRelevance(type, content),
      tags,
      metadata
    };

    // Ajouter à la mémoire court-terme
    this.shortTermMemory.push(memory);

    // Garder seulement les maxShortTerm derniers
    if (this.shortTermMemory.length > this.maxShortTerm) {
      const removed = this.shortTermMemory.shift();
      if (removed) {
        // Promouvoir en long-terme si pertinent
        if (removed.relevance > 50) {
          this.promoteToLongTerm(removed);
        }
      }
    }

    this.saveToStorage();
    auditActions.memoryCreated(type, content);

    return memory;
  }

  /**
   * Promouvoir en mémoire long-terme
   */
  private promoteToLongTerm(memory: Memory): void {
    this.longTermMemory.push(memory);

    if (this.longTermMemory.length > this.maxLongTerm) {
      this.longTermMemory.shift();
    }
  }

  /**
   * Récupérer les souvenirs pertinents
   */
  getRelevantMemories(query: string, limit: number = 10): Memory[] {
    const allMemories = [...this.shortTermMemory, ...this.longTermMemory];

    // Scorer les souvenirs par pertinence
    const scored = allMemories.map(memory => ({
      memory,
      score: this.scoreRelevance(memory, query)
    }));

    // Trier par score et retourner les top N
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.memory);
  }

  /**
   * Scorer la pertinence d'un souvenir par rapport à une requête
   */
  private scoreRelevance(memory: Memory, query: string): number {
    let score = memory.relevance;

    // Bonus si les tags correspondent
    const queryTags = query.toLowerCase().split(' ');
    const matchingTags = memory.tags.filter(tag =>
      queryTags.some(q => tag.toLowerCase().includes(q))
    ).length;
    score += matchingTags * 10;

    // Bonus si le contenu correspond
    if (memory.content.toLowerCase().includes(query.toLowerCase())) {
      score += 20;
    }

    // Bonus si c'est récent
    const ageInHours = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60);
    if (ageInHours < 24) score += 15;
    if (ageInHours < 1) score += 25;

    return Math.min(100, score);
  }

  /**
   * Calculer la pertinence initiale
   */
  private calculateRelevance(type: Memory['type'], content: string): number {
    let relevance = 50; // Base

    // Bonus par type
    switch (type) {
      case 'preference':
        relevance = 80;
        break;
      case 'fact':
        relevance = 70;
        break;
      case 'conversation':
        relevance = 60;
        break;
      case 'document':
        relevance = 65;
        break;
      case 'context':
        relevance = 40;
        break;
    }

    // Bonus si le contenu est long (plus d'information)
    if (content.length > 500) relevance += 10;
    if (content.length > 1000) relevance += 5;

    return Math.min(100, relevance);
  }

  /**
   * Oublier des souvenirs (Forget API)
   */
  forgetMemories(scope: 'conversation' | 'document' | 'preference' | 'fact' | 'context' | 'all', count?: number): number {
    let removed = 0;

    if (scope === 'all') {
      removed = this.shortTermMemory.length + this.longTermMemory.length;
      this.shortTermMemory = [];
      this.longTermMemory = [];
    } else {
      // Filtrer par type
      const type = scope as Memory['type'];

      const shortTermBefore = this.shortTermMemory.length;
      this.shortTermMemory = this.shortTermMemory.filter(m => m.type !== type);
      removed += shortTermBefore - this.shortTermMemory.length;

      const longTermBefore = this.longTermMemory.length;
      this.longTermMemory = this.longTermMemory.filter(m => m.type !== type);
      removed += longTermBefore - this.longTermMemory.length;

      // Limiter le nombre si spécifié
      if (count && removed > count) {
        removed = count;
      }
    }

    this.saveToStorage();
    auditActions.memoryDeleted(scope, removed);

    return removed;
  }

  /**
   * Obtenir les statistiques
   */
  getStats(): MemoryStats {
    const allMemories = [...this.shortTermMemory, ...this.longTermMemory];
    const byType: Record<string, number> = {};
    let totalSize = 0;

    allMemories.forEach(memory => {
      byType[memory.type] = (byType[memory.type] || 0) + 1;
      totalSize += new Blob([JSON.stringify(memory)]).size;
    });

    const averageRelevance = allMemories.length > 0
      ? Math.round(allMemories.reduce((sum, m) => sum + m.relevance, 0) / allMemories.length)
      : 0;

    return {
      totalMemories: allMemories.length,
      byType,
      averageRelevance,
      oldestMemory: allMemories.length > 0 ? allMemories[0].timestamp : '',
      newestMemory: allMemories.length > 0 ? allMemories[allMemories.length - 1].timestamp : '',
      totalSize
    };
  }

  /**
   * Obtenir le contexte actuel
   */
  getContext(): MemoryContext {
    return {
      shortTerm: this.shortTermMemory,
      longTerm: this.longTermMemory,
      stats: this.getStats()
    };
  }

  /**
   * Sauvegarder dans localStorage
   */
  private saveToStorage(): void {
    localStorage.setItem('lisa:memory:short-term', JSON.stringify(this.shortTermMemory));
    localStorage.setItem('lisa:memory:long-term', JSON.stringify(this.longTermMemory));
  }

  /**
   * Charger depuis localStorage
   */
  private loadFromStorage(): void {
    try {
      const shortTerm = localStorage.getItem('lisa:memory:short-term');
      const longTerm = localStorage.getItem('lisa:memory:long-term');

      if (shortTerm) this.shortTermMemory = JSON.parse(shortTerm);
      if (longTerm) this.longTermMemory = JSON.parse(longTerm);
    } catch (e) {
      console.error('Erreur chargement mémoire:', e);
    }
  }

  /**
   * Exporter la mémoire
   */
  exportMemory() {
    return {
      exportDate: new Date().toISOString(),
      shortTerm: this.shortTermMemory,
      longTerm: this.longTermMemory,
      stats: this.getStats()
    };
  }

  /**
   * Importer la mémoire
   */
  importMemory(data: ReturnType<typeof this.exportMemory>): void {
    this.shortTermMemory = data.shortTerm;
    this.longTermMemory = data.longTerm;
    this.saveToStorage();
  }

  /**
   * Nettoyer les souvenirs obsolètes
   */
  cleanupOldMemories(daysOld: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const beforeCount = this.shortTermMemory.length + this.longTermMemory.length;

    this.shortTermMemory = this.shortTermMemory.filter(
      m => new Date(m.timestamp) > cutoffDate
    );
    this.longTermMemory = this.longTermMemory.filter(
      m => new Date(m.timestamp) > cutoffDate
    );

    const removed = beforeCount - (this.shortTermMemory.length + this.longTermMemory.length);
    this.saveToStorage();

    return removed;
  }
}

// Exporter une instance singleton
export const memoryService = new MemoryServiceImpl();
