/**
 * Lisa Browser Panel
 * Browser automation control UI
 */

import { useState, useEffect, useCallback } from 'react';
import { getBrowserController } from '../../gateway';
import type { BrowserPage, BrowserResult } from '../../gateway/BrowserController';

export function BrowserPanel() {
  const [pages, setPages] = useState<BrowserPage[]>([]);
  const [activePage, setActivePage] = useState<BrowserPage | null>(null);
  const [url, setUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [history, setHistory] = useState<BrowserResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = useCallback(() => {
    const controller = getBrowserController();
    setPages(controller.getPages());
    setActivePage(controller.getActivePage());
    setIsConnected(controller.isActive());
    setHistory(controller.getHistory(10));
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleConnect = async () => {
    const controller = getBrowserController();
    await controller.connect();
    refreshData();
  };

  const handleNewPage = async () => {
    const controller = getBrowserController();
    await controller.newPage();
    refreshData();
  };

  const handleNavigate = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    const controller = getBrowserController();
    await controller.navigate(url);
    setIsLoading(false);
    refreshData();
  };

  const handleScreenshot = async () => {
    setIsLoading(true);
    const controller = getBrowserController();
    const result = await controller.screenshot();
    setIsLoading(false);
    if (result.screenshot) {
      // Open in new tab or show preview
      window.open(result.screenshot, '_blank');
    }
    refreshData();
  };

  const handleClosePage = async (pageId: string) => {
    const controller = getBrowserController();
    await controller.closePage(pageId);
    refreshData();
  };

  const stats = getBrowserController().getStats();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>🌐 Browser Control</h2>
        <div style={styles.status}>
          <span style={{
            ...styles.statusDot,
            backgroundColor: isConnected ? '#10b981' : '#666'
          }} />
          <span>{isConnected ? 'Connecté' : 'Déconnecté'}</span>
        </div>
      </div>

      {/* Connect Button */}
      {!isConnected && (
        <button onClick={handleConnect} style={styles.connectButton}>
          🔌 Connecter le navigateur
        </button>
      )}

      {isConnected && (
        <>
          {/* URL Bar */}
          <div style={styles.urlBar}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
              placeholder="https://example.com"
              style={styles.urlInput}
            />
            <button 
              onClick={handleNavigate} 
              style={styles.goButton}
              disabled={isLoading}
            >
              {isLoading ? '⏳' : '→'}
            </button>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button onClick={handleNewPage} style={styles.actionButton}>
              ➕ Nouvelle page
            </button>
            <button onClick={handleScreenshot} style={styles.actionButton}>
              📸 Screenshot
            </button>
            <button 
              onClick={async () => {
                const controller = getBrowserController();
                await controller.pdf();
                refreshData();
              }} 
              style={styles.actionButton}
            >
              📄 PDF
            </button>
          </div>

          {/* Pages */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Pages ouvertes</h3>
            <div style={styles.pagesList}>
              {pages.length === 0 ? (
                <div style={styles.emptyState}>Aucune page ouverte</div>
              ) : (
                pages.map((page) => (
                  <div 
                    key={page.id} 
                    style={{
                      ...styles.pageItem,
                      borderColor: page.isActive ? '#3b82f6' : 'transparent'
                    }}
                  >
                    <div style={styles.pageInfo}>
                      <div style={styles.pageTitle}>{page.title}</div>
                      <div style={styles.pageUrl}>{page.url}</div>
                    </div>
                    <button 
                      onClick={() => handleClosePage(page.id)}
                      style={styles.closeButton}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* History */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Historique des actions</h3>
            <div style={styles.historyList}>
              {history.length === 0 ? (
                <div style={styles.emptyState}>Aucune action</div>
              ) : (
                history.slice().reverse().map((result, i) => (
                  <div key={i} style={styles.historyItem}>
                    <span style={{
                      ...styles.historyStatus,
                      color: result.success ? '#10b981' : '#ef4444'
                    }}>
                      {result.success ? '✓' : '✕'}
                    </span>
                    <span style={styles.historyAction}>{result.action}</span>
                    <span style={styles.historyDuration}>{result.duration}ms</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={styles.stats}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats.pageCount}</span>
              <span style={styles.statLabel}>Pages</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats.actionCount}</span>
              <span style={styles.statLabel}>Actions</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats.successRate}%</span>
              <span style={styles.statLabel}>Succès</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '24px',
    color: '#fff'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#888'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  connectButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '15px',
    cursor: 'pointer'
  },
  urlBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px'
  },
  urlInput: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: '#252525',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px'
  },
  goButton: {
    padding: '12px 20px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer'
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px'
  },
  actionButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#252525',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer'
  },
  section: {
    marginTop: '20px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#888',
    marginBottom: '12px',
    textTransform: 'uppercase'
  },
  pagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  emptyState: {
    padding: '20px',
    textAlign: 'center',
    color: '#666'
  },
  pageItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#252525',
    borderRadius: '8px',
    border: '2px solid transparent'
  },
  pageInfo: {
    flex: 1
  },
  pageTitle: {
    fontSize: '14px',
    fontWeight: 500
  },
  pageUrl: {
    fontSize: '12px',
    color: '#888',
    marginTop: '2px'
  },
  closeButton: {
    padding: '6px 10px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    fontSize: '14px'
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxHeight: '150px',
    overflowY: 'auto'
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    backgroundColor: '#252525',
    borderRadius: '6px',
    fontSize: '13px'
  },
  historyStatus: {
    fontWeight: 600
  },
  historyAction: {
    flex: 1
  },
  historyDuration: {
    color: '#666',
    fontSize: '12px'
  },
  stats: {
    display: 'flex',
    gap: '16px',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #333'
  },
  statItem: {
    flex: 1,
    textAlign: 'center'
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 700,
    color: '#3b82f6'
  },
  statLabel: {
    fontSize: '12px',
    color: '#888'
  }
};

export default BrowserPanel;
