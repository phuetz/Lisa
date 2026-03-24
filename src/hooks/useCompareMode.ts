/**
 * Compare Mode Hook (B5)
 * Sends the same message to multiple models in parallel and groups responses.
 * Uses textAccumulator pattern from PromptCommander to prevent race conditions.
 */

import { useState, useCallback, useRef } from 'react';
import { sendToProvider } from '../services/providers/base';
import { useSettingsStore } from '../store/settingsStore';
import type { NormalizedRequest, NormalizedResponse, ProviderKey } from '../types/promptcommander';

export interface CompareResult {
  modelId: string;
  provider: ProviderKey;
  content: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  durationMs: number;
  error?: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
}

export function useCompareMode() {
  const [compareModels, setCompareModels] = useState<string[]>([]);
  const [results, setResults] = useState<Map<string, CompareResult>>(new Map());
  const [isComparing, setIsComparing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  // textAccumulator prevents read-modify-write race conditions
  const textAccumulator = useRef<Map<string, string>>(new Map());

  const addModel = useCallback((modelId: string) => {
    setCompareModels(prev => prev.includes(modelId) ? prev : [...prev, modelId]);
  }, []);

  const removeModel = useCallback((modelId: string) => {
    setCompareModels(prev => prev.filter(id => id !== modelId));
  }, []);

  const clearModels = useCallback(() => {
    setCompareModels([]);
  }, []);

  const sendCompareMessage = useCallback(async (
    content: string,
    systemPrompt?: string,
  ) => {
    if (compareModels.length < 2) return;

    const settings = useSettingsStore.getState();
    const controller = new AbortController();
    abortRef.current = controller;
    textAccumulator.current.clear();
    cancelledRef.current = false;

    // Guard all setState calls against cancellation/unmount
    const safeSetResults = (updater: (prev: Map<string, CompareResult>) => Map<string, CompareResult>) => {
      if (!cancelledRef.current) setResults(updater);
    };

    setIsComparing(true);

    // Initialize results
    const initial = new Map<string, CompareResult>();
    for (const modelId of compareModels) {
      const model = settings.getModel(modelId);
      initial.set(modelId, {
        modelId,
        provider: (model?.provider || 'openai') as ProviderKey,
        content: '',
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
        status: 'pending',
      });
      textAccumulator.current.set(modelId, '');
    }
    safeSetResults(() => new Map(initial));

    // Send to all models in parallel
    const promises = compareModels.map(async (modelId) => {
      const model = settings.getModel(modelId);
      if (!model) return;

      const provider = model.provider as ProviderKey;
      const apiKey = settings.getApiKey(provider);
      const baseUrl = settings.getBaseUrl(provider);
      const startTime = Date.now();

      const request: NormalizedRequest = {
        model: model.apiModel,
        messages: [{ role: 'user', content }],
        systemPrompt,
        temperature: settings.settings.temperature,
        maxTokens: settings.settings.maxTokens,
        stream: true,
      };

      // Mark as streaming
      safeSetResults(prev => {
        const next = new Map(prev);
        const existing = next.get(modelId);
        if (existing) next.set(modelId, { ...existing, status: 'streaming' });
        return next;
      });

      try {
        await sendToProvider(provider, request, apiKey, {
          onChunk: (text: string) => {
            // Accumulate text safely
            const accumulated = (textAccumulator.current.get(modelId) || '') + text;
            textAccumulator.current.set(modelId, accumulated);

            safeSetResults(prev => {
              const next = new Map(prev);
              const existing = next.get(modelId);
              if (existing) next.set(modelId, { ...existing, content: accumulated });
              return next;
            });
          },
          onDone: (response: NormalizedResponse) => {
            const durationMs = Date.now() - startTime;
            const cost = (response.inputTokens * (model.priceInputPer1M || 0) +
                         response.outputTokens * (model.priceOutputPer1M || 0)) / 1_000_000;

            safeSetResults(prev => {
              const next = new Map(prev);
              next.set(modelId, {
                modelId,
                provider,
                content: textAccumulator.current.get(modelId) || response.content,
                inputTokens: response.inputTokens,
                outputTokens: response.outputTokens,
                cost,
                durationMs,
                status: 'complete',
              });
              return next;
            });
          },
        }, controller.signal, baseUrl);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        safeSetResults(prev => {
          const next = new Map(prev);
          next.set(modelId, {
            modelId,
            provider,
            content: '',
            inputTokens: 0,
            outputTokens: 0,
            cost: 0,
            durationMs: Date.now() - startTime,
            status: 'error',
            error: (error as Error).message,
          });
          return next;
        });
      }
    });

    await Promise.allSettled(promises);
    setIsComparing(false);
    abortRef.current = null;
  }, [compareModels]);

  const cancelCompare = useCallback(() => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsComparing(false);
  }, []);

  return {
    compareModels,
    results,
    isComparing,
    addModel,
    removeModel,
    clearModels,
    sendCompareMessage,
    cancelCompare,
    isActive: compareModels.length >= 2,
  };
}
