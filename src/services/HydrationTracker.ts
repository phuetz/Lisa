/**
 * HydrationTracker - Service de suivi d'hydratation
 * 
 * Encourage l'utilisateur à boire régulièrement de l'eau,
 * avec rappels et suivi de progression.
 */

import { useAppStore } from '../store/appStore';

export interface HydrationEntry {
    timestamp: number;
    amount: number; // en ml
    type: 'water' | 'tea' | 'coffee' | 'juice' | 'other';
}

export interface HydrationGoal {
    dailyTarget: number; // en ml (défaut: 1500)
    reminderInterval: number; // en minutes (défaut: 120)
}

class HydrationTrackerService {
    private reminderTimer: NodeJS.Timeout | null = null;
    private onReminderCallback: (() => void) | null = null;
    private readonly DEFAULT_GOAL: HydrationGoal = {
        dailyTarget: 1500, // 1.5L
        reminderInterval: 120, // 2h
    };

    /**
     * Démarre le service
     */
    start(): void {
        this.scheduleNextReminder();
        console.log('[HydrationTracker] Service démarré');
    }

    /**
     * Arrête le service
     */
    stop(): void {
        if (this.reminderTimer) {
            clearTimeout(this.reminderTimer);
            this.reminderTimer = null;
        }
        console.log('[HydrationTracker] Service arrêté');
    }

    /**
     * Enregistre un callback pour les rappels
     */
    onReminder(callback: () => void): void {
        this.onReminderCallback = callback;
    }

    /**
     * Enregistre une prise de liquide
     */
    logDrink(amount: number, type: HydrationEntry['type'] = 'water'): void {
        const entries = useAppStore.getState().hydrationLog || [];
        const newEntry: HydrationEntry = {
            timestamp: Date.now(),
            amount,
            type,
        };

        useAppStore.setState({
            hydrationLog: [...entries, newEntry],
        });

        // Réinitialiser le timer de rappel
        this.scheduleNextReminder();

        console.log(`[HydrationTracker] Prise enregistrée: ${amount}ml de ${type}`);
    }

    /**
     * Obtient la consommation du jour
     */
    getTodayConsumption(): number {
        const entries = this.getTodayEntries();
        return entries.reduce((sum, entry) => sum + entry.amount, 0);
    }

    /**
     * Obtient le pourcentage de l'objectif atteint
     */
    getProgressPercentage(): number {
        const goal = this.getGoal();
        const consumed = this.getTodayConsumption();
        return Math.min(Math.round((consumed / goal.dailyTarget) * 100), 100);
    }

    /**
     * Vérifie si l'objectif est atteint
     */
    isGoalAchieved(): boolean {
        return this.getTodayConsumption() >= this.getGoal().dailyTarget;
    }

    /**
     * Obtient les entrées du jour
     */
    private getTodayEntries(): HydrationEntry[] {
        const entries = useAppStore.getState().hydrationLog || [];
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        return entries.filter((entry) => entry.timestamp >= startOfDay.getTime());
    }

    /**
     * Obtient l'objectif actuel
     */
    private getGoal(): HydrationGoal {
        const goal = useAppStore.getState().hydrationGoal;
        return goal || this.DEFAULT_GOAL;
    }

    /**
     * Programme le prochain rappel
     */
    private scheduleNextReminder(): void {
        if (this.reminderTimer) {
            clearTimeout(this.reminderTimer);
        }

        const goal = this.getGoal();
        const delay = goal.reminderInterval * 60 * 1000; // Convertir minutes en ms

        this.reminderTimer = setTimeout(() => {
            this.triggerReminder();
        }, delay);
    }

    /**
     * Déclenche un rappel
     */
    private triggerReminder(): void {
        // Ne pas rappeler si l'objectif est déjà atteint
        if (this.isGoalAchieved()) {
            this.scheduleNextReminder();
            return;
        }

        console.log('[HydrationTracker] 💧 Rappel: Pensez à boire de l\'eau');

        if (this.onReminderCallback) {
            this.onReminderCallback();
        }

        useAppStore.setState({
            hydrationReminderActive: true,
        });

        this.scheduleNextReminder();
    }

    /**
     * Obtient les statistiques de la semaine
     */
    getWeeklyStats(): { day: string; amount: number }[] {
        const entries = useAppStore.getState().hydrationLog || [];
        const stats: { day: string; amount: number }[] = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            const dayEntries = entries.filter(
                (e) => e.timestamp >= date.getTime() && e.timestamp <= dayEnd.getTime()
            );

            const total = dayEntries.reduce((sum, e) => sum + e.amount, 0);
            stats.push({
                day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
                amount: total,
            });
        }

        return stats;
    }

    /**
     * Réinitialise les données (nouveau jour)
     */
    resetDaily(): void {
        // Les anciennes entrées sont conservées pour l'historique
        // Seul le flag de rappel est réinitialisé
        useAppStore.setState({
            hydrationReminderActive: false,
        });
    }
}

export const hydrationTracker = new HydrationTrackerService();
export type { HydrationGoal };
