/**
 * ServiceProvider - Initializes background services
 *
 * Uses dynamic imports to keep services out of the main bundle.
 */

import { useEffect } from 'react';

interface ServiceProviderProps {
  children: React.ReactNode;
}

export function ServiceProvider({ children }: ServiceProviderProps) {
  /* ---------- Service Initialization ---------- */

  useEffect(() => {
    let healthStop: (() => void) | undefined;

    const initializeServices = async () => {
      try {
        // Dynamic imports keep these services out of the main chunk
        const [
          { pyodideService },
          { healthMonitoringService },
          { proactiveSuggestionsService },
        ] = await Promise.all([
          import('../services/PyodideService'),
          import('../services/HealthMonitoringService'),
          import('../services/ProactiveSuggestionsService'),
        ]);

        // Load knowledge graph from localStorage
        try {
          const { getKnowledgeGraph } = await import('../services/KnowledgeGraphService');
          const kg = getKnowledgeGraph();
          const loaded = kg.load();
          console.log('[ServiceProvider] Knowledge graph loaded:', loaded ? `${kg.stats().tripleCount} triples` : 'empty');
        } catch (e) {
          console.debug('[ServiceProvider] Knowledge graph load failed:', e);
        }

        // Initialize Pyodide for Python execution
        await pyodideService.preload();
        console.log('[ServiceProvider] Pyodide initialized');

        // Start health monitoring
        healthMonitoringService.start();
        healthStop = () => healthMonitoringService.stop?.();
        console.log('[ServiceProvider] Health monitoring started');

        // Initialize proactive suggestions
        if (proactiveSuggestionsService.initialize) {
          proactiveSuggestionsService.initialize();
        }
        console.log('[ServiceProvider] Proactive suggestions initialized');
      } catch (error) {
        console.error('[ServiceProvider] Failed to initialize services:', error);
      }
    };

    initializeServices();

    return () => {
      healthStop?.();
    };
  }, []);

  return <>{children}</>;
}
