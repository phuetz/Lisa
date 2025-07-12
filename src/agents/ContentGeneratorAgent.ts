/**
 * ContentGeneratorAgent - Creates textual and creative content
 * 
 * This agent handles text generation tasks like summarization, translation,
 * rewriting, and creative content generation using LLM APIs.
 */

import { AgentDomains } from './types';
import type { 
  AgentCapability, 
  AgentExecuteProps,
  AgentExecuteResult, 
  AgentParameter, 
  BaseAgent 
} from './types';

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
    
    // In a real implementation, this would call an LLM API
    // Here, we'll simulate a response
    const wordCount = text.split(/\s+/).length;
    let targetWordCount;
    
    switch (length) {
      case 'short':
        targetWordCount = Math.max(Math.floor(wordCount * 0.1), 50);
        break;
      case 'medium':
        targetWordCount = Math.max(Math.floor(wordCount * 0.25), 100);
        break;
      case 'long':
        targetWordCount = Math.max(Math.floor(wordCount * 0.4), 200);
        break;
    }

    const summary = `[Ceci est un résumé simulé du texte fourni. Dans une implémentation réelle, nous utiliserions un LLM pour générer un résumé d'environ ${targetWordCount} mots en ${language}.]`;
    
    return {
      originalLength: wordCount,
      summaryLength: targetWordCount,
      summary,
      language
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
    
    // Detect source language if not provided
    const detectedSourceLanguage = sourceLanguage || this.detectLanguage(text);
    
    // In a real implementation, this would call a translation API
    // Here, we'll simulate a response
    const translatedText = `[Ceci est une traduction simulée de ${detectedSourceLanguage} vers ${targetLanguage}. Dans une implémentation réelle, nous utiliserions une API de traduction.]`;
    
    return {
      originalLanguage: detectedSourceLanguage,
      targetLanguage,
      translatedText,
      originalLength: text.split(/\s+/).length
    };
  }

  /**
   * Rewrites text in the specified style
   */
  private async rewriteText(text: string, style: TextStyle = 'casual', language: string): Promise<any> {
    if (!text || text.trim().length === 0) {
      throw new Error('Texte source requis');
    }
    
    // In a real implementation, this would call an LLM API
    // Here, we'll simulate a response
    const rewrittenText = `[Ceci est une réécriture simulée dans un style ${style} en ${language}. Dans une implémentation réelle, nous utiliserions un LLM pour reformuler le texte tout en préservant le sens original.]`;
    
    return {
      originalText: text,
      rewrittenText,
      style,
      language
    };
  }

  /**
   * Generates content based on a prompt
   */
  private async generateContent(prompt: string, style: TextStyle = 'casual', length: TextLength = 'medium', language: string): Promise<any> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt requis');
    }
    
    let targetWordCount;
    switch (length) {
      case 'short':
        targetWordCount = 150;
        break;
      case 'medium':
        targetWordCount = 350;
        break;
      case 'long':
        targetWordCount = 600;
        break;
    }
    
    // In a real implementation, this would call an LLM API
    // Here, we'll simulate a response
    const generatedContent = `[Ceci est un contenu généré simulé à partir du prompt "${prompt}" dans un style ${style} et une longueur ${length} (environ ${targetWordCount} mots) en ${language}. Dans une implémentation réelle, nous utiliserions un LLM pour générer du contenu original.]`;
    
    return {
      prompt,
      generatedContent,
      style,
      length,
      targetWordCount,
      language
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
    
    // In a real implementation, this would call an LLM API
    // Here, we'll simulate a response
    const draftedEmail = `
Objet: ${subject}

Cher/Chère ${recipient},

[Ceci est un email simulé écrit dans un style ${style} en ${language}, intégrant les ${points.length} points clés fournis. Dans une implémentation réelle, nous utiliserions un LLM pour générer un email professionnel et cohérent.]

Cordialement,
[Votre nom]
    `;
    
    return {
      subject,
      recipient,
      email: draftedEmail.trim(),
      style,
      pointsIncluded: points.length,
      language
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
    
    // In a real implementation, this would call an LLM API
    // Here, we'll simulate a response
    const draftedMessage = `[Ceci est un message simulé écrit dans un style ${style} en ${language}, basé sur le contexte fourni et intégrant les ${points.length} points clés. Dans une implémentation réelle, nous utiliserions un LLM pour générer un message adapté au contexte.]`;
    
    return {
      context,
      message: draftedMessage,
      style,
      pointsIncluded: points.length,
      language
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
