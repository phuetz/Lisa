/**
 * Tests for EmailAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmailAgent } from '../implementations/EmailAgent';
import { AgentDomains } from '../core/types';

// Mock the Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => 'Thank you for your email. I will review and respond shortly.'
        }
      })
    })
  }))
}));

// Mock import.meta.env
vi.mock('../../../config', () => ({
  config: {
    geminiApiKey: undefined
  }
}));

describe('EmailAgent', () => {
  let agent: EmailAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new EmailAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('EmailAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('email management');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.PRODUCTIVITY);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('email_classification');
      expect(agent.capabilities).toContain('response_suggestion');
      expect(agent.capabilities).toContain('priority_detection');
      expect(agent.capabilities).toContain('spam_detection');
      expect(agent.capabilities).toContain('email_summarization');
      expect(agent.capabilities).toContain('smart_reply');
    });
  });

  describe('canHandle', () => {
    it('should return high confidence for email-related queries', async () => {
      const confidence1 = await agent.canHandle('check my email');
      expect(confidence1).toBeGreaterThan(0);

      const confidence2 = await agent.canHandle('reply to this message');
      expect(confidence2).toBeGreaterThan(0);

      const confidence3 = await agent.canHandle('is this spam');
      expect(confidence3).toBeGreaterThan(0);
    });

    it('should return higher confidence for multiple keyword matches', async () => {
      const confidence = await agent.canHandle('reply to this email message in my inbox');
      expect(confidence).toBeGreaterThan(0.6);
    });

    it('should handle French email keywords', async () => {
      const confidence1 = await agent.canHandle('courriel');
      expect(confidence1).toBeGreaterThan(0);

      const confidence2 = await agent.canHandle('répondre au courrier');
      expect(confidence2).toBeGreaterThan(0);
    });

    it('should return zero for unrelated queries', async () => {
      const confidence = await agent.canHandle('what is the weather');
      expect(confidence).toBe(0);
    });
  });

  describe('execute - classify_email intent', () => {
    it('should classify work email correctly', async () => {
      const result = await agent.execute({
        intent: 'classify_email',
        parameters: {
          email: {
            subject: 'Project deadline tomorrow',
            body: 'Please submit the report by end of day',
            from: 'boss@company.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.category).toBe('work');
      expect(result.output.suggestedActions).toBeDefined();
    });

    it('should classify promotional email correctly', async () => {
      const result = await agent.execute({
        intent: 'classify_email',
        parameters: {
          email: {
            subject: 'Big Sale! 50% off everything',
            body: 'Shop now for amazing discount deals!',
            from: 'sales@store.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.category).toBe('promotional');
    });

    it('should classify social email correctly', async () => {
      const result = await agent.execute({
        intent: 'classify_email',
        parameters: {
          email: {
            subject: 'Someone liked your post',
            body: 'John shared your photo and commented on it',
            from: 'notifications@social.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.category).toBe('social');
    });

    it('should classify spam email correctly', async () => {
      const result = await agent.execute({
        intent: 'classify_email',
        parameters: {
          email: {
            subject: 'WINNER! You won $1,000,000',
            body: 'Click here to claim your prize now!',
            from: 'unknown@spam.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.category).toBe('spam');
    });

    it('should fail when email is not provided', async () => {
      const result = await agent.execute({
        intent: 'classify_email',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No email provided');
    });

    it('should include confidence score', async () => {
      const result = await agent.execute({
        intent: 'classify_email',
        parameters: {
          email: {
            subject: 'Meeting tomorrow',
            body: 'Please attend the client meeting',
            from: 'manager@work.com'
          }
        }
      });

      expect(result.output.confidence).toBeDefined();
      expect(result.output.confidence).toBeGreaterThan(0);
    });
  });

  describe('execute - suggest_response intent', () => {
    it('should suggest reply for email with questions', async () => {
      const result = await agent.execute({
        intent: 'suggest_response',
        parameters: {
          email: {
            subject: 'Quick question',
            body: 'Can you help me with this?',
            from: 'colleague@work.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.suggestions).toBeDefined();
      expect(result.output.suggestions.some((s: any) => s.type === 'reply')).toBe(true);
    });

    it('should suggest reply for action requests', async () => {
      const result = await agent.execute({
        intent: 'suggest_response',
        parameters: {
          email: {
            subject: 'Request',
            body: 'Please send me the document when you can',
            from: 'client@company.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.suggestions.some((s: any) => s.reason.includes('Action'))).toBe(true);
    });

    it('should suggest archive for newsletters', async () => {
      const result = await agent.execute({
        intent: 'suggest_response',
        parameters: {
          email: {
            subject: 'Weekly Newsletter',
            body: 'This is your weekly update. Unsubscribe here.',
            from: 'newsletter@company.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.suggestions.some((s: any) => s.type === 'archive')).toBe(true);
    });

    it('should provide default suggestion when no specific action needed', async () => {
      const result = await agent.execute({
        intent: 'suggest_response',
        parameters: {
          email: {
            subject: 'FYI',
            body: 'Just letting you know about this.',
            from: 'info@company.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.primarySuggestion).toBeDefined();
    });

    it('should fail when email is not provided', async () => {
      const result = await agent.execute({
        intent: 'suggest_response',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No email provided');
    });
  });

  describe('execute - detect_priority intent', () => {
    it('should detect high priority for urgent emails', async () => {
      const result = await agent.execute({
        intent: 'detect_priority',
        parameters: {
          email: {
            subject: 'URGENT: Action required',
            body: 'This is critical and needs immediate attention',
            from: 'boss@company.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.priority).toBe('high');
      expect(result.output.score).toBeGreaterThan(70);
    });

    it('should detect low priority for newsletters', async () => {
      const result = await agent.execute({
        intent: 'detect_priority',
        parameters: {
          email: {
            subject: 'Monthly Newsletter',
            body: 'FYI - here is your monthly update',
            from: 'newsletter@company.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.priority).toBe('low');
    });

    it('should detect high priority from VIP senders', async () => {
      const result = await agent.execute({
        intent: 'detect_priority',
        parameters: {
          email: {
            subject: 'Quick update',
            body: 'Just wanted to share some news',
            from: 'ceo@company.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.priority).toBe('high');
    });

    it('should include priority reasoning', async () => {
      const result = await agent.execute({
        intent: 'detect_priority',
        parameters: {
          email: {
            subject: 'Regular update',
            body: 'Nothing urgent here',
            from: 'team@company.com'
          }
        }
      });

      expect(result.output.reasoning).toBeDefined();
    });

    it('should fail when email is not provided', async () => {
      const result = await agent.execute({
        intent: 'detect_priority',
        parameters: {}
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - summarize_email intent', () => {
    it('should summarize email content', async () => {
      const result = await agent.execute({
        intent: 'summarize_email',
        parameters: {
          email: {
            subject: 'Project Update',
            body: 'The project is going well. We completed phase 1 and are starting phase 2 next week. Please review the attached documents.',
            from: 'pm@company.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.subject).toBe('Project Update');
      expect(result.output.from).toBe('pm@company.com');
      expect(result.output.preview).toBeDefined();
      expect(result.output.keyPoints).toBeDefined();
    });

    it('should detect action required', async () => {
      const result = await agent.execute({
        intent: 'summarize_email',
        parameters: {
          email: {
            subject: 'Task',
            body: 'Please review and send feedback',
            from: 'manager@company.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.actionRequired).toBe(true);
    });

    it('should analyze sentiment', async () => {
      const result = await agent.execute({
        intent: 'summarize_email',
        parameters: {
          email: {
            subject: 'Great news',
            body: 'Thank you for your excellent work!',
            from: 'boss@company.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.sentiment).toBe('positive');
    });

    it('should fail when email is not provided', async () => {
      const result = await agent.execute({
        intent: 'summarize_email',
        parameters: {}
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - detect_spam intent', () => {
    it('should detect spam with high confidence', async () => {
      const result = await agent.execute({
        intent: 'detect_spam',
        parameters: {
          email: {
            subject: 'CONGRATULATIONS WINNER!!!',
            body: 'You won a prize! Click here to claim your inheritance from Nigeria',
            from: 'noreply@unknown.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.isSpam).toBe(true);
      expect(result.output.spamScore).toBeGreaterThanOrEqual(50);
      expect(result.output.indicators.length).toBeGreaterThan(0);
    });

    it('should detect legitimate email', async () => {
      const result = await agent.execute({
        intent: 'detect_spam',
        parameters: {
          email: {
            subject: 'Meeting tomorrow',
            body: 'Hi team, let us discuss the project status.',
            from: 'colleague@company.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.isSpam).toBe(false);
      expect(result.output.recommendation).toContain('legitimate');
    });

    it('should detect excessive capitals as spam indicator', async () => {
      const result = await agent.execute({
        intent: 'detect_spam',
        parameters: {
          email: {
            subject: 'LIMITED TIME OFFER',
            body: 'Act now before it is too late',
            from: 'sales@unknown.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.indicators).toContain('excessive capitals');
    });

    it('should fail when email is not provided', async () => {
      const result = await agent.execute({
        intent: 'detect_spam',
        parameters: {}
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - generate_reply intent', () => {
    it('should generate professional reply by default', async () => {
      const result = await agent.execute({
        intent: 'generate_reply',
        parameters: {
          email: {
            subject: 'Question',
            body: 'Can you help me with this issue?',
            from: 'client@company.com'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.reply).toBeDefined();
      expect(result.output.tone).toBe('professional');
    });

    it('should generate casual reply when specified', async () => {
      const result = await agent.execute({
        intent: 'generate_reply',
        parameters: {
          email: {
            subject: 'Hi',
            body: 'What are you up to?',
            from: 'friend@email.com'
          },
          tone: 'casual'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.tone).toBe('casual');
    });

    it('should generate formal reply when specified', async () => {
      const result = await agent.execute({
        intent: 'generate_reply',
        parameters: {
          email: {
            subject: 'Business proposal',
            body: 'We would like to discuss a partnership',
            from: 'executive@bigcorp.com'
          },
          tone: 'formal'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.tone).toBe('formal');
    });

    it('should include suggestions for template replies', async () => {
      const result = await agent.execute({
        intent: 'generate_reply',
        parameters: {
          email: {
            subject: 'Hello',
            body: 'Just checking in',
            from: 'contact@email.com'
          }
        }
      });

      expect(result.success).toBe(true);
      if (result.output.source === 'Template') {
        expect(result.output.suggestions).toBeDefined();
        expect(result.output.suggestions.length).toBeGreaterThan(0);
      }
    });

    it('should fail when email is not provided', async () => {
      const result = await agent.execute({
        intent: 'generate_reply',
        parameters: {}
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - batch_process intent', () => {
    const testEmails = [
      {
        id: 'email-1',
        subject: 'Urgent meeting',
        body: 'Please attend the critical meeting',
        from: 'boss@company.com'
      },
      {
        id: 'email-2',
        subject: 'Newsletter',
        body: 'Weekly updates for you',
        from: 'newsletter@company.com'
      },
      {
        id: 'email-3',
        subject: 'YOU WON!!!',
        body: 'Claim your prize now! Click here!',
        from: 'spam@unknown.com'
      }
    ];

    it('should process multiple emails', async () => {
      const result = await agent.execute({
        intent: 'batch_process',
        parameters: { emails: testEmails }
      });

      expect(result.success).toBe(true);
      expect(result.output.processed).toBe(3);
      expect(result.output.results.length).toBe(3);
    });

    it('should provide summary statistics', async () => {
      const result = await agent.execute({
        intent: 'batch_process',
        parameters: { emails: testEmails }
      });

      expect(result.success).toBe(true);
      expect(result.output.summary).toBeDefined();
      expect(result.output.summary.spam).toBeDefined();
      expect(result.output.summary.highPriority).toBeDefined();
      expect(result.output.summary.work).toBeDefined();
    });

    it('should fail when emails array is empty', async () => {
      const result = await agent.execute({
        intent: 'batch_process',
        parameters: { emails: [] }
      });

      expect(result.success).toBe(false);
    });

    it('should fail when emails is not an array', async () => {
      const result = await agent.execute({
        intent: 'batch_process',
        parameters: { emails: 'not-an-array' }
      });

      expect(result.success).toBe(false);
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
      // Create a scenario that might throw an error
      const result = await agent.execute({
        intent: 'classify_email',
        parameters: {
          email: null
        }
      });

      expect(result.success).toBe(false);
    });

    it('should include timestamp in metadata', async () => {
      const result = await agent.execute({
        intent: 'classify_email',
        parameters: {
          email: {
            subject: 'Test',
            body: 'Test body',
            from: 'test@test.com'
          }
        }
      });

      expect(result.metadata?.timestamp).toBeDefined();
    });

    it('should include execution time in metadata on error', async () => {
      const result = await agent.execute({
        intent: 'unknown',
        parameters: {}
      });

      expect(result.metadata?.executionTime).toBeDefined();
    });
  });

  describe('metadata', () => {
    it('should include source in metadata', async () => {
      const result = await agent.execute({
        intent: 'classify_email',
        parameters: {
          email: {
            subject: 'Test',
            body: 'Test body',
            from: 'test@test.com'
          }
        }
      });

      expect(result.metadata?.source).toBe('EmailAgent');
    });
  });
});
