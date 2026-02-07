/**
 * Tests for SpeechSynthesisAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpeechSynthesisAgent, type SpeechSynthesisIntent } from '../implementations/SpeechSynthesisAgent';
import { AgentDomains } from '../core/types';

// Mock window.speechSynthesis
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => [
    {
      name: 'French',
      lang: 'fr-FR',
      default: false,
      localService: true
    },
    {
      name: 'English',
      lang: 'en-US',
      default: true,
      localService: true
    }
  ]),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  speaking: false,
  pending: false,
  paused: false
};

// Set up mocks on the existing jsdom window (don't replace the whole window)
Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
  configurable: true
});

class MockSpeechSynthesisUtterance {
  text: string;
  voice: any = null;
  rate = 1.0;
  pitch = 1.0;
  volume = 1.0;
  lang = 'fr-FR';
  onstart: any = null;
  onend: any = null;
  onerror: any = null;
  onpause: any = null;
  onresume: any = null;
  constructor(text?: string) {
    this.text = text || '';
  }
}

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  value: MockSpeechSynthesisUtterance,
  writable: true,
  configurable: true
});

describe('SpeechSynthesisAgent', () => {
  let agent: SpeechSynthesisAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new SpeechSynthesisAgent();
    mockSpeechSynthesis.speaking = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('SpeechSynthesisAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('parole');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.INTEGRATION);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('text_to_speech');
      expect(agent.capabilities).toContain('voice_management');
      expect(agent.capabilities).toContain('audio_export');
    });
  });

  describe('canHandle', () => {
    it('should return confidence for speech synthesis keywords', async () => {
      const confidence1 = await agent.canHandle('parle ce texte');
      expect(confidence1).toBeGreaterThan(0);

      const confidence2 = await agent.canHandle('synthèse vocale');
      expect(confidence2).toBeGreaterThan(0);

      const confidence3 = await agent.canHandle('text-to-speech');
      expect(confidence3).toBeGreaterThan(0);
    });

    it('should handle command phrases', async () => {
      const confidence1 = await agent.canHandle('dis bonjour');
      expect(confidence1).toBeGreaterThan(0.3);

      const confidence2 = await agent.canHandle('parle plus fort');
      expect(confidence2).toBeGreaterThan(0.3);

      const confidence3 = await agent.canHandle('lis ce texte');
      expect(confidence3).toBeGreaterThan(0.3);
    });

    it('should return zero for unrelated queries', async () => {
      const confidence = await agent.canHandle('what is the weather');
      expect(confidence).toBe(0);
    });

    it('should boost score with context', async () => {
      const confidence = await agent.canHandle('parle', { expectVoiceResponse: true });
      expect(confidence).toBeGreaterThan(0.3);
    });
  });

  describe('execute - speak intent', () => {
    it('should execute speak with text', async () => {
      const result = await agent.execute({
        intent: 'speak' as SpeechSynthesisIntent,
        parameters: {
          text: 'Bonjour, ceci est un test'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should handle custom voice settings', async () => {
      const result = await agent.execute({
        intent: 'speak' as SpeechSynthesisIntent,
        parameters: {
          text: 'Test',
          settings: {
            rate: 1.5,
            pitch: 1.2,
            volume: 0.8
          }
        }
      });

      expect(result.success).toBe(true);
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('should handle SSML format', async () => {
      const result = await agent.execute({
        intent: 'speak' as SpeechSynthesisIntent,
        parameters: {
          text: '<speak>Bonjour</speak>',
          format: 'ssml'
        }
      });

      expect(result.success).toBe(true);
    });

    it('should fail when text is empty', async () => {
      const result = await agent.execute({
        intent: 'speak' as SpeechSynthesisIntent,
        parameters: {
          text: ''
        }
      });

      expect(result.success).toBe(false);
    });

    it('should fail when text is missing', async () => {
      const result = await agent.execute({
        intent: 'speak' as SpeechSynthesisIntent,
        parameters: {}
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - get_voices intent', () => {
    it('should return available voices', async () => {
      const result = await agent.execute({
        intent: 'get_voices' as SpeechSynthesisIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output.voices).toBeDefined();
      expect(result.output.count).toBeGreaterThan(0);
    });

    it('should include voice details', async () => {
      const result = await agent.execute({
        intent: 'get_voices' as SpeechSynthesisIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      result.output.voices.forEach((voice: any) => {
        expect(voice.name).toBeDefined();
        expect(voice.lang).toBeDefined();
        expect(voice.default).toBeDefined();
      });
    });

    it('should filter voices by language', async () => {
      const result = await agent.execute({
        intent: 'get_voices' as SpeechSynthesisIntent,
        parameters: {
          lang: 'fr'
        }
      });

      expect(result.success).toBe(true);
      // Should return voices starting with 'fr'
      result.output.voices.forEach((voice: any) => {
        expect(voice.lang.startsWith('fr')).toBe(true);
      });
    });

    it('should include current voice', async () => {
      const result = await agent.execute({
        intent: 'get_voices' as SpeechSynthesisIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output.currentVoice).toBeDefined();
    });
  });

  describe('execute - update_settings intent', () => {
    it('should update voice settings', async () => {
      const result = await agent.execute({
        intent: 'update_settings' as SpeechSynthesisIntent,
        parameters: {
          settings: {
            rate: 1.2,
            pitch: 0.9,
            volume: 0.9
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.updated).toBe(true);
      expect(result.output.settings).toBeDefined();
    });

    it('should validate rate parameter', async () => {
      const result = await agent.execute({
        intent: 'update_settings' as SpeechSynthesisIntent,
        parameters: {
          settings: {
            rate: 20 // Out of range
          }
        }
      });

      expect(result.success).toBe(false);
    });

    it('should validate pitch parameter', async () => {
      const result = await agent.execute({
        intent: 'update_settings' as SpeechSynthesisIntent,
        parameters: {
          settings: {
            pitch: 3 // Out of range
          }
        }
      });

      expect(result.success).toBe(false);
    });

    it('should validate volume parameter', async () => {
      const result = await agent.execute({
        intent: 'update_settings' as SpeechSynthesisIntent,
        parameters: {
          settings: {
            volume: 2 // Out of range
          }
        }
      });

      expect(result.success).toBe(false);
    });

    it('should fail without settings', async () => {
      const result = await agent.execute({
        intent: 'update_settings' as SpeechSynthesisIntent,
        parameters: {}
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - stop_speaking intent', () => {
    it('should stop ongoing speech', async () => {
      mockSpeechSynthesis.speaking = true;

      const result = await agent.execute({
        intent: 'stop_speaking' as SpeechSynthesisIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should return stopped status', async () => {
      const result = await agent.execute({
        intent: 'stop_speaking' as SpeechSynthesisIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output.stopped).toBe(true);
    });
  });

  describe('execute - is_speaking intent', () => {
    it('should return speaking status when not speaking', async () => {
      mockSpeechSynthesis.speaking = false;

      const result = await agent.execute({
        intent: 'is_speaking' as SpeechSynthesisIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output.speaking).toBe(false);
    });

    it('should return speaking status when speaking', async () => {
      mockSpeechSynthesis.speaking = true;

      const result = await agent.execute({
        intent: 'is_speaking' as SpeechSynthesisIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output.speaking).toBe(true);
    });
  });

  describe('execute - convert_to_audio intent', () => {
    it('should handle audio conversion request', async () => {
      const result = await agent.execute({
        intent: 'convert_to_audio' as SpeechSynthesisIntent,
        parameters: {
          text: 'Bonjour',
          format: 'mp3'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should indicate limitation of Web Speech API', async () => {
      const result = await agent.execute({
        intent: 'convert_to_audio' as SpeechSynthesisIntent,
        parameters: {
          text: 'Test',
          format: 'wav'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.supported).toBe(false);
    });
  });

  describe('execute - unknown intent', () => {
    it('should return error for unknown intent', async () => {
      const result = await agent.execute({
        intent: 'unknown_intent' as any,
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateInput', () => {
    it('should validate speak intent with text', async () => {
      const valid = await agent.validateInput({
        intent: 'speak' as SpeechSynthesisIntent,
        parameters: { text: 'Bonjour' }
      });

      expect(valid.valid).toBe(true);
    });

    it('should reject speak without text', async () => {
      const invalid = await agent.validateInput({
        intent: 'speak' as SpeechSynthesisIntent,
        parameters: {}
      });

      expect(invalid.valid).toBe(false);
      expect(invalid.errors).toContain('Le texte à prononcer est requis');
    });

    it('should validate format parameter', async () => {
      const invalid = await agent.validateInput({
        intent: 'speak' as SpeechSynthesisIntent,
        parameters: {
          text: 'Test',
          format: 'invalid'
        }
      });

      expect(invalid.valid).toBe(false);
    });

    it('should validate update_settings intent', async () => {
      const invalid = await agent.validateInput({
        intent: 'update_settings' as SpeechSynthesisIntent,
        parameters: {}
      });

      expect(invalid.valid).toBe(false);
    });
  });

  describe('getRequiredParameters', () => {
    it('should return parameters for speak task', async () => {
      const params = await agent.getRequiredParameters('parler');

      expect(params.some(p => p.name === 'text')).toBe(true);
      expect(params.some(p => p.name === 'settings')).toBe(true);
    });

    it('should return parameters for voice management', async () => {
      const params = await agent.getRequiredParameters('voix disponible');

      expect(params.some(p => p.name === 'lang')).toBe(true);
    });

    it('should return parameters for settings update', async () => {
      const params = await agent.getRequiredParameters('paramètre configurer');

      expect(params.some(p => p.name === 'settings')).toBe(true);
    });
  });

  describe('getCapabilities', () => {
    it('should return all capabilities with descriptions', async () => {
      const capabilities = await agent.getCapabilities();

      expect(capabilities).toHaveLength(3);
      expect(capabilities.map(c => c.name)).toContain('text_to_speech');
      expect(capabilities.map(c => c.name)).toContain('voice_management');
      expect(capabilities.map(c => c.name)).toContain('audio_export');

      capabilities.forEach(cap => {
        expect(cap.description).toBeDefined();
        expect(cap.requiredParameters).toBeDefined();
      });
    });
  });

  describe('metadata', () => {
    it('should include execution time in metadata', async () => {
      const result = await agent.execute({
        intent: 'speak' as SpeechSynthesisIntent,
        parameters: { text: 'Test' }
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.executionTime).toBeDefined();
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should include timestamp in metadata', async () => {
      const result = await agent.execute({
        intent: 'get_voices' as SpeechSynthesisIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.timestamp).toBeDefined();
    });
  });
});
