/**
 * 📊 Hook pour les statistiques du Dashboard
 * Fournit un accès réactif aux stats des agents
 */

import { useState, useEffect, useCallback } from 'react';
import { agentStatsService, type DashboardStats } from '../services/AgentStatsService';

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    const loadStats = () => {
      const newStats = agentStatsService.getStats();
      setStats(newStats);
      setIsLoading(false);
      setLastRefresh(new Date());
    };

    loadStats();
    const unsubscribe = agentStatsService.subscribe(setStats);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    const newStats = agentStatsService.getStats();
    setStats(newStats);
    setIsLoading(false);
    setLastRefresh(new Date());
  }, []);

  const recordActivity = useCallback((
    agentName: string,
    action: string,
    status: 'success' | 'pending' | 'error',
    duration?: number
  ) => {
    agentStatsService.recordActivity(agentName, action, status, duration);
  }, []);

  return {
    stats,
    isLoading,
    lastRefresh,
    refresh,
    recordActivity,
  };
}
