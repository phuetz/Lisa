/**
 * 📊 Agent Stats Service - Statistiques dynamiques des agents
 * Collecte et agrège les métriques des agents en temps réel
 */

import { agentRegistry } from '../features/agents/core/registry';
import { getAgentCategory } from '../features/agents/core/registryEnhanced';

export interface AgentActivity {
  id: string;
  agentName: string;
  action: string;
  timestamp: Date;
  status: 'success' | 'pending' | 'error';
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentStatus {
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  tasksCompleted: number;
  lastActivity?: Date;
  successRate: number;
}

export interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  tasksCompleted: number;
  successRate: number;
  recentActivities: AgentActivity[];
  agentsStatus: AgentStatus[];
}

class AgentStatsServiceImpl {
  private activities: AgentActivity[] = [];
  private agentMetrics: Map<string, { tasks: number; successes: number; lastActivity?: Date }> = new Map();
  private maxActivities = 100;
  private listeners: Set<(stats: DashboardStats) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Enregistrer une activité d'agent
   */
  recordActivity(
    agentName: string,
    action: string,
    status: AgentActivity['status'],
    duration?: number,
    metadata?: Record<string, unknown>
  ): void {
    const activity: AgentActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentName,
      action,
      timestamp: new Date(),
      status,
      duration,
      metadata,
    };

    this.activities.unshift(activity);
    if (this.activities.length > this.maxActivities) {
      this.activities.pop();
    }

    // Mettre à jour les métriques
    const metrics = this.agentMetrics.get(agentName) || { tasks: 0, successes: 0 };
    metrics.tasks++;
    if (status === 'success') {
      metrics.successes++;
    }
    metrics.lastActivity = new Date();
    this.agentMetrics.set(agentName, metrics);

    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Obtenir les statistiques du dashboard
   */
  getStats(): DashboardStats {
    const availableAgents = agentRegistry.listAvailableAgentNames();
    const loadedAgents = agentRegistry.getAllAgents();

    // Calculer les agents actifs (ceux qui ont eu une activité récente)
    const now = Date.now();
    const activeThreshold = 30 * 60 * 1000; // 30 minutes
    let activeCount = 0;
    let totalTasks = 0;
    let totalSuccesses = 0;

    const agentsStatus: AgentStatus[] = availableAgents.slice(0, 10).map(name => {
      const metrics = this.agentMetrics.get(name);
      const isLoaded = loadedAgents.some(a => a.name === name);
      const isActive = metrics?.lastActivity && 
        (now - metrics.lastActivity.getTime()) < activeThreshold;

      if (isActive) activeCount++;
      if (metrics) {
        totalTasks += metrics.tasks;
        totalSuccesses += metrics.successes;
      }

      return {
        name,
        type: getAgentCategory(name) || 'tools',
        status: isActive ? 'active' : (isLoaded ? 'inactive' : 'inactive'),
        tasksCompleted: metrics?.tasks || 0,
        lastActivity: metrics?.lastActivity,
        successRate: metrics ? Math.round((metrics.successes / metrics.tasks) * 100) || 0 : 0,
      };
    });

    // Trier par activité récente
    agentsStatus.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return b.tasksCompleted - a.tasksCompleted;
    });

    const successRate = totalTasks > 0 ? Math.round((totalSuccesses / totalTasks) * 100) : 100;

    return {
      totalAgents: availableAgents.length,
      activeAgents: activeCount,
      tasksCompleted: totalTasks,
      successRate,
      recentActivities: this.activities.slice(0, 10),
      agentsStatus: agentsStatus.slice(0, 5),
    };
  }

  /**
   * Obtenir les activités récentes
   */
  getRecentActivities(limit: number = 10): AgentActivity[] {
    return this.activities.slice(0, limit);
  }

  /**
   * S'abonner aux mises à jour
   */
  subscribe(callback: (stats: DashboardStats) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifier les listeners
   */
  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(callback => callback(stats));
  }

  /**
   * Sauvegarder dans localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('lisa:agent-stats:activities', JSON.stringify(this.activities));
      localStorage.setItem('lisa:agent-stats:metrics', JSON.stringify(Array.from(this.agentMetrics.entries())));
    } catch (e) {
      console.error('Erreur sauvegarde stats agents:', e);
    }
  }

  /**
   * Charger depuis localStorage
   */
  private loadFromStorage(): void {
    try {
      const activities = localStorage.getItem('lisa:agent-stats:activities');
      const metrics = localStorage.getItem('lisa:agent-stats:metrics');

      if (activities) {
        this.activities = JSON.parse(activities).map((a: AgentActivity) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }));
      }
      if (metrics) {
        const entries = JSON.parse(metrics) as [string, { tasks: number; successes: number; lastActivity?: string }][];
        this.agentMetrics = new Map(
          entries.map(([key, value]) => [
            key,
            {
              ...value,
              lastActivity: value.lastActivity ? new Date(value.lastActivity) : undefined,
            },
          ])
        );
      }
    } catch (e) {
      console.error('Erreur chargement stats agents:', e);
    }
  }

  /**
   * Réinitialiser les statistiques
   */
  reset(): void {
    this.activities = [];
    this.agentMetrics.clear();
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Formater le temps relatif
   */
  formatRelativeTime(date: Date): string {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours}h`;
    return `${days}j`;
  }
}

// Exporter une instance singleton
export const agentStatsService = new AgentStatsServiceImpl();
