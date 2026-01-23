/**
 * NetworkIndicator Component
 * Indicateur de connexion réseau en temps réel
 */

import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';

interface NetworkIndicatorProps {
  showLabel?: boolean;
  showPendingCount?: boolean;
  compact?: boolean;
}

export const NetworkIndicator = ({ 
  showLabel = false, 
  showPendingCount = true,
  compact = false 
}: NetworkIndicatorProps) => {
  const { isOnline, pendingCount, syncPendingMessages } = useOffline();

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await syncPendingMessages();
  };

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isOnline ? '#10b981' : '#ef4444',
          }}
        />
        {pendingCount > 0 && (
          <span style={{ color: '#f59e0b', fontSize: '11px' }}>
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: isOnline 
          ? 'rgba(16, 185, 129, 0.1)' 
          : 'rgba(239, 68, 68, 0.1)',
        borderRadius: '20px',
        border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
      }}
    >
      {/* Connection Icon */}
      {isOnline ? (
        <Wifi size={16} style={{ color: '#10b981' }} />
      ) : (
        <WifiOff size={16} style={{ color: '#ef4444' }} />
      )}

      {/* Label */}
      {showLabel && (
        <span
          style={{
            fontSize: '12px',
            color: isOnline ? '#10b981' : '#ef4444',
          }}
        >
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </span>
      )}

      {/* Pending Messages */}
      {showPendingCount && pendingCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: '4px',
            padding: '2px 8px',
            backgroundColor: 'rgba(245, 158, 11, 0.2)',
            borderRadius: '10px',
          }}
        >
          <CloudOff size={12} style={{ color: '#f59e0b' }} />
          <span style={{ color: '#f59e0b', fontSize: '11px' }}>
            {pendingCount}
          </span>
          
          {isOnline && (
            <button
              onClick={handleSync}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#f59e0b',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * NetworkBanner Component
 * Bannière affichée quand hors-ligne
 */
export const NetworkBanner = () => {
  const { isOnline, pendingCount, syncPendingMessages } = useOffline();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '8px 16px',
        backgroundColor: isOnline 
          ? 'rgba(245, 158, 11, 0.9)' 
          : 'rgba(239, 68, 68, 0.9)',
        color: '#fff',
        fontSize: '13px',
      }}
    >
      {isOnline ? (
        <>
          <Cloud size={16} />
          <span>{pendingCount} message(s) en attente</span>
          <button
            onClick={() => syncPendingMessages()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            <RefreshCw size={14} />
            Synchroniser
          </button>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>Mode hors-ligne - Les messages seront envoyés quand la connexion sera rétablie</span>
        </>
      )}
    </div>
  );
};

export default NetworkIndicator;
