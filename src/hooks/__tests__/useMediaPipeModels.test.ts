/**
 * Tests for useMediaPipeModels hook
 * Tests MediaPipe library initialization and model loading
 */

import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock MediaPipe tasks-vision
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn().mockResolvedValue({}),
  },
  FaceLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detectForVideo: vi.fn(),
      close: vi.fn(),
    }),
  },
  HandLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detectForVideo: vi.fn(),
      close: vi.fn(),
    }),
  },
  ObjectDetector: {
    createFromOptions: vi.fn().mockResolvedValue({
      detectForVideo: vi.fn(),
      close: vi.fn(),
    }),
  },
  PoseLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detectForVideo: vi.fn(),
      close: vi.fn(),
    }),
  },
  ImageClassifier: {
    createFromOptions: vi.fn().mockResolvedValue({
      classify: vi.fn(),
      close: vi.fn(),
    }),
  },
  GestureRecognizer: {
    createFromOptions: vi.fn().mockResolvedValue({
      recognize: vi.fn(),
      close: vi.fn(),
    }),
  },
  ImageEmbedder: {
    createFromOptions: vi.fn().mockResolvedValue({
      embed: vi.fn(),
      close: vi.fn(),
    }),
  },
}));

// Mock MediaPipe tasks-audio
vi.mock('@mediapipe/tasks-audio', () => ({
  FilesetResolver: {
    forAudioTasks: vi.fn().mockResolvedValue({}),
  },
  AudioClassifier: {
    createFromOptions: vi.fn().mockResolvedValue({
      classify: vi.fn(),
      close: vi.fn(),
    }),
  },
}));

import { useMediaPipeModels } from '../useMediaPipeModels';
import { FilesetResolver, FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

describe('useMediaPipeModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useMediaPipeModels());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should call FilesetResolver.forVisionTasks with correct WASM path', async () => {
    renderHook(() => useMediaPipeModels());

    await waitFor(() => {
      expect(FilesetResolver.forVisionTasks).toHaveBeenCalledWith(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );
    });
  });

  it('should create FaceLandmarker with VIDEO running mode', async () => {
    renderHook(() => useMediaPipeModels());

    await waitFor(() => {
      expect(FaceLandmarker.createFromOptions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          runningMode: 'VIDEO',
          numFaces: 1,
        })
      );
    });
  });

  it('should create PoseLandmarker with correct options', async () => {
    renderHook(() => useMediaPipeModels());

    await waitFor(() => {
      expect(PoseLandmarker.createFromOptions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          runningMode: 'VIDEO',
          numPoses: 1,
        })
      );
    });
  });

  it('should set loading to false after initialization', async () => {
    const { result } = renderHook(() => useMediaPipeModels());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle initialization errors gracefully', async () => {
    (FilesetResolver.forVisionTasks as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('WASM loading failed')
    );

    const { result } = renderHook(() => useMediaPipeModels());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  it('should cleanup models on unmount', async () => {
    const mockClose = vi.fn();
    (FaceLandmarker.createFromOptions as ReturnType<typeof vi.fn>).mockResolvedValue({
      detectForVideo: vi.fn(),
      close: mockClose,
    });

    const { unmount, result } = renderHook(() => useMediaPipeModels());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    unmount();

    // Close should be called for cleanup
    expect(mockClose).toHaveBeenCalled();
  });

  it('should return models object with all detectors', async () => {
    const { result } = renderHook(() => useMediaPipeModels());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.models).toHaveProperty('faceLandmarker');
    expect(result.current.models).toHaveProperty('handLandmarker');
    expect(result.current.models).toHaveProperty('objectDetector');
    expect(result.current.models).toHaveProperty('poseLandmarker');
  });
});
