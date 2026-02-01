/**
 * Connection Status Component
 * OpenClaw-inspired connection status indicator
 *
 * Features:
 * - Real-time provider status
 * - Token count and cost display
 * - Cooldown indicator
 * - Multi-provider health overview
 */

import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, AlertCircle, RefreshCw, Cloud, Clock, Zap, DollarSign, Activity } from 'lucide-react';
import { getConnectionManager, type ConnectionStatus as ConnStatus, type AIProviderType } from '../../services/ConnectionManager';
import { useChatSettingsStore, DEFAULT_MODELS } from '../../store/chatSettingsStore';

type ConnectionState = 'checking' | 'connected' | 'degraded' | 'disconnected' | 'cooldown';

interface ConnectionInfo {
  state: ConnectionState;
  model: string | null;
  latency: number;
  error?: string;
  tokenCount?: number;
  costEstimate?: number;
  cooldownUntil?: number;
}

// Provider display config
const PROVIDER_CONFIG: Record<AIProviderType, { name: string; icon: string; color: string }> = {
  gemini: { name: 'Gemini', icon: '✨', color: '#4285f4' },
  openai: { name: 'OpenAI', icon: '🤖', color: '#10a37f' },
  anthropic: { name: 'Claude', icon: '🧠', color: '#d97706' },
  xai: { name: 'Grok', icon: '⚡', color: '#1da1f2' },
  lmstudio: { name: 'LM Studio', icon: '🏠', color: '#8b5cf6' },
  ollama: { name: 'Ollama', icon: '🦙', color: '#22c55e' }
};

export const ConnectionStatus = () => {
  const [info, setInfo] = useState<ConnectionInfo>({
    state: 'checking',
    model: null,
    latency: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Get selected model from settings
  const selectedModelId = useChatSettingsStore(state => state.selectedModelId);
  const currentModel = DEFAULT_MODELS.find(m => m.id === selectedModelId) || DEFAULT_MODELS[0];
  const provider = currentModel.provider as AIProviderType;
  const providerConfig = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.gemini;
  const isCloudModel = ['gemini', 'openai', 'anthropic', 'xai'].includes(provider);

  const checkConnection = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const connectionManager = getConnectionManager();
      const status = await connectionManager.getConnectionStatus(provider);

      setInfo({
        state: status.state as ConnectionState,
        model: status.model || currentModel.name,
        latency: status.latencyMs,
        error: status.error,
        tokenCount: status.tokenCount,
        costEstimate: status.costEstimate,
        cooldownUntil: undefined // Will be set from profile if in cooldown
      });
    } catch (error) {
      setInfo({
        state: 'disconnected',
        model: null,
        latency: 0,
        error: 'Connection check failed',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [provider, currentModel.name]);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s

    // Subscribe to connection events
    const connectionManager = getConnectionManager();
    const handleSuccess = () => checkConnection();
    const handleFailure = () => checkConnection();

    connectionManager.on('connectionSuccess', handleSuccess);
    connectionManager.on('connectionFailure', handleFailure);

    return () => {
      clearInterval(interval);
      connectionManager.off('connectionSuccess', handleSuccess);
      connectionManager.off('connectionFailure', handleFailure);
    };
  }, [checkConnection]);

  const getStatusColor = () => {
    switch (info.state) {
      case 'connected': return '#10a37f';
      case 'degraded': return '#f59e0b';
      case 'cooldown': return '#8b5cf6';
      case 'disconnected': return '#ef4444';
      default: return '#888';
    }
  };

  const getStatusIcon = () => {
    if (info.state === 'cooldown') {
      return <Clock size={14} className="animate-pulse" />;
    }
    if (isCloudModel && info.state === 'connected') {
      return <Cloud size={14} />;
    }
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
      case 'cooldown': return 'Pause';
      case 'disconnected': return 'Déconnecté';
      default: return 'Vérification...';
    }
  };

  const formatTokenCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const formatCost = (cost: number): string => {
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Main status badge */}
      <div
        onClick={() => setShowDetails(!showDetails)}
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
        title={info.error || (info.model ? `Modèle: ${info.model}\nLatence: ${info.latency}ms` : 'Cliquez pour détails')}
      >
        {/* Provider icon */}
        <span style={{ fontSize: '14px' }}>{providerConfig.icon}</span>

        {/* Status icon */}
        {getStatusIcon()}

        {/* Status text */}
        <span style={{ fontWeight: 500 }}>{getStatusText()}</span>

        {/* Model name (truncated) */}
        {info.state === 'connected' && (
          <span style={{
            opacity: 0.7,
            fontSize: '11px',
            maxWidth: '100px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {currentModel.name.replace(' (Local)', '').replace(' (Recommandé)', '').slice(0, 15)}
          </span>
        )}

        {/* Token count badge */}
        {info.state === 'connected' && info.tokenCount !== undefined && info.tokenCount > 0 && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            opacity: 0.6,
            fontSize: '10px',
            backgroundColor: `${getStatusColor()}20`,
            padding: '2px 5px',
            borderRadius: '10px'
          }}>
            <Zap size={10} />
            {formatTokenCount(info.tokenCount)}
          </span>
        )}

        {/* Latency badge */}
        {info.state === 'connected' && info.latency > 0 && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            opacity: 0.5,
            fontSize: '10px'
          }}>
            <Activity size={10} />
            {info.latency}ms
          </span>
        )}

        {/* Refresh button */}
        <RefreshCw
          size={12}
          onClick={(e) => {
            e.stopPropagation();
            checkConnection();
          }}
          style={{
            cursor: 'pointer',
            opacity: 0.5,
            transition: 'opacity 0.2s'
          }}
          className={isRefreshing ? 'animate-spin' : ''}
        />
      </div>

      {/* Details dropdown */}
      {showDetails && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '16px',
          minWidth: '280px',
          zIndex: 1000,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid #333'
          }}>
            <span style={{ fontSize: '24px' }}>{providerConfig.icon}</span>
            <div>
              <div style={{ fontWeight: 600, color: '#fff' }}>{providerConfig.name}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>{currentModel.name}</div>
            </div>
            <div style={{
              marginLeft: 'auto',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: getStatusColor()
            }} />
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            {/* Connection status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa' }}>
              <span>État</span>
              <span style={{ color: getStatusColor(), fontWeight: 500 }}>{getStatusText()}</span>
            </div>

            {/* Model */}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa' }}>
              <span>Modèle</span>
              <span style={{ color: '#fff' }}>{info.model || '-'}</span>
            </div>

            {/* Latency */}
            {info.latency > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa' }}>
                <span>Latence</span>
                <span style={{ color: '#fff' }}>{info.latency}ms</span>
              </div>
            )}

            {/* Token count */}
            {info.tokenCount !== undefined && info.tokenCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa' }}>
                <span>Tokens utilisés</span>
                <span style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={12} />
                  {formatTokenCount(info.tokenCount)}
                </span>
              </div>
            )}

            {/* Cost estimate */}
            {info.costEstimate !== undefined && info.costEstimate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa' }}>
                <span>Coût estimé</span>
                <span style={{ color: '#10a37f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <DollarSign size={12} />
                  {formatCost(info.costEstimate)}
                </span>
              </div>
            )}

            {/* Error message */}
            {info.error && (
              <div style={{
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#ef444420',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '12px'
              }}>
                {info.error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #333'
          }}>
            <button
              onClick={() => {
                checkConnection();
              }}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#333',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <button
              onClick={() => {
                const connectionManager = getConnectionManager();
                connectionManager.clearCooldowns();
                checkConnection();
              }}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#888',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDetails && (
        <div
          onClick={() => setShowDetails(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
      )}
    </div>
  );
};

export default ConnectionStatus;
