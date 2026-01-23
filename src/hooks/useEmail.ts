/**
 * useEmail - Hook for interacting with EmailAgent
 */

import { useState, useCallback } from 'react';
import { agentRegistry } from '../features/agents/core/registry';

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: number;
  read: boolean;
}

export const useEmail = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classifyEmail = useCallback(async (email: Email) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('EmailAgent');
      if (!agent) throw new Error('EmailAgent not found');
      
      const result = await agent.execute({
        intent: 'classify_email',
        parameters: { email }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Classification failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const suggestResponse = useCallback(async (email: Email) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('EmailAgent');
      if (!agent) throw new Error('EmailAgent not found');
      
      const result = await agent.execute({
        intent: 'suggest_response',
        parameters: { email }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Suggestion failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const detectSpam = useCallback(async (email: Email) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('EmailAgent');
      if (!agent) throw new Error('EmailAgent not found');
      
      const result = await agent.execute({
        intent: 'detect_spam',
        parameters: { email }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Spam detection failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const generateReply = useCallback(async (email: Email, tone: 'professional' | 'casual' | 'formal' = 'professional') => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('EmailAgent');
      if (!agent) throw new Error('EmailAgent not found');
      
      const result = await agent.execute({
        intent: 'generate_reply',
        parameters: { email, tone }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Reply generation failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  return {
    loading,
    error,
    classifyEmail,
    suggestResponse,
    detectSpam,
    generateReply
  };
};
