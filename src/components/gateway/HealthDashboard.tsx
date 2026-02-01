/**
 * Lisa Health Dashboard
 * Real-time system health monitoring UI
 */

import { useState, useEffect } from 'react';
import { getHealthMonitor } from '../../gateway';
import type { HealthStatus, HealthCheck } from '../../gateway';

interface HealthDashboardProps {
  refreshInterval?: number;
}

export function HealthDashboard({ refreshInterval = 5000 }: HealthDashboardProps) {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const monitor = getHealthMonitor();
    
    const updateStatus = () => {
      setStatus(monitor.getStatus());
      setIsLoading(false);
    };

    updateStatus();
    const interval = setInterval(updateStatus, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (isLoading || !status) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Chargement...</div>
      </div>
    );
  }

  const statusColors = {
    healthy: '#10b981',
    degraded: '#f59e0b',
    unhealthy: '#ef4444'
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}j ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.title}>🏥 Health Monitor</h2>
          <div 
            style={{
              ...styles.statusBadge,
              backgroundColor: statusColors[status.status]
            }}
          >
            {status.status === 'healthy' ? '✓ Healthy' : 
             status.status === 'degraded' ? '⚠ Degraded' : '✕ Unhealthy'}
          </div>
        </div>
        <div style={styles.uptime}>
          Uptime: {formatUptime(status.uptime)}
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={styles.metricsGrid}>
        <MetricCard
          icon="💾"
          title="Mémoire"
          value={`${status.metrics.memory.percentage.toFixed(1)}%`}
          subtitle={`${formatBytes(status.metrics.memory.used)} / ${formatBytes(status.metrics.memory.total)}`}
          status={status.metrics.memory.percentage > 90 ? 'error' : status.metrics.memory.percentage > 75 ? 'warning' : 'ok'}
        />
        <MetricCard
          icon="⚡"
          title="Latence"
          value={`${status.metrics.performance.averageLatency.toFixed(0)}ms`}
          subtitle={`P95: ${status.metrics.performance.p95Latency.toFixed(0)}ms`}
          status={status.metrics.performance.averageLatency > 5000 ? 'error' : status.metrics.performance.averageLatency > 2000 ? 'warning' : 'ok'}
        />
        <MetricCard
          icon="📊"
          title="Requêtes/s"
          value={status.metrics.performance.requestsPerSecond.toFixed(1)}
          subtitle="Requests per second"
          status="ok"
        />
        <MetricCard
          icon="🔌"
          title="WebSockets"
          value={status.metrics.connections.websockets.toString()}
          subtitle="Connexions actives"
          status="ok"
        />
        <MetricCard
          icon="❌"
          title="Erreurs"
          value={status.metrics.errors.total.toString()}
          subtitle={`Taux: ${(status.metrics.errors.rate * 100).toFixed(2)}%`}
          status={status.metrics.errors.rate > 0.1 ? 'error' : status.metrics.errors.rate > 0.05 ? 'warning' : 'ok'}
        />
        <MetricCard
          icon="📡"
          title="Channels"
          value={status.metrics.connections.activeChannels.toString()}
          subtitle="Canaux actifs"
          status="ok"
        />
      </div>

      {/* Health Checks */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Health Checks</h3>
        <div style={styles.checksList}>
          {status.checks.map((check) => (
            <HealthCheckRow key={check.name} check={check} />
          ))}
          {status.checks.length === 0 && (
            <div style={styles.emptyState}>Aucun check configuré</div>
          )}
        </div>
      </div>

      {/* Recent Errors */}
      {status.metrics.errors.recentErrors.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Erreurs Récentes</h3>
          <div style={styles.errorsList}>
            {status.metrics.errors.recentErrors.slice(0, 5).map((error, index) => (
              <div key={index} style={styles.errorRow}>
                <span style={styles.errorType}>{error.type}</span>
                <span style={styles.errorMessage}>{error.message}</span>
                <span style={styles.errorCount}>×{error.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ 
  icon, 
  title, 
  value, 
  subtitle, 
  status 
}: { 
  icon: string; 
  title: string; 
  value: string; 
  subtitle: string; 
  status: 'ok' | 'warning' | 'error';
}) {
  const statusColors = {
    ok: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  };

  return (
    <div style={{
      ...styles.metricCard,
      borderColor: statusColors[status]
    }}>
      <div style={styles.metricIcon}>{icon}</div>
      <div style={styles.metricContent}>
        <div style={styles.metricTitle}>{title}</div>
        <div style={{ ...styles.metricValue, color: statusColors[status] }}>{value}</div>
        <div style={styles.metricSubtitle}>{subtitle}</div>
      </div>
    </div>
  );
}

function HealthCheckRow({ check }: { check: HealthCheck }) {
  const statusIcons = {
    pass: '✅',
    warn: '⚠️',
    fail: '❌'
  };

  const statusColors = {
    pass: '#10b981',
    warn: '#f59e0b',
    fail: '#ef4444'
  };

  return (
    <div style={styles.checkRow}>
      <span style={styles.checkIcon}>{statusIcons[check.status]}</span>
      <span style={styles.checkName}>{check.name}</span>
      <span style={{ ...styles.checkStatus, color: statusColors[check.status] }}>
        {check.status.toUpperCase()}
      </span>
      {check.message && (
        <span style={styles.checkMessage}>{check.message}</span>
      )}
      {check.duration !== undefined && (
        <span style={styles.checkDuration}>{check.duration}ms</span>
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
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#888'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff'
  },
  uptime: {
    color: '#888',
    fontSize: '14px'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  metricCard: {
    backgroundColor: '#252525',
    borderRadius: '10px',
    padding: '16px',
    borderLeft: '3px solid',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  metricIcon: {
    fontSize: '24px'
  },
  metricContent: {
    flex: 1
  },
  metricTitle: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '4px'
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: 1.2
  },
  metricSubtitle: {
    fontSize: '11px',
    color: '#666',
    marginTop: '4px'
  },
  section: {
    marginTop: '24px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#ccc'
  },
  checksList: {
    backgroundColor: '#252525',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #333'
  },
  checkIcon: {
    fontSize: '16px'
  },
  checkName: {
    fontWeight: 500,
    flex: 1
  },
  checkStatus: {
    fontSize: '12px',
    fontWeight: 600
  },
  checkMessage: {
    color: '#888',
    fontSize: '13px',
    flex: 2
  },
  checkDuration: {
    color: '#666',
    fontSize: '12px'
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center',
    color: '#666'
  },
  errorsList: {
    backgroundColor: '#252525',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  errorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    borderBottom: '1px solid #333'
  },
  errorType: {
    backgroundColor: '#ef4444',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500
  },
  errorMessage: {
    flex: 1,
    fontSize: '13px',
    color: '#ccc'
  },
  errorCount: {
    color: '#888',
    fontSize: '12px'
  }
};

export default HealthDashboard;
