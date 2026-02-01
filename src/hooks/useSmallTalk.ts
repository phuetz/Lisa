import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useTranslation } from 'react-i18next';
import { processSmallTalk as processSmallTalkLogic, isSmallTalk as isSmallTalkLogic } from '../lib/smallTalk';
import type { SmallTalkOptions } from '../lib/smallTalk';

export type { SmallTalkOptions };

/**
 * Hook for handling small talk conversations using an LLM API.
 * This hook is a lightweight wrapper around the core small talk logic.
 */
export function useSmallTalk(options: SmallTalkOptions = {}) {
  const { i18n } = useTranslation();
  const setState = useAppStore(state => state.setState);
  const context = useAppStore(state => state.conversationContext);

  const processSmallTalk = useCallback(async (text: string): Promise<string> => {
    const fullOptions = {
      apiKey: process.env.VITE_LLM_API_KEY,
      ...options,
    };

    const aiMessage = await processSmallTalkLogic(text, fullOptions, context?.chatHistory || [], i18n.language);

    // Update conversation history in the store
    const updatedHistory = [
      ...(context?.chatHistory || []),
      { role: 'user', content: text },
      { role: 'assistant', content: aiMessage },
    ].slice(-10); // Keep last 10 messages

    setState(s => ({
      conversationContext: {
        ...s.conversationContext || {},
        chatHistory: updatedHistory,
        timestamp: Date.now(),
      },
    }));

    return aiMessage;
  }, [context, i18n.language, options, setState]);

  return {
    isSmallTalk: isSmallTalkLogic,
    processSmallTalk,
  };
}

