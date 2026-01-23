/**
 * EmailAgent - Email Management and Analysis
 * 
 * Assists in email management, classification, and response suggestions
 */

import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import { AgentDomains } from '../core/types';

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: number;
  read: boolean;
  category?: 'personal' | 'work' | 'promotional' | 'social' | 'spam';
  priority?: 'low' | 'medium' | 'high';
}

interface EmailSuggestion {
  type: 'reply' | 'forward' | 'archive' | 'delete';
  content?: string;
  reason: string;
  confidence: number;
}

export class EmailAgent implements BaseAgent {
  name = 'EmailAgent';
  description = 'Assists in email management with analysis, classification, and response suggestions';
  version = '1.0.0';
  domain: AgentDomain = AgentDomains.PRODUCTIVITY;
  capabilities = [
    'email_classification',
    'response_suggestion',
    'priority_detection',
    'spam_detection',
    'email_summarization',
    'smart_reply'
  ];

  private emailCache: Map<string, Email> = new Map();

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const { intent, context: _context, parameters } = props;

    try {
      switch (intent) {
        case 'classify_email':
          return await this.classifyEmail(parameters);

        case 'suggest_response':
          return await this.suggestResponse(parameters);

        case 'detect_priority':
          return await this.detectPriority(parameters);

        case 'summarize_email':
          return await this.summarizeEmail(parameters);

        case 'detect_spam':
          return await this.detectSpam(parameters);

        case 'generate_reply':
          return await this.generateReply(parameters);

        case 'batch_process':
          return await this.batchProcess(parameters);

        default:
          return {
            success: false,
            output: null,
            error: `Unknown intent: ${intent}`,
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Classify email into categories
   */
  private async classifyEmail(params: any): Promise<AgentExecuteResult> {
    const { email } = params;

    if (!email) {
      return {
        success: false,
        output: null,
        error: 'No email provided'
      };
    }

    const { subject = '', body = '', from = '' } = email;
    const text = `${subject} ${body} ${from}`.toLowerCase();

    // Simple keyword-based classification
    let category: Email['category'] = 'personal';
    let confidence = 0.5;

    const categories = {
      work: ['meeting', 'project', 'deadline', 'report', 'client', 'schedule'],
      promotional: ['offer', 'discount', 'sale', 'buy', 'shop', 'deal', 'promo'],
      social: ['notification', 'commented', 'liked', 'shared', 'followed'],
      spam: ['winner', 'prize', 'urgent', 'act now', 'click here', 'free money']
    };

    for (const [cat, keywords] of Object.entries(categories)) {
      const matches = keywords.filter(kw => text.includes(kw)).length;
      if (matches > 0) {
        const matchConfidence = Math.min(matches * 0.25, 1.0);
        if (matchConfidence > confidence) {
          category = cat as Email['category'];
          confidence = matchConfidence;
        }
      }
    }

    return {
      success: true,
      output: {
        category,
        confidence,
        suggestedActions: this.getSuggestedActions(category)
      },
      metadata: {
        source: 'EmailAgent',
        timestamp: Date.now(),
        confidence
      }
    };
  }

  /**
   * Suggest response actions
   */
  private async suggestResponse(params: any): Promise<AgentExecuteResult> {
    const { email } = params;

    if (!email) {
      return {
        success: false,
        output: null,
        error: 'No email provided'
      };
    }

    const suggestions: EmailSuggestion[] = [];

    // Analyze email content for suggestions
    const { subject = '', body = '' } = email;
    const text = `${subject} ${body}`.toLowerCase();

    // Check for questions
    if (text.includes('?')) {
      suggestions.push({
        type: 'reply',
        content: 'This email contains questions that may require a response.',
        reason: 'Question detected in email',
        confidence: 0.8
      });
    }

    // Check for action items
    if (text.includes('please') || text.includes('could you') || text.includes('can you')) {
      suggestions.push({
        type: 'reply',
        content: 'Action item detected. Consider responding with your availability or plan.',
        reason: 'Action request detected',
        confidence: 0.75
      });
    }

    // Check for newsletters/promotions
    if (text.includes('unsubscribe') || text.includes('newsletter')) {
      suggestions.push({
        type: 'archive',
        reason: 'Newsletter or promotional email',
        confidence: 0.7
      });
    }

    // Default suggestion
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'archive',
        reason: 'No immediate action required',
        confidence: 0.5
      });
    }

    return {
      success: true,
      output: {
        suggestions,
        primarySuggestion: suggestions[0]
      },
      metadata: {
        source: 'EmailAgent',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Detect email priority
   */
  private async detectPriority(params: any): Promise<AgentExecuteResult> {
    const { email } = params;

    if (!email) {
      return {
        success: false,
        output: null,
        error: 'No email provided'
      };
    }

    const { subject = '', body = '', from = '' } = email;
    const text = `${subject} ${body}`.toLowerCase();

    let priority: Email['priority'] = 'medium';
    let score = 50;

    // High priority indicators
    const highPriorityKeywords = ['urgent', 'asap', 'important', 'deadline', 'critical'];
    const highMatches = highPriorityKeywords.filter(kw => text.includes(kw)).length;

    if (highMatches > 0 || subject.includes('URGENT') || subject.includes('!!!')) {
      priority = 'high';
      score = 80 + (highMatches * 5);
    }

    // Low priority indicators
    const lowPriorityKeywords = ['newsletter', 'notification', 'fyi', 'no reply'];
    const lowMatches = lowPriorityKeywords.filter(kw => text.includes(kw)).length;

    if (lowMatches > 0 && priority === 'medium') {
      priority = 'low';
      score = 30;
    }

    // Check if from important sender
    const vipDomains = ['boss', 'ceo', 'director', 'client'];
    if (vipDomains.some(domain => from.toLowerCase().includes(domain))) {
      priority = 'high';
      score = Math.min(score + 20, 100);
    }

    return {
      success: true,
      output: {
        priority,
        score,
        reasoning: this.getPriorityReasoning(priority)
      },
      metadata: {
        source: 'EmailAgent',
        timestamp: Date.now(),
        confidence: score / 100
      }
    };
  }

  /**
   * Summarize email content
   */
  private async summarizeEmail(params: any): Promise<AgentExecuteResult> {
    const { email } = params;

    if (!email) {
      return {
        success: false,
        output: null,
        error: 'No email provided'
      };
    }

    const { subject, body, from } = email;

    // Simple summarization (in production, use LLM)
    const bodyPreview = body ? body.substring(0, 150) + (body.length > 150 ? '...' : '') : '';

    const summary = {
      from,
      subject,
      preview: bodyPreview,
      keyPoints: this.extractKeyPoints(body || ''),
      sentiment: this.analyzeSentiment(body || ''),
      actionRequired: body?.toLowerCase().includes('please') || body?.toLowerCase().includes('action')
    };

    return {
      success: true,
      output: summary,
      metadata: {
        source: 'EmailAgent',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Detect spam emails
   */
  private async detectSpam(params: any): Promise<AgentExecuteResult> {
    const { email } = params;

    if (!email) {
      return {
        success: false,
        output: null,
        error: 'No email provided'
      };
    }

    const { subject = '', body = '', from = '' } = email;
    const text = `${subject} ${body}`.toLowerCase();

    let spamScore = 0;
    const spamIndicators: string[] = [];

    // Check for spam keywords
    const spamKeywords = [
      'congratulations', 'winner', 'prize', 'click here', 'urgent action',
      'verify account', 'suspended', 'limited time', 'act now', 'free',
      'nigeria', 'inheritance', 'lottery', 'viagra'
    ];

    spamKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        spamScore += 15;
        spamIndicators.push(keyword);
      }
    });

    // Check for suspicious sender
    if (from.includes('noreply') && spamScore > 0) {
      spamScore += 10;
      spamIndicators.push('suspicious sender');
    }

    // Check for excessive caps
    if (subject.toUpperCase() === subject && subject.length > 10) {
      spamScore += 20;
      spamIndicators.push('excessive capitals');
    }

    // Check for excessive punctuation
    if ((subject.match(/!!/g) || []).length > 0) {
      spamScore += 10;
      spamIndicators.push('excessive punctuation');
    }

    const isSpam = spamScore >= 50;

    return {
      success: true,
      output: {
        isSpam,
        spamScore: Math.min(spamScore, 100),
        confidence: Math.min(spamScore / 100, 1.0),
        indicators: spamIndicators,
        recommendation: isSpam ? 'Move to spam folder' : 'Looks legitimate'
      },
      metadata: {
        source: 'EmailAgent',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Generate email reply
   */
  private async generateReply(params: any): Promise<AgentExecuteResult> {
    const { email, tone = 'professional', language = 'en' } = params;

    if (!email) {
      return {
        success: false,
        output: null,
        error: 'No email provided'
      };
    }

    // Try to use Gemini API for better replies
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (apiKey) {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `Generate a ${tone} email reply in ${language} language to the following email:\n\nFrom: ${email.from}\nSubject: ${email.subject}\nBody: ${email.body}\n\nProvide only the reply body, no subject line.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const reply = response.text();

        return {
          success: true,
          output: {
            reply,
            tone,
            language,
            source: 'Gemini-Pro',
            suggestions: []
          },
          metadata: {
            source: 'EmailAgent',
            timestamp: Date.now()
          }
        };
      }
    } catch (error) {
      console.warn('[EmailAgent] Gemini API not available, using template fallback:', error);
    }

    // Fallback to templates if Gemini is not available
    const templates = {
      professional: 'Thank you for your email. I will review this and get back to you shortly.',
      casual: 'Thanks for reaching out! I\'ll take a look and respond soon.',
      formal: 'Dear Sender,\n\nThank you for your correspondence. I acknowledge receipt of your message and will respond appropriately in due course.\n\nBest regards'
    };

    const reply = templates[tone as keyof typeof templates] || templates.professional;

    return {
      success: true,
      output: {
        reply,
        tone,
        language,
        source: 'Template',
        suggestions: [
          'Consider adding specific timeline',
          'Person alize with recipient name',
          'Add relevant details from original email'
        ]
      },
      metadata: {
        source: 'EmailAgent',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Process multiple emails in batch
   */
  private async batchProcess(params: any): Promise<AgentExecuteResult> {
    const { emails = [] } = params;

    if (!Array.isArray(emails) || emails.length === 0) {
      return {
        success: false,
        output: null,
        error: 'No emails provided'
      };
    }

    const results = await Promise.all(
      emails.map(async (email) => {
        const classification = await this.classifyEmail({ email });
        const priority = await this.detectPriority({ email });
        const spam = await this.detectSpam({ email });

        return {
          emailId: email.id,
          category: classification.output?.category,
          priority: priority.output?.priority,
          isSpam: spam.output?.isSpam,
          spamScore: spam.output?.spamScore
        };
      })
    );

    return {
      success: true,
      output: {
        processed: emails.length,
        results,
        summary: {
          spam: results.filter(r => r.isSpam).length,
          highPriority: results.filter(r => r.priority === 'high').length,
          work: results.filter(r => r.category === 'work').length
        }
      },
      metadata: {
        source: 'EmailAgent',
        timestamp: Date.now()
      }
    };
  }

  // Helper methods

  private getSuggestedActions(category: Email['category']): string[] {
    const actions: Record<string, string[]> = {
      work: ['Prioritize', 'Add to task list', 'Schedule time to respond'],
      promotional: ['Archive', 'Unsubscribe if not interested', 'Mark as read'],
      social: ['Quick scan', 'Archive', 'Adjust notification settings'],
      spam: ['Delete', 'Mark as spam', 'Block sender'],
      personal: ['Read carefully', 'Respond promptly if needed']
    };

    return actions[category || 'personal'] || actions.personal;
  }

  private getPriorityReasoning(priority: Email['priority']): string {
    const reasons: Record<string, string> = {
      high: 'Contains urgent keywords or from important sender',
      medium: 'Standard business communication',
      low: 'Newsletter or informational content'
    };

    return reasons[priority || 'medium'];
  }

  private extractKeyPoints(body: string): string[] {
    // Simple extraction - in production, use NLP
    const sentences = body.split('.').filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).map(s => s.trim());
  }

  private analyzeSentiment(body: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['thank', 'great', 'excellent', 'happy', 'pleased'];
    const negativeWords = ['sorry', 'unfortunately', 'problem', 'issue', 'concerned'];

    const text = body.toLowerCase();
    const positiveCount = positiveWords.filter(w => text.includes(w)).length;
    const negativeCount = negativeWords.filter(w => text.includes(w)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  async canHandle(query: string, _context?: any): Promise<number> {
    const keywords = [
      'email', 'mail', 'message', 'inbox', 'sender', 'recipient',
      'reply', 'forward', 'spam', 'courriel', 'courrier',
      'envoyer', 'répondre', 'transférer'
    ];

    const lowerQuery = query.toLowerCase();
    const matches = keywords.filter(keyword => lowerQuery.includes(keyword));

    return matches.length > 0 ? Math.min(matches.length * 0.3, 1.0) : 0.0;
  }
}
