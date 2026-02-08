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
