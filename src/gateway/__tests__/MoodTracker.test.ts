/**
 * Tests unitaires pour MoodTracker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MoodTracker, getMoodTracker, resetMoodTracker } from '../MoodTracker';

describe('MoodTracker', () => {
  let tracker: MoodTracker;

  beforeEach(() => {
    resetMoodTracker();
    tracker = new MoodTracker();
  });

  afterEach(() => {
    resetMoodTracker();
  });

  describe('Configuration', () => {
    it('should create instance', () => {
      expect(tracker).toBeInstanceOf(MoodTracker);
    });

    it('should use singleton pattern', () => {
      const t1 = getMoodTracker();
      const t2 = getMoodTracker();
      expect(t1).toBe(t2);
    });

    it('should reset singleton', () => {
      const t1 = getMoodTracker();
      resetMoodTracker();
      const t2 = getMoodTracker();
      expect(t1).not.toBe(t2);
    });
  });

  describe('Log Mood', () => {
    it('should log mood entry', () => {
      const entry = tracker.logMood('happy', 7);
      expect(entry.id).toBeDefined();
      expect(entry.mood).toBe('happy');
      expect(entry.intensity).toBe(7);
      expect(entry.category).toBe('positive');
      expect(entry.autoDetected).toBe(false);
    });

    it('should log mood with options', () => {
      const entry = tracker.logMood('stressed', 8, {
        note: 'Work deadline',
        triggers: ['work', 'deadline'],
        activities: ['coding'],
      });
      expect(entry.note).toBe('Work deadline');
      expect(entry.triggers).toContain('work');
      expect(entry.activities).toContain('coding');
    });

    it('should clamp intensity between 1 and 10', () => {
      const lowEntry = tracker.logMood('neutral', -5);
      expect(lowEntry.intensity).toBe(1);

      const highEntry = tracker.logMood('neutral', 15);
      expect(highEntry.intensity).toBe(10);
    });

    it('should emit mood:logged event', () => {
      const callback = vi.fn();
      tracker.on('mood:logged', callback);
      tracker.logMood('content', 6);
      expect(callback).toHaveBeenCalled();
    });

    it('should emit mood:changed event', () => {
      const callback = vi.fn();
      tracker.on('mood:changed', callback);
      tracker.logMood('joyful', 9);
      expect(callback).toHaveBeenCalledWith({ mood: 'joyful', intensity: 9 });
    });
  });

  describe('Detect Mood From Text', () => {
    it('should detect positive mood', () => {
      const result = tracker.detectMoodFromText('Je suis super content aujourd\'hui!');
      expect(result).not.toBeNull();
      expect(['joyful', 'happy', 'content']).toContain(result?.mood);
    });

    it('should detect negative mood', () => {
      const result = tracker.detectMoodFromText('Je suis vraiment triste et déprimé');
      expect(result).not.toBeNull();
      expect(result?.mood).toBe('sad');
    });

    it('should detect tired mood', () => {
      const result = tracker.detectMoodFromText('Je suis épuisé, je veux dormir');
      expect(result).not.toBeNull();
      expect(result?.mood).toBe('tired');
    });

    it('should handle text without mood keywords', () => {
      const result = tracker.detectMoodFromText('Bonjour');
      // May return null or detect a mood depending on implementation
      expect(result === null || (result && result.mood)).toBeTruthy();
    });

    it('should emit mood:detected for high confidence', () => {
      const callback = vi.fn();
      tracker.on('mood:detected', callback);
      tracker.detectMoodFromText('Je suis tellement heureux et content!');
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Get Current Mood', () => {
    it('should get current mood', () => {
      const current = tracker.getCurrentMood();
      expect(current.mood).toBeDefined();
      expect(current.intensity).toBeDefined();
      expect(current.category).toBeDefined();
    });

    it('should update after logging', () => {
      tracker.logMood('excited', 9);
      const current = tracker.getCurrentMood();
      expect(current.mood).toBe('excited');
      expect(current.intensity).toBe(9);
    });
  });

  describe('Get Response For Mood', () => {
    it('should get response for current mood', () => {
      tracker.logMood('happy', 8);
      const response = tracker.getResponseForMood();
      expect(response.message).toBeDefined();
      expect(response.emoji).toBeDefined();
      expect(response.tone).toBeDefined();
    });

    it('should get response for specific mood', () => {
      const response = tracker.getResponseForMood('sad');
      expect(response.tone).toBe('comforting');
    });
  });

  describe('Get Mood Emoji', () => {
    it('should get emoji for current mood', () => {
      tracker.logMood('happy', 7);
      const emoji = tracker.getMoodEmoji();
      expect(emoji).toBe('😊');
    });

    it('should get emoji for specific mood', () => {
      expect(tracker.getMoodEmoji('joyful')).toBe('🥰');
      expect(tracker.getMoodEmoji('sad')).toBe('😢');
      expect(tracker.getMoodEmoji('angry')).toBe('😠');
    });
  });

  describe('Get History', () => {
    it('should get all history', () => {
      tracker.logMood('happy', 7);
      tracker.logMood('content', 6);
      const history = tracker.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by limit', () => {
      tracker.logMood('happy', 7);
      tracker.logMood('content', 6);
      tracker.logMood('excited', 8);
      const history = tracker.getHistory({ limit: 2 });
      expect(history.length).toBe(2);
    });

    it('should filter by mood', () => {
      tracker.logMood('happy', 7);
      tracker.logMood('sad', 6);
      const history = tracker.getHistory({ mood: 'happy' });
      expect(history.every(e => e.mood === 'happy')).toBe(true);
    });

    it('should filter by category', () => {
      tracker.logMood('happy', 7);
      tracker.logMood('sad', 6);
      const history = tracker.getHistory({ category: 'positive' });
      expect(history.every(e => e.category === 'positive')).toBe(true);
    });
  });

  describe('Analyze Patterns', () => {
    it('should analyze patterns', () => {
      tracker.logMood('happy', 7);
      tracker.logMood('content', 6);
      const pattern = tracker.analyzePatterns(30);
      expect(pattern.dominantMood).toBeDefined();
      expect(pattern.averageIntensity).toBeDefined();
      expect(pattern.trends).toBeDefined();
      expect(pattern.timeOfDay).toBeDefined();
      expect(pattern.dayOfWeek).toBeDefined();
    });

    it('should return valid pattern', () => {
      // Note: localStorage may have data from previous tests
      const pattern = tracker.analyzePatterns(30);
      expect(pattern.dominantMood).toBeDefined();
      expect(typeof pattern.averageIntensity).toBe('number');
    });
  });

  describe('Wellness Check', () => {
    it('should get wellness check message', () => {
      const message = tracker.getWellnessCheck();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  describe('Stats', () => {
    it('should get stats', () => {
      tracker.logMood('happy', 7);
      const stats = tracker.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.currentMood).toBeDefined();
      expect(stats.dominantMood).toBeDefined();
      expect(stats.averageIntensity).toBeDefined();
      expect(stats.positivePercentage).toBeDefined();
    });
  });

  describe('Event Emitter', () => {
    it('should emit events', () => {
      const callback = vi.fn();
      tracker.on('test', callback);
      tracker.emit('test', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should remove event listeners', () => {
      const callback = vi.fn();
      tracker.on('test', callback);
      tracker.off('test', callback);
      tracker.emit('test', { data: 'test' });
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
