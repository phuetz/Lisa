/**
 * VisionAgent - Types et classe de base pour l'agent de vision
 */

export type VisionSource = 'webcam' | 'screenshot' | 'file' | 'url';

export type VisionTask = 'general_description' | 'object_detection' | 'face_detection' | 'color_analysis' | 'landmark_detection';

export interface VisionResult {
  description?: string;
  objects?: Array<{ name: string; confidence: number; attributes?: Record<string, string> }>;
  faceCount?: number;
  dominantColors?: Array<{ color: string; percentage: number }>;
  sceneCategories?: Array<{ category: string; confidence: number }>;
  processingTimeMs?: number;
}

export class VisionAgent {
  name = 'VisionAgent';

  async execute(params: any): Promise<any> {
    return { success: false, error: 'VisionAgent not fully implemented' };
  }
}
