/**
 * useHealthMonitor - Hook for interacting with HealthMonitorAgent
 */

import { useState, useCallback } from 'react';
import { agentRegistry } from '../features/agents/core/registry';

export const useHealthMonitor = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackMetric = useCallback(async (metric: string, value: number, unit?: string) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('HealthMonitorAgent');
      if (!agent) throw new Error('HealthMonitorAgent not found');
      
      const result = await agent.execute({
        intent: 'track_metric',
        parameters: { metric, value, unit }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Metric tracking failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const getRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('HealthMonitorAgent');
      if (!agent) throw new Error('HealthMonitorAgent not found');
      
      const result = await agent.execute({
        intent: 'get_recommendations',
        parameters: {}
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get recommendations';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  return {
    loading,
    error,
    trackMetric,
    getRecommendations
  };
};
