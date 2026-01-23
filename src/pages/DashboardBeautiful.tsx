/**
 * DashboardBeautiful.tsx
 * 
 * Dashboard époustouflant avec design moderne et animations fluides
 */

import React, { useState, useEffect, memo, useMemo } from 'react';
import { 
  Brain, Zap, Activity, Eye, Ear, MessageSquare, 
  Workflow, Shield, TrendingUp, Clock, CheckCircle2,
  Sparkles, Bot, Cpu, BarChart3
} from 'lucide-react';
import { AuroraBackground } from '../components/ui/AnimatedBackground';
import { GlowingCard, GlowingStatCard, GlowingActionCard } from '../components/ui/GlowingCard';

interface AgentStatus {
  name: string;
  domain: string;
  status: 'active' | 'idle' | 'error';
  lastActivity: string;
  tasksCompleted: number;
}

interface RecentActivity {
  id: number;
  agent: string;
  action: string;
  time: string;
  status: 'success' | 'warning' | 'error';
  icon: React.ReactNode;
}

// Composant séparé pour l'horloge - évite le re-render du dashboard entier
const ClockDisplay = memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="glass rounded-2xl px-6 py-3">
      <div className="text-sm text-slate-400">Heure actuelle</div>
      <div className="text-2xl font-mono font-bold text-white">
        {currentTime.toLocaleTimeString('fr-FR')}
      </div>
    </div>
  );
});
ClockDisplay.displayName = 'ClockDisplay';

// Composant mémorisé pour le graphique de performance
const PerformanceChart = memo(() => {
  const bars = useMemo(() => [65, 45, 78, 52, 88, 67, 92, 75, 83, 58, 95, 72], []);
  
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="flex items-end gap-2 h-48">
        {bars.map((height, i) => (
          <div
            key={i}
            className="w-8 bg-gradient-to-t from-cyan-500/50 to-cyan-400/80 rounded-t-lg transition-all hover:from-cyan-500/70 hover:to-cyan-400"
            style={{ 
              height: `${height}%`,
              animationDelay: `${i * 0.05}s`
            }}
          />
        ))}
      </div>
    </div>
  );
});
PerformanceChart.displayName = 'PerformanceChart';

export default function DashboardBeautiful() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const stats = {
    totalAgents: 55,
    activeAgents: 18,
    tasksToday: 1247,
    successRate: 99.2,
  };

  const agentStatuses: AgentStatus[] = [
    { name: 'Vision Agent', domain: 'Perception', status: 'active', lastActivity: '2s ago', tasksCompleted: 456 },
    { name: 'Audio Classifier', domain: 'Perception', status: 'active', lastActivity: '5s ago', tasksCompleted: 234 },
    { name: 'Memory Manager', domain: 'Cognitive', status: 'active', lastActivity: '1m ago', tasksCompleted: 789 },
    { name: 'Workflow Engine', domain: 'Integration', status: 'active', lastActivity: '10s ago', tasksCompleted: 123 },
    { name: 'Security Agent', domain: 'Security', status: 'idle', lastActivity: '5m ago', tasksCompleted: 67 },
    { name: 'NLP Processor', domain: 'Analysis', status: 'active', lastActivity: '3s ago', tasksCompleted: 345 },
  ];

  const recentActivities: RecentActivity[] = [
    { id: 1, agent: 'Vision Agent', action: 'Objet détecté: smartphone', time: '2s', status: 'success', icon: <Eye className="w-4 h-4" /> },
    { id: 2, agent: 'Audio Classifier', action: 'Son classifié: voix humaine', time: '5s', status: 'success', icon: <Ear className="w-4 h-4" /> },
    { id: 3, agent: 'Memory Manager', action: 'Contexte sauvegardé', time: '1m', status: 'success', icon: <Brain className="w-4 h-4" /> },
    { id: 4, agent: 'Workflow Engine', action: 'Workflow "Daily Report" terminé', time: '2m', status: 'success', icon: <Workflow className="w-4 h-4" /> },
    { id: 5, agent: 'Security Agent', action: 'Scan de sécurité complété', time: '5m', status: 'success', icon: <Shield className="w-4 h-4" /> },
  ];

  const quickActions = [
    { title: 'Nouvelle conversation', description: 'Démarrer un chat avec Lisa', icon: MessageSquare, color: 'blue' as const },
    { title: 'Créer un workflow', description: 'Automatiser une tâche', icon: Workflow, color: 'purple' as const },
    { title: 'Analyse vision', description: 'Activer la caméra', icon: Eye, color: 'cyan' as const },
    { title: 'Reconnaissance audio', description: 'Écouter l\'environnement', icon: Ear, color: 'emerald' as const },
  ];

  const getStatusColor = (status: 'active' | 'idle' | 'error') => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'idle': return 'bg-amber-500';
      case 'error': return 'bg-rose-500';
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Animated Background */}
      <AuroraBackground intensity="medium" />

      {/* Main Content */}
      <div className="relative z-10 p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className={`mb-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
                <span className="animate-gradient-text">Lisa Dashboard</span>
              </h1>
              <p className="text-slate-400 text-lg">
                Bienvenue ! Voici l'état de votre assistant intelligent.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ClockDisplay />
              <div className="glass rounded-2xl px-6 py-3 hidden sm:block">
                <div className="text-sm text-slate-400">Système</div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-emerald-400 font-medium">Opérationnel</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <GlowingStatCard
            label="Agents Totaux"
            value={stats.totalAgents}
            icon={Bot}
            trend={{ value: 12, direction: 'up' }}
            color="blue"
          />
          <GlowingStatCard
            label="Agents Actifs"
            value={stats.activeAgents}
            icon={Zap}
            trend={{ value: 5, direction: 'up' }}
            color="emerald"
          />
          <GlowingStatCard
            label="Tâches Aujourd'hui"
            value={stats.tasksToday.toLocaleString()}
            icon={CheckCircle2}
            trend={{ value: 23, direction: 'up' }}
            color="purple"
          />
          <GlowingStatCard
            label="Taux de Réussite"
            value={`${stats.successRate}%`}
            icon={TrendingUp}
            trend={{ value: 0.5, direction: 'up' }}
            color="cyan"
          />
        </div>

        {/* Main Grid */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Agent Status */}
          <GlowingCard glowColor="blue" className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Statut des Agents</h2>
              </div>
              <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Voir tous →
              </button>
            </div>
            <div className="space-y-3">
              {agentStatuses.map((agent, index) => (
                <div
                  key={agent.name}
                  className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl hover:bg-slate-800/60 transition-all group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                    <div>
                      <p className="font-medium text-white group-hover:text-blue-300 transition-colors">
                        {agent.name}
                      </p>
                      <p className="text-sm text-slate-500">{agent.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right hidden sm:block">
                      <p className="text-slate-400">Dernière activité</p>
                      <p className="text-white">{agent.lastActivity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400">Tâches</p>
                      <p className="text-white font-semibold">{agent.tasksCompleted}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlowingCard>

          {/* Recent Activity */}
          <GlowingCard glowColor="purple">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Activity className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Activité Récente</h2>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 group">
                  <div className="p-2 rounded-lg bg-slate-800/60 text-slate-400 group-hover:text-purple-400 transition-colors">
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{activity.action}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{activity.agent}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.time}
                      </span>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'success' ? 'bg-emerald-500' :
                    activity.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                  }`} />
                </div>
              ))}
            </div>
          </GlowingCard>
        </div>

        {/* Quick Actions */}
        <div className={`transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-white">Actions Rapides</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <GlowingActionCard
                key={action.title}
                title={action.title}
                description={action.description}
                icon={action.icon}
                color={action.color}
              />
            ))}
          </div>
        </div>

        {/* Performance Chart Placeholder */}
        <div className={`mt-8 transition-all duration-700 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <GlowingCard glowColor="cyan">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Performance Système</h2>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-colors">
                  24h
                </button>
                <button className="px-3 py-1 text-sm text-slate-400 hover:text-white transition-colors">
                  7j
                </button>
                <button className="px-3 py-1 text-sm text-slate-400 hover:text-white transition-colors">
                  30j
                </button>
              </div>
            </div>
            <PerformanceChart />
            <div className="flex items-center justify-between text-sm text-slate-500 mt-4 pt-4 border-t border-slate-700/50">
              <span>CPU: 45%</span>
              <span>RAM: 62%</span>
              <span>GPU: 28%</span>
              <span>Réseau: 12 MB/s</span>
            </div>
          </GlowingCard>
        </div>
      </div>
    </div>
  );
}
