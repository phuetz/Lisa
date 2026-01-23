/**
 * useSecurity - Hook for interacting with SecurityAgent
 */

import { useState, useCallback } from 'react';
import { agentRegistry } from '../features/agents/core/registry';

export const useSecurity = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityScore, setSecurityScore] = useState<number | null>(null);

  const scanSecurity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('SecurityAgent');
      if (!agent) throw new Error('SecurityAgent not found');
      
      const result = await agent.execute({
        intent: 'scan_security',
        parameters: {}
      });
      
      if (result.success && result.output) {
        setSecurityScore(result.output.score);
      }
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Security scan failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const detectRisks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('SecurityAgent');
      if (!agent) throw new Error('SecurityAgent not found');
      
      const result = await agent.execute({
        intent: 'detect_risks',
        parameters: {}
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Risk detection failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const getRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('SecurityAgent');
      if (!agent) throw new Error('SecurityAgent not found');
      
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

  const checkCompliance = useCallback(async (standard: string = 'OWASP') => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('SecurityAgent');
      if (!agent) throw new Error('SecurityAgent not found');
      
      const result = await agent.execute({
        intent: 'check_compliance',
        parameters: { standard }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Compliance check failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  return {
    loading,
    error,
    securityScore,
    scanSecurity,
    detectRisks,
    getRecommendations,
    checkCompliance
  };
};
