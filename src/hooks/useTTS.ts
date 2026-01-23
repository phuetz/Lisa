/**
 * useTTS Hook
 * Hook React pour la synthèse vocale
 */

import { useState, useEffect, useCallback } from 'react';
import { ttsService, type TTSOptions } from '../services/ttsService';

interface UseTTSReturn {
  // State
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  frenchVoices: SpeechSynthesisVoice[];
  
  // Actions
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  speakResponse: (text: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  togglePause: () => void;
  setDefaultOptions: (options: TTSOptions) => void;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const unsubscribe = ttsService.subscribe((state) => {
      setIsSpeaking(state.speaking);
      setIsPaused(state.paused);
      setIsSupported(state.supported);
      setVoices(state.voices);
    });

    return unsubscribe;
  }, []);

  const speak = useCallback(async (text: string, options?: TTSOptions) => {
    await ttsService.speak(text, options);
  }, []);

  const speakResponse = useCallback(async (text: string) => {
    await ttsService.speakResponse(text);
  }, []);

  const pause = useCallback(() => {
    ttsService.pause();
  }, []);

  const resume = useCallback(() => {
    ttsService.resume();
  }, []);

  const stop = useCallback(() => {
    ttsService.stop();
  }, []);

  const togglePause = useCallback(() => {
    ttsService.togglePause();
  }, []);

  const setDefaultOptions = useCallback((options: TTSOptions) => {
    ttsService.setDefaultOptions(options);
  }, []);

  const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));

  return {
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    frenchVoices,
    speak,
    speakResponse,
    pause,
    resume,
    stop,
    togglePause,
    setDefaultOptions,
  };
}

export default useTTS;
