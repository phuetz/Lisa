/**
 * MicIndicator Component Tests
 * Tests for microphone indicator visibility and state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Store states
let mockListeningActive = false;
let mockSpeechDetected = false;

// Mock uiStore
vi.mock('../../store/uiStore', () => ({
  useUiStore: vi.fn((selector) => {
    const state = { listeningActive: mockListeningActive };
    return selector(state);
  }),
  uiSelectors: {
    listeningActive: (state: { listeningActive: boolean }) => state.listeningActive,
  },
}));

// Mock visionStore
vi.mock('../../store/visionStore', () => ({
  useVisionStore: vi.fn((selector) => {
    const state = { speechDetected: mockSpeechDetected };
    return selector(state);
  }),
  visionSelectors: {
    speechDetected: (state: { speechDetected: boolean }) => state.speechDetected,
  },
}));

// Mock SDK MicIndicator component
vi.mock('@lisa-sdk/ui', () => ({
  MicIndicator: ({ isListening, isSpeaking }: { isListening: boolean; isSpeaking: boolean }) => (
    <div
      data-testid="sdk-mic-indicator"
      data-listening={isListening}
      data-speaking={isSpeaking}
    >
      Mic
    </div>
  ),
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

import MicIndicator from '../MicIndicator';
import { useUiStore } from '../../store/uiStore';
import { useVisionStore } from '../../store/visionStore';

describe('MicIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListeningActive = false;
    mockSpeechDetected = false;
  });

  describe('Visibility', () => {
    it('should not render when not listening', () => {
      mockListeningActive = false;
      vi.mocked(useUiStore).mockImplementation((selector) =>
        selector({ listeningActive: false })
      );

      const { container } = render(<MicIndicator />);

      // Should be unmounted due to unmountOnExit
      expect(container.querySelector('[data-testid="sdk-mic-indicator"]')).toBeNull();
    });

    it('should render when listening is active', async () => {
      mockListeningActive = true;
      vi.mocked(useUiStore).mockImplementation((selector) =>
        selector({ listeningActive: true })
      );

      render(<MicIndicator />);

      await waitFor(() => {
        expect(screen.getByTestId('sdk-mic-indicator')).toBeInTheDocument();
      });
    });
  });

  describe('State Props', () => {
    it('should pass listening state to SDK component', async () => {
      mockListeningActive = true;
      vi.mocked(useUiStore).mockImplementation((selector) =>
        selector({ listeningActive: true })
      );

      render(<MicIndicator />);

      await waitFor(() => {
        const indicator = screen.getByTestId('sdk-mic-indicator');
        expect(indicator).toHaveAttribute('data-listening', 'true');
      });
    });

    it('should pass speech detected state to SDK component', async () => {
      mockListeningActive = true;
      mockSpeechDetected = true;
      vi.mocked(useUiStore).mockImplementation((selector) =>
        selector({ listeningActive: true })
      );
      vi.mocked(useVisionStore).mockImplementation((selector) =>
        selector({ speechDetected: true })
      );

      render(<MicIndicator />);

      await waitFor(() => {
        const indicator = screen.getByTestId('sdk-mic-indicator');
        expect(indicator).toHaveAttribute('data-speaking', 'true');
      });
    });

    it('should show speaking=false when no speech detected', async () => {
      mockListeningActive = true;
      mockSpeechDetected = false;
      vi.mocked(useUiStore).mockImplementation((selector) =>
        selector({ listeningActive: true })
      );
      vi.mocked(useVisionStore).mockImplementation((selector) =>
        selector({ speechDetected: false })
      );

      render(<MicIndicator />);

      await waitFor(() => {
        const indicator = screen.getByTestId('sdk-mic-indicator');
        expect(indicator).toHaveAttribute('data-speaking', 'false');
      });
    });
  });
});
