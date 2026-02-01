import { z } from 'zod';
import type { Tool } from '../features/agents/core/Tool';

export const WebSearchSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty'),
});

export interface SearchResultItem {
  title: string;
  link: string;
  snippet: string;
}

export interface WebSearchOutput {
  results: SearchResultItem[];
}

export class WebSearchTool implements Tool<z.infer<typeof WebSearchSchema>, WebSearchOutput> {
  name = 'WebSearchTool';
  description = 'Performs a web search using Google Custom Search API and returns a list of results (title, link, snippet).';
  schema = WebSearchSchema;

  async execute({ query }: z.infer<typeof WebSearchSchema>): Promise<{ success: boolean; output?: WebSearchOutput; error?: string }> {
    const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
    const GOOGLE_CX = import.meta.env.VITE_GOOGLE_CX;

    if (!GOOGLE_API_KEY || !GOOGLE_CX) {
      return { success: false, error: 'Google Search API is not configured.' };
    }

    try {
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error(`Google Search API failed with status ${response.status}`);
      }

      const searchData = await response.json();
      const items = searchData.items || [];

      const results = items.map((item: { title: string; link: string; snippet: string }) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      }));

      return { success: true, output: { results } };
    } catch (error) {
      console.error('WebSearchTool execution failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

