/**
 * Audio Store - Domain-specific store for audio/hearing state
 * Now decoupled from the main appStore to reduce re-renders and improve separation of concerns
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Percept } from '../features/vision/api';
import type { HearingPerceptPayload } from '../features/hearing/api';
import type { AudioResult } from './appStore';

/* ---------- Audio State Type ---------- */
export interface AudioState {
  audio?: AudioResult;
  audioEnabled: boolean;
  isListening: boolean;
  wakeWordDetected: boolean;
  hearingPercepts: Percept<HearingPerceptPayload>[];
}

interface AudioActions {
  setAudioEnabled: (enabled: boolean) => void;
  toggleAudioEnabled: () => void;
  setIsListening: (isListening: boolean) => void;
  setWakeWordDetected: (detected: boolean) => void;
  setAudio: (audio: AudioResult | undefined) => void;
  setHearingPercepts: (percepts: Percept<HearingPerceptPayload>[]) => void;
  addHearingPercept: (percept: Percept<HearingPerceptPayload>) => void;
  clearHearingPercepts: () => void;
  update: (partial: Partial<AudioState>) => void;
}

export type AudioStore = AudioState & AudioActions;

/* ---------- Store Implementation ---------- */
const initialState: AudioState = {
  audio: undefined,
  audioEnabled: true,
  isListening: false,
  wakeWordDetected: false,
  hearingPercepts: [],
};

export const useAudioStore = create<AudioStore>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    /* ---------- Actions ---------- */
    setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
    setIsListening: (isListening) => set({ isListening }),
    setWakeWordDetected: (wakeWordDetected) => set({ wakeWordDetected }),

    toggleAudioEnabled: () => set((state) => ({ audioEnabled: !state.audioEnabled })),

    setAudio: (audio) => set({ audio }),

    setHearingPercepts: (percepts) => set({ hearingPercepts: percepts }),

    addHearingPercept: (percept) => set((state) => {
      // Keep last 100 percepts to avoid memory issues
      const updated = [...state.hearingPercepts.slice(-99), percept];
      return { hearingPercepts: updated };
    }),

    clearHearingPercepts: () => set({ hearingPercepts: [] }),

    update: (partial) => set(partial),
  }))
);

/* ---------- Selectors ---------- */
export const audioSelectors = {
  /** Current audio result */
  audio: (state: AudioStore): AudioResult | undefined => state.audio,

  /** Whether audio is enabled */
  audioEnabled: (state: AudioStore): boolean => state.audioEnabled,

  /** All hearing percepts */
  hearingPercepts: (state: AudioStore): Percept<HearingPerceptPayload>[] =>
    state.hearingPercepts,

  /** Get full audio state */
  all: (state: AudioStore): AudioState => ({
    audio: state.audio,
    audioEnabled: state.audioEnabled,
    isListening: state.isListening,
    wakeWordDetected: state.wakeWordDetected,
    hearingPercepts: state.hearingPercepts,
  }),

  /** Latest hearing percept */
  latestHearingPercept: (state: AudioStore): Percept<HearingPerceptPayload> | undefined => {
    const percepts = state.hearingPercepts;
    return percepts.length > 0 ? percepts[percepts.length - 1] : undefined;
  },

  /** Hearing percepts count */
  hearingPerceptsCount: (state: AudioStore): number => state.hearingPercepts.length,

  /** Check if there's recent audio activity */
  hasRecentAudio: (state: AudioStore): boolean => {
    const audio = state.audio;
    if (!audio) return false;
    const now = Date.now();
    return now - audio.timestamp < 5000; // Within last 5 seconds
  },
};

// Export legacy action wrapper for compatibility if needed elsewhere
export const audioActions = {
  setAudioEnabled: (enabled: boolean) => useAudioStore.getState().setAudioEnabled(enabled),
  toggleAudioEnabled: () => useAudioStore.getState().toggleAudioEnabled(),
  setIsListening: (isListening: boolean) => useAudioStore.getState().setIsListening(isListening),
  setWakeWordDetected: (detected: boolean) => useAudioStore.getState().setWakeWordDetected(detected),
  setAudio: (audio: AudioResult | undefined) => useAudioStore.getState().setAudio(audio),
  setHearingPercepts: (percepts: Percept<HearingPerceptPayload>[]) => useAudioStore.getState().setHearingPercepts(percepts),
  addHearingPercept: (percept: Percept<HearingPerceptPayload>) => useAudioStore.getState().addHearingPercept(percept),
  clearHearingPercepts: () => useAudioStore.getState().clearHearingPercepts(),
  update: (partial: Partial<AudioState>) => useAudioStore.getState().update(partial),
};

export const getAudioState = (): AudioState => audioSelectors.all(useAudioStore.getState());

export const subscribeToAudio = (
  selector: (state: AudioStore) => unknown,
  callback: (value: unknown, prevValue: unknown) => void
) => {
  return useAudioStore.subscribe(selector, callback);
};
