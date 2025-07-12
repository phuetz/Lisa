/**
 * SmallTalkAgent.ts
 * 
 * Agent capable of handling casual conversations and chitchat using the useSmallTalk hook.
 * Provides a more engaging and personalized conversation experience with fallback responses
 * and emotional awareness.
 */

import { AgentDomains, type AgentExecuteProps, type AgentExecuteResult, type BaseAgent } from './types';
import { isSmallTalk, processSmallTalk, type SmallTalkOptions } from '../lib/smallTalk';

export class SmallTalkAgent implements BaseAgent {
  // Identity properties
  public name = 'SmallTalkAgent';
  public description = 'Handles casual conversations, chitchat, and provides personalized responses with emotional context';
  public version = '1.0.0';
  public domain = AgentDomains.KNOWLEDGE;
  public capabilities = [
    'casual_conversation', 
    'emotional_response', 
    'fallback_response',
    'multi_language_support'
  ];

  // Configuration properties
  private readonly options: SmallTalkOptions;

  /**
   * Create a new SmallTalkAgent
   * @param options Configuration options for the small talk interactions
   */
  constructor(options: SmallTalkOptions = {}) {
    this.options = {
      apiKey: options.apiKey || process.env.VITE_LLM_API_KEY,
      apiEndpoint: options.apiEndpoint || 'https://api.openai.com/v1/chat/completions',
      maxTokens: options.maxTokens || 150,
      temperature: options.temperature || 0.7,
      model: options.model || 'gpt-3.5-turbo'
    };
  }

  /**
   * Determines if the agent can handle a given query
   * @param query The user's text input
   * @returns A confidence score between 0-1
   */
  public async canHandle(query: string): Promise<number> {
    // Use the decoupled logic to detect if this is small talk
    if (isSmallTalk(query)) {
      return 0.85;
    }
    
    // Basic fallback confidence based on heuristics
    const lowerQuery = query.toLowerCase();
    
    // Check for question patterns
    const isQuestion = /\?$/.test(query) || 
      lowerQuery.startsWith('who') || 
      lowerQuery.startsWith('what') || 
      lowerQuery.startsWith('when') || 
      lowerQuery.startsWith('where') || 
      lowerQuery.startsWith('why') || 
      lowerQuery.startsWith('how');
      
    // Check for greeting or basic interaction patterns
    const isGreeting = /^(hi|hello|hey|greetings|howdy|bonjour|hola|salut)/i.test(lowerQuery);
    
    // Check for emotional content
    const hasEmotionalContent = /feel|happy|sad|angry|worry|anxious|excited|love|hate|tired|exhausted/i.test(lowerQuery);
    
    // Assign confidence based on the content
    if (isGreeting) return 0.9;
    if (hasEmotionalContent) return 0.8;
    if (isQuestion && query.length < 15) return 0.6; // Short questions might be small talk
    
    // Low default confidence
    return 0.2;
  }

  /**
   * Validates the input properties
   */
  public async validateInput(props: AgentExecuteProps): Promise<{valid: boolean, errors?: string[]}> {
    if (!props.intent && !props.request) {
      return { 
        valid: false, 
        errors: ['Either intent or request must be provided'] 
      };
    }
    
    // Input is valid as long as we have some text to process
    return { valid: true };
  }

  /**
   * Process small talk and generate a response
   */
  public async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    try {
      const startTime = Date.now();
      
      // Extract the text to process
      const text = props.request || props.intent || '';
      
      if (!text) {
        return {
          success: false,
          output: '',
          error: 'No text provided for small talk processing',
        };
      }

      // Use the decoupled logic to process small talk
      const response = await processSmallTalk(text, this.options);
      
      
      // Calculate execution time
      const executionTime = Date.now() - startTime;
      
      // Return success with the response
      return {
        success: true,
        output: response,
        metadata: {
          executionTime,
          source: 'SmallTalkAgent',
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('Error in SmallTalkAgent:', error);
      
      // Handle error gracefully with a fallback response
      return {
        success: false,
        output: "I'm sorry, I'm having trouble with our conversation right now.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * Get the emotional tone from text (for future enhancements)
   * @param text The text to analyze
   * @returns The detected emotional tone
   */
  private detectEmotionalTone(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Simple emotion detection
    if (/happy|joy|excited|great|good|excellent|wonderful|delighted/i.test(lowerText)) {
      return 'positive';
    } else if (/sad|upset|angry|frustrated|annoyed|bad|terrible|worry|anxious/i.test(lowerText)) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }
}
