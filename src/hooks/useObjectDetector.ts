import { useEffect } from 'react';
import type { ObjectDetector, ObjectDetectorResult } from '@mediapipe/tasks-vision';
import { useAppStore } from '../store/appStore';
import type { Percept } from '../types';
import type { MediaPipeObjectPayload } from '../features/vision/api';

export function useObjectDetector(video?: HTMLVideoElement, objectDetector?: ObjectDetector | null) {
  const setState = useAppStore((s) => s.setState);

  useEffect(() => {
    if (!video || !objectDetector) return;
    let rafId: number;
    let frame = 0;
    const loop = () => {
      if ((frame++ & 1) === 1) { rafId = requestAnimationFrame(loop); return; }
      
      // Guard: ensure video dimensions are valid (fix Android WebView crash)
      // MediaPipe ObjectDetector requires ROI with width/height > 0.
      // On Android WebView, video.videoWidth/videoHeight remain 0 until
      // loadedmetadata event fires and video.play() completes.
      // Without this guard, MediaPipe throws: "ROI width and height must be > 0"
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        rafId = requestAnimationFrame(loop);
        return;
      }
      
      // Guard: ensure video is ready for processing
      // readyState < 2 (HAVE_CURRENT_DATA) means no frame data available.
      // MediaPipe needs at least one frame to compute detections.
      if (video.readyState < 2) { // HAVE_CURRENT_DATA
        rafId = requestAnimationFrame(loop);
        return;
      }
      
      const res: ObjectDetectorResult | undefined = objectDetector.detectForVideo(
        video,
        performance.now()
      );
      if (res) {
        setState(state => ({
          percepts: [
            ...(state.percepts || []),
            ...res.detections.map((d): Percept<MediaPipeObjectPayload> => ({
              modality: 'vision',
              payload: {
                type: 'object',
                boxes: d.boundingBox ? [[
                  d.boundingBox.originX,
                  d.boundingBox.originY,
                  d.boundingBox.originX + d.boundingBox.width,
                  d.boundingBox.originY + d.boundingBox.height
                ]] : [],
                classes: [d.categories[0].categoryName],
                scores: [d.categories[0].score],
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
    return () => {
      cancelAnimationFrame(rafId);
      // Cleanup: close MediaPipe task to prevent memory leaks
      objectDetector?.close?.();
    };
  }, [video, objectDetector, setState]); // Added setState dependency
}
