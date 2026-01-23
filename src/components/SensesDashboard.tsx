// src/components/SensesDashboard.tsx
/**
 * LES 5 SENS DE LISA - Dashboard de Visualisation
 * 
 * Affiche l'état en temps réel des 5 modalités sensorielles:
 * 👁️ Vision - Perception visuelle
 * 👂 Ouïe - Perception auditive
 * ✋ Toucher - Perception tactile
 * 🌍 Environnement - Perception environnementale
 * 💭 Proprioception - Conscience de soi
 */

import React, { useState } from 'react';
import { useSenses } from '../hooks/useSenses';
import type { SenseModality } from '../types';

interface SenseCardProps {
  name: string;
  icon: React.ReactNode;
  modality: SenseModality;
  isActive: boolean;
  latestPercept: unknown;
  perceptCount: number;
  onToggle: () => void;
  description: string;
}

const SenseCard: React.FC<SenseCardProps> = ({
  name,
  icon,
  modality,
  isActive,
  latestPercept,
  perceptCount,
  onToggle,
  description,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      aria-labelledby={`sense-${modality}-title`}
      aria-describedby={`sense-${modality}-desc`}
      className={`
        relative overflow-hidden rounded-2xl p-6 transition-all duration-300
        focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-900
        ${isActive 
          ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-400/50' 
          : 'bg-gray-800/50 border border-gray-700/50'
        }
      `}
    >
      {/* Status indicator */}
      <div 
        className={`absolute top-4 right-4 w-3 h-3 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}
        role="status"
        aria-label={isActive ? `${name} actif` : `${name} inactif`}
      />
      
      {/* Icon and title */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl" role="img" aria-label={name}>{icon}</span>
        <div>
          <h3 id={`sense-${modality}-title`} className="text-xl font-bold text-white">{name}</h3>
          <p id={`sense-${modality}-desc`} className="text-sm text-gray-300">{description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4" role="group" aria-label="Statistiques">
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-gray-300 uppercase">Status</p>
          <p className={`text-lg font-semibold ${isActive ? 'text-green-400' : 'text-gray-400'}`}>
            {isActive ? 'Actif' : 'Inactif'}
          </p>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-gray-300 uppercase">Percepts</p>
          <p className="text-lg font-semibold text-blue-400">{perceptCount}</p>
        </div>
      </div>

      {/* Latest percept preview */}
      {latestPercept && (
        <div className="mb-4">
          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls={`percept-${modality}-preview`}
            className="text-xs text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            {expanded ? '▼ Masquer' : '▶ Voir dernier percept'}
          </button>
          {expanded && (
            <pre 
              id={`percept-${modality}-preview`}
              className="mt-2 p-3 bg-black/30 rounded-lg text-xs text-gray-300 overflow-auto max-h-32"
              aria-label="Dernier percept reçu"
            >
              {JSON.stringify(latestPercept, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={onToggle}
        aria-pressed={isActive}
        aria-label={isActive ? `Désactiver ${name}` : `Activer ${name}`}
        className={`
          w-full py-2 px-4 rounded-lg font-medium transition-all
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
          ${isActive 
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
            : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
          }
        `}
      >
        {isActive ? 'Désactiver' : 'Activer'}
      </button>
    </article>
  );
};

export const SensesDashboard: React.FC = () => {
  const {
    percepts,
    status,
    latestPercepts,
    isReady,
    enableSense,
    disableSense,
    triggerHaptic,
    refreshWeather,
    refreshAirQuality,
    getLocation,
    recordError,
    startTask,
    endTask,
  } = useSenses({
    enableTouch: true,
    enableProprioception: true,
    enableEnvironment: false,
    enableVision: false,
    enableHearing: false,
  });

  const senses = [
    {
      modality: 'vision' as SenseModality,
      name: 'Vision',
      icon: '👁️',
      description: 'Caméra, reconnaissance visuelle',
    },
    {
      modality: 'hearing' as SenseModality,
      name: 'Ouïe',
      icon: '👂',
      description: 'Microphone, voix, sons',
    },
    {
      modality: 'touch' as SenseModality,
      name: 'Toucher',
      icon: '✋',
      description: 'Souris, clavier, capteurs',
    },
    {
      modality: 'environment' as SenseModality,
      name: 'Environnement',
      icon: '🌍',
      description: 'Météo, qualité air, position',
    },
    {
      modality: 'proprioception' as SenseModality,
      name: 'Proprioception',
      icon: '💭',
      description: 'État système, conscience de soi',
    },
  ];

  const handleToggle = async (modality: SenseModality, isActive: boolean) => {
    if (isActive) {
      disableSense(modality);
    } else {
      await enableSense(modality);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">🧠</span>
          <div>
            <h1 className="text-4xl font-bold text-white">Les 5 Sens de Lisa</h1>
            <p className="text-gray-400">Perception multi-modale en temps réel</p>
          </div>
        </div>
        
        {/* Global status */}
        <div className="flex items-center gap-4 mt-4">
          <div className={`px-4 py-2 rounded-full ${isReady ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
            {isReady ? '✓ Système prêt' : '◌ Initialisation...'}
          </div>
          <div className="text-gray-500">
            {Object.values(status).filter(Boolean).length}/5 sens actifs
          </div>
        </div>
      </div>

      {/* Senses Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {senses.map(sense => (
          <SenseCard
            key={sense.modality}
            modality={sense.modality}
            name={sense.name}
            icon={sense.icon}
            description={sense.description}
            isActive={status[sense.modality]}
            latestPercept={latestPercepts[sense.modality]}
            perceptCount={percepts[sense.modality].length}
            onToggle={() => handleToggle(sense.modality, status[sense.modality])}
          />
        ))}
      </div>

      {/* Actions Panel */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => triggerHaptic('vibrate', 0.5)}
            className="p-4 bg-purple-500/20 rounded-xl text-purple-400 hover:bg-purple-500/30 transition-all"
          >
            📳 Vibration
          </button>
          <button
            onClick={() => void refreshWeather()}
            className="p-4 bg-blue-500/20 rounded-xl text-blue-400 hover:bg-blue-500/30 transition-all"
          >
            🌤️ Météo
          </button>
          <button
            onClick={() => void refreshAirQuality()}
            className="p-4 bg-green-500/20 rounded-xl text-green-400 hover:bg-green-500/30 transition-all"
          >
            💨 Qualité air
          </button>
          <button
            onClick={() => {
              const loc = getLocation();
              if (loc) alert(`Position: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
              else alert('Position non disponible');
            }}
            className="p-4 bg-orange-500/20 rounded-xl text-orange-400 hover:bg-orange-500/30 transition-all"
          >
            📍 Position
          </button>
          <button
            onClick={() => startTask('test-agent')}
            className="p-4 bg-cyan-500/20 rounded-xl text-cyan-400 hover:bg-cyan-500/30 transition-all"
          >
            ▶️ Démarrer tâche
          </button>
          <button
            onClick={() => endTask('test-agent')}
            className="p-4 bg-teal-500/20 rounded-xl text-teal-400 hover:bg-teal-500/30 transition-all"
          >
            ⏹️ Terminer tâche
          </button>
          <button
            onClick={() => recordError()}
            className="p-4 bg-red-500/20 rounded-xl text-red-400 hover:bg-red-500/30 transition-all"
          >
            ⚠️ Logger erreur
          </button>
          <button
            onClick={async () => {
              await Promise.all([
                enableSense('vision'),
                enableSense('hearing'),
                enableSense('touch'),
                enableSense('environment'),
                enableSense('proprioception'),
              ]);
            }}
            className="p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl text-white hover:from-blue-500/30 hover:to-purple-500/30 transition-all"
          >
            🚀 Activer tous
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="max-w-7xl mx-auto mt-8 p-6 bg-gray-800/50 rounded-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Légende des sens</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">👁️</span>
            <div>
              <p className="text-white font-medium">Vision</p>
              <p className="text-gray-400">Détection d'objets, visages, gestes, poses via caméra</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">👂</span>
            <div>
              <p className="text-white font-medium">Ouïe</p>
              <p className="text-gray-400">Reconnaissance vocale, émotions audio, classification sons</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">✋</span>
            <div>
              <p className="text-white font-medium">Toucher</p>
              <p className="text-gray-400">Entrées souris/clavier, gestes tactiles, capteurs IoT</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🌍</span>
            <div>
              <p className="text-white font-medium">Environnement</p>
              <p className="text-gray-400">Météo, qualité air (AQI, CO2), géolocalisation, lumière</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💭</span>
            <div>
              <p className="text-white font-medium">Proprioception</p>
              <p className="text-gray-400">CPU, mémoire, état agents, capacités, humeur simulée</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensesDashboard;
