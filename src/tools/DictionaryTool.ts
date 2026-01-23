/**
 * DictionaryTool: Définitions, synonymes et étymologie
 * Utilise l'API gratuite Free Dictionary
 */

interface ExecuteProps {
  word: string;
  language?: string; // fr, en, es, de, it, etc.
}

interface ExecuteResult {
  success: boolean;
  output?: DictionaryResult | null;
  error?: string | null;
}

interface Definition {
  partOfSpeech: string;
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

interface DictionaryResult {
  word: string;
  phonetic?: string;
  audio?: string;
  origin?: string;
  definitions: Definition[];
  sourceUrl?: string;
}

interface ApiMeaning {
  partOfSpeech: string;
  definitions: Array<{
    definition: string;
    example?: string;
    synonyms?: string[];
    antonyms?: string[];
  }>;
  synonyms?: string[];
  antonyms?: string[];
}

interface ApiResponse {
  word: string;
  phonetic?: string;
  phonetics?: Array<{
    text?: string;
    audio?: string;
  }>;
  origin?: string;
  meanings: ApiMeaning[];
  sourceUrls?: string[];
}

export class DictionaryTool {
  name = 'DictionaryTool';
  description = 'Obtenir la définition, les synonymes et l\'étymologie d\'un mot.';

  private async fetchDefinition(word: string, language: string): Promise<DictionaryResult> {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/${language}/${encodeURIComponent(word)}`;
    
    const response = await fetch(url);
    
    if (response.status === 404) {
      throw new Error(`Mot "${word}" non trouvé dans le dictionnaire.`);
    }
    
    if (!response.ok) {
      throw new Error(`Erreur API dictionnaire: ${response.status}`);
    }
    
    const data: ApiResponse[] = await response.json();
    const entry = data[0];
    
    // Extract phonetic with audio
    let phonetic = entry.phonetic;
    let audio: string | undefined;
    
    if (entry.phonetics && entry.phonetics.length > 0) {
      for (const p of entry.phonetics) {
        if (p.audio) {
          audio = p.audio;
          if (p.text) phonetic = p.text;
          break;
        }
        if (!phonetic && p.text) phonetic = p.text;
      }
    }
    
    // Extract definitions
    const definitions: Definition[] = [];
    
    for (const meaning of entry.meanings) {
      for (const def of meaning.definitions) {
        definitions.push({
          partOfSpeech: meaning.partOfSpeech,
          definition: def.definition,
          example: def.example,
          synonyms: [...(def.synonyms || []), ...(meaning.synonyms || [])].slice(0, 5),
          antonyms: [...(def.antonyms || []), ...(meaning.antonyms || [])].slice(0, 5),
        });
      }
    }
    
    return {
      word: entry.word,
      phonetic,
      audio,
      origin: entry.origin,
      definitions,
      sourceUrl: entry.sourceUrls?.[0],
    };
  }

  async execute({ word, language = 'en' }: ExecuteProps): Promise<ExecuteResult> {
    if (!word || typeof word !== 'string') {
      return { success: false, error: 'Un mot est requis.', output: null };
    }

    const cleanWord = word.trim().toLowerCase();
    
    if (cleanWord.includes(' ')) {
      return { success: false, error: 'Veuillez entrer un seul mot.', output: null };
    }

    try {
      // Normalize language code
      const lang = language.toLowerCase().slice(0, 2);
      const supportedLanguages = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'ar', 'hi', 'ja', 'ko', 'tr'];
      
      if (!supportedLanguages.includes(lang)) {
        return { 
          success: false, 
          error: `Langue "${language}" non supportée. Langues disponibles: ${supportedLanguages.join(', ')}`, 
          output: null 
        };
      }

      const result = await this.fetchDefinition(cleanWord, lang);
      return { success: true, output: result };
    } catch (error) {
      console.error('DictionaryTool execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        output: null,
      };
    }
  }

  formatResponse(data: DictionaryResult): string {
    let response = `📖 **${data.word}**`;
    
    if (data.phonetic) {
      response += ` ${data.phonetic}`;
    }
    
    if (data.audio) {
      response += ` 🔊`;
    }
    
    response += '\n\n';
    
    // Group by part of speech
    const byPartOfSpeech = new Map<string, Definition[]>();
    for (const def of data.definitions) {
      const existing = byPartOfSpeech.get(def.partOfSpeech) || [];
      existing.push(def);
      byPartOfSpeech.set(def.partOfSpeech, existing);
    }
    
    for (const [pos, defs] of byPartOfSpeech) {
      response += `**${pos}**\n`;
      
      for (let i = 0; i < Math.min(defs.length, 3); i++) {
        const def = defs[i];
        response += `${i + 1}. ${def.definition}\n`;
        
        if (def.example) {
          response += `   _"${def.example}"_\n`;
        }
        
        if (def.synonyms.length > 0) {
          response += `   🔄 Synonymes: ${def.synonyms.join(', ')}\n`;
        }
      }
      
      response += '\n';
    }
    
    if (data.origin) {
      response += `📜 **Origine:** ${data.origin}\n`;
    }
    
    return response.trim();
  }
}

export const dictionaryTool = new DictionaryTool();
