/**
 * WebContentReaderTool: A tool for fetching, parsing, and summarizing the content of a web page.
 */

interface ExecuteProps {
  url: string;
}

interface ExecuteResult {
  success: boolean;
  output?: { summary: string } | null;
  error?: string | null;
}

export class WebContentReaderTool {
  name = 'WebContentReaderTool';
  description = 'Reads and summarizes the content of a given URL.';

  private async summarize(url: string, textContent: string): Promise<string> {
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured for summarization.');
    }
  

    const prompt = `Please provide a concise summary of the following web page content from ${url}. Focus on the main points and key takeaways.\n\n---\n\n${textContent}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Summarization API request failed: ${errorBody}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  }

  private extractMainContent(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove unwanted elements
    doc.querySelectorAll('script, style, nav, footer, header, aside').forEach(el => el.remove());

    // Get text from the main content area, or body as a fallback
    const mainContent = doc.querySelector('main, article, body') as HTMLElement | null;
    return mainContent ? mainContent.innerText.replace(/\s\s+/g, ' ').trim() : '';
  }

  async execute({ url }: ExecuteProps): Promise<ExecuteResult> {
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'A valid URL must be provided.', output: null };
    }

    try {
      // Use a CORS proxy to fetch website content from the client-side
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch URL content. Status: ${response.status}`);
      }

      const html = await response.text();
      const textContent = this.extractMainContent(html);

      if (!textContent) {
        return { success: false, error: 'Could not extract meaningful content from the URL.', output: null };
      }

      const summary = await this.summarize(url, textContent);

      return { success: true, output: { summary } };
    } catch (error: any) {
      console.error('WebContentReaderTool execution failed:', error);
      return { success: false, error: error.message, output: null };
    }
  }
}
