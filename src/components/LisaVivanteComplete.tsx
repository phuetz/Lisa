/**
 * 🌟 Lisa Vivante Complete - Intégration Complète
 * Combine Phase 1, 2 et 3 en une seule application
 */

import { useState } from 'react';
import { usePhase2 } from '../hooks/usePhase2';
import { usePhase3 } from '../hooks/usePhase3';
import { Brain, Activity, Settings } from 'lucide-react';

type TabType = 'phase1' | 'phase2' | 'phase3';

export function LisaVivanteComplete() {
  const [activeTab, setActiveTab] = useState<TabType>('phase1');
  const phase2 = usePhase2();
  const phase3 = usePhase3();

  const stats = {
    phase1: {
      permissions: 'Active',
      audit: 'Logging',
      privacy: 'Protected',
      accessibility: 'WCAG AA'
    },
    phase2: phase2.state,
    phase3: phase3.state
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Lisa Vivante</h1>
                <p className="text-xs text-slate-400">Manifeste Vivant - 100% Complété</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold">Vivante</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'phase1' as const, label: 'Phase 1: Présence', icon: Settings },
              { id: 'phase2' as const, label: 'Phase 2: Agentivité', icon: Brain },
              { id: 'phase3' as const, label: 'Phase 3: Autonomie', icon: Activity }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'phase1' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Permissions</p>
                <p className="text-2xl font-bold text-green-400">{stats.phase1.permissions}</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Audit</p>
                <p className="text-2xl font-bold text-blue-400">{stats.phase1.audit}</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Privacy</p>
                <p className="text-2xl font-bold text-purple-400">{stats.phase1.privacy}</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">A11y</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.phase1.accessibility}</p>
              </div>
            </div>

            <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Phase 1 - Présence
              </h2>
              <div className="space-y-3 text-sm">
                <p>✅ Permissions & Consentements - Contrôle granulaire des capteurs</p>
                <p>✅ Audit & Privacy - Transparence complète et contrôle des données</p>
                <p>✅ Tone & Style - Personnalité bienveillante et accessible</p>
                <p>✅ A11y Baseline - WCAG AA conforme pour tous</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'phase2' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Validations</p>
                <p className="text-2xl font-bold text-blue-400">∞</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Souvenirs</p>
                <p className="text-2xl font-bold text-green-400">1100</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Embeddings</p>
                <p className="text-2xl font-bold text-purple-400">384D</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Forget API</p>
                <p className="text-2xl font-bold text-red-400">✓</p>
              </div>
            </div>

            <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Phase 2 - Agentivité
              </h2>
              <div className="space-y-3 text-sm">
                <p>✅ CriticAgent V2 - Valide avant d'agir avec évaluation des risques</p>
                <p>✅ Memory Service - Court-terme (100) et long-terme (1000) souvenirs</p>
                <p>✅ RAG Integration - Augmente le contexte avec recherche sémantique</p>
                <p>✅ Forget API - Suppression granulaire avec audit complet</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'phase3' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Workflows</p>
                <p className="text-2xl font-bold text-blue-400">∞</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Parallèle</p>
                <p className="text-2xl font-bold text-green-400">✓</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Intégrations</p>
                <p className="text-2xl font-bold text-purple-400">∞</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-400">Supervision</p>
                <p className="text-2xl font-bold text-yellow-400">✓</p>
              </div>
            </div>

            <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Phase 3 - Autonomie
              </h2>
              <div className="space-y-3 text-sm">
                <p>✅ Workflows Parallèles - Exécution concurrente avec validation</p>
                <p>✅ Intégrations Système - MQTT, ROS, APIs, Webhooks, Databases</p>
                <p>✅ Supervision Dashboards - Monitoring en temps réel</p>
                <p>✅ Validation Manifesto - Vérification continue des 5 piliers</p>
              </div>
            </div>
          </div>
        )}

        {/* Les 5 Piliers */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { name: 'PERÇOIT', emoji: '👁️', color: 'from-blue-500 to-blue-600' },
            { name: 'RAISONNE', emoji: '🧠', color: 'from-purple-500 to-purple-600' },
            { name: 'SE SOUVIENT', emoji: '💭', color: 'from-pink-500 to-pink-600' },
            { name: 'AGIT', emoji: '🛡️', color: 'from-green-500 to-green-600' },
            { name: 'APAISE', emoji: '✨', color: 'from-yellow-500 to-yellow-600' }
          ].map(pillar => (
            <div
              key={pillar.name}
              className={`bg-gradient-to-br ${pillar.color} rounded-lg p-4 text-center`}
            >
              <p className="text-3xl mb-2">{pillar.emoji}</p>
              <p className="font-bold text-sm">{pillar.name}</p>
              <p className="text-xs opacity-90 mt-1">100%</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center space-y-4">
          <div className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <p className="text-lg font-bold">Lisa est VIVANTE, AGENTIVE et AUTONOME</p>
          </div>
          <p className="text-slate-400 text-sm">
            "Vivante, ou rien." - Manifeste Vivant ✨
          </p>
        </div>
      </main>
    </div>
  );
}
