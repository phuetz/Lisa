/**
 * Lisa Search Manager
 * Full-text search across conversations, files, and content
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  content: string;
  excerpt: string;
  score: number;
  highlights: SearchHighlight[];
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export type SearchResultType = 
  | 'message'
  | 'conversation'
  | 'file'
  | 'document'
  | 'skill'
  | 'template'
  | 'setting'
  | 'command';

export interface SearchHighlight {
  field: string;
  start: number;
  end: number;
  text: string;
}

export interface SearchQuery {
  text: string;
  types?: SearchResultType[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface SearchIndex {
  id: string;
  type: SearchResultType;
  title: string;
  content: string;
  keywords: string[];
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface SearchStats {
  totalIndexed: number;
  byType: Record<string, number>;
  lastIndexed: Date | null;
}

export class SearchManager extends BrowserEventEmitter {
  private index: Map<string, SearchIndex> = new Map();
  private searchHistory: string[] = [];
  private maxHistory = 50;

  constructor() {
    super();
  }

  // Indexing
  addToIndex(item: SearchIndex): void {
    this.index.set(item.id, item);
    this.emit('index:added', item);
  }

  removeFromIndex(id: string): boolean {
    const deleted = this.index.delete(id);
    if (deleted) {
      this.emit('index:removed', { id });
    }
    return deleted;
  }

  updateIndex(id: string, updates: Partial<SearchIndex>): boolean {
    const item = this.index.get(id);
    if (!item) return false;

    Object.assign(item, updates);
    this.emit('index:updated', item);
    return true;
  }

  clearIndex(type?: SearchResultType): void {
    if (type) {
      for (const [id, item] of this.index) {
        if (item.type === type) {
          this.index.delete(id);
        }
      }
    } else {
      this.index.clear();
    }
    this.emit('index:cleared', { type });
  }

  // Search
  search(query: SearchQuery): SearchResult[] {
    const { text, types, dateFrom, dateTo, limit = 20, offset = 0 } = query;
    
    // Add to history
    if (text.trim()) {
      this.addToHistory(text.trim());
    }

    // Tokenize search text
    const searchTerms = this.tokenize(text.toLowerCase());
    
    if (searchTerms.length === 0) {
      return [];
    }

    // Score and filter results
    const results: SearchResult[] = [];

    for (const item of this.index.values()) {
      // Type filter
      if (types && types.length > 0 && !types.includes(item.type)) {
        continue;
      }

      // Date filter
      if (dateFrom && item.timestamp < dateFrom) continue;
      if (dateTo && item.timestamp > dateTo) continue;

      // Calculate score
      const score = this.calculateScore(item, searchTerms);
      
      if (score > 0) {
        const highlights = this.findHighlights(item, searchTerms);
        const excerpt = this.generateExcerpt(item.content, searchTerms);

        results.push({
          id: item.id,
          type: item.type,
          title: item.title,
          content: item.content,
          excerpt,
          score,
          highlights,
          metadata: item.metadata,
          timestamp: item.timestamp
        });
      }
    }

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);

    // Apply pagination
    return results.slice(offset, offset + limit);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  private calculateScore(item: SearchIndex, searchTerms: string[]): number {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const contentLower = item.content.toLowerCase();
    const keywordsLower = item.keywords.map(k => k.toLowerCase());

    for (const term of searchTerms) {
      // Title match (high weight)
      if (titleLower.includes(term)) {
        score += 10;
        // Exact title match bonus
        if (titleLower === term) {
          score += 5;
        }
      }

      // Keyword match (high weight)
      if (keywordsLower.some(k => k.includes(term))) {
        score += 8;
      }

      // Content match
      const contentMatches = (contentLower.match(new RegExp(term, 'g')) || []).length;
      score += Math.min(contentMatches * 2, 10); // Cap at 10

      // Exact word match bonus
      const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, 'i');
      if (wordBoundaryRegex.test(item.title)) score += 3;
      if (wordBoundaryRegex.test(item.content)) score += 2;
    }

    // Recency bonus (within last 24 hours)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (item.timestamp > dayAgo) {
      score += 2;
    }

    return score;
  }

  private findHighlights(item: SearchIndex, searchTerms: string[]): SearchHighlight[] {
    const highlights: SearchHighlight[] = [];
    const fields = [
      { name: 'title', text: item.title },
      { name: 'content', text: item.content }
    ];

    for (const field of fields) {
      for (const term of searchTerms) {
        const regex = new RegExp(term, 'gi');
        let match;
        
        while ((match = regex.exec(field.text)) !== null) {
          highlights.push({
            field: field.name,
            start: match.index,
            end: match.index + term.length,
            text: match[0]
          });
        }
      }
    }

    return highlights;
  }

  private generateExcerpt(content: string, searchTerms: string[], maxLength = 150): string {
    if (content.length <= maxLength) {
      return content;
    }

    // Find first occurrence of any search term
    let firstMatchIndex = content.length;
    for (const term of searchTerms) {
      const index = content.toLowerCase().indexOf(term.toLowerCase());
      if (index !== -1 && index < firstMatchIndex) {
        firstMatchIndex = index;
      }
    }

    // Extract excerpt around the match
    const start = Math.max(0, firstMatchIndex - 50);
    const end = Math.min(content.length, start + maxLength);
    
    let excerpt = content.slice(start, end);
    
    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';

    return excerpt;
  }

  // Search history
  addToHistory(query: string): void {
    // Remove if already exists
    const index = this.searchHistory.indexOf(query);
    if (index !== -1) {
      this.searchHistory.splice(index, 1);
    }

    // Add to front
    this.searchHistory.unshift(query);

    // Trim to max
    if (this.searchHistory.length > this.maxHistory) {
      this.searchHistory.pop();
    }
  }

  getHistory(): string[] {
    return [...this.searchHistory];
  }

  clearHistory(): void {
    this.searchHistory = [];
    this.emit('history:cleared');
  }

  // Suggestions
  getSuggestions(prefix: string, limit = 5): string[] {
    const prefixLower = prefix.toLowerCase();
    
    // From history
    const historySuggestions = this.searchHistory
      .filter(q => q.toLowerCase().startsWith(prefixLower))
      .slice(0, limit);

    // From index titles
    const titleSuggestions = Array.from(this.index.values())
      .filter(item => item.title.toLowerCase().startsWith(prefixLower))
      .map(item => item.title)
      .slice(0, limit);

    // From index keywords
    const keywordSuggestions = Array.from(this.index.values())
      .flatMap(item => item.keywords)
      .filter(k => k.toLowerCase().startsWith(prefixLower))
      .slice(0, limit);

    // Combine and dedupe
    const all = [...new Set([...historySuggestions, ...titleSuggestions, ...keywordSuggestions])];
    return all.slice(0, limit);
  }

  // Quick search shortcuts
  searchMessages(text: string, limit = 20): SearchResult[] {
    return this.search({ text, types: ['message'], limit });
  }

  searchConversations(text: string, limit = 20): SearchResult[] {
    return this.search({ text, types: ['conversation'], limit });
  }

  searchFiles(text: string, limit = 20): SearchResult[] {
    return this.search({ text, types: ['file', 'document'], limit });
  }

  searchCommands(text: string, limit = 10): SearchResult[] {
    return this.search({ text, types: ['command'], limit });
  }

  // Stats
  getStats(): SearchStats {
    const byType: Record<string, number> = {};
    let lastIndexed: Date | null = null;

    for (const item of this.index.values()) {
      byType[item.type] = (byType[item.type] || 0) + 1;
      if (!lastIndexed || item.timestamp > lastIndexed) {
        lastIndexed = item.timestamp;
      }
    }

    return {
      totalIndexed: this.index.size,
      byType,
      lastIndexed
    };
  }

  // Bulk operations
  reindexAll(items: SearchIndex[]): void {
    this.index.clear();
    for (const item of items) {
      this.index.set(item.id, item);
    }
    this.emit('index:reindexed', { count: items.length });
  }

  exportIndex(): string {
    return JSON.stringify(Array.from(this.index.values()), null, 2);
  }

  importIndex(json: string): number {
    const items = JSON.parse(json) as SearchIndex[];
    let imported = 0;

    for (const item of items) {
      if (!this.index.has(item.id)) {
        this.index.set(item.id, {
          ...item,
          timestamp: new Date(item.timestamp)
        });
        imported++;
      }
    }

    return imported;
  }
}

// Singleton
let searchManagerInstance: SearchManager | null = null;

export function getSearchManager(): SearchManager {
  if (!searchManagerInstance) {
    searchManagerInstance = new SearchManager();
  }
  return searchManagerInstance;
}

export function resetSearchManager(): void {
  if (searchManagerInstance) {
    searchManagerInstance.removeAllListeners();
    searchManagerInstance = null;
  }
}

