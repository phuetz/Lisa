import { useEffect } from 'react';
import type { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { useVisionAudioStore } from '../store/visionAudioStore';
// import { loadTask } from '../utils/loadTask';
import type { Percept, MediaPipeFacePayload } from '../features/vision/api'; // Import new types

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
      
      // Guard: ensure video dimensions are valid (fix Android WebView crash)
      // MediaPipe FaceLandmarker requires ROI with width/height > 0.
      // On Android WebView, video.videoWidth/videoHeight remain 0 until
      // loadedmetadata event fires and video.play() completes.
      // Without this guard, MediaPipe throws: "ROI width and height must be > 0"
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        rafId = requestAnimationFrame(run);
        return;
      }
      
      // Guard: ensure video is ready for processing
      // readyState < 2 (HAVE_CURRENT_DATA) means no frame data available.
      // MediaPipe needs at least one frame to compute landmarks.
      if (video.readyState < 2) { // HAVE_CURRENT_DATA
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
          // Calculate a simple bounding box from landmarks (min/max x,y)
          const xCoords = faceLandmarks.map((lm) => lm.x);
          const yCoords = faceLandmarks.map((lm) => lm.y);
          const xMin = Math.min(...xCoords);
          const yMin = Math.min(...yCoords);
          const xMax = Math.max(...xCoords);
          const yMax = Math.max(...yCoords);
          const width = xMax - xMin;
          const height = yMax - yMin;

          // Detect smile via blendshapes if available
          const isSmiling = res.faceBlendshapes?.some((bs) =>
            bs.categories.some(
              (c) => c.categoryName.startsWith('lipsSmile') && c.score > 0.4
            )
          );

          const payload: MediaPipeFacePayload = {
            type: 'face',
            boxes: [[xMin, yMin, width, height]],
            landmarks: faceLandmarks,
            classes: ['face'],
            scores: [1.0],
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
  }, [video, faceLandmarker, setState]); // Changed taskRef.current to faceLandmarker
}
