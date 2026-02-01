/**
 * Lisa Analytics Dashboard
 * Usage statistics and insights visualization
 */

import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsManager } from '../../gateway';
import type { UsageStats, DailyStats, InsightReport } from '../../gateway/AnalyticsManager';

export function AnalyticsDashboard() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [insights, setInsights] = useState<InsightReport[]>([]);
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);

  const refreshData = useCallback(() => {
    const manager = getAnalyticsManager();
    setStats(manager.getUsageStats());
    setDailyStats(manager.getDailyStats(timeRange));
    setInsights(manager.getInsights());
  }, [timeRange]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getMaxValue = (data: DailyStats[], key: keyof DailyStats) => {
    return Math.max(...data.map(d => Number(d[key]) || 0), 1);
  };

  const getSeverityColor = (severity: InsightReport['severity']) => {
    switch (severity) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#888';
    }
  };

  const getInsightIcon = (type: InsightReport['type']) => {
    switch (type) {
      case 'trend': return '📈';
      case 'anomaly': return '⚠️';
      case 'suggestion': return '💡';
      case 'achievement': return '🏆';
      default: return '📊';
    }
  };

  if (!stats) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>📊 Analytics</h2>
        <div style={styles.timeRangeSelector}>
          {([7, 14, 30] as const).map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              style={{
                ...styles.timeButton,
                ...(timeRange === days ? styles.timeButtonActive : {})
              }}
            >
              {days}j
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💬</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{formatNumber(stats.totalConversations)}</div>
            <div style={styles.statLabel}>Conversations</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📝</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{formatNumber(stats.totalMessages)}</div>
            <div style={styles.statLabel}>Messages</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🎯</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{formatNumber(stats.totalTokensUsed)}</div>
            <div style={styles.statLabel}>Tokens</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⚡</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.averageResponseTime}ms</div>
            <div style={styles.statLabel}>Temps moyen</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👥</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.activeUsers}</div>
            <div style={styles.statLabel}>Sessions actives</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⏱️</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{formatDuration(stats.uptime)}</div>
            <div style={styles.statLabel}>Uptime</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Activité ({timeRange} jours)</h3>
        <div style={styles.chart}>
          <div style={styles.chartBars}>
            {dailyStats.map((day, i) => {
              const maxMessages = getMaxValue(dailyStats, 'messages');
              const height = (day.messages / maxMessages) * 100;
              return (
                <div key={i} style={styles.chartBarContainer}>
                  <div 
                    style={{
                      ...styles.chartBar,
                      height: `${Math.max(height, 2)}%`
                    }}
                    title={`${day.messages} messages`}
                  />
                  <div style={styles.chartLabel}>
                    {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Insights</h3>
          <div style={styles.insightsList}>
            {insights.map((insight) => (
              <div 
                key={insight.id} 
                style={{
                  ...styles.insightCard,
                  borderLeftColor: getSeverityColor(insight.severity)
                }}
              >
                <div style={styles.insightIcon}>{getInsightIcon(insight.type)}</div>
                <div style={styles.insightContent}>
                  <div style={styles.insightTitle}>{insight.title}</div>
                  <div style={styles.insightDesc}>{insight.description}</div>
                </div>
                {insight.change !== 0 && (
                  <div style={{
                    ...styles.insightChange,
                    color: insight.change > 0 ? '#10b981' : '#ef4444'
                  }}>
                    {insight.change > 0 ? '+' : ''}{insight.change}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Agents & Skills */}
      <div style={styles.twoColumns}>
        <div style={styles.column}>
          <h3 style={styles.sectionTitle}>🤖 Top Agents</h3>
          <div style={styles.rankingList}>
            {stats.topAgents.length === 0 ? (
              <div style={styles.emptyState}>Aucune donnée</div>
            ) : (
              stats.topAgents.map((agent, i) => (
                <div key={agent.name} style={styles.rankingItem}>
                  <span style={styles.rankingRank}>#{i + 1}</span>
                  <span style={styles.rankingName}>{agent.name}</span>
                  <span style={styles.rankingCount}>{agent.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div style={styles.column}>
          <h3 style={styles.sectionTitle}>⚡ Top Skills</h3>
          <div style={styles.rankingList}>
            {stats.topSkills.length === 0 ? (
              <div style={styles.emptyState}>Aucune donnée</div>
            ) : (
              stats.topSkills.map((skill, i) => (
                <div key={skill.name} style={styles.rankingItem}>
                  <span style={styles.rankingRank}>#{i + 1}</span>
                  <span style={styles.rankingName}>{skill.name}</span>
                  <span style={styles.rankingCount}>{skill.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Error Rate */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Santé du système</h3>
        <div style={styles.healthCard}>
          <div style={styles.healthItem}>
            <span style={styles.healthLabel}>Taux d'erreur</span>
            <span style={{
              ...styles.healthValue,
              color: stats.errorRate < 1 ? '#10b981' : stats.errorRate < 5 ? '#f59e0b' : '#ef4444'
            }}>
              {stats.errorRate}%
            </span>
          </div>
          <div style={styles.healthBar}>
            <div 
              style={{
                ...styles.healthProgress,
                width: `${Math.min(stats.errorRate * 10, 100)}%`,
                backgroundColor: stats.errorRate < 1 ? '#10b981' : stats.errorRate < 5 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
        </div>
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
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#888'
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
  timeRangeSelector: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#252525',
    borderRadius: '8px',
    padding: '4px'
  },
  timeButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '13px'
  },
  timeButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#fff'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '24px'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#252525',
    borderRadius: '10px'
  },
  statIcon: {
    fontSize: '24px'
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff'
  },
  statLabel: {
    fontSize: '12px',
    color: '#888'
  },
  section: {
    marginTop: '24px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#888',
    marginBottom: '12px',
    textTransform: 'uppercase'
  },
  chart: {
    backgroundColor: '#252525',
    borderRadius: '12px',
    padding: '20px'
  },
  chartBars: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '120px',
    gap: '8px'
  },
  chartBarContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    height: '100%'
  },
  chartBar: {
    width: '100%',
    maxWidth: '40px',
    backgroundColor: '#3b82f6',
    borderRadius: '4px 4px 0 0',
    marginTop: 'auto',
    transition: 'height 0.3s'
  },
  chartLabel: {
    fontSize: '10px',
    color: '#666',
    marginTop: '8px',
    textTransform: 'capitalize'
  },
  insightsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  insightCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: '#252525',
    borderRadius: '8px',
    borderLeft: '4px solid'
  },
  insightIcon: {
    fontSize: '20px'
  },
  insightContent: {
    flex: 1
  },
  insightTitle: {
    fontSize: '14px',
    fontWeight: 500
  },
  insightDesc: {
    fontSize: '12px',
    color: '#888',
    marginTop: '2px'
  },
  insightChange: {
    fontSize: '14px',
    fontWeight: 700
  },
  twoColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginTop: '24px'
  },
  column: {},
  rankingList: {
    backgroundColor: '#252525',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  emptyState: {
    padding: '20px',
    textAlign: 'center',
    color: '#666'
  },
  rankingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #333'
  },
  rankingRank: {
    fontSize: '12px',
    color: '#666',
    width: '24px'
  },
  rankingName: {
    flex: 1,
    fontSize: '14px'
  },
  rankingCount: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#3b82f6'
  },
  healthCard: {
    backgroundColor: '#252525',
    borderRadius: '8px',
    padding: '16px'
  },
  healthItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  healthLabel: {
    fontSize: '14px',
    color: '#888'
  },
  healthValue: {
    fontSize: '14px',
    fontWeight: 600
  },
  healthBar: {
    height: '6px',
    backgroundColor: '#333',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  healthProgress: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s'
  }
};

export default AnalyticsDashboard;
