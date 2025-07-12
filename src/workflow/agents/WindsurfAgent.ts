/**
 * @file Agent for windsurfing-related tasks like fetching forecasts,
 * recommending gear, and providing live session feedback.
 */

import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// --- Data Structures ---

export interface RiderProfile {
  weightKg: number; // Rider's weight in kilograms
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface WindForecast {
  spotId: string;
  time: Date;
  windSpeedKnots: number;
  windDirection: number; // In degrees
  waveHeightMeters?: number;
}

export interface RecommendedGear {
  sailSizeSqm: number; // Sail size in square meters
  boardVolumeLiters: number;
}

export interface SessionConfig {
  spotId: string;
  riderProfile: RiderProfile;
  gpsSource: Observable<GeoCoordinates>; // Live GPS data stream
}

export interface SessionFeedback {
  type: 'info' | 'success' | 'warning';
  message: string; // e.g., "Jibe successful!" or "Wind is dropping."
  ssml: string; // SSML for rich voice feedback
}

// --- Agent Class ---

export class WindsurfAgent {
  private forecastCache = new Map<string, { forecast: WindForecast; timestamp: number }>();
  private readonly CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Fetches the wind forecast for a specific spot and time.
   * Uses Open-Meteo API and includes a 15-minute cache.
   * @param spotId - A unique identifier for the windsurf spot.
   * @param time - The target time for the forecast.
   * @returns An Observable emitting the wind forecast.
   */
  getForecast(spotId: string, time: Date): Observable<WindForecast> {
    const cacheKey = `${spotId}_${time.toISOString()}`;
    const cached = this.forecastCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
      return of(cached.forecast);
    }

    // Placeholder for Open-Meteo API call
    console.log(`Fetching forecast for ${spotId} at ${time.toLocaleString()}...`);
    const mockApiCall$ = of({
      spotId,
      time,
      windSpeedKnots: 18,
      windDirection: 270, // West
      waveHeightMeters: 1.2,
    }).pipe(
      map((forecast: WindForecast) => {
        this.forecastCache.set(cacheKey, { forecast, timestamp: Date.now() });
        return forecast;
      }),
      catchError(err => {
        console.error('Failed to fetch forecast:', err);
        return of(null);
      })
    );

    return mockApiCall$;
  }

  /**
   * Recommends gear based on the rider's profile and the forecast.
   * @param riderProfile - The profile of the user.
   * @param forecast - The wind forecast.
   * @returns The recommended sail size and board volume.
   */
  recommendGear(riderProfile: RiderProfile, forecast: WindForecast): RecommendedGear {
    // Simplified logic placeholder
    const sailSize = riderProfile.skillLevel === 'beginner'
      ? Math.round(75 / forecast.windSpeedKnots)
      : Math.round(90 / forecast.windSpeedKnots);
      
    const boardVolume = riderProfile.weightKg + (riderProfile.skillLevel === 'beginner' ? 40 : 15);

    return {
      sailSizeSqm: sailSize,
      boardVolumeLiters: boardVolume,
    };
  }

  /**
   * Starts a live windsurf session, providing vocal feedback.
   * @param config - The session configuration.
   * @returns An Observable emitting live feedback events.
   */
  startSession(config: SessionConfig): Observable<SessionFeedback> {
    console.log(`Starting windsurf session for spot: ${config.spotId}`);

    // This would connect to the GPS source and analyze maneuvers.
    // Here's a mock implementation that emits a few events.
    return new Observable(subscriber => {
      subscriber.next({
        type: 'info',
        message: 'Session started. Good luck!',
        ssml: '<speak>Session started. Good luck!</speak>',
      });

      const timeout1 = setTimeout(() => {
        subscriber.next({
          type: 'success',
          message: 'Jibe successful!',
          ssml: '<speak><emphasis level="strong">Jibe successful!</emphasis></speak>',
        });
      }, 10000); // After 10 seconds

      const timeout2 = setTimeout(() => {
        subscriber.next({
          type: 'warning',
          message: 'Wind is picking up. Consider a smaller sail.',
          ssml: '<speak>Wind is picking up. Consider a smaller sail.</speak>',
        });
        subscriber.complete();
      }, 30000); // After 30 seconds

      // Cleanup function
      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
      };
    });
  }
}
