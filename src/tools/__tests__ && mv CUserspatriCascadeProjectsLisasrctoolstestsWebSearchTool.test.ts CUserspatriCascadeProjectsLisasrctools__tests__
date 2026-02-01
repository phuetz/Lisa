import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { WebContentReaderTool } from '../WebContentReaderTool';

// Mock global fetch and DOMParser before all tests
vi.stubGlobal('fetch', vi.fn());

const mockDOMParser = {
  parseFromString: vi.fn(),
};
vi.stubGlobal('DOMParser', vi.fn(() => mockDOMParser));

// Mock the environment variable for OpenAI API key
vi.stubEnv('VITE_OPENAI_API_KEY', 'test-openai-key');

describe('WebContentReaderTool', () => {
  let tool: WebContentReaderTool;

  beforeEach(() => {
    tool = new WebContentReaderTool();
    vi.clearAllMocks();
  });

  it('should successfully fetch, parse, and summarize content', async () => {
    const mockUrl = 'https://example.com';
    const mockHtml = '<html><body><main>This is the main content.</main></body></html>';
    const mockSummary = 'This is a summary.';

    // Mock the fetch call for the content URL
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    // Mock the fetch call for the OpenAI API
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: mockSummary } }] }),
    });

    // Mock DOMParser
    const mockDocument = {
      querySelectorAll: vi.fn(() => ({ forEach: vi.fn() })),
      querySelector: vi.fn(() => ({ innerText: 'This is the main content.' })),
    };
    mockDOMParser.parseFromString.mockReturnValue(mockDocument);

    const result = await tool.execute({ url: mockUrl });

    expect(result.success).toBe(true);
    expect(result.output?.summary).toBe(mockSummary);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle fetch failure gracefully', async () => {
    const mockUrl = 'https://failing-url.com';
    (fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found'), // Add text method for error handling
    });

    const result = await tool.execute({ url: mockUrl });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to fetch URL content');
  });

  it('should handle summarization API failure gracefully', async () => {
    const mockUrl = 'https://example.com';
    const mockHtml = '<html><body><main>Content to summarize.</main></body></html>';

    // Mock content fetch
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    // Mock OpenAI API failure
    (fetch as Mock).mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('Internal Server Error'),
    });

    // Mock DOMParser
    const mockDocument = {
        querySelectorAll: vi.fn(() => ({ forEach: vi.fn() })),
        querySelector: vi.fn(() => ({ innerText: 'Content to summarize.' })),
      };
    mockDOMParser.parseFromString.mockReturnValue(mockDocument);

    const result = await tool.execute({ url: mockUrl });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Summarization API request failed');
  });

  it('should return an error if no meaningful content is extracted', async () => {
    const mockUrl = 'https://empty-page.com';
    const mockHtml = '<html><body><nav>Only a nav bar</nav></body></html>';

    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    // Mock DOMParser to return no content
    const mockDocument = {
        querySelectorAll: vi.fn(() => ({ forEach: vi.fn() })),
        querySelector: vi.fn(() => ({ innerText: ' ' })),
      };
    mockDOMParser.parseFromString.mockReturnValue(mockDocument);

    const result = await tool.execute({ url: mockUrl });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Could not extract meaningful content from the URL.');
  });

  it('should return an error if no URL is provided', async () => {
    const result = await tool.execute({ url: '' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('A valid URL must be provided.');
  });
});
