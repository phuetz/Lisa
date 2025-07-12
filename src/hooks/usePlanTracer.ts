/**
 * usePlanTracer.ts
 * 
 * Hook React pour accéder aux traces d'exécution du PlannerAgent
 * depuis les composants d'interface utilisateur.
 */

import { useState, useEffect, useCallback } from 'react';
import { planTracer, type PlanTrace, type TraceStep } from '../utils/planTracer';

interface UsePlanTracerResult {
  /**
   * Toutes les traces disponibles
   */
  traces: PlanTrace[];
  
  /**
   * Trace actuellement sélectionnée
   */
  selectedTrace: PlanTrace | null;
  
  /**
   * Sélectionner une trace par son ID
   */
  selectTrace: (traceId: string) => void;
  
  /**
   * Obtenir une trace spécifique par son ID
   */
  getTrace: (traceId: string) => PlanTrace | null;
  
  /**
   * Supprimer une trace spécifique
   */
  deleteTrace: (traceId: string) => void;
  
  /**
   * Nettoyer les traces anciennes
   */
  cleanupTraces: () => void;
  
  /**
   * Obtenir des statistiques sur les traces
   */
  getTracesStats: () => {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
    averageStepCount: number;
  };
  
  /**
   * État de chargement
   */
  loading: boolean;
}

/**
 * Hook pour accéder aux traces d'exécution des plans
 * 
 * @param options - Options de configuration
 * @returns Interface pour interagir avec les traces
 */
export function usePlanTracer(options: {
  refreshInterval?: number;
  limit?: number;
} = {}): UsePlanTracerResult {
  const [traces, setTraces] = useState<PlanTrace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<PlanTrace | null>(null);
  const [loading, setLoading] = useState(true);

  // Configurer les valeurs par défaut
  const refreshInterval = options.refreshInterval || 5000; // 5 secondes
  const limit = options.limit || 20;

  // Charger et mettre à jour les traces
  const refreshTraces = useCallback(() => {
    setLoading(true);
    
    // Récupérer les traces récentes
    const recentTraces = planTracer.getRecentTraces(limit);
    setTraces(recentTraces);
    
    // Mettre à jour la trace sélectionnée si elle existe
    if (selectedTrace) {
      const updatedTrace = planTracer.getTrace(selectedTrace.id);
      if (updatedTrace) {
        setSelectedTrace(updatedTrace);
      }
    }
    
    setLoading(false);
  }, [limit, selectedTrace]);

  // Sélectionner une trace par son ID
  const selectTrace = useCallback((traceId: string) => {
    const trace = planTracer.getTrace(traceId);
    setSelectedTrace(trace);
  }, []);

  // Obtenir une trace spécifique
  const getTrace = useCallback((traceId: string) => {
    return planTracer.getTrace(traceId);
  }, []);

  // Supprimer une trace
  const deleteTrace = useCallback((traceId: string) => {
    const deleted = planTracer.deleteTrace(traceId);
    if (deleted && selectedTrace?.id === traceId) {
      setSelectedTrace(null);
    }
    
    // Actualiser la liste
    refreshTraces();
  }, [selectedTrace, refreshTraces]);

  // Nettoyer les traces anciennes
  const cleanupTraces = useCallback(() => {
    planTracer.cleanup();
    refreshTraces();
  }, [refreshTraces]);

  // Calculer des statistiques sur les traces
  const getTracesStats = useCallback(() => {
    const total = traces.length;
    
    if (total === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        averageDuration: 0,
        averageStepCount: 0,
      };
    }
    
    const successful = traces.filter(t => 
      t.steps.some(s => s.operation === 'plan_execution' && s.details.metadata?.success === true)
    ).length;
    
    const failed = total - successful;
    
    const durations = traces
      .filter(t => t.endTime && t.startTime)
      .map(t => (t.endTime as number) - t.startTime);
    
    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;
    
    const averageStepCount = traces.reduce((sum, t) => sum + t.steps.length, 0) / total;
    
    return {
      total,
      successful,
      failed,
      averageDuration,
      averageStepCount,
    };
  }, [traces]);

  // Configurer l'actualisation périodique
  useEffect(() => {
    // Charger les traces initiales
    refreshTraces();
    
    // Configurer l'actualisation périodique
    const intervalId = setInterval(refreshTraces, refreshInterval);
    
    // Nettoyer l'intervalle lors du démontage
    return () => clearInterval(intervalId);
  }, [refreshInterval, refreshTraces]);

  return {
    traces,
    selectedTrace,
    selectTrace,
    getTrace,
    deleteTrace,
    cleanupTraces,
    getTracesStats,
    loading,
  };
}

export default usePlanTracer;
