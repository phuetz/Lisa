/**
 * 📋 Audit Service - Journalisation Complète
 * Enregistre toutes les actions importantes pour la transparence
 */

export interface AuditLog {
  id: string;
  timestamp: string;
  category: 'sensor' | 'tool' | 'memory' | 'privacy' | 'error' | 'security';
  action: string;
  details: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  sessionId?: string;
}

export interface AuditStats {
  totalLogs: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  lastLog?: AuditLog;
}

class AuditServiceImpl {
  private maxLogs = 1000; // Garder seulement les 1000 derniers logs
  private sessionId = this.generateSessionId();

  /**
   * Enregistrer une action dans l'audit log
   */
  log(
    category: AuditLog['category'],
    action: string,
    details: Record<string, unknown> = {},
    severity: AuditLog['severity'] = 'info'
  ): void {
    const log: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      category,
      action,
      details,
      severity,
      sessionId: this.sessionId
    };

    // Sauvegarder dans localStorage
    const logs = this.getLogs();
    logs.push(log);

    // Garder seulement les maxLogs derniers
    if (logs.length > this.maxLogs) {
      logs.shift();
    }

    localStorage.setItem('lisa:audit:logs', JSON.stringify(logs));

    // Also persist to Dexie (non-blocking)
    import('../db/database').then(({ db }) => {
      db.auditLog.put({
        id: log.id,
        type: severity === 'error' || severity === 'critical' ? 'error' : severity === 'warning' ? 'warning' : 'info',
        message: `[${category}] ${action}`,
        context: JSON.stringify(details),
        createdAt: Date.now(),
      }).catch(() => {});
    }).catch(() => {});

    // Logger dans la console en développement
    if (process.env.NODE_ENV === 'development') {
      const prefix = `[${category.toUpperCase()}] ${action}`;
      if (severity === 'error' || severity === 'critical') {
        console.error(prefix, details);
      } else {
        console.log(prefix, details);
      }
    }

    // Alerter si critique
    if (severity === 'critical') {
      console.error('🚨 AUDIT CRITIQUE:', log);
      if (window.lisaShowNotification) {
        window.lisaShowNotification({
          type: 'error',
          title: 'Événement Critique',
          message: action
        });
      }
    }
  }

  /**
   * Récupérer tous les logs
   */
  getLogs(): AuditLog[] {
    try {
      const logs = localStorage.getItem('lisa:audit:logs');
      return logs ? JSON.parse(logs) : [];
    } catch (e) {
      console.error('Erreur parsing audit logs:', e);
      return [];
    }
  }

  /**
   * Récupérer les logs filtrés
   */
  getLogsByCategory(category: AuditLog['category']): AuditLog[] {
    return this.getLogs().filter(log => log.category === category);
  }

  /**
   * Récupérer les logs par sévérité
   */
  getLogsBySeverity(severity: AuditLog['severity']): AuditLog[] {
    return this.getLogs().filter(log => log.severity === severity);
  }

  /**
   * Récupérer les logs récents
   */
  getRecentLogs(count: number = 50): AuditLog[] {
    return this.getLogs().slice(-count).reverse();
  }

  /**
   * Obtenir les statistiques
   */
  getStats(): AuditStats {
    const logs = this.getLogs();
    const stats: AuditStats = {
      totalLogs: logs.length,
      byCategory: {},
      bySeverity: {},
      lastLog: logs[logs.length - 1]
    };

    logs.forEach(log => {
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Exporter les logs en JSON
   */
  exportLogs(): string {
    const logs = this.getLogs();
    const stats = this.getStats();
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      stats,
      logs
    }, null, 2);
  }

  /**
   * Télécharger les logs
   */
  downloadLogs(): void {
    const content = this.exportLogs();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lisa-audit-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Nettoyer les logs
   */
  clearLogs(): void {
    localStorage.removeItem('lisa:audit:logs');
    this.log('security', 'Audit logs cleared', {}, 'warning');
  }

  /**
   * Générer un ID de session
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtenir l'ID de session
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Exporter une instance singleton
export const auditService = new AuditServiceImpl();

// Enregistrer les actions courantes
export const auditActions = {
  // Capteurs
  sensorActivated: (sensor: string) => 
    auditService.log('sensor', `Capteur activé: ${sensor}`, { sensor }),
  
  sensorDeactivated: (sensor: string) => 
    auditService.log('sensor', `Capteur désactivé: ${sensor}`, { sensor }),
  
  sensorPermissionGranted: (sensor: string) => 
    auditService.log('sensor', `Permission accordée: ${sensor}`, { sensor }, 'info'),
  
  sensorPermissionDenied: (sensor: string) => 
    auditService.log('sensor', `Permission refusée: ${sensor}`, { sensor }, 'warning'),

  // Tools
  toolExecuted: (tool: string, params: Record<string, unknown>) => 
    auditService.log('tool', `Outil exécuté: ${tool}`, { tool, params }),
  
  toolBlocked: (tool: string, reason: string) => 
    auditService.log('tool', `Outil bloqué: ${tool}`, { tool, reason }, 'warning'),
  
  toolFailed: (tool: string, error: string) => 
    auditService.log('tool', `Outil échoué: ${tool}`, { tool, error }, 'error'),

  // Mémoire
  memoryCreated: (type: string, content: string) => 
    auditService.log('memory', `Souvenir créé: ${type}`, { type, content }),
  
  memoryDeleted: (type: string, count: number) => 
    auditService.log('memory', `Souvenirs supprimés: ${type}`, { type, count }),

  // Confidentialité
  dataExported: (type: string, size: number) => 
    auditService.log('privacy', `Données exportées: ${type}`, { type, size }),
  
  dataDeleted: (type: string, count: number) => 
    auditService.log('privacy', `Données supprimées: ${type}`, { type, count }),

  // Sécurité
  securityEvent: (event: string, details: Record<string, unknown>) => 
    auditService.log('security', event, details, 'warning'),
  
  securityBreach: (event: string, details: Record<string, unknown>) => 
    auditService.log('security', event, details, 'critical'),

  // Erreurs
  errorOccurred: (error: string, context: Record<string, unknown>) => 
    auditService.log('error', error, context, 'error')
};
