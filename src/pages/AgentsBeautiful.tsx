/**
 * AgentsBeautiful.tsx
 * 
 * Page des agents avec design spectaculaire
 */

import React, { useState, useMemo } from 'react';
import {
  Bot, Brain, Eye, MessageSquare, Shield, Workflow,
  Search, Grid, List, Zap, Activity, 
  ChevronRight, Star, Clock, CheckCircle2
} from 'lucide-react';
import { AuroraBackground } from '../components/ui/AnimatedBackground';
import { GlowingCard } from '../components/ui/GlowingCard';

interface Agent {
  id: string;
  name: string;
  description: string;
  domain: string;
  status: 'active' | 'idle' | 'disabled';
  capabilities: string[];
  tasksCompleted: number;
  successRate: number;
  lastActive: string;
  isFavorite?: boolean;
}

const domainColors: Record<string, { bg: string; text: string; border: string }> = {
  perception: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  cognitive: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  integration: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  communication: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  security: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  analysis: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
};

const domainIcons: Record<string, React.ReactNode> = {
  perception: <Eye className="w-5 h-5" />,
  cognitive: <Brain className="w-5 h-5" />,
  integration: <Workflow className="w-5 h-5" />,
  communication: <MessageSquare className="w-5 h-5" />,
  security: <Shield className="w-5 h-5" />,
  analysis: <Activity className="w-5 h-5" />,
};

const mockAgents: Agent[] = [
  { id: '1', name: 'Vision Agent', description: 'Détection d\'objets et analyse d\'images en temps réel', domain: 'perception', status: 'active', capabilities: ['object_detection', 'face_recognition', 'scene_analysis'], tasksCompleted: 1234, successRate: 98.5, lastActive: '2s ago', isFavorite: true },
  { id: '2', name: 'Audio Classifier', description: 'Classification audio et reconnaissance vocale', domain: 'perception', status: 'active', capabilities: ['speech_recognition', 'sound_classification', 'voice_detection'], tasksCompleted: 567, successRate: 97.2, lastActive: '5s ago' },
  { id: '3', name: 'Memory Manager', description: 'Gestion de la mémoire contextuelle et long-terme', domain: 'cognitive', status: 'active', capabilities: ['context_storage', 'memory_retrieval', 'knowledge_graph'], tasksCompleted: 2345, successRate: 99.1, lastActive: '1m ago', isFavorite: true },
  { id: '4', name: 'NLP Processor', description: 'Traitement du langage naturel avancé', domain: 'analysis', status: 'active', capabilities: ['text_analysis', 'sentiment_detection', 'entity_extraction'], tasksCompleted: 890, successRate: 96.8, lastActive: '10s ago' },
  { id: '5', name: 'Workflow Engine', description: 'Orchestration et exécution de workflows', domain: 'integration', status: 'active', capabilities: ['workflow_execution', 'task_scheduling', 'parallel_processing'], tasksCompleted: 456, successRate: 99.5, lastActive: '30s ago' },
  { id: '6', name: 'Security Agent', description: 'Surveillance et protection du système', domain: 'security', status: 'idle', capabilities: ['threat_detection', 'access_control', 'audit_logging'], tasksCompleted: 123, successRate: 100, lastActive: '5m ago' },
  { id: '7', name: 'Communication Hub', description: 'Gestion des communications multi-canaux', domain: 'communication', status: 'active', capabilities: ['message_routing', 'notification_management', 'channel_integration'], tasksCompleted: 789, successRate: 98.9, lastActive: '15s ago' },
  { id: '8', name: 'Personalization Agent', description: 'Personnalisation de l\'expérience utilisateur', domain: 'cognitive', status: 'active', capabilities: ['preference_learning', 'recommendation_engine', 'adaptive_ui'], tasksCompleted: 345, successRate: 95.6, lastActive: '2m ago' },
];

export default function AgentsBeautiful() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoaded, setIsLoaded] = useState(false);

  React.useEffect(() => {
    setIsLoaded(true);
  }, []);

  const filteredAgents = useMemo(() => {
    return mockAgents.filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           agent.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDomain = !selectedDomain || agent.domain === selectedDomain;
      return matchesSearch && matchesDomain;
    });
  }, [searchQuery, selectedDomain]);

  const domains = useMemo(() => {
    const uniqueDomains = [...new Set(mockAgents.map(a => a.domain))];
    return uniqueDomains.map(domain => ({
      name: domain,
      count: mockAgents.filter(a => a.domain === domain).length,
    }));
  }, []);

  const stats = {
    total: mockAgents.length,
    active: mockAgents.filter(a => a.status === 'active').length,
    avgSuccess: (mockAgents.reduce((acc, a) => acc + a.successRate, 0) / mockAgents.length).toFixed(1),
  };

  return (
    <div className="min-h-screen relative">
      <AuroraBackground intensity="subtle" />

      <div className="relative z-10 p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className={`mb-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                <span className="animate-gradient-text">Agents</span>
              </h1>
              <p className="text-slate-400">
                {stats.total} agents • {stats.active} actifs • {stats.avgSuccess}% taux de succès moyen
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all w-64"
                />
              </div>
              {/* View Toggle */}
              <div className="flex items-center bg-slate-800/50 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Domain Filter */}
        <div className={`flex flex-wrap gap-2 mb-6 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={() => setSelectedDomain(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              !selectedDomain 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
            }`}
          >
            Tous ({mockAgents.length})
          </button>
          {domains.map(domain => {
            const colors = domainColors[domain.name] || domainColors.perception;
            return (
              <button
                key={domain.name}
                onClick={() => setSelectedDomain(domain.name === selectedDomain ? null : domain.name)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedDomain === domain.name
                    ? `${colors.bg} ${colors.text} border ${colors.border}`
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
                }`}
              >
                {domainIcons[domain.name]}
                <span className="capitalize">{domain.name}</span>
                <span className="text-xs opacity-70">({domain.count})</span>
              </button>
            );
          })}
        </div>

        {/* Agents Grid/List */}
        <div className={`transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => {
                const colors = domainColors[agent.domain] || domainColors.perception;
                return (
                  <GlowingCard
                    key={agent.id}
                    glowColor={agent.domain === 'perception' ? 'blue' : 
                              agent.domain === 'cognitive' ? 'purple' :
                              agent.domain === 'integration' ? 'cyan' :
                              agent.domain === 'security' ? 'rose' :
                              agent.domain === 'analysis' ? 'amber' : 'emerald'}
                    hover3D
                    className="cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${colors.bg}`}>
                        {domainIcons[agent.domain] || <Bot className="w-5 h-5" />}
                      </div>
                      <div className="flex items-center gap-2">
                        {agent.isFavorite && (
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        )}
                        <span className={`w-2 h-2 rounded-full ${
                          agent.status === 'active' ? 'bg-emerald-500' :
                          agent.status === 'idle' ? 'bg-amber-500' : 'bg-slate-500'
                        }`} />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{agent.name}</h3>
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">{agent.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-slate-500">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{agent.tasksCompleted}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-400">
                        <Zap className="w-4 h-4" />
                        <span>{agent.successRate}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-4 h-4" />
                        <span>{agent.lastActive}</span>
                      </div>
                    </div>
                  </GlowingCard>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAgents.map((agent) => {
                const colors = domainColors[agent.domain] || domainColors.perception;
                return (
                  <GlowingCard
                    key={agent.id}
                    glowColor="blue"
                    intensity="low"
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${colors.bg} ${colors.text}`}>
                        {domainIcons[agent.domain] || <Bot className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{agent.name}</h3>
                          {agent.isFavorite && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                          <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${colors.bg} ${colors.text}`}>
                            {agent.domain}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 truncate">{agent.description}</p>
                      </div>
                      <div className="hidden md:flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-slate-500">Tâches</p>
                          <p className="font-semibold text-white">{agent.tasksCompleted}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-500">Succès</p>
                          <p className="font-semibold text-emerald-400">{agent.successRate}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-500">Dernier</p>
                          <p className="font-semibold text-white">{agent.lastActive}</p>
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        agent.status === 'active' ? 'bg-emerald-500' :
                        agent.status === 'idle' ? 'bg-amber-500' : 'bg-slate-500'
                      }`} />
                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    </div>
                  </GlowingCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredAgents.length === 0 && (
          <div className="text-center py-16">
            <Bot className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Aucun agent trouvé</h3>
            <p className="text-slate-400">Essayez de modifier vos filtres de recherche</p>
          </div>
        )}
      </div>
    </div>
  );
}
