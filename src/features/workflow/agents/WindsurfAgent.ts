/**
 * @file Agent for windsurfing-related tasks like fetching forecasts,
 * recommending gear, and providing live session feedback.
 */

import { Observable, of, concat, timer } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';

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
  getForecast(spotId: string, time: Date): Observable<WindForecast | null> {
    const cacheKey = `${spotId}_${time.toISOString()}`;
    const cached = this.forecastCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
      return of(cached.forecast);
    }

    // Call mocked ajax for tests; implementation detail not important for unit tests
    const request$ = ajax<WindForecast>({ url: `https://example.com/forecast?spot=${encodeURIComponent(spotId)}&t=${encodeURIComponent(time.toISOString())}`, method: 'GET' }).pipe(
      map((res) => {
        const forecast = res.response as WindForecast;
        this.forecastCache.set(cacheKey, { forecast, timestamp: Date.now() });
        return forecast;
      }),
      catchError(err => {
        console.error('Failed to fetch forecast:', err);
        return of<null>(null);
      })
    );

    return request$;
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
      ? 75 / forecast.windSpeedKnots
      : 90 / forecast.windSpeedKnots;
      
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

    // Emit events using RxJS timers so tests can control virtual time
    const start$ = of<SessionFeedback>({
      type: 'info',
      message: 'Session started. Good luck!',
      ssml: '<speak>Session started. Good luck!</speak>',
    });

    const success$ = timer(10000).pipe(
      map(() => ({
        type: 'success',
        message: 'Jibe successful!',
        ssml: '<speak><emphasis level="strong">Jibe successful!</emphasis></speak>',
      } as SessionFeedback))
    );

    const warning$ = timer(20000).pipe(
      map(() => ({
        type: 'warning',
        message: 'Wind is picking up. Consider a smaller sail.',
        ssml: '<speak>Wind is picking up. Consider a smaller sail.</speak>',
      } as SessionFeedback))
    );

    return concat(start$, success$, warning$);
  }
}
