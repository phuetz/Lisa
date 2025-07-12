import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { useFaceLandmarker } from '../hooks/useFaceLandmarker';
import { useVisionAudioStore } from '../store/visionAudioStore';

// Mock loadTask to immediately resolve to a stubbed model instance
const mockDetect = vi.fn();
const mockModel = { detectForVideo: mockDetect } as any;
vi.mock('../utils/loadTask', () => ({
  loadTask: vi.fn().mockResolvedValue(mockModel),
}));

// Mock mediapipe module referenced by hook (not used because loadTask provides instance)
vi.mock('@mediapipe/tasks-vision', () => ({ FaceLandmarker: vi.fn() }));

function TestComponent({ video }: { video: HTMLVideoElement | undefined }) {
  useFaceLandmarker(video);
  return null;
}

beforeEach(() => {
  useVisionAudioStore.setState(useVisionAudioStore.getInitialState());
  mockDetect.mockReset();
});

describe('useFaceLandmarker', () => {
  it('updates store with face landmarks', async () => {
    const video = document.createElement('video');

    // Prepare fake landmarks result
    const landmarks = new Float32Array([0, 0, 0]);
    mockDetect.mockReturnValue({
      faceLandmarks: [landmarks],
      faceBoundingBoxes: [new DOMRect(0, 0, 10, 10)],
    });

    render(<TestComponent video={video} />);

    // allow any pending promises (loadTask) to resolve
    await Promise.resolve();

    // `detectForVideo` should have been called synchronously once
    expect(mockDetect).toHaveBeenCalled();

    // store should now contain one face
    const state = useVisionAudioStore.getState();
    expect(state.faces.length).toBe(1);
    expect(state.faces[0].boundingBox.width).toBe(10);
  });
});
