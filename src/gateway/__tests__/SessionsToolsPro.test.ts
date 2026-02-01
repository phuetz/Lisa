/**
 * Tests unitaires pour SessionsToolsPro
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionsToolsPro, getSessionsTools, resetSessionsTools } from '../SessionsToolsPro';

describe('SessionsToolsPro', () => {
  let sessions: SessionsToolsPro;

  beforeEach(() => {
    resetSessionsTools();
    sessions = new SessionsToolsPro();
  });

  afterEach(() => {
    resetSessionsTools();
  });

  describe('Configuration', () => {
    it('should create instance', () => {
      expect(sessions).toBeInstanceOf(SessionsToolsPro);
    });

    it('should use singleton pattern', () => {
      const s1 = getSessionsTools();
      const s2 = getSessionsTools();
      expect(s1).toBe(s2);
    });

    it('should reset singleton', () => {
      const s1 = getSessionsTools();
      resetSessionsTools();
      const s2 = getSessionsTools();
      expect(s1).not.toBe(s2);
    });
  });

  describe('Sessions List', () => {
    it('should return empty list initially', async () => {
      const list = await sessions.sessionsList();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(0);
    });

    it('should filter by status', async () => {
      const list = await sessions.sessionsList({ status: 'active' });
      expect(Array.isArray(list)).toBe(true);
    });

    it('should filter by channel type', async () => {
      const list = await sessions.sessionsList({ channelType: 'telegram' });
      expect(Array.isArray(list)).toBe(true);
    });
  });

  describe('Sessions History', () => {
    it('should return empty history for non-existent session', async () => {
      const history = await sessions.sessionsHistory('non-existent');
      expect(history).toBeDefined();
      expect(history.messages).toEqual([]);
    });

    it('should accept limit parameter', async () => {
      const history = await sessions.sessionsHistory('test-session', { limit: 10 });
      expect(history).toBeDefined();
    });
  });

  describe('Sessions Send', () => {
    it('should return result for send attempt', async () => {
      const result = await sessions.sessionsSend('test-session', 'Hello!');
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should accept options', async () => {
      const result = await sessions.sessionsSend('test-session', 'Hello!', {
        replyBack: true,
        timeout: 5000,
      });
      expect(result).toBeDefined();
    });
  });

  describe('Sessions Spawn', () => {
    it('should create new session', async () => {
      const newSession = await sessions.sessionsSpawn('Test Session', { channelType: 'internal' });
      expect(newSession).toBeDefined();
      expect(newSession.id).toBeDefined();
      expect(newSession.name).toBe('Test Session');
    });

    it('should accept options', async () => {
      const newSession = await sessions.sessionsSpawn('Test Session', {
        channelType: 'internal',
        initialMessages: [
          { role: 'user', content: 'Hello' },
        ],
      });
      expect(newSession).toBeDefined();
    });

    it('should assign unique IDs', async () => {
      const s1 = await sessions.sessionsSpawn('Session 1', { channelType: 'internal' });
      const s2 = await sessions.sessionsSpawn('Session 2', { channelType: 'internal' });
      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe('Sessions Close', () => {
    it('should close existing session', async () => {
      const newSession = await sessions.sessionsSpawn('To Close', { channelType: 'internal' });
      const result = await sessions.sessionsClose(newSession.id);
      expect(result).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      const result = await sessions.sessionsClose('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Event Emitter', () => {
    it('should emit events', () => {
      const callback = vi.fn();
      sessions.on('test', callback);
      sessions.emit('test', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should emit sessionSpawned events', async () => {
      const callback = vi.fn();
      sessions.on('sessionSpawned', callback);
      await sessions.sessionsSpawn('Event Test', { channelType: 'internal' });
      expect(callback).toHaveBeenCalled();
    });

    it('should remove event listeners', () => {
      const callback = vi.fn();
      sessions.on('test', callback);
      sessions.off('test', callback);
      sessions.emit('test', { data: 'test' });
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
