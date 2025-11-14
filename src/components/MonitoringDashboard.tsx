/**
 * Monitoring Dashboard Component
 * Displays real-time performance metrics, analytics, and system status
 */

import React, { useState, useEffect } from 'react';
import {
  analytics,
  profiler,
  memoryMonitor,
  fpsMonitor,
  syncManager,
  modelCache,
  getLogStats,
  LogLevel,
} from '../utils';
import { useInterval, useSyncStatus } from '../hooks/useUtilities';

interface DashboardProps {
  refreshInterval?: number;
  compact?: boolean;
}

export function MonitoringDashboard({
  refreshInterval = 2000,
  compact = false,
}: DashboardProps) {
  const [agentMetrics, setAgentMetrics] = useState(analytics.getAllMetrics());
  const [performanceMetrics, setPerformanceMetrics] = useState(profiler.getAllMetrics());
  const [logStats, setLogStats] = useState(getLogStats());
  const [memoryInfo, setMemoryInfo] = useState(memoryMonitor.getLatestSnapshot());
  const [fps, setFps] = useState(fpsMonitor.getFPS());
  const [cacheStats, setCacheStats] = useState<any>(null);
  const syncStatus = useSyncStatus();

  useInterval(() => {
    setAgentMetrics(analytics.getAllMetrics());
    setPerformanceMetrics(profiler.getAllMetrics());
    setLogStats(getLogStats());
    setMemoryInfo(memoryMonitor.getLatestSnapshot());
    setFps(fpsMonitor.getFPS());

    modelCache.getStats().then(setCacheStats);
  }, refreshInterval);

  useEffect(() => {
    fpsMonitor.start();
    return () => fpsMonitor.stop();
  }, []);

  if (compact) {
    return <CompactDashboard
      agentMetrics={agentMetrics}
      syncStatus={syncStatus}
      fps={fps}
      memoryInfo={memoryInfo}
    />;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🔍 Monitoring Dashboard</h2>

      {/* System Status */}
      <Section title="System Status">
        <MetricCard
          label="Connection"
          value={syncStatus.online ? '🟢 Online' : '🔴 Offline'}
          color={syncStatus.online ? '#4caf50' : '#f44336'}
        />
        <MetricCard
          label="Sync Queue"
          value={`${syncStatus.pending} pending`}
          color={syncStatus.pending > 0 ? '#ff9800' : '#4caf50'}
        />
        <MetricCard
          label="FPS"
          value={fps.toString()}
          color={fps >= 55 ? '#4caf50' : fps >= 30 ? '#ff9800' : '#f44336'}
        />
        {memoryInfo && (
          <MetricCard
            label="Memory"
            value={`${(memoryInfo.usage.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`}
            color="#2196f3"
          />
        )}
      </Section>

      {/* Agent Analytics */}
      <Section title="Agent Performance">
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Agent</th>
                <th style={styles.th}>Executions</th>
                <th style={styles.th}>Success Rate</th>
                <th style={styles.th}>Avg Time</th>
                <th style={styles.th}>P95</th>
              </tr>
            </thead>
            <tbody>
              {agentMetrics.slice(0, 10).map(metric => (
                <tr key={metric.agentName}>
                  <td style={styles.td}>{metric.agentName}</td>
                  <td style={styles.td}>{metric.totalExecutions}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        color:
                          metric.errorRate < 0.1 ? '#4caf50' : metric.errorRate < 0.3 ? '#ff9800' : '#f44336',
                      }}
                    >
                      {((1 - metric.errorRate) * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td style={styles.td}>{metric.averageExecutionTime.toFixed(2)}ms</td>
                  <td style={styles.td}>{metric.p95.toFixed(2)}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Performance Metrics */}
      <Section title="Performance Profiling">
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Operation</th>
                <th style={styles.th}>Count</th>
                <th style={styles.th}>Avg</th>
                <th style={styles.th}>Min</th>
                <th style={styles.th}>Max</th>
                <th style={styles.th}>P99</th>
              </tr>
            </thead>
            <tbody>
              {performanceMetrics.slice(0, 10).map(metric => (
                <tr key={metric.name}>
                  <td style={styles.td}>{metric.name}</td>
                  <td style={styles.td}>{metric.count}</td>
                  <td style={styles.td}>{metric.averageDuration.toFixed(2)}ms</td>
                  <td style={styles.td}>{metric.minDuration.toFixed(2)}ms</td>
                  <td style={styles.td}>{metric.maxDuration.toFixed(2)}ms</td>
                  <td style={styles.td}>{metric.p99.toFixed(2)}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Cache Statistics */}
      {cacheStats && (
        <Section title="Model Cache">
          <MetricCard
            label="Total Entries"
            value={cacheStats.totalEntries.toString()}
            color="#2196f3"
          />
          <MetricCard
            label="Cache Size"
            value={`${(cacheStats.totalSize / 1024 / 1024).toFixed(1)} MB`}
            color="#2196f3"
          />
          <MetricCard
            label="Utilization"
            value={`${(cacheStats.utilization * 100).toFixed(1)}%`}
            color={
              cacheStats.utilization < 0.7
                ? '#4caf50'
                : cacheStats.utilization < 0.9
                ? '#ff9800'
                : '#f44336'
            }
          />
        </Section>
      )}

      {/* Log Statistics */}
      <Section title="Logging Statistics">
        <MetricCard label="Total Logs" value={logStats.total.toString()} color="#2196f3" />
        {Object.entries(logStats.byLevel).map(([level, count]) => (
          <MetricCard
            key={level}
            label={level}
            value={count.toString()}
            color={
              level === 'ERROR' || level === 'FATAL'
                ? '#f44336'
                : level === 'WARN'
                ? '#ff9800'
                : '#4caf50'
            }
          />
        ))}
      </Section>
    </div>
  );
}

function CompactDashboard({ agentMetrics, syncStatus, fps, memoryInfo }: any) {
  const topAgent = agentMetrics[0];
  const summary = analytics.getSummary();

  return (
    <div style={{ ...styles.container, padding: '1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <MetricCard
          label="Status"
          value={syncStatus.online ? '🟢' : '🔴'}
          compact
        />
        <MetricCard label="FPS" value={fps.toString()} compact />
        {memoryInfo && (
          <MetricCard
            label="Memory"
            value={`${(memoryInfo.usage.usedJSHeapSize / 1024 / 1024).toFixed(0)}MB`}
            compact
          />
        )}
        <MetricCard
          label="Success"
          value={`${(summary.overallSuccessRate * 100).toFixed(0)}%`}
          compact
        />
        {topAgent && (
          <MetricCard label="Top Agent" value={topAgent.agentName} compact />
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <div style={styles.sectionContent}>{children}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color = '#2196f3',
  compact = false,
}: {
  label: string;
  value: string;
  color?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div style={{ ...styles.metricCard, ...styles.compactCard }}>
        <div style={{ fontSize: '0.75rem', color: '#666' }}>{label}</div>
        <div style={{ fontSize: '1rem', fontWeight: 'bold', color }}>{value}</div>
      </div>
    );
  }

  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={{ ...styles.metricValue, color }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2rem',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  title: {
    margin: '0 0 2rem 0',
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: '2rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.1rem',
    fontWeight: '600',
  },
  sectionContent: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  },
  metricCard: {
    padding: '1rem',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    minWidth: '150px',
  },
  compactCard: {
    padding: '0.5rem',
    minWidth: '80px',
  },
  metricLabel: {
    fontSize: '0.875rem',
    color: '#666',
    marginBottom: '0.5rem',
  },
  metricValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.875rem',
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.5rem',
    borderBottom: '2px solid #ddd',
    fontWeight: '600',
  },
  td: {
    padding: '0.5rem',
    borderBottom: '1px solid #eee',
  },
};

export default MonitoringDashboard;
