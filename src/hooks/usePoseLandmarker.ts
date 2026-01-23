import { useEffect } from 'react';
import type { PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { useVisionAudioStore } from '../store/visionAudioStore';
// import { loadTask } from '../utils/loadTask';
import type { Percept } from '../types';
import type { MediaPipePosePayload } from '../features/vision/api'; // Import Percept and VisionPayload

export function usePoseLandmarker(video?: HTMLVideoElement, poseLandmarker?: PoseLandmarker | null) {
  const setState = useVisionAudioStore((s) => s.setState);

  useEffect(() => {
    if (!video || !poseLandmarker) return;
    let rafId: number;
    let frame = 0;
    const loop = () => {
      if ((frame++ & 1) === 1) { rafId = requestAnimationFrame(loop); return; }
      
      // Guard: ensure video dimensions are valid (fix Android WebView crash)
      // MediaPipe PoseLandmarker requires ROI with width/height > 0.
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
      
      const res: PoseLandmarkerResult | undefined = poseLandmarker.detectForVideo(
        video,
        performance.now()
      );
      if (res) {
        setState(state => ({
          percepts: [
            ...(state.percepts || []),
            ...res.landmarks.map((landmarks): Percept<MediaPipePosePayload> => ({
              modality: 'vision',
              payload: {
                type: 'pose',
                landmarks,
                score: res.worldLandmarks ? 1.0 : 0.8, // Use world landmarks as confidence indicator
              },
              confidence: 0.9,
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
      poseLandmarker?.close?.();
    };
  }, [video, poseLandmarker, setState]); // Added setState dependency
}
