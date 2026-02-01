/**
 * AlarmTimerPanel Component Tests
 * Tests for alarm and timer display and cancellation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock data
const mockAlarms = [
  { id: 'alarm-1', time: Date.now() + 3600000, triggered: false },
  { id: 'alarm-2', time: Date.now() + 7200000, triggered: true },
];

const mockTimers = [
  { id: 'timer-1', finish: Date.now() + 30000, triggered: false },
  { id: 'timer-2', finish: Date.now() + 60000, triggered: true },
];

const mockSetState = vi.fn();

// Mock appStore
vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      alarms: mockAlarms,
      timers: mockTimers,
      setState: mockSetState,
    };
    return selector(state);
  }),
}));

// Mock notifications hook
vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    permissionState: 'granted',
  }),
}));

// Mock NotificationPermissionPrompt
vi.mock('../NotificationPermissionPrompt', () => ({
  NotificationPermissionPrompt: () => <div data-testid="notification-prompt">Prompt</div>,
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        alarms_timers_panel: 'Alarms & Timers',
        alarms: 'Alarms',
        timers: 'Timers',
        delete: 'Delete',
      };
      return translations[key] || key;
    },
  }),
}));

import AlarmTimerPanel from '../AlarmTimerPanel';
import { useAppStore } from '../../store/appStore';

describe('AlarmTimerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to return alarms and timers
    vi.mocked(useAppStore).mockImplementation((selector) => {
      const state = {
        alarms: mockAlarms,
        timers: mockTimers,
        setState: mockSetState,
      };
      return selector(state);
    });
  });

  describe('Rendering', () => {
    it('should render alarms section when alarms present', () => {
      render(<AlarmTimerPanel />);

      expect(screen.getByText('Alarms')).toBeInTheDocument();
    });

    it('should render timers section when timers present', () => {
      render(<AlarmTimerPanel />);

      expect(screen.getByText('Timers')).toBeInTheDocument();
    });

    it('should render alarm times', () => {
      render(<AlarmTimerPanel />);

      // Should have alarm list items
      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThanOrEqual(2);
    });

    it('should show check mark for triggered items', () => {
      render(<AlarmTimerPanel />);

      // Triggered alarm and timer both show checkmarks
      const checkmarks = screen.getAllByText(/✅/);
      expect(checkmarks.length).toBeGreaterThanOrEqual(1);
    });

    it('should have correct ARIA attributes', () => {
      render(<AlarmTimerPanel />);

      const region = screen.getByRole('region', { name: 'Alarms & Timers' });
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-live', 'polite');
    });

    it('should render delete buttons', () => {
      render(<AlarmTimerPanel />);

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      expect(deleteButtons.length).toBeGreaterThanOrEqual(4); // 2 alarms + 2 timers
    });
  });

  describe('Empty State', () => {
    it('should return null when no alarms and no timers', () => {
      vi.mocked(useAppStore).mockImplementation((selector) => {
        const state = {
          alarms: [],
          timers: [],
          setState: mockSetState,
        };
        return selector(state);
      });

      const { container } = render(<AlarmTimerPanel />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Alarm Cancellation', () => {
    it('should call setState to remove alarm when delete clicked', () => {
      render(<AlarmTimerPanel />);

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButtons[0]);

      expect(mockSetState).toHaveBeenCalled();
    });
  });

  describe('Timer Cancellation', () => {
    it('should call setState to remove timer when delete clicked', () => {
      render(<AlarmTimerPanel />);

      // Get all delete buttons - first 2 are for alarms, next 2 for timers
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      // Click timer delete (index 2 or 3)
      if (deleteButtons.length > 2) {
        fireEvent.click(deleteButtons[2]);
        expect(mockSetState).toHaveBeenCalled();
      }
    });
  });
});
