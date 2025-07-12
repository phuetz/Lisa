import { useEffect, useRef } from 'react';
import type { HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { loadTask } from '../utils/loadTask';

export function useHandLandmarker(video?: HTMLVideoElement) {
  const taskRef = useRef<HandLandmarker>();
  const setState = useVisionAudioStore((s) => s.setState);

  useEffect(() => {
    (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const HL = vision.HandLandmarker as unknown as typeof HandLandmarker;
      taskRef.current = await loadTask(HL as any);
    })();
    return () => taskRef.current?.close();
  }, []);

  useEffect(() => {
    if (!video || !taskRef.current) return;
    let rafId: number;
    let frame = 0;
    const loop = () => {
      if ((frame++ & 1) === 1) { rafId = requestAnimationFrame(loop); return; }
      const res: HandLandmarkerResult | undefined = taskRef.current!.detectForVideo(
        video,
        performance.now()
      );
      if (res) {
        setState({
          hands: res.landmarks.map((lm, i) => ({
            landmarks: lm,
            handedness: res.handedness[i][0].categoryName as 'Left' | 'Right',
            score: res.handedness[i][0].score,
          })),
        });
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [video, taskRef.current]);
}
