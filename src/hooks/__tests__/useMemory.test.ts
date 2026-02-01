/**
 * Tests for useMemory hook
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMemory } from '../useMemory';

// Mock agentRegistry
const mockExecute = vi.fn();
vi.mock('../../features/agents/core/registry', () => ({
  agentRegistry: {
    getAgentAsync: vi.fn(async () => ({
      execute: mockExecute,
    })),
  },
}));

// Mock useAppStore
vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      setState: vi.fn(),
    };
    return selector(state);
  }),
}));

describe('useMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockReset();
  });

  describe('initial state', () => {
    it('should have isLoading false initially', () => {
      const { result } = renderHook(() => useMemory());

      expect(result.current.isLoading).toBe(false);
    });

    it('should have error null initially', () => {
      const { result } = renderHook(() => useMemory());

      expect(result.current.error).toBeNull();
    });

    it('should return all expected functions', () => {
      const { result } = renderHook(() => useMemory());

      expect(typeof result.current.storeMemory).toBe('function');
      expect(typeof result.current.retrieveMemories).toBe('function');
      expect(typeof result.current.updateMemory).toBe('function');
      expect(typeof result.current.deleteMemory).toBe('function');
      expect(typeof result.current.summarizeMemories).toBe('function');
      expect(typeof result.current.getRecentMemories).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('storeMemory', () => {
    it('should store memory successfully', async () => {
      const mockMemory = {
        id: 'mem-1',
        content: 'Test memory',
        type: 'fact',
        timestamp: Date.now(),
      };

      mockExecute.mockResolvedValueOnce({
        success: true,
        output: mockMemory,
      });

      const { result } = renderHook(() => useMemory());

      let storedMemory;
      await act(async () => {
        storedMemory = await result.current.storeMemory('Test memory');
      });

      expect(storedMemory).toEqual(mockMemory);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'store',
          content: 'Test memory',
        })
      );
    });

    it('should set isLoading during operation', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockExecute.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useMemory());

      act(() => {
        result.current.storeMemory('Test');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ success: true, output: {} });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set error on failure', async () => {
      mockExecute.mockResolvedValueOnce({
        success: false,
        error: 'Storage failed',
      });

      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.storeMemory('Test');
      });

      expect(result.current.error).toBe('Storage failed');
    });

    it('should use custom options', async () => {
      mockExecute.mockResolvedValueOnce({ success: true, output: {} });

      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.storeMemory('Test', {
          type: 'preference',
          tags: ['tag1', 'tag2'],
          source: 'test_source',
          confidence: 0.8,
        });
      });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'preference',
          tags: ['tag1', 'tag2'],
          source: 'test_source',
          confidence: 0.8,
        })
      );
    });
  });

  describe('retrieveMemories', () => {
    it('should retrieve memories successfully', async () => {
      const mockMemories = [
        { id: 'mem-1', content: 'Memory 1' },
        { id: 'mem-2', content: 'Memory 2' },
      ];

      mockExecute.mockResolvedValueOnce({
        success: true,
        output: mockMemories,
      });

      const { result } = renderHook(() => useMemory());

      let memories;
      await act(async () => {
        memories = await result.current.retrieveMemories({ text: 'search' });
      });

      expect(memories).toEqual(mockMemories);
    });

    it('should use default limit from options', async () => {
      mockExecute.mockResolvedValueOnce({ success: true, output: [] });

      const { result } = renderHook(() => useMemory({ defaultLimit: 10 }));

      await act(async () => {
        await result.current.retrieveMemories({ text: 'search' });
      });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ limit: 10 }),
        })
      );
    });

    it('should return empty array on error', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useMemory());

      let memories;
      await act(async () => {
        memories = await result.current.retrieveMemories({ text: 'search' });
      });

      expect(memories).toEqual([]);
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('updateMemory', () => {
    it('should update memory successfully', async () => {
      const updatedMemory = { id: 'mem-1', content: 'Updated content' };

      mockExecute.mockResolvedValueOnce({
        success: true,
        output: updatedMemory,
      });

      const { result } = renderHook(() => useMemory());

      let updated;
      await act(async () => {
        updated = await result.current.updateMemory('mem-1', { content: 'Updated content' });
      });

      expect(updated).toEqual(updatedMemory);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          id: 'mem-1',
          updates: { content: 'Updated content' },
        })
      );
    });

    it('should return null on failure', async () => {
      mockExecute.mockResolvedValueOnce({
        success: false,
        error: 'Not found',
      });

      const { result } = renderHook(() => useMemory());

      let updated;
      await act(async () => {
        updated = await result.current.updateMemory('mem-1', {});
      });

      expect(updated).toBeNull();
    });
  });

  describe('deleteMemory', () => {
    it('should delete memory successfully', async () => {
      mockExecute.mockResolvedValueOnce({
        success: true,
        output: true,
      });

      const { result } = renderHook(() => useMemory());

      let deleted;
      await act(async () => {
        deleted = await result.current.deleteMemory('mem-1');
      });

      expect(deleted).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          id: 'mem-1',
        })
      );
    });

    it('should return false on failure', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useMemory());

      let deleted;
      await act(async () => {
        deleted = await result.current.deleteMemory('mem-1');
      });

      expect(deleted).toBe(false);
    });
  });

  describe('summarizeMemories', () => {
    it('should summarize memories successfully', async () => {
      mockExecute.mockResolvedValueOnce({
        success: true,
        output: 'Summary of memories',
      });

      const { result } = renderHook(() => useMemory());

      let summary;
      await act(async () => {
        summary = await result.current.summarizeMemories('context');
      });

      expect(summary).toBe('Summary of memories');
    });

    it('should return fallback message on error', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Summarize failed'));

      const { result } = renderHook(() => useMemory());

      let summary;
      await act(async () => {
        summary = await result.current.summarizeMemories('context');
      });

      expect(summary).toContain('Unable to summarize');
    });
  });

  describe('getRecentMemories', () => {
    it('should get recent memories', async () => {
      const mockMemories = [{ id: 'mem-1' }];

      mockExecute.mockResolvedValueOnce({
        success: true,
        output: mockMemories,
      });

      const { result } = renderHook(() => useMemory());

      let memories;
      await act(async () => {
        memories = await result.current.getRecentMemories(3);
      });

      expect(memories).toEqual(mockMemories);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ sortBy: 'timestamp' }),
        })
      );
    });
  });

  describe('clearError', () => {
    it('should clear error', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.storeMemory('Test');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
