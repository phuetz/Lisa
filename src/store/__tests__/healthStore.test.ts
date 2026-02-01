/**
 * Tests for healthStore
 * Phase 2.1: Store unification - Health domain extracted from appStore
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useHealthStore } from '../healthStore';

describe('healthStore', () => {
  beforeEach(() => {
    useHealthStore.getState().resetHealth();
  });

  describe('Initial State', () => {
    it('should have correct default values', () => {
      const state = useHealthStore.getState();

      expect(state.medications).toEqual([]);
      expect(state.medicationTakes).toEqual([]);
      expect(state.currentMedicationReminder).toBeNull();
      expect(state.hydrationLog).toEqual([]);
      expect(state.hydrationGoal).toBeNull();
      expect(state.hydrationReminderActive).toBe(false);
      expect(state.fallDetected).toBe(false);
      expect(state.fallEventTimestamp).toBeNull();
      expect(state.emergencyContacts).toEqual([]);
      expect(state.sosCallHistory).toEqual([]);
    });
  });

  describe('Medications', () => {
    const testMedication = {
      id: 'med-1',
      name: 'Aspirin',
      dosage: '100mg',
      frequency: 'daily',
      times: ['08:00', '20:00'],
    };

    it('should add medication', () => {
      useHealthStore.getState().addMedication(testMedication as any);
      expect(useHealthStore.getState().medications).toHaveLength(1);
      expect(useHealthStore.getState().medications[0].name).toBe('Aspirin');
    });

    it('should remove medication', () => {
      useHealthStore.getState().addMedication(testMedication as any);
      useHealthStore.getState().removeMedication('med-1');
      expect(useHealthStore.getState().medications).toHaveLength(0);
    });

    it('should update medication', () => {
      useHealthStore.getState().addMedication(testMedication as any);
      useHealthStore.getState().updateMedication('med-1', { dosage: '200mg' });
      expect(useHealthStore.getState().medications[0].dosage).toBe('200mg');
    });

    it('should record medication take', () => {
      const take = {
        id: 'take-1',
        medicationId: 'med-1',
        timestamp: Date.now(),
        taken: true,
      };
      useHealthStore.getState().recordMedicationTake(take as any);
      expect(useHealthStore.getState().medicationTakes).toHaveLength(1);
    });

    it('should set and clear medication reminder', () => {
      const reminder = { medication: testMedication as any, time: '08:00' };
      useHealthStore.getState().setMedicationReminder(reminder);
      expect(useHealthStore.getState().currentMedicationReminder).toEqual(reminder);

      useHealthStore.getState().clearMedicationReminder();
      expect(useHealthStore.getState().currentMedicationReminder).toBeNull();
    });
  });

  describe('Hydration', () => {
    it('should add hydration entry', () => {
      const entry = {
        id: 'hydration-1',
        amount: 250,
        timestamp: Date.now(),
        type: 'water',
      };
      useHealthStore.getState().addHydrationEntry(entry as any);
      expect(useHealthStore.getState().hydrationLog).toHaveLength(1);
    });

    it('should set hydration goal', () => {
      const goal = { daily: 2000, unit: 'ml' };
      useHealthStore.getState().setHydrationGoal(goal as any);
      expect(useHealthStore.getState().hydrationGoal).toEqual(goal);
    });

    it('should toggle hydration reminder', () => {
      useHealthStore.getState().setHydrationReminderActive(true);
      expect(useHealthStore.getState().hydrationReminderActive).toBe(true);

      useHealthStore.getState().setHydrationReminderActive(false);
      expect(useHealthStore.getState().hydrationReminderActive).toBe(false);
    });

    it('should calculate today hydration', () => {
      const now = Date.now();
      useHealthStore.getState().addHydrationEntry({
        id: 'h1',
        amount: 250,
        timestamp: now,
        type: 'water',
      } as any);
      useHealthStore.getState().addHydrationEntry({
        id: 'h2',
        amount: 300,
        timestamp: now,
        type: 'water',
      } as any);

      const total = useHealthStore.getState().getTodayHydration();
      expect(total).toBe(550);
    });

    it('should clear hydration log', () => {
      useHealthStore.getState().addHydrationEntry({
        id: 'h1',
        amount: 250,
        timestamp: Date.now(),
        type: 'water',
      } as any);
      useHealthStore.getState().clearHydrationLog();
      expect(useHealthStore.getState().hydrationLog).toHaveLength(0);
    });
  });

  describe('Inactivity Tracking', () => {
    it('should update activity time', () => {
      const beforeUpdate = useHealthStore.getState().lastActivityTime;

      // Small delay to ensure different timestamp
      useHealthStore.getState().updateActivityTime();

      const afterUpdate = useHealthStore.getState().lastActivityTime;
      expect(afterUpdate).toBeGreaterThanOrEqual(beforeUpdate);
      expect(useHealthStore.getState().inactivityAlertActive).toBe(false);
    });

    it('should set inactivity alert', () => {
      useHealthStore.getState().setInactivityAlert(true, 'warning');
      expect(useHealthStore.getState().inactivityAlertActive).toBe(true);
      expect(useHealthStore.getState().inactivityAlertType).toBe('warning');

      useHealthStore.getState().setInactivityAlert(true, 'critical');
      expect(useHealthStore.getState().inactivityAlertType).toBe('critical');
    });

    it('should set inactivity duration', () => {
      useHealthStore.getState().setInactivityDuration(3600000);
      expect(useHealthStore.getState().inactivityDuration).toBe(3600000);
    });
  });

  describe('Fall Detection', () => {
    it('should set fall detected', () => {
      useHealthStore.getState().setFallDetected(true);
      expect(useHealthStore.getState().fallDetected).toBe(true);
    });

    it('should record fall event', () => {
      useHealthStore.getState().recordFallEvent();
      expect(useHealthStore.getState().fallDetected).toBe(true);
      expect(useHealthStore.getState().fallEventTimestamp).not.toBeNull();
    });

    it('should clear fall event', () => {
      useHealthStore.getState().recordFallEvent();
      useHealthStore.getState().clearFallEvent();
      expect(useHealthStore.getState().fallDetected).toBe(false);
      expect(useHealthStore.getState().fallEventTimestamp).toBeNull();
    });
  });

  describe('Emergency Contacts', () => {
    const testContact = {
      id: 'contact-1',
      name: 'John Doe',
      phone: '+33612345678',
      relationship: 'spouse',
      isPrimary: true,
    };

    it('should add emergency contact', () => {
      useHealthStore.getState().addEmergencyContact(testContact as any);
      expect(useHealthStore.getState().emergencyContacts).toHaveLength(1);
      expect(useHealthStore.getState().emergencyContacts[0].name).toBe('John Doe');
    });

    it('should remove emergency contact', () => {
      useHealthStore.getState().addEmergencyContact(testContact as any);
      useHealthStore.getState().removeEmergencyContact('contact-1');
      expect(useHealthStore.getState().emergencyContacts).toHaveLength(0);
    });

    it('should update emergency contact', () => {
      useHealthStore.getState().addEmergencyContact(testContact as any);
      useHealthStore.getState().updateEmergencyContact('contact-1', { phone: '+33698765432' });
      expect(useHealthStore.getState().emergencyContacts[0].phone).toBe('+33698765432');
    });
  });

  describe('SOS Call History', () => {
    it('should record SOS call', () => {
      const record = {
        id: 'sos-1',
        timestamp: Date.now(),
        contactId: 'contact-1',
        status: 'completed',
      };
      useHealthStore.getState().recordSOSCall(record as any);
      expect(useHealthStore.getState().sosCallHistory).toHaveLength(1);
    });

    it('should clear SOS history', () => {
      useHealthStore.getState().recordSOSCall({
        id: 'sos-1',
        timestamp: Date.now(),
        contactId: 'contact-1',
        status: 'completed',
      } as any);
      useHealthStore.getState().clearSOSHistory();
      expect(useHealthStore.getState().sosCallHistory).toHaveLength(0);
    });
  });

  describe('Reset', () => {
    it('should reset all health state', () => {
      // Add some data
      useHealthStore.getState().addMedication({ id: 'med-1', name: 'Test' } as any);
      useHealthStore.getState().addHydrationEntry({ id: 'h1', amount: 250, timestamp: Date.now() } as any);
      useHealthStore.getState().recordFallEvent();
      useHealthStore.getState().addEmergencyContact({ id: 'c1', name: 'Test' } as any);

      // Reset
      useHealthStore.getState().resetHealth();

      // Verify all reset
      const state = useHealthStore.getState();
      expect(state.medications).toHaveLength(0);
      expect(state.hydrationLog).toHaveLength(0);
      expect(state.fallDetected).toBe(false);
      expect(state.emergencyContacts).toHaveLength(0);
    });
  });
});
