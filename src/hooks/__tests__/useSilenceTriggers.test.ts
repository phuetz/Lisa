/**
 * Tests pour le hook useSilenceTriggers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Create a real Zustand store mock that triggers React re-renders properly
vi.mock('../../store/visionAudioStore', async () => {
  const { create } = await import('zustand');
  const store = create<any>()((set: any) => ({
    lastSilenceMs: Date.now() - 10000,
    speechDetected: false,
    setState: (updater: any) => set(typeof updater === 'function' ? updater : updater),
  }));
  return { useVisionAudioStore: store };
});

import { useSilenceTriggers } from '../useSilenceTriggers';
import { useVisionAudioStore } from '../../store/visionAudioStore';

describe('useSilenceTriggers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useVisionAudioStore.setState({
      lastSilenceMs: Date.now() - 10000,
      speechDetected: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('devrait initialiser correctement l\'état', () => {
    const { result } = renderHook(() => useSilenceTriggers());

    expect(result.current.isSilent).toBe(false);
    expect(result.current.silenceDuration).toBeGreaterThanOrEqual(0);
    expect(result.current.isActive).toBe(true);
    expect(result.current.silenceThreshold).toBe(30000); // Valeur par défaut
  });

  it('devrait accepter des options personnalisées', () => {
    const { result } = renderHook(() => useSilenceTriggers({
      silenceThreshold: 60000,
      checkInterval: 10000,
    }));

    expect(result.current.silenceThreshold).toBe(60000);
  });

  it('devrait détecter le silence après le seuil défini', async () => {
    const onSilenceDetected = vi.fn();

    // Simuler un silence plus ancien que le seuil
    useVisionAudioStore.setState({ lastSilenceMs: Date.now() - 35000 });

    const { result } = renderHook(() => useSilenceTriggers({
      onSilenceDetected,
    }));

    // Avance le temps pour déclencher les vérifications
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Vérifie que l'état est mis à jour correctement
    expect(result.current.isSilent).toBe(true);
    expect(onSilenceDetected).toHaveBeenCalledTimes(1);
  });

  it('ne devrait pas détecter le silence avant le seuil', () => {
    const onSilenceDetected = vi.fn();

    // Simuler un silence plus récent que le seuil
    useVisionAudioStore.setState({ lastSilenceMs: Date.now() - 15000 });

    const { result } = renderHook(() => useSilenceTriggers({
      onSilenceDetected,
    }));

    // Avance le temps pour déclencher les vérifications
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Vérifie que l'état est mis à jour correctement
    expect(result.current.isSilent).toBe(false);
    expect(onSilenceDetected).not.toHaveBeenCalled();
  });

  it('devrait réinitialiser le silence quand l\'utilisateur parle', () => {
    const onSilenceDetected = vi.fn();

    // Simuler un silence plus ancien que le seuil
    useVisionAudioStore.setState({ lastSilenceMs: Date.now() - 35000 });

    const { result } = renderHook(() => useSilenceTriggers({
      onSilenceDetected,
    }));

    // Avance le temps pour déclencher les vérifications et atteindre le silence
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.isSilent).toBe(true);

    // Simuler que l'utilisateur commence à parler via store update
    act(() => {
      useVisionAudioStore.setState({ speechDetected: true });
    });

    // Le silence devrait être réinitialisé
    expect(result.current.isSilent).toBe(false);
  });

  it('devrait permettre d\'activer/désactiver la détection', () => {
    const onSilenceDetected = vi.fn();

    // Start with recent silence (NOT triggering) to avoid initial detection
    useVisionAudioStore.setState({ lastSilenceMs: Date.now() - 5000 });

    const { result } = renderHook(() => useSilenceTriggers({
      onSilenceDetected,
    }));

    // Désactiver la détection
    act(() => {
      result.current.stopSilenceDetection();
    });

    // Set triggering silence while detection is disabled
    act(() => {
      useVisionAudioStore.setState({ lastSilenceMs: Date.now() - 35000 });
    });

    // Avance le temps pour déclencher les vérifications
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Aucun silence ne devrait être détecté car la détection est désactivée
    expect(result.current.isActive).toBe(false);
    expect(result.current.isSilent).toBe(false);
    expect(onSilenceDetected).not.toHaveBeenCalled();

    // Réactiver la détection
    act(() => {
      result.current.startSilenceDetection();
    });

    // Déclencher une vérification
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Le silence devrait maintenant être détecté
    expect(result.current.isActive).toBe(true);
    expect(result.current.isSilent).toBe(true);
    expect(onSilenceDetected).toHaveBeenCalled();
  });
});
