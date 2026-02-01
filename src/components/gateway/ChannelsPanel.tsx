/**
 * Lisa Channels Panel
 * Multi-channel messaging management UI
 */

import { useState, useEffect, useCallback } from 'react';

interface ChannelConfig {
  id: string;
  type: 'telegram' | 'discord' | 'slack' | 'whatsapp' | 'signal' | 'webchat';
  name: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  token?: string;
  stats: {
    messageCount: number;
    userCount?: number;
  };
}

export function ChannelsPanel() {
  const [channels, setChannels] = useState<ChannelConfig[]>([
    { id: 'webchat', type: 'webchat', name: 'WebChat', status: 'connected', stats: { messageCount: 0 } }
  ]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChannelType, setNewChannelType] = useState<ChannelConfig['type']>('telegram');
  const [newChannelToken, setNewChannelToken] = useState('');

  const refreshData = useCallback(() => {
    // In real implementation, would get status from channel managers
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleConnect = async (channelId: string) => {
    setChannels(prev => prev.map(ch => 
      ch.id === channelId ? { ...ch, status: 'connecting' } : ch
    ));
    
    // Simulate connection
    setTimeout(() => {
      setChannels(prev => prev.map(ch => 
        ch.id === channelId ? { ...ch, status: 'connected' } : ch
      ));
    }, 1500);
  };

  const handleDisconnect = async (channelId: string) => {
    setChannels(prev => prev.map(ch => 
      ch.id === channelId ? { ...ch, status: 'disconnected' } : ch
    ));
  };

  const handleAddChannel = () => {
    if (!newChannelToken.trim()) return;

    const newChannel: ChannelConfig = {
      id: `${newChannelType}_${Date.now()}`,
      type: newChannelType,
      name: `${newChannelType.charAt(0).toUpperCase() + newChannelType.slice(1)} Bot`,
      status: 'disconnected',
      token: newChannelToken,
      stats: { messageCount: 0 }
    };

    setChannels(prev => [...prev, newChannel]);
    setNewChannelToken('');
    setShowAddModal(false);
  };

  const handleRemoveChannel = (channelId: string) => {
    setChannels(prev => prev.filter(ch => ch.id !== channelId));
    if (selectedChannel === channelId) {
      setSelectedChannel(null);
    }
  };

  const getChannelIcon = (type: ChannelConfig['type']) => {
    switch (type) {
      case 'telegram': return '✈️';
      case 'discord': return '🎮';
      case 'slack': return '💼';
      case 'whatsapp': return '📱';
      case 'signal': return '🔒';
      case 'webchat': return '💬';
      default: return '📡';
    }
  };

  const getStatusColor = (status: ChannelConfig['status']) => {
    switch (status) {
      case 'connected': return '#10b981';
      case 'connecting': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#666';
    }
  };

  const connectedCount = channels.filter(ch => ch.status === 'connected').length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📡 Channels</h2>
        <button onClick={() => setShowAddModal(true)} style={styles.addButton}>
          + Ajouter
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{channels.length}</span>
          <span style={styles.statLabel}>Total</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ ...styles.statValue, color: '#10b981' }}>{connectedCount}</span>
          <span style={styles.statLabel}>Connectés</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>
            {channels.reduce((sum, ch) => sum + ch.stats.messageCount, 0)}
          </span>
          <span style={styles.statLabel}>Messages</span>
        </div>
      </div>

      {/* Channel List */}
      <div style={styles.channelList}>
        {channels.map((channel) => (
          <div 
            key={channel.id} 
            style={{
              ...styles.channelCard,
              borderColor: selectedChannel === channel.id ? '#3b82f6' : 'transparent'
            }}
            onClick={() => setSelectedChannel(channel.id)}
          >
            <div style={styles.channelIcon}>{getChannelIcon(channel.type)}</div>
            <div style={styles.channelInfo}>
              <div style={styles.channelName}>{channel.name}</div>
              <div style={styles.channelType}>{channel.type}</div>
            </div>
            <div style={styles.channelStatus}>
              <span style={{ ...styles.statusDot, backgroundColor: getStatusColor(channel.status) }} />
              <span style={styles.statusText}>{channel.status}</span>
            </div>
            <div style={styles.channelActions}>
              {channel.status === 'connected' ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDisconnect(channel.id); }}
                  style={styles.disconnectBtn}
                >
                  Déconnecter
                </button>
              ) : channel.status === 'connecting' ? (
                <span style={styles.connectingText}>⏳</span>
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleConnect(channel.id); }}
                  style={styles.connectBtn}
                >
                  Connecter
                </button>
              )}
              {channel.type !== 'webchat' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRemoveChannel(channel.id); }}
                  style={styles.removeBtn}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Supported Channels Info */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Canaux supportés</h3>
        <div style={styles.supportedGrid}>
          <div style={styles.supportedItem}>✈️ Telegram (grammY)</div>
          <div style={styles.supportedItem}>🎮 Discord (discord.js)</div>
          <div style={styles.supportedItem}>💼 Slack (Bolt)</div>
          <div style={styles.supportedItem}>📱 WhatsApp (Baileys)</div>
          <div style={styles.supportedItem}>🔒 Signal (signal-cli)</div>
          <div style={styles.supportedItem}>💬 WebChat (React)</div>
        </div>
      </div>

      {/* Add Channel Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Ajouter un canal</h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Type de canal</label>
              <select 
                value={newChannelType} 
                onChange={(e) => setNewChannelType(e.target.value as ChannelConfig['type'])}
                style={styles.select}
              >
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
                <option value="slack">Slack</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="signal">Signal</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Bot Token</label>
              <input
                type="password"
                value={newChannelToken}
                onChange={(e) => setNewChannelToken(e.target.value)}
                placeholder={
                  newChannelType === 'telegram' ? '123456:ABC-DEF...' :
                  newChannelType === 'discord' ? 'MTIzNDU2Nzg5...' :
                  'xoxb-...'
                }
                style={styles.input}
              />
            </div>

            <div style={styles.tokenHelp}>
              {newChannelType === 'telegram' && '→ Obtenez le token via @BotFather'}
              {newChannelType === 'discord' && '→ Discord Developer Portal > Bot > Token'}
              {newChannelType === 'slack' && '→ Slack API > OAuth & Permissions > Bot Token'}
              {newChannelType === 'whatsapp' && '→ Scannez le QR code avec WhatsApp (Baileys)'}
              {newChannelType === 'signal' && '→ Numéro de téléphone enregistré sur Signal'}
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setShowAddModal(false)} style={styles.cancelBtn}>
                Annuler
              </button>
              <button onClick={handleAddChannel} style={styles.confirmBtn}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '24px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 600 },
  addButton: { padding: '8px 16px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' },
  statsRow: { display: 'flex', gap: '12px', marginBottom: '24px' },
  statCard: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', backgroundColor: '#252525', borderRadius: '10px' },
  statValue: { fontSize: '24px', fontWeight: 700, color: '#3b82f6' },
  statLabel: { fontSize: '12px', color: '#888', marginTop: '4px' },
  channelList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  channelCard: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', backgroundColor: '#252525', borderRadius: '10px', border: '2px solid transparent', cursor: 'pointer' },
  channelIcon: { fontSize: '28px' },
  channelInfo: { flex: 1 },
  channelName: { fontSize: '15px', fontWeight: 600 },
  channelType: { fontSize: '12px', color: '#888', textTransform: 'capitalize' },
  channelStatus: { display: 'flex', alignItems: 'center', gap: '6px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  statusText: { fontSize: '12px', color: '#888', textTransform: 'capitalize' },
  channelActions: { display: 'flex', gap: '8px' },
  connectBtn: { padding: '6px 12px', backgroundColor: '#10b981', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', cursor: 'pointer' },
  disconnectBtn: { padding: '6px 12px', backgroundColor: '#666', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', cursor: 'pointer' },
  connectingText: { padding: '6px 12px' },
  removeBtn: { padding: '6px 10px', backgroundColor: 'transparent', border: 'none', color: '#666', cursor: 'pointer' },
  section: { marginTop: '24px' },
  sectionTitle: { fontSize: '14px', fontWeight: 600, color: '#888', marginBottom: '12px', textTransform: 'uppercase' },
  supportedGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' },
  supportedItem: { padding: '10px 12px', backgroundColor: '#252525', borderRadius: '6px', fontSize: '13px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '24px', width: '400px', maxWidth: '90%' },
  modalTitle: { margin: '0 0 20px', fontSize: '18px', fontWeight: 600 },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' },
  select: { width: '100%', padding: '10px 12px', backgroundColor: '#252525', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px' },
  input: { width: '100%', padding: '10px 12px', backgroundColor: '#252525', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' },
  tokenHelp: { fontSize: '12px', color: '#666', marginBottom: '20px' },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '10px 20px', backgroundColor: '#333', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' },
  confirmBtn: { padding: '10px 20px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }
};

export default ChannelsPanel;
