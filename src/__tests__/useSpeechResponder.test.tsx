import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render } from '@testing-library/react';
import React from 'react';
import { useSpeechResponder } from '../hooks';
import { useVisionAudioStore } from '../store/visionAudioStore';

function TestComponent() {
  useSpeechResponder();
  return null;
}

// Reset store and mocks before each test
beforeEach(() => {
  useVisionAudioStore.setState(useVisionAudioStore.getInitialState());
  vi.resetAllMocks();
});

describe('useSpeechResponder', () => {
  it('calls speechSynthesis.speak when smile + speech detected', () => {
    // Mock speechSynthesis
    const speakSpy = vi.fn();
    // @ts-ignore
    globalThis.speechSynthesis = { speak: speakSpy } as any;

    render(<TestComponent />);

    act(() => {
      useVisionAudioStore.getState().setState({ smileDetected: true, speechDetected: true });
    });

    expect(speakSpy).toHaveBeenCalledTimes(1);
  });
});
