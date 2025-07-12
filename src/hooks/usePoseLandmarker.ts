import { useEffect, useRef } from 'react';
import type { PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { loadTask } from '../utils/loadTask';

export function usePoseLandmarker(video?: HTMLVideoElement) {
  const taskRef = useRef<PoseLandmarker>();
  const setState = useVisionAudioStore((s) => s.setState);

  useEffect(() => {
    (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const PL = vision.PoseLandmarker as unknown as typeof PoseLandmarker;
      taskRef.current = await loadTask(PL as any);
    })();
    return () => taskRef.current?.close();
  }, []);

  useEffect(() => {
    if (!video || !taskRef.current) return;
    let rafId: number;
    let frame = 0;
    const loop = () => {
      if ((frame++ & 1) === 1) { rafId = requestAnimationFrame(loop); return; }
      const res: PoseLandmarkerResult | undefined = taskRef.current!.detectForVideo(
        video,
        performance.now()
      );
      if (res) {
        setState({
          poses: res.poseLandmarks.map((lm) => ({ landmarks: lm, score: 1 })),
        });
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [video, taskRef.current]);
}
