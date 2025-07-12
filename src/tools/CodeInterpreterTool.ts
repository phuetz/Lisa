/**
 * CodeInterpreterTool: A tool for executing Python code in a sandboxed environment using Pyodide.
 */
import { loadPyodide, type PyodideInterface } from 'pyodide';

interface ExecuteProps {
  code: string;
}

interface ExecuteResult {
  success: boolean;
  output?: any;
  error?: string;
}

export class CodeInterpreterTool {
  name = 'CodeInterpreterTool';
  description = 'Executes Python code in a sandboxed environment. The final expression or a variable named `result` will be returned.';

  private static pyodideInstance: Promise<PyodideInterface> | null = null;

  private static getPyodide(): Promise<PyodideInterface> {
    if (this.pyodideInstance) {
      return this.pyodideInstance;
    }

    console.log('Initializing Pyodide...');
    this.pyodideInstance = loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/',
    }).then(pyodide => {
      console.log('Pyodide initialized successfully.');
      return pyodide;
    }).catch((error: Error) => {
      console.error('Failed to initialize Pyodide:', error);
      this.pyodideInstance = null; // Reset on failure to allow retry
      throw error;
    });

    return this.pyodideInstance;
  }

  async execute({ code }: ExecuteProps): Promise<ExecuteResult> {
    if (!code || typeof code !== 'string') {
      return { success: false, error: 'A valid code string must be provided.' };
    }

    try {
      const pyodide = await CodeInterpreterTool.getPyodide();
      // You can load packages if needed, e.g., await pyodide.loadPackage('numpy');
      const result = await pyodide.runPythonAsync(code);
      return { success: true, output: result };
    } catch (error: unknown) {
      console.error(`${this.name} execution failed:`, error);
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}
