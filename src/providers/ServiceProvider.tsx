/**
 * ServiceProvider - Initializes background services
 *
 * Extracts service initialization logic from App.tsx
 */

import { useEffect } from 'react';
import { proactiveSuggestionsService } from '../services/ProactiveSuggestionsService';
import { healthMonitoringService } from '../services/HealthMonitoringService';
import { pyodideService } from '../services/PyodideService';

interface ServiceProviderProps {
  children: React.ReactNode;
}

export function ServiceProvider({ children }: ServiceProviderProps) {
  /* ---------- Service Initialization ---------- */

  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize Pyodide for Python execution
        await pyodideService.initialize();
        console.log('[ServiceProvider] Pyodide initialized');

        // Start health monitoring
        healthMonitoringService.start();
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
      // Cleanup
      healthMonitoringService.stop?.();
    };
  }, []);

  return <>{children}</>;
}
