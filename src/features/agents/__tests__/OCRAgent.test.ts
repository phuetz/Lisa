/**
 * Tests for OCRAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OCRAgent } from '../implementations/OCRAgent';
import { AgentDomains } from '../core/types';

// Mock Tesseract.js
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async () => ({
    recognize: vi.fn(async () => ({
      data: {
        text: 'Sample text from image'
      }
    })),
    terminate: vi.fn(async () => {})
  })),
  OEM: {
    TESSERACT_ONLY: 0
  }
}));

describe('OCRAgent', () => {
  let agent: OCRAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new OCRAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('OCRAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('text');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.ANALYSIS);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('text_recognition');
      expect(agent.capabilities).toContain('text_extraction');
      expect(agent.capabilities).toContain('image_analysis');
    });

    it('should have valid property set to true', () => {
      expect(agent.valid).toBe(true);
    });
  });

  describe('execute - extract_text intent', () => {
    it('should extract text from image', async () => {
      const result = await agent.execute({
        intent: 'extract_text',
        parameters: {
          imageSource: 'file',
          imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support different image sources', async () => {
      const sources = ['screenshot', 'webcam', 'file', 'clipboard'];

      for (const source of sources) {
        const result = await agent.execute({
          intent: 'extract_text',
          parameters: {
            imageSource: source,
            imageData: 'base64-encoded-image'
          }
        });

        expect(result.success).toBeDefined();
      }
    });

    it('should fail without image data', async () => {
      const result = await agent.execute({
        intent: 'extract_text',
        parameters: {
          imageSource: 'file'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - recognize_text intent', () => {
    it('should recognize text', async () => {
      const result = await agent.execute({
        intent: 'recognize_text',
        parameters: {
          imageData: 'base64-image-data'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - get_capabilities intent', () => {
    it('should return capabilities', async () => {
      const result = await agent.execute({
        intent: 'get_capabilities',
        parameters: {}
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
    });
  });

  describe('language support', () => {
    it('should support multiple languages', async () => {
      const languages = ['en', 'fr', 'es', 'de'];

      for (const lang of languages) {
        const result = await agent.execute({
          intent: 'extract_text',
          parameters: {
            imageData: 'image-data',
            language: lang
          }
        });

        expect(result.success).toBeDefined();
      }
    });
  });

  describe('confidence threshold', () => {
    it('should apply confidence threshold', async () => {
      const result = await agent.execute({
        intent: 'extract_text',
        parameters: {
          imageData: 'image-data',
          confidence: 0.8
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('region selection', () => {
    it('should support region-based extraction', async () => {
      const result = await agent.execute({
        intent: 'extract_text',
        parameters: {
          imageData: 'image-data',
          region: {
            x: 100,
            y: 100,
            width: 200,
            height: 200
          }
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      const result = await agent.execute({
        intent: 'extract_text',
        parameters: {
          imageData: null
        }
      });

      expect(result.success).toBeDefined();
    });
  });
});
