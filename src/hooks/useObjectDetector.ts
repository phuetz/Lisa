import { useEffect, useRef } from 'react';
import type { ObjectDetector, ObjectDetectorResult } from '@mediapipe/tasks-vision';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { loadTask } from '../utils/loadTask';

export function useObjectDetector(video?: HTMLVideoElement) {
  const taskRef = useRef<ObjectDetector>();
  const setState = useVisionAudioStore((s) => s.setState);

  useEffect(() => {
    (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const OD = vision.ObjectDetector as unknown as typeof ObjectDetector;
      taskRef.current = await loadTask(OD as any);
    })();
    return () => taskRef.current?.close();
  }, []);

  useEffect(() => {
    if (!video || !taskRef.current) return;
    let rafId: number;
    let frame = 0;
    const loop = () => {
      if ((frame++ & 1) === 1) { rafId = requestAnimationFrame(loop); return; }
      const res: ObjectDetectorResult | undefined = taskRef.current!.detectForVideo(
        video,
        performance.now()
      );
      if (res) {
        setState({
          objects: res.detections.map((d) => ({
            box: new DOMRect(d.boundingBox.originX, d.boundingBox.originY, d.boundingBox.width, d.boundingBox.height),
            category: d.categories[0].categoryName,
            score: d.categories[0].score,
          })),
        });
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [video, taskRef.current]);
}
