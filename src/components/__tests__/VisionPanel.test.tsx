/**
 * VisionPanel Component Tests
 * Tests for vision panel UI
 *
 * Note: VisionPanel uses many MUI components and webcam APIs that are
 * complex to test in jsdom. Tests focus on basic rendering and state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Store state
const mockSetState = vi.fn();

// Mock appStore
vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      featureFlags: { advancedVision: false },
      setState: mockSetState,
    };
    return selector(state);
  }),
}));

// Mock agent registry
vi.mock('../../features/agents/core/registry', () => ({
  agentRegistry: {
    getAgentAsync: vi.fn().mockResolvedValue({
      execute: vi.fn().mockResolvedValue({
        success: true,
        output: { description: 'A test image' },
      }),
    }),
  },
}));

// Mock media permissions
vi.mock('../../hooks/useMediaPermissions', () => ({
  useMediaPermissions: () => ({
    requestCamera: vi.fn().mockResolvedValue(null),
  }),
}));

import VisionPanel from '../VisionPanel';

describe('VisionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render panel header', async () => {
      render(<VisionPanel />);

      await waitFor(() => {
        expect(screen.getByText('Vision par Ordinateur')).toBeInTheDocument();
      });
    });

    it('should render as collapsed by default', async () => {
      render(<VisionPanel />);

      await waitFor(() => {
        // When collapsed, the expand icon should be visible
        const header = screen.getByText('Vision par Ordinateur');
        expect(header).toBeInTheDocument();
      });
    });
  });

  describe('Expansion', () => {
    it('should expand when header clicked', async () => {
      render(<VisionPanel />);

      // Click the header to expand
      fireEvent.click(screen.getByText('Vision par Ordinateur'));

      // Wait for agent to load and panel to expand
      await waitFor(
        () => {
          expect(screen.getByText(/Activer la Vision Avancée/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should render expanded when prop is true', async () => {
      render(<VisionPanel expanded={true} />);

      await waitFor(
        () => {
          expect(screen.getByText(/Activer la Vision Avancée/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });
});
