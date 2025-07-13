import { useEffect, useRef } from 'react';
import type { HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { loadTask } from '../utils/loadTask';
import { Percept, MediaPipeHandPayload } from '../senses/vision'; // Import new types

export function useHandLandmarker(video?: HTMLVideoElement, handLandmarker?: HandLandmarker | null) {
  const setState = useVisionAudioStore((s) => s.setState);

  useEffect(() => {
    if (!video || !handLandmarker) return;
    let rafId: number;
    let frame = 0;
    const loop = () => {
      if ((frame++ & 1) === 1) { rafId = requestAnimationFrame(loop); return; }
      const res: HandLandmarkerResult | undefined = handLandmarker.detectForVideo(
        video,
        performance.now()
      );
      if (res) {
        const newPercepts: Percept<MediaPipeHandPayload>[] = [];
        for (let i = 0; i < res.landmarks.length; i++) {
          const landmarks = res.landmarks[i];
          const handedness = res.handedness[i][0].categoryName as 'Left' | 'Right';
          const score = res.handedness[i][0].score;

          // Calculate a simple bounding box from landmarks (min/max x,y)
          const xCoords = landmarks.map(lm => lm.x);
          const yCoords = landmarks.map(lm => lm.y);
          const xMin = Math.min(...xCoords);
          const yMin = Math.min(...yCoords);
          const xMax = Math.max(...xCoords);
          const yMax = Math.max(...yCoords);
          const width = xMax - xMin;
          const height = yMax - yMin;

          const payload: MediaPipeHandPayload = {
            type: 'hand',
            boxes: [[xMin, yMin, width, height]],
            landmarks: landmarks,
            handedness: handedness,
            classes: ['hand'],
            scores: [score],
          };

          newPercepts.push({
            modality: 'vision',
            payload: payload,
            confidence: score,
            ts: Date.now(),
          });
        }

        setState(state => ({
          percepts: [
            ...(state.percepts || []),
            ...newPercepts,
          ],
        }));
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [video, handLandmarker]); // Changed taskRef.current to handLandmarker
}
