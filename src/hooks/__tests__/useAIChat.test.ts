/**
 * Tests for useAIChat hook
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Use vi.hoisted to define mocks that can be referenced in vi.mock factories
const mocks = vi.hoisted(() => ({
  streamMessage: vi.fn(),
  updateConfig: vi.fn(),
  augmentContext: vi.fn(),
  updateConfigRAG: vi.fn(),
  addMessage: vi.fn(),
  updateMessage: vi.fn(),
  getCurrentConversation: vi.fn(),
}));

// Mock aiService
vi.mock('../../services/aiService', () => ({
  aiService: {
    streamMessage: mocks.streamMessage,
    updateConfig: mocks.updateConfig,
  },
}));

// Mock RAGService
vi.mock('../../services/RAGService', () => ({
  ragService: {
    augmentContext: mocks.augmentContext,
    updateConfig: mocks.updateConfigRAG,
  },
}));

// Mock chatHistoryStore
vi.mock('../../store/chatHistoryStore', () => ({
  useChatHistoryStore: Object.assign(
    vi.fn((selector) => {
      const state = {
        addMessage: mocks.addMessage,
        updateMessage: mocks.updateMessage,
        getCurrentConversation: mocks.getCurrentConversation,
        currentConversationId: 'conv-1',
      };
      return selector ? selector(state) : state;
    }),
    {
      setState: vi.fn(),
    }
  ),
}));

// Mock chatSettingsStore
vi.mock('../../store/chatSettingsStore', () => ({
  useChatSettingsStore: vi.fn(() => ({
    ragEnabled: false,
    ragProvider: 'local',
    ragSimilarityThreshold: 0.5,
    ragMaxResults: 5,
    selectedModelId: 'gemini-2.0-flash-exp',
    temperature: 0.7,
    maxTokens: 4096,
  })),
  DEFAULT_MODELS: [
    { id: 'gemini-2.0-flash-exp', provider: 'google', name: 'Gemini 2.0 Flash' },
    { id: 'gpt-4', provider: 'openai', name: 'GPT-4' },
  ],
}));

import { useAIChat } from '../useAIChat';

describe('useAIChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentConversation.mockReturnValue({
      id: 'conv-1',
      messages: [],
    });
    mocks.augmentContext.mockResolvedValue({
      context: '',
      relevantMemories: [],
    });
  });

  describe('initial state', () => {
    it('should not be loading initially', () => {
      const { result } = renderHook(() => useAIChat());

      expect(result.current.isLoading).toBe(false);
    });

    it('should not be streaming initially', () => {
      const { result } = renderHook(() => useAIChat());

      expect(result.current.isStreaming).toBe(false);
    });

    it('should have idle streaming stage', () => {
      const { result } = renderHook(() => useAIChat());

      expect(result.current.streamingStage).toBe('idle');
    });

    it('should have null RAG context', () => {
      const { result } = renderHook(() => useAIChat());

      expect(result.current.ragContext).toBeNull();
    });

    it('should return all expected functions', () => {
      const { result } = renderHook(() => useAIChat());

      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.cancelGeneration).toBe('function');
      expect(typeof result.current.regenerateLastResponse).toBe('function');
    });
  });

  describe('sendMessage', () => {
    it('should add user message', async () => {
      mocks.streamMessage.mockImplementation(async function* () {
        yield { content: 'Response', done: true };
      });

      const { result } = renderHook(() => useAIChat('conv-1'));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(mocks.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          role: 'user',
          content: 'Hello',
        })
      );
    });

    it('should set loading state during message', async () => {
      let resolveStream: () => void;
      const streamPromise = new Promise<void>((resolve) => {
        resolveStream = resolve;
      });

      mocks.streamMessage.mockImplementation(async function* () {
        await streamPromise;
        yield { content: 'Response', done: true };
      });

      const { result } = renderHook(() => useAIChat('conv-1'));

      act(() => {
        result.current.sendMessage('Test');
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isStreaming).toBe(true);

      await act(async () => {
        resolveStream!();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isStreaming).toBe(false);
      });
    });

    it('should configure AI service with model', async () => {
      mocks.streamMessage.mockImplementation(async function* () {
        yield { content: 'Response', done: true };
      });

      const { result } = renderHook(() => useAIChat('conv-1'));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(mocks.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
          model: 'gemini-2.0-flash-exp',
        })
      );
    });

    it('should handle streaming response', async () => {
      mocks.streamMessage.mockImplementation(async function* () {
        yield { content: 'Hello ', done: false };
        yield { content: 'World', done: false };
        yield { content: '', done: true };
      });

      const { result } = renderHook(() => useAIChat('conv-1'));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      // Should have updated message with accumulated content
      expect(mocks.updateMessage).toHaveBeenCalled();
    });

    it('should handle error in streaming', async () => {
      mocks.streamMessage.mockImplementation(async function* () {
        yield { error: 'API Error', done: true };
      });

      const mockOnError = vi.fn();
      const { result } = renderHook(() =>
        useAIChat('conv-1', { onError: mockOnError })
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      // Should add error message
      expect(mocks.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          content: expect.stringContaining('Erreur'),
        })
      );
      expect(mockOnError).toHaveBeenCalled();
    });

    it('should not send when already loading', async () => {
      mocks.streamMessage.mockImplementation(async function* () {
        await new Promise((resolve) => setTimeout(resolve, 100));
        yield { content: 'Response', done: true };
      });

      const { result } = renderHook(() => useAIChat('conv-1'));

      // First call
      act(() => {
        result.current.sendMessage('First');
      });

      // Second call should be ignored
      await act(async () => {
        await result.current.sendMessage('Second');
      });

      // Only one user message should be added (from first call)
      const userMessageCalls = mocks.addMessage.mock.calls.filter(
        (call) => call[0].role === 'user'
      );
      expect(userMessageCalls).toHaveLength(1);
    });
  });

  describe('cancelGeneration', () => {
    it('should cancel ongoing generation', async () => {
      let resolveStream: () => void;
      const streamPromise = new Promise<void>((resolve) => {
        resolveStream = resolve;
      });

      mocks.streamMessage.mockImplementation(async function* () {
        await streamPromise;
        yield { content: 'Response', done: true };
      });

      const { result } = renderHook(() => useAIChat('conv-1'));

      act(() => {
        result.current.sendMessage('Test');
      });

      expect(result.current.isStreaming).toBe(true);

      act(() => {
        result.current.cancelGeneration();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStreaming).toBe(false);

      // Cleanup
      resolveStream!();
    });
  });

  describe('regenerateLastResponse', () => {
    it('should regenerate last response', async () => {
      mocks.getCurrentConversation.mockReturnValue({
        id: 'conv-1',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Original question' },
          { id: 'msg-2', role: 'assistant', content: 'Original answer' },
        ],
      });

      mocks.streamMessage.mockImplementation(async function* () {
        yield { content: 'New answer', done: true };
      });

      const { result } = renderHook(() => useAIChat('conv-1'));

      await act(async () => {
        await result.current.regenerateLastResponse();
      });

      // Should resend the last user message
      expect(mocks.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Original question',
        })
      );
    });

    it('should do nothing if no messages', async () => {
      mocks.getCurrentConversation.mockReturnValue({
        id: 'conv-1',
        messages: [],
      });

      const { result } = renderHook(() => useAIChat('conv-1'));

      await act(async () => {
        await result.current.regenerateLastResponse();
      });

      expect(mocks.addMessage).not.toHaveBeenCalled();
    });
  });

  describe('with custom options', () => {
    it('should use custom provider', async () => {
      mocks.streamMessage.mockImplementation(async function* () {
        yield { content: 'Response', done: true };
      });

      const { result } = renderHook(() =>
        useAIChat('conv-1', { provider: 'openai', model: 'gpt-4' })
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(mocks.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai',
          model: 'gpt-4',
        })
      );
    });

    it('should use custom system prompt', async () => {
      mocks.streamMessage.mockImplementation(async function* () {
        yield { content: 'Response', done: true };
      });

      const { result } = renderHook(() =>
        useAIChat('conv-1', { systemPrompt: 'You are a helpful assistant' })
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      // The system prompt should be included in messages sent to AI
      expect(mocks.streamMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('You are a helpful assistant'),
          }),
        ])
      );
    });
  });

  describe('with conversationId', () => {
    it('should use provided conversationId', async () => {
      mocks.streamMessage.mockImplementation(async function* () {
        yield { content: 'Response', done: true };
      });

      const { result } = renderHook(() => useAIChat('custom-conv'));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(mocks.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'custom-conv',
        })
      );
    });
  });
});
