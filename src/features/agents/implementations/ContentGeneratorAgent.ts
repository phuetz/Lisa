/**
 * ContentGeneratorAgent - Creates textual and creative content
 * 
 * This agent handles text generation tasks like summarization, translation,
 * rewriting, and creative content generation using LLM APIs.
 */

import { AgentDomains } from '../core/types';
import type {
  AgentCapability,
  AgentExecuteProps,
  AgentExecuteResult,
  AgentParameter,
  BaseAgent
} from '../core/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Supported content generation intents
 */
export type ContentGenerationIntent =
  | 'summarize'
  | 'translate'
  | 'rewrite'
  | 'generate'
  | 'draft_email'
  | 'draft_message';

/**
 * Style options for text generation
 */
export type TextStyle = 'formal' | 'casual' | 'creative' | 'technical' | 'persuasive';

/**
 * Length options for text generation
 */
export type TextLength = 'short' | 'medium' | 'long';

/**
 * Agent for generating and manipulating text content
 */
export class ContentGeneratorAgent implements BaseAgent {
  name = 'ContentGeneratorAgent';
  description = 'Génère et manipule du contenu textuel avec diverses options stylistiques';
  version = '1.0.0';
  domain = AgentDomains.ANALYSIS;
  capabilities = [
    'summarization',
    'translation',
    'content_generation',
    'email_drafting',
    'text_rewriting'
  ];

  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    // Initialize Gemini API if key is available
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      console.log('[ContentGeneratorAgent] Gemini API initialized');
    } else {
      console.warn('[ContentGeneratorAgent] No Gemini API key found. Set VITE_GEMINI_API_KEY in .env');
    }
  }

  /**
   * Main execution method for the agent
   */
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const intent = props.intent as ContentGenerationIntent;
    const parameters = props.parameters || {};
    const language = props.language || 'fr';

    try {
      let result;
      switch (intent) {
        case 'summarize':
          result = await this.summarizeText(
            parameters.text,
            parameters.length || 'medium',
            language
          );
          break;
        case 'translate':
          result = await this.translateText(
            parameters.text,
            parameters.targetLanguage || 'en',
            parameters.sourceLanguage
          );
          break;
        case 'rewrite':
          result = await this.rewriteText(
            parameters.text,
            parameters.style || 'casual',
            language
          );
          break;
        case 'generate':
          result = await this.generateContent(
            parameters.prompt,
            parameters.style || 'casual',
            parameters.length || 'medium',
            language
          );
          break;
        case 'draft_email':
          result = await this.draftEmail(
            parameters.subject,
            parameters.recipient,
            parameters.points,
            parameters.style || 'formal',
            language
          );
          break;
        case 'draft_message':
          result = await this.draftMessage(
            parameters.context,
            parameters.points,
            parameters.style || 'casual',
            language
          );
          break;
        default:
          return {
            success: false,
            output: `Intent non supporté: ${intent}`,
            error: new Error('UNSUPPORTED_INTENT'),
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
      }

      return {
        success: true,
        output: result,
        metadata: {
          executionTime: Date.now() - startTime,
          confidence: 0.9,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Determines if this agent can handle a specific query
   */
  async canHandle(query: string, context?: any): Promise<number> {
    const normalizedQuery = query.toLowerCase();

    // Keywords related to content generation
    const contentKeywords = [
      'résumer', 'résumé', 'synthétiser', 'synthèse',
      'traduire', 'traduction', 'en anglais', 'en espagnol',
      'réécrire', 'reformuler', 'rephraser',
      'générer', 'créer un texte', 'écrire',
      'email', 'courriel', 'mail', 'message'
    ];

    // Style keywords
    const styleKeywords = [
      'formel', 'professionnel', 'technique',
      'informel', 'décontracté', 'casual',
      'créatif', 'original', 'persuasif'
    ];

    // Count matches
    const contentMatches = contentKeywords.filter(keyword =>
      normalizedQuery.includes(keyword)).length;

    const styleMatches = styleKeywords.filter(keyword =>
      normalizedQuery.includes(keyword)).length;

    // Calculate confidence score
    let score = 0;

    if (contentMatches > 0) {
      score += Math.min(contentMatches * 0.2, 0.6);
    }

    if (styleMatches > 0) {
      score += Math.min(styleMatches * 0.1, 0.2);
    }

    // Additional context boost
    if (context?.lastAction === 'content_selection' ||
      context?.clipboard?.length > 0) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Returns required parameters for a specific task
   */
  async getRequiredParameters(task: string): Promise<AgentParameter[]> {
    const normalizedTask = task.toLowerCase();

    if (normalizedTask.includes('résumer') || normalizedTask.includes('résumé')) {
      return [
        {
          name: 'text',
          type: 'string',
          required: true,
          description: 'Texte à résumer'
        },
        {
          name: 'length',
          type: 'string',
          required: false,
          description: 'Longueur souhaitée (short, medium, long)',
          defaultValue: 'medium'
        }
      ];
    }

    if (normalizedTask.includes('traduire') || normalizedTask.includes('traduction')) {
      return [
        {
          name: 'text',
          type: 'string',
          required: true,
          description: 'Texte à traduire'
        },
        {
          name: 'targetLanguage',
          type: 'string',
          required: true,
          description: 'Langue cible (code ISO)'
        },
        {
          name: 'sourceLanguage',
          type: 'string',
          required: false,
          description: 'Langue source (code ISO, détection automatique si non spécifié)'
        }
      ];
    }

    if (normalizedTask.includes('email') || normalizedTask.includes('courriel')) {
      return [
        {
          name: 'subject',
          type: 'string',
          required: true,
          description: 'Sujet de l\'email'
        },
        {
          name: 'recipient',
          type: 'string',
          required: true,
          description: 'Destinataire'
        },
        {
          name: 'points',
          type: 'array',
          required: true,
          description: 'Points clés à inclure dans l\'email'
        },
        {
          name: 'style',
          type: 'string',
          required: false,
          description: 'Style d\'écriture',
          defaultValue: 'formal'
        }
      ];
    }

    return [];
  }

  /**
   * Returns detailed capability information
   */
  async getCapabilities(): Promise<AgentCapability[]> {
    return [
      {
        name: 'summarization',
        description: 'Résumé de textes longs',
        requiredParameters: [
          {
            name: 'text',
            type: 'string',
            required: true,
            description: 'Texte à résumer'
          }
        ]
      },
      {
        name: 'translation',
        description: 'Traduction entre différentes langues',
        requiredParameters: [
          {
            name: 'text',
            type: 'string',
            required: true,
            description: 'Texte à traduire'
          },
          {
            name: 'targetLanguage',
            type: 'string',
            required: true,
            description: 'Langue cible'
          }
        ]
      },
      {
        name: 'content_generation',
        description: 'Génération de contenu textuel',
        requiredParameters: [
          {
            name: 'prompt',
            type: 'string',
            required: true,
            description: 'Instruction pour la génération'
          }
        ]
      }
    ];
  }

  /**
   * Validates input parameters
   */
  async validateInput(props: AgentExecuteProps): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const intent = props.intent as ContentGenerationIntent;
    const parameters = props.parameters || {};

    switch (intent) {
      case 'summarize':
      case 'translate':
      case 'rewrite':
        if (!parameters.text || parameters.text.trim().length === 0) {
          errors.push('Le texte source est requis');
        }

        if (intent === 'translate' && !parameters.targetLanguage) {
          errors.push('La langue cible est requise pour la traduction');
        }
        break;

      case 'generate':
        if (!parameters.prompt || parameters.prompt.trim().length === 0) {
          errors.push('Un prompt est requis pour la génération de contenu');
        }
        break;

      case 'draft_email':
        if (!parameters.subject) {
          errors.push('Le sujet de l\'email est requis');
        }
        if (!parameters.recipient) {
          errors.push('Le destinataire de l\'email est requis');
        }
        if (!parameters.points || !Array.isArray(parameters.points) || parameters.points.length === 0) {
          errors.push('Des points clés sont requis pour rédiger l\'email');
        }
        break;
    }

    // Validate style parameter if provided
    if (parameters.style && !['formal', 'casual', 'creative', 'technical', 'persuasive'].includes(parameters.style)) {
      errors.push('Le style doit être l\'un des suivants: formal, casual, creative, technical, persuasive');
    }

    // Validate length parameter if provided
    if (parameters.length && !['short', 'medium', 'long'].includes(parameters.length)) {
      errors.push('La longueur doit être l\'une des suivantes: short, medium, long');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Summarizes text to a specified length
   */
  private async summarizeText(text: string, length: TextLength = 'medium', language: string): Promise<any> {
    if (!text || text.trim().length === 0) {
      throw new Error('Texte source requis');
    }

    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set VITE_GEMINI_API_KEY in .env');
    }

    const wordCount = text.split(/\s+/).length;
    let lengthInstruction;

    switch (length) {
      case 'short':
        lengthInstruction = 'very concise (50-100 words)';
        break;
      case 'medium':
        lengthInstruction = 'moderate length (100-200 words)';
        break;
      case 'long':
        lengthInstruction = 'detailed (200-400 words)';
        break;
    }

    const prompt = `Summarize the following text in ${language} language. Make it ${lengthInstruction}:\n\n${text}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    return {
      originalLength: wordCount,
      summaryLength: summary.split(/\s+/).length,
      summary,
      language,
      source: 'Gemini-Pro'
    };
  }

  /**
   * Translates text to the specified target language
   */
  private async translateText(text: string, targetLanguage: string, sourceLanguage?: string): Promise<any> {
    if (!text || text.trim().length === 0) {
      throw new Error('Texte source requis');
    }

    if (!targetLanguage) {
      throw new Error('Langue cible requise');
    }

    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set VITE_GEMINI_API_KEY in .env');
    }

    // Detect source language if not provided
    const detectedSourceLanguage = sourceLanguage || this.detectLanguage(text);

    const prompt = `Translate the following text from ${detectedSourceLanguage} to ${targetLanguage}. Only provide the translation, no explanations:\n\n${text}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text();

    return {
      originalLanguage: detectedSourceLanguage,
      targetLanguage,
      translatedText,
      originalLength: text.split(/\s+/).length,
      source: 'Gemini-Pro'
    };
  }

  /**
   * Rewrites text in the specified style
   */
  private async rewriteText(text: string, style: TextStyle = 'casual', language: string): Promise<any> {
    if (!text || text.trim().length === 0) {
      throw new Error('Texte source requis');
    }

    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set VITE_GEMINI_API_KEY in .env');
    }

    const prompt = `Rewrite the following text in ${language} language with a ${style} style while preserving the original meaning:\n\n${text}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const rewrittenText = response.text();

    return {
      originalText: text,
      rewrittenText,
      style,
      language,
      source: 'Gemini-Pro'
    };
  }

  /**
   * Generates content based on a prompt
   */
  private async generateContent(prompt: string, style: TextStyle = 'casual', length: TextLength = 'medium', language: string): Promise<any> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt requis');
    }

    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set VITE_GEMINI_API_KEY in .env');
    }

    let lengthInstruction;
    switch (length) {
      case 'short':
        lengthInstruction = '150 words';
        break;
      case 'medium':
        lengthInstruction = '350 words';
        break;
      case 'long':
        lengthInstruction = '600 words';
        break;
    }

    const fullPrompt = `Generate content in ${language} language with a ${style} style, approximately ${lengthInstruction}:\n\n${prompt}`;

    const result = await this.model.generateContent(fullPrompt);
    const response = await result.response;
    const generatedContent = response.text();

    return {
      prompt,
      generatedContent,
      style,
      length,
      actualWordCount: generatedContent.split(/\s+/).length,
      language,
      source: 'Gemini-Pro'
    };
  }

  /**
   * Drafts an email based on key points
   */
  private async draftEmail(subject: string, recipient: string, points: string[], style: TextStyle = 'formal', language: string): Promise<any> {
    if (!subject || subject.trim().length === 0) {
      throw new Error('Sujet requis');
    }

    if (!recipient || recipient.trim().length === 0) {
      throw new Error('Destinataire requis');
    }

    if (!points || !Array.isArray(points) || points.length === 0) {
      throw new Error('Points clés requis');
    }

    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set VITE_GEMINI_API_KEY in .env');
    }

    const pointsList = points.map((p, i) => `${i + 1}. ${p}`).join('\n');
    const prompt = `Draft a professional email in ${language} language with a ${style} tone.\n\nSubject: ${subject}\nRecipient: ${recipient}\n\nInclude these key points:\n${pointsList}\n\nProvide the complete email with greeting, body, and closing.`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const draftedEmail = response.text();

    return {
      subject,
      recipient,
      email: draftedEmail,
      style,
      pointsIncluded: points.length,
      language,
      source: 'Gemini-Pro'
    };
  }

  /**
   * Drafts a message based on context and key points
   */
  private async draftMessage(context: string, points: string[], style: TextStyle = 'casual', language: string): Promise<any> {
    if (!context || context.trim().length === 0) {
      throw new Error('Contexte requis');
    }

    if (!points || !Array.isArray(points) || points.length === 0) {
      throw new Error('Points clés requis');
    }

    if (!this.model) {
      throw new Error('Gemini API not initialized. Please set VITE_GEMINI_API_KEY in .env');
    }

    const pointsList = points.map((p, i) => `${i + 1}. ${p}`).join('\n');
    const prompt = `Draft a message in ${language} language with a ${style} tone.\n\nContext: ${context}\n\nInclude these key points:\n${pointsList}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const draftedMessage = response.text();

    return {
      context,
      message: draftedMessage,
      style,
      pointsIncluded: points.length,
      language,
      source: 'Gemini-Pro'
    };
  }

  /**
   * Simple language detection based on text sample
   * In a real implementation, would use a language detection API or library
   */
  private detectLanguage(text: string): string {
    const normalizedText = text.toLowerCase();

    // Simple detection based on common words and characters
    if (/[éèêëàâäôöùûüÿçœæ]/.test(normalizedText) &&
      (normalizedText.includes(' le ') || normalizedText.includes(' la ') ||
        normalizedText.includes(' un ') || normalizedText.includes(' une '))) {
      return 'fr';
    } else if (/[áéíóúñüç]/.test(normalizedText) &&
      (normalizedText.includes(' el ') || normalizedText.includes(' la ') ||
        normalizedText.includes(' un ') || normalizedText.includes(' una '))) {
      return 'es';
    } else {
      return 'en';
    }
  }
}
