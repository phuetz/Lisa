import { useEffect, useRef } from 'react';
import { useVisionAudioStore } from '../store/visionAudioStore';

/**
 * Wake-word detection using Picovoice Porcupine WASM.
 * Requires env var VITE_PV_ACCESS_KEY and keyword model.
 * Falls back silently if libs or key are missing.
 */
export function useWakeWord(audioCtx?: AudioContext, micStream?: MediaStream) {
  const setState = useVisionAudioStore((s) => s.setState);
  // Store WebVoiceProcessor instance for cleanup
  const processorRef = useRef<any>(null);

  useEffect(() => {
    if (!audioCtx || !micStream) return;

    (async () => {
      try {
        const accessKey = import.meta.env.VITE_PV_ACCESS_KEY as string | undefined;
        if (!accessKey) return;
        const {
          PorcupineWorkerFactory,
          WebVoiceProcessor,
          BuiltInKeyword,
        } = await import('@picovoice/porcupine-web');

        const porcupine = await PorcupineWorkerFactory.create({
          accessKey,
          keywords: [BuiltInKeyword.PORCUPINE], // TODO: replace by custom "lisa" keyword
        });

        porcupine.onmessage = (event: MessageEvent) => {
          if (event.data.keywordLabel) {
            // Wake-word detected!
            setState({ listeningActive: true });
          }
        };

        const wvp = await WebVoiceProcessor.init({ engines: [porcupine] });
        processorRef.current = wvp;
        await wvp.startProcessing(micStream);
      } catch (err) {
        console.warn('Wake-word engine failed, falling back to regex.', err);
      }
    })();

    return () => {
      processorRef.current?.release();
    };
  }, [audioCtx, micStream]);
}
