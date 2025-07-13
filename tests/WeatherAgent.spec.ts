import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
vi.mock('../src/agents/registry', () => ({ agentRegistry: { register: vi.fn() } }));
import { buildWeatherUrl, WeatherAgent } from '../src/agents/WeatherAgent';

describe('WeatherAgent utils', () => {
  it('buildWeatherUrl includes current_weather', () => {
    const url = buildWeatherUrl(10, 20);
    expect(url).toContain('current_weather=true');
  });

  it('mapWeatherCode covers documented codes', () => {
    const agent = new WeatherAgent();
    const codes: Record<number, string> = {
      0: 'clear', 1: 'mainly_clear', 2: 'partly_cloudy', 3: 'cloudy',
      45: 'fog', 48: 'deposit_rime_fog', 51: 'drizzle_light', 53: 'drizzle_moderate',
      55: 'drizzle_dense', 56: 'freezing_drizzle_light', 57: 'freezing_drizzle_dense',
      61: 'rain_slight', 63: 'rain_moderate', 65: 'rain_heavy', 66: 'freezing_rain_light',
      67: 'freezing_rain_heavy', 71: 'snow_fall_slight', 73: 'snow_fall_moderate',
      75: 'snow_fall_heavy', 77: 'snow_grains', 80: 'rain_showers_slight',
      81: 'rain_showers_moderate', 82: 'rain_showers_violent', 85: 'snow_showers_slight',
      86: 'snow_showers_heavy', 95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm_hail'
    };
    for (const [code, icon] of Object.entries(codes)) {
      // @ts-ignore - private method
      expect(agent['mapWeatherCode'](Number(code))).toBe(icon);
    }
  });
});
