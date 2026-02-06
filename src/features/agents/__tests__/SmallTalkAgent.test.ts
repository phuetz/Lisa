/**
 * Tests for SmallTalkAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SmallTalkAgent } from '../implementations/SmallTalkAgent';
import { AgentDomains } from '../core/types';

// Mock the smallTalk library
vi.mock('../../../lib/smallTalk', () => ({
  isSmallTalk: vi.fn((text: string) => {
    const lowerText = text.toLowerCase();
    const patterns = [
      /how are you/i, /what.*your name/i, /who are you/i, /hello/i, /hi/i,
      /thank(s| you)/i, /good (morning|afternoon|evening|night)/i,
      /tell me a joke/i, /i('m| am) (sad|happy|tired|bored)/i
    ];
    return patterns.some(pattern => pattern.test(lowerText));
  }),
  processSmallTalk: vi.fn(async (text: string) => {
    // Mock response based on input
    if (text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi')) {
      return 'Hello! How can I help you today?';
    }
    if (text.toLowerCase().includes('how are you')) {
      return "I'm doing great, thanks for asking!";
    }
    if (text.toLowerCase().includes('joke')) {
      return "Why don't scientists trust atoms? Because they make up everything!";
    }
    return "I'm here to chat!";
  })
}));

describe('SmallTalkAgent', () => {
  let agent: SmallTalkAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new SmallTalkAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('SmallTalkAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('casual conversations');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.KNOWLEDGE);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('casual_conversation');
      expect(agent.capabilities).toContain('emotional_response');
      expect(agent.capabilities).toContain('fallback_response');
      expect(agent.capabilities).toContain('multi_language_support');
    });
  });

  describe('constructor', () => {
    it('should use default options when none provided', () => {
      const agentWithDefaults = new SmallTalkAgent();
      expect(agentWithDefaults).toBeDefined();
    });

    it('should accept custom options', () => {
      const customAgent = new SmallTalkAgent({
        maxTokens: 200,
        temperature: 0.8,
        model: 'gpt-4'
      });
      expect(customAgent).toBeDefined();
    });
  });

  describe('canHandle', () => {
    it('should return high confidence for small talk patterns', async () => {
      const confidence1 = await agent.canHandle('how are you');
      expect(confidence1).toBe(0.85);

      const confidence2 = await agent.canHandle('hello');
      expect(confidence2).toBe(0.85);

      const confidence3 = await agent.canHandle('tell me a joke');
      expect(confidence3).toBe(0.85);
    });

    it('should return high confidence for greetings', async () => {
      const confidence1 = await agent.canHandle('hi there');
      expect(confidence1).toBeGreaterThanOrEqual(0.85);

      const confidence2 = await agent.canHandle('hello!');
      expect(confidence2).toBeGreaterThanOrEqual(0.85);

      const confidence3 = await agent.canHandle('hey');
      expect(confidence3).toBe(0.9);

      const confidence4 = await agent.canHandle('bonjour');
      expect(confidence4).toBe(0.9);
    });

    it('should return high confidence for emotional content', async () => {
      const confidence = await agent.canHandle('I feel happy today');
      expect(confidence).toBe(0.8);
    });

    it('should return medium confidence for short questions', async () => {
      const confidence = await agent.canHandle('what?');
      expect(confidence).toBe(0.6);
    });

    it('should return low confidence for non-small-talk queries', async () => {
      const confidence = await agent.canHandle('set an alarm for 7am');
      expect(confidence).toBe(0.2);
    });
  });

  describe('validateInput', () => {
    it('should return valid for request provided', async () => {
      const result = await agent.validateInput({
        request: 'Hello there'
      });

      expect(result.valid).toBe(true);
    });

    it('should return valid for intent provided', async () => {
      const result = await agent.validateInput({
        intent: 'How are you doing?'
      });

      expect(result.valid).toBe(true);
    });

    it('should return invalid when neither intent nor request is provided', async () => {
      const result = await agent.validateInput({});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Either intent or request must be provided');
    });
  });

  describe('execute', () => {
    it('should process small talk successfully with request', async () => {
      const result = await agent.execute({
        request: 'Hello!'
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(typeof result.output).toBe('string');
    });

    it('should process small talk successfully with intent', async () => {
      const result = await agent.execute({
        intent: 'How are you?'
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should return appropriate response for greetings', async () => {
      const result = await agent.execute({
        request: 'Hello!'
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello');
    });

    it('should return appropriate response for how are you', async () => {
      const result = await agent.execute({
        request: 'How are you today?'
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('great');
    });

    it('should fail when no text is provided', async () => {
      const result = await agent.execute({
        request: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No text provided');
    });

    it('should include metadata on success', async () => {
      const result = await agent.execute({
        request: 'Hello!'
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.executionTime).toBeDefined();
      expect(result.metadata?.source).toBe('SmallTalkAgent');
      expect(result.metadata?.timestamp).toBeDefined();
    });

    it('should use custom model if provided in props', async () => {
      const result = await agent.execute({
        request: 'Hello!',
        model: 'gpt-4-turbo'
      });

      expect(result.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Import and mock processSmallTalk to throw an error
      const smallTalkModule = await import('../../../lib/smallTalk');
      vi.mocked(smallTalkModule.processSmallTalk).mockRejectedValueOnce(new Error('API Error'));

      const result = await agent.execute({
        request: 'Hello!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
      expect(result.output).toContain("I'm sorry");
    });
  });

  describe('emotional tone detection', () => {
    // Access the private method for testing
    it('should detect positive emotional tone', async () => {
      const agent = new SmallTalkAgent();
      // @ts-expect-error - accessing private method for testing
      const tone = agent.detectEmotionalTone('I am so happy today!');
      expect(tone).toBe('positive');
    });

    it('should detect negative emotional tone', async () => {
      const agent = new SmallTalkAgent();
      // @ts-expect-error - accessing private method for testing
      const tone = agent.detectEmotionalTone('I am feeling sad and frustrated');
      expect(tone).toBe('negative');
    });

    it('should detect neutral emotional tone', async () => {
      const agent = new SmallTalkAgent();
      // @ts-expect-error - accessing private method for testing
      const tone = agent.detectEmotionalTone('The sky is blue');
      expect(tone).toBe('neutral');
    });
  });

  describe('multi-language support', () => {
    it('should handle French greetings', async () => {
      const confidence = await agent.canHandle('bonjour');
      expect(confidence).toBeGreaterThan(0);
    });

    it('should handle Spanish greetings', async () => {
      const confidence = await agent.canHandle('hola');
      expect(confidence).toBeGreaterThan(0);
    });

    it('should handle good morning variations', async () => {
      const confidence1 = await agent.canHandle('good morning');
      expect(confidence1).toBe(0.85);

      const confidence2 = await agent.canHandle('good afternoon');
      expect(confidence2).toBe(0.85);

      const confidence3 = await agent.canHandle('good evening');
      expect(confidence3).toBe(0.85);

      const confidence4 = await agent.canHandle('good night');
      expect(confidence4).toBe(0.85);
    });
  });

  describe('question handling', () => {
    it('should handle who questions', async () => {
      const confidence = await agent.canHandle('who are you?');
      expect(confidence).toBe(0.85);
    });

    it('should handle what questions about identity', async () => {
      const confidence = await agent.canHandle('what is your name?');
      expect(confidence).toBe(0.85);
    });
  });

  describe('thanks handling', () => {
    it('should handle thank you', async () => {
      const confidence = await agent.canHandle('thank you');
      expect(confidence).toBe(0.85);
    });

    it('should handle thanks', async () => {
      const confidence = await agent.canHandle('thanks');
      expect(confidence).toBe(0.85);
    });
  });

  describe('emotional content handling', () => {
    it('should handle expressions of feelings', async () => {
      const confidence1 = await agent.canHandle("I'm happy");
      expect(confidence1).toBe(0.85);

      const confidence2 = await agent.canHandle("I am sad");
      expect(confidence2).toBe(0.85);

      const confidence3 = await agent.canHandle("I'm tired");
      expect(confidence3).toBe(0.85);

      const confidence4 = await agent.canHandle("I'm bored");
      expect(confidence4).toBe(0.85);
    });
  });

  describe('execution time tracking', () => {
    it('should track execution time accurately', async () => {
      const result = await agent.execute({
        request: 'Hello!'
      });

      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.executionTime).toBeLessThan(5000); // Should be fast
    });
  });

  describe('fallback responses', () => {
    it('should provide fallback response on error', async () => {
      const smallTalkModule = await import('../../../lib/smallTalk');
      vi.mocked(smallTalkModule.processSmallTalk).mockRejectedValueOnce(new Error('Service unavailable'));

      const result = await agent.execute({
        request: 'Hello!'
      });

      expect(result.success).toBe(false);
      expect(result.output).toBeDefined();
      expect(result.output).toContain("I'm sorry");
    });
  });
});
