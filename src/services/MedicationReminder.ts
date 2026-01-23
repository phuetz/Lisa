/**
 * MedicationReminder - Service de rappel de prise de médicaments
 * 
 * Gère les rappels programmés pour la prise de médicaments,
 * avec alertes visuelles, vocales et historique d'observance.
 */

import { useAppStore } from '../store/appStore';

export interface Medication {
    id: string;
    name: string;
    dosage: string;
    times: string[]; // Heures de prise (format "HH:MM")
    startDate: string;
    endDate?: string;
    imageUrl?: string;
    instructions?: string;
    color?: string;
}

export interface MedicationTake {
    medicationId: string;
    scheduledTime: string;
    takenAt: number | null;
    skipped: boolean;
    confirmed: boolean;
}

class MedicationReminderService {
    private timers: Map<string, NodeJS.Timeout> = new Map();
    private onReminderCallback: ((medication: Medication, time: string) => void) | null = null;

    /**
     * Démarre le service de rappels
     */
    start(): void {
        this.scheduleAllReminders();
        console.log('[MedicationReminder] Service démarré');
    }

    /**
     * Arrête le service
     */
    stop(): void {
        this.timers.forEach((timer) => clearTimeout(timer));
        this.timers.clear();
        console.log('[MedicationReminder] Service arrêté');
    }

    /**
     * Enregistre un callback pour les rappels
     */
    onReminder(callback: (medication: Medication, time: string) => void): void {
        this.onReminderCallback = callback;
    }

    /**
     * Ajoute un médicament
     */
    addMedication(medication: Medication): void {
        const medications = useAppStore.getState().medications || [];
        useAppStore.setState({
            medications: [...medications, medication],
        });
        this.scheduleMedicationReminders(medication);
    }

    /**
     * Supprime un médicament
     */
    removeMedication(medicationId: string): void {
        const medications = useAppStore.getState().medications || [];
        useAppStore.setState({
            medications: medications.filter((m) => m.id !== medicationId),
        });
        this.cancelMedicationReminders(medicationId);
    }

    /**
     * Confirme la prise d'un médicament
     */
    confirmTake(medicationId: string, scheduledTime: string): void {
        const takes = useAppStore.getState().medicationTakes || [];
        const existingTake = takes.find(
            (t) => t.medicationId === medicationId && t.scheduledTime === scheduledTime
        );

        if (existingTake) {
            useAppStore.setState({
                medicationTakes: takes.map((t) =>
                    t.medicationId === medicationId && t.scheduledTime === scheduledTime
                        ? { ...t, takenAt: Date.now(), confirmed: true }
                        : t
                ),
            });
        } else {
            useAppStore.setState({
                medicationTakes: [
                    ...takes,
                    {
                        medicationId,
                        scheduledTime,
                        takenAt: Date.now(),
                        skipped: false,
                        confirmed: true,
                    },
                ],
            });
        }

        console.log(`[MedicationReminder] Prise confirmée: ${medicationId} à ${scheduledTime}`);
    }

    /**
     * Marque une prise comme sautée
     */
    skipTake(medicationId: string, scheduledTime: string): void {
        const takes = useAppStore.getState().medicationTakes || [];
        useAppStore.setState({
            medicationTakes: [
                ...takes,
                {
                    medicationId,
                    scheduledTime,
                    takenAt: null,
                    skipped: true,
                    confirmed: true,
                },
            ],
        });
    }

    /**
     * Programme les rappels pour tous les médicaments
     */
    private scheduleAllReminders(): void {
        const medications = useAppStore.getState().medications || [];
        medications.forEach((med) => this.scheduleMedicationReminders(med));
    }

    /**
     * Programme les rappels pour un médicament
     */
    private scheduleMedicationReminders(medication: Medication): void {
        medication.times.forEach((time) => {
            const timerId = `${medication.id}-${time}`;
            const delay = this.getDelayUntilTime(time);

            if (delay > 0) {
                const timer = setTimeout(() => {
                    this.triggerReminder(medication, time);
                    // Reprogrammer pour le lendemain
                    this.scheduleMedicationReminders(medication);
                }, delay);

                this.timers.set(timerId, timer);
            }
        });
    }

    /**
     * Annule les rappels d'un médicament
     */
    private cancelMedicationReminders(medicationId: string): void {
        this.timers.forEach((timer, key) => {
            if (key.startsWith(`${medicationId}-`)) {
                clearTimeout(timer);
                this.timers.delete(key);
            }
        });
    }

    /**
     * Déclenche un rappel
     */
    private triggerReminder(medication: Medication, time: string): void {
        console.log(`[MedicationReminder] ⏰ Rappel: ${medication.name} à ${time}`);

        if (this.onReminderCallback) {
            this.onReminderCallback(medication, time);
        }

        // Mettre à jour le store
        useAppStore.setState({
            currentMedicationReminder: { medication, time },
        });
    }

    /**
     * Calcule le délai en ms jusqu'à une heure donnée
     */
    private getDelayUntilTime(timeStr: string): number {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const now = new Date();
        const target = new Date();
        target.setHours(hours, minutes, 0, 0);

        if (target <= now) {
            // Si l'heure est déjà passée, programmer pour demain
            target.setDate(target.getDate() + 1);
        }

        return target.getTime() - now.getTime();
    }

    /**
     * Calcule le taux d'observance (% de prises confirmées)
     */
    getComplianceRate(days: number = 7): number {
        const takes = useAppStore.getState().medicationTakes || [];
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        const recentTakes = takes.filter((t) => {
            const scheduledDate = new Date(t.scheduledTime);
            return scheduledDate.getTime() >= cutoff;
        });

        if (recentTakes.length === 0) return 100;

        const confirmed = recentTakes.filter((t) => t.confirmed && !t.skipped).length;
        return Math.round((confirmed / recentTakes.length) * 100);
    }
}

export const medicationReminder = new MedicationReminderService();
export type { MedicationTake };
