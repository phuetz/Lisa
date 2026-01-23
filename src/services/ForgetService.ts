/**
 * 🗑️ Forget Service - Forget API Complète
 * Gère la suppression granulaire des données avec audit complet
 */

import { memoryService } from './MemoryService';
import { auditActions } from './AuditService';

export interface ForgetRequest {
  id: string;
  scope: 'conversation' | 'document' | 'preference' | 'fact' | 'context' | 'all';
  reason?: string;
  timestamp: string;
  userId?: string;
}

export interface ForgetResult {
  requestId: string;
  scope: string;
  itemsDeleted: number;
  dataSize: number; // bytes
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  message: string;
}

export interface ForgetHistory {
  requests: ForgetRequest[];
  results: ForgetResult[];
  stats: ForgetStats;
}

export interface ForgetStats {
  totalRequests: number;
  totalDeleted: number;
  totalDataRemoved: number; // bytes
  byScope: Record<string, number>;
  oldestRequest: string;
  newestRequest: string;
}

class ForgetServiceImpl {
  private forgetHistory: ForgetRequest[] = [];
  private forgetResults: ForgetResult[] = [];
  private maxHistory = 500;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Oublier des données
   */
  async forget(
    scope: ForgetRequest['scope'],
    reason?: string,
    userId?: string
  ): Promise<ForgetResult> {
    const requestId = `forget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    try {
      // Créer la requête
      const request: ForgetRequest = {
        id: requestId,
        scope,
        reason,
        timestamp,
        userId
      };

      // Obtenir les statistiques avant suppression
      const statsBefore = memoryService.getStats();
      const sizeBefore = statsBefore.totalSize;

      // Exécuter la suppression
      const itemsDeleted = memoryService.forgetMemories(scope);

      // Obtenir les statistiques après suppression
      const statsAfter = memoryService.getStats();
      const sizeAfter = statsAfter.totalSize;
      const dataSize = Math.max(0, sizeBefore - sizeAfter);

      // Créer le résultat
      const result: ForgetResult = {
        requestId,
        scope,
        itemsDeleted,
        dataSize,
        timestamp,
        status: itemsDeleted > 0 ? 'success' : 'partial',
        message: `${itemsDeleted} items deleted, ${dataSize} bytes removed`
      };

      // Enregistrer
      this.forgetHistory.push(request);
      this.forgetResults.push(result);

      // Limiter l'historique
      if (this.forgetHistory.length > this.maxHistory) {
        this.forgetHistory.shift();
        this.forgetResults.shift();
      }

      this.saveToStorage();

      // Audit
      auditActions.dataDeleted(scope, itemsDeleted);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      const result: ForgetResult = {
        requestId,
        scope,
        itemsDeleted: 0,
        dataSize: 0,
        timestamp,
        status: 'failed',
        message: `Erreur: ${errorMsg}`
      };

      this.forgetResults.push(result);
      this.saveToStorage();

      auditActions.errorOccurred(`Forget operation failed: ${errorMsg}`, { scope });

      return result;
    }
  }

  /**
   * Oublier les conversations
   */
  async forgetConversations(reason?: string): Promise<ForgetResult> {
    return this.forget('conversation', reason);
  }

  /**
   * Oublier les documents
   */
  async forgetDocuments(reason?: string): Promise<ForgetResult> {
    return this.forget('document', reason);
  }

  /**
   * Oublier les préférences
   */
  async forgetPreferences(reason?: string): Promise<ForgetResult> {
    return this.forget('preference', reason);
  }

  /**
   * Oublier les faits
   */
  async forgetFacts(reason?: string): Promise<ForgetResult> {
    return this.forget('fact', reason);
  }

  /**
   * Oublier le contexte
   */
  async forgetContext(reason?: string): Promise<ForgetResult> {
    return this.forget('context', reason);
  }

  /**
   * Oublier tout
   */
  async forgetAll(reason?: string): Promise<ForgetResult> {
    return this.forget('all', reason || 'User requested complete data deletion');
  }

  /**
   * Obtenir l'historique des oublis
   */
  getForgetHistory(limit: number = 50): ForgetRequest[] {
    return this.forgetHistory.slice(-limit).reverse();
  }

  /**
   * Obtenir les résultats des oublis
   */
  getForgetResults(limit: number = 50): ForgetResult[] {
    return this.forgetResults.slice(-limit).reverse();
  }

  /**
   * Obtenir les statistiques
   */
  getStats(): ForgetStats {
    const byScope: Record<string, number> = {};

    this.forgetResults.forEach(result => {
      byScope[result.scope] = (byScope[result.scope] || 0) + result.itemsDeleted;
    });

    const totalDeleted = this.forgetResults.reduce((sum, r) => sum + r.itemsDeleted, 0);
    const totalDataRemoved = this.forgetResults.reduce((sum, r) => sum + r.dataSize, 0);

    return {
      totalRequests: this.forgetHistory.length,
      totalDeleted,
      totalDataRemoved,
      byScope,
      oldestRequest: this.forgetHistory.length > 0 ? this.forgetHistory[0].timestamp : '',
      newestRequest: this.forgetHistory.length > 0 ? this.forgetHistory[this.forgetHistory.length - 1].timestamp : ''
    };
  }

  /**
   * Obtenir l'historique complet
   */
  getFullHistory(): ForgetHistory {
    return {
      requests: this.forgetHistory,
      results: this.forgetResults,
      stats: this.getStats()
    };
  }

  /**
   * Exporter l'historique des oublis
   */
  exportForgetHistory() {
    return {
      exportDate: new Date().toISOString(),
      history: this.getFullHistory()
    };
  }

  /**
   * Vérifier si une suppression a réussi
   */
  wasSuccessful(requestId: string): boolean {
    const result = this.forgetResults.find(r => r.requestId === requestId);
    return result?.status === 'success' || false;
  }

  /**
   * Obtenir le résultat d'une requête
   */
  getResult(requestId: string): ForgetResult | undefined {
    return this.forgetResults.find(r => r.requestId === requestId);
  }

  /**
   * Sauvegarder dans localStorage
   */
  private saveToStorage(): void {
    localStorage.setItem('lisa:forget:history', JSON.stringify(this.forgetHistory));
    localStorage.setItem('lisa:forget:results', JSON.stringify(this.forgetResults));
  }

  /**
   * Charger depuis localStorage
   */
  private loadFromStorage(): void {
    try {
      const history = localStorage.getItem('lisa:forget:history');
      const results = localStorage.getItem('lisa:forget:results');

      if (history) this.forgetHistory = JSON.parse(history);
      if (results) this.forgetResults = JSON.parse(results);
    } catch (e) {
      console.error('Erreur chargement forget history:', e);
    }
  }

  /**
   * Nettoyer l'historique ancien
   */
  cleanupOldHistory(daysOld: number = 90): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const beforeCount = this.forgetHistory.length;

    this.forgetHistory = this.forgetHistory.filter(
      req => new Date(req.timestamp) > cutoffDate
    );

    this.forgetResults = this.forgetResults.filter(
      res => new Date(res.timestamp) > cutoffDate
    );

    const removed = beforeCount - this.forgetHistory.length;
    this.saveToStorage();

    return removed;
  }

  /**
   * Réinitialiser complètement (pour tests)
   */
  reset(): void {
    this.forgetHistory = [];
    this.forgetResults = [];
    localStorage.removeItem('lisa:forget:history');
    localStorage.removeItem('lisa:forget:results');
  }
}

// Exporter une instance singleton
export const forgetService = new ForgetServiceImpl();
