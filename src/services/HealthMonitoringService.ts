/**
 * 🏥 Health Monitoring Service - Monitoring Santé
 * HealthMonitorAgent + FallDetector + Alertes proactives
 */

import { useAppStore } from '../store/appStore';

export interface HealthMetric {
  id: string;
  type: 'activity' | 'fall_risk' | 'inactivity' | 'hydration' | 'medication';
  value: number;
  unit: string;
  timestamp: Date;
  status: 'normal' | 'warning' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface HealthAlert {
  id: string;
  type: 'fall_detected' | 'inactivity' | 'medication_reminder' | 'hydration_reminder' | 'emergency';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  actions?: HealthAlertAction[];
}

export interface HealthAlertAction {
  label: string;
  type: 'dismiss' | 'call_emergency' | 'call_contact' | 'snooze';
  payload?: Record<string, unknown>;
}

export interface DailyHealthSummary {
  date: string;
  activityScore: number;
  fallRiskScore: number;
  hydrationLevel: number;
  medicationAdherence: number;
  alerts: number;
  notes?: string;
}

class HealthMonitoringServiceImpl {
  private metrics: HealthMetric[] = [];
  private alerts: HealthAlert[] = [];
  private listeners: Set<(alerts: HealthAlert[]) => void> = new Set();
  private inactivityCheckInterval: ReturnType<typeof setInterval> | null = null;
  private inactivityThreshold = 30 * 60 * 1000; // 30 minutes
  private unsubscribeFallDetection: (() => void) | null = null;
  private snoozeTimers: Set<ReturnType<typeof setTimeout>> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Démarrer le monitoring
   */
  start(): void {
    if (this.inactivityCheckInterval) return;

    // Vérifier l'inactivité toutes les 5 minutes
    this.inactivityCheckInterval = setInterval(() => {
      this.checkInactivity();
    }, 5 * 60 * 1000);

    // Écouter les événements de chute du store
    this.setupFallDetectionListener();

    console.log('[HealthMonitoring] Service démarré');
  }

  /**
   * Arrêter le monitoring
   */
  stop(): void {
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
      this.inactivityCheckInterval = null;
    }
    if (this.unsubscribeFallDetection) {
      this.unsubscribeFallDetection();
      this.unsubscribeFallDetection = null;
    }
    // Clear all snooze timers
    for (const timer of this.snoozeTimers) {
      clearTimeout(timer);
    }
    this.snoozeTimers.clear();
    console.log('[HealthMonitoring] Service arrêté');
  }

  /**
   * Configurer l'écoute de la détection de chute
   */
  private setupFallDetectionListener(): void {
    // Store unsubscribe function for cleanup in stop()
    this.unsubscribeFallDetection = useAppStore.subscribe(
      state => state.fallDetected,
      (fallDetected) => {
        if (fallDetected) {
          this.handleFallDetected();
        }
      }
    );
  }

  /**
   * Gérer une chute détectée
   */
  private handleFallDetected(): void {
    const alert = this.createAlert({
      type: 'fall_detected',
      severity: 'critical',
      title: '⚠️ Chute détectée !',
      message: 'Une chute a été détectée. Êtes-vous en sécurité ?',
      actions: [
        { label: 'Je vais bien', type: 'dismiss' },
        { label: 'Appeler les secours', type: 'call_emergency' },
        { label: 'Appeler un proche', type: 'call_contact' },
      ],
    });

    // Enregistrer la métrique
    this.recordMetric({
      type: 'fall_risk',
      value: 100,
      unit: '%',
      status: 'critical',
    });

    // Notification sonore/visuelle
    this.playAlertSound();

    console.log('[HealthMonitoring] Chute détectée:', alert.id);
  }

  /**
   * Vérifier l'inactivité
   */
  private checkInactivity(): void {
    const state = useAppStore.getState();
    const lastActivity = state.lastActivityTime || Date.now();
    const inactiveDuration = Date.now() - lastActivity;

    if (inactiveDuration > this.inactivityThreshold) {
      const severity = inactiveDuration > this.inactivityThreshold * 2 ? 'critical' : 'warning';
      
      // Ne pas créer d'alerte si une existe déjà
      const existingAlert = this.alerts.find(
        a => a.type === 'inactivity' && !a.acknowledged
      );

      if (!existingAlert) {
        this.createAlert({
          type: 'inactivity',
          severity,
          title: 'Période d\'inactivité détectée',
          message: `Aucune activité détectée depuis ${Math.floor(inactiveDuration / 60000)} minutes.`,
          actions: [
            { label: 'Je suis là', type: 'dismiss' },
            { label: 'Rappeler dans 15 min', type: 'snooze', payload: { minutes: 15 } },
          ],
        });

        this.recordMetric({
          type: 'inactivity',
          value: inactiveDuration / 60000,
          unit: 'minutes',
          status: severity === 'critical' ? 'critical' : 'warning',
        });
      }
    }
  }

  /**
   * Créer un rappel de médicament
   */
  createMedicationReminder(medicationName: string, _time: string): HealthAlert {
    return this.createAlert({
      type: 'medication_reminder',
      severity: 'info',
      title: '💊 Rappel médicament',
      message: `Il est l'heure de prendre: ${medicationName}`,
      actions: [
        { label: 'Pris', type: 'dismiss' },
        { label: 'Rappeler dans 30 min', type: 'snooze', payload: { minutes: 30 } },
      ],
    });
  }

  /**
   * Créer un rappel d'hydratation
   */
  createHydrationReminder(): HealthAlert {
    return this.createAlert({
      type: 'hydration_reminder',
      severity: 'info',
      title: '💧 Rappel hydratation',
      message: 'N\'oubliez pas de boire de l\'eau !',
      actions: [
        { label: 'Fait', type: 'dismiss' },
        { label: 'Rappeler dans 1h', type: 'snooze', payload: { minutes: 60 } },
      ],
    });
  }

  /**
   * Créer une alerte
   */
  private createAlert(
    data: Omit<HealthAlert, 'id' | 'timestamp' | 'acknowledged'>
  ): HealthAlert {
    const alert: HealthAlert = {
      ...data,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.unshift(alert);
    this.saveToStorage();
    this.notifyListeners();

    return alert;
  }

  /**
   * Enregistrer une métrique
   */
  recordMetric(data: Omit<HealthMetric, 'id' | 'timestamp'>): HealthMetric {
    const metric: HealthMetric = {
      ...data,
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.metrics.push(metric);
    
    // Garder seulement les 1000 dernières métriques
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    this.saveToStorage();
    return metric;
  }

  /**
   * Enregistrer une activité (reset inactivity)
   */
  recordActivity(): void {
    useAppStore.setState({ lastActivityTime: Date.now() });
    
    this.recordMetric({
      type: 'activity',
      value: 1,
      unit: 'event',
      status: 'normal',
    });
  }

  /**
   * Acquitter une alerte
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Exécuter une action d'alerte
   */
  async executeAlertAction(alertId: string, actionType: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return;

    const action = alert.actions?.find(a => a.type === actionType);
    if (!action) return;

    switch (actionType) {
      case 'dismiss':
        this.acknowledgeAlert(alertId);
        break;
      case 'snooze': {
        this.acknowledgeAlert(alertId);
        const minutes = (action.payload?.minutes as number) || 15;
        const timer = setTimeout(() => {
          this.snoozeTimers.delete(timer);
          // Recréer l'alerte après le snooze
          this.createAlert({
            type: alert.type,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            actions: alert.actions,
          });
        }, minutes * 60 * 1000);
        this.snoozeTimers.add(timer);
        break;
      }
      case 'call_emergency':
        console.log('[HealthMonitoring] Appel des secours...');
        // Intégration avec le système d'appel d'urgence
        break;
      case 'call_contact':
        console.log('[HealthMonitoring] Appel d\'un contact...');
        // Intégration avec le carnet de contacts d'urgence
        break;
    }
  }

  /**
   * Jouer un son d'alerte
   */
  private playAlertSound(): void {
    try {
      const audio = new Audio('/sounds/alert.mp3');
      audio.volume = 0.7;
      audio.play().catch(() => {
        console.log('[HealthMonitoring] Impossible de jouer le son d\'alerte');
      });
    } catch {
      // Ignorer les erreurs audio
    }
  }

  /**
   * Obtenir le résumé quotidien
   */
  getDailySummary(date: Date = new Date()): DailyHealthSummary {
    const dateStr = date.toISOString().split('T')[0];
    const dayStart = new Date(dateStr).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const dayMetrics = this.metrics.filter(
      m => m.timestamp.getTime() >= dayStart && m.timestamp.getTime() < dayEnd
    );

    const dayAlerts = this.alerts.filter(
      a => a.timestamp.getTime() >= dayStart && a.timestamp.getTime() < dayEnd
    );

    // Calculer les scores
    const activityMetrics = dayMetrics.filter(m => m.type === 'activity');
    const activityScore = Math.min(100, activityMetrics.length * 10);

    const fallRiskMetrics = dayMetrics.filter(m => m.type === 'fall_risk');
    const fallRiskScore = fallRiskMetrics.length > 0 
      ? Math.max(...fallRiskMetrics.map(m => m.value))
      : 0;

    return {
      date: dateStr,
      activityScore,
      fallRiskScore,
      hydrationLevel: 0, // À implémenter avec le suivi d'hydratation
      medicationAdherence: 100, // À implémenter avec le suivi des médicaments
      alerts: dayAlerts.length,
    };
  }

  /**
   * Obtenir les alertes actives
   */
  getActiveAlerts(): HealthAlert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Obtenir toutes les alertes
   */
  getAllAlerts(): HealthAlert[] {
    return [...this.alerts];
  }

  /**
   * S'abonner aux changements
   */
  subscribe(callback: (alerts: HealthAlert[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifier les listeners
   */
  private notifyListeners(): void {
    const active = this.getActiveAlerts();
    this.listeners.forEach(callback => callback(active));
  }

  /**
   * Sauvegarder dans localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('lisa:health:metrics', JSON.stringify(this.metrics));
      localStorage.setItem('lisa:health:alerts', JSON.stringify(this.alerts));
    } catch (e) {
      console.error('Erreur sauvegarde HealthMonitoring:', e);
    }
  }

  /**
   * Charger depuis localStorage
   */
  private loadFromStorage(): void {
    try {
      const metrics = localStorage.getItem('lisa:health:metrics');
      const alerts = localStorage.getItem('lisa:health:alerts');

      if (metrics) {
        this.metrics = JSON.parse(metrics).map((m: HealthMetric) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }
      if (alerts) {
        this.alerts = JSON.parse(alerts).map((a: HealthAlert) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }));
      }
    } catch (e) {
      console.error('Erreur chargement HealthMonitoring:', e);
    }
  }
}

export const healthMonitoringService = new HealthMonitoringServiceImpl();
