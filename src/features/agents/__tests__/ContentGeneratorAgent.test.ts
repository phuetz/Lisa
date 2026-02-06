/**
 * Tests for ContentGeneratorAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContentGeneratorAgent, type ContentGenerationIntent } from '../implementations/ContentGeneratorAgent';
import { AgentDomains } from '../core/types';

// Mock the Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => 'Generated content here.'
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

describe('ContentGeneratorAgent', () => {
  let agent: ContentGeneratorAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new ContentGeneratorAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('ContentGeneratorAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('contenu textuel');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.ANALYSIS);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('summarization');
      expect(agent.capabilities).toContain('translation');
      expect(agent.capabilities).toContain('content_generation');
      expect(agent.capabilities).toContain('email_drafting');
      expect(agent.capabilities).toContain('text_rewriting');
    });
  });

  describe('canHandle', () => {
    it('should return confidence for content generation keywords', async () => {
      const confidence1 = await agent.canHandle('résumer ce texte');
      expect(confidence1).toBeGreaterThan(0);

      const confidence2 = await agent.canHandle('générer du contenu');
      expect(confidence2).toBeGreaterThan(0);

      const confidence3 = await agent.canHandle('rédiger un email');
      expect(confidence3).toBeGreaterThan(0);
    });

    it('should handle style keywords', async () => {
      const confidence1 = await agent.canHandle('écrire formel');
      expect(confidence1).toBeGreaterThan(0);

      const confidence2 = await agent.canHandle('contenu créatif');
      expect(confidence2).toBeGreaterThan(0);
    });

    it('should return zero for unrelated queries', async () => {
      const confidence = await agent.canHandle('what is the weather');
      expect(confidence).toBe(0);
    });

    it('should boost score with context', async () => {
      const confidence = await agent.canHandle('résumer', { clipboard: { length: 1000 } });
      expect(confidence).toBeGreaterThan(0.2);
    });
  });

  describe('execute - summarize intent', () => {
    it('should summarize text', async () => {
      const result = await agent.execute({
        intent: 'summarize' as ContentGenerationIntent,
        parameters: {
          text: 'This is a long text that needs to be summarized. It contains multiple sentences with various information that should be condensed.'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.summary).toBeDefined();
    });

    it('should handle short length', async () => {
      const result = await agent.execute({
        intent: 'summarize' as ContentGenerationIntent,
        parameters: {
          text: 'Sample text',
          length: 'short'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.summary).toBeDefined();
    });

    it('should handle medium length', async () => {
      const result = await agent.execute({
        intent: 'summarize' as ContentGenerationIntent,
        parameters: {
          text: 'Sample text',
          length: 'medium'
        }
      });

      expect(result.success).toBe(true);
    });

    it('should handle long length', async () => {
      const result = await agent.execute({
        intent: 'summarize' as ContentGenerationIntent,
        parameters: {
          text: 'Sample text',
          length: 'long'
        }
      });

      expect(result.success).toBe(true);
    });

    it('should include summary length', async () => {
      const result = await agent.execute({
        intent: 'summarize' as ContentGenerationIntent,
        parameters: {
          text: 'This is a test text for summarization.'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.summaryLength).toBeDefined();
      expect(result.output.originalLength).toBeDefined();
    });

    it('should fail when text is missing', async () => {
      const result = await agent.execute({
        intent: 'summarize' as ContentGenerationIntent,
        parameters: {}
      });

      expect(result.success).toBe(false);
    });

    it('should fail when text is empty', async () => {
      const result = await agent.execute({
        intent: 'summarize' as ContentGenerationIntent,
        parameters: {
          text: ''
        }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - translate intent', () => {
    it('should translate text to target language', async () => {
      const result = await agent.execute({
        intent: 'translate' as ContentGenerationIntent,
        parameters: {
          text: 'Hello world',
          targetLanguage: 'fr'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.translatedText).toBeDefined();
      expect(result.output.targetLanguage).toBe('fr');
    });

    it('should auto-detect source language', async () => {
      const result = await agent.execute({
        intent: 'translate' as ContentGenerationIntent,
        parameters: {
          text: 'Bonjour',
          targetLanguage: 'en'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.originalLanguage).toBeDefined();
    });

    it('should use provided source language', async () => {
      const result = await agent.execute({
        intent: 'translate' as ContentGenerationIntent,
        parameters: {
          text: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.originalLanguage).toBe('en');
    });

    it('should fail when text is missing', async () => {
      const result = await agent.execute({
        intent: 'translate' as ContentGenerationIntent,
        parameters: {
          targetLanguage: 'fr'
        }
      });

      expect(result.success).toBe(false);
    });

    it('should fail when target language is missing', async () => {
      const result = await agent.execute({
        intent: 'translate' as ContentGenerationIntent,
        parameters: {
          text: 'Hello'
        }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - rewrite intent', () => {
    it('should rewrite text', async () => {
      const result = await agent.execute({
        intent: 'rewrite' as ContentGenerationIntent,
        parameters: {
          text: 'The cat sat on the mat.'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.rewrittenText).toBeDefined();
    });

    it('should apply casual style', async () => {
      const result = await agent.execute({
        intent: 'rewrite' as ContentGenerationIntent,
        parameters: {
          text: 'The meeting has been scheduled for tomorrow.',
          style: 'casual'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.style).toBe('casual');
    });

    it('should apply formal style', async () => {
      const result = await agent.execute({
        intent: 'rewrite' as ContentGenerationIntent,
        parameters: {
          text: 'Hey, we need to chat about the project.',
          style: 'formal'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.style).toBe('formal');
    });

    it('should fail when text is missing', async () => {
      const result = await agent.execute({
        intent: 'rewrite' as ContentGenerationIntent,
        parameters: {}
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - generate intent', () => {
    it('should generate content', async () => {
      const result = await agent.execute({
        intent: 'generate' as ContentGenerationIntent,
        parameters: {
          prompt: 'Write a short story about a robot'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.generatedContent).toBeDefined();
    });

    it('should apply style to generated content', async () => {
      const result = await agent.execute({
        intent: 'generate' as ContentGenerationIntent,
        parameters: {
          prompt: 'Write a poem',
          style: 'creative'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.style).toBe('creative');
    });

    it('should respect length constraint', async () => {
      const result = await agent.execute({
        intent: 'generate' as ContentGenerationIntent,
        parameters: {
          prompt: 'Write content',
          length: 'short'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.length).toBe('short');
    });

    it('should fail when prompt is missing', async () => {
      const result = await agent.execute({
        intent: 'generate' as ContentGenerationIntent,
        parameters: {}
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - draft_email intent', () => {
    it('should draft email', async () => {
      const result = await agent.execute({
        intent: 'draft_email' as ContentGenerationIntent,
        parameters: {
          subject: 'Meeting Confirmation',
          recipient: 'john@example.com',
          points: ['Confirm attendance', 'Send agenda']
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.email).toBeDefined();
      expect(result.output.subject).toBe('Meeting Confirmation');
    });

    it('should apply style to email', async () => {
      const result = await agent.execute({
        intent: 'draft_email' as ContentGenerationIntent,
        parameters: {
          subject: 'Hello',
          recipient: 'friend@example.com',
          points: ['Say hi'],
          style: 'casual'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.style).toBe('casual');
    });

    it('should fail without subject', async () => {
      const result = await agent.execute({
        intent: 'draft_email' as ContentGenerationIntent,
        parameters: {
          recipient: 'test@example.com',
          points: ['point1']
        }
      });

      expect(result.success).toBe(false);
    });

    it('should fail without recipient', async () => {
      const result = await agent.execute({
        intent: 'draft_email' as ContentGenerationIntent,
        parameters: {
          subject: 'Test',
          points: ['point1']
        }
      });

      expect(result.success).toBe(false);
    });

    it('should fail without points', async () => {
      const result = await agent.execute({
        intent: 'draft_email' as ContentGenerationIntent,
        parameters: {
          subject: 'Test',
          recipient: 'test@example.com'
        }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - draft_message intent', () => {
    it('should draft message', async () => {
      const result = await agent.execute({
        intent: 'draft_message' as ContentGenerationIntent,
        parameters: {
          context: 'Planning a team event',
          points: ['Discuss date', 'Discuss location']
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.message).toBeDefined();
    });

    it('should include context in output', async () => {
      const context = 'Following up on previous discussion';
      const result = await agent.execute({
        intent: 'draft_message' as ContentGenerationIntent,
        parameters: {
          context,
          points: ['Take action']
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.context).toBe(context);
    });

    it('should fail without context', async () => {
      const result = await agent.execute({
        intent: 'draft_message' as ContentGenerationIntent,
        parameters: {
          points: ['point1']
        }
      });

      expect(result.success).toBe(false);
    });

    it('should fail without points', async () => {
      const result = await agent.execute({
        intent: 'draft_message' as ContentGenerationIntent,
        parameters: {
          context: 'Context here'
        }
      });

      expect(result.success).toBe(false);
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
    it('should validate summarize parameters', async () => {
      const valid = await agent.validateInput({
        intent: 'summarize' as ContentGenerationIntent,
        parameters: { text: 'Sample' }
      });

      expect(valid.valid).toBe(true);

      const invalid = await agent.validateInput({
        intent: 'summarize' as ContentGenerationIntent,
        parameters: {}
      });

      expect(invalid.valid).toBe(false);
    });

    it('should validate style parameter', async () => {
      const invalid = await agent.validateInput({
        intent: 'generate' as ContentGenerationIntent,
        parameters: {
          prompt: 'Test',
          style: 'invalid_style'
        }
      });

      expect(invalid.valid).toBe(false);
    });

    it('should validate length parameter', async () => {
      const invalid = await agent.validateInput({
        intent: 'generate' as ContentGenerationIntent,
        parameters: {
          prompt: 'Test',
          length: 'invalid_length'
        }
      });

      expect(invalid.valid).toBe(false);
    });
  });

  describe('getRequiredParameters', () => {
    it('should return parameters for summarize', async () => {
      const params = await agent.getRequiredParameters('résumer');

      expect(params.some(p => p.name === 'text')).toBe(true);
    });

    it('should return parameters for translate', async () => {
      const params = await agent.getRequiredParameters('traduction');

      expect(params.some(p => p.name === 'text')).toBe(true);
      expect(params.some(p => p.name === 'targetLanguage')).toBe(true);
    });

    it('should return parameters for email drafting', async () => {
      const params = await agent.getRequiredParameters('email');

      expect(params.some(p => p.name === 'subject')).toBe(true);
      expect(params.some(p => p.name === 'recipient')).toBe(true);
    });
  });

  describe('getCapabilities', () => {
    it('should return all capabilities', async () => {
      const capabilities = await agent.getCapabilities();

      expect(capabilities.length).toBeGreaterThan(0);
      expect(capabilities.map(c => c.name)).toContain('summarization');
      expect(capabilities.map(c => c.name)).toContain('translation');
      expect(capabilities.map(c => c.name)).toContain('content_generation');

      capabilities.forEach(cap => {
        expect(cap.description).toBeDefined();
        expect(cap.requiredParameters).toBeDefined();
      });
    });
  });

  describe('metadata', () => {
    it('should include execution time in metadata', async () => {
      const result = await agent.execute({
        intent: 'generate' as ContentGenerationIntent,
        parameters: { prompt: 'Test' }
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.executionTime).toBeDefined();
    });

    it('should include confidence in metadata', async () => {
      const result = await agent.execute({
        intent: 'generate' as ContentGenerationIntent,
        parameters: { prompt: 'Test' }
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.confidence).toBeDefined();
    });
  });
});
