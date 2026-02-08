/**
 * LisaCanvas Component Tests
 * Tests for canvas rendering
 *
 * Note: Many canvas features require the actual canvas npm package
 * which isn't available in jsdom. Testing focuses on component mounting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Mock appStore (unified store)
vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      faces: [],
      hands: [],
      objects: [],
      poses: [],
      lastSilenceMs: 0,
      audio: null,
      smileDetected: false,
      speechDetected: false,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
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
    it('should render without errors when startup logger is mocked', async () => {
      const { container } = render(<LisaCanvas />);

      // LisaCanvas renders successfully with mocked dependencies
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });
});
