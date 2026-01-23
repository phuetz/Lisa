/**
 * useDataAnalysis - Hook for interacting with DataAnalysisAgent
 */

import { useState, useCallback } from 'react';
import { agentRegistry } from '../features/agents/core/registry';

export const useDataAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeData = useCallback(async (data: number[], analysisType: string = 'comprehensive') => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('DataAnalysisAgent');
      if (!agent) throw new Error('DataAnalysisAgent not found');
      
      const result = await agent.execute({
        intent: 'analyze_data',
        parameters: { data, analysisType }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Data analysis failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const calculateStatistics = useCallback(async (data: number[]) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('DataAnalysisAgent');
      if (!agent) throw new Error('DataAnalysisAgent not found');
      
      const result = await agent.execute({
        intent: 'calculate_statistics',
        parameters: { data }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Statistics calculation failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const detectTrends = useCallback(async (data: number[]) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('DataAnalysisAgent');
      if (!agent) throw new Error('DataAnalysisAgent not found');
      
      const result = await agent.execute({
        intent: 'detect_trends',
        parameters: { data }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Trend detection failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const findCorrelations = useCallback(async (dataX: number[], dataY: number[]) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('DataAnalysisAgent');
      if (!agent) throw new Error('DataAnalysisAgent not found');
      
      const result = await agent.execute({
        intent: 'find_correlations',
        parameters: { dataX, dataY }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Correlation analysis failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const detectOutliers = useCallback(async (data: number[]) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('DataAnalysisAgent');
      if (!agent) throw new Error('DataAnalysisAgent not found');
      
      const result = await agent.execute({
        intent: 'detect_outliers',
        parameters: { data }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Outlier detection failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  return {
    loading,
    error,
    analyzeData,
    calculateStatistics,
    detectTrends,
    findCorrelations,
    detectOutliers
  };
};
