import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodeInterpreterAgent } from '../CodeInterpreterAgent';
import { CodeInterpreterTool } from '../../tools/CodeInterpreterTool';

// Mock the tool
vi.mock('../../tools/CodeInterpreterTool');

describe('CodeInterpreterAgent', () => {
  let agent: CodeInterpreterAgent;
  let mockTool: CodeInterpreterTool;

  beforeEach(() => {
    // We create a mock instance of the tool before each test
    mockTool = new CodeInterpreterTool();
    // We spy on the 'execute' method of our mock tool instance
    vi.spyOn(mockTool, 'execute');
    // We tell the mocked constructor of CodeInterpreterTool to return our mock instance
    vi.mocked(CodeInterpreterTool).mockImplementation(() => mockTool);

    // Now, when we create a CodeInterpreterAgent, it will use our mock tool
    agent = new CodeInterpreterAgent();
    vi.clearAllMocks();
  });

  it('should call the tool and return its successful output', async () => {
    const code = 'print("hello")';
    const toolResult = { success: true, output: 'hello' };
    vi.mocked(mockTool.execute).mockResolvedValue(toolResult);

    const result = await agent.execute({ code });

    expect(mockTool.execute).toHaveBeenCalledWith({ code });
    expect(result.success).toBe(true);
    expect(result.output).toBe('hello');
  });

  it('should handle tool execution failure', async () => {
    const code = '1 / 0';
    const error = 'Division by zero';
    const toolResult = { success: false, error };
    vi.mocked(mockTool.execute).mockResolvedValue(toolResult);

    const result = await agent.execute({ code });

    expect(mockTool.execute).toHaveBeenCalledWith({ code });
    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
  });

  it('should return an error if no code is provided', async () => {
    const result = await agent.execute({ code: '' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('A valid code string must be provided.');
    expect(mockTool.execute).not.toHaveBeenCalled();
  });

  it('should handle unexpected exceptions from the tool', async () => {
    const code = 'some code';
    const errorMessage = 'Unexpected tool failure';
    vi.mocked(mockTool.execute).mockRejectedValue(new Error(errorMessage));

    const result = await agent.execute({ code });

    expect(result.success).toBe(false);
    expect(result.error).toBe(errorMessage);
  });
});
