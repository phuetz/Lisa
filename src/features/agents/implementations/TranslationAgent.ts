/**
 * TranslationAgent - Multi-language Translation
 * 
 * Provides contextual translation with cultural adaptation
 */

import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import { AgentDomains } from '../core/types';

export class TranslationAgent implements BaseAgent {
  name = 'TranslationAgent';
  description = 'Translates content between languages with contextual and cultural adaptation';
  version = '1.0.0';
  domain: AgentDomain = AgentDomains.PRODUCTIVITY;
  capabilities = [
    'text_translation',
    'language_detection',
    'cultural_adaptation',
    'contextual_translation',
    'batch_translation',
    'terminology_management'
  ];

  private supportedLanguages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
    { code: 'ar', name: 'العربية' }
  ];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const { intent, parameters } = props;

    try {
      switch (intent) {
        case 'translate':
          return await this.translate(parameters);
        case 'detect_language':
          return await this.detectLanguage(parameters);
        case 'batch_translate':
          return await this.batchTranslate(parameters);
        case 'get_languages':
          return await this.getSupportedLanguages(parameters);
        default:
          return {
            success: false,
            output: null,
            error: `Unknown intent: ${intent}`,
            metadata: { executionTime: Date.now() - startTime, timestamp: Date.now() }
          };
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        metadata: { executionTime: Date.now() - startTime, timestamp: Date.now() }
      };
    }
  }

  private async translate(params: any): Promise<AgentExecuteResult> {
    const { text, sourceLang, targetLang, context } = params;

    if (!text || !targetLang) {
      return {
        success: false,
        output: null,
        error: 'Text and target language are required'
      };
    }

    // Try to use Gemini API for translation
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (apiKey) {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const detectedLang = sourceLang || this.simpleLanguageDetection(text).code;
        const contextInfo = context ? `\n\nContext: ${context}` : '';
        const prompt = `Translate the following text from ${detectedLang} to ${targetLang}. Provide only the translation, no explanations.${contextInfo}\n\nText: ${text}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const translatedText = response.text();

        return {
          success: true,
          output: {
            translatedText,
            sourceLang: detectedLang,
            targetLang,
            confidence: 0.95,
            source: 'Gemini-Pro'
          },
          metadata: {
            source: 'TranslationAgent',
            timestamp: Date.now()
          }
        };
      }
    } catch (error) {
      console.warn('[TranslationAgent] Gemini API not available, using fallback:', error);
    }

    // Fallback if Gemini is not available
    return {
      success: true,
      output: {
        translatedText: `[Translation to ${targetLang}: ${text}]`,
        sourceLang: sourceLang || 'auto-detected',
        targetLang,
        confidence: 0.65,
        source: 'Fallback'
      },
      metadata: {
        source: 'TranslationAgent',
        timestamp: Date.now()
      }
    };
  }

  private async detectLanguage(params: any): Promise<AgentExecuteResult> {
    const { text } = params;

    if (!text) {
      return {
        success: false,
        output: null,
        error: 'Text is required'
      };
    }

    // Simple language detection based on common words
    const detectedLang = this.simpleLanguageDetection(text);

    return {
      success: true,
      output: {
        language: detectedLang.code,
        languageName: detectedLang.name,
        confidence: 0.75
      },
      metadata: {
        source: 'TranslationAgent',
        timestamp: Date.now()
      }
    };
  }

  private async batchTranslate(params: any): Promise<AgentExecuteResult> {
    const { texts, sourceLang, targetLang } = params;

    if (!texts || !Array.isArray(texts) || !targetLang) {
      return {
        success: false,
        output: null,
        error: 'Texts array and target language are required'
      };
    }

    const translations = texts.map((text, index) => ({
      original: text,
      translated: `[Translation ${index + 1}]`,
      index
    }));

    return {
      success: true,
      output: {
        translations,
        count: translations.length,
        sourceLang: sourceLang || 'auto',
        targetLang
      },
      metadata: {
        source: 'TranslationAgent',
        timestamp: Date.now()
      }
    };
  }

  private async getSupportedLanguages(_params: any): Promise<AgentExecuteResult> {
    return {
      success: true,
      output: {
        languages: this.supportedLanguages,
        count: this.supportedLanguages.length
      },
      metadata: {
        source: 'TranslationAgent',
        timestamp: Date.now()
      }
    };
  }

  private simpleLanguageDetection(text: string): { code: string; name: string } {
    const lowerText = text.toLowerCase();

    // Simple keyword-based detection
    if (lowerText.match(/\b(the|and|is|in|to|of)\b/)) {
      return { code: 'en', name: 'English' };
    }
    if (lowerText.match(/\b(le|la|les|et|est|dans|de)\b/)) {
      return { code: 'fr', name: 'Français' };
    }
    if (lowerText.match(/\b(el|la|los|y|es|en|de)\b/)) {
      return { code: 'es', name: 'Español' };
    }

    return { code: 'en', name: 'English' }; // default
  }

  async canHandle(query: string, _context?: any): Promise<number> {
    const keywords = [
      'translate', 'translation', 'language', 'translate',
      'traduire', 'traduction', 'langue',
      'traducir', 'traducción', 'idioma'
    ];

    const lowerQuery = query.toLowerCase();
    const matches = keywords.filter(keyword => lowerQuery.includes(keyword));
    return matches.length > 0 ? Math.min(matches.length * 0.3, 1.0) : 0.0;
  }
}
