/**
 * Tests for WeatherAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WeatherAgent, type WeatherIntent } from '../implementations/WeatherAgent';
import { AgentDomains } from '../core/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn()
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true
});

describe('WeatherAgent', () => {
  let agent: WeatherAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new WeatherAgent();

    // Default mock for geolocation
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 48.8566,
          longitude: 2.3522
        }
      });
    });

    // Default mock for fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        current_weather: {
          temperature: 20,
          weathercode: 0,
          windspeed: 10,
          winddirection: 180
        },
        hourly: {
          relativehumidity_2m: [65]
        }
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('WeatherAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('météorologique');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.1.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.KNOWLEDGE);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('current_weather');
      expect(agent.capabilities).toContain('weather_forecast');
      expect(agent.capabilities).toContain('weather_alerts');
      expect(agent.capabilities).toContain('hourly_forecast');
      expect(agent.capabilities).toContain('location_search');
    });
  });

  describe('canHandle', () => {
    it('should return high confidence for weather-related regex patterns', async () => {
      // The regex "what.?s the weather( like)?( today| tomorrow)?" matches
      const confidence1 = await agent.canHandle("what's the weather");
      expect(confidence1).toBe(0.9);
    });

    it('should return medium confidence for weather keywords in queries', async () => {
      // "weather" and "today" are keywords
      const confidence1 = await agent.canHandle("what's the weather like today?");
      expect(confidence1).toBe(0.7);

      // "forecast" is a keyword
      const confidence2 = await agent.canHandle('forecast for today');
      expect(confidence2).toBe(0.7);
    });

    it('should return medium confidence for weather keywords', async () => {
      const confidence1 = await agent.canHandle('temperature');
      expect(confidence1).toBe(0.7);

      const confidence2 = await agent.canHandle('Is it going to rain?');
      expect(confidence2).toBe(0.7);

      const confidence3 = await agent.canHandle('weather');
      expect(confidence3).toBe(0.7);
    });

    it('should return zero for unrelated queries', async () => {
      const confidence = await agent.canHandle('add a todo item');
      expect(confidence).toBe(0);
    });

    it('should handle French queries with keywords', async () => {
      // Test with French weather keywords
      const confidence1 = await agent.canHandle('meteo');
      expect(confidence1).toBe(0.7);

      const confidence2 = await agent.canHandle('prévision');
      expect(confidence2).toBe(0.7);

      const confidence3 = await agent.canHandle('température');
      expect(confidence3).toBe(0.7);
    });
  });

  describe('execute - get_current intent', () => {
    it('should get current weather using geolocation', async () => {
      const result = await agent.execute({
        intent: 'get_current' as WeatherIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output.temperature).toBeDefined();
      expect(result.output.location).toBe('Current Location');
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });

    it('should include execution time in metadata on success', async () => {
      const result = await agent.execute({
        intent: 'get_current' as WeatherIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.executionTime).toBeDefined();
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should include source in metadata on success', async () => {
      const result = await agent.execute({
        intent: 'get_current' as WeatherIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.source).toBe('weather-get_current');
    });
  });

  describe('execute - get_forecast intent', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          daily: {
            time: ['2025-01-01', '2025-01-02', '2025-01-03'],
            temperature_2m_max: [22, 24, 20],
            temperature_2m_min: [15, 16, 14],
            weathercode: [0, 1, 3]
          }
        })
      });
    });

    it('should get 3-day forecast by default', async () => {
      const result = await agent.execute({
        intent: 'get_forecast' as WeatherIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output.forecast).toHaveLength(3);
    });

    it('should get forecast for specified number of days', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          daily: {
            time: ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05', '2025-01-06', '2025-01-07'],
            temperature_2m_max: [22, 24, 20, 21, 23, 19, 18],
            temperature_2m_min: [15, 16, 14, 13, 15, 12, 11],
            weathercode: [0, 1, 3, 2, 0, 51, 61]
          }
        })
      });

      const result = await agent.execute({
        intent: 'get_forecast' as WeatherIntent,
        parameters: { days: 5 }
      });

      expect(result.success).toBe(true);
      expect(result.output.forecast.length).toBeLessThanOrEqual(5);
    });

    it('should reject invalid days parameter', async () => {
      const result = await agent.execute({
        intent: 'get_forecast' as WeatherIntent,
        parameters: { days: 10 }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Days must be a number between 1 and 7');
    });
  });

  describe('execute - get_hourly intent', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          hourly: {
            time: ['2025-01-01T00:00', '2025-01-01T01:00'],
            temperature_2m: [18, 17],
            relativehumidity_2m: [70, 72],
            windspeed_10m: [5, 6],
            weathercode: [0, 1]
          }
        })
      });
    });

    it('should get hourly forecast with default hours', async () => {
      const result = await agent.execute({
        intent: 'get_hourly' as WeatherIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output.hourly_forecast).toBeDefined();
    });

    it('should reject invalid hours parameter', async () => {
      const result = await agent.execute({
        intent: 'get_hourly' as WeatherIntent,
        parameters: { hours: 100 }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Hours must be a number between 1 and 48');
    });
  });

  describe('execute - get_alerts intent', () => {
    it('should get weather alerts', async () => {
      const result = await agent.execute({
        intent: 'get_alerts' as WeatherIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output.alerts).toBeDefined();
      expect(result.output.has_active_alerts).toBeDefined();
    });
  });

  describe('execute - search_location intent', () => {
    it('should use fallback locations when no API key', async () => {
      const result = await agent.execute({
        intent: 'search_location' as WeatherIntent,
        parameters: { query: 'paris' }
      });

      // The agent uses fallback mock locations when no API key is set
      expect(result.success).toBe(true);
      expect(result.output.name).toBe('Paris, France');
      expect(result.output.latitude).toBeDefined();
      expect(result.output.longitude).toBeDefined();
    });

    it('should fail when query is missing', async () => {
      const result = await agent.execute({
        intent: 'search_location' as WeatherIntent,
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('A location query is required');
    });

    it('should fail when location is not found', async () => {
      const result = await agent.execute({
        intent: 'search_location' as WeatherIntent,
        parameters: { query: 'unknownlocation123' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Location not found');
    });
  });

  describe('execute - unsupported intent', () => {
    it('should return error for unsupported intent', async () => {
      const result = await agent.execute({
        intent: 'unsupported_intent' as any,
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateInput', () => {
    it('should validate search_location requires query', async () => {
      const valid = await agent.validateInput({
        intent: 'search_location' as WeatherIntent,
        parameters: { query: 'Paris' }
      });

      expect(valid.valid).toBe(true);

      const invalid = await agent.validateInput({
        intent: 'search_location' as WeatherIntent,
        parameters: {}
      });

      expect(invalid.valid).toBe(false);
    });

    it('should validate hourly hours range', async () => {
      const invalid = await agent.validateInput({
        intent: 'get_hourly' as WeatherIntent,
        parameters: { hours: 100 }
      });

      expect(invalid.valid).toBe(false);

      const valid = await agent.validateInput({
        intent: 'get_hourly' as WeatherIntent,
        parameters: { hours: 24 }
      });

      expect(valid.valid).toBe(true);
    });

    it('should accept valid forecast parameters', async () => {
      const valid = await agent.validateInput({
        intent: 'get_forecast' as WeatherIntent,
        parameters: { days: 5 }
      });

      expect(valid.valid).toBe(true);
    });
  });

  describe('getRequiredParameters', () => {
    it('should return correct parameters for get_current', async () => {
      const params = await agent.getRequiredParameters('get_current');

      expect(params.some(p => p.name === 'location')).toBe(true);
      expect(params.find(p => p.name === 'location')?.required).toBe(false);
    });

    it('should return correct parameters for get_forecast', async () => {
      const params = await agent.getRequiredParameters('get_forecast');

      expect(params.some(p => p.name === 'location')).toBe(true);
      expect(params.some(p => p.name === 'days')).toBe(true);
    });

    it('should return correct parameters for search_location', async () => {
      const params = await agent.getRequiredParameters('search_location');

      expect(params.some(p => p.name === 'query')).toBe(true);
      expect(params.find(p => p.name === 'query')?.required).toBe(true);
    });

    it('should return empty array for unknown task', async () => {
      const params = await agent.getRequiredParameters('unknown_task');
      expect(params).toHaveLength(0);
    });
  });

  describe('getCapabilities', () => {
    it('should return all capabilities with descriptions', async () => {
      const capabilities = await agent.getCapabilities();

      expect(capabilities).toHaveLength(5);
      expect(capabilities.map(c => c.name)).toContain('Current Weather');
      expect(capabilities.map(c => c.name)).toContain('Weather Forecast');
      expect(capabilities.map(c => c.name)).toContain('Hourly Forecast');
      expect(capabilities.map(c => c.name)).toContain('Weather Alerts');
      expect(capabilities.map(c => c.name)).toContain('Location Search');

      capabilities.forEach(cap => {
        expect(cap.description).toBeDefined();
        expect(cap.requiredParameters).toBeDefined();
      });
    });
  });

  describe('error handling', () => {
    it('should handle geolocation errors', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ code: 1, message: 'User denied geolocation' });
      });

      const result = await agent.execute({
        intent: 'get_current' as WeatherIntent,
        parameters: {}
      });

      expect(result.success).toBe(false);
    });

    it('should include execution time in metadata on error', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ code: 1, message: 'User denied geolocation' });
      });

      const result = await agent.execute({
        intent: 'get_current' as WeatherIntent,
        parameters: {}
      });

      expect(result.metadata?.executionTime).toBeDefined();
    });
  });
});
