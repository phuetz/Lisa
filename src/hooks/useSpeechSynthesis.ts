/**
 * useSpeechSynthesis - Hook pour la synthèse vocale
 * 
 * Ce hook permet d'accéder facilement aux fonctionnalités de synthèse vocale
 * pour communiquer verbalement avec l'utilisateur et d'autres assistants.
 */

import { useState, useCallback, useEffect } from 'react';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { agentRegistry } from '../features/agents/core/registry';
import type { VoiceSettings, SpeechSynthesisIntent, SpeechFormat } from '../agents/SpeechSynthesisAgent';

export interface SpeechSynthesisOptions {
  autoStart?: boolean;
  language?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export type SpeechState = 'idle' | 'speaking' | 'paused' | 'error';

export const useSpeechSynthesis = (options: SpeechSynthesisOptions = {}) => {
  const [state, setState] = useState<SpeechState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentSettings, setCurrentSettings] = useState<VoiceSettings>({
    voice: options.voice || '',
    rate: options.rate || 1.0,
    pitch: options.pitch || 1.0,
    volume: options.volume || 1.0,
    lang: options.language || 'fr-FR'
  });

  const audioEnabled = useVisionAudioStore((state) => state.audioEnabled);

  /**
   * Initialise la synthèse vocale et charge les voix disponibles
   */
  useEffect(() => {
    const initVoices = async () => {
      try {
        const registry = agentRegistry;
        const agent = await registry.getAgentAsync('SpeechSynthesisAgent');
        
        if (agent) {
          const result = await agent.execute({
            intent: 'get_voices' as SpeechSynthesisIntent,
            parameters: {}
          });
          
          if (result.success && result.output.voices) {
            setAvailableVoices(result.output.voices);
            
            // Mettre à jour la voix courante si ce n'est pas déjà fait
            if (result.output.currentVoice) {
              setCurrentSettings(prev => {
                // Ne mettre à jour que si la voix n'est pas déjà définie
                if (!prev.voice) {
                  return {
                    ...prev,
                    voice: result.output.currentVoice
                  };
                }
                return prev;
              });
            }
          } else {
            console.warn('Failed to get voices:', result.error);
          }
        }
      } catch (err) {
        console.error('Error initializing speech synthesis:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize speech synthesis'));
      }
    };

    initVoices();
  }, []); // Exécuter une seule fois au montage

  /**
   * Convertit le texte en parole
   */
  const speak = useCallback(async (
    text: string,
    speakOptions: {
      settings?: Partial<VoiceSettings>;
      format?: SpeechFormat;
    } = {}
  ) => {
    // Ne rien faire si l'audio est désactivé
    if (!audioEnabled) return { success: false, reason: 'audio_disabled' };

    try {
      setState('speaking');
      setError(null);

      // Trigger MetaHuman speech animation (lazy loaded)
      const metaHumanAgent = await agentRegistry.getAgentAsync('MetaHumanAgent');
      if (metaHumanAgent) {
        await metaHumanAgent.execute({
          intent: 'animate_speech',
          parameters: { text: text, duration: text.length * 0.08 } // Estimate duration for animation
        });
      }
      
      const registry = agentRegistry;
      const agent = await registry.getAgentAsync('SpeechSynthesisAgent');
      
      if (!agent) {
        throw new Error('SpeechSynthesisAgent not registered');
      }
      
      const mergedSettings = {
        ...currentSettings,
        ...speakOptions.settings
      };
      
      const result = await agent.execute({
        intent: 'speak' as SpeechSynthesisIntent,
        parameters: {
          text,
          settings: mergedSettings,
          format: speakOptions.format || 'text'
        }
      });
      
      if (!result.success) {
        throw result.error || new Error('Failed to speak');
      }
      
      return result;
    } catch (err) {
      console.error('Speech synthesis error:', err);
      setState('error');
      setError(err instanceof Error ? err : new Error('Unknown speech synthesis error'));
      return { success: false, error: err };
    }
  }, [audioEnabled, currentSettings]);

  /**
   * Arrête la parole en cours
   */
  const stop = useCallback(async () => {
    try {
      const registry = agentRegistry;
      const agent = await registry.getAgentAsync('SpeechSynthesisAgent');
      
      if (agent) {
        const result = await agent.execute({
          intent: 'stop_speaking' as SpeechSynthesisIntent,
          parameters: {}
        });
        
        if (result.success) {
          setState('idle');
          return true;
        }
      }
      
      return false;
    } catch (err) {
      console.error('Failed to stop speaking:', err);
      return false;
    }
  }, []);

  /**
   * Vérifie si la synthèse vocale est en cours
   */
  const checkSpeaking = useCallback(async () => {
    try {
      const registry = agentRegistry;
      const agent = await registry.getAgentAsync('SpeechSynthesisAgent');
      
      if (agent) {
        const result = await agent.execute({
          intent: 'is_speaking' as SpeechSynthesisIntent,
          parameters: {}
        });
        
        if (result.success) {
          setState(result.output.speaking ? 'speaking' : 'idle');
          return result.output.speaking;
        }
      }
      
      return false;
    } catch (err) {
      console.error('Failed to check speaking status:', err);
      return false;
    }
  }, []);

  /**
   * Met à jour les paramètres de voix
   */
  const updateSettings = useCallback(async (settings: Partial<VoiceSettings>) => {
    try {
      const registry = agentRegistry;
      const agent = await registry.getAgentAsync('SpeechSynthesisAgent');
      
      if (agent) {
        const result = await agent.execute({
          intent: 'update_settings' as SpeechSynthesisIntent,
          parameters: {
            settings
          }
        });
        
        if (result.success) {
          setCurrentSettings(result.output.settings);
          return true;
        }
      }
      
      return false;
    } catch (err) {
      console.error('Failed to update voice settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to update voice settings'));
      return false;
    }
  }, []);

  /**
   * Récupère les voix disponibles pour une langue spécifique
   */
  const getVoices = useCallback(async (lang?: string) => {
    try {
      const registry = agentRegistry;
      const agent = await registry.getAgentAsync('SpeechSynthesisAgent');
      
      if (agent) {
        const result = await agent.execute({
          intent: 'get_voices' as SpeechSynthesisIntent,
          parameters: {
            lang
          }
        });
        
        if (result.success) {
          setAvailableVoices(result.output.voices);
          return result.output.voices;
        }
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
