/**
 * WorkflowsBeautiful.tsx
 * 
 * Page Workflows avec design spectaculaire et visualisation de flux
 */

import { useState, useEffect } from 'react';
import {
  Workflow, Play, Pause, Plus, Settings, Clock,
  CheckCircle2, XCircle, AlertCircle, RefreshCw,
  ChevronRight, Zap, GitBranch, Box, ArrowRight
} from 'lucide-react';
import { AuroraBackground } from '../components/ui/AnimatedBackground';
import { GlowingCard, GlowingStatCard } from '../components/ui/GlowingCard';

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'pending';
  steps: number;
  completedSteps: number;
  lastRun: string;
  duration?: string;
  trigger: 'manual' | 'scheduled' | 'event';
}

const statusConfig = {
  running: { color: 'blue', icon: RefreshCw, label: 'En cours', animate: true },
  completed: { color: 'emerald', icon: CheckCircle2, label: 'Terminé', animate: false },
  failed: { color: 'rose', icon: XCircle, label: 'Échoué', animate: false },
  paused: { color: 'amber', icon: Pause, label: 'En pause', animate: false },
  pending: { color: 'slate', icon: Clock, label: 'En attente', animate: false },
};

export default function WorkflowsBeautiful() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);

  const [workflows] = useState<WorkflowItem[]>([
    { id: '1', name: 'Daily Report Generator', description: 'Génère un rapport quotidien des activités', status: 'completed', steps: 5, completedSteps: 5, lastRun: '2h ago', duration: '45s', trigger: 'scheduled' },
    { id: '2', name: 'Data Backup Pipeline', description: 'Sauvegarde automatique des données critiques', status: 'running', steps: 8, completedSteps: 4, lastRun: 'now', trigger: 'scheduled' },
    { id: '3', name: 'Email Notification Flow', description: 'Envoie des notifications email personnalisées', status: 'pending', steps: 3, completedSteps: 0, lastRun: '1d ago', trigger: 'event' },
    { id: '4', name: 'Image Processing Pipeline', description: 'Traitement et optimisation d\'images', status: 'completed', steps: 6, completedSteps: 6, lastRun: '4h ago', duration: '2m 15s', trigger: 'manual' },
    { id: '5', name: 'User Sync Workflow', description: 'Synchronisation des données utilisateurs', status: 'failed', steps: 4, completedSteps: 2, lastRun: '30m ago', trigger: 'scheduled' },
  ]);

  const stats = {
    total: workflows.length,
    running: workflows.filter(w => w.status === 'running').length,
    completed: workflows.filter(w => w.status === 'completed').length,
    failed: workflows.filter(w => w.status === 'failed').length,
  };

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'scheduled': return <Clock className="w-3 h-3" />;
      case 'event': return <Zap className="w-3 h-3" />;
      default: return <Play className="w-3 h-3" />;
    }
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
                <span className="animate-gradient-text">Workflows</span>
              </h1>
              <p className="text-slate-400">
                Automatisez vos tâches avec des workflows intelligents et personnalisables
              </p>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-500/25">
              <Plus className="w-5 h-5" />
              Nouveau Workflow
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <GlowingStatCard
            label="Total"
            value={stats.total}
            icon={Workflow}
            color="blue"
          />
          <GlowingStatCard
            label="En cours"
            value={stats.running}
            icon={RefreshCw}
            color="cyan"
          />
          <GlowingStatCard
            label="Terminés"
            value={stats.completed}
            icon={CheckCircle2}
            color="emerald"
          />
          <GlowingStatCard
            label="Échoués"
            value={stats.failed}
            icon={XCircle}
            color="rose"
          />
        </div>

        {/* Main Content */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Workflows List */}
          <GlowingCard glowColor="blue" className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <GitBranch className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Mes Workflows</h2>
              </div>
              <button className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {workflows.map((workflow) => {
                const status = statusConfig[workflow.status];
                const StatusIcon = status.icon;
                const progress = (workflow.completedSteps / workflow.steps) * 100;
                const isSelected = selectedWorkflow === workflow.id;

                return (
                  <div
                    key={workflow.id}
                    onClick={() => setSelectedWorkflow(isSelected ? null : workflow.id)}
                    className={`p-4 rounded-xl transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-500/10 border border-blue-500/30' 
                        : 'bg-slate-800/40 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-${status.color}-500/10 text-${status.color}-400`}>
                          <StatusIcon className={`w-5 h-5 ${status.animate ? 'animate-spin' : ''}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{workflow.name}</h3>
                          <p className="text-sm text-slate-400">{workflow.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${status.color}-500/10 text-${status.color}-400`}>
                          {status.label}
                        </span>
                        <ChevronRight className={`w-5 h-5 text-slate-600 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 bg-${status.color}-500`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {workflow.completedSteps}/{workflow.steps}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        {getTriggerIcon(workflow.trigger)}
                        <span className="capitalize">{workflow.trigger}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {workflow.lastRun}
                      </span>
                      {workflow.duration && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {workflow.duration}
                        </span>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <div className="flex gap-2">
                          <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors">
                            <Play className="w-4 h-4" />
                            Exécuter
                          </button>
                          <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700/50 text-slate-400 rounded-lg hover:text-white transition-colors">
                            <Settings className="w-4 h-4" />
                            Configurer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </GlowingCard>

          {/* Quick Create */}
          <div className="space-y-6">
            <GlowingCard glowColor="purple">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Box className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Création Rapide</h2>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Notification Email', icon: AlertCircle, color: 'blue' },
                  { name: 'Traitement Data', icon: RefreshCw, color: 'purple' },
                  { name: 'API Integration', icon: ArrowRight, color: 'cyan' },
                  { name: 'Backup Automatique', icon: Clock, color: 'emerald' },
                ].map((template) => (
                  <button
                    key={template.name}
                    className="w-full flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl hover:bg-slate-800/60 transition-colors text-left"
                  >
                    <div className={`p-2 rounded-lg bg-${template.color}-500/10 text-${template.color}-400`}>
                      <template.icon className="w-4 h-4" />
                    </div>
                    <span className="text-white font-medium">{template.name}</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                  </button>
                ))}
              </div>
            </GlowingCard>

            {/* Activity Log */}
            <GlowingCard glowColor="cyan">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Activité</h2>
              </div>

              <div className="space-y-3">
                {[
                  { action: 'Daily Report terminé', time: '2h', status: 'success' },
                  { action: 'Backup démarré', time: '5m', status: 'running' },
                  { action: 'User Sync échoué', time: '30m', status: 'failed' },
                  { action: 'Image Processing OK', time: '4h', status: 'success' },
                ].map((log, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      log.status === 'success' ? 'bg-emerald-500' :
                      log.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-rose-500'
                    }`} />
                    <span className="flex-1 text-slate-300">{log.action}</span>
                    <span className="text-slate-500">{log.time}</span>
                  </div>
                ))}
              </div>
            </GlowingCard>
          </div>
        </div>
      </div>
    </div>
  );
}
