/**
 * Agent Notification Service
 * Intègre les agents avec le système de notifications
 */

import { pushNotificationService } from './pushNotificationService';
import { agentRegistry } from '../features/agents/core/registry';

export interface AgentNotification {
  id: string;
  agentName: string;
  type: 'result' | 'progress' | 'error' | 'suggestion';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
  timestamp: Date;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: 'open_chat' | 'run_agent' | 'dismiss' | 'custom';
  payload?: string;
}

export interface AgentTask {
  id: string;
  agentName: string;
  query: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
  startTime: Date;
  endTime?: Date;
}

type TaskListener = (task: AgentTask) => void;

class AgentNotificationServiceImpl {
  private activeTasks: Map<string, AgentTask> = new Map();
  private taskListeners: Set<TaskListener> = new Set();
  private notificationHistory: AgentNotification[] = [];
  private readonly MAX_HISTORY = 50;

  /**
   * Execute an agent in background and notify on completion
   */
  async executeWithNotification(
    agentName: string,
    query: string,
    options: {
      notifyOnStart?: boolean;
      notifyOnProgress?: boolean;
      notifyOnComplete?: boolean;
      notifyOnError?: boolean;
    } = {}
  ): Promise<AgentTask> {
    const {
      notifyOnStart = false,
      notifyOnProgress = false,
      notifyOnComplete = true,
      notifyOnError = true,
    } = options;

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task: AgentTask = {
      id: taskId,
      agentName,
      query,
      status: 'pending',
      startTime: new Date(),
    };

    this.activeTasks.set(taskId, task);
    this.notifyListeners(task);

    // Notify start
    if (notifyOnStart) {
      await this.sendNotification({
        id: `${taskId}_start`,
        agentName,
        type: 'progress',
        title: `${agentName} en cours`,
        body: `Traitement de: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`,
        timestamp: new Date(),
      });
    }

    try {
      // Update status to running
      task.status = 'running';
      this.notifyListeners(task);

      // Execute agent
      const result = await agentRegistry.execute(agentName, { query });

      // Update task with result
      task.status = 'completed';
      task.result = result;
      task.endTime = new Date();
      this.notifyListeners(task);

      // Notify completion
      if (notifyOnComplete) {
        const duration = task.endTime.getTime() - task.startTime.getTime();
        await this.sendNotification({
          id: `${taskId}_complete`,
          agentName,
          type: 'result',
          title: `${agentName} terminé`,
          body: this.formatResultPreview(result),
          data: { taskId, duration },
          actions: [
            { id: 'view', label: 'Voir', action: 'open_chat', payload: taskId },
            { id: 'dismiss', label: 'Fermer', action: 'dismiss' },
          ],
          timestamp: new Date(),
        });
      }

      return task;
    } catch (error) {
      // Update task with error
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Erreur inconnue';
      task.endTime = new Date();
      this.notifyListeners(task);

      // Notify error
      if (notifyOnError) {
        await this.sendNotification({
          id: `${taskId}_error`,
          agentName,
          type: 'error',
          title: `${agentName} - Erreur`,
          body: task.error,
          data: { taskId },
          actions: [
            { id: 'retry', label: 'Réessayer', action: 'run_agent', payload: JSON.stringify({ agentName, query }) },
            { id: 'dismiss', label: 'Fermer', action: 'dismiss' },
          ],
          timestamp: new Date(),
        });
      }

      return task;
    } finally {
      // Clean up after some time
      setTimeout(() => {
        this.activeTasks.delete(taskId);
      }, 5 * 60 * 1000); // Keep for 5 minutes
    }
  }

  /**
   * Format result for notification preview
   */
  private formatResultPreview(result: unknown): string {
    if (!result) return 'Aucun résultat';

    if (typeof result === 'string') {
      return result.substring(0, 100) + (result.length > 100 ? '...' : '');
    }

    if (typeof result === 'object') {
      const obj = result as Record<string, unknown>;
      if (obj.success !== undefined) {
        return obj.success ? 'Opération réussie' : 'Opération échouée';
      }
      if (obj.output) {
        return String(obj.output).substring(0, 100);
      }
      if (obj.message) {
        return String(obj.message).substring(0, 100);
      }
    }

    return 'Résultat disponible';
  }

  /**
   * Send an agent notification
   */
  private async sendNotification(notification: AgentNotification) {
    // Add to history
    this.notificationHistory.unshift(notification);
    if (this.notificationHistory.length > this.MAX_HISTORY) {
      this.notificationHistory = this.notificationHistory.slice(0, this.MAX_HISTORY);
    }

    // Send via push notification service
    try {
      await pushNotificationService.showLocalNotification({
        title: notification.title,
        body: notification.body,
        data: {
          type: 'agent',
          agentName: notification.agentName,
          notificationType: notification.type,
          ...notification.data,
        },
      });
    } catch (error) {
      console.error('[AgentNotifications] Failed to send:', error);
    }
  }

  /**
   * Get active tasks
   */
  getActiveTasks(): AgentTask[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): AgentTask | undefined {
    return this.activeTasks.get(taskId);
  }

  /**
   * Get notification history
   */
  getHistory(): AgentNotification[] {
    return [...this.notificationHistory];
  }

  /**
   * Clear notification history
   */
  clearHistory() {
    this.notificationHistory = [];
  }

  /**
   * Subscribe to task updates
   */
  subscribe(listener: TaskListener): () => void {
    this.taskListeners.add(listener);
    return () => this.taskListeners.delete(listener);
  }

  /**
   * Notify all listeners of task update
   */
  private notifyListeners(task: AgentTask) {
    this.taskListeners.forEach(listener => {
      try {
        listener(task);
      } catch (error) {
        console.error('[AgentNotifications] Listener error:', error);
      }
    });
  }

  /**
   * Send a suggestion notification from an agent
   */
  async sendAgentSuggestion(
    agentName: string,
    suggestion: {
      title: string;
      body: string;
      query?: string;
    }
  ) {
    await this.sendNotification({
      id: `suggestion_${Date.now()}`,
      agentName,
      type: 'suggestion',
      title: suggestion.title,
      body: suggestion.body,
      actions: suggestion.query
        ? [
            { id: 'try', label: 'Essayer', action: 'open_chat', payload: suggestion.query },
            { id: 'dismiss', label: 'Plus tard', action: 'dismiss' },
          ]
        : undefined,
      timestamp: new Date(),
    });
  }

  /**
   * Notify about available agents based on user context
   */
  async suggestRelevantAgent(context: { query?: string; topic?: string }) {
    // Suggest agents based on context
    const suggestions: { agent: string; reason: string; query: string }[] = [];

    if (context.query?.toLowerCase().includes('recherche') || context.topic?.includes('research')) {
      suggestions.push({
        agent: 'ResearchAgent',
        reason: 'Pour des recherches approfondies',
        query: context.query || 'Recherche sur ' + context.topic,
      });
    }

    if (context.query?.toLowerCase().includes('données') || context.query?.toLowerCase().includes('analyse')) {
      suggestions.push({
        agent: 'DataAnalystAgent',
        reason: 'Pour analyser vos données',
        query: context.query || 'Analyse de données',
      });
    }

    if (context.query?.toLowerCase().includes('marketing') || context.query?.toLowerCase().includes('contenu')) {
      suggestions.push({
        agent: 'CreativeMarketingAgent',
        reason: 'Pour du contenu marketing',
        query: context.query || 'Créer du contenu marketing',
      });
    }

    if (context.query?.toLowerCase().includes('code') || context.query?.toLowerCase().includes('review')) {
      suggestions.push({
        agent: 'CodeReviewAgent',
        reason: 'Pour revoir votre code',
        query: context.query || 'Revue de code',
      });
    }

    // Send first relevant suggestion
    if (suggestions.length > 0) {
      const suggestion = suggestions[0];
      await this.sendAgentSuggestion(suggestion.agent, {
        title: `Suggestion: ${suggestion.agent}`,
        body: suggestion.reason,
        query: suggestion.query,
      });
    }
  }
}

export const agentNotificationService = new AgentNotificationServiceImpl();
export default agentNotificationService;
