/**
 * Lisa Email Panel
 * Email integration and management UI
 */

import { useState, useEffect, useCallback } from 'react';
import { getEmailIntegration } from '../../gateway';
import type { EmailFilter } from '../../gateway/EmailIntegration';

export function EmailPanel() {
  const [isConnected, setIsConnected] = useState(false);
  const [filters, setFilters] = useState<EmailFilter[]>([]);
  const [stats, setStats] = useState({ emailCount: 0, unreadCount: 0, filterCount: 0 });

  const refreshData = useCallback(() => {
    const email = getEmailIntegration();
    setIsConnected(email.isActive());
    setFilters(email.getFilters());
    setStats(email.getStats());
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleConnect = async () => {
    const email = getEmailIntegration();
    await email.connect();
    refreshData();
  };

  const handleDisconnect = async () => {
    const email = getEmailIntegration();
    await email.disconnect();
    refreshData();
  };

  const handleToggleFilter = (filterId: string, enabled: boolean) => {
    const email = getEmailIntegration();
    email.updateFilter(filterId, { enabled: !enabled });
    refreshData();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📧 Email Integration</h2>
        <span style={{ ...styles.statusBadge, backgroundColor: isConnected ? '#10b981' : '#6a6a82' }}>
          {isConnected ? 'Connecté' : 'Déconnecté'}
        </span>
      </div>

      {/* Connect/Disconnect */}
      {!isConnected ? (
        <button onClick={handleConnect} style={styles.connectButton}>
          🔌 Connecter Gmail / IMAP
        </button>
      ) : (
        <button onClick={handleDisconnect} style={styles.disconnectButton}>
          Déconnecter
        </button>
      )}

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{stats.emailCount}</span>
          <span style={styles.statLabel}>Emails</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{stats.unreadCount}</span>
          <span style={styles.statLabel}>Non lus</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{stats.filterCount}</span>
          <span style={styles.statLabel}>Filtres</span>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Filtres automatiques</h3>
        <div style={styles.filtersList}>
          {filters.length === 0 ? (
            <div style={styles.emptyState}>
              <span>Aucun filtre configuré</span>
              <button style={styles.addButton}>+ Ajouter un filtre</button>
            </div>
          ) : (
            filters.map((filter) => (
              <div key={filter.id} style={styles.filterItem}>
                <div style={styles.filterInfo}>
                  <span style={styles.filterName}>{filter.name}</span>
                  <span style={styles.filterConditions}>
                    {filter.conditions.length} condition(s) → {filter.action.type}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleFilter(filter.id, filter.enabled)}
                  style={{ ...styles.toggleBtn, backgroundColor: filter.enabled ? '#10b981' : '#2d2d44' }}
                >
                  {filter.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Features */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Fonctionnalités</h3>
        <div style={styles.featuresGrid}>
          <div style={styles.featureItem}>📥 Fetch emails</div>
          <div style={styles.featureItem}>🔍 Recherche</div>
          <div style={styles.featureItem}>📤 Envoi</div>
          <div style={styles.featureItem}>↩️ Réponse</div>
          <div style={styles.featureItem}>📝 Résumé IA</div>
          <div style={styles.featureItem}>🏷️ Labels</div>
        </div>
      </div>

      {/* Providers */}
      <div style={styles.providers}>
        <span>Providers: Gmail • Outlook • IMAP/SMTP</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: '#1a1a26', borderRadius: '12px', padding: '24px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 600 },
  statusBadge: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px' },
  connectButton: { width: '100%', padding: '16px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '15px', cursor: 'pointer', marginBottom: '20px' },
  disconnectButton: { width: '100%', padding: '12px', backgroundColor: '#2d2d44', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer', marginBottom: '20px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' },
  statCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', backgroundColor: '#252525', borderRadius: '10px' },
  statValue: { fontSize: '24px', fontWeight: 700, color: '#3b82f6' },
  statLabel: { fontSize: '12px', color: '#6a6a82', marginTop: '4px' },
  section: { marginTop: '24px' },
  sectionTitle: { fontSize: '14px', fontWeight: 600, color: '#6a6a82', marginBottom: '12px', textTransform: 'uppercase' },
  filtersList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px', backgroundColor: '#252525', borderRadius: '8px', color: '#6a6a82' },
  addButton: { padding: '8px 16px', backgroundColor: '#2d2d44', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' },
  filterItem: { display: 'flex', alignItems: 'center', padding: '14px', backgroundColor: '#252525', borderRadius: '8px' },
  filterInfo: { flex: 1 },
  filterName: { display: 'block', fontSize: '14px', fontWeight: 500 },
  filterConditions: { fontSize: '12px', color: '#6a6a82' },
  toggleBtn: { padding: '6px 12px', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' },
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  featureItem: { padding: '12px', backgroundColor: '#252525', borderRadius: '8px', fontSize: '13px', textAlign: 'center' },
  providers: { marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #2d2d44', fontSize: '12px', color: '#3d3d5c', textAlign: 'center' }
};

export default EmailPanel;
