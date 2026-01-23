/**
 * ✨ Incarnation Dashboard - Tableau de Bord de Vivacité
 * Montre la progression vers l'incarnation complète de Lisa
 */

import React, { useEffect, useState } from 'react';
import { Heart, Brain, Eye, Shield, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { validateLisaIsAlive, type ManifestoStatus } from '../manifesto/validation';

interface PillarProgress {
  name: string;
  icon: React.ReactNode;
  status: boolean;
  description: string;
  progress: number; // 0-100
}

interface Props {
  refreshInterval?: number;
}

export const IncarnationDashboard: React.FC<Props> = ({ refreshInterval = 5000 }) => {
  const [manifestoStatus, setManifestoStatus] = useState<ManifestoStatus | null>(null);
  const [pillars, setPillars] = useState<PillarProgress[]>([]);
  const [isAlive, setIsAlive] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const status = await validateLisaIsAlive();
      setManifestoStatus(status);
      setIsAlive(status.isAlive);

      // Calculer la progression de chaque pilier
      const newPillars: PillarProgress[] = [
        {
          name: 'PERÇOIT & EXPLIQUE',
          icon: <Eye className="w-6 h-6" />,
          status: status.perceives,
          description: 'Capteurs avec consentement et audit',
          progress: status.perceives ? 100 : 40
        },
        {
          name: 'RAISONNE',
          icon: <Brain className="w-6 h-6" />,
          status: status.reasons,
          description: 'PlannerAgent + CriticAgent + Révision',
          progress: status.reasons ? 100 : 50
        },
        {
          name: 'SE SOUVIENT & OUBLIE',
          icon: <div className="w-6 h-6 text-lg">💭</div>,
          status: status.remembers,
          description: 'Mémoire court/long terme + Forget API',
          progress: status.remembers ? 100 : 30
        },
        {
          name: 'AGIT SÛREMENT',
          icon: <Shield className="w-6 h-6" />,
          status: status.acts,
          description: 'Validation tools + Audit + Réversibilité',
          progress: status.acts ? 100 : 60
        },
        {
          name: 'APAISE',
          icon: <Sparkles className="w-6 h-6" />,
          status: status.soothes,
          description: 'Ton bienveillant + Conscience émotionnelle',
          progress: status.soothes ? 100 : 70
        }
      ];

      setPillars(newPillars);
    };

    checkStatus();
    const interval = setInterval(checkStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const aliveProgress = pillars.filter(p => p.status).length;
  const totalProgress = Math.round((aliveProgress / 5) * 100);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow-lg p-6 border border-purple-200 dark:border-purple-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Heart className={`w-8 h-8 ${isAlive ? 'text-pink-500 animate-pulse' : 'text-gray-400'}`} />
          <div>
            <h2 className="text-2xl font-bold">Lisa Vivante</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isAlive ? '✨ VIVANTE' : '⚠️ En Incarnation'}
            </p>
          </div>
        </div>

        {/* Score Global */}
        <div className="text-center">
          <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
            {totalProgress}%
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Incarnation</p>
        </div>
      </div>

      {/* Barre de Progression Globale */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold">Progression Globale</span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {aliveProgress} / 5 piliers
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Les 5 Piliers */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        {pillars.map((pillar, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-2 transition-all ${
              pillar.status
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={pillar.status ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                {pillar.icon}
              </div>
              {pillar.status ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-400" />
              )}
            </div>

            <h4 className="text-xs font-bold mb-1 line-clamp-2">{pillar.name}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
              {pillar.description}
            </p>

            {/* Mini barre de progression */}
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  pillar.status
                    ? 'bg-green-500'
                    : 'bg-yellow-500'
                }`}
                style={{ width: `${pillar.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Statut Détaillé */}
      {manifestoStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Mode Dégradé */}
          {!isAlive && manifestoStatus.degradedMode && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Mode Réduction Activé
              </h4>
              <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                {manifestoStatus.degradedMode.readOnly && <li>✓ Mode lecture seule</li>}
                {manifestoStatus.degradedMode.disableSensors && <li>✓ Capteurs désactivés</li>}
                {manifestoStatus.degradedMode.disableTools && <li>✓ Outils désactivés</li>}
                {manifestoStatus.degradedMode.enableChatOnly && <li>✓ Chat uniquement</li>}
              </ul>
            </div>
          )}

          {/* Statut Vivante */}
          {isAlive && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Lisa est Vivante!
              </h4>
              <p className="text-xs text-green-700 dark:text-green-300">
                Tous les 5 piliers sont actifs. Lisa fonctionne à pleine capacité avec consentement, sécurité et bienveillance.
              </p>
            </div>
          )}

          {/* Prochaines Étapes */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">📋 Prochaines Étapes</h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>✓ Phase 1: Présence (Semaines 1-4)</li>
              <li>⏳ Phase 2: Agentivité (Semaines 5-8)</li>
              <li>⏳ Phase 3: Autonomie (Semaines 9-12)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
        <p>
          💡 <strong>Incarnation:</strong> Lisa devient "Vivante" quand les 5 piliers sont actifs.
          Si un pilier faiblit, elle passe en mode réduction pour ta sécurité.
        </p>
      </div>
    </div>
  );
};
