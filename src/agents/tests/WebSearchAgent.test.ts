import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSearchAgent } from '../WebSearchAgent';
import { WebSearchTool } from '../../tools/WebSearchTool';

// Mock the tool
vi.mock('../../tools/WebSearchTool');

describe('WebSearchAgent', () => {
  let agent: WebSearchAgent;
  let mockTool: WebSearchTool;

  beforeEach(() => {
    mockTool = new WebSearchTool();
    agent = new WebSearchAgent();
    vi.clearAllMocks();
  });

  it('should call the tool and return its successful summary', async () => {
    const mockQuery = 'test query';
    const mockSummary = 'This is a successful summary.';
    const mockToolResult = { success: true, output: { summary: mockSummary } };

    const mockExecute = vi.spyOn(mockTool, 'execute').mockResolvedValue(mockToolResult);
    vi.mocked(WebSearchTool).mockImplementation(() => mockTool);

    // Re-create agent to ensure it uses the mocked constructor
    agent = new WebSearchAgent();

    const result = await agent.execute({ query: mockQuery });

    expect(mockExecute).toHaveBeenCalledWith({ query: mockQuery });
    expect(result.success).toBe(true);
    expect(result.output).toBe(mockSummary);
  });

  it('should handle tool execution failure', async () => {
    const mockQuery = 'failing query';
    const mockError = 'Tool failed to execute';
    const mockToolResult = { success: false, error: mockError, output: null };

    const mockExecute = vi.spyOn(mockTool, 'execute').mockResolvedValue(mockToolResult);
    vi.mocked(WebSearchTool).mockImplementation(() => mockTool);
    agent = new WebSearchAgent();

    const result = await agent.execute({ query: mockQuery });

    expect(mockExecute).toHaveBeenCalledWith({ query: mockQuery });
    expect(result.success).toBe(false);
    expect(result.error).toBe(mockError);
  });

  it('should return an error if no query is provided', async () => {
    const result = await agent.execute({ query: '' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('A valid search query must be provided.');
  });
});
