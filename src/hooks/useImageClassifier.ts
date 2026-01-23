import { useEffect, useRef } from 'react';
import type { ImageClassifier } from '@mediapipe/tasks-vision';
import { useVisionAudioStore } from '../store/visionAudioStore';
import type { Percept, MediaPipeImageClassificationPayload } from '../features/vision/api';

export function useImageClassifier(
  videoElement: HTMLVideoElement | null,
  imageClassifier: ImageClassifier | null
) {
  const lastProcessedTimeRef = useRef<number>(0);
  const setState = useVisionAudioStore((s) => s.setState);

  useEffect(() => {
    if (!videoElement || !imageClassifier) return;

    let animationId: number;
    const processFrame = () => {
      const now = performance.now();
      // Process every 500ms for image classification
      if (now - lastProcessedTimeRef.current >= 500) {
        // Guard: ensure video dimensions are valid (fix Android WebView crash)
        // MediaPipe requires ROI width/height > 0; Android WebView can report 0
        // until metadata is loaded and playback is active.
        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
          animationId = requestAnimationFrame(processFrame);
          return;
        }

        // Guard: ensure video has frame data ready for MediaPipe
        // readyState < 2 (HAVE_CURRENT_DATA) means no frame is available.
        if (videoElement.readyState < 2) {
          animationId = requestAnimationFrame(processFrame);
          return;
        }

        try {
          const result = imageClassifier.classify(videoElement);
          
          if (result.classifications && result.classifications.length > 0) {
            const topClassifications = result.classifications[0].categories
              .slice(0, 3)
              .map((cat) => ({
                category: cat.categoryName,
                score: cat.score,
                displayName: cat.displayName || cat.categoryName,
              }));

            if (topClassifications.length > 0 && topClassifications[0].score > 0.5) {
              const payload: MediaPipeImageClassificationPayload = {
                type: 'image_classification',
                classifications: topClassifications,
                topCategory: topClassifications[0].category,
                topScore: topClassifications[0].score,
              };

              const percept: Percept<MediaPipeImageClassificationPayload> = {
                modality: 'vision',
                payload,
                confidence: topClassifications[0].score,
                ts: Date.now(),
              };

              setState(state => ({
                percepts: [...(state.percepts || []), percept],
              }));
            }
          }
        } catch (err) {
          console.warn('Image classification error:', err);
        }
        lastProcessedTimeRef.current = now;
      }
      animationId = requestAnimationFrame(processFrame);
    };

    animationId = requestAnimationFrame(processFrame);
    return () => {
      cancelAnimationFrame(animationId);
      // Cleanup: release MediaPipe task to avoid Android WebView crashes/leaks.
      imageClassifier.close();
    };
  }, [videoElement, imageClassifier, setState]);
}
