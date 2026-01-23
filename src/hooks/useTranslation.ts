/**
 * useTranslation - Hook for interacting with TranslationAgent
 */

import { useState, useCallback } from 'react';
import { agentRegistry } from '../features/agents/core/registry';

export const useTranslationAgent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(async (text: string, targetLang: string, sourceLang?: string) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('TranslationAgent');
      if (!agent) throw new Error('TranslationAgent not found');
      
      const result = await agent.execute({
        intent: 'translate',
        parameters: { text, targetLang, sourceLang }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const detectLanguage = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('TranslationAgent');
      if (!agent) throw new Error('TranslationAgent not found');
      
      const result = await agent.execute({
        intent: 'detect_language',
        parameters: { text }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Language detection failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const batchTranslate = useCallback(async (texts: string[], targetLang: string, sourceLang?: string) => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('TranslationAgent');
      if (!agent) throw new Error('TranslationAgent not found');
      
      const result = await agent.execute({
        intent: 'batch_translate',
        parameters: { texts, targetLang, sourceLang }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Batch translation failed';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  const getSupportedLanguages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const agent = await agentRegistry.getAgentAsync('TranslationAgent');
      if (!agent) throw new Error('TranslationAgent not found');
      
      const result = await agent.execute({
        intent: 'get_languages',
        parameters: {}
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get languages';
      setError(errorMsg);
      setLoading(false);
      return { success: false, output: null, error: errorMsg };
    }
  }, []);

  return {
    loading,
    error,
    translate,
    detectLanguage,
    batchTranslate,
    getSupportedLanguages
  };
};
