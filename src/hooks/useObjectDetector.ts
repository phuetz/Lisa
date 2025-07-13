import { useEffect, useRef } from 'react';
import type { ObjectDetector, ObjectDetectorResult } from '@mediapipe/tasks-vision';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { loadTask } from '../utils/loadTask';
import { Percept, VisionPayload } from '../types'; // Import Percept and VisionPayload

export function useObjectDetector(video?: HTMLVideoElement, objectDetector?: ObjectDetector | null) {
  const setState = useVisionAudioStore((s) => s.setState);

  useEffect(() => {
    if (!video || !objectDetector) return;
    let rafId: number;
    let frame = 0;
    const loop = () => {
      if ((frame++ & 1) === 1) { rafId = requestAnimationFrame(loop); return; }
      const res: ObjectDetectorResult | undefined = objectDetector.detectForVideo(
        video,
        performance.now()
      );
      if (res) {
        setState(state => ({
          percepts: [
            ...(state.percepts || []),
            ...res.detections.map((d): Percept<VisionPayload> => ({
              modality: 'vision',
              payload: {
                type: 'object',
                box: new DOMRect(d.boundingBox.originX, d.boundingBox.originY, d.boundingBox.width, d.boundingBox.height),
                category: d.categories[0].categoryName,
                score: d.categories[0].score,
              },
              confidence: d.categories[0].score,
              ts: Date.now(),
            })),
          ],
        }));
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [video, objectDetector]); // Changed taskRef.current to objectDetector
}
