/**
 * MicIndicator Component Tests
 * Tests for microphone indicator visibility and state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Store states
let mockListeningActive = false;
let mockSpeechDetected = false;

// Mock appStore (unified store)
vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      listeningActive: mockListeningActive,
      speechDetected: mockSpeechDetected,
    };
    return selector(state);
  }),
}));

// Mock MUI Fade - simplified for testing
vi.mock('@mui/material', () => ({
  Fade: ({
    in: show,
    children,
    unmountOnExit,
  }: {
    in: boolean;
    children: React.ReactNode;
    unmountOnExit?: boolean;
  }) => (show || !unmountOnExit ? <div data-fade-in={show}>{children}</div> : null),
}));

// Mock MUI icons to prevent EMFILE on Windows
vi.mock('@mui/icons-material', () => ({
  Mic: () => <span data-testid="mic-icon">Mic</span>,
  MicOff: () => <span data-testid="micoff-icon">MicOff</span>,
}));

import MicIndicator from '../MicIndicator';
import { useAppStore } from '../../store/appStore';

describe('MicIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListeningActive = false;
    mockSpeechDetected = false;
  });

  describe('Visibility', () => {
    it('should not render when not listening', () => {
      mockListeningActive = false;
      vi.mocked(useAppStore).mockImplementation((selector) =>
        selector({ listeningActive: false, speechDetected: false })
      );

      const { container } = render(<MicIndicator />);

      // Should be unmounted due to unmountOnExit
      expect(container.innerHTML).not.toContain('mic');
    });

    it('should render when listening is active', async () => {
      mockListeningActive = true;
      vi.mocked(useAppStore).mockImplementation((selector) =>
        selector({ listeningActive: true, speechDetected: false })
      );

      const { container } = render(<MicIndicator />);

      await waitFor(() => {
        expect(container.innerHTML.length).toBeGreaterThan(0);
      });
    });
  });

  describe('State Props', () => {
    it('should render indicator when listening', async () => {
      mockListeningActive = true;
      vi.mocked(useAppStore).mockImplementation((selector) =>
        selector({ listeningActive: true, speechDetected: false })
      );

      const { container } = render(<MicIndicator />);

      await waitFor(() => {
        expect(container.firstChild).not.toBeNull();
      });
    });

    it('should handle speech detected state', async () => {
      mockListeningActive = true;
      mockSpeechDetected = true;
      vi.mocked(useAppStore).mockImplementation((selector) =>
        selector({ listeningActive: true, speechDetected: true })
      );

      const { container } = render(<MicIndicator />);

      await waitFor(() => {
        expect(container.firstChild).not.toBeNull();
      });
    });

    it('should handle no speech detected', async () => {
      mockListeningActive = true;
      mockSpeechDetected = false;
      vi.mocked(useAppStore).mockImplementation((selector) =>
        selector({ listeningActive: true, speechDetected: false })
      );

      const { container } = render(<MicIndicator />);

      await waitFor(() => {
        expect(container.firstChild).not.toBeNull();
      });
    });
  });
});
