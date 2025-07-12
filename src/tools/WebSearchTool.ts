/**
 * WebSearchTool: A tool for searching the web and summarizing results.
 */

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const GOOGLE_CX = import.meta.env.VITE_GOOGLE_CX;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

interface SearchResult {
  title: string;
  snippet: string;
}

interface ExecuteProps {
  query: string;
}

interface ExecuteResult {
  success: boolean;
  output?: { summary: string } | null;
  error?: string | null;
}

export class WebSearchTool {
  name = 'WebSearchTool';
  description = 'Performs a web search and provides a concise answer.';

  private async summarize(query: string, searchResults: SearchResult[]): Promise<string> {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured for summarization.');
    }

    const content = searchResults.map(r => `Title: ${r.title}\nSnippet: ${r.snippet}`).join('\n\n');
    const prompt = `Based on the following search results for the query "${query}", provide a concise, helpful answer. Do not just list the results. Synthesize them into a coherent response.\n\n${content}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('Summarization API request failed');
    }

    const result = await response.json();
    return result.choices[0].message.content;
  }

  async execute({ query }: ExecuteProps): Promise<ExecuteResult> {
    if (!GOOGLE_API_KEY || !GOOGLE_CX) {
      return { success: false, error: 'Google Search API is not configured.', output: null };
    }

    if (!query || typeof query !== 'string') {
      return { success: false, error: 'A valid search query must be provided.', output: null };
    }

    try {
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error('Google Search API request failed');
      }

      const searchData = await response.json();
      const searchResults = searchData.items || [];

      if (searchResults.length === 0) {
        return { success: true, output: { summary: 'No relevant search results found.' } };
      }

      const summary = await this.summarize(query, searchResults);

      return { success: true, output: { summary } };
    } catch (error: any) {
      console.error('WebSearchTool execution failed:', error);
      return { success: false, error: error.message, output: null };
    }
  }
}
