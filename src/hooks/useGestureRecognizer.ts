import { useEffect, useRef } from 'react';
import type { GestureRecognizer } from '@mediapipe/tasks-vision';
import { useVisionAudioStore } from '../store/visionAudioStore';
import type { Percept, MediaPipeGesturePayload } from '../features/vision/api';

export function useGestureRecognizer(
  videoElement: HTMLVideoElement | null,
  gestureRecognizer: GestureRecognizer | null
) {
  const lastProcessedTimeRef = useRef<number>(0);
  const setState = useVisionAudioStore((s) => s.setState);

  useEffect(() => {
    if (!videoElement || !gestureRecognizer) return;

    let animationId: number;
    const processFrame = () => {
      const now = performance.now();
      // Process every 200ms for gesture recognition
      if (now - lastProcessedTimeRef.current >= 200) {
        try {
          const result = gestureRecognizer.recognize(videoElement);
          
          if (result.gestures && result.gestures.length > 0) {
            const detectedGestures = result.gestures[0]
              .filter((gesture) => gesture.score > 0.7)
              .map((gesture) => ({
                name: gesture.categoryName,
                score: gesture.score,
              }));

            if (detectedGestures.length > 0) {
              const payload: MediaPipeGesturePayload = {
                type: 'gesture',
                gestures: detectedGestures,
                handedness: result.handednesses?.[0]?.[0]?.categoryName || 'Unknown',
                landmarks: result.landmarks?.[0] || [],
              };

              const percept: Percept<MediaPipeGesturePayload> = {
                modality: 'vision',
                payload,
                confidence: detectedGestures[0].score,
                ts: Date.now(),
              };

              setState(state => ({
                percepts: [...(state.percepts || []), percept],
              }));
            }
          }
        } catch (err) {
          console.warn('Gesture recognition error:', err);
        }
        lastProcessedTimeRef.current = now;
      }
      animationId = requestAnimationFrame(processFrame);
    };

    animationId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animationId);
  }, [videoElement, gestureRecognizer, setState]);
}
