import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodeInterpreterTool } from '../CodeInterpreterTool';
import * as pyodide from 'pyodide';

// Mock the entire pyodide module
vi.mock('pyodide', () => ({
  loadPyodide: vi.fn(),
}));

describe('CodeInterpreterTool', () => {
  let tool: CodeInterpreterTool;
  const mockPyodide = {
    runPythonAsync: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tool = new CodeInterpreterTool();
    // Reset the singleton instance for clean tests
    (CodeInterpreterTool as any).pyodideInstance = null;
  });

  it('should execute code successfully', async () => {
    const code = '1 + 1';
    const expectedResult = 2;
    mockPyodide.runPythonAsync.mockResolvedValue(expectedResult);
    vi.mocked(pyodide.loadPyodide).mockResolvedValue(mockPyodide as any);

    const result = await tool.execute({ code });

    expect(pyodide.loadPyodide).toHaveBeenCalledOnce();
    expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith(code);
    expect(result.success).toBe(true);
    expect(result.output).toBe(expectedResult);
  });

  it('should handle code execution errors', async () => {
    const code = '1 / 0';
    const errorMessage = 'ZeroDivisionError: division by zero';
    mockPyodide.runPythonAsync.mockRejectedValue(new Error(errorMessage));
    vi.mocked(pyodide.loadPyodide).mockResolvedValue(mockPyodide as any);

    const result = await tool.execute({ code });

    expect(result.success).toBe(false);
    expect(result.error).toBe(errorMessage);
  });

  it('should handle Pyodide initialization failure', async () => {
    const code = '1 + 1';
    const errorMessage = 'Failed to load Pyodide';
    vi.mocked(pyodide.loadPyodide).mockRejectedValue(new Error(errorMessage));

    const result = await tool.execute({ code });

    expect(result.success).toBe(false);
    expect(result.error).toBe(errorMessage);
  });

  it('should return an error if no code is provided', async () => {
    const result = await tool.execute({ code: '' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('A valid code string must be provided.');
    expect(pyodide.loadPyodide).not.toHaveBeenCalled();
  });

  it('should initialize Pyodide only once', async () => {
    const code1 = '1 + 1';
    const code2 = '2 + 2';
    mockPyodide.runPythonAsync.mockResolvedValue(0);
    vi.mocked(pyodide.loadPyodide).mockResolvedValue(mockPyodide as any);

    await tool.execute({ code: code1 });
    await tool.execute({ code: code2 });

    expect(pyodide.loadPyodide).toHaveBeenCalledOnce();
  });
});
