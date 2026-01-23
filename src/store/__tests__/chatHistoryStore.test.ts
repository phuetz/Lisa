/**
 * Tests for chatHistoryStore
 * TASK-4.1: Couverture tests 100%
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useChatHistoryStore } from '../chatHistoryStore';

describe('chatHistoryStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChatHistoryStore.setState({
      conversations: [],
      currentConversationId: null,
      isTyping: false,
      streamingMessage: null,
    });
  });

  describe('createConversation', () => {
    it('should create a new conversation with default values', () => {
      const store = useChatHistoryStore.getState();
      const id = store.createConversation();

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const state = useChatHistoryStore.getState();
      expect(state.conversations).toHaveLength(1);
      expect(state.currentConversationId).toBe(id);

      const conv = state.conversations[0];
      expect(conv.title).toBe('Nouvelle conversation');
      expect(conv.messages).toEqual([]);
      expect(conv.archived).toBe(false);
      expect(conv.pinned).toBe(false);
    });

    it('should add new conversation at the beginning', () => {
      const store = useChatHistoryStore.getState();
      const id1 = store.createConversation();
      const id2 = store.createConversation();

      const state = useChatHistoryStore.getState();
      expect(state.conversations[0].id).toBe(id2);
      expect(state.conversations[1].id).toBe(id1);
    });
  });

  describe('deleteConversation', () => {
    it('should delete a conversation by id', () => {
      const store = useChatHistoryStore.getState();
      const id = store.createConversation();

      expect(useChatHistoryStore.getState().conversations).toHaveLength(1);

      useChatHistoryStore.getState().deleteConversation(id);

      expect(useChatHistoryStore.getState().conversations).toHaveLength(0);
    });

    it('should switch to another conversation when current is deleted', () => {
      const store = useChatHistoryStore.getState();
      const id1 = store.createConversation();
      const id2 = store.createConversation();

      expect(useChatHistoryStore.getState().currentConversationId).toBe(id2);

      useChatHistoryStore.getState().deleteConversation(id2);

      expect(useChatHistoryStore.getState().currentConversationId).toBe(id1);
    });

    it('should set currentConversationId to null when last conversation is deleted', () => {
      const store = useChatHistoryStore.getState();
      const id = store.createConversation();

      useChatHistoryStore.getState().deleteConversation(id);

      expect(useChatHistoryStore.getState().currentConversationId).toBeNull();
    });
  });

  describe('archiveConversation', () => {
    it('should toggle archived status', () => {
      const store = useChatHistoryStore.getState();
      const id = store.createConversation();

      expect(useChatHistoryStore.getState().conversations[0].archived).toBe(false);

      useChatHistoryStore.getState().archiveConversation(id);
      expect(useChatHistoryStore.getState().conversations[0].archived).toBe(true);

      useChatHistoryStore.getState().archiveConversation(id);
      expect(useChatHistoryStore.getState().conversations[0].archived).toBe(false);
    });
  });

  describe('pinConversation', () => {
    it('should toggle pinned status', () => {
      const store = useChatHistoryStore.getState();
      const id = store.createConversation();

      expect(useChatHistoryStore.getState().conversations[0].pinned).toBe(false);

      useChatHistoryStore.getState().pinConversation(id);
      expect(useChatHistoryStore.getState().conversations[0].pinned).toBe(true);

      useChatHistoryStore.getState().pinConversation(id);
      expect(useChatHistoryStore.getState().conversations[0].pinned).toBe(false);
    });
  });

  describe('setCurrentConversation', () => {
    it('should set the current conversation id', () => {
      const store = useChatHistoryStore.getState();
      const id1 = store.createConversation();
      store.createConversation(); // id2

      useChatHistoryStore.getState().setCurrentConversation(id1);

      expect(useChatHistoryStore.getState().currentConversationId).toBe(id1);
    });
  });

  describe('getCurrentConversation', () => {
    it('should return the current conversation', () => {
      const store = useChatHistoryStore.getState();
      const id = store.createConversation();

      const current = useChatHistoryStore.getState().getCurrentConversation();

      expect(current).not.toBeNull();
      expect(current?.id).toBe(id);
    });

    it('should return null when no conversation is selected', () => {
      const current = useChatHistoryStore.getState().getCurrentConversation();
      expect(current).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('should add a message to the current conversation', () => {
      const store = useChatHistoryStore.getState();
      store.createConversation();

      const messageId = useChatHistoryStore.getState().addMessage({
        role: 'user',
        content: 'Hello Lisa!',
        conversationId: useChatHistoryStore.getState().currentConversationId!,
      });

      expect(messageId).toBeDefined();

      const conv = useChatHistoryStore.getState().getCurrentConversation();
      expect(conv?.messages).toHaveLength(1);
      expect(conv?.messages[0].content).toBe('Hello Lisa!');
      expect(conv?.messages[0].role).toBe('user');
    });

    it('should auto-generate title from first user message', () => {
      const store = useChatHistoryStore.getState();
      store.createConversation();

      useChatHistoryStore.getState().addMessage({
        role: 'user',
        content: 'What is the meaning of life?',
        conversationId: useChatHistoryStore.getState().currentConversationId!,
      });

      const conv = useChatHistoryStore.getState().getCurrentConversation();
      expect(conv?.title).toBe('What is the meaning of life?');
    });

    it('should truncate long titles to 50 chars', () => {
      const store = useChatHistoryStore.getState();
      store.createConversation();

      const longMessage = 'A'.repeat(100);
      useChatHistoryStore.getState().addMessage({
        role: 'user',
        content: longMessage,
        conversationId: useChatHistoryStore.getState().currentConversationId!,
      });

      const conv = useChatHistoryStore.getState().getCurrentConversation();
      expect(conv?.title).toBe('A'.repeat(50) + '...');
    });

    it('should return empty string if no current conversation', () => {
      const messageId = useChatHistoryStore.getState().addMessage({
        role: 'user',
        content: 'Hello',
        conversationId: '',
      });

      expect(messageId).toBe('');
    });
  });

  describe('updateMessage', () => {
    it('should update message content', () => {
      const store = useChatHistoryStore.getState();
      store.createConversation();

      const messageId = useChatHistoryStore.getState().addMessage({
        role: 'assistant',
        content: 'Initial response',
        conversationId: useChatHistoryStore.getState().currentConversationId!,
      });

      useChatHistoryStore.getState().updateMessage(messageId, 'Updated response');

      const conv = useChatHistoryStore.getState().getCurrentConversation();
      expect(conv?.messages[0].content).toBe('Updated response');
    });

    it('should update message with metadata', () => {
      const store = useChatHistoryStore.getState();
      store.createConversation();

      const messageId = useChatHistoryStore.getState().addMessage({
        role: 'assistant',
        content: 'Response',
        conversationId: useChatHistoryStore.getState().currentConversationId!,
      });

      useChatHistoryStore.getState().updateMessage(messageId, 'Response', {
        tokens: 100,
        model: 'gpt-4',
      });

      const conv = useChatHistoryStore.getState().getCurrentConversation();
      expect(conv?.messages[0].metadata?.tokens).toBe(100);
      expect(conv?.messages[0].metadata?.model).toBe('gpt-4');
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message from current conversation', () => {
      const store = useChatHistoryStore.getState();
      store.createConversation();

      const messageId = useChatHistoryStore.getState().addMessage({
        role: 'user',
        content: 'Hello',
        conversationId: useChatHistoryStore.getState().currentConversationId!,
      });

      expect(useChatHistoryStore.getState().getCurrentConversation()?.messages).toHaveLength(1);

      useChatHistoryStore.getState().deleteMessage(messageId);

      expect(useChatHistoryStore.getState().getCurrentConversation()?.messages).toHaveLength(0);
    });
  });

  describe('clearCurrentConversation', () => {
    it('should clear all messages from current conversation', () => {
      const store = useChatHistoryStore.getState();
      store.createConversation();

      useChatHistoryStore.getState().addMessage({
        role: 'user',
        content: 'Message 1',
        conversationId: useChatHistoryStore.getState().currentConversationId!,
      });
      useChatHistoryStore.getState().addMessage({
        role: 'assistant',
        content: 'Message 2',
        conversationId: useChatHistoryStore.getState().currentConversationId!,
      });

      expect(useChatHistoryStore.getState().getCurrentConversation()?.messages).toHaveLength(2);

      useChatHistoryStore.getState().clearCurrentConversation();

      expect(useChatHistoryStore.getState().getCurrentConversation()?.messages).toHaveLength(0);
    });
  });

  describe('setTyping', () => {
    it('should set typing state', () => {
      useChatHistoryStore.getState().setTyping(true);
      expect(useChatHistoryStore.getState().isTyping).toBe(true);

      useChatHistoryStore.getState().setTyping(false);
      expect(useChatHistoryStore.getState().isTyping).toBe(false);
    });
  });

  describe('setStreamingMessage', () => {
    it('should set streaming message content', () => {
      useChatHistoryStore.getState().setStreamingMessage('Streaming...');
      expect(useChatHistoryStore.getState().streamingMessage).toBe('Streaming...');

      useChatHistoryStore.getState().setStreamingMessage(null);
      expect(useChatHistoryStore.getState().streamingMessage).toBeNull();
    });
  });

  describe('searchConversations', () => {
    it('should find conversations by title', () => {
      const store = useChatHistoryStore.getState();
      store.createConversation();
      useChatHistoryStore.getState().addMessage({
        role: 'user',
        content: 'React tutorial',
        conversationId: useChatHistoryStore.getState().currentConversationId!,
      });

      store.createConversation();
      useChatHistoryStore.getState().addMessage({
        role: 'user',
        content: 'Python basics',
        conversationId: useChatHistoryStore.getState().currentConversationId!,
      });

      const results = useChatHistoryStore.getState().searchConversations('React');
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('React');
    });

    it('should find conversations by message content', () => {
      const store = useChatHistoryStore.getState();
      store.createConversation();
      useChatHistoryStore.getState().addMessage({
        role: 'user',
        content: 'Hello',
        conversationId: useChatHistoryStore.getState().currentConversationId!,
      });
      useChatHistoryStore.getState().addMessage({
        role: 'assistant',
        content: 'I can help with TypeScript questions',
        conversationId: useChatHistoryStore.getState().currentConversationId!,
      });

      const results = useChatHistoryStore.getState().searchConversations('TypeScript');
      expect(results).toHaveLength(1);
    });

    it('should be case-insensitive', () => {
      const store = useChatHistoryStore.getState();
      store.createConversation();
      useChatHistoryStore.getState().addMessage({
        role: 'user',
        content: 'JavaScript Guide',
        conversationId: useChatHistoryStore.getState().currentConversationId!,
      });

      const results = useChatHistoryStore.getState().searchConversations('javascript');
      expect(results).toHaveLength(1);
    });
  });

  describe('exportConversation', () => {
    it('should export conversation as JSON string', () => {
      const store = useChatHistoryStore.getState();
      const id = store.createConversation();
      useChatHistoryStore.getState().addMessage({
        role: 'user',
        content: 'Test message',
        conversationId: id,
      });

      const exported = useChatHistoryStore.getState().exportConversation(id);
      const parsed = JSON.parse(exported);

      expect(parsed.id).toBe(id);
      expect(parsed.messages).toHaveLength(1);
      expect(parsed.messages[0].content).toBe('Test message');
    });

    it('should return empty string for non-existent conversation', () => {
      const exported = useChatHistoryStore.getState().exportConversation('non-existent');
      expect(exported).toBe('');
    });
  });

  describe('importConversation', () => {
    it('should import conversation from JSON string', () => {
      const conversationData = JSON.stringify({
        id: 'old-id',
        title: 'Imported Conversation',
        messages: [
          { id: 'msg1', role: 'user', content: 'Hello', timestamp: new Date() },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        archived: false,
        pinned: false,
        tags: [],
      });

      useChatHistoryStore.getState().importConversation(conversationData);

      const state = useChatHistoryStore.getState();
      expect(state.conversations).toHaveLength(1);
      expect(state.conversations[0].title).toBe('Imported Conversation');
      // ID should be regenerated
      expect(state.conversations[0].id).not.toBe('old-id');
    });

    it('should handle invalid JSON gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      useChatHistoryStore.getState().importConversation('invalid json');

      expect(consoleSpy).toHaveBeenCalled();
      expect(useChatHistoryStore.getState().conversations).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });
});
