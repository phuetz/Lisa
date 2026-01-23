/**
 * VisionAgent: Agent spécialisé pour la vision par ordinateur
 * 
 * Cet agent permet à Lisa d'analyser et de décrire ce qu'elle voit
 * via la webcam ou à partir d'images fournies.
 */

// L'import de agentRegistry est supprimé car il n'est pas utilisé directement dans ce fichier
import * as tf from '@tensorflow/tfjs';
import { ObjectDetector, FilesetResolver, FaceLandmarker, PoseLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';
import type { 
  AgentCapability, 
  AgentDomain,
  AgentExecuteProps, 
  AgentExecuteResult, 
  BaseAgent
} from '../core/types';
import { AgentDomains } from '../core/types';

// Types spécifiques à la Vision
export type VisionSource = 'webcam' | 'screenshot' | 'file' | 'url';
export type VisionIntent = 'describe_scene' | 'detect_objects' | 'analyze_image' | 'get_capabilities';
export type VisionTask = 'general_description' | 'object_detection' | 'face_detection' | 'landmark_detection' | 'color_analysis' | 'semantic_segmentation' | 'pose_detection' | 'hand_detection';

export interface VisionOptions {
  maxResults?: number;
  confidenceThreshold?: number; // Seuil de confiance minimum (0-1)
  includeAttributes?: boolean;
  language?: string;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes?: Record<string, string | number>;
}

export interface VisionResult {
  description?: string;
  objects?: DetectedObject[];
  sceneCategories?: Array<{category: string, confidence: number}>;
  faceCount?: number;
  dominantColors?: Array<{color: string, percentage: number}>;
  emotions?: Record<string, number>[];
  segmentationMap?: number[][];
  processingTimeMs?: number;
}

/**
 * Agent pour la vision par ordinateur
 */
export class VisionAgent implements BaseAgent {
  name = 'VisionAgent';
  description = 'Analyzes and describes visual content from webcam, screenshots, or images';
  version = '1.0.0';
  domain = AgentDomains.ANALYSIS as AgentDomain;
  capabilities = ['scene_description', 'object_detection', 'image_analysis'];
  valid = true;
  
  // Vérifie si la vision est disponible
  private checkAvailability(): boolean {
    // Dans une vraie implémentation, vérifier si les APIs nécessaires sont disponibles
    // Par exemple MediaDevices API et un modèle de vision ML
    
    // Pour cette démo, on va simplement retourner true
    return true;
  }

  // Accéder à la webcam
  private async getWebcamStream(): Promise<MediaStream | null> {
    try {
      // Tentative d'accès à la webcam via l'API MediaDevices
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      return stream;
    } catch (error) {
      console.error('Failed to access webcam:', error);
      return null;
    }
  }

  // Capturer une image depuis la webcam
  private async captureWebcamImage(): Promise<string | null> {
    const stream = await this.getWebcamStream();
    if (!stream) return null;

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        
        if (!context) {
          stream.getTracks().forEach(track => track.stop());
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
        
        // Resolve with base64 encoded image
        resolve(canvas.toDataURL('image/png'));
      };
      video.onerror = (err) => {
        stream.getTracks().forEach(track => track.stop());
        reject(new Error(`Video error: ${err}`));
      };
    });
  }

  // Capturer une capture d'écran
  private async captureScreenshot(): Promise<string | null> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      return await new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext('2d');
          if (!context) {
            stream.getTracks().forEach(t => t.stop());
            reject(new Error('Could not get canvas context'));
            return;
          }
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          stream.getTracks().forEach(t => t.stop());
          resolve(canvas.toDataURL());
        };
        video.onerror = (err) => {
          stream.getTracks().forEach(t => t.stop());
          reject(new Error(`Video error: ${err}`));
        };
      });
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    }
  }

  private objectDetector: ObjectDetector | null = null;
  private faceLandmarker: FaceLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private deeplabModel: tf.GraphModel | null = null;

  constructor() {
    this.initializationPromise = this.initializeDetectors();
  }

  /**
   * Attendre que les détecteurs MediaPipe soient initialisés
   */
  async waitForInitialization(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    return this.isInitialized;
  }

  /**
   * Vérifier si les détecteurs sont prêts
   */
  get isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Détection en temps réel sur un élément vidéo
   * Retourne les détections pour être dessinées sur un canvas overlay
   */
  detectRealtime(video: HTMLVideoElement): {
    objects: Array<{ name: string; confidence: number; box: { x: number; y: number; width: number; height: number } }>;
    faces: Array<{ box: { x: number; y: number; width: number; height: number }; landmarks?: { x: number; y: number }[] }>;
    poses: Array<{ landmarks: { x: number; y: number; z: number; visibility: number }[] }>;
    hands: Array<{ handedness: string; landmarks: { x: number; y: number; z: number }[] }>;
  } {
    const result = {
      objects: [] as Array<{ name: string; confidence: number; box: { x: number; y: number; width: number; height: number } }>,
      faces: [] as Array<{ box: { x: number; y: number; width: number; height: number }; landmarks?: { x: number; y: number }[] }>,
      poses: [] as Array<{ landmarks: { x: number; y: number; z: number; visibility: number }[] }>,
      hands: [] as Array<{ handedness: string; landmarks: { x: number; y: number; z: number }[] }>,
    };

    if (!this.isInitialized) return result;

    const timestamp = performance.now();

    // Object detection
    if (this.objectDetector) {
      try {
        const detections = this.objectDetector.detectForVideo(video, timestamp);
        result.objects = detections.detections
          .filter(d => d.boundingBox)
          .map(d => ({
            name: d.categories[0]?.categoryName || 'Unknown',
            confidence: d.categories[0]?.score || 0,
            box: {
              x: d.boundingBox!.originX,
              y: d.boundingBox!.originY,
              width: d.boundingBox!.width,
              height: d.boundingBox!.height,
            },
          }));
      } catch (e) {
        console.warn('[VisionAgent] Object detection error:', e);
      }
    }

    // Face detection
    if (this.faceLandmarker) {
      try {
        const faceResults = this.faceLandmarker.detectForVideo(video, timestamp);
        result.faces = faceResults.faceLandmarks.map(landmarks => {
          // Calculate bounding box from landmarks
          const xs = landmarks.map(l => l.x * video.videoWidth);
          const ys = landmarks.map(l => l.y * video.videoHeight);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          return {
            box: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
            // Return all 478 face mesh landmarks for full face contour drawing
            landmarks: landmarks.map(l => ({ x: l.x * video.videoWidth, y: l.y * video.videoHeight })),
          };
        });
      } catch (e) {
        console.warn('[VisionAgent] Face detection error:', e);
      }
    }

    // Pose detection
    if (this.poseLandmarker) {
      try {
        const poseResults = this.poseLandmarker.detectForVideo(video, timestamp);
        result.poses = poseResults.landmarks.map(landmarks => ({
          landmarks: landmarks.map(l => ({
            x: l.x * video.videoWidth,
            y: l.y * video.videoHeight,
            z: l.z,
            visibility: l.visibility ?? 1,
          })),
        }));
      } catch (e) {
        console.warn('[VisionAgent] Pose detection error:', e);
      }
    }

    // Hand detection
    if (this.handLandmarker) {
      try {
        const handResults = this.handLandmarker.detectForVideo(video, timestamp);
        result.hands = handResults.landmarks.map((landmarks, i) => ({
          handedness: handResults.handednesses[i]?.[0]?.categoryName || 'Unknown',
          landmarks: landmarks.map(l => ({
            x: l.x * video.videoWidth,
            y: l.y * video.videoHeight,
            z: l.z,
          })),
        }));
      } catch (e) {
        console.warn('[VisionAgent] Hand detection error:', e);
      }
    }

    return result;
  }

  /**
   * Changer le mode de détection (IMAGE ou VIDEO)
   */
  async setRunningMode(mode: 'IMAGE' | 'VIDEO'): Promise<void> {
    if (!this.isInitialized) return;
    
    try {
      if (this.objectDetector) {
        await this.objectDetector.setOptions({ runningMode: mode });
      }
      if (this.faceLandmarker) {
        await this.faceLandmarker.setOptions({ runningMode: mode });
      }
      if (this.poseLandmarker) {
        await this.poseLandmarker.setOptions({ runningMode: mode });
      }
      if (this.handLandmarker) {
        await this.handLandmarker.setOptions({ runningMode: mode });
      }
      console.log(`[VisionAgent] Running mode set to ${mode}`);
    } catch (e) {
      console.error('[VisionAgent] Error setting running mode:', e);
    }
  }

  private async initializeDetectors() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );
      
      // Try GPU first, fallback to CPU
      const gpuAvailable = !!(navigator as unknown as { gpu?: unknown }).gpu;
      let delegate: 'GPU' | 'CPU' = gpuAvailable ? 'GPU' : 'CPU';
      
      try {
        this.objectDetector = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
            delegate,
          },
          scoreThreshold: 0.5,
          runningMode: 'IMAGE',
        });
      } catch (gpuError) {
        if (delegate === 'GPU') {
          console.warn('[VisionAgent] GPU failed for ObjectDetector, falling back to CPU');
          delegate = 'CPU';
          this.objectDetector = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
              delegate: 'CPU',
            },
            scoreThreshold: 0.5,
            runningMode: 'IMAGE',
          });
        } else {
          throw gpuError;
        }
      }
      
      try {
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate,
          },
          runningMode: 'IMAGE',
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          numFaces: 1,
        });
      } catch (gpuError) {
        if (delegate === 'GPU') {
          console.warn('[VisionAgent] GPU failed for FaceLandmarker, falling back to CPU');
          this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
              delegate: 'CPU',
            },
            runningMode: 'IMAGE',
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
            numFaces: 1,
          });
        } else {
          throw gpuError;
        }
      }

      // Load PoseLandmarker
      try {
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate,
          },
          runningMode: 'IMAGE',
          numPoses: 1,
        });
        console.log('[VisionAgent] PoseLandmarker initialized');
      } catch (poseError) {
        console.warn('[VisionAgent] PoseLandmarker failed:', poseError);
      }

      // Load HandLandmarker
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate,
          },
          runningMode: 'IMAGE',
          numHands: 2,
        });
        console.log('[VisionAgent] HandLandmarker initialized');
      } catch (handError) {
        console.warn('[VisionAgent] HandLandmarker failed:', handError);
      }

      // DeepLab v3 disabled - TFHub redirects to Kaggle which has CORS issues
      // To re-enable, host the model locally or use a CORS proxy
      this.deeplabModel = null;

      this.isInitialized = true;

      console.log('[VisionAgent] All MediaPipe detectors initialized successfully.');
    } catch (error) {
      console.error('[VisionAgent] Failed to initialize detectors:', error);
    }
  }

  // Analyser une image
  private async analyzeImage(
    imageData: string, 
    task: VisionTask,
    _options?: VisionOptions
  ): Promise<VisionResult> {
    const startTime = Date.now();
    if (!this.isInitialized || (!this.objectDetector && !this.faceLandmarker)) {
      throw new Error('MediaPipe detectors are not initialized.');
    }

    // S'assurer que les détecteurs sont en mode IMAGE pour l'analyse d'images statiques
    await this.setRunningMode('IMAGE');

    const imageElement = new Image();
    imageElement.src = imageData;
    await new Promise(resolve => { imageElement.onload = resolve; });

    switch (task) {
      case 'object_detection': {
        if (!this.objectDetector) throw new Error('Object Detector not initialized.');
        const detections = this.objectDetector.detect(imageElement);
        return {
          objects: detections.detections
            .filter(d => d.boundingBox)
            .map(d => ({
              name: d.categories[0].categoryName,
              confidence: d.categories[0].score,
              boundingBox: {
                x: d.boundingBox!.originX,
                y: d.boundingBox!.originY,
                width: d.boundingBox!.width,
                height: d.boundingBox!.height,
              },
            })),
          processingTimeMs: Date.now() - startTime
        };
      }
      case 'general_description': {
        let description = "";
        let objectsDetected: DetectedObject[] = [];
        let faceCount = 0;
        const emotions: Record<string, number>[] = [];

        if (this.objectDetector) {
          const objDetections = this.objectDetector.detect(imageElement);
          objectsDetected = objDetections.detections.map(d => ({
            name: d.categories?.[0]?.categoryName ?? 'unknown',
            confidence: d.categories?.[0]?.score ?? 0,
            ...(d.boundingBox ? { boundingBox: {
              x: d.boundingBox.originX,
              y: d.boundingBox.originY,
              width: d.boundingBox.width,
              height: d.boundingBox.height,
            }} : {})
          }));
          if (objectsDetected.length > 0) {
            description += `I see ${objectsDetected.length} objects including ${objectsDetected.map(o => o.name).join(', ')}. `;
          }
        }

        // Use native FaceLandmarker instead of face-api.js
        if (this.faceLandmarker) {
          const faceResult = this.faceLandmarker.detect(imageElement);
          faceCount = faceResult.faceLandmarks.length;
          if (faceCount > 0) {
            description += `I also see ${faceCount} face(s). `;
            // Extract emotions from blendshapes if available
            if (faceResult.faceBlendshapes) {
              for (const blendshape of faceResult.faceBlendshapes) {
                const emotionMap: Record<string, number> = {};
                for (const cat of blendshape.categories) {
                  if (cat.categoryName.includes('smile') || cat.categoryName.includes('happy')) {
                    emotionMap['happy'] = (emotionMap['happy'] || 0) + cat.score;
                  }
                  if (cat.categoryName.includes('sad') || cat.categoryName.includes('frown')) {
                    emotionMap['sad'] = (emotionMap['sad'] || 0) + cat.score;
                  }
                }
                emotions.push(emotionMap);
              }
            }
          }
        }

        if (!description) {
          description = "I don't see anything specific, but it's an image.";
        }

        return {
          description,
          objects: objectsDetected,
          faceCount,
          emotions,
          processingTimeMs: Date.now() - startTime
        };
      }
      case 'face_detection': {
        if (!this.faceLandmarker) {
          return {
            description: 'Face detection unavailable (FaceLandmarker not loaded)',
            faceCount: 0,
            objects: [],
            processingTimeMs: Date.now() - startTime
          };
        }
        const faceResult = this.faceLandmarker.detect(imageElement);
        const faceObjects: DetectedObject[] = faceResult.faceLandmarks.map((landmarks, idx) => {
          // Calculate bounding box from landmarks
          const xCoords = landmarks.map(lm => lm.x * imageElement.width);
          const yCoords = landmarks.map(lm => lm.y * imageElement.height);
          const xMin = Math.min(...xCoords);
          const yMin = Math.min(...yCoords);
          const xMax = Math.max(...xCoords);
          const yMax = Math.max(...yCoords);
          
          // Check for smile in blendshapes
          let isSmiling = false;
          if (faceResult.faceBlendshapes && faceResult.faceBlendshapes[idx]) {
            isSmiling = faceResult.faceBlendshapes[idx].categories.some(
              c => c.categoryName.includes('smile') && c.score > 0.4
            );
          }

          return {
            name: 'face',
            confidence: 1.0,
            boundingBox: {
              x: xMin,
              y: yMin,
              width: xMax - xMin,
              height: yMax - yMin,
            },
            attributes: {
              landmarks: landmarks.length,
              isSmiling: isSmiling ? 1 : 0,
            }
          };
        });

        return {
          faceCount: faceResult.faceLandmarks.length,
          objects: faceObjects,
          processingTimeMs: Date.now() - startTime
        };
      }
      case 'pose_detection': {
        if (!this.poseLandmarker) {
          return {
            description: 'Pose detection unavailable (PoseLandmarker not loaded)',
            objects: [],
            processingTimeMs: Date.now() - startTime
          };
        }
        const poseResult = this.poseLandmarker.detect(imageElement);
        const poseObjects: DetectedObject[] = poseResult.landmarks.map((landmarks, idx) => {
          // Calculate bounding box from pose landmarks
          const xCoords = landmarks.map(lm => lm.x * imageElement.width);
          const yCoords = landmarks.map(lm => lm.y * imageElement.height);
          const xMin = Math.min(...xCoords);
          const yMin = Math.min(...yCoords);
          const xMax = Math.max(...xCoords);
          const yMax = Math.max(...yCoords);

          return {
            name: 'person',
            confidence: landmarks[0]?.visibility ?? 0.9,
            boundingBox: {
              x: xMin,
              y: yMin,
              width: xMax - xMin,
              height: yMax - yMin,
            },
            attributes: {
              landmarks: landmarks.length,
              poseIndex: idx,
            }
          };
        });

        return {
          description: `Detected ${poseResult.landmarks.length} person(s) with body pose`,
          objects: poseObjects,
          processingTimeMs: Date.now() - startTime
        };
      }
      case 'hand_detection': {
        if (!this.handLandmarker) {
          return {
            description: 'Hand detection unavailable (HandLandmarker not loaded)',
            objects: [],
            processingTimeMs: Date.now() - startTime
          };
        }
        const handResult = this.handLandmarker.detect(imageElement);
        const handObjects: DetectedObject[] = handResult.landmarks.map((landmarks, idx) => {
          // Calculate bounding box from hand landmarks
          const xCoords = landmarks.map(lm => lm.x * imageElement.width);
          const yCoords = landmarks.map(lm => lm.y * imageElement.height);
          const xMin = Math.min(...xCoords);
          const yMin = Math.min(...yCoords);
          const xMax = Math.max(...xCoords);
          const yMax = Math.max(...yCoords);

          const handedness = handResult.handedness[idx]?.[0]?.categoryName ?? 'unknown';
          const score = handResult.handedness[idx]?.[0]?.score ?? 0.9;

          return {
            name: `${handedness} hand`,
            confidence: score,
            boundingBox: {
              x: xMin,
              y: yMin,
              width: xMax - xMin,
              height: yMax - yMin,
            },
            attributes: {
              landmarks: landmarks.length,
              handedness,
            }
          };
        });

        return {
          description: `Detected ${handResult.landmarks.length} hand(s)`,
          objects: handObjects,
          processingTimeMs: Date.now() - startTime
        };
      }
      case 'color_analysis': {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context for color analysis.');

        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

        const imageDataPixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const colorMap: { [key: string]: number } = {};
        const step = 10; // Analyze every 10th pixel to speed up

        for (let i = 0; i < imageDataPixels.length; i += 4 * step) {
          const r = imageDataPixels[i];
          const g = imageDataPixels[i + 1];
          const b = imageDataPixels[i + 2];
          const rgb = `${r},${g},${b}`;
          colorMap[rgb] = (colorMap[rgb] || 0) + 1;
        }

        const sortedColors = Object.entries(colorMap).sort(([, countA], [, countB]) => countB - countA);
        const totalPixels = (canvas.width * canvas.height) / (step * step);

        const dominantColors = sortedColors.slice(0, 5).map(([rgb, count]) => {
          const [r, g, b] = rgb.split(',').map(Number);
          return {
            color: `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`,
            percentage: count / totalPixels
          };
        });

        return {
          dominantColors,
          processingTimeMs: Date.now() - startTime
        };
      }
      case 'semantic_segmentation': {
        if (!this.deeplabModel) throw new Error('DeepLab v3 model not initialized.');
        const model = this.deeplabModel;
        const segmentationResult = tf.tidy(() => {
          const tfImage = tf.browser.fromPixels(imageElement);
          const resized = tf.image.resizeBilinear(tfImage, [257, 257]);
          const normalized = resized.div(255);
          const batched = normalized.expandDims(0);
          const prediction = model.predict(batched) as tf.Tensor;
          const result = tf.argMax(prediction.squeeze(), 2);
          return result.arraySync() as number[][];
        });
        return {
          segmentationMap: segmentationResult,
          processingTimeMs: Date.now() - startTime
        };
      }
      default:
        return {
          description: "Image analysis complete, but no specific insights available for the requested task.",
          processingTimeMs: Date.now() - startTime
        };
    }
  }

  // Exécution de l'agent
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const intent = props.intent as VisionIntent;
    const parameters = props.parameters || {};

    // Si la vision n'est pas disponible, on retourne une erreur
    if (!this.checkAvailability()) {
      return {
        success: false,
        error: "Vision capabilities are not available in this environment",
        output: null
      };
    }

    try {
      // Traiter les différentes intentions
      switch (intent) {
        case 'describe_scene': {
          const source = parameters.source as VisionSource || 'webcam';
          const options = parameters.options as VisionOptions || {};
          let imageData: string | null;
          
          // Obtenir l'image selon la source
          if (source === 'webcam') {
            imageData = await this.captureWebcamImage();
          } else if (source === 'screenshot') {
            imageData = await this.captureScreenshot();
          } else if (source === 'file' || source === 'url') {
            // Implémentation future: chargement d'un fichier ou d'une URL
            return {
              success: false,
              error: `Source '${source}' not implemented yet`,
              output: null
            };
          } else {
            return {
              success: false,
              error: `Unknown vision source: ${source}`,
              output: null
            };
          }
          
          if (!imageData) {
            return {
              success: false,
              error: `Failed to capture image from ${source}`,
              output: null
            };
          }
          
          // Analyser l'image pour une description générale
          const result = await this.analyzeImage(imageData, 'general_description', options);
          
          return {
            success: true,
            output: result,
            metadata: {
              executionTime: Date.now() - startTime,
              source: source
            }
          };
        }
        
        case 'detect_objects': {
          const source = parameters.source as VisionSource || 'webcam';
          const options = parameters.options as VisionOptions || {};
          let imageData: string | null;
          
          // Obtenir l'image selon la source
          if (source === 'webcam') {
            imageData = await this.captureWebcamImage();
          } else if (source === 'screenshot') {
            imageData = await this.captureScreenshot();
          } else {
            // Source non supportée
            return {
              success: false,
              error: `Source '${source}' not implemented yet`,
              output: null
            };
          }
          
          if (!imageData) {
            return {
              success: false,
              error: `Failed to capture image from ${source}`,
              output: null
            };
          }
          
          // Analyser l'image pour détecter des objets
          const result = await this.analyzeImage(imageData, 'object_detection', options);
          
          return {
            success: true,
            output: result,
            metadata: {
              executionTime: Date.now() - startTime,
              source: source
            }
          };
        }
        
        case 'analyze_image': {
          const source = parameters.source as VisionSource || 'webcam';
          const task = parameters.task as VisionTask || 'general_description';
          const options = parameters.options as VisionOptions || {};
          
          // Utiliser l'image fournie en paramètre si disponible
          let imageData: string | null = parameters.imageData as string | null;
          
          // Sinon, capturer une nouvelle image selon la source
          if (!imageData) {
            if (source === 'webcam') {
              imageData = await this.captureWebcamImage();
            } else if (source === 'screenshot') {
              imageData = await this.captureScreenshot();
            } else {
              return {
                success: false,
                error: `Source '${source}' not implemented yet`,
                output: null
              };
            }
          }
          
          if (!imageData) {
            return {
              success: false,
              error: `Failed to capture image from ${source}`,
              output: null
            };
          }
          
          // Analyser l'image selon la tâche demandée
          const result = await this.analyzeImage(imageData, task, options);
          
          return {
            success: true,
            output: result,
            metadata: {
              executionTime: Date.now() - startTime,
              source: source
            }
          };
        }
        
        case 'get_capabilities': {
          return {
            success: true,
            output: {
              availableSources: ['webcam', 'screenshot'],
              availableTasks: [
                'general_description',
                'object_detection',
                'face_detection',
                'color_analysis',
                'semantic_segmentation'
              ]
            }
          };
        }
        
        default:
          return {
            success: false,
            error: `Unknown intent: ${intent}`,
            output: null
          };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error(`${this.name} execution error:`, error);
      return {
        success: false,
        error: errorMessage,
        output: null,
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  // Vérifier si l'agent peut traiter une requête
  async canHandle(query: string): Promise<number> {
    // Mots-clés liés à la vision
    const visionKeywords = [
      'see', 'look', 'describe', 'identify', 'what is', 'what are', 
      'camera', 'webcam', 'objects', 'image', 'picture', 'photo',
      'detect', 'recognize', 'scene', 'visual',
      'segmentation', 'segment'
    ];
    
    // Vérifier la présence de mots-clés dans la requête
    const lowerQuery = query.toLowerCase();
    const matchCount = visionKeywords.filter(keyword => 
      lowerQuery.includes(keyword.toLowerCase())
    ).length;
    
    // Calculer un score de confiance basique
    if (matchCount > 2) return 0.9;  // Très forte probabilité
    if (matchCount > 0) return 0.7;  // Probabilité moyenne à forte
    
    // Vérifier les modèles de requêtes courants
    if (lowerQuery.match(/what (do you|can you|is) see/)) return 0.95;
    if (lowerQuery.match(/what('s| is) (in|on) (the|my) (screen|camera)/)) return 0.9;
    if (lowerQuery.match(/show me what (you see|is there)/)) return 0.9;
    
    return 0.2; // Faible probabilité par défaut
  }

  // Obtenir les capacités de l'agent
  async getCapabilities(): Promise<AgentCapability[]> {
    return [
      {
        name: "describe_scene",
        description: "Provides a general description of what is visible in the webcam or on screen",
        requiredParameters: [
          {
            name: "source",
            type: "string",
            required: false,
            description: "Source of the image (webcam, screenshot, file, url)",
            defaultValue: "webcam"
          },
          {
            name: "options",
            type: "object",
            required: false,
            description: "Vision options including language, region, etc."
          }
        ]
      },
      {
        name: "detect_objects",
        description: "Identifies and locates objects in the webcam or on screen",
        requiredParameters: [
          {
            name: "source",
            type: "string",
            required: false,
            description: "Source of the image (webcam, screenshot, file, url)",
            defaultValue: "webcam"
          },
          {
            name: "options",
            type: "object",
            required: false,
            description: "Detection options including confidence threshold, max results, etc."
          }
        ]
      },
      {
        name: "analyze_image",
        description: "Performs various analyses on the image based on the specified task",
        requiredParameters: [
          {
            name: "source",
            type: "string",
            required: false,
            description: "Source of the image (webcam, screenshot, file, url)",
            defaultValue: "webcam"
          },
          {
            name: "task",
            type: "string",
            required: false,
            description: "Analysis task (general_description, object_detection, face_detection, color_analysis, semantic_segmentation)",
            defaultValue: "general_description"
          },
          {
            name: "options",
            type: "object",
            required: false,
            description: "Analysis options including confidence threshold, region, etc."
          }
        ]
      },
      {
        name: "get_capabilities",
        description: "Get available vision capabilities",
        requiredParameters: []
      }
    ];
  }
}

// Enregistrer l'agent dans le registre
// L'enregistrement centralisé se fait via src/agents/index.ts
