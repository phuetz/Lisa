import { useEffect, useRef } from 'react';
import { useAudioStore } from '../store/audioStore';

/**
 * Wake-word detection using Picovoice Porcupine WASM.
 * Falls back to built-in 'Porcupine' keyword if 'Hey Lisa' model is missing.
 */
export function useWakeWord(audioCtx?: AudioContext, micStream?: MediaStream) {
  const setIsListening = useAudioStore((s) => s.setIsListening);
  const setWakeWordDetected = useAudioStore((s) => s.setWakeWordDetected);

  // Store WebVoiceProcessor instance for cleanup
  const processorRef = useRef<any>(null);

  useEffect(() => {
    if (!audioCtx || !micStream) return;

    let cancelled = false;

    (async () => {
      try {
        const accessKey = import.meta.env.VITE_PV_ACCESS_KEY as string | undefined;
        if (!accessKey) {
          console.warn('[WakeWord] No VITE_PV_ACCESS_KEY provided.');
          return;
        }

        const {
          PorcupineWorkerFactory,
          WebVoiceProcessor,
          BuiltInKeyword,
        } = await import('@picovoice/porcupine-web');

        if (cancelled) return;

        const keyword = BuiltInKeyword.PORCUPINE;

        const porcupine = await PorcupineWorkerFactory.create({
          accessKey,
          keywords: [keyword],
        });

        if (cancelled) {
          porcupine.terminate?.();
          return;
        }

        porcupine.onmessage = (event: MessageEvent) => {
          if (event.data.keywordLabel) {
            console.log('[WakeWord] Detected:', event.data.keywordLabel);
            setWakeWordDetected(true);
            setIsListening(true);
          }
        };

        const wvp = await WebVoiceProcessor.init({ engines: [porcupine] });
        if (cancelled) {
          wvp.release?.();
          return;
        }
        processorRef.current = wvp;
        await wvp.startProcessing(micStream);
      } catch (err) {
        if (!cancelled) {
          console.warn('Wake-word engine failed initialization:', err);
        }
      }
    })();

    return () => {
      cancelled = true;
      processorRef.current?.release();
      processorRef.current = null;
    };
  }, [audioCtx, micStream, setIsListening, setWakeWordDetected]);
}
