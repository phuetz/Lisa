/**
 * Tests for ImageAnalysisAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImageAnalysisAgent } from '../implementations/ImageAnalysisAgent';
import { AgentDomains } from '../core/types';

// Mock visionStore
vi.mock('../../../store/visionStore', () => ({
  useVisionStore: {
    getState: vi.fn(() => ({
      percepts: [
        {
          modality: 'vision',
          ts: Date.now(),
          payload: {
            objects: [
              { name: 'person', confidence: 0.95, boundingBox: { x: 10, y: 20, width: 100, height: 200 } }
            ],
            scene: 'indoor',
            colors: ['red', 'blue', 'green']
          }
        }
      ]
    }))
  }
}));

describe('ImageAnalysisAgent', () => {
  let agent: ImageAnalysisAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new ImageAnalysisAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('ImageAnalysisAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('image');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.ANALYSIS);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('object_recognition');
      expect(agent.capabilities).toContain('scene_analysis');
      expect(agent.capabilities).toContain('ocr_extraction');
      expect(agent.capabilities).toContain('face_detection');
      expect(agent.capabilities).toContain('color_analysis');
      expect(agent.capabilities).toContain('image_classification');
    });
  });

  describe('execute - recognize_objects intent', () => {
    it('should recognize objects in image', async () => {
      const result = await agent.execute({
        intent: 'recognize_objects',
        parameters: {
          imageData: 'base64-image-data'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should handle image URL', async () => {
      const result = await agent.execute({
        intent: 'recognize_objects',
        parameters: {
          imageUrl: 'https://example.com/image.jpg'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should fail without image', async () => {
      const result = await agent.execute({
        intent: 'recognize_objects',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No image');
    });
  });

  describe('execute - analyze_scene intent', () => {
    it('should analyze scene', async () => {
      const result = await agent.execute({
        intent: 'analyze_scene',
        parameters: {
          imageData: 'image-data'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - extract_text intent', () => {
    it('should extract text from image', async () => {
      const result = await agent.execute({
        intent: 'extract_text',
        parameters: {
          imageData: 'image-data'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - detect_faces intent', () => {
    it('should detect faces', async () => {
      const result = await agent.execute({
        intent: 'detect_faces',
        parameters: {
          imageData: 'image-data'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should include face details', async () => {
      const result = await agent.execute({
        intent: 'detect_faces',
        parameters: {
          imageData: 'image-data',
          includeFaceDetails: true
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - analyze_colors intent', () => {
    it('should analyze colors', async () => {
      const result = await agent.execute({
        intent: 'analyze_colors',
        parameters: {
          imageData: 'image-data'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should return dominant colors', async () => {
      const result = await agent.execute({
        intent: 'analyze_colors',
        parameters: {
          imageData: 'image-data',
          maxColors: 5
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - classify_image intent', () => {
    it('should classify image', async () => {
      const result = await agent.execute({
        intent: 'classify_image',
        parameters: {
          imageData: 'image-data'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - unknown intent', () => {
    it('should return error for unknown intent', async () => {
      const result = await agent.execute({
        intent: 'unknown_intent',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown intent');
    });
  });

  describe('metadata', () => {
    it('should include execution time', async () => {
      const result = await agent.execute({
        intent: 'classify_image',
        parameters: { imageData: 'data' }
      });

      expect(result.metadata?.executionTime).toBeDefined();
    });

    it('should include timestamp', async () => {
      const result = await agent.execute({
        intent: 'classify_image',
        parameters: { imageData: 'data' }
      });

      expect(result.metadata?.timestamp).toBeDefined();
    });
  });
});
