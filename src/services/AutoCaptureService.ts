/**
 * Auto-Capture Service -- Automatic Fact Extraction from Conversations
 *
 * Inspired by Code Buddy's `src/memory/auto-capture.ts`.
 * Analyzes conversation messages (user + assistant) for important information,
 * extracts facts via bilingual regex patterns (FR/EN), and stores them
 * as triples in the KnowledgeGraph.
 *
 * Features:
 *   - Pattern-based extraction across 5 categories
 *   - Bilingual detection (French + English)
 *   - Deduplication against existing graph triples
 *   - Confidence scoring per extracted fact
 *   - Singleton pattern (browser-compatible, no Node.js APIs)
 */

import { getKnowledgeGraph } from './KnowledgeGraphService';

// ============================================================================
// Types
// ============================================================================

export type FactCategory =
  | 'personal'
  | 'preference'
  | 'project'
  | 'decision'
  | 'instruction';

export interface CapturedFact {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  source: 'user_message' | 'assistant_response';
  category: FactCategory;
}

export interface CaptureStats {
  totalCaptured: number;
  totalStored: number;
  duplicatesSkipped: number;
}

interface CapturePattern {
  /** Regex to match. First capture group = the extracted value. */
  regex: RegExp;
  /** Subject to use (or 'User' / 'Project' etc.) */
  subject: string;
  /** Predicate for the triple */
  predicate: string;
  /** Category of the fact */
  category: FactCategory;
  /** Base confidence for this pattern (0-1) */
  confidence: number;
}

// ============================================================================
// Pattern Definitions (bilingual FR/EN)
// ============================================================================

const CAPTURE_PATTERNS: CapturePattern[] = [
  // ---------------------------------------------------------------------------
  // Personal info
  // ---------------------------------------------------------------------------
  {
    regex: /je m['\u2019']appelle\s+(.+)/i,
    subject: 'User',
    predicate: 'hasName',
    category: 'personal',
    confidence: 0.95,
  },
  {
    regex: /my name is\s+(.+)/i,
    subject: 'User',
    predicate: 'hasName',
    category: 'personal',
    confidence: 0.95,
  },
  {
    regex: /j['\u2019']ai\s+(\d+)\s*ans/i,
    subject: 'User',
    predicate: 'hasAge',
    category: 'personal',
    confidence: 0.9,
  },
  {
    regex: /I am\s+(\d+)\s*years?\s*old/i,
    subject: 'User',
    predicate: 'hasAge',
    category: 'personal',
    confidence: 0.9,
  },
  {
    regex: /j['\u2019']habite\s+(?:a|à)\s+(.+)/i,
    subject: 'User',
    predicate: 'livesIn',
    category: 'personal',
    confidence: 0.9,
  },
  {
    regex: /I live in\s+(.+)/i,
    subject: 'User',
    predicate: 'livesIn',
    category: 'personal',
    confidence: 0.9,
  },
  {
    regex: /je travaille chez\s+(.+)/i,
    subject: 'User',
    predicate: 'worksAt',
    category: 'personal',
    confidence: 0.9,
  },
  {
    regex: /I work at\s+(.+)/i,
    subject: 'User',
    predicate: 'worksAt',
    category: 'personal',
    confidence: 0.9,
  },

  // ---------------------------------------------------------------------------
  // Preferences
  // ---------------------------------------------------------------------------
  {
    regex: /je pr[ée]f[eè]re\s+(.+)/i,
    subject: 'User',
    predicate: 'prefers',
    category: 'preference',
    confidence: 0.85,
  },
  {
    regex: /I prefer\s+(.+)/i,
    subject: 'User',
    predicate: 'prefers',
    category: 'preference',
    confidence: 0.85,
  },
  {
    regex: /j['\u2019']aime\s+(.+)/i,
    subject: 'User',
    predicate: 'likes',
    category: 'preference',
    confidence: 0.8,
  },
  {
    regex: /I like\s+(.+)/i,
    subject: 'User',
    predicate: 'likes',
    category: 'preference',
    confidence: 0.8,
  },
  {
    regex: /je d[ée]teste\s+(.+)/i,
    subject: 'User',
    predicate: 'dislikes',
    category: 'preference',
    confidence: 0.85,
  },
  {
    regex: /I hate\s+(.+)/i,
    subject: 'User',
    predicate: 'dislikes',
    category: 'preference',
    confidence: 0.85,
  },
  {
    regex: /j['\u2019']utilise\s+(.+)/i,
    subject: 'User',
    predicate: 'uses',
    category: 'preference',
    confidence: 0.8,
  },
  {
    regex: /I use\s+(.+)/i,
    subject: 'User',
    predicate: 'uses',
    category: 'preference',
    confidence: 0.8,
  },

  // ---------------------------------------------------------------------------
  // Project info
  // ---------------------------------------------------------------------------
  {
    regex: /ce projet utilise\s+(.+)/i,
    subject: 'Project',
    predicate: 'uses',
    category: 'project',
    confidence: 0.85,
  },
  {
    regex: /this project uses\s+(.+)/i,
    subject: 'Project',
    predicate: 'uses',
    category: 'project',
    confidence: 0.85,
  },
  {
    regex: /le projet s['\u2019']appelle\s+(.+)/i,
    subject: 'Project',
    predicate: 'hasName',
    category: 'project',
    confidence: 0.9,
  },

  // ---------------------------------------------------------------------------
  // Decisions
  // ---------------------------------------------------------------------------
  {
    regex: /on a d[ée]cid[ée] de\s+(.+)/i,
    subject: 'Decision',
    predicate: 'isAbout',
    category: 'decision',
    confidence: 0.85,
  },
  {
    regex: /we decided to\s+(.+)/i,
    subject: 'Decision',
    predicate: 'isAbout',
    category: 'decision',
    confidence: 0.85,
  },
  {
    regex: /la solution est\s+(.+)/i,
    subject: 'Solution',
    predicate: 'isAbout',
    category: 'decision',
    confidence: 0.8,
  },

  // ---------------------------------------------------------------------------
  // Instructions
  // ---------------------------------------------------------------------------
  {
    regex: /toujours\s+(.+)/i,
    subject: 'Rule',
    predicate: 'states',
    category: 'instruction',
    confidence: 0.75,
  },
  {
    regex: /always\s+(.+)/i,
    subject: 'Rule',
    predicate: 'states',
    category: 'instruction',
    confidence: 0.75,
  },
  {
    regex: /jamais\s+(.+)/i,
    subject: 'Rule',
    predicate: 'states',
    category: 'instruction',
    confidence: 0.75,
  },
  {
    regex: /never\s+(.+)/i,
    subject: 'Rule',
    predicate: 'states',
    category: 'instruction',
    confidence: 0.75,
  },
  {
    regex: /n['\u2019']oublie pas\s+(.+)/i,
    subject: 'Reminder',
    predicate: 'states',
    category: 'instruction',
    confidence: 0.8,
  },
  {
    regex: /don['\u2019']t forget\s+(.+)/i,
    subject: 'Reminder',
    predicate: 'states',
    category: 'instruction',
    confidence: 0.8,
  },
];

// ============================================================================
// Auto-Capture Service (Singleton)
// ============================================================================

export class AutoCaptureService {
  private static instance: AutoCaptureService | null = null;

  private totalCaptured = 0;
  private totalStored = 0;
  private duplicatesSkipped = 0;

  static getInstance(): AutoCaptureService {
    if (!AutoCaptureService.instance) {
      AutoCaptureService.instance = new AutoCaptureService();
    }
    return AutoCaptureService.instance;
  }

  static resetInstance(): void {
    AutoCaptureService.instance = null;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Analyze a message and extract facts via pattern matching.
   * Does NOT store anything -- pure extraction.
   */
  analyzeMessage(content: string, role: 'user' | 'assistant'): CapturedFact[] {
    if (!content || typeof content !== 'string') return [];

    const trimmed = content.trim();
    if (trimmed.length === 0) return [];

    const source: CapturedFact['source'] =
      role === 'user' ? 'user_message' : 'assistant_response';

    const facts: CapturedFact[] = [];
    const seen = new Set<string>();

    for (const pattern of CAPTURE_PATTERNS) {
      const match = trimmed.match(pattern.regex);
      if (!match || !match[1]) continue;

      const extractedValue = this.cleanExtractedValue(match[1]);
      if (!extractedValue) continue;

      // Build the object value -- for "jamais"/"never" prefix with "never "
      let objectValue = extractedValue;
      if (/^jamais\s/i.test(trimmed) || /^never\s/i.test(trimmed)) {
        // The regex already captures the part after "jamais"/"never",
        // so prefix "never" for normalized storage
        if (pattern.predicate === 'states' && pattern.subject === 'Rule') {
          objectValue = `never ${extractedValue}`;
        }
      }

      // Dedup key within same message
      const key = `${pattern.subject}|${pattern.predicate}|${objectValue}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Confidence boost for user messages (more reliable than assistant)
      const confidence = role === 'user'
        ? Math.min(1, pattern.confidence + 0.05)
        : Math.max(0, pattern.confidence - 0.1);

      facts.push({
        subject: pattern.subject,
        predicate: pattern.predicate,
        object: objectValue,
        confidence,
        source,
        category: pattern.category,
      });
    }

    this.totalCaptured += facts.length;
    return facts;
  }

  /**
   * Process and store captured facts into the knowledge graph.
   * Skips duplicates. Returns count of facts actually stored.
   */
  async processAndStore(facts: CapturedFact[]): Promise<number> {
    if (!facts || facts.length === 0) return 0;

    const kg = getKnowledgeGraph();
    let stored = 0;

    for (const fact of facts) {
      if (this.isDuplicate(fact)) {
        this.duplicatesSkipped++;
        console.debug(
          `AutoCapture: skipped duplicate (${fact.subject}, ${fact.predicate}, ${fact.object})`,
        );
        continue;
      }

      kg.add(fact.subject, fact.predicate, fact.object, {
        source: fact.source,
        category: fact.category,
        confidence: String(fact.confidence),
        capturedAt: new Date().toISOString(),
      });
      stored++;
    }

    if (stored > 0) {
      kg.persist();
      console.debug(`AutoCapture: stored ${stored} new fact(s)`);
    }

    this.totalStored += stored;
    return stored;
  }

  /**
   * Full pipeline: analyze a message, then store extracted facts.
   * Returns count of facts stored.
   */
  async captureFromMessage(
    content: string,
    role: 'user' | 'assistant',
  ): Promise<number> {
    const facts = this.analyzeMessage(content, role);
    if (facts.length === 0) return 0;
    return this.processAndStore(facts);
  }

  /**
   * Check if a fact already exists in the knowledge graph (deduplication).
   * Uses exact triple match and also checks for semantic near-duplicates
   * by normalizing and comparing objects for the same subject+predicate.
   */
  isDuplicate(fact: CapturedFact): boolean {
    const kg = getKnowledgeGraph();

    // 1. Exact match
    if (kg.has(fact.subject, fact.predicate, fact.object)) {
      return true;
    }

    // 2. Normalized match -- case-insensitive comparison on existing triples
    //    with the same subject + predicate
    const existing = kg.query({
      subject: fact.subject,
      predicate: fact.predicate,
    });

    const normalizedNew = this.normalize(fact.object);
    for (const triple of existing) {
      const normalizedExisting = this.normalize(triple.object);
      if (normalizedNew === normalizedExisting) {
        return true;
      }
      // Jaccard similarity for near-duplicates
      if (this.jaccardSimilarity(normalizedNew, normalizedExisting) >= 0.85) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get capture statistics.
   */
  getStats(): CaptureStats {
    return {
      totalCaptured: this.totalCaptured,
      totalStored: this.totalStored,
      duplicatesSkipped: this.duplicatesSkipped,
    };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Clean an extracted regex capture group value.
   * Trims whitespace, removes trailing punctuation, limits length.
   */
  private cleanExtractedValue(raw: string): string {
    let cleaned = raw.trim();
    // Remove trailing sentence punctuation
    cleaned = cleaned.replace(/[.!?;,]+$/, '').trim();
    // Limit to a reasonable length (avoid capturing entire paragraphs)
    if (cleaned.length > 200) {
      cleaned = cleaned.substring(0, 200);
    }
    // Must have at least 1 char
    if (cleaned.length === 0) return '';
    return cleaned;
  }

  /**
   * Normalize a string for comparison: lowercase, collapse whitespace, trim.
   */
  private normalize(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /**
   * Jaccard similarity between two strings (word-level).
   */
  private jaccardSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.split(/\s+/).filter(Boolean));
    const wordsB = new Set(b.split(/\s+/).filter(Boolean));

    if (wordsA.size === 0 && wordsB.size === 0) return 1;
    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersectionSize = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) intersectionSize++;
    }

    const unionSize = new Set([...wordsA, ...wordsB]).size;
    return intersectionSize / unionSize;
  }
}

// ============================================================================
// Convenience accessor
// ============================================================================

export function getAutoCaptureService(): AutoCaptureService {
  return AutoCaptureService.getInstance();
}
