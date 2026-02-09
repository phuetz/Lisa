/**
 * Long-Term Memory Service
 * Service pour stocker et récupérer les souvenirs persistants de Lisa
 * Utilise le LLM pour extraire intelligemment les informations mémorables
 * Persistence via SQLite (DatabaseService) with FTS4 full-text search.
 */

import { databaseService } from './DatabaseService';
import { aiService, type AIMessage } from './aiService';

export interface MemoryEntry {
  id: string;
  type: 'preference' | 'fact' | 'context' | 'instruction';
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
  importance: number;
  tags: string[];
}

class LongTermMemoryService {
  private dbReady = false;

  async init(): Promise<void> {
    if (this.dbReady) return;

    try {
      await databaseService.init();
      this.dbReady = true;
    } catch (err) {
      console.error('[LongTermMemory] SQLite init failed:', err);
      throw err;
    }
  }

  private toEntry(row: Record<string, unknown>, tags: string[] = []): MemoryEntry {
    return {
      id: row.id as string,
      type: row.type as MemoryEntry['type'],
      key: row.key as string,
      value: row.value as string,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      accessCount: (row.access_count as number) || 0,
      lastAccessedAt: new Date((row.updated_at as number) || (row.created_at as number)),
      importance: (row.importance as number) || 0.5,
      tags,
    };
  }

  private async getTagsForMemory(id: string): Promise<string[]> {
    if (!this.dbReady) return [];
    const rows = await databaseService.all<{ tag: string }>(
      'SELECT tag FROM memory_tags WHERE memory_id = ?', [id]
    );
    return rows.map(r => r.tag);
  }

  private async setTagsForMemory(id: string, tags: string[]): Promise<void> {
    if (!this.dbReady) return;
    // Delete existing tags
    await databaseService.run('DELETE FROM memory_tags WHERE memory_id = ?', [id]);
    // Insert new tags
    for (const tag of tags) {
      await databaseService.run(
        'INSERT OR IGNORE INTO memory_tags (memory_id, tag) VALUES (?, ?)',
        [id, tag]
      );
    }
  }

  async remember(
    type: MemoryEntry['type'],
    key: string,
    value: string,
    options: { importance?: number; tags?: string[] } = {}
  ): Promise<MemoryEntry> {
    await this.init();

    const existing = await this.getByKey(key);
    const now = Date.now();
    const tags = options.tags ?? [];

    if (existing) {
      const importance = options.importance ?? existing.importance;
      await databaseService.run(
        'UPDATE memories SET value = ?, importance = ?, updated_at = ?, metadata = ? WHERE id = ?',
        [value, importance, now, null, existing.id]
      );
      await this.setTagsForMemory(existing.id, tags.length > 0 ? tags : existing.tags);

      // Update FTS4
      await databaseService.run(
        'INSERT OR REPLACE INTO memories_fts (id, value, key) VALUES (?, ?, ?)',
        [existing.id, value, key]
      ).catch(() => {});

      return {
        ...existing,
        value,
        updatedAt: new Date(now),
        importance,
        tags: tags.length > 0 ? tags : existing.tags,
      };
    }

    // Create new entry
    const id = crypto.randomUUID();
    const importance = options.importance ?? 0.5;

    await databaseService.run(
      'INSERT INTO memories (id, type, key, value, importance, source, created_at, updated_at, access_count, conversation_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, type, key, value, importance, null, now, now, 0, null, null]
    );
    await this.setTagsForMemory(id, tags);

    // Index in FTS4
    await databaseService.run(
      'INSERT INTO memories_fts (id, value, key) VALUES (?, ?, ?)',
      [id, value, key]
    ).catch(() => {});

    return {
      id, type, key, value,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      accessCount: 0,
      lastAccessedAt: new Date(now),
      importance, tags,
    };
  }

  async recall(key: string): Promise<string | null> {
    await this.init();

    const entry = await this.getByKey(key);
    if (!entry) return null;

    // Update access stats
    await databaseService.run(
      'UPDATE memories SET access_count = access_count + 1, updated_at = ? WHERE id = ?',
      [Date.now(), entry.id]
    );

    return entry.value;
  }

  async forget(key: string): Promise<boolean> {
    await this.init();

    const entry = await this.getByKey(key);
    if (!entry) return false;

    await databaseService.run('DELETE FROM memories WHERE id = ?', [entry.id]);
    // Tags are deleted via CASCADE, FTS4 needs manual cleanup
    await databaseService.run('DELETE FROM memories_fts WHERE id = ?', [entry.id]).catch(() => {});
    return true;
  }

  async getByKey(key: string): Promise<MemoryEntry | null> {
    await this.init();
    if (!this.dbReady) return null;

    const row = await databaseService.get<Record<string, unknown>>(
      'SELECT * FROM memories WHERE key = ? LIMIT 1', [key]
    );
    if (!row) return null;

    const tags = await this.getTagsForMemory(row.id as string);
    return this.toEntry(row, tags);
  }

  async getByType(type: MemoryEntry['type']): Promise<MemoryEntry[]> {
    await this.init();
    if (!this.dbReady) return [];

    const rows = await databaseService.all<Record<string, unknown>>(
      'SELECT * FROM memories WHERE type = ?', [type]
    );

    const entries: MemoryEntry[] = [];
    for (const row of rows) {
      const tags = await this.getTagsForMemory(row.id as string);
      entries.push(this.toEntry(row, tags));
    }
    return entries;
  }

  async getByTags(tags: string[]): Promise<MemoryEntry[]> {
    await this.init();
    if (!this.dbReady || tags.length === 0) return [];

    const placeholders = tags.map(() => '?').join(',');
    const rows = await databaseService.all<Record<string, unknown>>(
      `SELECT DISTINCT m.* FROM memories m
       JOIN memory_tags t ON m.id = t.memory_id
       WHERE t.tag IN (${placeholders})`,
      tags
    );

    const entries: MemoryEntry[] = [];
    for (const row of rows) {
      const memTags = await this.getTagsForMemory(row.id as string);
      entries.push(this.toEntry(row, memTags));
    }
    return entries;
  }

  async getAll(): Promise<MemoryEntry[]> {
    await this.init();
    if (!this.dbReady) return [];

    const rows = await databaseService.all<Record<string, unknown>>('SELECT * FROM memories');
    const entries: MemoryEntry[] = [];
    for (const row of rows) {
      const tags = await this.getTagsForMemory(row.id as string);
      entries.push(this.toEntry(row, tags));
    }
    return entries;
  }

  async getMostImportant(limit: number = 10): Promise<MemoryEntry[]> {
    await this.init();
    if (!this.dbReady) return [];

    const rows = await databaseService.all<Record<string, unknown>>(
      'SELECT * FROM memories ORDER BY importance DESC LIMIT ?', [limit]
    );
    const entries: MemoryEntry[] = [];
    for (const row of rows) {
      const tags = await this.getTagsForMemory(row.id as string);
      entries.push(this.toEntry(row, tags));
    }
    return entries;
  }

  async getRecentlyAccessed(limit: number = 10): Promise<MemoryEntry[]> {
    await this.init();
    if (!this.dbReady) return [];

    const rows = await databaseService.all<Record<string, unknown>>(
      'SELECT * FROM memories ORDER BY updated_at DESC LIMIT ?', [limit]
    );
    const entries: MemoryEntry[] = [];
    for (const row of rows) {
      const tags = await this.getTagsForMemory(row.id as string);
      entries.push(this.toEntry(row, tags));
    }
    return entries;
  }

  /**
   * Full-text search using FTS4
   */
  async search(query: string): Promise<MemoryEntry[]> {
    await this.init();
    if (!this.dbReady) return [];

    // Try FTS4 first
    try {
      const ftsRows = await databaseService.all<{ id: string }>(
        'SELECT id FROM memories_fts WHERE memories_fts MATCH ?',
        [query + '*']  // Prefix matching
      );

      if (ftsRows.length > 0) {
        const ids = ftsRows.map(r => r.id);
        const placeholders = ids.map(() => '?').join(',');
        const rows = await databaseService.all<Record<string, unknown>>(
          `SELECT * FROM memories WHERE id IN (${placeholders})`,
          ids
        );

        const entries: MemoryEntry[] = [];
        for (const row of rows) {
          const tags = await this.getTagsForMemory(row.id as string);
          entries.push(this.toEntry(row, tags));
        }
        return entries;
      }
    } catch {
      // FTS4 query failed, fall back to LIKE
    }

    // Fallback to LIKE search
    const likeQuery = `%${query}%`;
    const rows = await databaseService.all<Record<string, unknown>>(
      'SELECT * FROM memories WHERE key LIKE ? OR value LIKE ?',
      [likeQuery, likeQuery]
    );

    const entries: MemoryEntry[] = [];
    for (const row of rows) {
      const tags = await this.getTagsForMemory(row.id as string);
      entries.push(this.toEntry(row, tags));
    }
    return entries;
  }

  async buildContextForPrompt(): Promise<string> {
    const preferences = await this.getByType('preference');
    const facts = await this.getByType('fact');
    const instructions = await this.getByType('instruction');
    const important = await this.getMostImportant(10);

    const sections: string[] = [];

    if (facts.length > 0) {
      const lines = facts.map(f => `- ${f.value}`);
      sections.push(`## Informations sur l'utilisateur:\n${lines.join('\n')}`);
    }

    if (preferences.length > 0) {
      const lines = preferences.map(p => `- ${p.value}`);
      sections.push(`## Préférences:\n${lines.join('\n')}`);
    }

    if (instructions.length > 0) {
      const lines = instructions.map(i => `- ${i.value}`);
      sections.push(`## Instructions de l'utilisateur:\n${lines.join('\n')}`);
    }

    const addedIds = new Set([
      ...preferences.map(p => p.id),
      ...facts.map(f => f.id),
      ...instructions.map(i => i.id),
    ]);

    const additionalImportant = important.filter(m => !addedIds.has(m.id));
    if (additionalImportant.length > 0) {
      const lines = additionalImportant.map(m => `- ${m.value}`);
      sections.push(`## Contexte additionnel:\n${lines.join('\n')}`);
    }

    return sections.join('\n\n');
  }

  async updateMemory(
    id: string,
    updates: Partial<Pick<MemoryEntry, 'type' | 'key' | 'value' | 'importance' | 'tags'>>
  ): Promise<MemoryEntry | null> {
    await this.init();
    if (!this.dbReady) return null;

    const row = await databaseService.get<Record<string, unknown>>(
      'SELECT * FROM memories WHERE id = ?', [id]
    );
    if (!row) return null;

    const now = Date.now();
    const sets: string[] = ['updated_at = ?'];
    const params: unknown[] = [now];

    if (updates.type !== undefined) { sets.push('type = ?'); params.push(updates.type); }
    if (updates.key !== undefined) { sets.push('key = ?'); params.push(updates.key); }
    if (updates.value !== undefined) { sets.push('value = ?'); params.push(updates.value); }
    if (updates.importance !== undefined) { sets.push('importance = ?'); params.push(updates.importance); }

    params.push(id);
    await databaseService.run(`UPDATE memories SET ${sets.join(', ')} WHERE id = ?`, params);

    if (updates.tags) {
      await this.setTagsForMemory(id, updates.tags);
    }

    // Update FTS4
    if (updates.value !== undefined || updates.key !== undefined) {
      const key = updates.key ?? row.key as string;
      const value = updates.value ?? row.value as string;
      await databaseService.run(
        'INSERT OR REPLACE INTO memories_fts (id, value, key) VALUES (?, ?, ?)',
        [id, value, key]
      ).catch(() => {});
    }

    const tags = updates.tags ?? await this.getTagsForMemory(id);
    const updated = await databaseService.get<Record<string, unknown>>(
      'SELECT * FROM memories WHERE id = ?', [id]
    );
    return updated ? this.toEntry(updated, tags) : null;
  }

  async deleteById(id: string): Promise<boolean> {
    await this.init();
    if (!this.dbReady) return false;

    await databaseService.run('DELETE FROM memories WHERE id = ?', [id]);
    await databaseService.run('DELETE FROM memories_fts WHERE id = ?', [id]).catch(() => {});
    return true;
  }

  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    avgImportance: number;
    mostAccessed: MemoryEntry | null;
  }> {
    const all = await this.getAll();
    const byType: Record<string, number> = {};
    let totalImportance = 0;
    let mostAccessed: MemoryEntry | null = null;

    for (const entry of all) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      totalImportance += entry.importance;
      if (!mostAccessed || entry.accessCount > mostAccessed.accessCount) {
        mostAccessed = entry;
      }
    }

    return {
      total: all.length,
      byType,
      avgImportance: all.length > 0 ? totalImportance / all.length : 0,
      mostAccessed,
    };
  }

  async clearAll(): Promise<void> {
    await this.init();
    if (!this.dbReady) return;

    await databaseService.run('DELETE FROM memory_tags');
    await databaseService.run('DELETE FROM memories');
    await databaseService.run('DELETE FROM memories_fts').catch(() => {});
  }

  async export(): Promise<MemoryEntry[]> {
    return this.getAll();
  }

  async import(entries: MemoryEntry[]): Promise<void> {
    await this.init();
    if (!this.dbReady) return;

    for (const entry of entries) {
      await this.remember(entry.type, entry.key, entry.value, {
        importance: entry.importance,
        tags: entry.tags,
      });
    }
  }

  /**
   * Extraction automatique de souvenirs via LLM
   */
  async extractAndRemember(userMessage: string, assistantResponse: string): Promise<void> {
    try {
      await this.extractWithLLM(userMessage, assistantResponse);
    } catch (error) {
      console.warn('[LongTermMemory] LLM extraction failed, using regex fallback:', error);
      await this.extractWithRegex(userMessage);
    }
  }

  private async extractWithLLM(userMessage: string, assistantResponse: string): Promise<void> {
    const config = aiService.getConfig();
    if (!config.apiKey && config.provider !== 'lmstudio' && config.provider !== 'ollama') {
      throw new Error('No AI provider configured');
    }

    const extractionPrompt = `Analyse cet échange et extrais les informations personnelles mémorables de l'UTILISATEUR.

MESSAGE UTILISATEUR: "${userMessage}"
RÉPONSE ASSISTANT: "${assistantResponse}"

Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de commentaires). Si rien n'est à retenir, réponds [].

Format attendu:
[{"type":"fact|preference|instruction","key":"clé_unique_descriptive","value":"information à retenir","importance":0.5-1.0}]

Règles:
- type "fact": identité, âge, lieu, métier, famille, animaux, santé, etc.
- type "preference": goûts, préférences, habitudes, outils utilisés
- type "instruction": demandes explicites de mémorisation ("souviens-toi", "remember", "n'oublie pas")
- key: identifiant court et stable (ex: "nom", "ville", "métier", "animal_compagnie") — si l'info est déjà connue sous cette clé, elle sera mise à jour
- importance: 0.9 pour identité/instructions, 0.7 pour préférences, 0.5 pour contexte
- Extrais de toute langue (français, anglais, etc.)
- N'extrais PAS les questions techniques, les requêtes de code, ou les demandes banales`;

    const messages: AIMessage[] = [
      { role: 'system', content: 'Tu es un extracteur de mémoire. Réponds uniquement en JSON valide.' },
      { role: 'user', content: extractionPrompt },
    ];

    const response = await aiService.sendMessage(messages);

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    let extracted: Array<{ type: string; key: string; value: string; importance: number }>;
    try {
      extracted = JSON.parse(jsonMatch[0]);
    } catch {
      console.warn('[LongTermMemory] Failed to parse LLM JSON:', jsonMatch[0]);
      return;
    }

    if (!Array.isArray(extracted) || extracted.length === 0) return;

    console.log(`[LongTermMemory] LLM extracted ${extracted.length} memories`);

    for (const item of extracted) {
      const type = (['fact', 'preference', 'instruction'].includes(item.type) ? item.type : 'context') as MemoryEntry['type'];
      const importance = Math.min(1, Math.max(0, item.importance ?? 0.5));

      await this.remember(type, item.key, item.value, {
        importance,
        tags: ['llm-extracted', type],
      });
    }
  }

  private async extractWithRegex(userMessage: string): Promise<void> {
    const preferencePatterns = [
      /j'aime\s+(.+)/i, /je préfère\s+(.+)/i, /je n'aime pas\s+(.+)/i,
      /je déteste\s+(.+)/i, /mon.*préféré.*est\s+(.+)/i, /j'utilise\s+(.+)/i,
      /j'adore\s+(.+)/i, /i like\s+(.+)/i, /i prefer\s+(.+)/i, /i love\s+(.+)/i,
    ];

    const factPatterns: Array<[RegExp, string]> = [
      [/je m'appelle\s+(.+)/i, 'nom'], [/mon nom est\s+(.+)/i, 'nom'],
      [/my name is\s+(.+)/i, 'nom'], [/call me\s+(.+)/i, 'surnom'],
      [/je suis\s+(.+)/i, 'identité'], [/i am\s+(.+)/i, 'identité'],
      [/je travaille\s+(.+)/i, 'métier'], [/i work\s+(.+)/i, 'métier'],
      [/j'habite\s+(.+)/i, 'ville'], [/i live in\s+(.+)/i, 'ville'],
      [/j'ai\s+(\d+)\s+ans/i, 'âge'], [/i'?m\s+(\d+)\s+years?\s+old/i, 'âge'],
    ];

    for (const pattern of preferencePatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        const value = match[1].trim().replace(/[.!?]$/, '');
        await this.remember('preference', `preference-${value.slice(0, 30).toLowerCase().replace(/\s+/g, '_')}`, value, {
          importance: 0.7,
          tags: ['regex-extracted', 'preference'],
        });
      }
    }

    for (const [pattern, key] of factPatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        const value = match[1].trim().replace(/[.!?]$/, '');
        await this.remember('fact', key, value, {
          importance: 0.8,
          tags: ['regex-extracted', 'fact'],
        });
      }
    }

    const lower = userMessage.toLowerCase();
    if (lower.includes('souviens-toi') || lower.includes('rappelle-toi') ||
        lower.includes("n'oublie pas") || lower.includes('remember that') ||
        lower.includes("don't forget")) {
      await this.remember('instruction', `instruction-${Date.now()}`, userMessage, {
        importance: 0.9,
        tags: ['regex-extracted', 'instruction'],
      });
    }
  }
}

export const longTermMemoryService = new LongTermMemoryService();
export default LongTermMemoryService;
