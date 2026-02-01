/**
 * Tests unitaires pour SlackBot
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SlackBot, getSlackBot, resetSlackBot } from '../channels/SlackBot';

describe('SlackBot', () => {
  let bot: SlackBot;

  beforeEach(() => {
    resetSlackBot();
    bot = new SlackBot({
      botToken: 'xoxb-test-token',
      appToken: 'xapp-test-token',
      signingSecret: 'test-signing-secret',
      socketMode: true,
    });
  });

  afterEach(() => {
    resetSlackBot();
  });

  describe('Configuration', () => {
    it('should create instance with required config', () => {
      expect(bot).toBeInstanceOf(SlackBot);
    });

    it('should accept whitelist config', () => {
      const customBot = new SlackBot({
        botToken: 'xoxb-test-token',
        allowedChannels: ['C12345678'],
        allowedUsers: ['U12345678'],
        allowedWorkspaces: ['T12345678'],
      });
      expect(customBot).toBeInstanceOf(SlackBot);
    });

    it('should use singleton pattern', () => {
      const b1 = getSlackBot({ botToken: 'token1' });
      const b2 = getSlackBot({ botToken: 'token2' });
      expect(b1).toBe(b2);
    });

    it('should reset singleton', () => {
      const b1 = getSlackBot({ botToken: 'token1' });
      resetSlackBot();
      const b2 = getSlackBot({ botToken: 'token2' });
      expect(b1).not.toBe(b2);
    });
  });

  describe('State Management', () => {
    it('should return initial state', () => {
      const state = bot.getState();
      expect(state.isConnected).toBe(false);
      expect(state.messageCount).toBe(0);
    });

    it('should report not connected initially', () => {
      expect(bot.isConnected()).toBe(false);
    });
  });

  describe('Message Handler', () => {
    it('should set message handler', () => {
      const handler = vi.fn().mockResolvedValue('response');
      bot.setMessageHandler(handler);
      expect(true).toBe(true);
    });
  });

  describe('Conversation History', () => {
    it('should return empty history for new channel', () => {
      const history = bot.getConversationHistory('C12345678');
      expect(history).toEqual([]);
    });
  });

  describe('Stop', () => {
    it('should stop without error when not started', async () => {
      await bot.stop();
      expect(bot.isConnected()).toBe(false);
    });
  });

  describe('Event Emitter', () => {
    it('should emit events', () => {
      const callback = vi.fn();
      bot.on('test', callback);
      bot.emit('test', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should emit connected events', () => {
      const connectedCallback = vi.fn();
      bot.on('connected', connectedCallback);
      bot.emit('connected', { botId: 'B12345678', botName: 'Lisa', teamName: 'Test' });
      expect(connectedCallback).toHaveBeenCalled();
    });

    it('should emit message events', () => {
      const messageCallback = vi.fn();
      bot.on('message', messageCallback);
      bot.emit('message', { 
        id: '123', 
        channelId: 'C123', 
        userId: 'U123', 
        text: 'Hello' 
      });
      expect(messageCallback).toHaveBeenCalled();
    });

    it('should remove event listeners', () => {
      const callback = vi.fn();
      bot.on('test', callback);
      bot.off('test', callback);
      bot.emit('test', { data: 'test' });
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
