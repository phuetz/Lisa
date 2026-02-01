import { useEffect, useRef } from 'react';
import type { AudioClassifier, AudioClassifierResult } from '@mediapipe/tasks-audio';
import { useAppStore } from '../store/appStore';

/**
 * Classify microphone audio and publish to Zustand, handles silence timer.
 */
export function useAudioClassifier(audioCtx?: AudioContext, micStream?: MediaStream, audioClassifier?: AudioClassifier | null) {
  const setState = useAppStore((s) => s.setState);
  const silenceTimeout = useRef<number>(0);

  // Connect to mic
  useEffect(() => {
    if (!audioCtx || !micStream || !audioClassifier) return;

    const source = audioCtx.createMediaStreamSource(micStream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    source.connect(processor);
    processor.connect(audioCtx.destination);

    let frame = 0;
    processor.onaudioprocess = (e) => {
      if ((frame++ & 1) === 1) return;
      const buffer = e.inputBuffer.getChannelData(0);
      const results: AudioClassifierResult[] = audioClassifier.classify(buffer);
      if (results && results.length && results[0].classifications.length) {
        const top = results[0].classifications[0].categories[0];
        setState({
          audio: { category: top.categoryName, score: top.score, timestamp: Date.now() },
          speechDetected: top.categoryName === 'Speech',
        });

        // Reset silence timer
        if (silenceTimeout.current) clearTimeout(silenceTimeout.current);
        silenceTimeout.current = window.setTimeout(() => {
          setState({ lastSilenceMs: 10000 });
        }, 10000);
      }
    };

    return () => {
      processor.disconnect();
      source.disconnect();
    };
  }, [audioCtx, micStream, audioClassifier]);
}
