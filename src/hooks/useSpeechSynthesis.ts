/**
 * useSpeechSynthesis - Hook pour la synthèse vocale
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { agentRegistry } from '../features/agents/core/registry';
import type { VoiceSettings, SpeechSynthesisIntent, SpeechFormat } from '../features/agents/implementations/SpeechSynthesisAgent';
import { useMetaHumanStore } from '../store/metaHumanStore';
import { MetaHumanAgent } from '../features/agents/implementations/MetaHumanAgent';

export interface SpeechSynthesisOptions {
  autoStart?: boolean;
  language?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export type SpeechState = 'idle' | 'speaking' | 'paused' | 'error';

interface SpeakResult {
  success: boolean;
  output?: any;
  error?: unknown;
  reason?: string;
}

/** Resolve agent once and cache the reference. */
function getSpeechAgent() {
  return agentRegistry.getAgent('SpeechSynthesisAgent');
}

export const useSpeechSynthesis = (options: SpeechSynthesisOptions = {}) => {
  const [state, setState] = useState<SpeechState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [currentSettings, setCurrentSettings] = useState<VoiceSettings>({
    voice: options.voice || '',
    rate: options.rate || 1.0,
    pitch: options.pitch || 1.0,
    volume: options.volume || 1.0,
    lang: options.language || 'fr-FR'
  });

  const audioEnabled = useAppStore((s) => s.audioEnabled);
  const setLastSpokenText = useAppStore((s) => s.setLastSpokenText);

  // Track whether voice init has already run
  const voiceInitRef = useRef(false);

  /**
   * Initialize voices once on mount (not on every currentSettings change)
   */
  useEffect(() => {
    if (voiceInitRef.current) return;
    voiceInitRef.current = true;

    const initVoices = async () => {
      try {
        const agent = getSpeechAgent();
        if (!agent) return;

        const result = await agent.execute({
          intent: 'get_voices' as SpeechSynthesisIntent,
          parameters: {}
        });

        if (result.success && result.output.voices) {
          setAvailableVoices(result.output.voices);
          if (!currentSettings.voice && result.output.currentVoice) {
            setCurrentSettings(prev => ({
              ...prev,
              voice: result.output.currentVoice
            }));
          }
        }
      } catch (err) {
        console.error('Error initializing speech synthesis:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize speech synthesis'));
      }
    };

    initVoices();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once on mount
  }, []);

  const speak = useCallback(async (
    text: string,
    speakOptions: {
      settings?: Partial<VoiceSettings>;
      format?: SpeechFormat;
    } = {}
  ): Promise<SpeakResult> => {
    if (!audioEnabled) return { success: false, reason: 'audio_disabled' };

    try {
      setState('speaking');
      setError(null);
      setLastSpokenText(text);

      // Trigger MetaHuman speech animation (fire-and-forget)
      const metaHumanAgent = agentRegistry.getAgent('MetaHumanAgent') as MetaHumanAgent | undefined;
      metaHumanAgent?.execute({
        intent: 'animate_speech',
        parameters: { text, duration: text.length * 0.08 }
      });

      const agent = getSpeechAgent();
      if (!agent) throw new Error('SpeechSynthesisAgent not registered');

      const result = await agent.execute({
        intent: 'speak' as SpeechSynthesisIntent,
        parameters: {
          text,
          settings: { ...currentSettings, ...speakOptions.settings },
          format: speakOptions.format || 'text'
        }
      });

      if (!result.success) throw result.error || new Error('Failed to speak');

      setState('idle');
      return { success: true, output: result.output };
    } catch (err) {
      console.error('Speech synthesis error:', err);
      setState('error');
      setError(err instanceof Error ? err : new Error('Unknown speech synthesis error'));
      return { success: false, error: err };
    }
  }, [audioEnabled, currentSettings, setLastSpokenText]);

  const stop = useCallback(async () => {
    try {
      const agent = getSpeechAgent();
      if (!agent) return false;

      const result = await agent.execute({
        intent: 'stop_speaking' as SpeechSynthesisIntent,
        parameters: {}
      });

      if (result.success) {
        setState('idle');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to stop speaking:', err);
      return false;
    }
  }, []);

  const checkSpeaking = useCallback(async () => {
    try {
      const agent = getSpeechAgent();
      if (!agent) return false;

      const result = await agent.execute({
        intent: 'is_speaking' as SpeechSynthesisIntent,
        parameters: {}
      });

      if (result.success) {
        setState(result.output.speaking ? 'speaking' : 'idle');
        return result.output.speaking;
      }
      return false;
    } catch (err) {
      console.error('Failed to check speaking status:', err);
      return false;
    }
  }, []);

  const updateSettings = useCallback(async (settings: Partial<VoiceSettings>) => {
    try {
      const agent = getSpeechAgent();
      if (!agent) return false;

      const result = await agent.execute({
        intent: 'update_settings' as SpeechSynthesisIntent,
        parameters: { settings }
      });

      if (result.success) {
        setCurrentSettings(result.output.settings);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update voice settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to update voice settings'));
      return false;
    }
  }, []);

  const getVoices = useCallback(async (lang?: string) => {
    try {
      const agent = getSpeechAgent();
      if (!agent) return [];

      const result = await agent.execute({
        intent: 'get_voices' as SpeechSynthesisIntent,
        parameters: { lang }
      });

      if (result.success) {
        setAvailableVoices(result.output.voices);
        return result.output.voices;
      }
      return [];
    } catch (err) {
      console.error('Failed to get voices:', err);
      return [];
    }
  }, []);

  return {
    speak,
    stop,
    checkSpeaking,
    updateSettings,
    getVoices,
    state,
    error,
    availableVoices,
    currentSettings
  };
};

export default useSpeechSynthesis;
