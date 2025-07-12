import { useEffect, useRef } from 'react';
import type { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { loadTask } from '../utils/loadTask';

/**
 * Runs FaceLandmarker on a provided <video> element and stores results in Zustand.
 */
export function useFaceLandmarker(video?: HTMLVideoElement) {
  const taskRef = useRef<FaceLandmarker>();
  const setState = useVisionAudioStore((s) => s.setState);

  // Load model on mount
  useEffect(() => {
    (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const FL = vision.FaceLandmarker as unknown as typeof FaceLandmarker;
      taskRef.current = await loadTask(FL as any);
    })();
    return () => taskRef.current?.close();
  }, []);

  // Inference loop
  useEffect(() => {
    if (!video || !taskRef.current) return;
    let rafId: number;
    let frame = 0;
    const run = () => {
      if ((frame++ & 1) === 1) { // skip every other frame
        rafId = requestAnimationFrame(run);
        return;
      }
      const res: FaceLandmarkerResult | undefined = taskRef.current!.detectForVideo(
        video,
        performance.now()
      );
      if (res) {
        // Detect smile via blendshapes if available
        const isSmiling = res.faceBlendshapes?.some((bs) =>
          bs.categories.some(
            (c) => c.categoryName.startsWith('lipsSmile') && c.score > 0.4
          )
        );
        setState({
          faces: res.faceLandmarks.map((lm, i) => ({
            landmarks: lm,
            boundingBox: res.faceBoundingBoxes[i],
            score: 1,
          })),
          smileDetected: !!isSmiling,
        });
      }
      rafId = requestAnimationFrame(run);
    };
    run();
    return () => cancelAnimationFrame(rafId);
  }, [video, taskRef.current]);
}
