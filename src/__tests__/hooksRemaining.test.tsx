import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { useHandLandmarker } from '../hooks/useHandLandmarker';
import { usePoseLandmarker } from '../hooks/usePoseLandmarker';
import { useObjectDetector } from '../hooks/useObjectDetector';
import { useAudioClassifier } from '../hooks/useAudioClassifier';
import { useVisionAudioStore } from '../store/visionAudioStore';

// Helpers to create dummy elements / contexts
const video = document.createElement('video');

// Patch RAF to run immediately
beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('MediaStream', vi.fn(() => ({
  getTracks: vi.fn(() => []),
})));
});

beforeEach(() => {
  useVisionAudioStore.setState(useVisionAudioStore.getInitialState());
});

/***************************************************
 * Mock loadTask to provide stubbed model per hook *
 ***************************************************/
vi.mock('../utils/loadTask', () => ({
  loadTask: vi.fn().mockImplementation(async (Ctor: any) => {
    // Return object whose method name depends on ctor name
    if (Ctor.name.includes('Hand')) {
      return {
        detectForVideo: vi.fn().mockReturnValue({
          handLandmarks: [new Float32Array([0, 0, 0])],
          handedness: [{ score: 0.8 }],
          worldLandmarks: [],
        }),
      };
    }
    if (Ctor.name.includes('Pose')) {
      return {
        detectForVideo: vi.fn().mockReturnValue({
          poseLandmarks: [new Float32Array([0, 0, 0])],
        }),
      };
    }
    if (Ctor.name.includes('Object')) {
      return {
        detectForVideo: vi.fn().mockReturnValue({
          detections: [
            {
              boundingBox: { originX: 0, originY: 0, width: 5, height: 5 },
              categories: [{ categoryName: 'cup', score: 0.9 }],
            },
          ],
        }),
      };
    }
    if (Ctor.name.includes('Audio')) {
      return {
        classify: vi.fn().mockReturnValue({
          classifications: [
            {
              categories: [{ categoryName: 'Speech', score: 0.95 }],
            },
          ],
        }),
      };
    }
    return {};
  }),
}));

// Silence actual mediapipe imports
vi.mock('@mediapipe/tasks-vision', () => ({
  HandLandmarker: vi.fn(),
  PoseLandmarker: vi.fn(),
  ObjectDetector: vi.fn(),
}));
vi.mock('@mediapipe/tasks-audio', () => ({ AudioClassifier: vi.fn() }));

function HandTest() {
  useHandLandmarker(video);
  return null;
}
function PoseTest() {
  usePoseLandmarker(video);
  return null;
}
function ObjectTest() {
  useObjectDetector(video);
  return null;
}
function AudioTest() {
  // basic stub AudioContext
  const audioCtx = {
    createMediaStreamSource: () => ({ connect: () => {} }),
    createScriptProcessor: () => ({
      connect: () => {},
      onaudioprocess: () => {},
    }),
    destination: {},
  } as any;
  const stream = new MediaStream();
  useAudioClassifier(audioCtx, stream);
  return null;
}

describe('Remaining hooks update store', () => {
  it('hand landmarker pushes hand data', async () => {
    render(<HandTest />);
    await Promise.resolve();
    const st = useVisionAudioStore.getState();
    expect(st.hands?.length ?? 0).toBeGreaterThan(0);
  });

  it('pose landmarker pushes pose data', async () => {
    render(<PoseTest />);
    await Promise.resolve();
    const st = useVisionAudioStore.getState();
    expect(st.poses?.length ?? 0).toBeGreaterThan(0);
  });

  it('object detector pushes detection', async () => {
    render(<ObjectTest />);
    await Promise.resolve();
    const st = useVisionAudioStore.getState();
    expect(st.objects?.length ?? 0).toBeGreaterThan(0);
  });

  it('audio classifier sets speechDetected', async () => {
    render(<AudioTest />);
    // simulate audio processing tick
    await Promise.resolve();
    const st = useVisionAudioStore.getState();
    expect(st.speechDetected).toBe(true);
  });
});
