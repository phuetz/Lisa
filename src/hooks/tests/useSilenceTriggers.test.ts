/**
 * Tests pour le hook useSilenceTriggers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSilenceTriggers } from '../useSilenceTriggers';
import { useVisionAudioStore } from '../../store/visionAudioStore';

// Mock pour le store Zustand
let mockStoreState = {
  lastSilenceMs: Date.now() - 10000,
  speechDetected: false,
};

vi.mock('../../store/visionAudioStore', () => ({
  useVisionAudioStore: vi.fn((selector) => {
    const store = {
      lastSilenceMs: mockStoreState.lastSilenceMs,
      speechDetected: mockStoreState.speechDetected,
      setState: vi.fn((updater) => {
        mockStoreState = typeof updater === 'function' ? updater(mockStoreState) : { ...mockStoreState, ...updater };
      }),
    };
    return selector(store);
  }),
}));

describe('useSilenceTriggers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockStoreState = {
      lastSilenceMs: Date.now() - 10000,
      speechDetected: false,
    };
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
    mockStoreState.lastSilenceMs = Date.now() - 35000; // 35 secondes de silence (seuil par défaut: 30s)
    
    const { result } = renderHook(() => useSilenceTriggers({
      onSilenceDetected,
    }));
    
    // Avance le temps pour déclencher les vérifications
    act(() => {
      vi.advanceTimersByTime(5000); // Déclenche la première vérification
    });
    
    // Vérifie que l'état est mis à jour correctement
    expect(result.current.isSilent).toBe(true);
    expect(onSilenceDetected).toHaveBeenCalledTimes(1);
  });

  it('ne devrait pas détecter le silence avant le seuil', () => {
    const onSilenceDetected = vi.fn();
    
    // Simuler un silence plus récent que le seuil
    mockStoreState.lastSilenceMs = Date.now() - 15000; // 15 secondes de silence (seuil par défaut: 30s)
    
    const { result } = renderHook(() => useSilenceTriggers({
      onSilenceDetected,
    }));
    
    // Avance le temps pour déclencher les vérifications
    act(() => {
      vi.advanceTimersByTime(5000); // Déclenche la première vérification
    });
    
    // Vérifie que l'état est mis à jour correctement
    expect(result.current.isSilent).toBe(false);
    expect(onSilenceDetected).not.toHaveBeenCalled();
  });

  it("devrait réinitialiser le silence quand l'utilisateur parle", () =>{
    const onSilenceDetected = vi.fn();
    
    // Simuler un silence plus ancien que le seuil
    mockStoreState.lastSilenceMs = Date.now() - 35000; // 35 secondes de silence (seuil par défaut: 30s)
    
    const { result } = renderHook(() => useSilenceTriggers({
      onSilenceDetected,
    }));
    
    // Avance le temps pour déclencher les vérifications et atteindre le silence
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(result.current.isSilent).toBe(true);
    
    // Simuler que l'utilisateur commence à parler
    act(() => {
      mockStoreState.speechDetected = true;
      // Déclencher le useEffect qui surveille speechDetected
      vi.runOnlyPendingTimers();
    });
    
    // Le silence devrait être réinitialisé
    expect(result.current.isSilent).toBe(false);
  });

  it("devrait permettre d'activer/désactiver la détection", () => {
    const onSilenceDetected = vi.fn();
    
    // Simuler un silence plus ancien que le seuil
    mockStoreState.lastSilenceMs = Date.now() - 35000; // 35 secondes de silence (seuil par défaut: 30s)
    
    const { result } = renderHook(() => useSilenceTriggers({
      onSilenceDetected,
    }));
    
    // Désactiver la détection
    act(() => {
      result.current.stopSilenceDetection();
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
      // Déclencher une vérification
      vi.advanceTimersByTime(5000);
    });
    
    // Le silence devrait maintenant être détecté
    expect(result.current.isActive).toBe(true);
    expect(result.current.isSilent).toBe(true);
    expect(onSilenceDetected).toHaveBeenCalled();
  });
});
