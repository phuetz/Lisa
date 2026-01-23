/**
 * Tests for useFallDetector hook
 */

import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the store module
vi.mock('../../store/appStore', () => {
  const mockSetState = vi.fn();
  return {
    useAppStore: Object.assign(
      vi.fn((selector) => {
        const state = {
          percepts: [],
          fallDetected: false,
          fallEventTimestamp: null,
        };
        return selector ? selector(state) : state;
      }),
      { setState: mockSetState }
    ),
  };
});

// Mock the FallDetector service
vi.mock('../../services/FallDetector', () => ({
  fallDetector: {
    start: vi.fn(),
    stop: vi.fn(),
    isRunning: vi.fn(() => false),
    onFallDetected: vi.fn(),
    analyzePose: vi.fn(),
  },
}));

import { useFallDetector } from '../useFallDetector';
import { fallDetector } from '../../services/FallDetector';

describe('useFallDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fallDetector.isRunning as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFallDetector());

    expect(result.current.isActive).toBe(true);
    expect(result.current.lastEvent).toBeNull();
    expect(typeof result.current.dismissAlert).toBe('function');
    expect(typeof result.current.confirmAlert).toBe('function');
  });

  it('should start fall detector when enabled', () => {
    renderHook(() => useFallDetector({ enabled: true }));

    expect(fallDetector.start).toHaveBeenCalled();
    expect(fallDetector.onFallDetected).toHaveBeenCalled();
  });

  it('should not start fall detector when disabled', () => {
    const { result } = renderHook(() => useFallDetector({ enabled: false }));

    expect(fallDetector.start).not.toHaveBeenCalled();
    expect(result.current.isActive).toBe(false);
  });

  it('should stop fall detector when disabled after being enabled', () => {
    (fallDetector.isRunning as ReturnType<typeof vi.fn>).mockReturnValue(true);
    
    const { rerender } = renderHook(
      ({ enabled }) => useFallDetector({ enabled }),
      { initialProps: { enabled: true } }
    );

    rerender({ enabled: false });

    expect(fallDetector.stop).toHaveBeenCalled();
  });

  it('should register onFallDetected callback', () => {
    const onFallDetected = vi.fn();
    
    renderHook(() => useFallDetector({ onFallDetected }));

    expect(fallDetector.onFallDetected).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should call onFallDetected when fall is confirmed', () => {
    const onFallDetected = vi.fn();
    let capturedCallback: ((event: unknown) => void) | null = null;

    (fallDetector.onFallDetected as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
      capturedCallback = cb;
    });

    renderHook(() => useFallDetector({ onFallDetected }));

    // Simulate a confirmed fall event
    act(() => {
      if (capturedCallback) {
        capturedCallback({
          type: 'confirmed',
          timestamp: Date.now(),
          confidence: 0.95,
        });
      }
    });

    expect(onFallDetected).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'confirmed',
        confidence: 0.95,
      })
    );
  });

  it('should call onFalsePositive when fall is dismissed', () => {
    const onFalsePositive = vi.fn();
    let capturedCallback: ((event: unknown) => void) | null = null;

    (fallDetector.onFallDetected as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
      capturedCallback = cb;
    });

    renderHook(() => useFallDetector({ onFalsePositive }));

    // Simulate a false positive event
    act(() => {
      if (capturedCallback) {
        capturedCallback({
          type: 'false-positive',
          timestamp: Date.now(),
          confidence: 0.3,
        });
      }
    });

    expect(onFalsePositive).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'false-positive',
      })
    );
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useFallDetector());

    unmount();

    expect(fallDetector.stop).toHaveBeenCalled();
  });

  it('should update lastEvent when fall is detected', () => {
    let capturedCallback: ((event: unknown) => void) | null = null;

    (fallDetector.onFallDetected as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
      capturedCallback = cb;
    });

    const { result } = renderHook(() => useFallDetector());

    const mockEvent = {
      type: 'confirmed',
      timestamp: Date.now(),
      confidence: 0.9,
    };

    act(() => {
      if (capturedCallback) {
        capturedCallback(mockEvent);
      }
    });

    expect(result.current.lastEvent).toEqual(mockEvent);
  });
});
