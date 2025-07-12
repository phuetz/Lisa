import { useEffect, useRef } from 'react';
import { useVisionAudioStore } from '../store/visionAudioStore';

/**
 * Simple speech synthesis responder.
 * Speaks once when smile + speech are detected, then waits cooldownMs.
 */
export function useSpeechResponder(cooldownMs = 10000) {
  const { smileDetected, speechDetected } = useVisionAudioStore();
  const lastSpoke = useRef<number>(0);

  useEffect(() => {
    if (!speechDetected || !smileDetected) return;
    if (!('speechSynthesis' in window)) return;
    const now = Date.now();
    if (now - lastSpoke.current < cooldownMs) return;

    const utter = new SpeechSynthesisUtterance('Contente de te voir sourire !');
    utter.lang = navigator.language || 'fr-FR';
    window.speechSynthesis.speak(utter);
    lastSpoke.current = now;
  }, [smileDetected, speechDetected, cooldownMs]);
}
