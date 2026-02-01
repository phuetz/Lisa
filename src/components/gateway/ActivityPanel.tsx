/**
 * Lisa Activity Panel
 * Real-time activity log and audit trail UI
 */

import { useState, useEffect, useCallback } from 'react';
import { getActivityLogger } from '../../gateway';
import type { ActivityLog, ActivityFilter, ActivityType, ActivityCategory } from '../../gateway';

interface ActivityPanelProps {
  maxItems?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function ActivityPanel({ 
  maxItems = 50, 
  autoRefresh = true, 
  refreshInterval = 3000 
}: ActivityPanelProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState<ActivityFilter>({ limit: maxItems });
  const [isLoading, setIsLoading] = useState(true);

  const loadActivities = useCallback(() => {
    const logger = getActivityLogger();
    const logs = logger.query(filter);
    setActivities(logs);
    setIsLoading(false);
  }, [filter]);

  useEffect(() => {
    loadActivities();
    
    if (autoRefresh) {
      const interval = setInterval(loadActivities, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadActivities, autoRefresh, refreshInterval]);

  const handleTypeFilter = (type: ActivityType | 'all') => {
    setFilter(prev => ({
      ...prev,
      types: type === 'all' ? undefined : [type]
    }));
  };

  const handleCategoryFilter = (category: ActivityCategory | 'all') => {
    setFilter(prev => ({
      ...prev,
      categories: category === 'all' ? undefined : [category]
    }));
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const typeIcons: Record<ActivityType, string> = {
    user_action: '👤',
    system_event: '⚙️',
    api_call: '🌐',
    auth: '🔐',
    data_access: '📂',
    config_change: '🔧',
    error: '❌',
    security: '🛡️'
  };

  const resultColors = {
    success: '#10b981',
    failure: '#ef4444',
    pending: '#f59e0b'
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>📋 Activity Log</h2>
        <button 
          onClick={loadActivities} 
          style={styles.refreshButton}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select 
          onChange={(e) => handleTypeFilter(e.target.value as ActivityType | 'all')}
          style={styles.select}
        >
          <option value="all">Tous les types</option>
          <option value="user_action">Actions utilisateur</option>
          <option value="system_event">Événements système</option>
          <option value="api_call">Appels API</option>
          <option value="auth">Authentification</option>
          <option value="data_access">Accès données</option>
          <option value="config_change">Config</option>
          <option value="error">Erreurs</option>
          <option value="security">Sécurité</option>
        </select>

        <select 
          onChange={(e) => handleCategoryFilter(e.target.value as ActivityCategory | 'all')}
          style={styles.select}
        >
          <option value="all">Toutes les catégories</option>
          <option value="chat">Chat</option>
          <option value="session">Session</option>
          <option value="skill">Skill</option>
          <option value="agent">Agent</option>
          <option value="automation">Automation</option>
          <option value="channel">Channel</option>
          <option value="settings">Settings</option>
          <option value="system">Système</option>
        </select>

        <select 
          onChange={(e) => setFilter(prev => ({ ...prev, result: e.target.value === 'all' ? undefined : e.target.value as 'success' | 'failure' | 'pending' }))}
          style={styles.select}
        >
          <option value="all">Tous les résultats</option>
          <option value="success">Succès</option>
          <option value="failure">Échec</option>
          <option value="pending">En cours</option>
        </select>
      </div>

      {/* Activity List */}
      <div style={styles.list}>
        {isLoading ? (
          <div style={styles.loading}>Chargement...</div>
        ) : activities.length === 0 ? (
          <div style={styles.empty}>Aucune activité</div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} style={styles.activityRow}>
              <div style={styles.activityLeft}>
                <span style={styles.typeIcon}>{typeIcons[activity.type]}</span>
                <div style={styles.activityContent}>
                  <div style={styles.activityAction}>{activity.action}</div>
                  <div style={styles.activityMeta}>
                    <span style={styles.activityCategory}>{activity.category}</span>
                    <span style={styles.activityActor}>
                      {activity.actor.type}: {activity.actor.id}
                    </span>
                  </div>
                </div>
              </div>
              <div style={styles.activityRight}>
                <span 
                  style={{
                    ...styles.resultBadge,
                    backgroundColor: resultColors[activity.result]
                  }}
                >
                  {activity.result}
                </span>
                <span style={styles.activityTime}>
                  {formatTime(activity.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <span>{activities.length} activités affichées</span>
        <span>•</span>
        <span>Erreurs: {activities.filter(a => a.result === 'failure').length}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '20px',
    color: '#fff'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600
  },
  refreshButton: {
    backgroundColor: '#333',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px'
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  select: {
    backgroundColor: '#252525',
    border: '1px solid #333',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    minWidth: '150px'
  },
  list: {
    maxHeight: '400px',
    overflowY: 'auto',
    backgroundColor: '#252525',
    borderRadius: '8px'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#888'
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: '#666'
  },
  activityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #333',
    gap: '16px'
  },
  activityLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0
  },
  typeIcon: {
    fontSize: '20px',
    flexShrink: 0
  },
  activityContent: {
    minWidth: 0,
    flex: 1
  },
  activityAction: {
    fontWeight: 500,
    fontSize: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  activityMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: '#888',
    marginTop: '2px'
  },
  activityCategory: {
    backgroundColor: '#333',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  activityActor: {
    color: '#666'
  },
  activityRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0
  },
  resultBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#fff',
    textTransform: 'uppercase'
  },
  activityTime: {
    color: '#666',
    fontSize: '12px',
    fontFamily: 'monospace'
  },
  stats: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
    fontSize: '12px',
    color: '#666'
  }
};

export default ActivityPanel;
