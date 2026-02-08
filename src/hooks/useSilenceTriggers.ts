/**
 * hooks/useSilenceTriggers.ts
 * Hook pour la détection des périodes de silence et le déclenchement d'actions proactives
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

export interface SilenceTriggerOptions {
  silenceThreshold: number;
  checkInterval: number;
  onSilenceDetected?: () => void;
  resetAfterTrigger: boolean;
}

const DEFAULT_OPTIONS: SilenceTriggerOptions = {
  silenceThreshold: 30000,
  checkInterval: 5000,
  resetAfterTrigger: true,
};

export function useSilenceTriggers(options: Partial<SilenceTriggerOptions> = {}) {
  const [isSilent, setIsSilent] = useState(false);
  const [silenceDuration, setSilenceDuration] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Memoize config to prevent re-creating on every render
  const config = useMemo(() => ({
    ...DEFAULT_OPTIONS,
    ...options,
  }), [options.silenceThreshold, options.checkInterval, options.resetAfterTrigger, options.onSilenceDetected]);

  const lastSilenceMs = useAppStore((s) => s.lastSilenceMs);
  const speechDetected = useAppStore((s) => s.speechDetected);
  const setState = useAppStore((s) => s.setState);

  // Use refs to break the dependency cycle — callback reads current values without re-creating
  const isSilentRef = useRef(isSilent);
  isSilentRef.current = isSilent;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const configRef = useRef(config);
  configRef.current = config;
  const lastSilenceMsRef = useRef(lastSilenceMs);
  lastSilenceMsRef.current = lastSilenceMs;

  const checkSilence = useCallback(() => {
    if (!isActiveRef.current) return;

    const now = Date.now();
    const elapsed = now - lastSilenceMsRef.current;

    setSilenceDuration(elapsed);

    if (elapsed >= configRef.current.silenceThreshold && !isSilentRef.current) {
      setIsSilent(true);
      configRef.current.onSilenceDetected?.();
      if (configRef.current.resetAfterTrigger) {
        setState({ lastSilenceMs: now });
      }
    }
  }, [setState]);

  const startSilenceDetection = useCallback(() => {
    setIsActive(true);
  }, []);

  const stopSilenceDetection = useCallback(() => {
    setIsActive(false);
    setIsSilent(false);
  }, []);

  const resetSilenceTimer = useCallback(() => {
    setState({ lastSilenceMs: Date.now() });
    setSilenceDuration(0);
    setIsSilent(false);
  }, [setState]);

  // Periodic silence check — stable callback, interval only changes with checkInterval
  useEffect(() => {
    checkSilence();
    const interval = setInterval(checkSilence, config.checkInterval);
    return () => clearInterval(interval);
  }, [checkSilence, config.checkInterval]);

  // Reset when user speaks
  useEffect(() => {
    if (speechDetected) {
      resetSilenceTimer();
    }
  }, [speechDetected, resetSilenceTimer]);

  return {
    isSilent,
    silenceDuration,
    isActive,
    silenceThreshold: config.silenceThreshold,
    startSilenceDetection,
    stopSilenceDetection,
    resetSilenceTimer,
  };
}
