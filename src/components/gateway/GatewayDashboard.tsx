/**
 * Lisa Gateway Dashboard
 * Central control panel for sessions, channels, and skills
 * Inspired by OpenClaw's Gateway UI
 */

import { useState } from 'react';
import { useGateway } from '../../gateway/useGateway';
import type { Session, Channel } from '../../gateway/types';

export function GatewayDashboard() {
  const {
    connected,
    sessions,
    channels,
    enabledSkills,
    stats,
    createSession,
    closeSession
  } = useGateway();

  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'channels'>('overview');

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#1a1a1a',
      minHeight: '100vh',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            🌐 Gateway Dashboard
            <span style={{
              fontSize: '12px',
              padding: '4px 12px',
              borderRadius: '12px',
              backgroundColor: connected ? '#10b98120' : '#ef444420',
              color: connected ? '#10b981' : '#ef4444'
            }}>
              {connected ? '● Connecté' : '○ Déconnecté'}
            </span>
          </h1>
          <p style={{ color: '#888', margin: '4px 0 0' }}>
            Plan de contrôle WebSocket pour sessions, channels et skills
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <StatCard
          icon="📡"
          label="Sessions"
          value={stats.sessions}
          color="#3b82f6"
        />
        <StatCard
          icon="🔌"
          label="Channels"
          value={stats.channels}
          color="#8b5cf6"
        />
        <StatCard
          icon="🔧"
          label="Skills actifs"
          value={`${stats.skills.enabled}/${stats.skills.total}`}
          color="#10b981"
        />
        <StatCard
          icon="👥"
          label="Clients"
          value={stats.clients}
          color="#f59e0b"
        />
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid #333',
        paddingBottom: '8px'
      }}>
        {(['overview', 'sessions', 'channels'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === tab ? '#3b82f6' : 'transparent',
              color: activeTab === tab ? 'white' : '#888',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              textTransform: 'capitalize'
            }}
          >
            {tab === 'overview' ? '📊 Aperçu' : tab === 'sessions' ? '📡 Sessions' : '🔌 Channels'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          sessions={sessions}
          channels={channels}
          enabledSkills={enabledSkills}
        />
      )}

      {activeTab === 'sessions' && (
        <SessionsTab
          sessions={sessions}
          onCreateSession={createSession}
          onCloseSession={closeSession}
        />
      )}

      {activeTab === 'channels' && (
        <ChannelsTab channels={channels} />
      )}
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: string;
  label: string;
  value: number | string;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div style={{
      backgroundColor: '#2a2a2a',
      borderRadius: '12px',
      padding: '20px',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 600 }}>{value}</div>
          <div style={{ color: '#888', fontSize: '14px' }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

// Overview Tab
interface OverviewTabProps {
  sessions: Session[];
  channels: Channel[];
  enabledSkills: Array<{ id: string; name: string }>;
}

function OverviewTab({ sessions, channels, enabledSkills }: OverviewTabProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
      {/* Recent Sessions */}
      <div style={{
        backgroundColor: '#2a2a2a',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📡 Sessions récentes
        </h3>
        {sessions.length === 0 ? (
          <p style={{ color: '#666', margin: 0 }}>Aucune session active</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessions.slice(0, 5).map(session => (
              <div key={session.id} style={{
                padding: '12px',
                backgroundColor: '#333',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{session.userId}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{session.channelType}</div>
                </div>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  backgroundColor: session.status === 'active' ? '#10b98120' : '#f59e0b20',
                  color: session.status === 'active' ? '#10b981' : '#f59e0b'
                }}>
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Channels */}
      <div style={{
        backgroundColor: '#2a2a2a',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔌 Channels connectés
        </h3>
        {channels.length === 0 ? (
          <p style={{ color: '#666', margin: 0 }}>Aucun channel connecté</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {channels.map(channel => (
              <div key={channel.id} style={{
                padding: '12px',
                backgroundColor: '#333',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{channel.name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{channel.type}</div>
                </div>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  backgroundColor: channel.status === 'connected' ? '#10b98120' : '#ef444420',
                  color: channel.status === 'connected' ? '#10b981' : '#ef4444'
                }}>
                  {channel.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enabled Skills */}
      <div style={{
        backgroundColor: '#2a2a2a',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔧 Skills actifs
        </h3>
        {enabledSkills.length === 0 ? (
          <p style={{ color: '#666', margin: 0 }}>Aucun skill activé</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {enabledSkills.map(skill => (
              <span key={skill.id} style={{
                padding: '6px 12px',
                backgroundColor: '#3b82f620',
                color: '#3b82f6',
                borderRadius: '16px',
                fontSize: '13px'
              }}>
                {skill.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Sessions Tab
interface SessionsTabProps {
  sessions: Session[];
  onCreateSession: (channelType: 'webchat' | 'telegram' | 'discord' | 'slack' | 'whatsapp' | 'api') => Promise<Session>;
  onCloseSession: (sessionId: string) => Promise<void>;
}

function SessionsTab({ sessions, onCreateSession, onCloseSession }: SessionsTabProps) {
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreateSession('webchat');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: creating ? 'not-allowed' : 'pointer',
            opacity: creating ? 0.7 : 1
          }}
        >
          {creating ? '⏳ Création...' : '➕ Nouvelle session'}
        </button>
      </div>

      {sessions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          color: '#666'
        }}>
          <p style={{ fontSize: '1.2rem', margin: 0 }}>Aucune session active</p>
          <p>Créez une nouvelle session pour commencer</p>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: 500 }}>ID</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: 500 }}>Utilisateur</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: 500 }}>Channel</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontWeight: 500 }}>Créé</th>
                <th style={{ padding: '16px', textAlign: 'right', color: '#888', fontWeight: 500 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session.id} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px' }}>
                    {session.id.slice(0, 12)}...
                  </td>
                  <td style={{ padding: '16px' }}>{session.userId}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: '#3b82f620',
                      color: '#3b82f6',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {session.channelType}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: session.status === 'active' ? '#10b98120' : '#f59e0b20',
                      color: session.status === 'active' ? '#10b981' : '#f59e0b'
                    }}>
                      {session.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: '#888', fontSize: '13px' }}>
                    {new Date(session.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => onCloseSession(session.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ef444420',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Fermer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Channels Tab
interface ChannelsTabProps {
  channels: Channel[];
}

function ChannelsTab({ channels }: ChannelsTabProps) {
  const availableChannels = [
    { type: 'telegram', name: 'Telegram', icon: '📱', description: 'Bot Telegram pour messages instantanés' },
    { type: 'discord', name: 'Discord', icon: '🎮', description: 'Bot Discord pour communautés gaming' },
    { type: 'slack', name: 'Slack', icon: '💼', description: 'Intégration Slack pour équipes' },
    { type: 'whatsapp', name: 'WhatsApp', icon: '💬', description: 'Messages WhatsApp Business' },
    { type: 'webchat', name: 'WebChat', icon: '🌐', description: 'Widget chat pour sites web' }
  ];

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', color: '#888' }}>Channels disponibles</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {availableChannels.map(ch => {
          const connected = channels.find(c => c.type === ch.type);
          return (
            <div key={ch.type} style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '12px',
              padding: '20px',
              border: connected ? '2px solid #10b981' : '2px solid transparent'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '32px' }}>{ch.icon}</span>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 600 }}>{ch.name}</h4>
                  <span style={{
                    fontSize: '12px',
                    color: connected ? '#10b981' : '#666'
                  }}>
                    {connected ? '● Connecté' : '○ Non configuré'}
                  </span>
                </div>
              </div>
              <p style={{ color: '#888', fontSize: '14px', margin: '0 0 16px' }}>
                {ch.description}
              </p>
              <button style={{
                width: '100%',
                padding: '10px',
                backgroundColor: connected ? '#10b98120' : '#3b82f620',
                color: connected ? '#10b981' : '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500
              }}>
                {connected ? '⚙️ Configurer' : '🔌 Connecter'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GatewayDashboard;
