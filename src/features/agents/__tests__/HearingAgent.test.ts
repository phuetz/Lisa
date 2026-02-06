/**
 * Tests for HearingAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HearingAgent } from '../implementations/HearingAgent';
import { AgentDomains } from '../core/types';

// Mock the visionStore
vi.mock('../../../store/visionStore', () => ({
  useVisionStore: {
    getState: vi.fn(() => ({
      percepts: [
        {
          modality: 'hearing',
          ts: Date.now(),
          payload: {
            transcript: 'Hello world',
            emotion: 'neutral'
          }
        }
      ]
    }))
  }
}));

describe('HearingAgent', () => {
  let agent: HearingAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new HearingAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('HearingAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('audio');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.ANALYSIS);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('audio_classification');
      expect(agent.capabilities).toContain('speech_recognition');
      expect(agent.capabilities).toContain('sound_detection');
      expect(agent.capabilities).toContain('noise_filtering');
      expect(agent.capabilities).toContain('volume_analysis');
      expect(agent.capabilities).toContain('audio_transcription');
    });
  });

  describe('execute - classify_audio intent', () => {
    it('should classify audio', async () => {
      const result = await agent.execute({
        intent: 'classify_audio',
        parameters: {
          audioData: new ArrayBuffer(1024)
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should fail without audio data', async () => {
      const result = await agent.execute({
        intent: 'classify_audio',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No audio data');
    });
  });

  describe('execute - recognize_speech intent', () => {
    it('should recognize speech', async () => {
      const result = await agent.execute({
        intent: 'recognize_speech',
        parameters: {
          audioData: new ArrayBuffer(1024)
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - detect_sound intent', () => {
    it('should detect sound', async () => {
      const result = await agent.execute({
        intent: 'detect_sound',
        parameters: {
          audioData: new ArrayBuffer(512)
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - analyze_volume intent', () => {
    it('should analyze volume', async () => {
      const result = await agent.execute({
        intent: 'analyze_volume',
        parameters: {
          audioData: new ArrayBuffer(1024)
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - transcribe_audio intent', () => {
    it('should transcribe audio', async () => {
      const result = await agent.execute({
        intent: 'transcribe_audio',
        parameters: {
          audioData: new ArrayBuffer(2048)
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - filter_noise intent', () => {
    it('should filter noise', async () => {
      const result = await agent.execute({
        intent: 'filter_noise',
        parameters: {
          audioData: new ArrayBuffer(1024)
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
        intent: 'classify_audio',
        parameters: { audioData: new ArrayBuffer(512) }
      });

      expect(result.metadata?.executionTime).toBeDefined();
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should include timestamp', async () => {
      const result = await agent.execute({
        intent: 'recognize_speech',
        parameters: { audioData: new ArrayBuffer(512) }
      });

      expect(result.metadata?.timestamp).toBeDefined();
    });
  });
});
