/**
 * 🌟 App With Lisa Vivante
 * Application wrapper qui intègre Lisa Vivante
 */

import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { LisaNavigation } from './LisaNavigation';
import { initLisaVivante, getLisaStats } from '../manifesto/initLisaVivante';
import { validateLisaIsAlive } from '../manifesto/validation';
import { toast } from 'sonner';

export function AppWithLisaVivante() {
  const [isLisaInitialized, setIsLisaInitialized] = useState(false);
  const [lisaStatus, setLisaStatus] = useState<'alive' | 'degraded' | 'unknown'>('unknown');

  useEffect(() => {
    const initializeLisa = async () => {
      try {
        console.log('🚀 Initializing Lisa Vivante...');
        
        // Initialiser Lisa
        const state = await initLisaVivante({
          enableSensors: true,
          enableAudit: true,
          enableMemory: true,
          debugMode: import.meta.env.DEV,
          autoValidate: true,
          validationInterval: 30000
        });

        setIsLisaInitialized(true);
        console.log('✅ Lisa Vivante initialized:', state);

        // Valider le statut
        const validation = await validateLisaIsAlive();
        if (validation.isAlive) {
          setLisaStatus('alive');
          toast.success('Lisa est Vivante! Tous les piliers sont actifs.');
        } else {
          setLisaStatus('degraded');
          toast.warning('Lisa est en mode dégradé. Certains piliers sont inactifs.');
        }

        // Afficher les statistiques
        const stats = getLisaStats();
        console.log('📊 Lisa Stats:', stats);

      } catch (error) {
        console.error('❌ Failed to initialize Lisa Vivante:', error);
        toast.error('Erreur lors de l\'initialisation de Lisa Vivante');
        setLisaStatus('unknown');
      }
    };

    initializeLisa();

    // Validation périodique
    const intervalId = setInterval(async () => {
      if (isLisaInitialized) {
        const validation = await validateLisaIsAlive();
        setLisaStatus(validation.isAlive ? 'alive' : 'degraded');
      }
    }, 60000); // Toutes les minutes

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <LisaNavigation />

      {/* Main Content */}
      <div className="md:ml-64 min-h-screen">
        {/* Status Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                lisaStatus === 'alive' ? 'bg-green-500 animate-pulse' :
                lisaStatus === 'degraded' ? 'bg-yellow-500' :
                'bg-gray-400'
              }`} />
              <span className="text-sm font-medium">
                {lisaStatus === 'alive' ? 'Lisa est Vivante' :
                 lisaStatus === 'degraded' ? 'Mode Dégradé' :
                 'Initialisation...'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {new Date().toLocaleString('fr-FR')}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        theme="light"
        richColors
        closeButton
        expand
      />
    </div>
  );
}
