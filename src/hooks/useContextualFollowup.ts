import { useVisionAudioStore } from '../store/visionAudioStore';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useCallback } from 'react';
import { useIntentHandler } from './useIntentHandler';

/**
 * A hook to handle contextual follow-up questions based on conversation context
 */
export function useContextualFollowup() {
  const { i18n } = useTranslation();
  const state = useVisionAudioStore();
  const setState = useVisionAudioStore(s => s.setState);
  const context = state.conversationContext;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { handleIntent } = useIntentHandler();

  // Determine if a phrase is a follow-up question based on content and context
  const isFollowupQuestion = useCallback((phrase: string) => {
    const lower = phrase.toLowerCase();
    const isFrench = i18n.language.startsWith('fr');
    
    // Common follow-up question starters
    const followUpStarters = isFrench 
      ? ['et pour', 'et demain', 'qu\'en est-il', 'et après', 'et ensuite', 'et']
      : ['and for', 'what about', 'and tomorrow', 'and then', 'and'];
    
    // Check if the phrase starts with one of the follow-up patterns
    return followUpStarters.some(starter => lower.startsWith(starter));
  }, [i18n.language]);

  // Process a follow-up question in context of the previous interaction
  const processFollowupQuestion = useCallback(async (phrase: string) => {
    if (!context?.lastIntent) return null;

    const lower = phrase.toLowerCase();
    const isFrench = i18n.language.startsWith('fr');
    
    // Handle weather-related follow-ups
    if (context.lastIntent === 'weather_now' && 
        ((isFrench && lower.includes('demain')) || (!isFrench && lower.includes('tomorrow')))) {
      return { type: 'weather_forecast', period: 'tomorrow' };
    }

    // Handle todo-related follow-ups
    if ((context.lastIntent === 'add_todo' || context.lastIntent === 'list_todos') && 
        ((isFrench && lower.includes('supprime')) || (!isFrench && lower.includes('delete')))) {
      // Extract the item to remove from the follow-up
      const match = isFrench 
        ? lower.match(/(?:supprime|enlève|retire)\s+(.+)$/i) 
        : lower.match(/(?:delete|remove)\s+(.+)$/i);
      
      if (match && match[1]) {
        return { type: 'remove_todo', text: match[1].trim() };
      }
    }

    // Handle calendar-related follow-ups
    if (context.lastIntent === 'list_events') {
      if ((isFrench && lower.includes('ajoute')) || (!isFrench && lower.includes('add'))) {
        // Process through the PlannerAgent directly
        const fullPhrase = `${isFrench ? 'ajoute un événement' : 'add an event'} ${phrase}`;
        // Execute the intent through PlannerAgent
        handleIntent(fullPhrase, true);
        return { type: 'add_event', text: phrase };
      }
    }

    return null;
  }, [context, i18n.language]);

  // Set up a timeout to clear the conversation context after a period of inactivity
  useEffect(() => {
    if (context && context.timestamp) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a new timeout to clear context after 2 minutes of inactivity
      timeoutRef.current = setTimeout(() => {
        setState({ conversationContext: undefined });
      }, 2 * 60 * 1000);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [context, setState]);

  return {
    isFollowupQuestion,
    processFollowupQuestion,
    hasRecentContext: !!context && (Date.now() - (context.timestamp || 0) < 2 * 60 * 1000),
    // Export direct access to handleIntent for convenience
    handleFollowupWithPlannerAgent: handleIntent
  };
}
