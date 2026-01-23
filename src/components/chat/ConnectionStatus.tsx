/**
 * Connection Status Component
 * Indicateur de l'état de connexion à LM Studio
 */

import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { lmStudioService } from '../../services/LMStudioService';

type ConnectionState = 'checking' | 'connected' | 'degraded' | 'disconnected';

interface ConnectionInfo {
  state: ConnectionState;
  model: string | null;
  latency: number;
  error?: string;
}

export const ConnectionStatus = () => {
  const [info, setInfo] = useState<ConnectionInfo>({
    state: 'checking',
    model: null,
    latency: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkConnection = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const health = await lmStudioService.healthCheck();
      setInfo({
        state: health.status === 'healthy' ? 'connected' 
             : health.status === 'degraded' ? 'degraded' 
             : 'disconnected',
        model: health.model,
        latency: health.latencyMs,
        error: health.error,
      });
    } catch {
      setInfo({
        state: 'disconnected',
        model: null,
        latency: 0,
        error: 'Connection check failed',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkConnection]);

  const getStatusColor = () => {
    switch (info.state) {
      case 'connected': return '#10a37f';
      case 'degraded': return '#f59e0b';
      case 'disconnected': return '#ef4444';
      default: return '#888';
    }
  };

  const getStatusIcon = () => {
    switch (info.state) {
      case 'connected': return <Wifi size={14} />;
      case 'degraded': return <AlertCircle size={14} />;
      case 'disconnected': return <WifiOff size={14} />;
      default: return <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />;
    }
  };

  const getStatusText = () => {
    switch (info.state) {
      case 'connected': return 'Connecté';
      case 'degraded': return 'Lent';
      case 'disconnected': return 'Déconnecté';
      default: return 'Vérification...';
    }
  };

  return (
    <div
      onClick={checkConnection}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        backgroundColor: `${getStatusColor()}15`,
        borderRadius: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: '12px',
        color: getStatusColor(),
        border: `1px solid ${getStatusColor()}30`,
      }}
      title={info.error || (info.model ? `Modèle: ${info.model}\nLatence: ${info.latency}ms` : 'Cliquez pour actualiser')}
    >
      {getStatusIcon()}
      <span style={{ fontWeight: 500 }}>{getStatusText()}</span>
      {info.state === 'connected' && info.model && (
        <span style={{ opacity: 0.7, fontSize: '11px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {info.model.split('/').pop()?.replace(/-/g, ' ').slice(0, 15) || info.model}
        </span>
      )}
      {info.state === 'connected' && info.latency > 0 && (
        <span style={{ opacity: 0.5, fontSize: '10px' }}>
          {info.latency}ms
        </span>
      )}
    </div>
  );
};

export default ConnectionStatus;
