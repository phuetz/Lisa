/**
 * Lisa Location Service
 * Geolocation context for location-aware features
 * Inspired by OpenClaw's location.get node
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface LocationConfig {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  watchPosition: boolean;
  updateInterval: number; // ms
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export interface LocationContext {
  location: GeoLocation;
  address?: GeoAddress;
  timezone?: string;
  weather?: WeatherInfo;
}

export interface GeoAddress {
  street?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  formatted?: string;
}

export interface WeatherInfo {
  temperature?: number;
  condition?: string;
  humidity?: number;
  windSpeed?: number;
}

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

const DEFAULT_CONFIG: LocationConfig = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000, // 1 minute
  watchPosition: false,
  updateInterval: 30000 // 30 seconds
};

export class LocationService extends BrowserEventEmitter {
  private config: LocationConfig;
  private currentLocation: GeoLocation | null = null;
  private locationHistory: GeoLocation[] = [];
  private watchId: number | null = null;
  private permissionStatus: PermissionStatus = 'unknown';
  private maxHistorySize = 100;

  constructor(config: Partial<LocationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.checkPermission();
  }

  // Permission handling
  private async checkPermission(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.permissions) {
      this.permissionStatus = 'unknown';
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      this.permissionStatus = result.state as PermissionStatus;
      
      result.addEventListener('change', () => {
        this.permissionStatus = result.state as PermissionStatus;
        this.emit('permission:changed', { status: this.permissionStatus });
      });
    } catch {
      this.permissionStatus = 'unknown';
    }
  }

  getPermissionStatus(): PermissionStatus {
    return this.permissionStatus;
  }

  // Configuration
  configure(config: Partial<LocationConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart watch if active
    if (this.watchId !== null && config.watchPosition !== false) {
      this.stopWatching();
      this.startWatching();
    }
    
    this.emit('config:changed', this.config);
  }

  getConfig(): LocationConfig {
    return { ...this.config };
  }

  // Get current position
  async getCurrentPosition(): Promise<GeoLocation | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.emit('error', { message: 'Geolocation not supported' });
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = this.positionToGeoLocation(position);
          this.updateLocation(location);
          resolve(location);
        },
        (error) => {
          this.handleError(error);
          resolve(null);
        },
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge
        }
      );
    });
  }

  private positionToGeoLocation(position: GeolocationPosition): GeoLocation {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude || undefined,
      altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed || undefined,
      timestamp: new Date(position.timestamp)
    };
  }

  private updateLocation(location: GeoLocation): void {
    this.currentLocation = location;
    this.locationHistory.push(location);
    
    // Trim history
    if (this.locationHistory.length > this.maxHistorySize) {
      this.locationHistory.shift();
    }
    
    this.emit('location:updated', location);
  }

  private handleError(error: GeolocationPositionError): void {
    let message: string;
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied';
        this.permissionStatus = 'denied';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location unavailable';
        break;
      case error.TIMEOUT:
        message = 'Location request timeout';
        break;
      default:
        message = 'Unknown location error';
    }

    this.emit('error', { code: error.code, message });
  }

  // Watch position
  startWatching(): boolean {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return false;
    }

    if (this.watchId !== null) {
      return true; // Already watching
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = this.positionToGeoLocation(position);
        this.updateLocation(location);
      },
      (error) => this.handleError(error),
      {
        enableHighAccuracy: this.config.enableHighAccuracy,
        timeout: this.config.timeout,
        maximumAge: this.config.maximumAge
      }
    );

    this.emit('watching:started');
    return true;
  }

  stopWatching(): void {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.emit('watching:stopped');
    }
  }

  isWatching(): boolean {
    return this.watchId !== null;
  }

  // Location data
  getLocation(): GeoLocation | null {
    return this.currentLocation ? { ...this.currentLocation } : null;
  }

  getHistory(limit?: number): GeoLocation[] {
    const history = [...this.locationHistory];
    return limit ? history.slice(-limit) : history;
  }

  clearHistory(): void {
    this.locationHistory = [];
    this.emit('history:cleared');
  }

  // Distance calculation (Haversine formula)
  calculateDistance(from: GeoLocation, to: GeoLocation): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.latitude * Math.PI) / 180;
    const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
    const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Get distance from current location
  distanceFromCurrent(to: GeoLocation): number | null {
    if (!this.currentLocation) return null;
    return this.calculateDistance(this.currentLocation, to);
  }

  // Geofencing
  isWithinRadius(center: GeoLocation, radiusMeters: number): boolean {
    if (!this.currentLocation) return false;
    const distance = this.calculateDistance(this.currentLocation, center);
    return distance <= radiusMeters;
  }

  // Reverse geocoding (would need external API in real implementation)
  async reverseGeocode(location?: GeoLocation): Promise<GeoAddress | null> {
    const loc = location || this.currentLocation;
    if (!loc) return null;

    // In real implementation, would call geocoding API
    // For now, return placeholder
    const address: GeoAddress = {
      formatted: `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`
    };

    this.emit('geocode:complete', { location: loc, address });
    return address;
  }

  // Get full context
  async getContext(): Promise<LocationContext | null> {
    const location = await this.getCurrentPosition();
    if (!location) return null;

    const address = await this.reverseGeocode(location);
    
    return {
      location,
      address: address || undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  // Format location for display
  formatLocation(location?: GeoLocation): string {
    const loc = location || this.currentLocation;
    if (!loc) return 'Unknown';
    
    return `${loc.latitude.toFixed(6)}°, ${loc.longitude.toFixed(6)}° (±${Math.round(loc.accuracy)}m)`;
  }

  // Stats
  getStats(): {
    hasLocation: boolean;
    isWatching: boolean;
    permissionStatus: PermissionStatus;
    historySize: number;
    lastUpdate: Date | null;
  } {
    return {
      hasLocation: this.currentLocation !== null,
      isWatching: this.isWatching(),
      permissionStatus: this.permissionStatus,
      historySize: this.locationHistory.length,
      lastUpdate: this.currentLocation?.timestamp || null
    };
  }
}

// Singleton
let locationServiceInstance: LocationService | null = null;

export function getLocationService(): LocationService {
  if (!locationServiceInstance) {
    locationServiceInstance = new LocationService();
  }
  return locationServiceInstance;
}

export function resetLocationService(): void {
  if (locationServiceInstance) {
    locationServiceInstance.stopWatching();
    locationServiceInstance.removeAllListeners();
    locationServiceInstance = null;
  }
}

