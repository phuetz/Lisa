/**
 * DebugPanel Component Tests
 * Tests for debug panel display and mode switching
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Store states
let mockSmileDetected = false;
let mockSpeechDetected = false;
const mockState = {
  smileDetected: false,
  speechDetected: false,
  intent: 'none',
};

// Mock appStore
vi.mock('../../store/appStore', () => ({
  useAppStore: Object.assign(
    vi.fn((selector) => {
      const state = {
        smileDetected: mockSmileDetected,
        speechDetected: mockSpeechDetected,
        intent: 'none',
      };
      return selector(state);
    }),
    {
      getState: () => mockState,
    }
  ),
}));

// Mock plan tracer hook
const mockTraces = [
  {
    id: 'trace-1',
    requestId: 'Request 1',
    startTime: Date.now() - 60000,
    endTime: Date.now(),
    steps: [{ id: 's1', operation: 'plan_generation', timestamp: Date.now(), details: {} }],
    summary: 'Plan completed',
  },
];

vi.mock('../../hooks/usePlanTracer', () => ({
  default: () => ({
    traces: mockTraces,
    selectedTrace: null,
    selectTrace: vi.fn(),
    getTracesStats: () => ({
      total: 1,
      successful: 1,
      failed: 0,
      averageDuration: 5000,
    }),
  }),
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        debug_panel: 'Debug Panel',
        debug: 'Debug',
        hide: 'Hide',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistance: vi.fn(() => 'il y a 1 minute'),
}));

vi.mock('date-fns/locale', () => ({
  fr: {},
}));

import DebugPanel from '../DebugPanel';

describe('DebugPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmileDetected = false;
    mockSpeechDetected = false;
  });

  describe('Rendering', () => {
    it('should render debug button in collapsed state', () => {
      render(<DebugPanel />);

      expect(screen.getByText('Debug')).toBeInTheDocument();
    });

    it('should have correct ARIA attributes', () => {
      render(<DebugPanel />);

      const region = screen.getByRole('region', { name: 'Debug Panel' });
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Toggle Behavior', () => {
    it('should expand when debug button is clicked', () => {
      render(<DebugPanel />);

      fireEvent.click(screen.getByText('Debug'));

      expect(screen.getByText('Hide')).toBeInTheDocument();
    });

    it('should collapse when hide button is clicked', () => {
      render(<DebugPanel />);

      // Open
      fireEvent.click(screen.getByText('Debug'));
      expect(screen.getByText('Hide')).toBeInTheDocument();

      // Close
      fireEvent.click(screen.getByText('Hide'));
      expect(screen.getByText('Debug')).toBeInTheDocument();
    });

    it('should show mode buttons when expanded', () => {
      render(<DebugPanel />);

      fireEvent.click(screen.getByText('Debug'));

      expect(screen.getByText('Store')).toBeInTheDocument();
      expect(screen.getByText('Plans')).toBeInTheDocument();
      expect(screen.getByText('Trace')).toBeInTheDocument();
    });
  });

  describe('Mode Switching', () => {
    it('should show store content by default when expanded', () => {
      render(<DebugPanel />);

      fireEvent.click(screen.getByText('Debug'));

      // Should show JSON store snapshot
      expect(screen.getByText(/"intent":/)).toBeInTheDocument();
    });

    it('should switch to Plans mode when Plans button clicked', () => {
      render(<DebugPanel />);

      fireEvent.click(screen.getByText('Debug'));
      fireEvent.click(screen.getByText('Plans'));

      // Should show plan stats
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });

    it('should switch to Trace mode when Trace button clicked', () => {
      render(<DebugPanel />);

      fireEvent.click(screen.getByText('Debug'));
      fireEvent.click(screen.getByText('Trace'));

      // Should show trace selection message
      expect(screen.getByText(/Sélectionnez d'abord/)).toBeInTheDocument();
    });
  });

  describe('Plans View', () => {
    it('should display trace stats in Plans mode', () => {
      render(<DebugPanel />);

      fireEvent.click(screen.getByText('Debug'));
      fireEvent.click(screen.getByText('Plans'));

      expect(screen.getByText(/Total: 1 plans/)).toBeInTheDocument();
      expect(screen.getByText(/Réussis: 1/)).toBeInTheDocument();
    });
  });
});
