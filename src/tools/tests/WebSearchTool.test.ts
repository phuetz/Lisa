import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { WebSearchTool } from '../WebSearchTool';

// Mock global fetch
vi.stubGlobal('fetch', vi.fn());

// Mock the environment variables for API keys
vi.stubEnv('VITE_GOOGLE_API_KEY', 'test-google-api-key');
vi.stubEnv('VITE_GOOGLE_CX', 'test-google-cx');
vi.stubEnv('VITE_OPENAI_API_KEY', 'test-openai-api-key');

describe('WebSearchTool', () => {
  let tool: WebSearchTool;

  beforeEach(() => {
    tool = new WebSearchTool();
    vi.clearAllMocks();
  });

  it('should successfully search and summarize results', async () => {
    const mockQuery = 'What is Vitest?';
    const mockSearchResults = {
      items: [
        { title: 'Vitest', snippet: 'A blazing fast unit-test framework.' },
        { title: 'Getting Started', snippet: 'How to install and use Vitest.' },
      ],
    };
    const mockSummary = 'Vitest is a fast unit-test framework.';

    // Mock Google Search API call
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSearchResults),
    });

    // Mock OpenAI API call
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: mockSummary } }] }),
    });

    const result = await tool.execute({ query: mockQuery });

    expect(result.success).toBe(true);
    expect(result.output?.summary).toBe(mockSummary);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle Google Search API failure', async () => {
    const mockQuery = 'test';
    (fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await tool.execute({ query: mockQuery });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Google Search API request failed');
  });

  it('should handle Summarization API failure', async () => {
    const mockQuery = 'test';
    const mockSearchResults = { items: [{ title: 'Test', snippet: 'A test snippet.' }] };

    // Mock successful search
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSearchResults),
    });

    // Mock failed summary
    (fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await tool.execute({ query: mockQuery });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Summarization API request failed');
  });

  it('should handle no search results', async () => {
    const mockQuery = 'query with no results';
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] }), // No items
    });

    const result = await tool.execute({ query: mockQuery });

    expect(result.success).toBe(true);
    expect(result.output?.summary).toBe('No relevant search results found.');
    expect(fetch).toHaveBeenCalledTimes(1); // Summarize should not be called
  });

  it('should return an error if no query is provided', async () => {
    const result = await tool.execute({ query: '' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('A valid search query must be provided.');
  });
});
