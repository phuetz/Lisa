import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Zap, Brain, Eye, Mic, CheckCircle,
  TrendingUp, TrendingDown, Clock, ArrowRight, RefreshCw, Headphones
} from 'lucide-react';
import { agentStatsService, type DashboardStats, type AgentActivity } from '../services/AgentStatsService';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

// Stat Card Component - AudioReader Studio style
const StatCard = ({
  label,
  value,
  change,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  color: 'accent' | 'cyan' | 'green' | 'red';
}) => {
  const colorMap = {
    accent: { bg: 'var(--color-brand-subtle)', icon: 'var(--color-accent)' },
    cyan: { bg: 'var(--color-cyan-subtle)', icon: 'var(--color-cyan)' },
    green: { bg: 'var(--color-green-subtle)', icon: 'var(--color-green)' },
    red: { bg: 'var(--color-error-subtle)', icon: 'var(--color-error)' },
  };
  const c = colorMap[color];

  return (
    <div style={{
      padding: '20px',
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--border-primary)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{label}</p>
          <p style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</p>
        </div>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: c.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={22} style={{ color: c.icon }} />
        </div>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '12px',
        fontSize: '13px',
      }}>
        {change >= 0 ? (
          <TrendingUp size={14} style={{ color: 'var(--color-green)' }} />
        ) : (
          <TrendingDown size={14} style={{ color: 'var(--color-error)' }} />
        )}
        <span style={{ color: change >= 0 ? 'var(--color-green)' : 'var(--color-error)', fontFamily: 'var(--font-mono)' }}>
          {change >= 0 ? '+' : ''}{change}%
        </span>
        <span style={{ color: 'var(--text-muted)' }}>vs mois dernier</span>
      </div>
    </div>
  );
};

// Activity Item Component
const ActivityItem = ({
  agent, action, time, status,
}: {
  agent: string;
  action: string;
  time: string;
  status: 'success' | 'pending' | 'error';
}) => {
  const statusBadge = {
    success: 'green' as const,
    pending: 'accent' as const,
    error: 'red' as const,
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      backgroundColor: 'var(--bg-panel)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: '8px',
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{agent}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{action}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
          <Clock size={14} />
          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{time}</span>
        </div>
        <Badge color={statusBadge[status]}>
          {status === 'success' ? 'OK' : status === 'pending' ? 'En cours' : 'Erreur'}
        </Badge>
      </div>
    </div>
  );
};

// Quick Action Button Component
const QuickActionButton = ({
  icon: Icon, label, description, color, onClick,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  color: 'accent' | 'cyan' | 'green';
  onClick: () => void;
}) => {
  const colorMap = {
    accent: 'var(--color-accent)',
    cyan: 'var(--color-cyan)',
    green: 'var(--color-green)',
  };
  const iconColor = colorMap[color];

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '16px',
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
        marginBottom: '8px',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = iconColor;
        e.currentTarget.style.backgroundColor = 'var(--bg-panel)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-primary)';
        e.currentTarget.style.backgroundColor = 'var(--bg-panel)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: `color-mix(in srgb, ${iconColor} 10%, transparent)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={20} style={{ color: iconColor }} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>{label}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{description}</p>
        </div>
      </div>
      <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
    </button>
  );
};

const TYPE_LABELS: Record<string, string> = {
  perception: 'Perception',
  cognitive: 'Cognitif',
  integration: 'Intégration',
  workflow: 'Workflow',
  tools: 'Outils',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    const loadStats = () => {
      const stats = agentStatsService.getStats();
      setDashboardStats(stats);
      setIsLoading(false);
      setLastRefresh(new Date());
    };

    loadStats();
    const unsubscribe = agentStatsService.subscribe(setDashboardStats);
    const interval = setInterval(loadStats, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    const stats = agentStatsService.getStats();
    setDashboardStats(stats);
    setIsLoading(false);
    setLastRefresh(new Date());
  }, []);

  const formatActivities = (activities: AgentActivity[]) => {
    return activities.map(activity => ({
      id: activity.id,
      agent: activity.agentName,
      action: activity.action,
      time: agentStatsService.formatRelativeTime(activity.timestamp),
      status: activity.status,
    }));
  };

  const stats = dashboardStats || {
    totalAgents: 0,
    activeAgents: 0,
    tasksCompleted: 0,
    successRate: 100,
    recentActivities: [],
    agentsStatus: [],
  };

  const recentActivities = dashboardStats
    ? formatActivities(dashboardStats.recentActivities)
    : [];

  const agentsStatus = dashboardStats?.agentsStatus.map(agent => ({
    name: agent.name,
    type: TYPE_LABELS[agent.type] || agent.type,
    status: agent.status,
    tasks: agent.tasksCompleted,
  })) || [];

  return (
    <div style={{ padding: '24px 16px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Headphones size={28} style={{ color: 'var(--color-accent)' }} />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Lisa Studio
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Mis à jour : {lastRefresh.toLocaleTimeString('fr-FR')}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-primary)',
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'border-color var(--transition-fast)',
            fontFamily: 'inherit',
            fontSize: '13px',
          }}
        >
          <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          Rafraîchir
        </button>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-stats-grid" style={{ marginBottom: '24px' }}>
        <StatCard label="Total Agents" value={stats.totalAgents} change={12} icon={Brain} color="accent" />
        <StatCard label="Agents Actifs" value={stats.activeAgents} change={5} icon={Zap} color="cyan" />
        <StatCard label="Tâches Complétées" value={stats.tasksCompleted} change={-3} icon={CheckCircle} color="green" />
        <StatCard label="Taux de Succès" value={`${stats.successRate}%`} change={2} icon={Activity} color="green" />
      </div>

      {/* Activity + Quick Actions */}
      <div className="dashboard-content-grid">
        {/* Recent Activity */}
        <Card title="Activité Récente" icon={<Activity size={18} />}>
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <ActivityItem
                key={activity.id}
                agent={activity.agent}
                action={activity.action}
                time={activity.time}
                status={activity.status}
              />
            ))
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Aucune activité récente
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card title="Actions Rapides">
          <QuickActionButton icon={Eye} label="Vision" description="Perception visuelle" color="accent" onClick={() => navigate('/vision')} />
          <QuickActionButton icon={Mic} label="Audio" description="Perception auditive" color="cyan" onClick={() => navigate('/audio')} />
          <QuickActionButton icon={Brain} label="Workflows" description="Gestion des tâches" color="green" onClick={() => navigate('/workflows')} />
        </Card>
      </div>

      {/* Agents Status Table */}
      <div style={{ marginTop: '24px' }}>
        <Card title="État des Agents" icon={<Zap size={18} />}>
          <div style={{ overflowX: 'auto', minWidth: 0 }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            padding: '12px 16px',
            minWidth: '500px',
            backgroundColor: 'var(--bg-panel)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '8px',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nom</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Statut</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tâches</span>
          </div>

          {agentsStatus.map((agent, index) => (
            <div
              key={agent.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                padding: '14px 16px',
                minWidth: '500px',
                backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--bg-panel)',
                borderRadius: 'var(--radius-md)',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</span>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{agent.type}</span>
              <Badge color={agent.status === 'active' ? 'green' : 'muted'}>
                {agent.status === 'active' ? 'Actif' : 'Inactif'}
              </Badge>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{agent.tasks}</span>
            </div>
          ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
