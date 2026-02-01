import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { WebSearchTool } from '../WebSearchTool';

// Mock global fetch
vi.stubGlobal('fetch', vi.fn());

// Mock the environment variables for API keys
vi.stubEnv('VITE_GOOGLE_API_KEY', 'test-google-api-key');
vi.stubEnv('VITE_GOOGLE_CX', 'test-google-cx');

describe('WebSearchTool', () => {
  let tool: WebSearchTool;

  beforeEach(() => {
    tool = new WebSearchTool();
    vi.clearAllMocks();
  });

  it('should successfully return search results', async () => {
    const mockQuery = 'What is Vitest?';
    const mockSearchResults = {
      items: [
        { title: 'Vitest', link: 'https://vitest.dev', snippet: 'A blazing fast unit-test framework.' },
        { title: 'Getting Started', link: 'https://vitest.dev/guide', snippet: 'How to install and use Vitest.' },
      ],
    };

    // Mock Google Search API call
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSearchResults),
    });

    const result = await tool.execute({ query: mockQuery });

    expect(result.success).toBe(true);
    expect(result.output?.results).toHaveLength(2);
    expect(result.output?.results[0].title).toBe('Vitest');
    expect(result.output?.results[0].link).toBe('https://vitest.dev');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle Google Search API failure', async () => {
    const mockQuery = 'test';
    (fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await tool.execute({ query: mockQuery });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Google Search API failed with status 500');
  });

  it('should handle empty search results', async () => {
    const mockQuery = 'query with no results';
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    const result = await tool.execute({ query: mockQuery });

    expect(result.success).toBe(true);
    expect(result.output?.results).toHaveLength(0);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle missing items in response', async () => {
    const mockQuery = 'test query';
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}), // No items key
    });

    const result = await tool.execute({ query: mockQuery });

    expect(result.success).toBe(true);
    expect(result.output?.results).toHaveLength(0);
  });

  it('should handle network errors', async () => {
    const mockQuery = 'test query';
    (fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

    const result = await tool.execute({ query: mockQuery });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });
});
