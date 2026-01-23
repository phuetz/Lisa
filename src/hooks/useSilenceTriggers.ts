/**
 * hooks/useSilenceTriggers.ts
 * Hook pour la détection des périodes de silence et le déclenchement d'actions proactives
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useVisionAudioStore } from '../store/visionAudioStore';

// Configuration par défaut pour les déclencheurs de silence
export interface SilenceTriggerOptions {
  // Durée de silence (en ms) avant de déclencher une action proactive
  silenceThreshold: number;
  // Intervalle (en ms) pour vérifier les périodes de silence
  checkInterval: number;
  // Callback à exécuter quand un silence est détecté
  onSilenceDetected?: () => void;
  // Si true, redémarre le compteur après un déclenchement
  resetAfterTrigger: boolean;
}

const DEFAULT_OPTIONS: SilenceTriggerOptions = {
  silenceThreshold: 30000, // 30 secondes par défaut
  checkInterval: 5000,     // Vérification toutes les 5 secondes
  resetAfterTrigger: true,
};

/**
 * Hook pour la détection des périodes de silence et le déclenchement d'actions proactives
 */
export function useSilenceTriggers(options: Partial<SilenceTriggerOptions> = {}) {
  const [isSilent, setIsSilent] = useState<boolean>(false);
  const [silenceDuration, setSilenceDuration] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);

  const intervalRef = useRef<number | null>(null);
  const previousLastSilenceMsRef = useRef<number | null>(null);
  const wasActiveRef = useRef<boolean>(true);

  // Combine les options par défaut avec les options fournies
  const {
    silenceThreshold,
    checkInterval,
    onSilenceDetected,
    resetAfterTrigger,
  } = useMemo(() => ({
    ...DEFAULT_OPTIONS,
    ...options,
  }), [options]);
  
  // Sélecteurs ciblés du store
  const lastSilenceMs = useVisionAudioStore((s) => s.lastSilenceMs);
  const speechDetected = useVisionAudioStore((s) => s.speechDetected);
  const setState = useVisionAudioStore((s) => s.setState);
  
  /**
   * Vérifier le temps écoulé depuis la dernière interaction audio
   */
  const checkSilence = useCallback(() => {
    if (!isActive) {
      return;
    }

    const now = Date.now();
    const elapsed = now - lastSilenceMs;

    setSilenceDuration(elapsed);

    if (elapsed >= silenceThreshold) {
      if (!isSilent) {
        setIsSilent(true);
        onSilenceDetected?.();
      }

      if (resetAfterTrigger) {
        setState((prev) => {
          previousLastSilenceMsRef.current = prev.lastSilenceMs;
          return { ...prev, lastSilenceMs: now };
        });
      }
    }
  }, [isActive, isSilent, lastSilenceMs, onSilenceDetected, resetAfterTrigger, setState, silenceThreshold]);
  
  /**
   * Démarre la détection de silence
   */
  const startSilenceDetection = useCallback(() => {
    previousLastSilenceMsRef.current = null;
    setSilenceDuration(Math.max(0, Date.now() - lastSilenceMs));
    setIsSilent(false);
    setIsActive(true);
  }, [lastSilenceMs]);
  
  /**
   * Arrête la détection de silence
   */
  const stopSilenceDetection = useCallback(() => {
    setIsActive(false);
    setIsSilent(false);

    if (previousLastSilenceMsRef.current !== null) {
      const restoreValue = previousLastSilenceMsRef.current;
      previousLastSilenceMsRef.current = null;
      setState((prev) => ({ ...prev, lastSilenceMs: restoreValue }));
    }
  }, [setState]);
  
  /**
   * Réinitialise manuellement le compteur de silence
   */
  const resetSilenceTimer = useCallback(() => {
    const now = Date.now();
    previousLastSilenceMsRef.current = null;
    setState((prev) => ({ ...prev, lastSilenceMs: now }));
    setSilenceDuration(0);
    setIsSilent(false);
  }, [setState]);
  
  // Effet pour configurer la vérification périodique du silence
  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(checkSilence, checkInterval);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkInterval, checkSilence, isActive]);
  
  // Effet pour réinitialiser le compteur de silence quand l'utilisateur parle
  useEffect(() => {
    if (speechDetected) {
      resetSilenceTimer();
    }
  }, [speechDetected, resetSilenceTimer]);

  // Vérifie immédiatement lorsque la détection est (ré)activée
  useEffect(() => {
    if (!wasActiveRef.current && isActive) {
      checkSilence();
    }
    wasActiveRef.current = isActive;
  }, [checkSilence, isActive]);
  
  return {
    // État
    isSilent,
    silenceDuration,
    isActive,
    
    // Propriétés
    silenceThreshold,
    checkInterval,
    
    // Actions
    startSilenceDetection,
    stopSilenceDetection,
    resetSilenceTimer,
  };
}
