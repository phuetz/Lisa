/**
 * Restorable Compression — Manus AI context engineering pattern
 *
 * Instead of lossy summarisation (which discards content permanently),
 * this module extracts structural identifiers (file paths, URLs, tool
 * call IDs) from context entries that are about to be compressed, then
 * stores the original content indexed by those identifiers.
 *
 * The agent can later restore the full content on demand, making context
 * compression reversible.
 *
 * Adapted from Code Buddy's restorable-compression.ts for Lisa's
 * browser-compatible architecture (no fs/path dependencies).
 *
 * Ref: "Context Engineering for AI Agents: Lessons from Building Manus"
 */

// ============================================================================
// Types
// ============================================================================

export interface CompressibleEntry {
  id: string;
  content: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface CompressionResult {
  entries: CompressibleEntry[];
  identifiers: string[];
  tokensSaved: number;
}

export interface RestoreResult {
  found: boolean;
  content: string;
  identifier: string;
}

// ============================================================================
// Identifier extractors
// ============================================================================

const FILE_PATH_RE = /(?:^|\s|["'`(])(\/?(?:[\w.-]+\/)*[\w.-]+\.(?:tsx?|jsx?|py|json|md|txt|yaml|yml|sh|go|rs|java|cpp|c|h|rb|php|swift|kt|cs|html|css|sql|env|toml|xml|vue|svelte)(?::\d+(?:-\d+)?)?)/g;
const URL_RE = /https?:\/\/[^\s"'<>)]+/g;
const TOOL_CALL_ID_RE = /\b(call_[a-zA-Z0-9]+|toolu_[a-zA-Z0-9]+)\b/g;

function extractIdentifiers(text: string): string[] {
  const ids = new Set<string>();

  for (const m of text.matchAll(FILE_PATH_RE)) {
    const raw = m[1].trim().replace(/['"`:]/g, '');
    if (raw.length > 3) ids.add(raw);
  }

  for (const m of text.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:)]+$/, '');
    ids.add(url);
  }

  for (const m of text.matchAll(TOOL_CALL_ID_RE)) {
    ids.add(m[1]);
  }

  return [...ids];
}

// ============================================================================
// RestorableCompressor
// ============================================================================

export class RestorableCompressor {
  private store = new Map<string, string>();
  private static readonly MAX_STORE_ENTRIES = 500;

  /**
   * Compress entries that are about to be dropped from context.
   * Extracts identifiers and stores original content for later retrieval.
   */
  compress(entries: CompressibleEntry[]): CompressionResult {
    const compressed: CompressibleEntry[] = [];
    const allIdentifiers: string[] = [];
    let tokensSaved = 0;

    for (const entry of entries) {
      const content = entry.content ?? '';
      if (!content || content.length < 200) {
        compressed.push(entry);
        continue;
      }

      const ids = extractIdentifiers(content);

      if (ids.length === 0) {
        compressed.push(entry);
        continue;
      }

      // Store original content indexed by each identifier
      for (const id of ids) {
        if (!this.store.has(id)) {
          this.store.set(id, content);
        }
      }

      allIdentifiers.push(...ids);
      tokensSaved += Math.floor(content.length / 4);

      const stub = `[Content compressed — identifiers: ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? ` +${ids.length - 5} more` : ''}. Use restore_context(identifier) to retrieve.]`;

      compressed.push({ ...entry, content: stub });
    }

    // Auto-evict oldest entries if store grows too large
    if (this.store.size > RestorableCompressor.MAX_STORE_ENTRIES) {
      const keysToEvict = [...this.store.keys()].slice(
        0, Math.floor(RestorableCompressor.MAX_STORE_ENTRIES * 0.2)
      );
      for (const key of keysToEvict) {
        this.store.delete(key);
      }
    }

    return {
      entries: compressed,
      identifiers: [...new Set(allIdentifiers)],
      tokensSaved,
    };
  }

  /**
   * Restore the original content for an identifier.
   */
  restore(identifier: string): RestoreResult {
    const stored = this.store.get(identifier);
    if (stored) {
      return { found: true, content: stored, identifier };
    }

    if (identifier.startsWith('http')) {
      return {
        found: false,
        content: `URL content not cached. Fetch "${identifier}" to retrieve it.`,
        identifier,
      };
    }

    return {
      found: false,
      content: `Identifier "${identifier}" not found in restoration store.`,
      identifier,
    };
  }

  /**
   * Manually store content with an identifier.
   */
  storeContent(identifier: string, content: string): void {
    this.store.set(identifier, content);
  }

  /** List all stored identifiers */
  listIdentifiers(): string[] {
    return [...this.store.keys()];
  }

  /** Total entries in store */
  get size(): number {
    return this.store.size;
  }

  /** Total bytes stored */
  storeSize(): number {
    let total = 0;
    for (const v of this.store.values()) total += v.length;
    return total;
  }

  /** Evict oldest entries if store exceeds maxBytes */
  evict(maxBytes = 10 * 1024 * 1024): void {
    while (this.storeSize() > maxBytes && this.store.size > 0) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) {
        this.store.delete(firstKey);
      } else {
        break;
      }
    }
  }

  /** Clear the entire store */
  clear(): void {
    this.store.clear();
  }
}

// ============================================================================
// Singleton
// ============================================================================

let _instance: RestorableCompressor | null = null;

export function getRestorableCompressor(): RestorableCompressor {
  if (!_instance) _instance = new RestorableCompressor();
  return _instance;
}

export function resetRestorableCompressor(): void {
  _instance = null;
}
