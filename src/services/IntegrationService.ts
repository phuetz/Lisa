/**
 * 🔌 Integration Service - Intégrations Système
 * Gère les intégrations avec MQTT, ROS, APIs externes
 */

import { auditActions } from './AuditService';

export interface IntegrationConfig {
  type: 'mqtt' | 'ros' | 'api' | 'webhook' | 'database';
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  credentials?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface IntegrationEvent {
  id: string;
  integrationName: string;
  type: 'connect' | 'disconnect' | 'message' | 'error' | 'success';
  data?: unknown;
  timestamp: string;
  status: 'pending' | 'success' | 'failed';
}

export interface IntegrationStatus {
  name: string;
  type: string;
  connected: boolean;
  lastEvent?: string;
  uptime: number; // ms
  messageCount: number;
  errorCount: number;
}

class IntegrationServiceImpl {
  private integrations: Map<string, IntegrationConfig> = new Map();
  private events: IntegrationEvent[] = [];
  private connections: Map<string, { connected: boolean; since: number }> = new Map();
  private maxEvents = 1000;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Enregistrer une intégration
   */
  registerIntegration(config: IntegrationConfig): void {
    this.integrations.set(config.name, config);
    this.connections.set(config.name, { connected: false, since: 0 });
    this.saveToStorage();

    auditActions.toolExecuted('registerIntegration', {
      name: config.name,
      type: config.type,
      enabled: config.enabled
    });
  }

  /**
   * Connecter une intégration
   */
  async connect(integrationName: string): Promise<boolean> {
    const integration = this.integrations.get(integrationName);
    if (!integration) {
      auditActions.errorOccurred(`Integration ${integrationName} not found`, {});
      return false;
    }

    try {
      // Simuler la connexion selon le type
      const connected = await this.simulateConnection(integration);

      if (connected) {
        this.connections.set(integrationName, { connected: true, since: Date.now() });
        this.recordEvent({
          integrationName,
          type: 'connect',
          status: 'success'
        });

        auditActions.toolExecuted('integrationConnected', {
          name: integrationName,
          type: integration.type
        });
      }

      return connected;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.recordEvent({
        integrationName,
        type: 'error',
        data: errorMsg,
        status: 'failed'
      });

      auditActions.errorOccurred(`Integration connection failed: ${errorMsg}`, {
        integrationName
      });

      return false;
    }
  }

  /**
   * Déconnecter une intégration
   */
  async disconnect(integrationName: string): Promise<boolean> {
    const connection = this.connections.get(integrationName);
    if (!connection) {
      return false;
    }

    this.connections.set(integrationName, { connected: false, since: 0 });
    this.recordEvent({
      integrationName,
      type: 'disconnect',
      status: 'success'
    });

    auditActions.toolExecuted('integrationDisconnected', {
      name: integrationName
    });

    return true;
  }

  /**
   * Envoyer un message via une intégration
   */
  async sendMessage(
    integrationName: string,
    message: unknown
  ): Promise<boolean> {
    const integration = this.integrations.get(integrationName);
    const connection = this.connections.get(integrationName);

    if (!integration || !connection?.connected) {
      auditActions.errorOccurred(`Integration ${integrationName} not connected`, {});
      return false;
    }

    try {
      // Simuler l'envoi du message
      await this.simulateSendMessage(integration, message);

      this.recordEvent({
        integrationName,
        type: 'message',
        data: message,
        status: 'success'
      });

      auditActions.toolExecuted('integrationMessage', {
        integrationName,
        messageType: typeof message
      });

      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.recordEvent({
        integrationName,
        type: 'error',
        data: errorMsg,
        status: 'failed'
      });

      auditActions.errorOccurred(`Integration message failed: ${errorMsg}`, {
        integrationName
      });

      return false;
    }
  }

  /**
   * Simuler la connexion
   */
  private async simulateConnection(_config: IntegrationConfig): Promise<boolean> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(true);
      }, 100);
    });
  }

  /**
   * Simuler l'envoi de message
   */
  private async simulateSendMessage(
    _config: IntegrationConfig,
    _message: unknown
  ): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 50);
    });
  }

  /**
   * Enregistrer un événement
   */
  private recordEvent(event: Omit<IntegrationEvent, 'id' | 'timestamp'>): void {
    const fullEvent: IntegrationEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...event
    };

    this.events.push(fullEvent);

    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  /**
   * Obtenir le statut d'une intégration
   */
  getStatus(integrationName: string): IntegrationStatus | undefined {
    const integration = this.integrations.get(integrationName);
    const connection = this.connections.get(integrationName);

    if (!integration || !connection) {
      return undefined;
    }

    const events = this.events.filter(e => e.integrationName === integrationName);
    const messageCount = events.filter(e => e.type === 'message').length;
    const errorCount = events.filter(e => e.type === 'error').length;
    const uptime = connection.connected ? Date.now() - connection.since : 0;

    return {
      name: integrationName,
      type: integration.type,
      connected: connection.connected,
      lastEvent: events.length > 0 ? events[events.length - 1].timestamp : undefined,
      uptime,
      messageCount,
      errorCount
    };
  }

  /**
   * Lister les intégrations
   */
  listIntegrations(): IntegrationConfig[] {
    return Array.from(this.integrations.values());
  }

  /**
   * Obtenir les événements
   */
  getEvents(integrationName?: string, limit: number = 50): IntegrationEvent[] {
    let filtered = this.events;

    if (integrationName) {
      filtered = filtered.filter(e => e.integrationName === integrationName);
    }

    return filtered.slice(-limit).reverse();
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    const statuses = Array.from(this.integrations.keys())
      .map(name => this.getStatus(name))
      .filter((s): s is IntegrationStatus => s !== undefined);

    const connected = statuses.filter(s => s.connected).length;
    const totalMessages = statuses.reduce((sum, s) => sum + s.messageCount, 0);
    const totalErrors = statuses.reduce((sum, s) => sum + s.errorCount, 0);

    return {
      totalIntegrations: this.integrations.size,
      connected,
      disconnected: this.integrations.size - connected,
      totalMessages,
      totalErrors,
      statuses
    };
  }

  /**
   * Sauvegarder dans localStorage
   */
  private saveToStorage(): void {
    const integrations = Array.from(this.integrations.values());
    localStorage.setItem('lisa:integrations:config', JSON.stringify(integrations));
  }

  /**
   * Charger depuis localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('lisa:integrations:config');
      if (stored) {
        const integrations = JSON.parse(stored);
        integrations.forEach((config: IntegrationConfig) => {
          this.integrations.set(config.name, config);
          this.connections.set(config.name, { connected: false, since: 0 });
        });
      }
    } catch (e) {
      console.error('Erreur chargement integrations:', e);
    }
  }

  /**
   * Supprimer une intégration
   */
  unregisterIntegration(integrationName: string): boolean {
    const removed = this.integrations.delete(integrationName);
    this.connections.delete(integrationName);
    if (removed) {
      this.saveToStorage();
    }
    return removed;
  }
}

// Exporter une instance singleton
export const integrationService = new IntegrationServiceImpl();
