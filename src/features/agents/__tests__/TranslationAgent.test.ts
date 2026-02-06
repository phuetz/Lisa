/**
 * Tests for TranslationAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TranslationAgent } from '../implementations/TranslationAgent';
import { AgentDomains } from '../core/types';

// Mock the Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => 'Bonjour, ceci est une traduction.'
        }
      })
    })
  }))
}));

// Mock config
vi.mock('../../../config', () => ({
  config: {
    geminiApiKey: undefined
  }
}));

describe('TranslationAgent', () => {
  let agent: TranslationAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new TranslationAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('TranslationAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('translation');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.PRODUCTIVITY);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('text_translation');
      expect(agent.capabilities).toContain('language_detection');
      expect(agent.capabilities).toContain('cultural_adaptation');
      expect(agent.capabilities).toContain('contextual_translation');
      expect(agent.capabilities).toContain('batch_translation');
      expect(agent.capabilities).toContain('terminology_management');
    });
  });

  describe('canHandle', () => {
    it('should return confidence for translation keywords', async () => {
      const confidence1 = await agent.canHandle('translate this to French');
      expect(confidence1).toBeGreaterThan(0);

      const confidence2 = await agent.canHandle('translation needed');
      expect(confidence2).toBeGreaterThan(0);

      const confidence3 = await agent.canHandle('language detection');
      expect(confidence3).toBeGreaterThan(0);
    });

    it('should handle multi-language keywords', async () => {
      const confidence1 = await agent.canHandle('traduire en français');
      expect(confidence1).toBeGreaterThan(0);

      const confidence2 = await agent.canHandle('traducir al español');
      expect(confidence2).toBeGreaterThan(0);
    });

    it('should return zero for unrelated queries', async () => {
      const confidence = await agent.canHandle('what is the weather');
      expect(confidence).toBe(0);
    });
  });

  describe('execute - translate intent', () => {
    it('should translate text to target language', async () => {
      const result = await agent.execute({
        intent: 'translate',
        parameters: {
          text: 'Hello, how are you?',
          targetLang: 'fr'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.translatedText).toBeDefined();
      expect(result.output.targetLang).toBe('fr');
    });

    it('should detect source language automatically', async () => {
      const result = await agent.execute({
        intent: 'translate',
        parameters: {
          text: 'Hello world',
          targetLang: 'fr'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.sourceLang).toBeDefined();
    });

    it('should use provided source language', async () => {
      const result = await agent.execute({
        intent: 'translate',
        parameters: {
          text: 'Hello',
          sourceLang: 'en',
          targetLang: 'es'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.sourceLang).toBe('en');
      expect(result.output.targetLang).toBe('es');
    });

    it('should include context in translation if provided', async () => {
      const result = await agent.execute({
        intent: 'translate',
        parameters: {
          text: 'bank',
          targetLang: 'fr',
          context: 'financial institution'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.translatedText).toBeDefined();
    });

    it('should fail when text is missing', async () => {
      const result = await agent.execute({
        intent: 'translate',
        parameters: {
          targetLang: 'fr'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should fail when target language is missing', async () => {
      const result = await agent.execute({
        intent: 'translate',
        parameters: {
          text: 'Hello'
        }
      });

      expect(result.success).toBe(false);
    });

    it('should include confidence score', async () => {
      const result = await agent.execute({
        intent: 'translate',
        parameters: {
          text: 'Good morning',
          targetLang: 'fr'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.confidence).toBeDefined();
      expect(result.output.confidence).toBeGreaterThan(0);
    });

    it('should return fallback translation when Gemini unavailable', async () => {
      const result = await agent.execute({
        intent: 'translate',
        parameters: {
          text: 'Hello world',
          targetLang: 'es'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.source).toBe('Fallback');
    });
  });

  describe('execute - detect_language intent', () => {
    it('should detect English text', async () => {
      const result = await agent.execute({
        intent: 'detect_language',
        parameters: {
          text: 'The quick brown fox jumps over the lazy dog'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.language).toBe('en');
      expect(result.output.languageName).toBe('English');
    });

    it('should detect French text', async () => {
      const result = await agent.execute({
        intent: 'detect_language',
        parameters: {
          text: 'Le rapide renard brun saute par-dessus le chien paresseux'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.language).toBe('fr');
      expect(result.output.languageName).toBe('Français');
    });

    it('should detect Spanish text', async () => {
      const result = await agent.execute({
        intent: 'detect_language',
        parameters: {
          text: 'El rápido zorro marrón salta sobre el perro perezoso'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.language).toBe('es');
    });

    it('should include confidence score', async () => {
      const result = await agent.execute({
        intent: 'detect_language',
        parameters: {
          text: 'Hello world'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.confidence).toBeDefined();
      expect(result.output.confidence).toBeGreaterThan(0);
    });

    it('should fail when text is missing', async () => {
      const result = await agent.execute({
        intent: 'detect_language',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('execute - batch_translate intent', () => {
    it('should translate multiple texts', async () => {
      const result = await agent.execute({
        intent: 'batch_translate',
        parameters: {
          texts: ['Hello', 'Good morning', 'Thank you'],
          targetLang: 'fr'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.translations).toHaveLength(3);
      expect(result.output.count).toBe(3);
    });

    it('should preserve order of translations', async () => {
      const texts = ['first', 'second', 'third'];
      const result = await agent.execute({
        intent: 'batch_translate',
        parameters: {
          texts,
          targetLang: 'es'
        }
      });

      expect(result.success).toBe(true);
      texts.forEach((text, index) => {
        expect(result.output.translations[index].original).toBe(text);
        expect(result.output.translations[index].index).toBe(index);
      });
    });

    it('should include source language info', async () => {
      const result = await agent.execute({
        intent: 'batch_translate',
        parameters: {
          texts: ['Hello'],
          sourceLang: 'en',
          targetLang: 'fr'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.sourceLang).toBe('en');
    });

    it('should fail when texts is not array', async () => {
      const result = await agent.execute({
        intent: 'batch_translate',
        parameters: {
          texts: 'not an array',
          targetLang: 'fr'
        }
      });

      expect(result.success).toBe(false);
    });

    it('should fail when texts array is empty', async () => {
      const result = await agent.execute({
        intent: 'batch_translate',
        parameters: {
          texts: [],
          targetLang: 'fr'
        }
      });

      expect(result.success).toBe(false);
    });

    it('should fail when target language is missing', async () => {
      const result = await agent.execute({
        intent: 'batch_translate',
        parameters: {
          texts: ['Hello']
        }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - get_languages intent', () => {
    it('should return supported languages', async () => {
      const result = await agent.execute({
        intent: 'get_languages',
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output.languages).toBeDefined();
      expect(result.output.count).toBeGreaterThan(0);
    });

    it('should include language codes and names', async () => {
      const result = await agent.execute({
        intent: 'get_languages',
        parameters: {}
      });

      expect(result.success).toBe(true);
      result.output.languages.forEach((lang: any) => {
        expect(lang.code).toBeDefined();
        expect(lang.name).toBeDefined();
      });
    });

    it('should include common languages', async () => {
      const result = await agent.execute({
        intent: 'get_languages',
        parameters: {}
      });

      const codes = result.output.languages.map((l: any) => l.code);
      expect(codes).toContain('en');
      expect(codes).toContain('fr');
      expect(codes).toContain('es');
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

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      const result = await agent.execute({
        intent: 'translate',
        parameters: {
          text: null,
          targetLang: 'fr'
        }
      });

      expect(result.success).toBe(false);
    });

    it('should include metadata on success', async () => {
      const result = await agent.execute({
        intent: 'translate',
        parameters: {
          text: 'Test',
          targetLang: 'fr'
        }
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.timestamp).toBeDefined();
    });

    it('should include metadata on error', async () => {
      const result = await agent.execute({
        intent: 'unknown_intent',
        parameters: {}
      });

      expect(result.metadata?.timestamp).toBeDefined();
    });
  });
});
