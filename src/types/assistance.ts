/**
 * Types for Medications, Hydration, and other assistance features
 */

export interface Medication {
    id: string;
    name: string;
    dosage: string;
    times: string[]; // ["08:00", "12:00", "20:00"]
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

export interface HydrationEntry {
    timestamp: number;
    amount: number; // en ml
    type: 'water' | 'tea' | 'coffee' | 'juice' | 'other';
}

export interface HydrationGoal {
    dailyTarget: number; // en ml
    reminderInterval: number; // en minutes
}

export interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relation: string;
    priority: number;
    photoUrl?: string;
}

export interface SOSCallRecord {
    timestamp: number;
    contactId: string;
    contactName: string;
    phone: string;
    duration?: number;
    successful?: boolean;
}
