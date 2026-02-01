import { useEffect } from 'react';
import type { HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { useAppStore } from '../store/appStore';
// import { loadTask } from '../utils/loadTask';
import type { Percept, MediaPipeHandPayload } from '../features/vision/api'; // Import new types

export function useHandLandmarker(video?: HTMLVideoElement, handLandmarker?: HandLandmarker | null) {
  const setState = useAppStore((s) => s.setState);

  useEffect(() => {
    if (!video || !handLandmarker) return;
    let rafId: number;
    let frame = 0;
    const loop = () => {
      if ((frame++ & 1) === 1) { rafId = requestAnimationFrame(loop); return; }
      
      // Guard: ensure video dimensions are valid (fix Android WebView crash)
      // MediaPipe HandLandmarker requires ROI with width/height > 0.
      // On Android WebView, video.videoWidth/videoHeight remain 0 until
      // loadedmetadata event fires and video.play() completes.
      // Without this guard, MediaPipe throws: "ROI width and height must be > 0"
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        rafId = requestAnimationFrame(loop);
        return;
      }
      
      // Guard: ensure video is ready for processing
      // readyState < 2 (HAVE_CURRENT_DATA) means no frame data available.
      // MediaPipe needs at least one frame to compute landmarks.
      if (video.readyState < 2) { // HAVE_CURRENT_DATA
        rafId = requestAnimationFrame(loop);
        return;
      }
      
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
    return () => {
      cancelAnimationFrame(rafId);
      // Cleanup: close MediaPipe task to prevent memory leaks
      handLandmarker?.close?.();
    };
  }, [video, handLandmarker, setState]); // Added setState dependency
}
