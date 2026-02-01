/**
 * LisaCanvas Component Tests
 * Tests for canvas rendering
 *
 * Note: Many canvas features require the actual canvas npm package
 * which isn't available in jsdom. Testing focuses on component mounting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Mock visionStore
vi.mock('../../store/visionStore', () => ({
  useVisionStore: vi.fn((selector) => {
    const state = {
      percepts: [],
      lastSilenceMs: 0,
      smileDetected: false,
      speechDetected: false,
    };
    return selector(state);
  }),
  visionSelectors: {
    percepts: (state: { percepts: unknown[] }) => state.percepts,
    lastSilenceMs: (state: { lastSilenceMs: number }) => state.lastSilenceMs,
    smileDetected: (state: { smileDetected: boolean }) => state.smileDetected,
    speechDetected: (state: { speechDetected: boolean }) => state.speechDetected,
  },
}));

// Mock audioStore
vi.mock('../../store/audioStore', () => ({
  useAudioStore: vi.fn((selector) => {
    const state = { audio: null };
    return selector(state);
  }),
  audioSelectors: {
    audio: (state: { audio: unknown }) => state.audio,
  },
}));

// Mock uiStore
vi.mock('../../store/uiStore', () => ({
  useUiStore: vi.fn((selector) => {
    const state = { featureFlags: { advancedVision: false } };
    return selector(state);
  }),
  uiSelectors: {
    featureFlags: (state: { featureFlags: { advancedVision: boolean } }) => state.featureFlags,
  },
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock draw worker
vi.mock('../../workers/drawWorker.ts?worker', () => ({
  default: class MockWorker {
    postMessage = vi.fn();
    terminate = vi.fn();
  },
}));

// Mock startup logger
vi.mock('../../utils/startupLogger', () => ({
  logComponent: vi.fn(),
  logError: vi.fn(),
  startupLogger: {
    startTimer: vi.fn(),
    endTimer: vi.fn(),
  },
}));

import LisaCanvas from '../LisaCanvas';

describe('LisaCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render canvas element', () => {
      const { container } = render(<LisaCanvas />);

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should have absolute positioning', () => {
      const { container } = render(<LisaCanvas />);

      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveStyle({ position: 'absolute', top: '0px', left: '0px' });
    });

    it('should render without video prop', () => {
      const { container } = render(<LisaCanvas />);

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Logging', () => {
    it('should log component mounting', async () => {
      const { logComponent } = await import('../../utils/startupLogger');

      render(<LisaCanvas />);

      expect(logComponent).toHaveBeenCalledWith('LisaCanvas', 'Component mounting', expect.any(Object));
    });
  });
});
