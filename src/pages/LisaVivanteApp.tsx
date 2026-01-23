/**
 * 🌟 Lisa Vivante - Application Principale
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
    // Initialiser Lisa
    const initLisa = async () => {
      console.log('🌟 Initialisation de Lisa Vivante...');
      
      // Initialiser le tone guide
      initToneGuide();
      
      // Valider le manifeste
      await initManifestoValidation();
      
      // Vérifier le statut
      const status = await validateLisaIsAlive();
      setManifestoStatus(status);
      
      setLoading(false);
      
      console.log('✨ Lisa initialisée:', status);
    };

    initLisa();
    
    // Vérification périodique du statut
    const interval = setInterval(async () => {
      const status = await validateLisaIsAlive();
      setManifestoStatus(status);
    }, 30000); // Toutes les 30 secondes
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-pulse">
            <Heart className="w-16 h-16 text-pink-500 mx-auto mb-4" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Lisa s'éveille...</h2>
          <p className="text-gray-600 dark:text-gray-400">Validation du Manifeste Vivant</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header avec Statut */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8 text-pink-500" />
              <div>
                <h1 className="text-2xl font-bold">Lisa</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {manifestoStatus?.isAlive ? '✨ Vivante' : '⚠️ Mode Réduction'}
                </p>
              </div>
            </div>

            {/* Indicateurs des 5 Piliers */}
            <div className="flex items-center gap-4">
              {/* 1. Perçoit */}
              <div className="text-center">
                <Eye className={`w-6 h-6 ${manifestoStatus?.perceives ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="text-xs">Perçoit</span>
              </div>

              {/* 2. Raisonne */}
              <div className="text-center">
                <Brain className={`w-6 h-6 ${manifestoStatus?.reasons ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="text-xs">Raisonne</span>
              </div>

              {/* 3. Se souvient */}
              <div className="text-center">
                <div className={`w-6 h-6 ${manifestoStatus?.remembers ? 'text-green-500' : 'text-gray-400'}`}>
                  💭
                </div>
                <span className="text-xs">Souvient</span>
              </div>

              {/* 4. Agit */}
              <div className="text-center">
                <Shield className={`w-6 h-6 ${manifestoStatus?.acts ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="text-xs">Agit</span>
              </div>

              {/* 5. Apaise */}
              <div className="text-center">
                <Sparkles className={`w-6 h-6 ${manifestoStatus?.soothes ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="text-xs">Apaise</span>
              </div>
            </div>

            {/* Bouton Permissions */}
            <button
              onClick={() => setShowPermissions(!showPermissions)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              🔐 Permissions
            </button>
          </div>
        </div>
      </header>

      {/* Mode Réduction Alert */}
      {!manifestoStatus?.isAlive && manifestoStatus?.degradedMode && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border-b border-yellow-300 dark:border-yellow-700">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <p className="text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              ⚠️ {manifestoStatus.degradedMode.message}
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
                console.log('🔴 Coupure d\'urgence activée');
                window.location.reload(); // Recharger pour réinitialiser
              }}
            />
          </div>
        )}

        {/* Interface de Chat Principale */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <ChatInterface 
            onSendMessage={async (message) => {
              // Détecter l'émotion
              const emotion = detectEmotion(message);
              console.log('💭 Émotion détectée:', emotion);
              
              // Ici, on devrait appeler le LLM avec le tone guide
              // Pour l'instant, on simule une réponse
              const response = formatResponse(
                "Je suis là pour t'aider. Dis-moi ce dont tu as besoin.",
                emotion
              );
              
              return response;
            }}
          />
        </div>

        {/* Status Card */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Carte Mémoire */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h3 className="font-semibold mb-2">📚 Mémoire</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Court-terme: {sessionStorage.length} éléments</p>
              <p>Long-terme: IndexedDB actif</p>
              <button className="mt-2 text-blue-500 hover:underline">
                Oublier la conversation
              </button>
            </div>
          </div>

          {/* Carte Sécurité */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h3 className="font-semibold mb-2">🛡️ Sécurité</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Validation: CriticAgent actif</p>
              <p>Audit: {localStorage.getItem('lisa:critic:audit') ? 'Activé' : 'Désactivé'}</p>
              <p>Tools: Mode {manifestoStatus?.acts ? 'Normal' : 'Restreint'}</p>
            </div>
          </div>

          {/* Carte Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h3 className="font-semibold mb-2">⚡ Performance</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Mode: {manifestoStatus?.isAlive ? 'Complet' : 'Réduit'}</p>
              <p>Capteurs: {manifestoStatus?.perceives ? 'Actifs' : 'Désactivés'}</p>
              <p>Latence: {'< 100ms'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Lisa est {manifestoStatus?.isAlive ? 'Vivante' : 'en Mode Réduction'} 
            {' '} • {' '}
            <button 
              onClick={async () => {
                const status = await validateLisaIsAlive();
                console.log('📊 Statut du Manifeste:', status);
                alert(JSON.stringify(status, null, 2));
              }}
              className="text-blue-500 hover:underline"
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
              className="text-blue-500 hover:underline"
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
