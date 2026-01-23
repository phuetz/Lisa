import { useEffect, useRef } from 'react';
import type { ImageSegmenter } from '@mediapipe/tasks-vision';
import { useVisionAudioStore } from '../store/visionAudioStore';
import type { Percept, MediaPipeSegmentationPayload } from '../features/vision/api';

export function useImageSegmenter(
  videoElement: HTMLVideoElement | null,
  imageSegmenter: ImageSegmenter | null
) {
  const lastProcessedTimeRef = useRef<number>(0);
  const setState = useVisionAudioStore((s) => s.setState);

  useEffect(() => {
    if (!videoElement || !imageSegmenter) return;

    let animationId: number;
    const processFrame = () => {
      const now = performance.now();
      // Process every 1000ms for image segmentation (heavy operation)
      if (now - lastProcessedTimeRef.current >= 1000) {
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
          const result = imageSegmenter.segment(videoElement);
          
          if (result.categoryMask) {
            const payload: MediaPipeSegmentationPayload = {
              type: 'segmentation',
              width: result.categoryMask.width,
              height: result.categoryMask.height,
              hasConfidenceMask: !!result.confidenceMasks,
              maskDataAvailable: true,
            };

            const percept: Percept<MediaPipeSegmentationPayload> = {
              modality: 'vision',
              payload,
              confidence: 1.0,
              ts: Date.now(),
            };

            setState(state => ({
              percepts: [...(state.percepts || []), percept],
            }));
          }
        } catch (err) {
          console.warn('Image segmentation error:', err);
        }
        lastProcessedTimeRef.current = now;
      }
      animationId = requestAnimationFrame(processFrame);
    };

    animationId = requestAnimationFrame(processFrame);
    return () => {
      cancelAnimationFrame(animationId);
      // Cleanup: release MediaPipe task to avoid Android WebView crashes/leaks.
      imageSegmenter.close();
    };
  }, [videoElement, imageSegmenter, setState]);
}
