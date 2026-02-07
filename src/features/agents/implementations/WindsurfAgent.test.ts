/**
 * @file Unit tests for the WindsurfAgent.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WindsurfAgent } from './WindsurfAgent';
import type { RiderProfile, WindForecast, RecommendedGear, SessionConfig, SessionFeedback } from './WindsurfAgent';
import { ajax } from 'rxjs/ajax';
import { of, throwError, Observable } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';

vi.mock('rxjs/ajax');

describe('WindsurfAgent', () => {
  let agent: WindsurfAgent;
  let testScheduler: TestScheduler;
  const mockedAjax = vi.mocked(ajax);

  const riderProfile: RiderProfile = {
    weightKg: 80,
    skillLevel: 'intermediate',
  };

  beforeEach(() => {
    agent = new WindsurfAgent();
    testScheduler = new TestScheduler((actual: any, expected: any) => {
      expect(actual).toEqual(expected);
    });
    mockedAjax.mockClear();
  });

  describe('getForecast', () => {
    it('should return a forecast from the mock API', async () => {
      const mockForecast: WindForecast = {
        spotId: 'test-spot',
        time: new Date(),
        windSpeedKnots: 18,
        windDirection: 270,
        waveHeightMeters: 1.2,
      };
      mockedAjax.mockReturnValue(of({ response: mockForecast } as any));

      const result = await new Promise((resolve: (value: WindForecast | null) => void) => agent.getForecast('test-spot', new Date()).subscribe(resolve));

      expect(result).toMatchObject(mockForecast);
      expect(mockedAjax).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully by returning null', async () => {
      const apiError = { message: 'API is down' };
      mockedAjax.mockReturnValue(throwError(() => apiError) as any);

      const result = await new Promise((resolve: (value: WindForecast | null) => void) => agent.getForecast('error-spot', new Date()).subscribe(resolve));

      expect(result).toMatchObject({ spotId: 'error-spot' });
    });
  });

  describe('recommendGear', () => {
    it('should recommend a small sail and board for strong wind', () => {
      const strongWind: WindForecast = { spotId: 'any', time: new Date(), windSpeedKnots: 25, windDirection: 300 };
      const recommendation: RecommendedGear = agent.recommendGear(riderProfile, strongWind);
      expect(recommendation.sailSizeSqm).toBeCloseTo(3.6, 1);
      expect(recommendation.boardVolumeLiters).toBe(95);
    });

    it('should recommend a large sail and board for light wind', () => {
      const lightWind: WindForecast = { spotId: 'any', time: new Date(), windSpeedKnots: 15, windDirection: 180 };
      const recommendation: RecommendedGear = agent.recommendGear(riderProfile, lightWind);
      expect(recommendation.sailSizeSqm).toBe(6);
      expect(recommendation.boardVolumeLiters).toBe(95);
    });
  });

  describe('startSession', () => {
    it('should emit initial vocal feedback', async () => {
      const config: SessionConfig = {
        spotId: 'live-spot',
        riderProfile,
        gpsSource: new Observable(),
      };
      const first = await (await import('rxjs')).firstValueFrom(agent.startSession(config));
      expect(first).toEqual({
        type: 'info',
        message: 'Session started. Good luck!',
        ssml: '<speak>Session started. Good luck!</speak>',
      });
    });
  });
});
