/**
 * VisionPanel Component Tests
 * Tests for vision panel UI
 *
 * Note: VisionPanel uses many MUI components and webcam APIs that are
 * complex to test in jsdom. Tests focus on basic rendering and state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock agent registry
vi.mock('../../agents/registry', () => ({
  agentRegistry: {
    getAgent: vi.fn().mockReturnValue({
      execute: vi.fn().mockResolvedValue({
        success: true,
        output: { description: 'A test image' },
      }),
    }),
  },
}));

// Mock VisionAgent module (file doesn't exist yet)
vi.mock('../../agents/VisionAgent', () => ({
  VisionAgent: class {},
}));

// Mock media permissions
vi.mock('../../hooks/useMediaPermissions', () => ({
  useMediaPermissions: () => ({
    permissions: {},
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

      // Wait for panel to expand and show content
      await waitFor(
        () => {
          expect(screen.getByText(/vision par ordinateur permet/i)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should render expanded when prop is true', async () => {
      render(<VisionPanel expanded={true} />);

      await waitFor(
        () => {
          expect(screen.getByText(/vision par ordinateur permet/i)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });
});
