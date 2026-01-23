import { useEffect, useState, useRef } from 'react';
import type {
  FaceLandmarker,
  HandLandmarker,
  ObjectDetector,
  PoseLandmarker,
  ImageClassifier,
  GestureRecognizer,
  ImageSegmenter,
  ImageEmbedder,
} from '@mediapipe/tasks-vision';
import type { AudioClassifier } from '@mediapipe/tasks-audio';

// Model asset paths from CDN
const MODEL_PATHS = {
  FaceLandmarker: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  HandLandmarker: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  ObjectDetector: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
  PoseLandmarker: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  AudioClassifier: 'https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite',
  ImageClassifier: 'https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite',
  GestureRecognizer: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
  ImageSegmenter: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite',
  ImageEmbedder: 'https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite',
};

interface MediaPipeModels {
  faceLandmarker: FaceLandmarker | null;
  handLandmarker: HandLandmarker | null;
  objectDetector: ObjectDetector | null;
  poseLandmarker: PoseLandmarker | null;
  audioClassifier: AudioClassifier | null;
  imageClassifier: ImageClassifier | null;
  gestureRecognizer: GestureRecognizer | null;
  imageSegmenter: ImageSegmenter | null;
  imageEmbedder: ImageEmbedder | null;
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
    imageClassifier: null,
    gestureRecognizer: null,
    imageSegmenter: null,
    imageEmbedder: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);
  const modelsRef = useRef<MediaPipeModels>(models);

  useEffect(() => {
    const loadAllModels = async () => {
      try {
        setLoading(true);
        
        // Import MediaPipe modules
        const vision = await import('@mediapipe/tasks-vision');
        const audio = await import('@mediapipe/tasks-audio');
        
        // Initialize FilesetResolver for vision tasks
        const visionFileset = await vision.FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );
        
        // Initialize FilesetResolver for audio tasks
        const audioFileset = await audio.FilesetResolver.forAudioTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@0.10.0/wasm'
        );

        const loadedModels: Partial<MediaPipeModels> = {};

        // Load vision models with FilesetResolver
        try {
          loadedModels.faceLandmarker = await vision.FaceLandmarker.createFromOptions(visionFileset, {
            baseOptions: { modelAssetPath: MODEL_PATHS.FaceLandmarker },
            runningMode: 'VIDEO',
            numFaces: 1,
          });
          console.log('[MediaPipe] FaceLandmarker loaded');
        } catch (e) {
          console.warn('[MediaPipe] FaceLandmarker failed:', e);
        }

        try {
          loadedModels.handLandmarker = await vision.HandLandmarker.createFromOptions(visionFileset, {
            baseOptions: { modelAssetPath: MODEL_PATHS.HandLandmarker },
            runningMode: 'VIDEO',
            numHands: 2,
          });
          console.log('[MediaPipe] HandLandmarker loaded');
        } catch (e) {
          console.warn('[MediaPipe] HandLandmarker failed:', e);
        }

        try {
          loadedModels.objectDetector = await vision.ObjectDetector.createFromOptions(visionFileset, {
            baseOptions: { modelAssetPath: MODEL_PATHS.ObjectDetector },
            runningMode: 'VIDEO',
            scoreThreshold: 0.5,
          });
          console.log('[MediaPipe] ObjectDetector loaded');
        } catch (e) {
          console.warn('[MediaPipe] ObjectDetector failed:', e);
        }

        try {
          loadedModels.poseLandmarker = await vision.PoseLandmarker.createFromOptions(visionFileset, {
            baseOptions: { modelAssetPath: MODEL_PATHS.PoseLandmarker },
            runningMode: 'VIDEO',
            numPoses: 1,
          });
          console.log('[MediaPipe] PoseLandmarker loaded');
        } catch (e) {
          console.warn('[MediaPipe] PoseLandmarker failed:', e);
        }

        try {
          loadedModels.imageClassifier = await vision.ImageClassifier.createFromOptions(visionFileset, {
            baseOptions: { modelAssetPath: MODEL_PATHS.ImageClassifier },
            runningMode: 'VIDEO',
          });
          console.log('[MediaPipe] ImageClassifier loaded');
        } catch (e) {
          console.warn('[MediaPipe] ImageClassifier failed:', e);
        }

        try {
          loadedModels.gestureRecognizer = await vision.GestureRecognizer.createFromOptions(visionFileset, {
            baseOptions: { modelAssetPath: MODEL_PATHS.GestureRecognizer },
            runningMode: 'VIDEO',
            numHands: 2,
          });
          console.log('[MediaPipe] GestureRecognizer loaded');
        } catch (e) {
          console.warn('[MediaPipe] GestureRecognizer failed:', e);
        }

        // ImageSegmenter disabled - selfie_segmenter model has compatibility issues with current WASM version
        // The QUALITY_SCORES tag error occurs due to model/runtime version mismatch
        // TODO: Re-enable when MediaPipe updates the model or use a different segmentation model
        console.log('[MediaPipe] ImageSegmenter skipped (compatibility issue with current model)');
        loadedModels.imageSegmenter = null;

        try {
          loadedModels.imageEmbedder = await vision.ImageEmbedder.createFromOptions(visionFileset, {
            baseOptions: { modelAssetPath: MODEL_PATHS.ImageEmbedder },
            runningMode: 'VIDEO',
          });
          console.log('[MediaPipe] ImageEmbedder loaded');
        } catch (e) {
          console.warn('[MediaPipe] ImageEmbedder failed:', e);
        }

        // Load audio model
        try {
          loadedModels.audioClassifier = await audio.AudioClassifier.createFromOptions(audioFileset, {
            baseOptions: { modelAssetPath: MODEL_PATHS.AudioClassifier },
          });
          console.log('[MediaPipe] AudioClassifier loaded');
        } catch (e) {
          console.warn('[MediaPipe] AudioClassifier failed:', e);
        }

        if (isMounted.current) {
          const finalModels = loadedModels as MediaPipeModels;
          modelsRef.current = finalModels;
          setModels(finalModels);
          setLoading(false);
        }
      } catch (err) {
        console.error('[MediaPipe] Failed to load models:', err);
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    };

    loadAllModels();

    return () => {
      isMounted.current = false;
      // Clean up models when component unmounts
      Object.values(modelsRef.current).forEach(model => {
        if (model && typeof model.close === 'function') {
          try {
            model.close();
          } catch {
            // Ignore cleanup errors
          }
        }
      });
    };
  }, []);

  return { models, loading, error };
}
