/**
 * Tests for NLUAgent
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted for mock functions referenced in vi.mock
const mocks = vi.hoisted(() => ({
  pipeline: vi.fn(),
}));

// Mock @xenova/transformers
vi.mock('@xenova/transformers', () => ({
  pipeline: mocks.pipeline,
  env: {
    useFSCache: false,
  },
}));

import { NLUAgent, type NLUTask } from '../implementations/NLUAgent';

describe('NLUAgent', () => {
  let agent: NLUAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock pipeline to return mock functions
    mocks.pipeline.mockResolvedValue(vi.fn());
    agent = new NLUAgent();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('NLUAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('Natural Language Understanding');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe('analysis');
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('sentiment_analysis');
      expect(agent.capabilities).toContain('zero_shot_classification');
      expect(agent.capabilities).toContain('feature_extraction');
      expect(agent.capabilities).toContain('emotion_detection');
    });
  });

  describe('execute', () => {
    it('should return error when task is not specified', async () => {
      const result = await agent.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('NLU task not specified.');
    });

    it('should return error for unknown task', async () => {
      const result = await agent.execute({
        task: 'unknown_task' as NLUTask,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown NLU task');
    });

    describe('sentiment_analysis', () => {
      it('should analyze sentiment successfully', async () => {
        const mockSentimentPipeline = vi.fn().mockResolvedValue([
          { label: 'POSITIVE', score: 0.95 },
        ]);
        mocks.pipeline.mockResolvedValueOnce(mockSentimentPipeline);

        // Recreate agent with mocked pipeline
        const testAgent = new NLUAgent();
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 100));

        // Access private property for testing
        (testAgent as any).sentimentPipeline = mockSentimentPipeline;

        const result = await testAgent.execute({
          task: 'sentiment_analysis' as NLUTask,
          parameters: { text: 'I love this product!' },
        });

        expect(result.success).toBe(true);
        expect(result.output).toEqual([{ label: 'POSITIVE', score: 0.95 }]);
      });

      it('should return error when text is not provided', async () => {
        const mockSentimentPipeline = vi.fn();
        (agent as any).sentimentPipeline = mockSentimentPipeline;

        const result = await agent.execute({
          task: 'sentiment_analysis' as NLUTask,
          parameters: {},
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Text is required');
      });

      it('should return error when pipeline not initialized', async () => {
        (agent as any).sentimentPipeline = null;

        const result = await agent.execute({
          task: 'sentiment_analysis' as NLUTask,
          parameters: { text: 'Test text' },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not initialized');
      });
    });

    describe('emotion_detection', () => {
      it('should detect emotions successfully', async () => {
        const mockEmotionPipeline = vi.fn().mockResolvedValue([
          { label: 'happy', score: 0.8 },
        ]);
        (agent as any).emotionPipeline = mockEmotionPipeline;

        const mockAudioData = new ArrayBuffer(1024);
        const result = await agent.execute({
          task: 'emotion_detection' as NLUTask,
          parameters: { audio: mockAudioData },
        });

        expect(result.success).toBe(true);
        expect(mockEmotionPipeline).toHaveBeenCalledWith(mockAudioData);
      });

      it('should return error when audio is not provided', async () => {
        const mockEmotionPipeline = vi.fn();
        (agent as any).emotionPipeline = mockEmotionPipeline;

        const result = await agent.execute({
          task: 'emotion_detection' as NLUTask,
          parameters: {},
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Audio data is required');
      });

      it('should return error when pipeline not initialized', async () => {
        (agent as any).emotionPipeline = null;

        const result = await agent.execute({
          task: 'emotion_detection' as NLUTask,
          parameters: { audio: new ArrayBuffer(1024) },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not initialized');
      });
    });

    describe('zero_shot_classification', () => {
      it('should return placeholder message', async () => {
        const result = await agent.execute({
          task: 'zero_shot_classification' as NLUTask,
          parameters: {
            text: 'This is a test',
            candidate_labels: ['positive', 'negative'],
          },
        });

        expect(result.success).toBe(true);
        expect(result.output).toHaveProperty('message');
        expect(result.output.message).toContain('not yet implemented');
      });
    });

    describe('feature_extraction', () => {
      it('should return placeholder message', async () => {
        const result = await agent.execute({
          task: 'feature_extraction' as NLUTask,
          parameters: { text: 'Extract features from this' },
        });

        expect(result.success).toBe(true);
        expect(result.output).toHaveProperty('message');
        expect(result.output.message).toContain('not yet implemented');
      });
    });

    it('should include metadata in result', async () => {
      const result = await agent.execute({
        task: 'zero_shot_classification' as NLUTask,
        parameters: { text: 'Test' },
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.executionTime).toBeDefined();
      expect(result.metadata?.source).toContain('NLUAgent');
    });
  });

  describe('canHandle', () => {
    it('should return high score for sentiment-related queries', async () => {
      const score = await agent.canHandle('Analyze the sentiment of this text');
      expect(score).toBeGreaterThanOrEqual(0.7);
    });

    it('should return high score for emotion-related queries', async () => {
      const score = await agent.canHandle('What emotion is in this audio?');
      expect(score).toBeGreaterThanOrEqual(0.7);
    });

    it('should return high score for NLU-related queries', async () => {
      const score = await agent.canHandle('Use NLU to classify this');
      expect(score).toBeGreaterThanOrEqual(0.7);
    });

    it('should return low score for unrelated queries', async () => {
      const score = await agent.canHandle('What is the weather today?');
      expect(score).toBeLessThan(0.7);
    });
  });

  describe('getRequiredParameters', () => {
    it('should return correct parameters for sentiment_analysis', async () => {
      const params = await agent.getRequiredParameters('sentiment_analysis');

      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('text');
      expect(params[0].required).toBe(true);
    });

    it('should return correct parameters for emotion_detection', async () => {
      const params = await agent.getRequiredParameters('emotion_detection');

      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('audio');
      expect(params[0].type).toBe('object');
    });

    it('should return correct parameters for zero_shot_classification', async () => {
      const params = await agent.getRequiredParameters('zero_shot_classification');

      expect(params).toHaveLength(2);
      expect(params[0].name).toBe('text');
      expect(params[1].name).toBe('candidate_labels');
    });

    it('should return correct parameters for feature_extraction', async () => {
      const params = await agent.getRequiredParameters('feature_extraction');

      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('text');
    });

    it('should return empty array for unknown task', async () => {
      const params = await agent.getRequiredParameters('unknown_task');
      expect(params).toHaveLength(0);
    });
  });

  describe('getCapabilities', () => {
    it('should return all capabilities', async () => {
      const capabilities = await agent.getCapabilities();

      expect(capabilities).toHaveLength(4);
      expect(capabilities.map(c => c.name)).toContain('sentiment_analysis');
      expect(capabilities.map(c => c.name)).toContain('emotion_detection');
      expect(capabilities.map(c => c.name)).toContain('zero_shot_classification');
      expect(capabilities.map(c => c.name)).toContain('feature_extraction');
    });

    it('should include description for each capability', async () => {
      const capabilities = await agent.getCapabilities();

      capabilities.forEach(cap => {
        expect(cap.description).toBeDefined();
        expect(cap.description.length).toBeGreaterThan(0);
      });
    });

    it('should include required parameters for each capability', async () => {
      const capabilities = await agent.getCapabilities();

      capabilities.forEach(cap => {
        expect(cap.requiredParameters).toBeDefined();
        expect(Array.isArray(cap.requiredParameters)).toBe(true);
      });
    });
  });
});
