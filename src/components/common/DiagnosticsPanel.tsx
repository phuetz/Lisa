/**
 * Diagnostics Panel (D2)
 * System diagnostics: DB stats, provider connectivity, agent registry, senses status.
 */

import { useState, useEffect, useCallback } from 'react';
import { Activity, Database, Cpu, Wifi, X, RefreshCw } from 'lucide-react';
import { db } from '../../db/database';
import { useSettingsStore } from '../../store/settingsStore';
import { PROVIDERS } from '../../domain/modelCatalog';

interface DiagnosticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DBStats {
  conversations: number;
  messages: number;
  usageRecords: number;
  roles: number;
  snippets: number;
  models: number;
  folders: number;
  knowledgeBases: number;
  auditLog: number;
}

export const DiagnosticsPanel = ({ isOpen, onClose }: DiagnosticsPanelProps) => {
  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  const [providerStatus, setProviderStatus] = useState<Map<string, 'ok' | 'error' | 'unconfigured'>>(new Map());
  const [loading, setLoading] = useState(false);
  const settings = useSettingsStore();

  const runDiagnostics = useCallback(async () => {
    setLoading(true);

    // DB Stats
    try {
      const stats: DBStats = {
        conversations: await db.conversations.count(),
        messages: await db.messages.count(),
        usageRecords: await db.usageRecords.count(),
        roles: await db.roles.count(),
        snippets: await db.snippets.count(),
        models: await db.models.count(),
        folders: await db.folders.count(),
        knowledgeBases: await db.knowledgeBases.count(),
        auditLog: await db.auditLog.count(),
      };
      setDbStats(stats);
    } catch {
      setDbStats(null);
    }

    // Provider connectivity
    const status = new Map<string, 'ok' | 'error' | 'unconfigured'>();
    for (const key of Object.keys(PROVIDERS)) {
      if (!settings.isProviderConfigured(key as Parameters<typeof settings.isProviderConfigured>[0])) {
        status.set(key, 'unconfigured');
      } else {
        status.set(key, 'ok'); // We don't actually test connectivity to avoid rate limits
      }
    }
    setProviderStatus(status);

    setLoading(false);
  }, [settings]);

  useEffect(() => {
    if (isOpen) runDiagnostics();
  }, [isOpen, runDiagnostics]);

  if (!isOpen) return null;

  const sectionStyle: React.CSSProperties = {
    marginBottom: '20px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
    marginBottom: '8px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '6px 0', fontSize: '13px', color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border-primary)',
  };

  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998,
      }} />

      <div role="dialog" aria-label="Diagnostics" aria-modal="true" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '95vw', maxWidth: '500px', maxHeight: '80vh',
        backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-secondary)', zIndex: 9999,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: 'var(--shadow-modal)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border-primary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--color-accent)" />
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Diagnostics</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={runDiagnostics} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ overflow: 'auto', padding: '20px' }}>
          {/* DB Stats */}
          <div style={sectionStyle}>
            <div style={headerStyle}><Database size={16} /> Base de données (Dexie)</div>
            {dbStats ? (
              <>
                {Object.entries(dbStats).map(([key, value]) => (
                  <div key={key} style={rowStyle}>
                    <span>{key}</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{value}</span>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Chargement...</div>
            )}
          </div>

          {/* Providers */}
          <div style={sectionStyle}>
            <div style={headerStyle}><Wifi size={16} /> Fournisseurs IA</div>
            {Array.from(providerStatus.entries()).map(([key, stat]) => (
              <div key={key} style={rowStyle}>
                <span>{PROVIDERS[key]?.name || key}</span>
                <span style={{
                  fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                  backgroundColor: stat === 'ok' ? '#10b98120' : stat === 'error' ? '#ef444420' : '#94a3b820',
                  color: stat === 'ok' ? '#10b981' : stat === 'error' ? '#ef4444' : '#94a3b8',
                }}>
                  {stat === 'ok' ? 'Configuré' : stat === 'error' ? 'Erreur' : 'Non configuré'}
                </span>
              </div>
            ))}
          </div>

          {/* Environment */}
          <div style={sectionStyle}>
            <div style={headerStyle}><Cpu size={16} /> Environnement</div>
            <div style={rowStyle}><span>Platform</span><span style={{ fontFamily: 'monospace' }}>{navigator.platform}</span></div>
            <div style={rowStyle}><span>User Agent</span><span style={{ fontFamily: 'monospace', fontSize: '11px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{navigator.userAgent.slice(0, 60)}</span></div>
            <div style={rowStyle}><span>Langue</span><span style={{ fontFamily: 'monospace' }}>{navigator.language}</span></div>
            <div style={rowStyle}><span>Modèles chargés</span><span style={{ fontFamily: 'monospace' }}>{settings.models.length}</span></div>
            <div style={rowStyle}><span>IndexedDB</span><span style={{ fontFamily: 'monospace' }}>{typeof indexedDB !== 'undefined' ? 'Disponible' : 'Non disponible'}</span></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DiagnosticsPanel;
