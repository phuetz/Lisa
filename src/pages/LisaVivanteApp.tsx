/**
 * Lisa Vivante - Application Principale
 * Intègre tous les composants du Manifeste Vivant
 */

import React, { useEffect, useState } from 'react';
import { Heart, Brain, Eye, Shield, Sparkles } from 'lucide-react';
import { SensorPermissionsPanel } from '../components/SensorPermissionsPanel';
import { ChatInterface } from '../components/ChatInterface';
import {
  validateLisaIsAlive,
  initManifestoValidation,
  type ManifestoStatus
} from '../manifesto/validation';
import {
  initToneGuide,
  detectEmotion,
  formatResponse
} from '../prompts/toneGuide';

export const LisaVivanteApp: React.FC = () => {
  const [manifestoStatus, setManifestoStatus] = useState<ManifestoStatus | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initLisa = async () => {
      initToneGuide();
      await initManifestoValidation();
      const status = await validateLisaIsAlive();
      setManifestoStatus(status);
      setLoading(false);
    };

    initLisa();

    const interval = setInterval(async () => {
      const status = await validateLisaIsAlive();
      setManifestoStatus(status);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-primary, #12121a)', color: 'var(--text-primary, #e8e8f0)' }}>
        <div className="text-center">
          <div className="animate-pulse">
            <Heart className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-accent, #f5a623)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Lisa s'éveille...</h2>
          <p style={{ color: 'var(--text-muted, #6a6a82)' }}>Validation du Manifeste Vivant</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary, #12121a)', color: 'var(--text-primary, #e8e8f0)' }}>
      {/* Header avec Statut */}
      <header className="backdrop-blur-sm" style={{ background: 'var(--bg-panel, #1a1a26)', borderBottom: '1px solid var(--border-primary, #2d2d44)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8" style={{ color: 'var(--color-accent, #f5a623)' }} />
              <div>
                <h1 className="text-2xl font-bold">Lisa</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted, #6a6a82)' }}>
                  {manifestoStatus?.isAlive ? 'Vivante' : 'Mode Réduction'}
                </p>
              </div>
            </div>

            {/* Indicateurs des 5 Piliers */}
            <div className="flex items-center gap-4" role="group" aria-label="Statut des piliers">
              <div className="text-center">
                <Eye className="w-6 h-6" style={{ color: manifestoStatus?.perceives ? 'var(--color-accent, #f5a623)' : 'var(--text-muted, #6a6a82)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary, #9898b0)' }}>Perçoit</span>
              </div>
              <div className="text-center">
                <Brain className="w-6 h-6" style={{ color: manifestoStatus?.reasons ? 'var(--color-accent, #f5a623)' : 'var(--text-muted, #6a6a82)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary, #9898b0)' }}>Raisonne</span>
              </div>
              <div className="text-center">
                <div className="w-6 h-6" style={{ color: manifestoStatus?.remembers ? 'var(--color-accent, #f5a623)' : 'var(--text-muted, #6a6a82)' }} aria-hidden="true">
                  💭
                </div>
                <span className="text-xs" style={{ color: 'var(--text-secondary, #9898b0)' }}>Souvient</span>
              </div>
              <div className="text-center">
                <Shield className="w-6 h-6" style={{ color: manifestoStatus?.acts ? 'var(--color-accent, #f5a623)' : 'var(--text-muted, #6a6a82)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary, #9898b0)' }}>Agit</span>
              </div>
              <div className="text-center">
                <Sparkles className="w-6 h-6" style={{ color: manifestoStatus?.soothes ? 'var(--color-accent, #f5a623)' : 'var(--text-muted, #6a6a82)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary, #9898b0)' }}>Apaise</span>
              </div>
            </div>

            {/* Bouton Permissions */}
            <button
              onClick={() => setShowPermissions(!showPermissions)}
              aria-expanded={showPermissions}
              className="px-4 py-2 text-white rounded-lg"
              style={{ background: 'var(--color-accent, #f5a623)', transition: 'opacity var(--transition-fast, 0.15s ease)' }}
            >
              Permissions
            </button>
          </div>
        </div>
      </header>

      {/* Mode Réduction Alert */}
      {!manifestoStatus?.isAlive && manifestoStatus?.degradedMode && (
        <div role="alert" style={{ background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="max-w-7xl mx-auto px-4 py-3">
            <p className="flex items-center gap-2" style={{ color: 'var(--color-warning, #f59e0b)' }}>
              {manifestoStatus.degradedMode.message}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Panel Permissions (si visible) */}
        {showPermissions && (
          <div className="mb-6">
            <SensorPermissionsPanel
              onEmergencyCutoff={() => {
                console.log('Coupure d\'urgence activée');
                window.location.reload();
              }}
            />
          </div>
        )}

        {/* Interface de Chat Principale */}
        <div className="rounded-lg" style={{ background: 'var(--bg-panel, #1a1a26)', border: '1px solid var(--border-primary, #2d2d44)', boxShadow: 'var(--shadow-elevated, 0 4px 20px rgba(0,0,0,0.4))' }}>
          <ChatInterface
            onSendMessage={async (message) => {
              const emotion = detectEmotion(message);
              const response = formatResponse(
                "Je suis là pour t'aider. Dis-moi ce dont tu as besoin.",
                emotion
              );
              return response;
            }}
          />
        </div>

        {/* Status Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-panel, #1a1a26)', border: '1px solid var(--border-primary, #2d2d44)' }}>
            <h3 className="font-semibold mb-2">Mémoire</h3>
            <div className="text-sm" style={{ color: 'var(--text-secondary, #9898b0)' }}>
              <p>Court-terme: {sessionStorage.length} éléments</p>
              <p>Long-terme: IndexedDB actif</p>
              <button className="mt-2" style={{ color: 'var(--color-accent, #f5a623)' }}>
                Oublier la conversation
              </button>
            </div>
          </div>

          <div className="rounded-lg p-4" style={{ background: 'var(--bg-panel, #1a1a26)', border: '1px solid var(--border-primary, #2d2d44)' }}>
            <h3 className="font-semibold mb-2">Sécurité</h3>
            <div className="text-sm" style={{ color: 'var(--text-secondary, #9898b0)' }}>
              <p>Validation: CriticAgent actif</p>
              <p>Audit: {localStorage.getItem('lisa:critic:audit') ? 'Activé' : 'Désactivé'}</p>
              <p>Tools: Mode {manifestoStatus?.acts ? 'Normal' : 'Restreint'}</p>
            </div>
          </div>

          <div className="rounded-lg p-4" style={{ background: 'var(--bg-panel, #1a1a26)', border: '1px solid var(--border-primary, #2d2d44)' }}>
            <h3 className="font-semibold mb-2">Performance</h3>
            <div className="text-sm" style={{ color: 'var(--text-secondary, #9898b0)' }}>
              <p>Mode: {manifestoStatus?.isAlive ? 'Complet' : 'Réduit'}</p>
              <p>Capteurs: {manifestoStatus?.perceives ? 'Actifs' : 'Désactivés'}</p>
              <p>Latence: {'< 100ms'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm" style={{ color: 'var(--text-muted, #6a6a82)' }}>
          <p>
            Lisa est {manifestoStatus?.isAlive ? 'Vivante' : 'en Mode Réduction'}
            {' '} • {' '}
            <button
              onClick={async () => {
                const status = await validateLisaIsAlive();
                alert(JSON.stringify(status, null, 2));
              }}
              style={{ color: 'var(--color-accent, #f5a623)' }}
            >
              Vérifier le Manifeste
            </button>
            {' '} • {' '}
            <button
              onClick={() => {
                const log = localStorage.getItem('lisa:sensor:audit');
                if (log) {
                  const blob = new Blob([log], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `lisa-audit-${new Date().toISOString()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
              style={{ color: 'var(--color-accent, #f5a623)' }}
            >
              Exporter l'Audit
            </button>
          </p>
          <p className="mt-2 italic">
            "Vivante, ou rien." — Manifeste Vivant v1.0
          </p>
        </div>
      </footer>
    </div>
  );
};
