/**
 * Tests for useIntentHandler hook
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIntentHandler } from '../useIntentHandler';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'fr',
    },
  }),
}));

// Mock useAppStore
const mockSetPlan = vi.fn();
const mockSetState = vi.fn();
vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      setPlan: mockSetPlan,
      setState: mockSetState,
      selectedLLM: 'gemini-2.0-flash-exp',
    };
    return selector(state);
  }),
}));

// Mock agentRegistry
const mockPlannerExecute = vi.fn();
const mockSmallTalkExecute = vi.fn();
const mockMemoryExecute = vi.fn();
vi.mock('../../features/agents/core/registry', () => ({
  agentRegistry: {
    getAgentAsync: vi.fn((name) => {
      if (name === 'PlannerAgent') {
        return Promise.resolve({ execute: mockPlannerExecute });
      }
      if (name === 'SmallTalkAgent') {
        return Promise.resolve({ execute: mockSmallTalkExecute });
      }
      if (name === 'MemoryAgent') {
        return Promise.resolve({ execute: mockMemoryExecute });
      }
      return Promise.resolve(null);
    }),
  },
}));

// Mock useSpeechResponder
vi.mock('../useSpeechResponder', () => ({
  useSpeechResponder: vi.fn(),
}));

// Mock useSmallTalk
const mockIsSmallTalk = vi.fn();
vi.mock('../useSmallTalk', () => ({
  useSmallTalk: () => ({
    isSmallTalk: mockIsSmallTalk,
  }),
}));

// Mock useUserWorkflows
const mockCheckTriggerPhrase = vi.fn();
const mockExecuteWorkflow = vi.fn();
vi.mock('../useUserWorkflows', () => ({
  useUserWorkflows: () => ({
    checkTriggerPhrase: mockCheckTriggerPhrase,
    executeWorkflow: mockExecuteWorkflow,
  }),
}));

// Mock useSpeechSynthesis
const mockSpeakText = vi.fn();
vi.mock('../useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({
    speakText: mockSpeakText,
  }),
}));

// Mock useMemory
const mockStoreMemory = vi.fn();
const mockRetrieveMemories = vi.fn();
vi.mock('../useMemory', () => ({
  useMemory: () => ({
    storeMemory: mockStoreMemory,
    retrieveMemories: mockRetrieveMemories,
  }),
}));

describe('useIntentHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default mock implementations
    mockCheckTriggerPhrase.mockResolvedValue({ matched: false });
    mockIsSmallTalk.mockReturnValue(false);
    mockPlannerExecute.mockResolvedValue({ success: true });
    mockSmallTalkExecute.mockResolvedValue({ success: true, output: 'Response' });
    mockMemoryExecute.mockResolvedValue({ success: true, output: [] });
    mockStoreMemory.mockResolvedValue({ id: 'mem-1' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('handleIntent', () => {
    it('should return handleIntent function', () => {
      const { result } = renderHook(() => useIntentHandler());

      expect(typeof result.current.handleIntent).toBe('function');
    });

    describe('workflow triggers', () => {
      it('should execute workflow when trigger matches', async () => {
        mockCheckTriggerPhrase.mockResolvedValue({
          matched: true,
          workflowId: 'workflow-1',
        });
        mockExecuteWorkflow.mockResolvedValue(true);

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('run my workflow');
        });

        expect(mockExecuteWorkflow).toHaveBeenCalledWith('workflow-1');
        expect(mockSetState).toHaveBeenCalledWith({ intent: 'processing' });
      });

      it('should speak success message after workflow', async () => {
        mockCheckTriggerPhrase.mockResolvedValue({
          matched: true,
          workflowId: 'workflow-1',
        });
        mockExecuteWorkflow.mockResolvedValue(true);

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('run workflow');
        });

        expect(mockSpeakText).toHaveBeenCalledWith('Action terminée avec succès');
      });

      it('should speak error message on workflow failure', async () => {
        mockCheckTriggerPhrase.mockResolvedValue({
          matched: true,
          workflowId: 'workflow-1',
        });
        mockExecuteWorkflow.mockResolvedValue(false);

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('run workflow');
        });

        expect(mockSpeakText).toHaveBeenCalledWith(
          expect.stringContaining('Erreur')
        );
      });
    });

    describe('memory commands', () => {
      it('should handle store memory command', async () => {
        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('souviens-toi que je suis développeur');
        });

        expect(mockMemoryExecute).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'store',
            content: expect.stringContaining('développeur'),
          })
        );
      });

      it('should handle retrieve memory command', async () => {
        mockMemoryExecute.mockResolvedValue({
          success: true,
          output: [{ content: 'User is a developer', id: 'mem-1' }],
        });

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('rappelle-moi mon métier');
        });

        expect(mockMemoryExecute).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'retrieve',
          })
        );
        expect(mockSpeakText).toHaveBeenCalledWith(
          expect.stringContaining('souviens')
        );
      });

      it('should speak when no memories found', async () => {
        mockMemoryExecute.mockResolvedValue({
          success: true,
          output: [],
        });

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('tu te souviens de quelque chose');
        });

        expect(mockSpeakText).toHaveBeenCalledWith(
          expect.stringContaining('ne me souviens pas')
        );
      });
    });

    describe('small talk', () => {
      it('should handle small talk with SmallTalkAgent', async () => {
        mockIsSmallTalk.mockReturnValue(true);
        mockSmallTalkExecute.mockResolvedValue({
          success: true,
          output: 'Bonjour! Comment puis-je vous aider?',
        });

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('Bonjour Lisa');
        });

        expect(mockSmallTalkExecute).toHaveBeenCalled();
        expect(mockSpeakText).toHaveBeenCalledWith(
          'Bonjour! Comment puis-je vous aider?'
        );
      });

      it('should store small talk interaction in memory', async () => {
        mockIsSmallTalk.mockReturnValue(true);
        mockSmallTalkExecute.mockResolvedValue({
          success: true,
          output: 'Response',
        });

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('Salut');
        });

        expect(mockStoreMemory).toHaveBeenCalledWith(
          expect.stringContaining('Interaction'),
          expect.objectContaining({
            type: 'interaction',
            tags: expect.arrayContaining(['conversation']),
          })
        );
      });
    });

    describe('planner agent', () => {
      it('should use PlannerAgent for non-matched intents', async () => {
        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('Do some complex task');
        });

        expect(mockPlannerExecute).toHaveBeenCalledWith(
          expect.objectContaining({
            request: 'Do some complex task',
            language: 'fr',
          })
        );
      });

      it('should handle load template command', async () => {
        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('load template my-template');
        });

        expect(mockPlannerExecute).toHaveBeenCalledWith(
          expect.objectContaining({
            loadFromTemplate: 'my-template',
          })
        );
      });

      it('should handle resume checkpoint command', async () => {
        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('resume checkpoint checkpoint-123');
        });

        expect(mockPlannerExecute).toHaveBeenCalledWith(
          expect.objectContaining({
            resumeFromCheckpointId: 'checkpoint-123',
          })
        );
      });

      it('should speak success after planner execution', async () => {
        mockPlannerExecute.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('Do task');
        });

        expect(mockSpeakText).toHaveBeenCalledWith(
          'Action terminée avec succès'
        );
      });

      it('should store successful command in memory', async () => {
        mockPlannerExecute.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('Do task');
        });

        expect(mockStoreMemory).toHaveBeenCalledWith(
          expect.stringContaining('Commande exécutée'),
          expect.objectContaining({
            type: 'interaction',
            tags: expect.arrayContaining(['command']),
          })
        );
      });
    });

    describe('internal calls', () => {
      it('should not speak for internal calls', async () => {
        mockPlannerExecute.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('Do task', true);
        });

        expect(mockSpeakText).not.toHaveBeenCalled();
      });

      it('should skip workflow check for internal calls', async () => {
        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('trigger phrase', true);
        });

        expect(mockCheckTriggerPhrase).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should speak error on planner failure', async () => {
        mockPlannerExecute.mockResolvedValue({
          success: false,
          error: 'Planner error',
        });

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('Do task');
        });

        expect(mockSpeakText).toHaveBeenCalledWith(
          expect.stringContaining('Erreur')
        );
      });

      it('should handle exception gracefully', async () => {
        mockPlannerExecute.mockRejectedValue(new Error('Unexpected error'));

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('Do task');
        });

        expect(mockSpeakText).toHaveBeenCalledWith(
          expect.stringContaining('Erreur')
        );
      });
    });

    describe('cleanup', () => {
      it('should clear plan after timeout', async () => {
        mockPlannerExecute.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('Do task');
        });

        act(() => {
          vi.advanceTimersByTime(5000);
        });

        expect(mockSetPlan).toHaveBeenCalledWith(null);
      });

      it('should reset state after handling', async () => {
        mockPlannerExecute.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useIntentHandler());

        await act(async () => {
          await result.current.handleIntent('Do task');
        });

        act(() => {
          vi.advanceTimersByTime(5000);
        });

        expect(mockSetState).toHaveBeenCalledWith({
          intent: undefined,
          listeningActive: false,
        });
      });
    });
  });
});
