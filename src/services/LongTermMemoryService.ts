/**
 * Long-Term Memory Service
 * Service pour stocker et récupérer les souvenirs persistants de Lisa
 * Utilise le LLM pour extraire intelligemment les informations mémorables
 */

import { openDB, type IDBPDatabase } from 'idb';
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
  importance: number; // 0-1, plus c'est haut plus c'est important
  tags: string[];
}

interface MemoryDB {
  memories: {
    key: string;
    value: MemoryEntry;
    indexes: {
      'by-type': string;
      'by-key': string;
      'by-importance': number;
      'by-tags': string[];
    };
  };
}

class LongTermMemoryService {
  private db: IDBPDatabase<MemoryDB> | null = null;
  private readonly DB_NAME = 'lisa-memory-db';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<MemoryDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('memories', { keyPath: 'id' });
        store.createIndex('by-type', 'type');
        store.createIndex('by-key', 'key');
        store.createIndex('by-importance', 'importance');
        store.createIndex('by-tags', 'tags', { multiEntry: true });
      },
    });
  }

  async remember(
    type: MemoryEntry['type'],
    key: string,
    value: string,
    options: { importance?: number; tags?: string[] } = {}
  ): Promise<MemoryEntry> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // Vérifier si une entrée existe déjà avec cette clé
    const existing = await this.getByKey(key);
    
    if (existing) {
      // Mettre à jour l'entrée existante
      const updated: MemoryEntry = {
        ...existing,
        value,
        updatedAt: new Date(),
        importance: options.importance ?? existing.importance,
        tags: options.tags ?? existing.tags,
      };
      await this.db.put('memories', updated);
      return updated;
    }

    // Créer une nouvelle entrée
    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      type,
      key,
      value,
      createdAt: new Date(),
      updatedAt: new Date(),
      accessCount: 0,
      lastAccessedAt: new Date(),
      importance: options.importance ?? 0.5,
      tags: options.tags ?? [],
    };

    await this.db.put('memories', entry);
    return entry;
  }

  async recall(key: string): Promise<string | null> {
    await this.init();
    if (!this.db) return null;

    const entry = await this.getByKey(key);
    if (!entry) return null;

    // Mettre à jour les stats d'accès
    entry.accessCount++;
    entry.lastAccessedAt = new Date();
    await this.db.put('memories', entry);

    return entry.value;
  }

  async forget(key: string): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    const entry = await this.getByKey(key);
    if (!entry) return false;

    await this.db.delete('memories', entry.id);
    return true;
  }

  async getByKey(key: string): Promise<MemoryEntry | null> {
    await this.init();
    if (!this.db) return null;

    const entries = await this.db.getAllFromIndex('memories', 'by-key', key);
    return entries[0] || null;
  }

  async getByType(type: MemoryEntry['type']): Promise<MemoryEntry[]> {
    await this.init();
    if (!this.db) return [];

    return this.db.getAllFromIndex('memories', 'by-type', type);
  }

  async getByTags(tags: string[]): Promise<MemoryEntry[]> {
    await this.init();
    if (!this.db) return [];

    const results: MemoryEntry[] = [];
    for (const tag of tags) {
      const entries = await this.db.getAllFromIndex('memories', 'by-tags', tag);
      for (const entry of entries) {
        if (!results.find(r => r.id === entry.id)) {
          results.push(entry);
        }
      }
    }
    return results;
  }

  async getAll(): Promise<MemoryEntry[]> {
    await this.init();
    if (!this.db) return [];

    return this.db.getAll('memories');
  }

  async getMostImportant(limit: number = 10): Promise<MemoryEntry[]> {
    await this.init();
    if (!this.db) return [];

    const all = await this.db.getAll('memories');
    return all.sort((a, b) => b.importance - a.importance).slice(0, limit);
  }

  async getRecentlyAccessed(limit: number = 10): Promise<MemoryEntry[]> {
    await this.init();
    if (!this.db) return [];

    const all = await this.db.getAll('memories');
    return all
      .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())
      .slice(0, limit);
  }

  async search(query: string): Promise<MemoryEntry[]> {
    await this.init();
    if (!this.db) return [];

    const lowerQuery = query.toLowerCase();
    const all = await this.db.getAll('memories');
    
    return all.filter(entry =>
      entry.key.toLowerCase().includes(lowerQuery) ||
      entry.value.toLowerCase().includes(lowerQuery) ||
      entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
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

    // Ajouter les souvenirs importants non déjà inclus
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
    if (!this.db) return null;

    const entry = await this.db.get('memories', id);
    if (!entry) return null;

    const updated: MemoryEntry = { ...entry, ...updates, updatedAt: new Date() };
    await this.db.put('memories', updated);
    return updated;
  }

  async deleteById(id: string): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    await this.db.delete('memories', id);
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
    if (!this.db) return;

    await this.db.clear('memories');
  }

  async export(): Promise<MemoryEntry[]> {
    return this.getAll();
  }

  async import(entries: MemoryEntry[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    for (const entry of entries) {
      await this.db.put('memories', {
        ...entry,
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.updatedAt),
        lastAccessedAt: new Date(entry.lastAccessedAt),
      });
    }
  }

  /**
   * Extraction automatique de souvenirs via LLM
   * Fallback sur regex si aucun provider IA n'est configuré
   */
  async extractAndRemember(userMessage: string, assistantResponse: string): Promise<void> {
    try {
      await this.extractWithLLM(userMessage, assistantResponse);
    } catch (error) {
      console.warn('[LongTermMemory] LLM extraction failed, using regex fallback:', error);
      await this.extractWithRegex(userMessage);
    }
  }

  /**
   * Extraction intelligente via LLM — analyse sémantique de la conversation
   */
  private async extractWithLLM(userMessage: string, assistantResponse: string): Promise<void> {
    // Vérifier qu'un provider est configuré
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

    // Parser le JSON de la réponse
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

  /**
   * Fallback regex — extraction basique quand le LLM n'est pas disponible
   */
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
