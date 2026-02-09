/**
 * Lisa Cache Panel
 * Cache management and monitoring UI
 */

import { useState, useEffect, useCallback } from 'react';
import { getCacheManager } from '../../gateway';
import type { CacheStats, CacheConfig } from '../../gateway';

export function CachePanel() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [config, setConfig] = useState<CacheConfig | null>(null);
  const [keys, setKeys] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = useCallback(() => {
    const cache = getCacheManager();
    setStats(cache.getStats());
    setConfig(cache.getConfig());
    setKeys(cache.keys());
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleClear = () => {
    if (confirm('Vider tout le cache ?')) {
      const cache = getCacheManager();
      cache.clear();
      refreshData();
    }
  };

  const handleDelete = (key: string) => {
    const cache = getCacheManager();
    cache.delete(key);
    refreshData();
    if (selectedKey === key) setSelectedKey(null);
  };

  const handleCleanup = () => {
    const cache = getCacheManager();
    const removed = cache.cleanup();
    alert(`${removed} entrées expirées supprimées`);
    refreshData();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredKeys = keys.filter(key => 
    !searchQuery || key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!stats || !config) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>💾 Cache Manager</h2>
        <div style={styles.headerActions}>
          <button onClick={handleCleanup} style={styles.button}>
            🧹 Cleanup
          </button>
          <button onClick={handleClear} style={styles.dangerButton}>
            🗑️ Vider
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.entries}</div>
          <div style={styles.statLabel}>Entrées</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{formatBytes(stats.memoryUsage)}</div>
          <div style={styles.statLabel}>Mémoire</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{(stats.hitRate * 100).toFixed(1)}%</div>
          <div style={styles.statLabel}>Hit Rate</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.hits}</div>
          <div style={styles.statLabel}>Hits</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.misses}</div>
          <div style={styles.statLabel}>Misses</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.evictions}</div>
          <div style={styles.statLabel}>Évictions</div>
        </div>
      </div>

      {/* Config */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Configuration</h3>
        <div style={styles.configGrid}>
          <div style={styles.configItem}>
            <span style={styles.configLabel}>Max entries</span>
            <span style={styles.configValue}>{config.maxSize}</span>
          </div>
          <div style={styles.configItem}>
            <span style={styles.configLabel}>Max mémoire</span>
            <span style={styles.configValue}>{formatBytes(config.maxMemory)}</span>
          </div>
          <div style={styles.configItem}>
            <span style={styles.configLabel}>TTL par défaut</span>
            <span style={styles.configValue}>{config.defaultTTL / 1000}s</span>
          </div>
          <div style={styles.configItem}>
            <span style={styles.configLabel}>Politique</span>
            <span style={styles.configValue}>{config.evictionPolicy.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Keys List */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Clés ({filteredKeys.length})</h3>
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.keysList}>
          {filteredKeys.length === 0 ? (
            <div style={styles.emptyState}>Aucune entrée</div>
          ) : (
            filteredKeys.slice(0, 50).map((key) => (
              <div 
                key={key} 
                style={{
                  ...styles.keyRow,
                  ...(selectedKey === key ? styles.keyRowSelected : {})
                }}
                onClick={() => setSelectedKey(selectedKey === key ? null : key)}
              >
                <span style={styles.keyName}>{key}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(key); }}
                  style={styles.deleteButton}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
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
  button: {
    padding: '8px 16px',
    backgroundColor: '#2d2d44',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px'
  },
  dangerButton: {
    padding: '8px 16px',
    backgroundColor: '#3f1515',
    border: 'none',
    borderRadius: '6px',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '13px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '12px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: '#252525',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#3b82f6'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6a6a82',
    marginTop: '4px'
  },
  section: {
    marginTop: '24px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
    color: '#ccc'
  },
  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px'
  },
  configItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#252525',
    borderRadius: '6px'
  },
  configLabel: {
    color: '#6a6a82',
    fontSize: '13px'
  },
  configValue: {
    fontWeight: 600,
    fontSize: '13px'
  },
  searchInput: {
    padding: '8px 12px',
    backgroundColor: '#252525',
    border: '1px solid #2d2d44',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px',
    width: '200px'
  },
  keysList: {
    maxHeight: '300px',
    overflowY: 'auto',
    backgroundColor: '#252525',
    borderRadius: '8px'
  },
  emptyState: {
    padding: '32px',
    textAlign: 'center',
    color: '#6a6a82'
  },
  keyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid #2d2d44',
    cursor: 'pointer'
  },
  keyRowSelected: {
    backgroundColor: '#2d2d44'
  },
  keyName: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#ccc'
  },
  deleteButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6a6a82',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '0 4px'
  }
};

export default CachePanel;
