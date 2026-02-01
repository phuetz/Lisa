/**
 * Lisa Quick Actions Panel
 * Customizable quick actions UI
 */

import { useState, useEffect, useCallback } from 'react';
import { getQuickActionsManager } from '../../gateway';
import type { QuickAction, QuickActionCategory } from '../../gateway/QuickActions';

interface QuickActionsPanelProps {
  onExecute?: (action: QuickAction) => void;
  compact?: boolean;
}

export function QuickActionsPanel({ onExecute, compact = false }: QuickActionsPanelProps) {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [pinnedActions, setPinnedActions] = useState<QuickAction[]>([]);
  const [recentActions, setRecentActions] = useState<QuickAction[]>([]);
  const [activeCategory, setActiveCategory] = useState<QuickActionCategory | 'all' | 'pinned' | 'recent'>('pinned');
  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = useCallback(() => {
    const manager = getQuickActionsManager();
    setActions(manager.list({ enabledOnly: true }));
    setPinnedActions(manager.getPinned());
    setRecentActions(manager.getRecent());
  }, []);

  useEffect(() => {
    refreshData();
    
    const manager = getQuickActionsManager();
    manager.on('action:executed', refreshData);
    manager.on('action:updated', refreshData);
    
    return () => {
      manager.off('action:executed', refreshData);
      manager.off('action:updated', refreshData);
    };
  }, [refreshData]);

  const handleExecute = (action: QuickAction) => {
    const manager = getQuickActionsManager();
    manager.execute(action.id);
    onExecute?.(action);
  };

  const handlePin = (actionId: string, isPinned: boolean) => {
    const manager = getQuickActionsManager();
    if (isPinned) {
      manager.unpin(actionId);
    } else {
      manager.pin(actionId);
    }
    refreshData();
  };

  const categories: { key: QuickActionCategory | 'all' | 'pinned' | 'recent'; label: string; icon: string }[] = [
    { key: 'pinned', label: 'Épinglés', icon: '📌' },
    { key: 'recent', label: 'Récents', icon: '🕐' },
    { key: 'all', label: 'Tous', icon: '📋' },
    { key: 'chat', label: 'Chat', icon: '💬' },
    { key: 'tools', label: 'Outils', icon: '🔧' },
    { key: 'agents', label: 'Agents', icon: '🤖' },
    { key: 'navigation', label: 'Navigation', icon: '🧭' }
  ];

  const getFilteredActions = () => {
    let filtered: QuickAction[];
    
    switch (activeCategory) {
      case 'pinned':
        filtered = pinnedActions;
        break;
      case 'recent':
        filtered = recentActions;
        break;
      case 'all':
        filtered = actions;
        break;
      default:
        filtered = actions.filter(a => a.category === activeCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const filteredActions = getFilteredActions();

  if (compact) {
    return (
      <div style={styles.compactContainer}>
        <div style={styles.compactGrid}>
          {pinnedActions.slice(0, 6).map((action) => (
            <button
              key={action.id}
              onClick={() => handleExecute(action)}
              style={styles.compactAction}
              title={action.description}
            >
              <span style={styles.compactIcon}>{action.icon}</span>
              <span style={styles.compactName}>{action.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>⚡ Actions Rapides</h2>
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Categories */}
      <div style={styles.categories}>
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            style={{
              ...styles.categoryButton,
              ...(activeCategory === cat.key ? styles.categoryButtonActive : {})
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Actions Grid */}
      <div style={styles.actionsGrid}>
        {filteredActions.length === 0 ? (
          <div style={styles.emptyState}>
            {searchQuery ? 'Aucun résultat' : 'Aucune action dans cette catégorie'}
          </div>
        ) : (
          filteredActions.map((action) => (
            <div key={action.id} style={styles.actionCard}>
              <button
                onClick={() => handleExecute(action)}
                style={styles.actionButton}
              >
                <span style={styles.actionIcon}>{action.icon}</span>
                <div style={styles.actionContent}>
                  <span style={styles.actionName}>{action.name}</span>
                  {action.description && (
                    <span style={styles.actionDesc}>{action.description}</span>
                  )}
                </div>
                {action.shortcut && (
                  <kbd style={styles.shortcut}>{action.shortcut}</kbd>
                )}
              </button>
              <button
                onClick={() => handlePin(action.id, action.isPinned)}
                style={{
                  ...styles.pinButton,
                  color: action.isPinned ? '#f59e0b' : '#666'
                }}
                title={action.isPinned ? 'Désépingler' : 'Épingler'}
              >
                📌
              </button>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <span>{pinnedActions.length} épinglés</span>
        <span>•</span>
        <span>{actions.length} actions</span>
      </div>
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
  compactContainer: {
    padding: '12px'
  },
  compactGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px'
  },
  compactAction: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 8px',
    backgroundColor: '#252525',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px'
  },
  compactIcon: {
    fontSize: '20px'
  },
  compactName: {
    fontSize: '11px',
    color: '#888',
    textAlign: 'center'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '16px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600
  },
  searchInput: {
    padding: '8px 14px',
    backgroundColor: '#252525',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    width: '200px'
  },
  categories: {
    display: 'flex',
    gap: '6px',
    marginBottom: '20px',
    overflowX: 'auto',
    paddingBottom: '8px'
  },
  categoryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#252525',
    border: 'none',
    borderRadius: '6px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '12px',
    whiteSpace: 'nowrap'
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#fff'
  },
  actionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '400px',
    overflowY: 'auto'
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#666'
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  actionButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    textAlign: 'left'
  },
  actionIcon: {
    fontSize: '20px'
  },
  actionContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  actionName: {
    fontSize: '14px',
    fontWeight: 500
  },
  actionDesc: {
    fontSize: '12px',
    color: '#888'
  },
  shortcut: {
    padding: '3px 8px',
    backgroundColor: '#333',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#888'
  },
  pinButton: {
    padding: '14px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px'
  },
  stats: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #333',
    fontSize: '12px',
    color: '#666',
    justifyContent: 'center'
  }
};

export default QuickActionsPanel;
