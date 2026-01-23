/**
 * Tests for FallDetector service
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the appStore
vi.mock('../../store/appStore', () => ({
  useAppStore: {
    getState: vi.fn(() => ({
      fallDetected: false,
      fallEventTimestamp: null,
    })),
    setState: vi.fn(),
  },
}));

import { fallDetector } from '../FallDetector';

describe('FallDetector', () => {
  beforeEach(() => {
    fallDetector.stop(); // Ensure clean state
    vi.useFakeTimers();
  });

  afterEach(() => {
    fallDetector.stop();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should be a singleton', () => {
    expect(fallDetector).toBeDefined();
    expect(typeof fallDetector.start).toBe('function');
    expect(typeof fallDetector.stop).toBe('function');
    expect(typeof fallDetector.isRunning).toBe('function');
  });

  it('should start and stop correctly', () => {
    fallDetector.start();
    expect(fallDetector.isRunning()).toBe(true);

    fallDetector.stop();
    expect(fallDetector.isRunning()).toBe(false);
  });

  it('should not crash when starting twice', () => {
    fallDetector.start();
    fallDetector.start();
    expect(fallDetector.isRunning()).toBe(true);
  });

  it('should register onFallDetected callback', () => {
    const callback = vi.fn();
    fallDetector.onFallDetected(callback);
    expect(fallDetector.isRunning()).toBe(false); // Should not auto-start
  });

  it('should analyze pose data without crashing', () => {
    fallDetector.start();
    
    const mockPosePayload = {
      type: 'pose' as const,
      landmarks: [
        { x: 0.5, y: 0.5, z: 0, visibility: 1 }, // nose
        { x: 0.5, y: 0.6, z: 0, visibility: 1 }, // left eye
        { x: 0.5, y: 0.6, z: 0, visibility: 1 }, // right eye
      ],
      worldLandmarks: [],
      timestamp: Date.now(),
      score: 0.95,
    };

    expect(() => fallDetector.analyzePose(mockPosePayload)).not.toThrow();
  });

  it('should handle pose analysis when not running', () => {
    const mockPosePayload = {
      type: 'pose' as const,
      landmarks: [
        { x: 0.5, y: 0.5, z: 0, visibility: 1 },
      ],
      worldLandmarks: [],
      timestamp: Date.now(),
      score: 0.9,
    };

    // Should not crash when analyzing pose while not running
    expect(() => fallDetector.analyzePose(mockPosePayload)).not.toThrow();
  });

  it('should reset state when stopped', () => {
    fallDetector.start();
    fallDetector.stop();
    
    // Should be able to start again
    fallDetector.start();
    expect(fallDetector.isRunning()).toBe(true);
  });

  it('should handle empty landmarks array', () => {
    fallDetector.start();
    
    const emptyPose = {
      type: 'pose' as const,
      landmarks: [],
      worldLandmarks: [],
      timestamp: Date.now(),
      score: 0.8,
    };

    expect(() => fallDetector.analyzePose(emptyPose)).not.toThrow();
  });
});
