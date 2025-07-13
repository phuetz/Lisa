import { useEffect, useRef } from 'react';
import type { AudioClassifier, AudioClassifierResult } from '@mediapipe/tasks-audio';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { loadTask } from '../utils/loadTask';

/**
 * Classify microphone audio and publish to Zustand, handles silence timer.
 */
export function useAudioClassifier(audioCtx?: AudioContext, micStream?: MediaStream, audioClassifier?: AudioClassifier | null) {
  const setState = useVisionAudioStore((s) => s.setState);
  const silenceTimeout = useRef<number>();

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
      const res: AudioClassifierResult | undefined = audioClassifier.classify(buffer);
      if (res && res.classifications.length) {
        const top = res.classifications[0].categories[0];
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
  }, [audioCtx, micStream, taskRef.current]);
}
