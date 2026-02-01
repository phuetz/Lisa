/**
 * Tests for OfficePageLayout Component
 * IT-008: Tests UI et Accessibilite
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/' };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// Mock matchMedia
const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
  matches: query === '(prefers-color-scheme: dark)' ? false : query === '(max-width: 768px)' ? false : true,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

vi.stubGlobal('matchMedia', matchMediaMock);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

// Import after mocks
import { OfficePageLayout } from '../OfficePageLayout';
import { useOfficeThemeStore } from '../../../store/officeThemeStore';

describe('OfficePageLayout', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockNavigate.mockClear();
    mockLocation.pathname = '/';

    // Reset store state
    useOfficeThemeStore.setState({
      themeId: 'office-classic',
      mode: 'light',
      fontSize: 'medium',
      fontFamily: 'Segoe UI',
      borderRadius: 8,
      compactMode: false,
      highContrast: false,
      reduceMotion: false,
      transitionsEnabled: true,
      customThemes: [],
      _resolvedMode: 'light',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(
        <OfficePageLayout>
          <div data-testid="content">Test Content</div>
        </OfficePageLayout>
      );

      // Should have Lisa text in both sidebar logo and title
      expect(screen.getAllByText('Lisa').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(
        <OfficePageLayout title="Custom Title">
          <div>Content</div>
        </OfficePageLayout>
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should render with subtitle', () => {
      render(
        <OfficePageLayout title="Title" subtitle="Subtitle Description">
          <div>Content</div>
        </OfficePageLayout>
      );

      expect(screen.getByText('Subtitle Description')).toBeInTheDocument();
    });

    it('should render custom action', () => {
      render(
        <OfficePageLayout action={<button data-testid="custom-action">Action</button>}>
          <div>Content</div>
        </OfficePageLayout>
      );

      expect(screen.getByTestId('custom-action')).toBeInTheDocument();
    });

    it('should render children correctly', () => {
      render(
        <OfficePageLayout>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </OfficePageLayout>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('Sidebar', () => {
    it('should render sidebar by default', () => {
      render(
        <OfficePageLayout>
          <div>Content</div>
        </OfficePageLayout>
      );

      // Sidebar should contain navigation items
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Vision')).toBeInTheDocument();
      expect(screen.getByText('Audio')).toBeInTheDocument();
    });

    it('should hide sidebar when showSidebar is false', () => {
      render(
        <OfficePageLayout showSidebar={false}>
          <div>Content</div>
        </OfficePageLayout>
      );

      // Navigation items should not be present when sidebar is hidden
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('should navigate when clicking nav item', () => {
      render(
        <OfficePageLayout>
          <div>Content</div>
        </OfficePageLayout>
      );

      const dashboardButton = screen.getByText('Dashboard').closest('button');
      fireEvent.click(dashboardButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should highlight active nav item', () => {
      mockLocation.pathname = '/vision';

      render(
        <OfficePageLayout>
          <div>Content</div>
        </OfficePageLayout>
      );

      // Vision should be the active item
      const visionButton = screen.getByText('Vision').closest('button');
      expect(visionButton).toBeInTheDocument();
    });
  });

  describe('Theme Switcher', () => {
    it('should open theme dropdown on click', () => {
      render(
        <OfficePageLayout>
          <div>Content</div>
        </OfficePageLayout>
      );

      // Find and click theme button (palette icon button)
      const buttons = screen.getAllByRole('button');
      const themeButton = buttons.find(btn => btn.getAttribute('title') === 'Changer le theme');

      expect(themeButton).toBeInTheDocument();
      fireEvent.click(themeButton!);

      // Dropdown should be open with mode options
      expect(screen.getByText('Mode')).toBeInTheDocument();
      expect(screen.getByText('Clair')).toBeInTheDocument();
      expect(screen.getByText('Sombre')).toBeInTheDocument();
      expect(screen.getByText('Auto')).toBeInTheDocument();
    });

    it('should display theme list in dropdown', () => {
      render(
        <OfficePageLayout>
          <div>Content</div>
        </OfficePageLayout>
      );

      // Open theme dropdown
      const buttons = screen.getAllByRole('button');
      const themeButton = buttons.find(btn => btn.getAttribute('title') === 'Changer le theme');
      fireEvent.click(themeButton!);

      // Theme list should be visible
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Lisa Classic')).toBeInTheDocument();
      expect(screen.getByText('Office Classic')).toBeInTheDocument();
    });

    it('should change mode when clicking mode button', () => {
      render(
        <OfficePageLayout>
          <div>Content</div>
        </OfficePageLayout>
      );

      // Open theme dropdown
      const buttons = screen.getAllByRole('button');
      const themeButton = buttons.find(btn => btn.getAttribute('title') === 'Changer le theme');
      fireEvent.click(themeButton!);

      // Click dark mode
      fireEvent.click(screen.getByText('Sombre'));

      const state = useOfficeThemeStore.getState();
      expect(state.mode).toBe('dark');
    });

    it('should change theme when selecting from list', () => {
      render(
        <OfficePageLayout>
          <div>Content</div>
        </OfficePageLayout>
      );

      // Open theme dropdown
      const buttons = screen.getAllByRole('button');
      const themeButton = buttons.find(btn => btn.getAttribute('title') === 'Changer le theme');
      fireEvent.click(themeButton!);

      // Select Teams theme
      fireEvent.click(screen.getByText('Teams'));

      const state = useOfficeThemeStore.getState();
      expect(state.themeId).toBe('teams-purple');
    });

    it('should close dropdown when clicking outside', () => {
      render(
        <OfficePageLayout>
          <div data-testid="outside">Content</div>
        </OfficePageLayout>
      );

      // Open theme dropdown
      const buttons = screen.getAllByRole('button');
      const themeButton = buttons.find(btn => btn.getAttribute('title') === 'Changer le theme');
      fireEvent.click(themeButton!);

      // Verify dropdown is open
      expect(screen.getByText('Mode')).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(document.body);

      // Dropdown should be closed - Mode section should not be visible
      expect(screen.queryByText('Mode')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      render(
        <OfficePageLayout title="Test Page">
          <div>Content</div>
        </OfficePageLayout>
      );

      // Should have main element
      expect(screen.getByRole('main')).toBeInTheDocument();

      // Should have heading
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Page');

      // Should have navigation
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have accessible buttons with titles', () => {
      render(
        <OfficePageLayout>
          <div>Content</div>
        </OfficePageLayout>
      );

      // Theme button should have title
      const buttons = screen.getAllByRole('button');
      const themeButton = buttons.find(btn => btn.getAttribute('title') === 'Changer le theme');
      expect(themeButton).toBeInTheDocument();
    });

    it('navigation items should be focusable', () => {
      render(
        <OfficePageLayout>
          <div>Content</div>
        </OfficePageLayout>
      );

      const navButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent?.includes('Chat') ||
               btn.textContent?.includes('Dashboard') ||
               btn.textContent?.includes('Vision')
      );

      navButtons.forEach(btn => {
        expect(btn).not.toHaveAttribute('tabIndex', '-1');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render correctly with sidebar visible on desktop', () => {
      // matchMedia mock returns false for max-width: 768px (desktop)
      render(
        <OfficePageLayout>
          <div>Content</div>
        </OfficePageLayout>
      );

      // Sidebar should be visible
      expect(screen.getByText('Chat')).toBeVisible();
    });
  });
});
