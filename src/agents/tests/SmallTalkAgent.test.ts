/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SmallTalkAgent } from '../SmallTalkAgent';
import { isSmallTalk, processSmallTalk } from '../../lib/smallTalk';

// Mock the smallTalk library
vi.mock('../../lib/smallTalk', () => ({
  isSmallTalk: vi.fn(),
  processSmallTalk: vi.fn(),
}));

describe('SmallTalkAgent', () => {
  let agent: SmallTalkAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new SmallTalkAgent({ apiKey: 'test-key' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canHandle', () => {
    it('should return high confidence for small talk', async () => {
      (isSmallTalk as vi.Mock).mockReturnValue(true);
      const confidence = await agent.canHandle('how are you?');
      expect(confidence).toBe(0.85);
      expect(isSmallTalk).toHaveBeenCalledWith('how are you?');
    });

    it('should return low confidence for non-small talk', async () => {
      (isSmallTalk as vi.Mock).mockReturnValue(false);
      const confidence = await agent.canHandle('what is the weather?');
      // This will now fall through to the other heuristics
      expect(confidence).toBe(0.2);
      expect(isSmallTalk).toHaveBeenCalledWith('what is the weather?');
    });
  });

  describe('validateInput', () => {
    it('should return valid for input with a request', async () => {
      const result = await agent.validateInput({ request: 'Hello there' });
      expect(result.valid).toBe(true);
    });

    it('should return valid for input with an intent', async () => {
      const result = await agent.validateInput({ intent: 'greeting' });
      expect(result.valid).toBe(true);
    });

    it('should return invalid for empty input', async () => {
      const result = await agent.validateInput({});
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Either intent or request must be provided']);
    });
  });

  describe('execute', () => {
    it('should process small talk successfully', async () => {
      (processSmallTalk as vi.Mock).mockResolvedValue('I am doing great, thanks for asking!');

      const result = await agent.execute({ request: 'how are you?' });

      expect(result.success).toBe(true);
      expect(result.output).toBe('I am doing great, thanks for asking!');
      expect(processSmallTalk).toHaveBeenCalledWith('how are you?', {
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        maxTokens: 150,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
      });
    });

    it('should handle errors gracefully', async () => {
      (processSmallTalk as vi.Mock).mockRejectedValue(new Error('API Failure'));

      const result = await agent.execute({ request: 'how are you?' });

      expect(result.success).toBe(false);
      expect(result.output).toContain('having trouble');
      expect(result.error).toBe('API Failure');
      expect(processSmallTalk).toHaveBeenCalledWith('how are you?', {
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        maxTokens: 150,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
      });
    });

    it('should handle empty input', async () => {
      const result = await agent.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toBe('No text provided for small talk processing');
      expect(processSmallTalk).not.toHaveBeenCalled();
    });
  });
});

