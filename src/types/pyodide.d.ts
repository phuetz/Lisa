declare module 'pyodide' {
  export interface PyodideInterface {
    runPythonAsync(code: string): Promise<any>;
    loadPackage(packages: string | string[]): Promise<void>;
    // Add other Pyodide methods you might use here
  }

  export function loadPyodide(options?: {
    indexURL: string;
  }): Promise<PyodideInterface>;
}
