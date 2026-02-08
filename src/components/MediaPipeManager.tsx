/**
 * MediaPipeManager - Lazy-loaded component that activates all MediaPipe hooks.
 * Extracted from App.tsx to reduce the main bundle size.
 * This entire component is code-split and only loaded when needed.
 */

import { useRef, useState } from 'react';
import {
  useFaceLandmarker,
  useHandLandmarker,
  useObjectDetector,
  usePoseLandmarker,
  useAudioClassifier,
  useImageClassifier,
  useGestureRecognizer,
  useImageSegmenter,
  useImageEmbedder,
  useSpeechResponder,
  useVoiceIntent,
  useMediaPipeModels,
} from '../hooks';
import config from '../config';
import { useIsMobile } from '../hooks/useIsMobile';

export default function MediaPipeManager({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const isMobile = useIsMobile();
  const [audioCtx] = useState(() => new AudioContext());

  const [advancedVision] = useState(config.features.advancedVision && !isMobile);

  // Load MediaPipe models
  const { models } = useMediaPipeModels();

  // MediaPipe Vision Tasks
  useFaceLandmarker(videoRef.current ?? undefined, models.faceLandmarker);
  useHandLandmarker(videoRef.current ?? undefined, models.handLandmarker);

  // These are handled by visionSense when advancedVision is true
  useObjectDetector(advancedVision ? undefined : (videoRef.current ?? undefined), models.objectDetector);
  usePoseLandmarker(advancedVision ? undefined : (videoRef.current ?? undefined), models.poseLandmarker);

  useImageClassifier(videoRef.current, models.imageClassifier);
  useGestureRecognizer(videoRef.current, models.gestureRecognizer);
  useImageSegmenter(videoRef.current, models.imageSegmenter);
  useImageEmbedder(models.imageEmbedder);

  // MediaPipe Audio Tasks
  useAudioClassifier(audioCtx, undefined, models.audioClassifier);
  useSpeechResponder();
  useVoiceIntent();

  return null;
}
