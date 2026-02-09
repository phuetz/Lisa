/**
 * LES 5 SENS DE LISA - Dashboard de Visualisation
 * AudioReader Studio design - inline styles + CSS variables
 */

import React, { useState } from 'react';
import {
  Eye, Ear, Hand, Globe, Brain,
  Zap, MapPin, Wind, CloudSun, Play, Square,
  AlertTriangle, Rocket, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useSenses } from '../hooks/useSenses';
import type { SenseModality } from '../types';

interface SenseCardProps {
  name: string;
  icon: React.ElementType;
  color: string;
  modality: SenseModality;
  isActive: boolean;
  latestPercept: unknown;
  perceptCount: number;
  onToggle: () => void;
  description: string;
}

const SenseCard: React.FC<SenseCardProps> = ({
  name,
  icon: Icon,
  color,
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
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: `1px solid ${isActive ? color + '40' : 'var(--border-primary)'}`,
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Status dot */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: isActive ? 'var(--color-green, #22c55e)' : 'var(--text-muted)',
        }}
      />

      {/* Icon + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            backgroundColor: color + '15',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={26} color={color} />
        </div>
        <div>
          <h3
            id={`sense-${modality}-title`}
            style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}
          >
            {name}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            {description}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '10px',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Status</p>
          <p style={{
            fontSize: '15px',
            fontWeight: 600,
            color: isActive ? 'var(--color-green, #22c55e)' : 'var(--text-muted)',
            margin: '4px 0 0 0',
          }}>
            {isActive ? 'Actif' : 'Inactif'}
          </p>
        </div>
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '10px',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Percepts</p>
          <p style={{
            fontSize: '15px',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: color,
            margin: '4px 0 0 0',
          }}>
            {perceptCount}
          </p>
        </div>
      </div>

      {/* Latest percept preview */}
      {latestPercept && (
        <div style={{ marginBottom: '14px' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              padding: 0,
            }}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {expanded ? 'Masquer' : 'Voir dernier percept'}
          </button>
          {expanded && (
            <pre style={{
              marginTop: '8px',
              padding: '12px',
              backgroundColor: 'var(--bg-deep)',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              overflow: 'auto',
              maxHeight: '120px',
              border: '1px solid var(--border-primary)',
            }}>
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
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '10px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
          backgroundColor: isActive ? 'rgba(239, 68, 68, 0.12)' : color + '18',
          color: isActive ? 'var(--color-red, #ef4444)' : color,
        }}
      >
        {isActive ? 'Désactiver' : 'Activer'}
      </button>
    </article>
  );
};

const QuickActionButton = ({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      padding: '16px 12px',
      backgroundColor: color + '12',
      border: '1px solid ' + color + '25',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
    }}
  >
    <Icon size={22} color={color} />
    <span style={{ fontSize: '12px', color, fontWeight: 500 }}>{label}</span>
  </button>
);

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

  const senses: { modality: SenseModality; name: string; icon: React.ElementType; color: string; description: string }[] = [
    { modality: 'vision', name: 'Vision', icon: Eye, color: '#8b5cf6', description: 'Caméra, reconnaissance visuelle' },
    { modality: 'hearing', name: 'Ouïe', icon: Ear, color: '#06b6d4', description: 'Microphone, voix, sons' },
    { modality: 'touch', name: 'Toucher', icon: Hand, color: '#f59e0b', description: 'Souris, clavier, capteurs' },
    { modality: 'environment', name: 'Environnement', icon: Globe, color: '#22c55e', description: 'Météo, qualité air, position' },
    { modality: 'proprioception', name: 'Proprioception', icon: Brain, color: '#ec4899', description: 'État système, conscience de soi' },
  ];

  const activeSensesCount = Object.values(status).filter(Boolean).length;

  const handleToggle = async (modality: SenseModality, isActive: boolean) => {
    if (isActive) {
      disableSense(modality);
    } else {
      await enableSense(modality);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Les 5 Sens
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Perception multi-modale en temps réel
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 500,
            backgroundColor: isReady ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            color: isReady ? 'var(--color-green, #22c55e)' : '#f59e0b',
          }}>
            {isReady ? 'Système prêt' : 'Initialisation...'}
          </span>
          <span style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'var(--bg-panel)',
            color: 'var(--color-accent)',
            border: '1px solid var(--border-primary)',
          }}>
            {activeSensesCount}/5 actifs
          </span>
        </div>
      </div>

      {/* Senses Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
      }}>
        {senses.map(sense => (
          <SenseCard
            key={sense.modality}
            modality={sense.modality}
            name={sense.name}
            icon={sense.icon}
            color={sense.color}
            description={sense.description}
            isActive={status[sense.modality]}
            latestPercept={latestPercepts[sense.modality]}
            perceptCount={percepts[sense.modality].length}
            onToggle={() => handleToggle(sense.modality, status[sense.modality])}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border-primary)',
      }}>
        <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
          Actions rapides
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '12px',
        }}>
          <QuickActionButton icon={Zap} label="Vibration" color="#8b5cf6" onClick={() => triggerHaptic('vibrate', 0.5)} />
          <QuickActionButton icon={CloudSun} label="Météo" color="#3b82f6" onClick={() => void refreshWeather()} />
          <QuickActionButton icon={Wind} label="Qualité air" color="#22c55e" onClick={() => void refreshAirQuality()} />
          <QuickActionButton
            icon={MapPin}
            label="Position"
            color="#f59e0b"
            onClick={() => {
              const loc = getLocation();
              if (loc) alert(`Position: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
              else alert('Position non disponible');
            }}
          />
          <QuickActionButton icon={Play} label="Démarrer tâche" color="#06b6d4" onClick={() => startTask('test-agent')} />
          <QuickActionButton icon={Square} label="Terminer tâche" color="#14b8a6" onClick={() => endTask('test-agent')} />
          <QuickActionButton icon={AlertTriangle} label="Logger erreur" color="#ef4444" onClick={() => recordError()} />
          <QuickActionButton
            icon={Rocket}
            label="Activer tous"
            color="var(--color-accent)"
            onClick={async () => {
              await Promise.all([
                enableSense('vision'),
                enableSense('hearing'),
                enableSense('touch'),
                enableSense('environment'),
                enableSense('proprioception'),
              ]);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SensesDashboard;
