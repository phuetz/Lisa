/**
 * @file Core logic for handling small talk conversations.
 * This module is framework-agnostic and can be used in any JavaScript/TypeScript environment.
 */

const DEFAULT_LLM_API = 'https://api.openai.com/v1/chat/completions';

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
    
    let responses = isFrench ? defaultResponses.fr : isSpanish ? defaultResponses.es : defaultResponses.en;
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
export async function processSmallTalk(text: string, options: SmallTalkOptions, conversationHistory: any[] = [], language = 'en'): Promise<string> {
  const { apiKey, apiEndpoint = DEFAULT_LLM_API, model = 'gpt-3.5-turbo', maxTokens = 100, temperature = 0.7 } = options;

  if (!apiKey) {
    console.warn('No LLM API key provided for small talk');
    return getDefaultResponse(text, language);
  }

  try {
    const payload = {
      model,
      messages: [
        {
          role: 'system',
          content: `You are Lisa, a friendly virtual assistant. Keep responses brief (1-2 sentences max) and conversational. Current language: ${language}`
        },
        ...conversationHistory.map((msg: {role: string, content: string}) => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: text }
      ],
      max_tokens: maxTokens,
      temperature: temperature,
    };

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
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
