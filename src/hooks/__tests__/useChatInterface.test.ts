/**
 * Tests for useChatInterface hook
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatInterface } from '../useChatInterface';

// Mock useIntentHandler
const mockHandleIntent = vi.fn();
vi.mock('../useIntentHandler', () => ({
  useIntentHandler: () => ({
    handleIntent: mockHandleIntent,
  }),
}));

// Mock useSpeechSynthesis
const mockSpeak = vi.fn();
const mockStop = vi.fn();
vi.mock('../useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({
    speak: mockSpeak,
    stop: mockStop,
  }),
}));

// Mock useAppStore
const mockSetState = vi.fn();
vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      intent: 'idle',
      setState: mockSetState,
    };
    return selector(state);
  }),
}));

describe('useChatInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleIntent.mockResolvedValue(undefined);
  });

  describe('initial state', () => {
    it('should have welcome message', () => {
      const { result } = renderHook(() => useChatInterface());

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].sender).toBe('lisa');
      expect(result.current.messages[0].type).toBe('system');
      expect(result.current.messages[0].content).toContain('Bonjour');
    });

    it('should not be listening initially', () => {
      const { result } = renderHook(() => useChatInterface());

      expect(result.current.isListening).toBe(false);
    });

    it('should have speaking enabled initially', () => {
      const { result } = renderHook(() => useChatInterface());

      expect(result.current.isSpeaking).toBe(true);
    });
  });

  describe('addMessage', () => {
    it('should add user message', () => {
      const { result } = renderHook(() => useChatInterface());

      act(() => {
        result.current.addMessage({
          content: 'Hello',
          sender: 'user',
          type: 'text',
        });
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('Hello');
      expect(result.current.messages[1].sender).toBe('user');
    });

    it('should generate unique id and timestamp', () => {
      const { result } = renderHook(() => useChatInterface());

      act(() => {
        result.current.addMessage({
          content: 'Test',
          sender: 'user',
        });
      });

      const message = result.current.messages[1];
      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('should speak lisa messages when speaking is enabled', () => {
      const { result } = renderHook(() => useChatInterface());

      act(() => {
        result.current.addMessage({
          content: 'Hello from Lisa',
          sender: 'lisa',
          type: 'text',
        });
      });

      expect(mockSpeak).toHaveBeenCalledWith('Hello from Lisa');
    });

    it('should not speak system messages', () => {
      const { result } = renderHook(() => useChatInterface());

      act(() => {
        result.current.addMessage({
          content: 'System notification',
          sender: 'lisa',
          type: 'system',
        });
      });

      expect(mockSpeak).not.toHaveBeenCalled();
    });
  });

  describe('handleUserMessage', () => {
    it('should add user message to chat', async () => {
      const { result } = renderHook(() => useChatInterface());

      await act(async () => {
        await result.current.handleUserMessage('Test message');
      });

      // Should have: welcome, user message, typing removed, lisa response
      const userMessages = result.current.messages.filter((m) => m.sender === 'user');
      expect(userMessages.length).toBe(1);
      expect(userMessages[0].content).toBe('Test message');
    });

    it('should call handleIntent with message', async () => {
      const { result } = renderHook(() => useChatInterface());

      await act(async () => {
        await result.current.handleUserMessage('Help me');
      });

      expect(mockHandleIntent).toHaveBeenCalledWith('Help me');
    });

    it('should add error message on failure', async () => {
      mockHandleIntent.mockRejectedValueOnce(new Error('Intent failed'));

      const { result } = renderHook(() => useChatInterface());

      await act(async () => {
        await result.current.handleUserMessage('Failing message');
      });

      const lastMessage = result.current.messages[result.current.messages.length - 1];
      expect(lastMessage.sender).toBe('lisa');
      expect(lastMessage.content).toContain('erreur');
    });
  });

  describe('toggleListening', () => {
    it('should toggle listening state on', () => {
      const { result } = renderHook(() => useChatInterface());

      expect(result.current.isListening).toBe(false);

      act(() => {
        result.current.toggleListening();
      });

      expect(result.current.isListening).toBe(true);
      expect(mockSetState).toHaveBeenCalledWith({ intent: 'listening' });
    });

    it('should toggle listening state off', () => {
      const { result } = renderHook(() => useChatInterface());

      // Turn on
      act(() => {
        result.current.toggleListening();
      });

      // Turn off
      act(() => {
        result.current.toggleListening();
      });

      expect(result.current.isListening).toBe(false);
      expect(mockSetState).toHaveBeenCalledWith({ intent: 'idle' });
    });

    it('should add system message when toggling', () => {
      const { result } = renderHook(() => useChatInterface());
      const initialLength = result.current.messages.length;

      act(() => {
        result.current.toggleListening();
      });

      expect(result.current.messages.length).toBe(initialLength + 1);
      expect(result.current.messages[result.current.messages.length - 1].content).toContain(
        'écoute'
      );
    });
  });

  describe('toggleSpeaking', () => {
    it('should toggle speaking state', () => {
      const { result } = renderHook(() => useChatInterface());

      expect(result.current.isSpeaking).toBe(true);

      act(() => {
        result.current.toggleSpeaking();
      });

      expect(result.current.isSpeaking).toBe(false);
      expect(mockStop).toHaveBeenCalled();
    });

    it('should add system message when toggling off', () => {
      const { result } = renderHook(() => useChatInterface());
      const initialLength = result.current.messages.length;

      act(() => {
        result.current.toggleSpeaking();
      });

      expect(result.current.messages.length).toBe(initialLength + 1);
      expect(result.current.messages[result.current.messages.length - 1].content).toContain(
        'désactivé'
      );
    });

    it('should add system message when toggling on', () => {
      const { result } = renderHook(() => useChatInterface());

      // Turn off
      act(() => {
        result.current.toggleSpeaking();
      });

      // Turn on
      act(() => {
        result.current.toggleSpeaking();
      });

      expect(result.current.messages[result.current.messages.length - 1].content).toContain(
        'activé'
      );
    });
  });

  describe('clearChat', () => {
    it('should clear all messages', () => {
      const { result } = renderHook(() => useChatInterface());

      // Add some messages
      act(() => {
        result.current.addMessage({ content: 'Test 1', sender: 'user' });
        result.current.addMessage({ content: 'Test 2', sender: 'lisa' });
      });

      expect(result.current.messages.length).toBeGreaterThan(1);

      act(() => {
        result.current.clearChat();
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toContain('effacé');
    });
  });

  describe('addSystemMessage', () => {
    it('should add system message', () => {
      const { result } = renderHook(() => useChatInterface());
      const initialLength = result.current.messages.length;

      act(() => {
        result.current.addSystemMessage('System notification');
      });

      expect(result.current.messages.length).toBe(initialLength + 1);
      const lastMessage = result.current.messages[result.current.messages.length - 1];
      expect(lastMessage.content).toBe('System notification');
      expect(lastMessage.sender).toBe('lisa');
      expect(lastMessage.type).toBe('system');
    });
  });

  describe('currentIntent', () => {
    it('should return current intent from store', () => {
      const { result } = renderHook(() => useChatInterface());

      expect(result.current.currentIntent).toBe('idle');
    });
  });
});
