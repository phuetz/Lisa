/**
 * TranslatorTool: Traduction de texte multi-langues
 * Utilise l'API gratuite LibreTranslate ou MyMemory
 */

interface ExecuteProps {
  text: string;
  from?: string; // Code langue source (auto-detect si absent)
  to: string;    // Code langue cible
}

interface ExecuteResult {
  success: boolean;
  output?: TranslationResult | null;
  error?: string | null;
}

interface TranslationResult {
  originalText: string;
  translatedText: string;
  from: string;
  to: string;
  detectedLanguage?: string;
}

// Language codes mapping
const LANGUAGES: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
  hi: 'हिन्दी',
  tr: 'Türkçe',
  pl: 'Polski',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  sv: 'Svenska',
  da: 'Dansk',
  fi: 'Suomi',
  no: 'Norsk',
  cs: 'Čeština',
  el: 'Ελληνικά',
  he: 'עברית',
  uk: 'Українська',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  ro: 'Română',
  hu: 'Magyar',
  auto: 'Auto-detect',
};

// Normalize language code
function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  
  // Direct match
  if (LANGUAGES[normalized]) return normalized;
  
  // Common aliases
  const aliases: Record<string, string> = {
    french: 'fr',
    français: 'fr',
    francais: 'fr',
    english: 'en',
    anglais: 'en',
    spanish: 'es',
    espagnol: 'es',
    german: 'de',
    allemand: 'de',
    italian: 'it',
    italien: 'it',
    portuguese: 'pt',
    portugais: 'pt',
    russian: 'ru',
    russe: 'ru',
    chinese: 'zh',
    chinois: 'zh',
    japanese: 'ja',
    japonais: 'ja',
    korean: 'ko',
    coréen: 'ko',
    arabic: 'ar',
    arabe: 'ar',
  };
  
  return aliases[normalized] || normalized;
}

export class TranslatorTool {
  name = 'TranslatorTool';
  description = 'Traduire du texte entre différentes langues.';

  private async translateWithMyMemory(
    text: string,
    from: string,
    to: string
  ): Promise<TranslationResult> {
    const langPair = `${from}|${to}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur API traduction: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.responseStatus !== 200) {
      throw new Error(data.responseDetails || 'Erreur de traduction');
    }
    
    return {
      originalText: text,
      translatedText: data.responseData.translatedText,
      from,
      to,
      detectedLanguage: data.responseData.detectedLanguage,
    };
  }

  async execute({ text, from = 'auto', to }: ExecuteProps): Promise<ExecuteResult> {
    if (!text || typeof text !== 'string') {
      return { success: false, error: 'Un texte à traduire est requis.', output: null };
    }

    if (!to) {
      return { success: false, error: 'Une langue cible est requise.', output: null };
    }

    try {
      const sourceLang = normalizeLanguage(from);
      const targetLang = normalizeLanguage(to);

      // Use 'auto' for source if not specified
      const fromLang = sourceLang === 'auto' ? 'autodetect' : sourceLang;

      const result = await this.translateWithMyMemory(text, fromLang, targetLang);

      return { success: true, output: result };
    } catch (error) {
      console.error('TranslatorTool execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de traduction',
        output: null,
      };
    }
  }

  formatResponse(data: TranslationResult): string {
    const fromName = LANGUAGES[data.from] || data.from;
    const toName = LANGUAGES[data.to] || data.to;
    
    let response = `🌐 **Traduction** (${fromName} → ${toName})\n\n`;
    response += `📝 **Original:**\n${data.originalText}\n\n`;
    response += `✨ **Traduction:**\n${data.translatedText}`;
    
    if (data.detectedLanguage && data.from === 'autodetect') {
      response += `\n\n🔍 Langue détectée: ${LANGUAGES[data.detectedLanguage] || data.detectedLanguage}`;
    }
    
    return response;
  }

  // List available languages
  getLanguages(): Record<string, string> {
    return LANGUAGES;
  }
}

export const translatorTool = new TranslatorTool();
