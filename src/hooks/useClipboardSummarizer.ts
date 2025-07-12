import { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVisionAudioStore } from '../store/visionAudioStore';

export interface SummarizerOptions {
  apiKey?: string;
  apiEndpoint?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  maxInputLength?: number;
}

/**
 * Hook to monitor clipboard and summarize text using an LLM
 */
export function useClipboardSummarizer(options: SummarizerOptions = {}) {
  const { i18n } = useTranslation();
  const [lastClipboardText, setLastClipboardText] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const setState = useVisionAudioStore(state => state.setState);
  
  const apiEndpoint = options.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
  const apiKey = options.apiKey || process.env.VITE_LLM_API_KEY;
  const model = options.model || 'gpt-3.5-turbo';
  const maxTokens = options.maxTokens || 150;
  const temperature = options.temperature || 0.5;
  const maxInputLength = options.maxInputLength || 10000;

  /**
   * Read text from clipboard
   */
  const readClipboardText = useCallback(async (): Promise<string> => {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      return '';
    }
  }, []);

  /**
   * Summarize text using LLM API
   */
  const summarizeText = useCallback(async (text: string): Promise<string> => {
    if (!apiKey) {
      return getDefaultSummary(i18n.language);
    }
    
    // Trim text if it's too long
    const trimmedText = text.length > maxInputLength 
      ? text.substring(0, maxInputLength) + '...'
      : text;
    
    try {
      setIsSummarizing(true);
      
      // Prepare the language-appropriate system prompt
      let systemPrompt = '';
      if (i18n.language.startsWith('fr')) {
        systemPrompt = "Résume le texte suivant de manière concise et claire en 2-3 phrases. Conserve les informations clés.";
      } else if (i18n.language.startsWith('es')) {
        systemPrompt = "Resume el siguiente texto de forma concisa y clara en 2-3 frases. Mantén la información clave.";
      } else {
        systemPrompt = "Summarize the following text concisely and clearly in 2-3 sentences. Preserve key information.";
      }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: trimmedText }
          ],
          max_tokens: maxTokens,
          temperature: temperature
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content.trim();
      
    } catch (error) {
      console.error('Error summarizing text:', error);
      return getDefaultSummary(i18n.language);
    } finally {
      setIsSummarizing(false);
    }
  }, [apiEndpoint, apiKey, i18n.language, maxInputLength, maxTokens, model, temperature]);

  /**
   * Monitor clipboard for changes
   */
  useEffect(() => {
    let checkClipboardInterval: NodeJS.Timeout | null = null;
    let isListening = false;
    
    const startMonitoring = () => {
      if (isListening) return;
      
      isListening = true;
      checkClipboardInterval = setInterval(async () => {
        const clipboardText = await readClipboardText();
        
        // If new text has been copied and it's substantial
        if (
          clipboardText && 
          clipboardText !== lastClipboardText && 
          clipboardText.length > 100
        ) {
          setLastClipboardText(clipboardText);
          
          // Visual indication that Lisa is processing
          setState({ intent: 'summarizing' });
          
          // Summarize the text
          const summary = await summarizeText(clipboardText);
          
          // Update UI with summary
          setState({ 
            clipboardSummary: summary,
            intent: undefined
          });
        }
      }, 2000); // Check every 2 seconds
    };
    
    const stopMonitoring = () => {
      if (checkClipboardInterval) {
        clearInterval(checkClipboardInterval);
        checkClipboardInterval = null;
      }
      isListening = false;
    };
    
    // Start/stop monitoring based on summarizer state
    const clipboardMonitoringEnabled = useVisionAudioStore.getState().clipboardMonitoringEnabled;
    
    if (clipboardMonitoringEnabled) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
    
    // Clean up on unmount
    return () => {
      if (checkClipboardInterval) {
        clearInterval(checkClipboardInterval);
      }
    };
  }, [lastClipboardText, readClipboardText, setState, summarizeText]);

  /**
   * Toggle clipboard monitoring
   */
  const toggleClipboardMonitoring = useCallback(() => {
    setState(state => ({ 
      clipboardMonitoringEnabled: !state.clipboardMonitoringEnabled 
    }));
  }, [setState]);
  
  /**
   * Force summarize text from clipboard
   */
  const summarizeClipboard = useCallback(async (): Promise<string> => {
    const clipboardText = await readClipboardText();
    
    if (clipboardText.length < 10) {
      // Clipboard is empty or has very little text
      return i18n.language.startsWith('fr')
        ? "Le presse-papiers est vide ou contient très peu de texte."
        : i18n.language.startsWith('es')
          ? "El portapapeles está vacío o contiene muy poco texto."
          : "Clipboard is empty or contains very little text.";
    }
    
    // Visual indication that Lisa is processing
    setState({ intent: 'summarizing' });
    
    // Summarize and update state
    const summary = await summarizeText(clipboardText);
    setState({ 
      clipboardSummary: summary,
      intent: undefined
    });
    
    return summary;
  }, [i18n.language, readClipboardText, setState, summarizeText]);
  
  return {
    isSummarizing,
    toggleClipboardMonitoring,
    summarizeClipboard,
    isClipboardMonitoringEnabled: useVisionAudioStore(state => state.clipboardMonitoringEnabled)
  };
}

/**
 * Get default summary if API call fails
 */
function getDefaultSummary(language: string): string {
  if (language.startsWith('fr')) {
    return "Je n'ai pas pu résumer ce texte en raison d'un problème technique.";
  } else if (language.startsWith('es')) {
    return "No pude resumir este texto debido a un problema técnico.";
  } else {
    return "I was unable to summarize this text due to a technical issue.";
  }
}
