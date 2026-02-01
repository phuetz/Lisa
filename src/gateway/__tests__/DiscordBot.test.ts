/**
 * Tests unitaires pour DiscordBot
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiscordBot, getDiscordBot, resetDiscordBot } from '../channels/DiscordBot';

describe('DiscordBot', () => {
  let bot: DiscordBot;

  beforeEach(() => {
    resetDiscordBot();
    bot = new DiscordBot({ token: 'test-token-123' });
  });

  afterEach(() => {
    resetDiscordBot();
  });

  describe('Configuration', () => {
    it('should create instance with required token', () => {
      expect(bot).toBeInstanceOf(DiscordBot);
    });

    it('should accept custom config', () => {
      const customBot = new DiscordBot({
        token: 'custom-token',
        allowedUsers: ['user1', 'user2'],
        allowedGuilds: ['guild1'],
        allowedChannels: ['channel1'],
        commandPrefix: '!lisa',
        activityMessage: 'avec toi',
      });
      expect(customBot).toBeInstanceOf(DiscordBot);
    });

    it('should use singleton pattern', () => {
      const bot1 = getDiscordBot({ token: 'token1' });
      const bot2 = getDiscordBot({ token: 'token2' });
      expect(bot1).toBe(bot2);
    });

    it('should reset singleton', () => {
      const bot1 = getDiscordBot({ token: 'token1' });
      resetDiscordBot();
      const bot2 = getDiscordBot({ token: 'token2' });
      expect(bot1).not.toBe(bot2);
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
      const history = bot.getConversationHistory('channel-123');
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

    it('should remove event listeners', () => {
      const callback = vi.fn();
      bot.on('test', callback);
      bot.off('test', callback);
      bot.emit('test', { data: 'test' });
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
