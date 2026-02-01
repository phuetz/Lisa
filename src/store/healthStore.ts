/**
 * Health Store
 * Centralized store for health-related state (extracted from appStore)
 * Includes: Medications, Hydration, Inactivity tracking, Emergency contacts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Medication,
  MedicationTake,
  HydrationEntry,
  HydrationGoal,
  EmergencyContact,
  SOSCallRecord,
} from '../types/assistance';

interface HealthState {
  // Medications
  medications: Medication[];
  medicationTakes: MedicationTake[];
  currentMedicationReminder: { medication: Medication; time: string } | null;

  // Hydration
  hydrationLog: HydrationEntry[];
  hydrationGoal: HydrationGoal | null;
  hydrationReminderActive: boolean;

  // Inactivity tracking
  lastActivityTime: number;
  inactivityAlertActive: boolean;
  inactivityAlertType: 'warning' | 'critical' | null;
  inactivityDuration: number;

  // Fall detection
  fallDetected: boolean;
  fallEventTimestamp: number | null;

  // Emergency
  emergencyContacts: EmergencyContact[];
  sosCallHistory: SOSCallRecord[];
}

interface HealthActions {
  // Medication actions
  addMedication: (medication: Medication) => void;
  removeMedication: (id: string) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  recordMedicationTake: (take: MedicationTake) => void;
  setMedicationReminder: (reminder: { medication: Medication; time: string } | null) => void;
  clearMedicationReminder: () => void;

  // Hydration actions
  addHydrationEntry: (entry: HydrationEntry) => void;
  setHydrationGoal: (goal: HydrationGoal | null) => void;
  setHydrationReminderActive: (active: boolean) => void;
  getTodayHydration: () => number;
  clearHydrationLog: () => void;

  // Inactivity actions
  updateActivityTime: () => void;
  setInactivityAlert: (active: boolean, type?: 'warning' | 'critical' | null) => void;
  setInactivityDuration: (duration: number) => void;

  // Fall detection actions
  setFallDetected: (detected: boolean) => void;
  recordFallEvent: () => void;
  clearFallEvent: () => void;

  // Emergency actions
  addEmergencyContact: (contact: EmergencyContact) => void;
  removeEmergencyContact: (id: string) => void;
  updateEmergencyContact: (id: string, updates: Partial<EmergencyContact>) => void;
  recordSOSCall: (record: SOSCallRecord) => void;
  clearSOSHistory: () => void;

  // Reset
  resetHealth: () => void;
}

type HealthStore = HealthState & HealthActions;

const initialState: HealthState = {
  // Medications
  medications: [],
  medicationTakes: [],
  currentMedicationReminder: null,

  // Hydration
  hydrationLog: [],
  hydrationGoal: null,
  hydrationReminderActive: false,

  // Inactivity
  lastActivityTime: Date.now(),
  inactivityAlertActive: false,
  inactivityAlertType: null,
  inactivityDuration: 0,

  // Fall detection
  fallDetected: false,
  fallEventTimestamp: null,

  // Emergency
  emergencyContacts: [],
  sosCallHistory: [],
};

export const useHealthStore = create<HealthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Medication actions
      addMedication: (medication) =>
        set((state) => ({
          medications: [...state.medications, medication],
        })),

      removeMedication: (id) =>
        set((state) => ({
          medications: state.medications.filter((m) => m.id !== id),
        })),

      updateMedication: (id, updates) =>
        set((state) => ({
          medications: state.medications.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      recordMedicationTake: (take) =>
        set((state) => ({
          medicationTakes: [...state.medicationTakes, take],
        })),

      setMedicationReminder: (reminder) =>
        set({ currentMedicationReminder: reminder }),

      clearMedicationReminder: () =>
        set({ currentMedicationReminder: null }),

      // Hydration actions
      addHydrationEntry: (entry) =>
        set((state) => ({
          hydrationLog: [...state.hydrationLog, entry],
        })),

      setHydrationGoal: (goal) =>
        set({ hydrationGoal: goal }),

      setHydrationReminderActive: (active) =>
        set({ hydrationReminderActive: active }),

      getTodayHydration: () => {
        const state = get();
        const today = new Date().toDateString();
        return state.hydrationLog
          .filter((entry) => new Date(entry.timestamp).toDateString() === today)
          .reduce((total, entry) => total + entry.amount, 0);
      },

      clearHydrationLog: () =>
        set({ hydrationLog: [] }),

      // Inactivity actions
      updateActivityTime: () =>
        set({
          lastActivityTime: Date.now(),
          inactivityAlertActive: false,
          inactivityAlertType: null,
          inactivityDuration: 0,
        }),

      setInactivityAlert: (active, type = null) =>
        set({
          inactivityAlertActive: active,
          inactivityAlertType: type,
        }),

      setInactivityDuration: (duration) =>
        set({ inactivityDuration: duration }),

      // Fall detection actions
      setFallDetected: (detected) =>
        set({ fallDetected: detected }),

      recordFallEvent: () =>
        set({
          fallDetected: true,
          fallEventTimestamp: Date.now(),
        }),

      clearFallEvent: () =>
        set({
          fallDetected: false,
          fallEventTimestamp: null,
        }),

      // Emergency actions
      addEmergencyContact: (contact) =>
        set((state) => ({
          emergencyContacts: [...state.emergencyContacts, contact],
        })),

      removeEmergencyContact: (id) =>
        set((state) => ({
          emergencyContacts: state.emergencyContacts.filter((c) => c.id !== id),
        })),

      updateEmergencyContact: (id, updates) =>
        set((state) => ({
          emergencyContacts: state.emergencyContacts.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      recordSOSCall: (record) =>
        set((state) => ({
          sosCallHistory: [...state.sosCallHistory, record],
        })),

      clearSOSHistory: () =>
        set({ sosCallHistory: [] }),

      // Reset
      resetHealth: () => set(initialState),
    }),
    {
      name: 'lisa-health-store',
      version: 1,
      partialize: (state) => ({
        medications: state.medications,
        medicationTakes: state.medicationTakes,
        hydrationLog: state.hydrationLog,
        hydrationGoal: state.hydrationGoal,
        emergencyContacts: state.emergencyContacts,
        sosCallHistory: state.sosCallHistory,
      }),
    }
  )
);

// Selectors
export const selectMedications = (state: HealthStore) => state.medications;
export const selectHydrationToday = (state: HealthStore) => state.getTodayHydration();
export const selectEmergencyContacts = (state: HealthStore) => state.emergencyContacts;
export const selectFallDetected = (state: HealthStore) => state.fallDetected;
export const selectInactivityAlert = (state: HealthStore) => ({
  active: state.inactivityAlertActive,
  type: state.inactivityAlertType,
  duration: state.inactivityDuration,
});
