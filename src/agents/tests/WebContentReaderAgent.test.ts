import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebContentReaderAgent } from '../WebContentReaderAgent';
import { WebContentReaderTool } from '../../tools/WebContentReaderTool';

// Mock the tool
vi.mock('../../tools/WebContentReaderTool');

describe('WebContentReaderAgent', () => {
  let agent: WebContentReaderAgent;
  let mockTool: WebContentReaderTool;

  beforeEach(() => {
    // Manually create an instance of the mocked tool
    mockTool = new WebContentReaderTool();
    // Create the agent, which will use the mocked tool internally
    agent = new WebContentReaderAgent();
    vi.clearAllMocks();
  });

  it('should call the tool and return its successful summary', async () => {
    const mockUrl = 'https://example.com';
    const mockSummary = 'This is a successful summary.';
    const mockToolResult = { success: true, output: { summary: mockSummary } };

    // Setup the mock for the tool's execute method
    const mockExecute = vi.spyOn(mockTool, 'execute').mockResolvedValue(mockToolResult);
    // Since the agent creates its own tool instance, we need to mock the constructor to return our mockTool
    vi.mocked(WebContentReaderTool).mockImplementation(() => mockTool);

    // Re-create agent to ensure it uses the mocked constructor
    agent = new WebContentReaderAgent();

    const result = await agent.execute({ url: mockUrl });

    expect(mockExecute).toHaveBeenCalledWith({ url: mockUrl });
    expect(result.success).toBe(true);
    expect(result.output).toBe(mockSummary);
  });

  it('should handle tool execution failure', async () => {
    const mockUrl = 'https://failing-url.com';
    const mockError = 'Tool failed to execute';
    const mockToolResult = { success: false, error: mockError, output: null };

    const mockExecute = vi.spyOn(mockTool, 'execute').mockResolvedValue(mockToolResult);
    vi.mocked(WebContentReaderTool).mockImplementation(() => mockTool);
    agent = new WebContentReaderAgent();

    const result = await agent.execute({ url: mockUrl });

    expect(mockExecute).toHaveBeenCalledWith({ url: mockUrl });
    expect(result.success).toBe(false);
    expect(result.error).toBe(mockError);
  });

  it('should return an error if no URL is provided', async () => {
    const result = await agent.execute({ url: '' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('A valid URL must be provided.');
  });
});
