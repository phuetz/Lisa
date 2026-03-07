/**
 * Memory Context Builder
 *
 * Queries the knowledge graph for relevant memories and formats them
 * for injection into the LLM system prompt. This enables the AI to
 * automatically recall stored facts about the user and context.
 *
 * Singleton pattern, browser-only (no Node.js APIs).
 */

import { getKnowledgeGraph, type Triple } from './KnowledgeGraphService';

// ============================================================================
// Constants
// ============================================================================

/** Default maximum number of facts to inject */
const DEFAULT_MAX_FACTS = 10;

/** Subjects that are always included when found */
const ALWAYS_INCLUDE_SUBJECTS = ['User', 'Utilisateur'];

/** Common French stop words to exclude from keyword extraction */
const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
  'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui', 'quoi',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
  'mon', 'ton', 'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses',
  'ce', 'cet', 'cette', 'ces', 'est', 'sont', 'suis', 'es',
  'a', 'ai', 'as', 'ont', 'en', 'y', 'ne', 'pas', 'plus',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'can', 'could', 'should', 'may', 'might', 'to', 'of', 'in',
  'for', 'on', 'with', 'at', 'by', 'from', 'it', 'this', 'that',
  'me', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'se', 'si', 'sur', 'dans', 'par', 'pour', 'avec', 'sans',
  'quel', 'quelle', 'quels', 'quelles', 'comment', 'pourquoi',
  'quand', 'combien', 'c\'est', 'c est', 'qu\'est',
]);

// ============================================================================
// Memory Context Builder
// ============================================================================

export class MemoryContextBuilder {
  private static instance: MemoryContextBuilder | null = null;

  static getInstance(): MemoryContextBuilder {
    if (!MemoryContextBuilder.instance) {
      MemoryContextBuilder.instance = new MemoryContextBuilder();
    }
    return MemoryContextBuilder.instance;
  }

  static resetInstance(): void {
    MemoryContextBuilder.instance = null;
  }

  /**
   * Search the knowledge graph for facts relevant to the user message.
   * Returns a formatted context block for the system prompt, or null
   * if no relevant memories are found.
   */
  getRelevantContext(userMessage: string, maxFacts: number = DEFAULT_MAX_FACTS): string | null {
    const kg = getKnowledgeGraph();
    const stats = kg.stats();

    // Nothing in the graph
    if (stats.tripleCount === 0) {
      return null;
    }

    const collectedTriples = new Map<string, Triple>();

    // 1. Always include User/Utilisateur facts
    for (const subject of ALWAYS_INCLUDE_SUBJECTS) {
      const userFacts = kg.query({ subject });
      for (const triple of userFacts) {
        const key = `${triple.subject}|${triple.predicate}|${triple.object}`;
        collectedTriples.set(key, triple);
      }
    }

    // 2. Extract keywords from the user message
    const keywords = this.extractKeywords(userMessage);

    // 3. Search for each keyword
    for (const keyword of keywords) {
      if (collectedTriples.size >= maxFacts) break;

      const results = kg.search(keyword);
      for (const triple of results) {
        const key = `${triple.subject}|${triple.predicate}|${triple.object}`;
        if (!collectedTriples.has(key)) {
          collectedTriples.set(key, triple);
        }
        if (collectedTriples.size >= maxFacts) break;
      }
    }

    // 4. Also try query by subject for capitalized words (entity names)
    const entities = this.extractEntities(userMessage);
    for (const entity of entities) {
      if (collectedTriples.size >= maxFacts) break;

      const asSubject = kg.query({ subject: entity });
      for (const triple of asSubject) {
        const key = `${triple.subject}|${triple.predicate}|${triple.object}`;
        if (!collectedTriples.has(key)) {
          collectedTriples.set(key, triple);
        }
        if (collectedTriples.size >= maxFacts) break;
      }

      const asObject = kg.query({ object: entity });
      for (const triple of asObject) {
        const key = `${triple.subject}|${triple.predicate}|${triple.object}`;
        if (!collectedTriples.has(key)) {
          collectedTriples.set(key, triple);
        }
        if (collectedTriples.size >= maxFacts) break;
      }
    }

    // Nothing relevant found
    if (collectedTriples.size === 0) {
      return null;
    }

    // Limit to maxFacts
    const facts = Array.from(collectedTriples.values()).slice(0, maxFacts);

    return this.formatMemoryBlock(facts);
  }

  /**
   * Format an array of triples as a readable context block for the system prompt.
   */
  formatMemoryBlock(facts: Triple[]): string {
    if (facts.length === 0) {
      return '';
    }

    const lines = facts.map(t => `- ${t.subject} ${this.humanizePredicate(t.predicate)} ${t.object}`);

    return `<memory_context>
Informations m\u00e9moris\u00e9es :
${lines.join('\n')}
</memory_context>`;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Extract meaningful keywords from a user message.
   * Filters out stop words and very short tokens.
   */
  private extractKeywords(message: string): string[] {
    const normalized = message
      .toLowerCase()
      .replace(/['']/g, "'")
      .replace(/[^\w\s'-]/g, ' ');

    const words = normalized.split(/\s+/).filter(w => w.length > 2);

    const keywords = words.filter(w => !STOP_WORDS.has(w));

    // Deduplicate while preserving order
    return Array.from(new Set(keywords));
  }

  /**
   * Extract potential entity names from a message.
   * Looks for capitalized words that might be names or proper nouns.
   */
  private extractEntities(message: string): string[] {
    // Match capitalized words (not at start of sentence ideally, but good enough)
    const matches = message.match(/\b[A-Z\u00C0-\u00DC][a-z\u00E0-\u00FC]{2,}/g) || [];
    return Array.from(new Set(matches));
  }

  /**
   * Convert a predicate to a more human-readable French form.
   */
  private humanizePredicate(predicate: string): string {
    const map: Record<string, string> = {
      'isA': 'est',
      'hasProperty': 'a comme propri\u00e9t\u00e9',
      'likes': 'aime',
      'knows': 'conna\u00eet',
      'uses': 'utilise',
      'dependsOn': 'd\u00e9pend de',
      'relatedTo': 'est li\u00e9 \u00e0',
      'contains': 'contient',
      'partOf': 'fait partie de',
      'createdBy': 'cr\u00e9\u00e9 par',
      'remembers': 'se souvient de',
      'mentionedIn': 'mentionn\u00e9 dans',
      'imports': 'importe',
      'exports': 'exporte',
      'calls': 'appelle',
      'extends': '\u00e9tend',
      'implements': 'impl\u00e9mente',
      'definedIn': 'd\u00e9fini dans',
      'usedBy': 'utilis\u00e9 par',
      'typeof': 'est de type',
      'livesIn': 'habite \u00e0',
      'worksAt': 'travaille chez',
      'hasAge': 'a pour \u00e2ge',
      'prefersLanguage': 'pr\u00e9f\u00e8re le langage',
    };

    return map[predicate] || predicate;
  }
}

// ============================================================================
// Singleton Accessor
// ============================================================================

export function getMemoryContextBuilder(): MemoryContextBuilder {
  return MemoryContextBuilder.getInstance();
}
