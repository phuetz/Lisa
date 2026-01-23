/**
 * ConnectionIndicator - Indicateur de connexion amélioré pour mobile
 * Affiche l'état de connexion avec animations
 */

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'slow';

interface ConnectionIndicatorProps {
  baseUrl?: string;
  checkInterval?: number;
}

export const ConnectionIndicator = ({ 
  baseUrl = '/lmstudio/v1/models',
  checkInterval = 10000 
}: ConnectionIndicatorProps) => {
  const [state, setState] = useState<ConnectionState>('connecting');
  const [latency, setLatency] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      const startTime = performance.now();
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(baseUrl, { 
          signal: controller.signal,
          cache: 'no-store'
        });
        
        clearTimeout(timeoutId);
        const endTime = performance.now();
        const ping = Math.round(endTime - startTime);
        
        setLatency(ping);
        
        if (response.ok) {
          setState(ping > 1000 ? 'slow' : 'connected');
        } else {
          setState('disconnected');
        }
      } catch {
        setState('disconnected');
        setLatency(null);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, checkInterval);
    
    return () => clearInterval(interval);
  }, [baseUrl, checkInterval]);

  const stateConfig = {
    connected: { 
      icon: Wifi, 
      color: '#10b981', 
      bgColor: 'rgba(16, 185, 129, 0.15)',
      label: 'Connecté' 
    },
    disconnected: { 
      icon: WifiOff, 
      color: '#ef4444', 
      bgColor: 'rgba(239, 68, 68, 0.15)',
      label: 'Déconnecté' 
    },
    connecting: { 
      icon: Loader2, 
      color: '#f59e0b', 
      bgColor: 'rgba(245, 158, 11, 0.15)',
      label: 'Connexion...' 
    },
    slow: { 
      icon: Wifi, 
      color: '#f59e0b', 
      bgColor: 'rgba(245, 158, 11, 0.15)',
      label: 'Connexion lente' 
    },
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: expanded ? '8px 12px' : '6px 10px',
        backgroundColor: config.bgColor,
        borderRadius: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
      }}
    >
      <Icon
        size={14}
        color={config.color}
        style={{
          animation: state === 'connecting' ? 'spin 1s linear infinite' : 'none',
        }}
      />
      
      {expanded && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease',
        }}>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            color: config.color 
          }}>
            {config.label}
          </span>
          {latency !== null && (
            <span style={{ 
              fontSize: '10px', 
              color: '#888' 
            }}>
              {latency}ms
            </span>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; width: 0; }
          to { opacity: 1; width: auto; }
        }
      `}</style>
    </div>
  );
};

export default ConnectionIndicator;
