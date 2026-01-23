/**
 * @file Core logic for handling small talk conversations.
 * This module is framework-agnostic and can be used in any JavaScript/TypeScript environment.
 */

import { secureAI } from '../services/SecureAIService';
import { resilientExecutor } from '../utils/resilience/ResilientExecutor';

export interface SmallTalkOptions {
  apiKey?: string;
  apiEndpoint?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

/**
 * Get a basic default response if API is not available
 */
function getDefaultResponse(_text: string, language: string): string {
    const isFrench = language.startsWith('fr');
    const isSpanish = language.startsWith('es');
    
    const defaultResponses = {
      en: [
        "I'm sorry, I'm having trouble connecting to my knowledge base right now.",
        "I'd love to chat more, but my language abilities are limited at the moment.",
      ],
      fr: [
        "Je suis désolée, j'ai du mal à me connecter à ma base de connaissances pour le moment.",
        "J'aimerais discuter davantage, mais mes capacités linguistiques sont limitées actuellement.",
      ],
      es: [
        "Lo siento, estoy teniendo problemas para conectarme a mi base de conocimientos en este momento.",
        "Me encantaría charlar más, pero mis habilidades lingüísticas son limitadas actualmente.",
      ]
    };
    
    const responses = isFrench ? defaultResponses.fr : isSpanish ? defaultResponses.es : defaultResponses.en;
    return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Processes a small talk query using an LLM API.
 * @param text The user's input text.
 * @param options Configuration for the API call.
 * @param conversationHistory The history of the conversation for context.
 * @param language The current language for the response.
 * @returns A promise that resolves to the AI's response.
 */
export async function processSmallTalk(text: string, options: SmallTalkOptions, conversationHistory: Array<{role: string; content: string}> = [], language = 'en'): Promise<string> {
  const { model = 'gpt-4o-mini' } = options;
  // Note: maxTokens sera supporté dans une future version du proxy

  try {
    const messages = [
      {
        role: 'system' as const,
        content: `You are Lisa, a friendly virtual assistant. Keep responses brief (1-2 sentences max) and conversational. Current language: ${language}`
      },
      ...conversationHistory.map((msg: {role: string, content: string}) => ({ 
        role: msg.role as 'system' | 'user' | 'assistant', 
        content: msg.content 
      })),
      { role: 'user' as const, content: text }
    ];

    // Utiliser le proxy sécurisé avec résilience
    const response = await resilientExecutor.executeWithRetry(
      () => secureAI.callOpenAI(messages, model),
      {
        maxRetries: 2,
        circuitBreakerKey: 'SmallTalkAgent',
        onRetry: (attempt, max) => {
          console.log(`[SmallTalk] Retry ${attempt}/${max}`);
        }
      }
    );

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error processing small talk:', error);
    return getDefaultResponse(text, language);
  }
}

/**
 * Detect if an utterance is small talk rather than a command
 */
export function isSmallTalk(text: string): boolean {
  const lowerText = text.toLowerCase();
  const commandKeywords = ['weather', 'alarm', 'todo', 'list', 'remind', 'calendar', 'cancel'];
  if (commandKeywords.some(keyword => lowerText.includes(keyword))) {
    return false;
  }

  const smallTalkPatterns = [
    /how are you/i, /what.*your name/i, /who are you/i, /hello/i, /hi/i, 
    /thank(s| you)/i, /good (morning|afternoon|evening|night)/i,
    /tell me a joke/i, /i('m| am) (sad|happy|tired|bored)/i,
    // Add more patterns for other languages as needed
  ];

  return smallTalkPatterns.some(pattern => pattern.test(lowerText));
}
