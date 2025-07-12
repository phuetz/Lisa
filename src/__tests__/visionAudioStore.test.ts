import { describe, it, expect, beforeEach } from 'vitest';
import { useVisionAudioStore } from '../store/visionAudioStore';

// Reset store before each test to avoid state bleed
beforeEach(() => {
  useVisionAudioStore.setState(useVisionAudioStore.getInitialState());
});

describe('visionAudioStore', () => {
  it('updates smileDetected flag', () => {
    useVisionAudioStore.getState().setState({ smileDetected: true });
    expect(useVisionAudioStore.getState().smileDetected).toBe(true);
  });

  it('stores face results and timestamps', () => {
    const now = Date.now();
    const fakeFace = { landmarks: new Float32Array(), boundingBox: new DOMRect(0, 0, 100, 100), score: 0.9 } as any;
    useVisionAudioStore.getState().setState({ faces: [fakeFace], lastUpdate: now });
    const state = useVisionAudioStore.getState();
    expect(state.faces).toHaveLength(1);
    expect(state.lastUpdate).toBe(now);
  });
});
