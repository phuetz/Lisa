/**
 * Lisa Location Panel
 * Geolocation context UI
 */

import { useState, useEffect, useCallback } from 'react';
import { getLocationService } from '../../gateway';
import type { GeoLocation } from '../../gateway/LocationService';

export function LocationPanel() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = useCallback(() => {
    const service = getLocationService();
    setLocation(service.getLocation());
    setIsWatching(service.isWatching());
    setPermissionStatus(service.getPermissionStatus());
  }, []);

  useEffect(() => {
    refreshData();
    const service = getLocationService();
    service.on('location:updated', refreshData);
    return () => { service.off('location:updated', refreshData); };
  }, [refreshData]);

  const handleGetLocation = async () => {
    setIsLoading(true);
    const service = getLocationService();
    await service.getCurrentPosition();
    setIsLoading(false);
    refreshData();
  };

  const handleToggleWatch = () => {
    const service = getLocationService();
    if (isWatching) {
      service.stopWatching();
    } else {
      service.startWatching();
    }
    refreshData();
  };

  const stats = getLocationService().getStats();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📍 Localisation</h2>
        <span style={{ ...styles.permBadge, backgroundColor: permissionStatus === 'granted' ? '#10b981' : '#f59e0b' }}>
          {permissionStatus}
        </span>
      </div>

      {/* Current Location */}
      <div style={styles.locationCard}>
        {location ? (
          <>
            <div style={styles.coords}>
              <div style={styles.coordItem}>
                <span style={styles.coordLabel}>Latitude</span>
                <span style={styles.coordValue}>{location.latitude.toFixed(6)}°</span>
              </div>
              <div style={styles.coordItem}>
                <span style={styles.coordLabel}>Longitude</span>
                <span style={styles.coordValue}>{location.longitude.toFixed(6)}°</span>
              </div>
            </div>
            <div style={styles.accuracy}>
              Précision: ±{Math.round(location.accuracy)}m
            </div>
            {location.altitude && (
              <div style={styles.altitude}>
                Altitude: {Math.round(location.altitude)}m
              </div>
            )}
          </>
        ) : (
          <div style={styles.noLocation}>
            <span style={styles.noLocationIcon}>🌍</span>
            <span>Aucune position</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button 
          onClick={handleGetLocation} 
          style={styles.getButton}
          disabled={isLoading}
        >
          {isLoading ? '⏳ Localisation...' : '📍 Obtenir position'}
        </button>
        <button 
          onClick={handleToggleWatch}
          style={{ ...styles.watchButton, backgroundColor: isWatching ? '#10b981' : '#2d2d44' }}
        >
          {isWatching ? '⏹️ Arrêter suivi' : '👁️ Suivi continu'}
        </button>
      </div>

      {/* Map placeholder */}
      {location && (
        <div style={styles.mapPlaceholder}>
          <a 
            href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}&zoom=15`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.mapLink}
          >
            🗺️ Voir sur OpenStreetMap
          </a>
        </div>
      )}

      {/* Stats */}
      <div style={styles.stats}>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{stats.historySize}</span>
          <span style={styles.statLabel}>Positions</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{isWatching ? '✓' : '✕'}</span>
          <span style={styles.statLabel}>Suivi</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleTimeString() : '-'}</span>
          <span style={styles.statLabel}>Mise à jour</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: '#1a1a26', borderRadius: '12px', padding: '24px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 600 },
  permBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '11px', textTransform: 'capitalize' },
  locationCard: { backgroundColor: '#252525', borderRadius: '12px', padding: '24px', marginBottom: '20px' },
  coords: { display: 'flex', gap: '24px', marginBottom: '12px' },
  coordItem: { flex: 1 },
  coordLabel: { display: 'block', fontSize: '12px', color: '#6a6a82', marginBottom: '4px' },
  coordValue: { fontSize: '18px', fontWeight: 600, color: '#3b82f6' },
  accuracy: { fontSize: '13px', color: '#6a6a82' },
  altitude: { fontSize: '13px', color: '#6a6a82', marginTop: '4px' },
  noLocation: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px', color: '#6a6a82' },
  noLocationIcon: { fontSize: '32px' },
  actions: { display: 'flex', gap: '12px', marginBottom: '20px' },
  getButton: { flex: 1, padding: '14px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer' },
  watchButton: { flex: 1, padding: '14px', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer' },
  mapPlaceholder: { backgroundColor: '#252525', borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '20px' },
  mapLink: { color: '#3b82f6', textDecoration: 'none', fontSize: '14px' },
  stats: { display: 'flex', gap: '16px', paddingTop: '16px', borderTop: '1px solid #2d2d44' },
  statItem: { flex: 1, textAlign: 'center' },
  statValue: { display: 'block', fontSize: '18px', fontWeight: 600, color: '#3b82f6' },
  statLabel: { fontSize: '11px', color: '#6a6a82' }
};

export default LocationPanel;
