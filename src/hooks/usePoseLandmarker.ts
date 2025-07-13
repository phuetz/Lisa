import { useEffect, useRef } from 'react';
import type { PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { loadTask } from '../utils/loadTask';
import { Percept, VisionPayload } from '../types'; // Import Percept and VisionPayload

export function usePoseLandmarker(video?: HTMLVideoElement, poseLandmarker?: PoseLandmarker | null) {
  const setState = useVisionAudioStore((s) => s.setState);

  useEffect(() => {
    if (!video || !poseLandmarker) return;
    let rafId: number;
    let frame = 0;
    const loop = () => {
      if ((frame++ & 1) === 1) { rafId = requestAnimationFrame(loop); return; }
      const res: PoseLandmarkerResult | undefined = poseLandmarker.detectForVideo(
        video,
        performance.now()
      );
      if (res) {
        setState(state => ({
          percepts: [
            ...(state.percepts || []),
            ...res.poseLandmarks.map((lm): Percept<VisionPayload> => ({
              modality: 'vision',
              payload: {
                type: 'pose',
                landmarks: lm,
                score: 1,
              },
              confidence: 1.0,
              ts: Date.now(),
            })),
          ],
        }));
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [video, poseLandmarker]); // Changed taskRef.current to poseLandmarker
}
