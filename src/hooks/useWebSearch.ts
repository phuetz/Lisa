import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export interface WebSearchOptions {
  apiKey?: string;
  searchEngineId?: string;
  maxResults?: number;
}

export interface WebSearchResult {
  title: string;
  snippet: string;
  link: string;
  source: string;
}

/**
 * Hook for performing web searches and returning concise answers
 */
export function useWebSearch(options: WebSearchOptions = {}) {
  const { i18n } = useTranslation();
  
  const apiKey = options.apiKey || process.env.VITE_GOOGLE_SEARCH_API_KEY;
  const searchEngineId = options.searchEngineId || process.env.VITE_GOOGLE_SEARCH_ENGINE_ID;
  const maxResults = options.maxResults || 3;

  /**
   * Determine if a query is a web search question
   */
  const isWebSearchQuery = useCallback((query: string): boolean => {
    const lowerQuery = query.toLowerCase().trim();
    
    // List of question starters that suggest web search
    const englishQuestionStarters = [
      'what is', 'what are', 'who is', 'who are',
      'where is', 'where are', 'when is', 'when did',
      'why is', 'why are', 'how to', 'how do',
      'can you tell me about', 'search for', 'look up',
      'find information about', 'tell me about'
    ];
    
    const frenchQuestionStarters = [
      'qu\'est-ce que', 'qu\'est ce que', 'qui est', 'qui sont',
      'où est', 'où sont', 'quand est', 'quand a',
      'pourquoi est', 'pourquoi sont', 'comment',
      'peux-tu me dire', 'cherche', 'recherche',
      'trouve des informations sur', 'parle-moi de'
    ];
    
    const spanishQuestionStarters = [
      'qué es', 'quién es', 'quiénes son',
      'dónde está', 'dónde están', 'cuándo es', 'cuándo fue',
      'por qué es', 'por qué son', 'cómo',
      'puedes decirme sobre', 'busca', 'encuentra',
      'encuentra información sobre', 'háblame de'
    ];
    
    // Check if query starts with any of the question patterns
    return [
      ...englishQuestionStarters,
      ...frenchQuestionStarters,
      ...spanishQuestionStarters
    ].some(starter => lowerQuery.startsWith(starter) || lowerQuery.includes(starter));
  }, []);
  
  /**
   * Extract a query suitable for search from natural language input
   */
  const prepareSearchQuery = useCallback((text: string): string => {
    // Remove question words and other unnecessary text
    const cleanQuery = text
      .replace(/^(what|who|where|when|why|how|can you|could you|tell me|search for|look up|find|please)/i, '')
      .replace(/^(qu'est[- ]ce que|qui|où|quand|pourquoi|comment|peux[- ]tu|pourrais[- ]tu|dis[- ]moi|cherche|recherche|trouve|s'il te plaît)/i, '')
      .replace(/^(qué|quién|quiénes|dónde|cuándo|por qué|cómo|puedes|podrías|dime|busca|encuentra|por favor)/i, '')
      .trim()
      .replace(/\?+$/, ''); // Remove trailing question marks
    
    return cleanQuery || text; // If nothing left after cleaning, use original text
  }, []);

  /**
   * Perform a web search and get concise results
   */
  const performWebSearch = useCallback(async (query: string): Promise<WebSearchResult[]> => {
    if (!apiKey || !searchEngineId) {
      console.warn('Missing API key or search engine ID for web search');
      return [];
    }
    
    // Prepare the search query
    const searchQuery = prepareSearchQuery(query);
    
    try {
      // Use Google Custom Search API
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=${maxResults}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Search API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return [];
      }
      
      // Transform API response to our result format
      return data.items.map((item: any) => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link,
        source: item.displayLink || new URL(item.link).hostname
      })).slice(0, maxResults);
      
    } catch (error) {
      console.error('Error performing web search:', error);
      return [];
    }
  }, [apiKey, maxResults, prepareSearchQuery, searchEngineId]);

  /**
   * Create a concise answer from search results
   */
  const createConciseAnswer = useCallback((results: WebSearchResult[], query: string): string => {
    if (results.length === 0) {
      return i18n.language.startsWith('fr')
        ? `Je n'ai pas pu trouver d'information sur "${query}".`
        : i18n.language.startsWith('es')
          ? `No pude encontrar información sobre "${query}".`
          : `I couldn't find information about "${query}".`;
    }
    
    // For a single result, use more of its content
    if (results.length === 1) {
      const result = results[0];
      return `${result.snippet} (Source: ${result.source})`;
    }
    
    // For multiple results, combine snippets
    const combinedAnswer = results.map((result, i) => 
      `${i + 1}. ${result.snippet} (${result.source})`
    ).join('\n\n');
    
    return combinedAnswer;
  }, [i18n.language]);

  return {
    isWebSearchQuery,
    performWebSearch,
    createConciseAnswer
  };
}
