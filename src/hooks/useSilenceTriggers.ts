/**
 * hooks/useSilenceTriggers.ts
 * Hook pour la détection des périodes de silence et le déclenchement d'actions proactives
 */

import { useState, useEffect, useCallback } from 'react';
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
  
  // Combine les options par défaut avec les options fournies
  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  
  // Sélecteurs ciblés du store
  const lastSilenceMs = useVisionAudioStore((s) => s.lastSilenceMs);
  const speechDetected = useVisionAudioStore((s) => s.speechDetected);
  const setState = useVisionAudioStore((s) => s.setState);
  
  /**
   * Vérifier le temps écoulé depuis la dernière interaction audio
   */
  const checkSilence = useCallback(() => {
    if (!isActive) return;
    
    const now = Date.now();
    const lastInteraction = lastSilenceMs;
    const elapsed = now - lastInteraction;
    
    setSilenceDuration(elapsed);
    
    // Si le seuil de silence est dépassé et qu'on n'est pas déjà en état de silence
    if (elapsed >= config.silenceThreshold && !isSilent) {
      setIsSilent(true);

      // Exécute le callback si défini
      if (config.onSilenceDetected) {
        config.onSilenceDetected();
      }

      // Réinitialise le compteur si configuré ainsi
      if (config.resetAfterTrigger) {
        setState({ lastSilenceMs: now });
      }
    }
    // Note: isSilent is reset to false via speechDetected useEffect,
    // stopSilenceDetection, or resetSilenceTimer — not by elapsed time.
  }, [config, isSilent, isActive, lastSilenceMs, setState]);
  
  /**
   * Démarre la détection de silence
   */
  const startSilenceDetection = useCallback(() => {
    setIsActive(true);
  }, []);
  
  /**
   * Arrête la détection de silence
   */
  const stopSilenceDetection = useCallback(() => {
    setIsActive(false);
    setIsSilent(false);
  }, []);
  
  /**
   * Réinitialise manuellement le compteur de silence
   */
  const resetSilenceTimer = useCallback(() => {
    const now = Date.now();
    setState({ lastSilenceMs: now });
    setSilenceDuration(0);
    setIsSilent(false);
  }, [setState]);
  
  // Effet pour configurer la vérification périodique du silence
  useEffect(() => {
    // Vérification initiale
    checkSilence();
    
    // Vérification périodique
    const interval = setInterval(checkSilence, config.checkInterval);
    
    // Nettoyage à la destruction du composant
    return () => clearInterval(interval);
  }, [checkSilence, config.checkInterval]);
  
  // Effet pour réinitialiser le compteur de silence quand l'utilisateur parle
  useEffect(() => {
    if (speechDetected) {
      resetSilenceTimer();
    }
  }, [speechDetected, resetSilenceTimer]);
  
  return {
    // État
    isSilent,
    silenceDuration,
    isActive,
    
    // Propriétés
    silenceThreshold: config.silenceThreshold,
    
    // Actions
    startSilenceDetection,
    stopSilenceDetection,
    resetSilenceTimer,
  };
}
