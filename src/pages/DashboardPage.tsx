import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '../components/layout/ModernLayout';
import { 
  Activity, Zap, Brain, Eye, Mic, CheckCircle, 
  TrendingUp, TrendingDown, Clock, ArrowRight, RefreshCw 
} from 'lucide-react';
import { agentStatsService, type DashboardStats, type AgentActivity } from '../services/AgentStatsService';

// Stat Card Component
const StatCard = ({ 
  label, 
  value, 
  change, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: string | number; 
  change: number; 
  icon: React.ElementType; 
  color: string;
}) => {
  const colors: Record<string, { bg: string; border: string; icon: string }> = {
    blue: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', icon: '#3b82f6' },
    green: { bg: 'rgba(16, 163, 127, 0.1)', border: 'rgba(16, 163, 127, 0.3)', icon: '#10a37f' },
    purple: { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', icon: '#8b5cf6' },
    orange: { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)', icon: '#f97316' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#2d2d2d',
      borderRadius: '12px',
      border: `1px solid ${c.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>{label}</p>
          <p style={{ fontSize: '28px', fontWeight: 600, color: '#fff' }}>{value}</p>
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
          <TrendingUp size={14} color="#10a37f" />
        ) : (
          <TrendingDown size={14} color="#ef4444" />
        )}
        <span style={{ color: change >= 0 ? '#10a37f' : '#ef4444' }}>
          {change >= 0 ? '+' : ''}{change}%
        </span>
        <span style={{ color: '#666' }}>vs mois dernier</span>
      </div>
    </div>
  );
};

// Activity Item Component
const ActivityItem = ({ 
  agent, 
  action, 
  time, 
  status 
}: { 
  agent: string; 
  action: string; 
  time: string; 
  status: 'success' | 'pending' | 'error';
}) => {
  const statusColors = {
    success: '#10a37f',
    pending: '#f59e0b',
    error: '#ef4444'
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      backgroundColor: '#1a1a1a',
      borderRadius: '10px',
      marginBottom: '8px'
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '14px', fontWeight: 500, color: '#fff', marginBottom: '4px' }}>{agent}</p>
        <p style={{ fontSize: '13px', color: '#888' }}>{action}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666' }}>
          <Clock size={14} />
          <span style={{ fontSize: '12px' }}>{time}</span>
        </div>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: statusColors[status]
        }} />
      </div>
    </div>
  );
};

// Quick Action Button Component
const QuickActionButton = ({ 
  icon: Icon, 
  label, 
  description, 
  color, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  description: string; 
  color: string;
  onClick: () => void;
}) => {
  const colors: Record<string, string> = {
    blue: '#3b82f6',
    green: '#10a37f',
    purple: '#8b5cf6',
  };

  return (
    <button
      onClick={onClick}
      className="nav-item"
      style={{
        width: '100%',
        padding: '16px',
        backgroundColor: '#1a1a1a',
        border: `1px solid #2d2d2d`,
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
          backgroundColor: `${colors[color]}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={20} color={colors[color]} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#fff', marginBottom: '2px' }}>{label}</p>
          <p style={{ fontSize: '12px', color: '#888' }}>{description}</p>
        </div>
      </div>
      <ArrowRight size={18} color="#666" />
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
    <ModernLayout title="Dashboard">
      {/* Header with refresh */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#666' }}>
            Mis à jour: {lastRefresh.toLocaleTimeString('fr-FR')}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          aria-label="Rafraîchir les statistiques"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #2d2d2d',
            borderRadius: '8px',
            color: '#fff',
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          <span style={{ fontSize: '13px' }}>Rafraîchir</span>
        </button>
      </div>

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
        />
        <StatCard
          label="Agents Actifs"
          value={stats.activeAgents}
          change={5}
          icon={Zap}
          color="green"
        />
        <StatCard
          label="Tâches Complétées"
          value={stats.tasksCompleted}
          change={-3}
          icon={CheckCircle}
          color="purple"
        />
        <StatCard
          label="Taux de Succès"
          value={`${stats.successRate}%`}
          change={2}
          icon={Activity}
          color="green"
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px'
      }}>
        {/* Recent Activity */}
        <div style={{
          backgroundColor: '#2d2d2d',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px'
          }}>
            <Activity size={20} color="#10a37f" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>
              Activité Récente
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
              />
            ))
          ) : (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#666',
              fontSize: '14px'
            }}>
              Aucune activité récente
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{
          backgroundColor: '#2d2d2d',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: '#fff', 
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
          />
          <QuickActionButton
            icon={Mic}
            label="Audio"
            description="Perception auditive"
            color="green"
            onClick={() => navigate('/audio')}
          />
          <QuickActionButton
            icon={Brain}
            label="Workflows"
            description="Gestion des tâches"
            color="purple"
            onClick={() => navigate('/workflows')}
          />
        </div>
      </div>

      {/* Agents Status Table */}
      <div style={{
        marginTop: '24px',
        backgroundColor: '#2d2d2d',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px'
        }}>
          <Zap size={20} color="#10a37f" />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>
            État des Agents
          </h3>
        </div>
        
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          padding: '12px 16px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase' }}>Nom</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase' }}>Type</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase' }}>Statut</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase' }}>Tâches</span>
        </div>
        
        {/* Table Rows */}
        {agentsStatus.map((agent, index) => (
          <div 
            key={agent.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              padding: '14px 16px',
              backgroundColor: index % 2 === 0 ? 'transparent' : '#1a1a1a20',
              borderRadius: '8px',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '14px', color: '#fff' }}>{agent.name}</span>
            <span style={{ fontSize: '14px', color: '#888' }}>{agent.type}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: agent.status === 'active' ? '#10a37f' : '#666'
              }} />
              <span style={{ 
                fontSize: '13px', 
                color: agent.status === 'active' ? '#10a37f' : '#666' 
              }}>
                {agent.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <span style={{ fontSize: '14px', color: '#888' }}>{agent.tasks}</span>
          </div>
        ))}
      </div>
    </ModernLayout>
  );
}
