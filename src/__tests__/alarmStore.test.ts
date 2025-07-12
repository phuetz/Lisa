import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useVisionAudioStore } from '../store/visionAudioStore';
import useAlarmTimerScheduler from '../hooks/useAlarmTimerScheduler';
import { renderHook } from '@testing-library/react';

beforeEach(() => {
  useVisionAudioStore.setState({ alarms: [], timers: [] });
});

describe('alarms', () => {
  it('adds an alarm and triggers scheduler', () => {
    const target = Date.now() + 1500; // 1.5s later
    act(() => {
      useVisionAudioStore.getState().setState((s) => ({ alarms: [...s.alarms, { id: 'a1', time: target }] }));
    });
    // start scheduler
    const { unmount } = renderHook(() => useAlarmTimerScheduler());
    // mock Date.now increment
    vi.useFakeTimers();
    vi.setSystemTime(Date.now());
    vi.advanceTimersByTime(1600);
    expect(useVisionAudioStore.getState().alarms[0].triggered).toBe(true);
    unmount();
    vi.useRealTimers();
  });
});
