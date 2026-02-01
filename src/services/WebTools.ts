/**
 * Web Tools - Native LLM Tools for Web Access
 *
 * Provides tools that can be called by the LLM to:
 * - Search the web for information
 * - Fetch and read URL content
 * - Get current date/time
 *
 * These tools are registered with ToolCallingService and executed
 * automatically when the LLM decides to use them.
 */

import { toolCallingService, type ToolDefinition } from './ToolCallingService';
import { sanitizeUrl, sanitizeUserInput } from '../utils/sanitize';

// ============================================================================
// Web Search Tool
// ============================================================================

const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: 'Search the web for current information. Use this for questions about news, events, schedules, weather, or any information that may have changed recently. Returns search results with titles, links, and snippets.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to look up on the web'
      },
      num_results: {
        type: 'number',
        description: 'Number of results to return (default: 5, max: 10)'
      }
    },
    required: ['query']
  },
  handler: async (args) => {
    const query = sanitizeUserInput(args.query as string);
    const numResults = Math.min(args.num_results as number || 5, 10);

    // Try Serper API first (if configured)
    const serperKey = import.meta.env.VITE_SERPER_API_KEY;
    if (serperKey) {
      return searchWithSerper(query, numResults, serperKey);
    }

    // Fallback to Google Custom Search
    const googleKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const googleCx = import.meta.env.VITE_GOOGLE_CX;
    if (googleKey && googleCx) {
      return searchWithGoogle(query, numResults, googleKey, googleCx);
    }

    // Fallback to DuckDuckGo (no API key needed, but limited)
    return searchWithDuckDuckGo(query, numResults);
  }
};

async function searchWithSerper(query: string, numResults: number, apiKey: string) {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num: numResults
      })
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.organic?.slice(0, numResults) || [];

    return {
      source: 'serper',
      query,
      results: results.map((r: { title: string; link: string; snippet: string }) => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet
      })),
      answerBox: data.answerBox || null,
      knowledgeGraph: data.knowledgeGraph || null
    };
  } catch (error) {
    console.error('[WebTools] Serper search failed:', error);
    throw error;
  }
}

async function searchWithGoogle(query: string, numResults: number, apiKey: string, cx: string) {
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=${numResults}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.status}`);
    }

    const data = await response.json();
    const items = data.items || [];

    return {
      source: 'google',
      query,
      results: items.map((r: { title: string; link: string; snippet: string }) => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet
      }))
    };
  } catch (error) {
    console.error('[WebTools] Google search failed:', error);
    throw error;
  }
}

async function searchWithDuckDuckGo(query: string, numResults: number) {
  try {
    // DuckDuckGo Instant Answer API (limited but free)
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`);
    }

    const data = await response.json();

    const results = [];

    // Abstract (main answer)
    if (data.Abstract) {
      results.push({
        title: data.Heading || 'Answer',
        url: data.AbstractURL || '',
        snippet: data.Abstract
      });
    }

    // Related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, numResults - 1)) {
        if (topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related',
            url: topic.FirstURL || '',
            snippet: topic.Text
          });
        }
      }
    }

    return {
      source: 'duckduckgo',
      query,
      results: results.slice(0, numResults),
      instantAnswer: data.Answer || null
    };
  } catch (error) {
    console.error('[WebTools] DuckDuckGo search failed:', error);
    return {
      source: 'duckduckgo',
      query,
      results: [],
      error: 'Search failed - no API keys configured'
    };
  }
}

// ============================================================================
// Fetch URL Tool
// ============================================================================

const fetchUrlTool: ToolDefinition = {
  name: 'fetch_url',
  description: 'Fetch and read the content of a web page. Use this when you need to read the full content of a specific URL (article, documentation, TV schedule, etc.). Returns the text content of the page.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch and read'
      },
      extract_type: {
        type: 'string',
        description: 'What to extract: "text" (main content), "full" (everything), or "summary" (AI summary)',
        enum: ['text', 'full', 'summary']
      }
    },
    required: ['url']
  },
  handler: async (args) => {
    const url = sanitizeUrl(args.url as string);
    const extractType = (args.extract_type as string) || 'text';

    if (!url) {
      return { error: 'Invalid URL provided' };
    }

    try {
      // Use a CORS proxy for browser environment
      const proxyUrl = import.meta.env.VITE_CORS_PROXY_URL;
      const fetchUrl = proxyUrl ? `${proxyUrl}${encodeURIComponent(url)}` : url;

      const response = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LisaBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const content = extractContent(html, extractType);

      return {
        url,
        title: extractTitle(html),
        content: content.slice(0, 15000), // Limit content size
        contentLength: content.length,
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[WebTools] Fetch URL failed:', error);
      return {
        url,
        error: error instanceof Error ? error.message : 'Failed to fetch URL',
        suggestion: 'Try using web_search to find alternative sources'
      };
    }
  }
};

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : 'Unknown';
}

function extractContent(html: string, extractType: string): string {
  // Remove scripts, styles, and comments
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

  if (extractType === 'full') {
    // Just remove tags
    return cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Try to extract main content
  // Look for article, main, or content divs
  const mainContentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  ];

  for (const pattern of mainContentPatterns) {
    const match = cleaned.match(pattern);
    if (match && match[1].length > 200) {
      cleaned = match[1];
      break;
    }
  }

  // Remove remaining tags and clean up
  return cleaned
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// Get Current DateTime Tool
// ============================================================================

const getCurrentDateTimeTool: ToolDefinition = {
  name: 'get_current_datetime',
  description: 'Get the current date and time. Use this when you need to know what day, date, or time it is.',
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'Timezone (e.g., "Europe/Paris", "America/New_York"). Defaults to local timezone.'
      },
      format: {
        type: 'string',
        description: 'Format: "full", "date", "time", or "iso"',
        enum: ['full', 'date', 'time', 'iso']
      }
    }
  },
  handler: async (args) => {
    const timezone = args.timezone as string | undefined;
    const format = (args.format as string) || 'full';
    const now = new Date();

    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone || undefined
    };

    let result: Record<string, unknown> = {
      timestamp: now.getTime(),
      iso: now.toISOString()
    };

    switch (format) {
      case 'date':
        result.date = now.toLocaleDateString('fr-FR', { ...options, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        break;
      case 'time':
        result.time = now.toLocaleTimeString('fr-FR', { ...options, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        break;
      case 'iso':
        // Already included
        break;
      default: // full
        result = {
          ...result,
          date: now.toLocaleDateString('fr-FR', { ...options, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          time: now.toLocaleTimeString('fr-FR', { ...options, hour: '2-digit', minute: '2-digit' }),
          dayOfWeek: now.toLocaleDateString('fr-FR', { ...options, weekday: 'long' }),
          timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    return result;
  }
};

// ============================================================================
// Registration
// ============================================================================

/**
 * Register all web tools with the ToolCallingService
 */
export function registerWebTools(): void {
  toolCallingService.registerTool(webSearchTool);
  toolCallingService.registerTool(fetchUrlTool);
  toolCallingService.registerTool(getCurrentDateTimeTool);

  console.log('[WebTools] Registered: web_search, fetch_url, get_current_datetime');
}

/**
 * Get all web tool definitions
 */
export function getWebTools(): ToolDefinition[] {
  return [webSearchTool, fetchUrlTool, getCurrentDateTimeTool];
}

export { webSearchTool, fetchUrlTool, getCurrentDateTimeTool };
