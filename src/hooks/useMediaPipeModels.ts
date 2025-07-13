import { useEffect, useState, useRef } from 'react';
import {
  FaceLandmarker,
  HandLandmarker,
  ObjectDetector,
  PoseLandmarker,
} from '@mediapipe/tasks-vision';
import { AudioClassifier } from '@mediapipe/tasks-audio';
import { loadTask } from '../utils/loadTask';

interface MediaPipeModels {
  faceLandmarker: FaceLandmarker | null;
  handLandmarker: HandLandmarker | null;
  objectDetector: ObjectDetector | null;
  poseLandmarker: PoseLandmarker | null;
  audioClassifier: AudioClassifier | null;
}

interface UseMediaPipeModelsResult {
  models: MediaPipeModels;
  loading: boolean;
  error: Error | null;
}

export function useMediaPipeModels(): UseMediaPipeModelsResult {
  const [models, setModels] = useState<MediaPipeModels>({
    faceLandmarker: null,
    handLandmarker: null,
    objectDetector: null,
    poseLandmarker: null,
    audioClassifier: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    const loadAllModels = async () => {
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const audio = await import('@mediapipe/tasks-audio');

        const loadedModels: Partial<MediaPipeModels> = {};

        loadedModels.faceLandmarker = await loadTask(vision.FaceLandmarker as any);
        loadedModels.handLandmarker = await loadTask(vision.HandLandmarker as any);
        loadedModels.objectDetector = await loadTask(vision.ObjectDetector as any);
        loadedModels.poseLandmarker = await loadTask(vision.PoseLandmarker as any);
        loadedModels.audioClassifier = await loadTask(audio.AudioClassifier as any, false); // AudioClassifier doesn't use GPU delegate

        if (isMounted.current) {
          setModels(loadedModels as MediaPipeModels);
        }
      } catch (err: any) {
        if (isMounted.current) {
          setError(err);
        }
      }
    };

    loadAllModels();

    return () => {
      isMounted.current = false;
      // Clean up models when component unmounts
      Object.values(models).forEach(model => {
        if (model && typeof model.close === 'function') {
          model.close();
        }
      });
    };
  }, []); // Empty dependency array ensures this runs once on mount

  return { models, loading, error };
}
