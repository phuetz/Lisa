/**
 * VisionAgent: Agent spécialisé pour la vision par ordinateur
 * 
 * Cet agent permet à Lisa d'analyser et de décrire ce qu'elle voit
 * via la webcam ou à partir d'images fournies.
 */

// L'import de agentRegistry est supprimé car il n'est pas utilisé directement dans ce fichier
import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';
import { ObjectDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import type { 
  AgentCapability, 
  AgentDomain,
  AgentExecuteProps, 
  AgentExecuteResult, 
  BaseAgent
} from './types';
import { AgentDomains } from './types';

// Types spécifiques à la Vision
export type VisionSource = 'webcam' | 'screenshot' | 'file' | 'url';
export type VisionIntent = 'describe_scene' | 'detect_objects' | 'analyze_image' | 'get_capabilities';
export type VisionTask = 'general_description' | 'object_detection' | 'face_detection' | 'landmark_detection' | 'color_analysis';

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
      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop(); // Stop the screen sharing

      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      context.drawImage(bitmap, 0, 0);

      return canvas.toDataURL();
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    }
  }

  private objectDetector: ObjectDetector | null = null;
  private faceLandmarker: FaceLandmarker | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeDetectors();
  }

  private async initializeDetectors() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      this.objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
        },
        scoreThreshold: 0.5,
        runningMode: 'IMAGE',
      });
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker_with_blendshapes.task`,
        },
        runningMode: 'IMAGE',
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });

      // Load face-api.js models
      const MODEL_URL = '/models'; // Assuming models are served from /public/models
      await faceapi.nets.tinyFaceDetector.load(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.load(MODEL_URL);
      await faceapi.nets.faceExpressionNet.load(MODEL_URL);
      await faceapi.nets.ssdMobilenetv1.load(MODEL_URL); // For general object detection if needed
      await faceapi.nets.tinyYolov2.load(MODEL_URL); // Another option for object detection
      await faceapi.nets.mtcnn.load(MODEL_URL); // For more robust face detection

      // Load DeepLab v3 model for semantic segmentation
      this.deeplabModel = await tf.loadGraphModel('https://tfhub.dev/tensorflow/deeplabv3/1/lite/1');

      this.isInitialized = true;
      this.deeplabModel = await tf.loadGraphModel('https://tfhub.dev/tensorflow/deeplabv3/1/lite/1');

      console.log('MediaPipe Object Detector, Face Landmarker, face-api.js models, and DeepLab v3 initialized.');
    } catch (error) {
      console.error('Failed to initialize MediaPipe detectors and face-api.js models:', error);
    }
  }

  // Analyser une image
  private async analyzeImage(
    imageData: string, 
    task: VisionTask,
    options?: VisionOptions
  ): Promise<VisionResult> {
    const startTime = Date.now();
    if (!this.isInitialized || (!this.objectDetector && !this.faceLandmarker)) {
      throw new Error('MediaPipe detectors are not initialized.');
    }

    const imageElement = new Image();
    imageElement.src = imageData;
    await new Promise(resolve => { imageElement.onload = resolve; });

    switch (task) {
      case 'object_detection':
        if (!this.objectDetector) throw new Error('Object Detector not initialized.');
        const detections = this.objectDetector.detect(imageElement);
        return {
          objects: detections.detections.map(d => ({
            name: d.categories[0].categoryName,
            confidence: d.categories[0].score,
            boundingBox: {
              x: d.boundingBox.originX,
              y: d.boundingBox.originY,
              width: d.boundingBox.width,
              height: d.boundingBox.height,
            },
          })),
          processingTimeMs: Date.now() - startTime
        };
      case 'general_description':
        let description = "";
        let objectsDetected: DetectedObject[] = [];
        let faceCount = 0;
        let emotions: any[] = [];

        if (this.objectDetector) {
          const objDetections = this.objectDetector.detect(imageElement);
          objectsDetected = objDetections.detections.map(d => ({
            name: d.categories[0].categoryName,
            confidence: d.categories[0].score,
          }));
          if (objectsDetected.length > 0) {
            description += `I see ${objectsDetected.length} objects including ${objectsDetected.map(o => o.name).join(', ')}. `;
          }
        }

        const faceapiDetections = await faceapi.detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
        faceCount = faceapiDetections.length;
        if (faceCount > 0) {
          description += `I also see ${faceCount} face(s). `;
          emotions = faceapiDetections.map(d => d.expressions);
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
      case 'face_detection':
        const fullFaceDescriptions = await faceapi.detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
        return {
          faceCount: fullFaceDescriptions.length,
          objects: fullFaceDescriptions.map(d => ({
            name: "face",
            confidence: d.detection.score,
            boundingBox: {
              x: d.detection.box.x,
              y: d.detection.box.y,
              width: d.detection.box.width,
              height: d.detection.box.height,
            },
            attributes: {
              expressions: d.expressions,
              age: d.age, // face-api.js can also estimate age if age model is loaded
              gender: d.gender // face-api.js can also estimate gender if gender model is loaded
            }
          })),
          processingTimeMs: Date.now() - startTime
        };
      case 'color_analysis':
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
      case 'semantic_segmentation':
        if (!this.deeplabModel) throw new Error('DeepLab v3 model not initialized.');
        const segmentationResult = tf.tidy(() => {
          const tfImage = tf.browser.fromPixels(imageElement);
          const resized = tf.image.resizeBilinear(tfImage, [257, 257]);
          const normalized = resized.div(255);
          const batched = normalized.expandDims(0);
          const prediction = this.deeplabModel.predict(batched) as tf.Tensor;
          const result = tf.argMax(prediction.squeeze(), 2);
          return result.arraySync();
        });
        return {
          segmentationMap: segmentationResult,
          processingTimeMs: Date.now() - startTime
        };
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
          
          // Analyser l'image selon la tâche demandée
          const result = await this.analyzeImage(imageData, task, options);
          
          return {
            success: true,
            output: result,
            metadata: {
              executionTime: Date.now() - startTime,
              source: source
              // La propriété task n'est pas définie dans le type des métadonnées
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
    } catch (error: any) {
      console.error(`${this.name} execution error:`, error);
      return {
        success: false,
        error: error.message || 'An unknown error occurred',
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
