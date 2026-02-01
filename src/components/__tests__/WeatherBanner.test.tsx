/**
 * WeatherBanner Component Tests
 * Tests for weather display functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Store state
let mockIntent = 'weather_now';

// Mock appStore
vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn((selector) => {
    const state = { intent: mockIntent };
    return selector(state);
  }),
}));

// Mock weather result
const mockWeatherResult = {
  success: true,
  output: {
    current_weather: { temperature: 22 },
    daily: {
      temperature_2m_max: [25, 28],
      temperature_2m_min: [15, 18],
    },
  },
};

const mockExecute = vi.fn().mockResolvedValue(mockWeatherResult);

// Mock agent registry
vi.mock('../../features/agents/core/registry', () => ({
  agentRegistry: {
    getAgent: vi.fn(() => ({
      execute: mockExecute,
    })),
  },
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        current_temperature: `Current temperature: ${params?.temp}°C`,
        tomorrow_forecast: `Tomorrow: ${params?.min}°C - ${params?.max}°C`,
      };
      return translations[key] || key;
    },
  }),
}));

// Mock speechSynthesis and SpeechSynthesisUtterance
const mockSpeak = vi.fn();
Object.defineProperty(window, 'speechSynthesis', {
  value: { speak: mockSpeak },
  writable: true,
});

// Mock SpeechSynthesisUtterance class
class MockSpeechSynthesisUtterance {
  text: string;
  constructor(text: string) {
    this.text = text;
  }
}
Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  value: MockSpeechSynthesisUtterance,
  writable: true,
});
global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance;

import WeatherBanner from '../WeatherBanner';
import { useAppStore } from '../../store/appStore';

describe('WeatherBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIntent = 'weather_now';
    vi.mocked(useAppStore).mockImplementation((selector) =>
      selector({ intent: mockIntent })
    );
  });

  describe('Empty State', () => {
    it('should return null initially when no weather fetched', () => {
      mockIntent = 'none';
      vi.mocked(useAppStore).mockImplementation((selector) =>
        selector({ intent: mockIntent })
      );

      const { container } = render(<WeatherBanner />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Current Weather', () => {
    it('should fetch and display current weather when intent is weather_now', async () => {
      render(<WeatherBanner />);

      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledWith({ command: 'get_current' });
      });

      await waitFor(() => {
        expect(screen.getByText(/Current temperature/)).toBeInTheDocument();
      });
    });

    it('should speak the weather', async () => {
      render(<WeatherBanner />);

      await waitFor(() => {
        expect(mockSpeak).toHaveBeenCalled();
      });
    });
  });

  describe('Weather Forecast', () => {
    it('should fetch forecast when intent is weather_forecast', async () => {
      mockIntent = 'weather_forecast';
      vi.mocked(useAppStore).mockImplementation((selector) =>
        selector({ intent: mockIntent })
      );

      render(<WeatherBanner />);

      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledWith({ command: 'get_forecast' });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', async () => {
      render(<WeatherBanner />);

      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});
