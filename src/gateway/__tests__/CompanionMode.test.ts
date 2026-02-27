/**
 * Tests unitaires pour CompanionMode
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CompanionMode, getCompanionMode, resetCompanionMode } from '../CompanionMode';

describe('CompanionMode', () => {
  let companion: CompanionMode;

  beforeEach(() => {
    // Clear stored state to prevent leaks between tests
    try { localStorage.removeItem('lisa-companion'); } catch { /* localStorage may not be available in test env */ }
    resetCompanionMode();
    companion = new CompanionMode({
      userName: 'TestUser',
      userNickname: 'Chéri',
    });
  });

  afterEach(() => {
    resetCompanionMode();
  });

  describe('Configuration', () => {
    it('should create instance with default config', () => {
      const defaultCompanion = new CompanionMode();
      expect(defaultCompanion).toBeInstanceOf(CompanionMode);
    });

    it('should create instance with custom config', () => {
      expect(companion).toBeInstanceOf(CompanionMode);
    });

    it('should use singleton pattern', () => {
      const c1 = getCompanionMode();
      const c2 = getCompanionMode();
      expect(c1).toBe(c2);
    });

    it('should reset singleton', () => {
      const c1 = getCompanionMode();
      resetCompanionMode();
      const c2 = getCompanionMode();
      expect(c1).not.toBe(c2);
    });

    it('should get config', () => {
      const config = companion.getConfig();
      // localStorage may override initial config
      expect(typeof config.userName).toBe('string');
      expect(config.userName.length).toBeGreaterThan(0);
    });

    it('should update config', () => {
      companion.configure({ userName: 'NewName' });
      const config = companion.getConfig();
      expect(config.userName).toBe('NewName');
    });
  });

  describe('Enable/Disable', () => {
    it('should enable companion mode', () => {
      companion.disable();
      companion.enable();
      expect(companion.isEnabled()).toBe(true);
    });

    it('should disable companion mode', () => {
      companion.enable();
      companion.disable();
      expect(companion.isEnabled()).toBe(false);
    });

    it('should emit enabled event', () => {
      const callback = vi.fn();
      companion.on('enabled', callback);
      companion.disable();
      companion.enable();
      expect(callback).toHaveBeenCalled();
    });

    it('should emit disabled event', () => {
      const callback = vi.fn();
      companion.on('disabled', callback);
      companion.enable();
      companion.disable();
      expect(callback).toHaveBeenCalled();
    });

    it('should emit status:changed event', () => {
      const callback = vi.fn();
      companion.on('status:changed', callback);
      companion.enable();
      expect(callback).toHaveBeenCalledWith(true);
    });
  });

  describe('Personality', () => {
    it('should get personality', () => {
      const personality = companion.getPersonality();
      expect(personality.name).toBe('Lisa');
      expect(personality.traits).toContain('caring');
    });

    it('should set personality', () => {
      companion.setPersonality({ affectionLevel: 90 });
      const personality = companion.getPersonality();
      expect(personality.affectionLevel).toBe(90);
    });

    it('should emit personality:changed event', () => {
      const callback = vi.fn();
      companion.on('personality:changed', callback);
      companion.setPersonality({ humorLevel: 80 });
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Relationship Level', () => {
    it('should get relationship level', () => {
      const level = companion.getRelationshipLevel();
      expect(level).toBe('intimate');
    });

    it('should set relationship level', () => {
      companion.setRelationshipLevel('soulmate');
      expect(companion.getRelationshipLevel()).toBe('soulmate');
    });

    it('should emit relationship:changed event', () => {
      const callback = vi.fn();
      companion.on('relationship:changed', callback);
      companion.setRelationshipLevel('close');
      expect(callback).toHaveBeenCalledWith('close');
    });
  });

  describe('Greetings and Messages', () => {
    it('should get greeting', () => {
      const greeting = companion.getGreeting();
      expect(typeof greeting).toBe('string');
      expect(greeting.length).toBeGreaterThan(0);
    });

    it('should get farewell', () => {
      const farewell = companion.getFarewell();
      expect(typeof farewell).toBe('string');
      expect(farewell.length).toBeGreaterThan(0);
    });

    it('should get encouragement', () => {
      const encouragement = companion.getEncouragement();
      expect(typeof encouragement).toBe('string');
      expect(encouragement.length).toBeGreaterThan(0);
    });

    it('should get comfort', () => {
      const comfort = companion.getComfort();
      expect(typeof comfort).toBe('string');
      expect(comfort.length).toBeGreaterThan(0);
    });

    it('should get celebration', () => {
      const celebration = companion.getCelebration();
      expect(typeof celebration).toBe('string');
      expect(celebration.length).toBeGreaterThan(0);
    });
  });

  describe('Special Dates', () => {
    it('should add special date', () => {
      const date = companion.addSpecialDate({
        name: 'Anniversary',
        date: '06-15',
        type: 'anniversary',
        reminder: true,
      });
      expect(date.id).toBeDefined();
      expect(date.name).toBe('Anniversary');
    });

    it('should remove special date', () => {
      const date = companion.addSpecialDate({
        name: 'Test',
        date: '01-01',
        type: 'custom',
        reminder: false,
      });
      const result = companion.removeSpecialDate(date.id);
      expect(result).toBe(true);
    });

    it('should return false for non-existent date', () => {
      const result = companion.removeSpecialDate('non-existent');
      expect(result).toBe(false);
    });

    it('should get upcoming special dates', () => {
      const dates = companion.getUpcomingSpecialDates(30);
      expect(Array.isArray(dates)).toBe(true);
    });
  });

  describe('Routines', () => {
    it('should add routine', () => {
      const routine = companion.addRoutine({
        name: 'Test Routine',
        time: '10:00',
        type: 'morning',
        message: 'Test message',
        enabled: true,
        daysOfWeek: [1, 2, 3, 4, 5],
      });
      expect(routine.id).toBeDefined();
      expect(routine.name).toBe('Test Routine');
    });

    it('should remove routine', () => {
      const routine = companion.addRoutine({
        name: 'To Remove',
        time: '12:00',
        type: 'afternoon',
        message: 'Test',
        enabled: false,
        daysOfWeek: [1],
      });
      const result = companion.removeRoutine(routine.id);
      expect(result).toBe(true);
    });

    it('should toggle routine', () => {
      const routine = companion.addRoutine({
        name: 'Toggle Test',
        time: '15:00',
        type: 'afternoon',
        message: 'Test',
        enabled: true,
        daysOfWeek: [1, 2, 3],
      });
      const newState = companion.toggleRoutine(routine.id);
      expect(newState).toBe(false);
    });

    it('should return false for non-existent routine', () => {
      const result = companion.removeRoutine('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Interaction Tracking', () => {
    it('should record interaction', () => {
      const initialState = companion.getState();
      companion.recordInteraction();
      const newState = companion.getState();
      expect(newState.totalInteractions).toBe(initialState.totalInteractions + 1);
    });

    it('should emit interaction:recorded event', () => {
      const callback = vi.fn();
      companion.on('interaction:recorded', callback);
      companion.recordInteraction();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should get state', () => {
      const state = companion.getState();
      expect(state.currentMood).toBeDefined();
      expect(state.totalInteractions).toBeDefined();
      expect(state.consecutiveDays).toBeDefined();
    });

    it('should set mood', () => {
      companion.setMood('playful');
      const state = companion.getState();
      expect(state.currentMood).toBe('playful');
    });

    it('should emit mood:changed event', () => {
      const callback = vi.fn();
      companion.on('mood:changed', callback);
      companion.setMood('happy');
      expect(callback).toHaveBeenCalledWith('happy');
    });
  });

  describe('System Prompt', () => {
    it('should return empty string when disabled', () => {
      companion.disable();
      const prompt = companion.getSystemPromptAddition();
      expect(prompt).toBe('');
    });

    it('should return prompt when enabled', () => {
      companion.enable();
      const prompt = companion.getSystemPromptAddition();
      expect(prompt).toContain('Mode Compagne Activé');
      // Check that userName from config is in prompt
      const config = companion.getConfig();
      expect(prompt).toContain(config.userName);
    });
  });

  describe('Stats', () => {
    it('should get stats', () => {
      const stats = companion.getStats();
      expect(stats.enabled).toBeDefined();
      expect(stats.relationshipLevel).toBeDefined();
      expect(stats.consecutiveDays).toBeDefined();
      expect(stats.totalInteractions).toBeDefined();
      expect(stats.activeRoutines).toBeDefined();
      expect(stats.specialDatesCount).toBeDefined();
    });
  });

  describe('Event Emitter', () => {
    it('should emit events', () => {
      const callback = vi.fn();
      companion.on('test', callback);
      companion.emit('test', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should remove event listeners', () => {
      const callback = vi.fn();
      companion.on('test', callback);
      companion.off('test', callback);
      companion.emit('test', { data: 'test' });
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
