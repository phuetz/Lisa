/**
 * Long-Term Memory Service
 * Service pour stocker et récupérer les souvenirs persistants de Lisa
 */

import { openDB, type IDBPDatabase } from 'idb';

interface MemoryEntry {
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
    const important = await this.getMostImportant(5);

    let context = '';

    if (preferences.length > 0) {
      context += '## Préférences de l\'utilisateur:\n';
      preferences.forEach(p => {
        context += `- ${p.key}: ${p.value}\n`;
      });
      context += '\n';
    }

    if (facts.length > 0) {
      context += '## Faits connus:\n';
      facts.forEach(f => {
        context += `- ${f.key}: ${f.value}\n`;
      });
      context += '\n';
    }

    if (instructions.length > 0) {
      context += '## Instructions spéciales:\n';
      instructions.forEach(i => {
        context += `- ${i.value}\n`;
      });
      context += '\n';
    }

    // Ajouter les souvenirs importants qui ne sont pas déjà inclus
    const addedIds = new Set([
      ...preferences.map(p => p.id),
      ...facts.map(f => f.id),
      ...instructions.map(i => i.id),
    ]);

    const additionalImportant = important.filter(m => !addedIds.has(m.id));
    if (additionalImportant.length > 0) {
      context += '## Contexte important:\n';
      additionalImportant.forEach(m => {
        context += `- ${m.key}: ${m.value}\n`;
      });
    }

    return context;
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

  // Extraction automatique de souvenirs depuis une conversation
  async extractAndRemember(userMessage: string, assistantResponse: string): Promise<void> {
    // Patterns pour détecter des préférences
    const preferencePatterns = [
      /j'aime\s+(.+)/i,
      /je préfère\s+(.+)/i,
      /je n'aime pas\s+(.+)/i,
      /je déteste\s+(.+)/i,
      /mon.*préféré.*est\s+(.+)/i,
      /j'utilise\s+(.+)/i,
    ];

    // Patterns pour détecter des faits
    const factPatterns = [
      /je m'appelle\s+(.+)/i,
      /mon nom est\s+(.+)/i,
      /je suis\s+(.+)/i,
      /je travaille\s+(.+)/i,
      /j'habite\s+(.+)/i,
      /j'ai\s+(\d+)\s+ans/i,
    ];

    // Vérifier les préférences
    for (const pattern of preferencePatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        const value = match[1].trim().replace(/[.!?]$/, '');
        await this.remember('preference', `preference-${Date.now()}`, value, {
          importance: 0.7,
          tags: ['auto-extracted', 'preference'],
        });
      }
    }

    // Vérifier les faits
    for (const pattern of factPatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        const value = match[1].trim().replace(/[.!?]$/, '');
        const key = pattern.source.split('\\s')[0].replace(/[^a-z]/gi, '');
        await this.remember('fact', key, value, {
          importance: 0.8,
          tags: ['auto-extracted', 'fact'],
        });
      }
    }

    // Détecter les instructions explicites
    if (userMessage.toLowerCase().includes('souviens-toi') || 
        userMessage.toLowerCase().includes('rappelle-toi') ||
        userMessage.toLowerCase().includes('n\'oublie pas')) {
      await this.remember('instruction', `instruction-${Date.now()}`, userMessage, {
        importance: 0.9,
        tags: ['explicit-instruction'],
      });
    }
  }
}

export const longTermMemoryService = new LongTermMemoryService();
export default LongTermMemoryService;
