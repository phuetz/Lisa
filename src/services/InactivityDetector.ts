/**
 * InactivityDetector - Détection d'inactivité prolongée
 * 
 * Surveille l'activité de l'utilisateur via la caméra et déclenche
 * des alertes en cas d'inactivité anormale.
 */

import { useAppStore } from '../store/appStore';
import type { Percept } from '../types';

interface InactivityAlert {
    timestamp: number;
    duration: number; // en secondes
    type: 'warning' | 'critical';
}

class InactivityDetectorService {
    private isActive = false;
    private lastActivityTime: number = Date.now();
    private checkInterval: NodeJS.Timeout | null = null;
    private onAlertCallback: ((alert: InactivityAlert) => void) | null = null;

    // Seuils de détection (en millisecondes)
    private readonly WARNING_THRESHOLD_DAY = 2 * 60 * 60 * 1000; // 2h
    private readonly CRITICAL_THRESHOLD_DAY = 4 * 60 * 60 * 1000; // 4h
    private readonly WARNING_THRESHOLD_NIGHT = 8 * 60 * 60 * 1000; // 8h
    private readonly CRITICAL_THRESHOLD_NIGHT = 12 * 60 * 60 * 1000; // 12h
    private readonly CHECK_INTERVAL = 60 * 1000; // Vérifier toutes les minutes

    /**
     * Démarre la surveillance
     */
    start(): void {
        this.isActive = true;
        this.lastActivityTime = Date.now();
        this.scheduleChecks();
        console.log('[InactivityDetector] Service démarré');
    }

    /**
     * Arrête la surveillance
     */
    stop(): void {
        this.isActive = false;
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        console.log('[InactivityDetector] Service arrêté');
    }

    /**
     * Enregistre un callback pour les alertes
     */
    onAlert(callback: (alert: InactivityAlert) => void): void {
        this.onAlertCallback = callback;
    }

    /**
     * Enregistre une activité détectée
     */
    registerActivity(): void {
        this.lastActivityTime = Date.now();
        useAppStore.setState({
            lastActivityTime: this.lastActivityTime,
            inactivityAlertActive: false,
        });
    }

    /**
     * Analyse les percepts de vision pour détecter l'activité
     */
    analyzePercepts(percepts: Percept<any>[]): void {
        if (!this.isActive) return;

        // Chercher des percepts récents (< 1 minute)
        const recentPercepts = percepts.filter(
            (p) => Date.now() - p.ts < 60 * 1000
        );

        // Si des mouvements sont détectés, considérer comme actif
        if (recentPercepts.length > 0) {
            const hasMovement = recentPercepts.some((p) => {
                // Détecter mouvement dans pose, mains, etc.
                if (p.modality === 'vision') {
                    const payload = p.payload as any;
                    return payload.type === 'pose' || payload.type === 'hand' || payload.type === 'gesture';
                }
                return false;
            });

            if (hasMovement) {
                this.registerActivity();
            }
        }
    }

    /**
     * Obtient la durée d'inactivité en secondes
     */
    getInactivityDuration(): number {
        return Math.floor((Date.now() - this.lastActivityTime) / 1000);
    }

    /**
     * Vérifie si c'est la nuit (22h - 8h)
     */
    private isNightTime(): boolean {
        const hour = new Date().getHours();
        return hour >= 22 || hour < 8;
    }

    /**
     * Obtient les seuils appropriés selon l'heure
     */
    private getThresholds(): { warning: number; critical: number } {
        if (this.isNightTime()) {
            return {
                warning: this.WARNING_THRESHOLD_NIGHT,
                critical: this.CRITICAL_THRESHOLD_NIGHT,
            };
        }
        return {
            warning: this.WARNING_THRESHOLD_DAY,
            critical: this.CRITICAL_THRESHOLD_DAY,
        };
    }

    /**
     * Programme les vérifications périodiques
     */
    private scheduleChecks(): void {
        this.checkInterval = setInterval(() => {
            this.checkInactivity();
        }, this.CHECK_INTERVAL);
    }

    /**
     * Vérifie le niveau d'inactivité
     */
    private checkInactivity(): void {
        const inactiveDuration = Date.now() - this.lastActivityTime;
        const thresholds = this.getThresholds();

        if (inactiveDuration >= thresholds.critical) {
            this.triggerAlert({
                timestamp: Date.now(),
                duration: Math.floor(inactiveDuration / 1000),
                type: 'critical',
            });
        } else if (inactiveDuration >= thresholds.warning) {
            this.triggerAlert({
                timestamp: Date.now(),
                duration: Math.floor(inactiveDuration / 1000),
                type: 'warning',
            });
        }
    }

    /**
     * Déclenche une alerte
     */
    private triggerAlert(alert: InactivityAlert): void {
        console.warn(`[InactivityDetector] ⚠️ Alerte ${alert.type}: Inactivité de ${alert.duration}s`);

        if (this.onAlertCallback) {
            this.onAlertCallback(alert);
        }

        useAppStore.setState({
            inactivityAlertActive: true,
            inactivityAlertType: alert.type,
            inactivityDuration: alert.duration,
        });
    }

    /**
     * Réinitialise l'alerte
     */
    dismissAlert(): void {
        useAppStore.setState({
            inactivityAlertActive: false,
            inactivityAlertType: null,
            inactivityDuration: 0,
        });
        this.registerActivity();
    }

    /**
     * Obtient le statut actuel
     */
    getStatus(): {
        isActive: boolean;
        lastActivityTime: number;
        inactivityDuration: number;
        isNightTime: boolean;
    } {
        return {
            isActive: this.isActive,
            lastActivityTime: this.lastActivityTime,
            inactivityDuration: this.getInactivityDuration(),
            isNightTime: this.isNightTime(),
        };
    }
}

export const inactivityDetector = new InactivityDetectorService();
export type { InactivityAlert };
