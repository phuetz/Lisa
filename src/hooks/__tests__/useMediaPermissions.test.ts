/**
 * Tests for useMediaPermissions hook
 */

import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useMediaPermissions } from '../useMediaPermissions';

describe('useMediaPermissions', () => {
  const mockStream = {
    getTracks: vi.fn(() => [{ stop: vi.fn() }]),
  };

  beforeEach(() => {
    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(() => Promise.resolve(mockStream)),
      },
      writable: true,
      configurable: true,
    });

    // Mock navigator.permissions
    Object.defineProperty(navigator, 'permissions', {
      value: {
        query: vi.fn(() => Promise.resolve({ state: 'prompt', onchange: null })),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with prompt permissions', async () => {
    const { result } = renderHook(() => useMediaPermissions());

    // Initial state should be prompt
    expect(result.current.permissions.camera).toBe('prompt');
    expect(result.current.permissions.microphone).toBe('prompt');
  });

  it('should have requestCamera function', () => {
    const { result } = renderHook(() => useMediaPermissions());

    expect(typeof result.current.requestCamera).toBe('function');
  });

  it('should have requestMicrophone function', () => {
    const { result } = renderHook(() => useMediaPermissions());

    expect(typeof result.current.requestMicrophone).toBe('function');
  });

  it('should have refreshPermissions function', () => {
    const { result } = renderHook(() => useMediaPermissions());

    expect(typeof result.current.refreshPermissions).toBe('function');
  });

  it('should request camera and return stream', async () => {
    const { result } = renderHook(() => useMediaPermissions());

    let stream: MediaStream | null = null;
    await act(async () => {
      stream = await result.current.requestCamera();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true });
    expect(stream).toBe(mockStream);
  });

  it('should request microphone and return stream', async () => {
    const { result } = renderHook(() => useMediaPermissions());

    let stream: MediaStream | null = null;
    await act(async () => {
      stream = await result.current.requestMicrophone();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(stream).toBe(mockStream);
  });

  it('should return null when camera permission is denied', async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Permission denied')
    );

    const { result } = renderHook(() => useMediaPermissions());

    let stream: MediaStream | null = null;
    await act(async () => {
      stream = await result.current.requestCamera();
    });

    expect(stream).toBeNull();
  });

  it('should return null when microphone permission is denied', async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Permission denied')
    );

    const { result } = renderHook(() => useMediaPermissions());

    let stream: MediaStream | null = null;
    await act(async () => {
      stream = await result.current.requestMicrophone();
    });

    expect(stream).toBeNull();
  });

  it('should accept custom constraints for camera', async () => {
    const { result } = renderHook(() => useMediaPermissions());

    const customConstraints = { video: { width: 1920, height: 1080 } };
    await act(async () => {
      await result.current.requestCamera(customConstraints);
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(customConstraints);
  });

  it('should accept custom constraints for microphone', async () => {
    const { result } = renderHook(() => useMediaPermissions());

    const customConstraints = { audio: { echoCancellation: true } };
    await act(async () => {
      await result.current.requestMicrophone(customConstraints);
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(customConstraints);
  });
});
