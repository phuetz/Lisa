/**
 * Vision Store - Domain-specific store for vision state
 * Now decoupled from the main appStore to reduce re-renders and improve separation of concerns
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Percept, VisionPayload } from '../features/vision/api';

/* ---------- Vision State Type ---------- */
export interface VisionState {
  percepts: Percept<VisionPayload>[];
  lastSilenceMs: number;
  smileDetected: boolean;
  speechDetected: boolean;
}

interface VisionActions {
  setPercepts: (percepts: Percept<VisionPayload>[]) => void;
  addPercept: (percept: Percept<VisionPayload>) => void;
  clearPercepts: () => void;
  setSmileDetected: (detected: boolean) => void;
  setSpeechDetected: (detected: boolean) => void;
  setLastSilenceMs: (ms: number) => void;
  update: (partial: Partial<VisionState>) => void;
}

export type VisionStore = VisionState & VisionActions;

/* ---------- Store Implementation ---------- */

const initialState: VisionState = {
  percepts: [],
  lastSilenceMs: 0,
  smileDetected: false,
  speechDetected: false,
};

export const useVisionStore = create<VisionStore>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    /* ---------- Actions ---------- */
    setPercepts: (percepts) => set({ percepts }),

    addPercept: (percept) => set((state) => {
      // Keep last 100 percepts to avoid memory issues
      const updated = [...state.percepts.slice(-99), percept];
      return { percepts: updated };
    }),

    clearPercepts: () => set({ percepts: [] }),

    setSmileDetected: (detected) => set({ smileDetected: detected }),

    setSpeechDetected: (detected) => set({ speechDetected: detected }),

    setLastSilenceMs: (ms) => set({ lastSilenceMs: ms }),

    update: (partial) => set(partial),
  }))
);

/* ---------- Selectors ---------- */
export const visionSelectors = {
  /** All vision percepts */
  percepts: (state: VisionStore): Percept<VisionPayload>[] => state.percepts,

  /** Last silence duration in milliseconds */
  lastSilenceMs: (state: VisionStore): number => state.lastSilenceMs,

  /** Whether a smile was detected */
  smileDetected: (state: VisionStore): boolean => state.smileDetected,

  /** Whether speech was detected */
  speechDetected: (state: VisionStore): boolean => state.speechDetected,

  /** Latest percept */
  latestPercept: (state: VisionStore): Percept<VisionPayload> | undefined => {
    const percepts = state.percepts;
    return percepts.length > 0 ? percepts[percepts.length - 1] : undefined;
  },

  /** Percepts count */
  perceptsCount: (state: VisionStore): number => state.percepts.length,
};

// Export legacy action wrapper for compatibility if needed elsewhere
export const visionActions = {
  setPercepts: (percepts: Percept<VisionPayload>[]) => useVisionStore.getState().setPercepts(percepts),
  addPercept: (percept: Percept<VisionPayload>) => useVisionStore.getState().addPercept(percept),
  clearPercepts: () => useVisionStore.getState().clearPercepts(),
  setSmileDetected: (detected: boolean) => useVisionStore.getState().setSmileDetected(detected),
  setSpeechDetected: (detected: boolean) => useVisionStore.getState().setSpeechDetected(detected),
  setLastSilenceMs: (ms: number) => useVisionStore.getState().setLastSilenceMs(ms),
  update: (partial: Partial<VisionState>) => useVisionStore.getState().update(partial),
};
