/**
 * Lisa Sync Panel
 * Cross-device synchronization management UI
 */

import { useState, useEffect, useCallback } from 'react';
import { getSyncService } from '../../gateway';
import type { SyncState, SyncConfig, SyncProvider } from '../../gateway';

export function SyncPanel() {
  const [state, setState] = useState<SyncState | null>(null);
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const refreshData = useCallback(() => {
    const service = getSyncService();
    setState(service.getState());
    setConfig(service.getConfig());
  }, []);

  useEffect(() => {
    refreshData();
    
    const service = getSyncService();
    service.on('sync:started', () => setIsSyncing(true));
    service.on('sync:completed', () => { setIsSyncing(false); refreshData(); });
    service.on('sync:failed', () => { setIsSyncing(false); refreshData(); });
    service.on('config:changed', refreshData);
    service.on('storage:connected', refreshData);
    service.on('storage:disconnected', refreshData);
    
    return () => {
      service.removeAllListeners();
    };
  }, [refreshData]);

  const handleSync = async () => {
    const service = getSyncService();
    await service.sync();
  };

  const handleToggleSync = () => {
    if (!config) return;
    const service = getSyncService();
    service.configure({ enabled: !config.enabled });
  };

  const handleToggleAutoSync = () => {
    if (!config) return;
    const service = getSyncService();
    service.configure({ autoSync: !config.autoSync });
  };

  const handleConnect = async (provider: SyncProvider) => {
    setIsConnecting(true);
    try {
      const service = getSyncService();
      await service.connect(provider);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const service = getSyncService();
    await service.disconnect();
  };

  const providers: { id: SyncProvider; name: string; icon: string; color: string }[] = [
    { id: 'local', name: 'Local', icon: '💻', color: '#6a6a82' },
    { id: 'lisa-cloud', name: 'Lisa Cloud', icon: '☁️', color: '#3b82f6' },
    { id: 'google-drive', name: 'Google Drive', icon: '📁', color: '#4285f4' },
    { id: 'dropbox', name: 'Dropbox', icon: '📦', color: '#0061fe' },
    { id: 'onedrive', name: 'OneDrive', icon: '☁️', color: '#0078d4' }
  ];

  const getStatusIcon = (status: SyncState['status']) => {
    switch (status) {
      case 'idle': return '✅';
      case 'syncing': return '🔄';
      case 'error': return '❌';
      case 'conflict': return '⚠️';
      case 'offline': return '📴';
      default: return '❓';
    }
  };

  const getStatusLabel = (status: SyncState['status']) => {
    switch (status) {
      case 'idle': return 'Synchronisé';
      case 'syncing': return 'Synchronisation...';
      case 'error': return 'Erreur';
      case 'conflict': return 'Conflit';
      case 'offline': return 'Hors ligne';
      default: return status;
    }
  };

  if (!state || !config) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  const currentProvider = providers.find(p => p.id === config.provider);
  const storageInfo = getSyncService().getStorageInfo();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>🔄 Synchronisation</h2>
        <div style={styles.headerActions}>
          <button
            onClick={handleSync}
            disabled={isSyncing || !config.enabled}
            style={{
              ...styles.syncButton,
              opacity: isSyncing || !config.enabled ? 0.5 : 1
            }}
          >
            {isSyncing ? '⏳ Sync...' : '🔄 Synchroniser'}
          </button>
        </div>
      </div>

      {/* Status */}
      <div style={styles.statusCard}>
        <div style={styles.statusMain}>
          <span style={styles.statusIcon}>{getStatusIcon(state.status)}</span>
          <div style={styles.statusInfo}>
            <span style={styles.statusLabel}>{getStatusLabel(state.status)}</span>
            {state.lastSync && (
              <span style={styles.statusTime}>
                Dernière sync: {new Date(state.lastSync).toLocaleTimeString('fr-FR')}
              </span>
            )}
          </div>
        </div>
        {state.pendingChanges > 0 && (
          <div style={styles.pendingBadge}>
            {state.pendingChanges} en attente
          </div>
        )}
      </div>

      {/* Config Toggles */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Configuration</h3>
        <div style={styles.togglesList}>
          <div style={styles.toggleRow}>
            <div style={styles.toggleInfo}>
              <span style={styles.toggleName}>Synchronisation activée</span>
              <span style={styles.toggleDesc}>Activer/désactiver la sync</span>
            </div>
            <button
              onClick={handleToggleSync}
              style={{
                ...styles.toggleButton,
                backgroundColor: config.enabled ? '#10b981' : '#2d2d44'
              }}
            >
              {config.enabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <div style={styles.toggleRow}>
            <div style={styles.toggleInfo}>
              <span style={styles.toggleName}>Sync automatique</span>
              <span style={styles.toggleDesc}>
                Toutes les {Math.round(config.syncInterval / 60000)} min
              </span>
            </div>
            <button
              onClick={handleToggleAutoSync}
              disabled={!config.enabled}
              style={{
                ...styles.toggleButton,
                backgroundColor: config.autoSync && config.enabled ? '#10b981' : '#2d2d44',
                opacity: config.enabled ? 1 : 0.5
              }}
            >
              {config.autoSync ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Provider Selection */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Fournisseur de stockage</h3>
        <div style={styles.providersGrid}>
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleConnect(provider.id)}
              disabled={isConnecting}
              style={{
                ...styles.providerCard,
                borderColor: config.provider === provider.id ? provider.color : 'transparent',
                opacity: isConnecting ? 0.6 : 1
              }}
            >
              <span style={styles.providerIcon}>{provider.icon}</span>
              <span style={styles.providerName}>{provider.name}</span>
              {config.provider === provider.id && storageInfo.connected && (
                <span style={styles.connectedBadge}>Connecté</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Storage Info */}
      {storageInfo.connected && currentProvider && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Stockage {currentProvider.name}</h3>
          <div style={styles.storageCard}>
            <div style={styles.storageBar}>
              <div 
                style={{
                  ...styles.storageUsed,
                  width: `${(storageInfo.usedSpace / storageInfo.totalSpace) * 100}%`
                }}
              />
            </div>
            <div style={styles.storageInfo}>
              <span>
                {formatBytes(storageInfo.usedSpace)} / {formatBytes(storageInfo.totalSpace)}
              </span>
              <button
                onClick={handleDisconnect}
                style={styles.disconnectButton}
              >
                Déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Items */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Éléments synchronisés</h3>
        <div style={styles.itemsList}>
          {config.syncItems.map((item) => (
            <div key={item} style={styles.syncItem}>
              <span style={styles.syncItemIcon}>
                {item === 'conversations' ? '💬' : 
                 item === 'settings' ? '⚙️' : 
                 item === 'templates' ? '📝' : 
                 item === 'shortcuts' ? '⌨️' : '📦'}
              </span>
              <span style={styles.syncItemName}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1a1a26',
    borderRadius: '12px',
    padding: '24px',
    color: '#fff'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6a6a82'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600
  },
  headerActions: {
    display: 'flex',
    gap: '8px'
  },
  syncButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500
  },
  statusCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#252525',
    borderRadius: '12px',
    marginBottom: '24px'
  },
  statusMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  statusIcon: {
    fontSize: '32px'
  },
  statusInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  statusLabel: {
    fontSize: '16px',
    fontWeight: 600
  },
  statusTime: {
    fontSize: '12px',
    color: '#6a6a82'
  },
  pendingBadge: {
    padding: '6px 12px',
    backgroundColor: '#f59e0b',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#000'
  },
  section: {
    marginTop: '24px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6a6a82',
    marginBottom: '12px',
    textTransform: 'uppercase'
  },
  togglesList: {
    backgroundColor: '#252525',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #2d2d44'
  },
  toggleInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  toggleName: {
    fontSize: '14px',
    fontWeight: 500
  },
  toggleDesc: {
    fontSize: '12px',
    color: '#6a6a82'
  },
  toggleButton: {
    padding: '6px 16px',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    minWidth: '50px'
  },
  providersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px'
  },
  providerCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '20px 16px',
    backgroundColor: '#252525',
    border: '2px solid transparent',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  providerIcon: {
    fontSize: '28px'
  },
  providerName: {
    fontSize: '13px',
    fontWeight: 500
  },
  connectedBadge: {
    fontSize: '10px',
    color: '#10b981',
    fontWeight: 600
  },
  storageCard: {
    backgroundColor: '#252525',
    borderRadius: '8px',
    padding: '16px'
  },
  storageBar: {
    height: '8px',
    backgroundColor: '#2d2d44',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px'
  },
  storageUsed: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '4px'
  },
  storageInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: '#6a6a82'
  },
  disconnectButton: {
    padding: '4px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #2d2d44',
    borderRadius: '4px',
    color: '#6a6a82',
    cursor: 'pointer',
    fontSize: '12px'
  },
  itemsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  syncItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#252525',
    borderRadius: '20px',
    fontSize: '13px'
  },
  syncItemIcon: {
    fontSize: '14px'
  },
  syncItemName: {
    textTransform: 'capitalize'
  }
};

export default SyncPanel;
