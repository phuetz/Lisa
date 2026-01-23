import { ObjectDetector, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { VisionConfig, VisionPercept } from './types';

// Default configuration
const DEFAULT_CONFIG: VisionConfig = {
  models: {
    yolo: {
      url: 'https://tfhub.dev/tensorflow/tfjs-model/yolov8n/1/default/1',
      confidence: 0.5,
      iou: 0.45
    }
  },
  features: {
    enableFace: false,
    enableHand: false,
    enablePose: true,
    enableFallDetection: false
  }
};

export class VisionService {
  private config: VisionConfig;
  private worker: Worker | null = null;
  private cpuDetector: ObjectDetector | null = null;
  private cpuPose: PoseLandmarker | null = null;
  private callbacks: Set<(percept: VisionPercept) => void> = new Set();
  private isInitialized = false;

  constructor(config: Partial<VisionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the vision engine
   * @param workerScriptUrl Optional URL to the worker script (if hosted separately)
   */
  async initialize(workerScriptUrl?: string) {
    if (this.isInitialized) return;

    if (typeof Worker !== 'undefined') {
      try {
        // If no URL provided, we assume the worker is bundled or available at a specific path
        // For a SDK, it's tricky. Best is to let the consumer provide the Worker instance or URL.
        // Here we'll try to use the provided URL or fallback.
        if (workerScriptUrl) {
           this.worker = new Worker(workerScriptUrl, { type: 'module' });
           this.setupWorker();
        } else {
           console.warn('[VisionSDK] No worker URL provided, running in CPU-only mode (MediaPipe).');
           await this.initializeCpuFallback();
        }
      } catch (e) {
        console.error('[VisionSDK] Worker init failed', e);
        await this.initializeCpuFallback();
      }
    } else {
      await this.initializeCpuFallback();
    }
    this.isInitialized = true;
  }

  private setupWorker() {
    if (!this.worker) return;
    
    this.worker.onmessage = (e) => {
      if (e.data.type === 'MODEL_LOADED') {
        console.log('[VisionSDK] Worker model loaded:', e.data.success);
        if (!e.data.success) this.initializeCpuFallback();
      } else if (e.data.modality === 'vision') {
        this.notify(e.data);
      }
    };

    this.worker.postMessage({ 
      type: 'LOAD_MODEL', 
      payload: { modelUrl: this.config.models.yolo.url } 
    });
  }

  private async initializeCpuFallback() {
    console.log('[VisionSDK] Initializing CPU fallback...');
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
    );
    
    this.cpuDetector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
        delegate: 'CPU'
      },
      runningMode: 'VIDEO'
    });

    if (this.config.features.enablePose) {
       this.cpuPose = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'CPU'
        },
        runningMode: 'VIDEO'
      });
    }
  }

  public processFrame(frame: ImageData | HTMLVideoElement) {
    if (this.worker) {
      this.worker.postMessage({ type: 'PROCESS_FRAME', payload: frame });
    } else if (this.cpuDetector) {
      this.processCpu(frame);
    }
  }

  private processCpu(frame: ImageData | HTMLVideoElement) {
    if (!this.cpuDetector) return;
    const now = Date.now();
    const detections = this.cpuDetector.detectForVideo(frame, performance.now());
    
    // Transform to VisionPercept
    const boxes = detections.detections.map(d => {
      const b = d.boundingBox!;
      return [b.originX, b.originY, b.originX + b.width, b.originY + b.height] as [number, number, number, number];
    });
    
    if (boxes.length > 0) {
      this.notify({
        modality: 'vision',
        payload: {
          type: 'object',
          boxes,
          classes: detections.detections.map(d => d.categories[0]?.categoryName || 'unknown'),
          scores: detections.detections.map(d => d.categories[0]?.score || 0),
        },
        confidence: Math.max(...detections.detections.map(d => d.categories[0]?.score || 0)),
        timestamp: now,
        source: 'cpu-mediapipe'
      });
    }
  }

  public onPercept(callback: (p: VisionPercept) => void) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notify(percept: VisionPercept) {
    this.callbacks.forEach(cb => cb(percept));
  }

  public terminate() {
    this.worker?.terminate();
    this.cpuDetector?.close();
    this.cpuPose?.close();
    this.callbacks.clear();
    this.isInitialized = false;
  }
}
