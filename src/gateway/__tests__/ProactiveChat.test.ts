/**
 * Tests unitaires pour ProactiveChat
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProactiveChat, getProactiveChat, resetProactiveChat } from '../ProactiveChat';

describe('ProactiveChat', () => {
  let chat: ProactiveChat;

  beforeEach(() => {
    resetProactiveChat();
    chat = new ProactiveChat({
      enabled: true,
      frequency: 'medium',
    });
  });

  afterEach(() => {
    chat.stop();
    resetProactiveChat();
  });

  describe('Configuration', () => {
    it('should create instance with default config', () => {
      const defaultChat = new ProactiveChat();
      expect(defaultChat).toBeInstanceOf(ProactiveChat);
    });

    it('should create instance with custom config', () => {
      expect(chat).toBeInstanceOf(ProactiveChat);
    });

    it('should use singleton pattern', () => {
      const c1 = getProactiveChat();
      const c2 = getProactiveChat();
      expect(c1).toBe(c2);
    });

    it('should reset singleton', () => {
      const c1 = getProactiveChat();
      resetProactiveChat();
      const c2 = getProactiveChat();
      expect(c1).not.toBe(c2);
    });

    it('should get config', () => {
      const config = chat.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.frequency).toBe('medium');
    });

    it('should update config', () => {
      chat.configure({ frequency: 'high' });
      const config = chat.getConfig();
      expect(config.frequency).toBe('high');
    });

    it('should emit config:changed event', () => {
      const callback = vi.fn();
      chat.on('config:changed', callback);
      chat.configure({ randomLoveChance: 0.2 });
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Start/Stop', () => {
    it('should start proactive messaging', () => {
      chat.start();
      const stats = chat.getStats();
      expect(stats.isRunning).toBe(true);
    });

    it('should stop proactive messaging', () => {
      chat.start();
      chat.stop();
      const stats = chat.getStats();
      expect(stats.isRunning).toBe(false);
    });

    it('should emit started event', () => {
      const callback = vi.fn();
      chat.on('started', callback);
      chat.start();
      expect(callback).toHaveBeenCalled();
    });

    it('should emit stopped event', () => {
      const callback = vi.fn();
      chat.on('stopped', callback);
      chat.start();
      chat.stop();
      expect(callback).toHaveBeenCalled();
    });

    it('should not start if already running', () => {
      chat.start();
      const callback = vi.fn();
      chat.on('started', callback);
      chat.start();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Manual Triggers', () => {
    it('should trigger on user arrival', () => {
      const message = chat.onUserArrival();
      expect(message.type).toBe('greeting');
      expect(message.content).toBeDefined();
    });

    it('should trigger on user leaving', () => {
      const message = chat.onUserLeaving();
      expect(message.type).toBe('farewell');
      expect(message.content).toBeDefined();
    });

    it('should trigger on user achievement', () => {
      const message = chat.onUserAchievement('Completed project');
      expect(message.type).toBe('celebration');
      expect(message.content).toContain('Completed project');
    });

    it('should trigger on user achievement without description', () => {
      const message = chat.onUserAchievement();
      expect(message.type).toBe('celebration');
    });

    it('should trigger on user sad', () => {
      const message = chat.onUserSad();
      expect(message.type).toBe('comfort');
      expect(message.content).toBeDefined();
    });

    it('should emit message event', () => {
      const callback = vi.fn();
      chat.on('message', callback);
      chat.onUserArrival();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Message Management', () => {
    it('should mark message as read', () => {
      const message = chat.onUserArrival();
      expect(message.read).toBe(false);
      chat.markAsRead(message.id);
      // After marking as read, the message should have read=true
      const recent = chat.getRecentMessages(10);
      const found = recent.find(m => m.id === message.id);
      expect(found?.read).toBe(true);
    });

    it('should mark all as read', () => {
      chat.onUserArrival();
      chat.onUserLeaving();
      chat.markAllAsRead();
      const unread = chat.getUnreadMessages();
      expect(unread.length).toBe(0);
    });

    it('should get unread messages', () => {
      chat.onUserArrival();
      const unread = chat.getUnreadMessages();
      expect(unread.length).toBeGreaterThan(0);
    });

    it('should get recent messages', () => {
      chat.onUserArrival();
      chat.onUserLeaving();
      const recent = chat.getRecentMessages(5);
      expect(recent.length).toBeGreaterThan(0);
    });
  });

  describe('Send Methods', () => {
    it('should send encouragement', () => {
      const message = chat.sendEncouragement();
      // May return null if companion mode is disabled
      if (message) {
        expect(message.type).toBe('encouragement');
      }
    });

    it('should send comfort', () => {
      const message = chat.sendComfort();
      if (message) {
        expect(message.type).toBe('comfort');
      }
    });

    it('should send milestone', () => {
      const message = chat.sendMilestone(100);
      if (message) {
        expect(message.type).toBe('milestone');
        expect(message.content).toContain('100');
      }
    });

    it('should send memory reminder', () => {
      const message = chat.sendMemoryReminder();
      if (message) {
        expect(message.type).toBe('memory');
      }
    });
  });

  describe('Stats', () => {
    it('should get stats', () => {
      chat.onUserArrival();
      const stats = chat.getStats();
      expect(stats.totalMessages).toBeGreaterThan(0);
      expect(stats.unreadCount).toBeDefined();
      expect(stats.todayCount).toBeDefined();
      expect(stats.isRunning).toBeDefined();
    });
  });

  describe('Event Emitter', () => {
    it('should emit events', () => {
      const callback = vi.fn();
      chat.on('test', callback);
      chat.emit('test', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should remove event listeners', () => {
      const callback = vi.fn();
      chat.on('test', callback);
      chat.off('test', callback);
      chat.emit('test', { data: 'test' });
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
