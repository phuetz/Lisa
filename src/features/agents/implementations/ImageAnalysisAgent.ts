/**
 * ImageAnalysisAgent - Advanced Image Analysis
 * 
 * Performs comprehensive image analysis including object recognition, scene analysis, and OCR
 */

import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import { AgentDomains } from '../core/types';

export class ImageAnalysisAgent implements BaseAgent {
  name = 'ImageAnalysisAgent';
  description = 'Analyzes images with object recognition, scene understanding, and OCR';
  version = '1.0.0';
  domain: AgentDomain = AgentDomains.ANALYSIS;
  capabilities = [
    'object_recognition',
    'scene_analysis',
    'ocr_extraction',
    'face_detection',
    'color_analysis',
    'image_classification'
  ];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const { intent, parameters } = props;

    try {
      let result: AgentExecuteResult;
      switch (intent) {
        case 'recognize_objects':
          result = await this.recognizeObjects(parameters);
          break;
        case 'analyze_scene':
          result = await this.analyzeScene(parameters);
          break;
        case 'extract_text':
          result = await this.extractText(parameters);
          break;
        case 'detect_faces':
          result = await this.detectFaces(parameters);
          break;
        case 'analyze_colors':
          result = await this.analyzeColors(parameters);
          break;
        case 'classify_image':
          result = await this.classifyImage(parameters);
          break;
        default:
          return {
            success: false,
            output: null,
            error: `Unknown intent: ${intent}`,
            metadata: { executionTime: Date.now() - startTime, timestamp: Date.now() }
          };
      }
      // Ensure executionTime in metadata
      result.metadata = {
        ...result.metadata,
        executionTime: Date.now() - startTime,
        timestamp: Date.now(),
      };
      return result;
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        metadata: { executionTime: Date.now() - startTime, timestamp: Date.now() }
      };
    }
  }

  private async recognizeObjects(params: any): Promise<AgentExecuteResult> {
    const { imageData, imageUrl } = params;
    if (!imageData && !imageUrl) {
      return { success: false, output: null, error: 'No image provided' };
    }

    // Get latest vision percepts from store (YOLOv8 detections)
    const { useVisionStore } = await import('../../../store/visionStore');
    const percepts = useVisionStore.getState().percepts
      .filter(p => p.modality === 'vision')
      .sort((a, b) => b.ts - a.ts);

    if (percepts.length === 0) {
      return {
        success: false,
        output: null,
        error: 'No vision data available. Ensure camera is active and YOLOv8 worker is running.'
      };
    }

    const latestVision = percepts[0].payload as any;

    // Convert YOLOv8 format to our format
    const objects = latestVision.boxes?.map((box: number[], i: number) => ({
      label: latestVision.classes?.[i] || 'unknown',
      confidence: latestVision.scores?.[i] || 0,
      bbox: {
        x: box[0],
        y: box[1],
        w: box[2] - box[0],
        h: box[3] - box[1]
      }
    })) || [];

    return {
      success: true,
      output: {
        objects,
        count: objects.length,
        source: 'YOLOv8-n'
      },
      metadata: {
        source: 'ImageAnalysisAgent',
        timestamp: Date.now()
      }
    };
  }

  private async analyzeScene(params: any): Promise<AgentExecuteResult> {
    const { imageData, imageUrl } = params;
    if (!imageData && !imageUrl) {
      return { success: false, output: null, error: 'No image provided' };
    }

    // Derive scene from YOLOv8 object detections
    const objectsResult = await this.recognizeObjects(params);

    if (!objectsResult.success || !objectsResult.output) {
      return { success: false, output: null, error: 'Could not analyze scene - no objects detected' };
    }

    const objects = objectsResult.output.objects || [];
    const objectLabels = objects.map((obj: any) => obj.label);

    // Infer scene from detected objects
    const scene = this.inferSceneFromObjects(objectLabels);

    return {
      success: true,
      output: {
        ...scene,
        detectedObjects: objectLabels,
        objectCount: objects.length
      },
      metadata: { source: 'ImageAnalysisAgent', timestamp: Date.now() }
    };
  }

  private inferSceneFromObjects(objects: string[]): any {
    // Indoor/outdoor detection
    const outdoorObjects = ['car', 'truck', 'bus', 'bicycle', 'motorcycle', 'traffic light', 'stop sign'];
    const indoorObjects = ['chair', 'couch', 'bed', 'dining table', 'tv', 'laptop', 'keyboard', 'mouse'];

    const isOutdoor = objects.some(obj => outdoorObjects.includes(obj));
    const isIndoor = objects.some(obj => indoorObjects.includes(obj));

    // Setting detection
    let setting = 'unknown';
    if (objects.some(o => ['laptop', 'keyboard', 'mouse', 'monitor'].includes(o))) {
      setting = 'office';
    } else if (objects.some(o => ['couch', 'tv', 'dining table'].includes(o))) {
      setting = 'home';
    } else if (objects.some(o => ['car', 'truck', 'traffic light'].includes(o))) {
      setting = 'street';
    }

    return {
      environment: isOutdoor ? 'outdoor' : (isIndoor ? 'indoor' : 'unknown'),
      setting,
      description: `Scene with ${objects.join(', ')}`,
      confidence: objects.length > 0 ? 0.7 : 0.3
    };
  }

  private async extractText(params: any): Promise<AgentExecuteResult> {
    const { imageData, imageUrl } = params;
    if (!imageData && !imageUrl) {
      return { success: false, output: null, error: 'No image provided' };
    }

    // OCR requires Tesseract.js integration (Phase 2/3)
    // For now, return not implemented
    return {
      success: false,
      output: null,
      error: 'OCR not yet implemented. Requires Tesseract.js integration.',
      metadata: { source: 'ImageAnalysisAgent', timestamp: Date.now() }
    };
  }

  private async detectFaces(params: any): Promise<AgentExecuteResult> {
    const { imageData, imageUrl } = params;
    if (!imageData && !imageUrl) {
      return { success: false, output: null, error: 'No image provided' };
    }

    // Get MediaPipe face detections from vision percepts
    const { useVisionStore } = await import('../../../store/visionStore');
    const percepts = useVisionStore.getState().percepts
      .filter(p => p.modality === 'vision')
      .sort((a, b) => b.ts - a.ts);

    if (percepts.length === 0) {
      return {
        success: false,
        output: null,
        error: 'No vision data available'
      };
    }

    const latestVision = percepts[0].payload as any;

    // Check for MediaPipe face landmarks
    const faces = [];
    if (latestVision.faceLandmarks && latestVision.faceLandmarks.length > 0) {
      for (const faceLandmark of latestVision.faceLandmarks) {
        // Extract bounding box from landmarks
        const xs = faceLandmark.map((p: any) => p.x);
        const ys = faceLandmark.map((p: any) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        faces.push({
          bbox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
          confidence: 0.9,
          landmarks: faceLandmark.slice(0, 10) // First 10 key landmarks
        });
      }
    }

    return {
      success: true,
      output: { faces, count: faces.length, source: 'MediaPipe FaceLandmarker' },
      metadata: { source: 'ImageAnalysisAgent', timestamp: Date.now() }
    };
  }

  private async analyzeColors(params: any): Promise<AgentExecuteResult> {
    const { imageData, imageUrl } = params;
    if (!imageData && !imageUrl) {
      return { success: false, output: null, error: 'No image provided' };
    }

    // Color analysis requires Canvas API processing (Phase 2/3)
    return {
      success: false,
      output: null,
      error: 'Color analysis not yet implemented. Requires Canvas color extraction.',
      metadata: { source: 'ImageAnalysisAgent', timestamp: Date.now() }
    };
  }

  private async classifyImage(params: any): Promise<AgentExecuteResult> {
    const { imageData, imageUrl } = params;
    if (!imageData && !imageUrl) {
      return { success: false, output: null, error: 'No image provided' };
    }

    // Classify based on detected objects from YOLOv8
    const objectsResult = await this.recognizeObjects(params);

    if (!objectsResult.success || !objectsResult.output) {
      return { success: false, output: null, error: 'Could not classify - no objects detected' };
    }

    const objects = objectsResult.output.objects || [];
    const classifications = this.inferCategoryFromObjects(objects.map((o: any) => o.label));

    return {
      success: true,
      output: {
        classifications,
        primaryCategory: classifications[0]?.category || 'unknown',
        confidence: classifications[0]?.confidence || 0,
        basedOnObjects: objects.map((o: any) => o.label)
      },
      metadata: { source: 'ImageAnalysisAgent', timestamp: Date.now() }
    };
  }

  private inferCategoryFromObjects(objects: string[]): any[] {
    const categories: Record<string, number> = {};

    // Map objects to categories
    const categoryMap: Record<string, string[]> = {
      'office': ['laptop', 'keyboard', 'mouse', 'monitor', 'chair', 'desk'],
      'home': ['couch', 'bed', 'dining table', 'tv', 'refrigerator'],
      'outdoor': ['car', 'truck', 'bicycle', 'traffic light', 'tree'],
      'person': ['person'],
      'animal': ['dog', 'cat', 'bird', 'horse'],
      'food': ['pizza', 'donut', 'cake', 'apple', 'banana'],
      'sports': ['sports ball', 'tennis racket', 'baseball bat', 'skateboard']
    };

    objects.forEach(obj => {
      for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.includes(obj)) {
          categories[category] = (categories[category] || 0) + 1;
        }
      }
    });

    // Sort by count
    return Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .map(([category, count]) => ({
        category,
        confidence: Math.min(count * 0.25, 0.95)
      }))
      .slice(0, 3);
  }

  async canHandle(query: string): Promise<number> {
    const keywords = [
      'image', 'picture', 'photo', 'visual', 'object', 'scene',
      'recognize', 'identify', 'detect', 'analyze',
      'image', 'photo', 'objet', 'scène', 'reconnaître', 'détecter'
    ];

    const lowerQuery = query.toLowerCase();
    const matches = keywords.filter(keyword => lowerQuery.includes(keyword));
    return matches.length > 0 ? Math.min(matches.length * 0.3, 1.0) : 0.0;
  }
}
