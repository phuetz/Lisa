/**
 * SmallTalk utility functions
 * Provides small talk detection and response generation
 */

export interface SmallTalkOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

const SMALL_TALK_PATTERNS = [
  /how are you/i,
  /what.*your name/i,
  /who are you/i,
  /\bhello\b/i,
  /\bhi\b/i,
  /thank(s| you)/i,
  /good (morning|afternoon|evening|night)/i,
  /tell me a joke/i,
  /i('m| am) (sad|happy|tired|bored)/i,
];

/**
 * Determines if text is small talk
 */
export function isSmallTalk(text: string): boolean {
  return SMALL_TALK_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Process small talk and generate response
 */
export async function processSmallTalk(text: string, _options: SmallTalkOptions = {}): Promise<string> {
  if (!text || text.trim().length === 0) {
    throw new Error('No text provided');
  }

  const lowerText = text.toLowerCase();

  if (/hello|hi|hey|greetings|howdy|bonjour|hola|salut/i.test(lowerText)) {
    return 'Hello! How can I help you today?';
  }

  if (/how are you/i.test(lowerText)) {
    return "I'm doing great, thanks for asking!";
  }

  if (/tell me a joke/i.test(lowerText)) {
    return "Why don't scientists trust atoms? Because they make up everything!";
  }

  if (/what.*your name/i.test(lowerText) || /who are you/i.test(lowerText)) {
    return "I'm Lisa, your AI assistant. How can I help?";
  }

  if (/thank(s| you)/i.test(lowerText)) {
    return "You're welcome! Happy to help.";
  }

  if (/i('m| am) (sad|happy|tired|bored)/i.test(lowerText)) {
    if (lowerText.includes('happy')) {
      return "That's great! I'm glad you're in a good mood.";
    } else if (lowerText.includes('sad')) {
      return "I'm sorry to hear that. Is there anything I can do to help?";
    } else {
      return "Take a break and rest when you can. I'm here if you need anything.";
    }
  }

  return "I'm here to chat!";
}
