import { useEffect, useRef } from 'react';
import type { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { loadTask } from '../utils/loadTask';
import { Percept, MediaPipeFacePayload } from '../senses/vision'; // Import new types

/**
 * Runs FaceLandmarker on a provided <video> element and stores results in Zustand.
 */
export function useFaceLandmarker(video?: HTMLVideoElement, faceLandmarker?: FaceLandmarker | null) {
  const setState = useVisionAudioStore((s) => s.setState);

  // Inference loop
  useEffect(() => {
    if (!video || !faceLandmarker) return;
    let rafId: number;
    let frame = 0;
    const run = () => {
      if ((frame++ & 1) === 1) { // skip every other frame
        rafId = requestAnimationFrame(run);
        return;
      }
      const res: FaceLandmarkerResult | undefined = faceLandmarker.detectForVideo(
        video,
        performance.now()
      );
      if (res) {
        const newPercepts: Percept<MediaPipeFacePayload>[] = [];
        for (let i = 0; i < res.faceLandmarks.length; i++) {
          const faceLandmarks = res.faceLandmarks[i];
          const boundingBox = res.faceBoundingBoxes[i];

          // Detect smile via blendshapes if available
          const isSmiling = res.faceBlendshapes?.some((bs) =>
            bs.categories.some(
              (c) => c.categoryName.startsWith('lipsSmile') && c.score > 0.4
            )
          );

          const payload: MediaPipeFacePayload = {
            type: 'face',
            boxes: [[boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height]], // Convert to [x1, y1, width, height]
            landmarks: faceLandmarks,
            classes: ['face'],
            scores: [1.0], // Assuming high confidence for detected faces
            isSmiling: !!isSmiling,
          };

          newPercepts.push({
            modality: 'vision',
            payload: payload,
            confidence: 1.0,
            ts: Date.now(),
          });
        }

        setState(state => ({
          percepts: [
            ...(state.percepts || []),
            ...newPercepts,
          ],
          smileDetected: newPercepts.some(p => p.payload.isSmiling), // Update smileDetected based on any smiling face
        }));
      }
      rafId = requestAnimationFrame(run);
    };
    run();
    return () => cancelAnimationFrame(rafId);
  }, [video, faceLandmarker]); // Changed taskRef.current to faceLandmarker
}
