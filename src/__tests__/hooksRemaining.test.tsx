import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { useHandLandmarker } from '../hooks/useHandLandmarker';
import { usePoseLandmarker } from '../hooks/usePoseLandmarker';
import { useObjectDetector } from '../hooks/useObjectDetector';
import { useAudioClassifier } from '../hooks/useAudioClassifier';
import { useAppStore as useVisionAudioStore } from '../store/appStore';

// Create a video element with valid dimensions for MediaPipe processing
const video = document.createElement('video');
Object.defineProperty(video, 'videoWidth', { value: 640, writable: true });
Object.defineProperty(video, 'videoHeight', { value: 480, writable: true });
Object.defineProperty(video, 'readyState', { value: 4, writable: true }); // HAVE_ENOUGH_DATA

// Collect RAF callbacks (don't invoke immediately to avoid infinite recursion)
let rafCallbacks: FrameRequestCallback[] = [];
beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('MediaStream', vi.fn(() => ({
    getTracks: vi.fn(() => []),
  })));
});

beforeEach(() => {
  rafCallbacks = [];
  useVisionAudioStore.setState(useVisionAudioStore.getInitialState());
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Silence actual mediapipe imports
vi.mock('@mediapipe/tasks-vision', () => ({
  HandLandmarker: vi.fn(),
  PoseLandmarker: vi.fn(),
  ObjectDetector: vi.fn(),
}));
vi.mock('@mediapipe/tasks-audio', () => ({ AudioClassifier: vi.fn() }));

// Mock models that the hooks expect as second parameter
const mockHandLandmarker = {
  detectForVideo: vi.fn().mockReturnValue({
    landmarks: [[{ x: 0.1, y: 0.2, z: 0 }, { x: 0.3, y: 0.4, z: 0 }]],
    handedness: [[{ categoryName: 'Right', score: 0.95 }]],
    worldLandmarks: [],
  }),
  close: vi.fn(),
};

const mockPoseLandmarker = {
  detectForVideo: vi.fn().mockReturnValue({
    landmarks: [[{ x: 0.5, y: 0.5, z: 0 }]],
    worldLandmarks: [[{ x: 0.5, y: 0.5, z: 0 }]],
  }),
  close: vi.fn(),
};

const mockObjectDetector = {
  detectForVideo: vi.fn().mockReturnValue({
    detections: [{
      boundingBox: { originX: 10, originY: 10, width: 50, height: 50 },
      categories: [{ categoryName: 'cup', score: 0.9 }],
    }],
  }),
  close: vi.fn(),
};

const mockAudioClassifier = {
  classify: vi.fn().mockReturnValue([{
    classifications: [{
      categories: [{ categoryName: 'Speech', score: 0.95 }],
    }],
  }]),
};

// Test components that pass mock models to hooks
function HandTest() {
  useHandLandmarker(video, mockHandLandmarker as any);
  return null;
}
function PoseTest() {
  usePoseLandmarker(video, mockPoseLandmarker as any);
  return null;
}
function ObjectTest() {
  useObjectDetector(video, mockObjectDetector as any);
  return null;
}

// For audio, capture the processor to manually trigger onaudioprocess
let lastProcessor: any = null;
function AudioTest() {
  const audioCtx = {
    createMediaStreamSource: () => ({ connect: () => {}, disconnect: () => {} }),
    createScriptProcessor: () => {
      const proc: any = { connect: () => {}, disconnect: () => {}, onaudioprocess: null };
      lastProcessor = proc;
      return proc;
    },
    destination: {},
  } as any;
  const stream = new MediaStream();
  useAudioClassifier(audioCtx, stream, mockAudioClassifier as any);
  return null;
}

describe('Remaining hooks update store', () => {
  it('hand landmarker pushes hand data', async () => {
    render(<HandTest />);
    // The hook's useEffect runs loop() which processes frame 0 synchronously
    // and pushes percepts to the store via setState
    const st = useVisionAudioStore.getState();
    expect((st.percepts?.length ?? 0)).toBeGreaterThan(0);
  });

  it('pose landmarker pushes pose data', async () => {
    render(<PoseTest />);
    const st = useVisionAudioStore.getState();
    expect((st.percepts?.length ?? 0)).toBeGreaterThan(0);
  });

  it('object detector pushes detection', async () => {
    render(<ObjectTest />);
    const st = useVisionAudioStore.getState();
    expect((st.percepts?.length ?? 0)).toBeGreaterThan(0);
  });

  it('audio classifier sets speechDetected', async () => {
    lastProcessor = null;
    mockAudioClassifier.classify.mockReturnValue([{
      classifications: [{
        categories: [{ categoryName: 'Speech', score: 0.95 }],
      }],
    }]);
    await act(async () => {
      render(<AudioTest />);
    });
    // After render + effects, processor should be set up
    expect(lastProcessor).not.toBeNull();
    expect(lastProcessor.onaudioprocess).toBeTypeOf('function');
    // Manually trigger audio processing handler
    act(() => {
      lastProcessor.onaudioprocess({
        inputBuffer: { getChannelData: () => new Float32Array(4096) },
      });
    });
    // Check classify was actually called
    expect(mockAudioClassifier.classify).toHaveBeenCalled();
    const st = useVisionAudioStore.getState();
    expect(st.speechDetected).toBe(true);
  });
});
