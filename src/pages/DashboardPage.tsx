import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfficePageLayout } from '../components/layout/OfficePageLayout';
import { useOfficeThemeStore } from '../store/officeThemeStore';
import {
  Activity, Zap, Brain, Eye, Mic, CheckCircle,
  TrendingUp, TrendingDown, Clock, ArrowRight, RefreshCw
} from 'lucide-react';
import { agentStatsService, type DashboardStats, type AgentActivity } from '../services/AgentStatsService';

// Stat Card Component - Uses Office theme colors
const StatCard = ({
  label,
  value,
  change,
  icon: Icon,
  color,
  themeColors,
}: {
  label: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  color: string;
  themeColors: ReturnType<typeof useOfficeThemeStore.getState>['getCurrentColors'];
}) => {
  const colorPalette: Record<string, { bg: string; border: string; icon: string }> = {
    blue: { bg: 'rgba(0, 120, 212, 0.1)', border: 'rgba(0, 120, 212, 0.3)', icon: '#0078d4' },
    green: { bg: 'rgba(16, 124, 16, 0.1)', border: 'rgba(16, 124, 16, 0.3)', icon: '#107c10' },
    purple: { bg: 'rgba(98, 100, 167, 0.1)', border: 'rgba(98, 100, 167, 0.3)', icon: '#6264a7' },
    orange: { bg: 'rgba(255, 185, 0, 0.1)', border: 'rgba(255, 185, 0, 0.3)', icon: '#ffb900' },
  };
  const c = colorPalette[color] || colorPalette.blue;
  const colors = themeColors();

  return (
    <div style={{
      padding: '20px',
      backgroundColor: colors.dialog,
      borderRadius: '12px',
      border: `1px solid ${colors.border}`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '13px', color: colors.editorSecondary, marginBottom: '8px' }}>{label}</p>
          <p style={{ fontSize: '28px', fontWeight: 600, color: colors.editorText }}>{value}</p>
        </div>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          backgroundColor: c.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={22} color={c.icon} />
        </div>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '12px',
        fontSize: '13px'
      }}>
        {change >= 0 ? (
          <TrendingUp size={14} color={colors.success} />
        ) : (
          <TrendingDown size={14} color={colors.error} />
        )}
        <span style={{ color: change >= 0 ? colors.success : colors.error }}>
          {change >= 0 ? '+' : ''}{change}%
        </span>
        <span style={{ color: colors.editorSecondary }}>vs mois dernier</span>
      </div>
    </div>
  );
};

// Activity Item Component - Uses Office theme colors
const ActivityItem = ({
  agent,
  action,
  time,
  status,
  themeColors,
}: {
  agent: string;
  action: string;
  time: string;
  status: 'success' | 'pending' | 'error';
  themeColors: ReturnType<typeof useOfficeThemeStore.getState>['getCurrentColors'];
}) => {
  const colors = themeColors();
  const statusColorMap = {
    success: colors.success,
    pending: colors.warning,
    error: colors.error
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      backgroundColor: colors.sidebar,
      borderRadius: '10px',
      marginBottom: '8px'
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '14px', fontWeight: 500, color: colors.editorText, marginBottom: '4px' }}>{agent}</p>
        <p style={{ fontSize: '13px', color: colors.editorSecondary }}>{action}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.editorSecondary }}>
          <Clock size={14} />
          <span style={{ fontSize: '12px' }}>{time}</span>
        </div>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: statusColorMap[status]
        }} />
      </div>
    </div>
  );
};

// Quick Action Button Component - Uses Office theme colors
const QuickActionButton = ({
  icon: Icon,
  label,
  description,
  color,
  onClick,
  themeColors,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  onClick: () => void;
  themeColors: ReturnType<typeof useOfficeThemeStore.getState>['getCurrentColors'];
}) => {
  const colorPalette: Record<string, string> = {
    blue: '#0078d4',
    green: '#107c10',
    purple: '#6264a7',
  };
  const colors = themeColors();
  const iconColor = colorPalette[color] || colorPalette.blue;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '16px',
        backgroundColor: colors.sidebar,
        border: `1px solid ${colors.border}`,
        borderRadius: '10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.2s ease',
        marginBottom: '8px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          backgroundColor: `${iconColor}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={20} color={iconColor} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: colors.editorText, marginBottom: '2px' }}>{label}</p>
          <p style={{ fontSize: '12px', color: colors.editorSecondary }}>{description}</p>
        </div>
      </div>
      <ArrowRight size={18} color={colors.editorSecondary} />
    </button>
  );
};

// Type mapping for display
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

  // Get theme colors
  const { getCurrentColors } = useOfficeThemeStore();
  const colors = getCurrentColors();

  // Load stats on mount and subscribe to updates
  useEffect(() => {
    const loadStats = () => {
      const stats = agentStatsService.getStats();
      setDashboardStats(stats);
      setIsLoading(false);
      setLastRefresh(new Date());
    };

    loadStats();
    const unsubscribe = agentStatsService.subscribe(setDashboardStats);
    
    // Refresh every 30 seconds
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

  // Format activities for display
  const formatActivities = (activities: AgentActivity[]) => {
    return activities.map(activity => ({
      id: activity.id,
      agent: activity.agentName,
      action: activity.action,
      time: agentStatsService.formatRelativeTime(activity.timestamp),
      status: activity.status,
    }));
  };

  // Default values while loading
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
    <OfficePageLayout
      title="Dashboard"
      subtitle={`Mis a jour: ${lastRefresh.toLocaleTimeString('fr-FR')}`}
      action={
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          aria-label="Rafraichir les statistiques"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: colors.sidebar,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            color: colors.editorText,
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          <span style={{ fontSize: '13px' }}>Rafraichir</span>
        </button>
      }
    >
      {/* Stats Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard
          label="Total Agents"
          value={stats.totalAgents}
          change={12}
          icon={Brain}
          color="blue"
          themeColors={getCurrentColors}
        />
        <StatCard
          label="Agents Actifs"
          value={stats.activeAgents}
          change={5}
          icon={Zap}
          color="green"
          themeColors={getCurrentColors}
        />
        <StatCard
          label="Taches Completees"
          value={stats.tasksCompleted}
          change={-3}
          icon={CheckCircle}
          color="purple"
          themeColors={getCurrentColors}
        />
        <StatCard
          label="Taux de Succes"
          value={`${stats.successRate}%`}
          change={2}
          icon={Activity}
          color="green"
          themeColors={getCurrentColors}
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px'
      }}>
        {/* Recent Activity */}
        <div style={{
          backgroundColor: colors.dialog,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px'
          }}>
            <Activity size={20} color={colors.success} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.editorText, margin: 0 }}>
              Activite Recente
            </h3>
          </div>
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <ActivityItem
                key={activity.id}
                agent={activity.agent}
                action={activity.action}
                time={activity.time}
                status={activity.status}
                themeColors={getCurrentColors}
              />
            ))
          ) : (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: colors.editorSecondary,
              fontSize: '14px'
            }}>
              Aucune activite recente
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{
          backgroundColor: colors.dialog,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`,
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: colors.editorText,
            margin: '0 0 16px 0'
          }}>
            Actions Rapides
          </h3>
          <QuickActionButton
            icon={Eye}
            label="Vision"
            description="Perception visuelle"
            color="blue"
            onClick={() => navigate('/vision')}
            themeColors={getCurrentColors}
          />
          <QuickActionButton
            icon={Mic}
            label="Audio"
            description="Perception auditive"
            color="green"
            onClick={() => navigate('/audio')}
            themeColors={getCurrentColors}
          />
          <QuickActionButton
            icon={Brain}
            label="Workflows"
            description="Gestion des taches"
            color="purple"
            onClick={() => navigate('/workflows')}
            themeColors={getCurrentColors}
          />
        </div>
      </div>

      {/* Agents Status Table */}
      <div style={{
        marginTop: '24px',
        backgroundColor: colors.dialog,
        borderRadius: '12px',
        padding: '20px',
        border: `1px solid ${colors.border}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px'
        }}>
          <Zap size={20} color={colors.success} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.editorText, margin: 0 }}>
            Etat des Agents
          </h3>
        </div>

        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          padding: '12px 16px',
          backgroundColor: colors.sidebar,
          borderRadius: '8px',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: colors.editorSecondary, textTransform: 'uppercase' }}>Nom</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: colors.editorSecondary, textTransform: 'uppercase' }}>Type</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: colors.editorSecondary, textTransform: 'uppercase' }}>Statut</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: colors.editorSecondary, textTransform: 'uppercase' }}>Taches</span>
        </div>

        {/* Table Rows */}
        {agentsStatus.map((agent, index) => (
          <div
            key={agent.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              padding: '14px 16px',
              backgroundColor: index % 2 === 0 ? 'transparent' : colors.sidebarHover,
              borderRadius: '8px',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '14px', color: colors.editorText }}>{agent.name}</span>
            <span style={{ fontSize: '14px', color: colors.editorSecondary }}>{agent.type}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: agent.status === 'active' ? colors.success : colors.editorSecondary
              }} />
              <span style={{
                fontSize: '13px',
                color: agent.status === 'active' ? colors.success : colors.editorSecondary
              }}>
                {agent.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <span style={{ fontSize: '14px', color: colors.editorSecondary }}>{agent.tasks}</span>
          </div>
        ))}
      </div>
    </OfficePageLayout>
  );
}
