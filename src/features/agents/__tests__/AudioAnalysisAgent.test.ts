/**
 * Tests for AudioAnalysisAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioAnalysisAgent } from '../implementations/AudioAnalysisAgent';
import { AgentDomains } from '../core/types';

describe('AudioAnalysisAgent', () => {
  let agent: AudioAnalysisAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new AudioAnalysisAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('AudioAnalysisAgent');
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
      expect(agent.capabilities).toContain('audio_transcription');
      expect(agent.capabilities).toContain('emotion_detection');
      expect(agent.capabilities).toContain('speaker_identification');
      expect(agent.capabilities).toContain('audio_filtering');
      expect(agent.capabilities).toContain('music_recognition');
      expect(agent.capabilities).toContain('sound_classification');
    });
  });

  describe('execute - transcribe intent', () => {
    it('should transcribe audio', async () => {
      const result = await agent.execute({
        intent: 'transcribe',
        parameters: {
          audioData: new ArrayBuffer(2048)
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.transcript).toBeDefined();
    });

    it('should support language parameter', async () => {
      const result = await agent.execute({
        intent: 'transcribe',
        parameters: {
          audioData: new ArrayBuffer(2048),
          language: 'en-US'
        }
      });

      expect(result.success).toBe(true);
    });

    it('should handle missing audio data', async () => {
      const result = await agent.execute({
        intent: 'transcribe',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No audio data');
    });
  });

  describe('execute - detect_emotion intent', () => {
    it('should detect emotion', async () => {
      const result = await agent.execute({
        intent: 'detect_emotion',
        parameters: {
          audioData: new ArrayBuffer(1024)
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.emotion).toBeDefined();
    });

    it('should return emotion score', async () => {
      const result = await agent.execute({
        intent: 'detect_emotion',
        parameters: {
          audioData: new ArrayBuffer(1024)
        }
      });

      expect(result.success).toBe(true);
      if (result.output.scores) {
        expect(result.output.scores.happy).toBeDefined();
        expect(result.output.scores.sad).toBeDefined();
        expect(result.output.scores.angry).toBeDefined();
        expect(result.output.scores.neutral).toBeDefined();
      }
    });

    it('should fail without audio data', async () => {
      const result = await agent.execute({
        intent: 'detect_emotion',
        parameters: {}
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - identify_speaker intent', () => {
    it('should identify speaker', async () => {
      const result = await agent.execute({
        intent: 'identify_speaker',
        parameters: {
          audioData: new ArrayBuffer(1024)
        }
      });

      expect(result.success).toBe(true);
    });

    it('should handle multiple speakers', async () => {
      const result = await agent.execute({
        intent: 'identify_speaker',
        parameters: {
          audioData: new ArrayBuffer(2048),
          detectMultipleSpeakers: true
        }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute - filter_audio intent', () => {
    it('should filter audio', async () => {
      const result = await agent.execute({
        intent: 'filter_audio',
        parameters: {
          audioData: new ArrayBuffer(1024)
        }
      });

      expect(result.success).toBe(true);
    });

    it('should support noise reduction', async () => {
      const result = await agent.execute({
        intent: 'filter_audio',
        parameters: {
          audioData: new ArrayBuffer(1024),
          noiseReduction: true
        }
      });

      expect(result.success).toBe(true);
    });

    it('should support echo cancellation', async () => {
      const result = await agent.execute({
        intent: 'filter_audio',
        parameters: {
          audioData: new ArrayBuffer(1024),
          echoCancellation: true
        }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute - recognize_music intent', () => {
    it('should recognize music', async () => {
      const result = await agent.execute({
        intent: 'recognize_music',
        parameters: {
          audioData: new ArrayBuffer(1024)
        }
      });

      expect(result.success).toBe(true);
    });

    it('should return song details', async () => {
      const result = await agent.execute({
        intent: 'recognize_music',
        parameters: {
          audioData: new ArrayBuffer(1024)
        }
      });

      expect(result.success).toBe(true);
      if (result.output.song) {
        expect(result.output.song.title).toBeDefined();
        expect(result.output.song.artist).toBeDefined();
      }
    });
  });

  describe('execute - classify_sound intent', () => {
    it('should classify sound', async () => {
      const result = await agent.execute({
        intent: 'classify_sound',
        parameters: {
          audioData: new ArrayBuffer(1024)
        }
      });

      expect(result.success).toBe(true);
    });

    it('should return sound categories', async () => {
      const result = await agent.execute({
        intent: 'classify_sound',
        parameters: {
          audioData: new ArrayBuffer(1024)
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.classes).toBeDefined();
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
        intent: 'transcribe',
        parameters: { audioData: new ArrayBuffer(512) }
      });

      expect(result.metadata?.executionTime).toBeDefined();
    });

    it('should include timestamp', async () => {
      const result = await agent.execute({
        intent: 'detect_emotion',
        parameters: { audioData: new ArrayBuffer(512) }
      });

      expect(result.metadata?.timestamp).toBeDefined();
    });
  });
});
