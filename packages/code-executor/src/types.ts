/**
 * Types for Code Executor
 */

/**
 * Output from code execution
 */
export interface CellOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error';
  name?: 'stdout' | 'stderr';
  text?: string;
  data?: Record<string, string>;
  execution_count?: number;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  outputs: CellOutput[];
  duration: number;
  error?: string;
}

/**
 * Executor configuration
 */
export interface ExecutorConfig {
  /** Pyodide CDN URL */
  pyodideCdn?: string;
  /** Packages to preload */
  preloadPackages?: string[];
  /** Timeout for code execution (ms) */
  timeout?: number;
  /** Enable auto-detection of packages */
  autoDetectPackages?: boolean;
  /** Custom stdout handler */
  onStdout?: (text: string) => void;
  /** Custom stderr handler */
  onStderr?: (text: string) => void;
  /** Loading progress callback */
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Pyodide interface (internal)
 */
export interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched: (text: string) => void }) => void;
  setStderr: (options: { batched: (text: string) => void }) => void;
  loadPackage: (packages: string | string[]) => Promise<void>;
  loadPackagesFromImports: (code: string) => Promise<void>;
  globals: {
    get: (name: string) => unknown;
    set: (name: string, value: unknown) => void;
  };
}

/**
 * Package info
 */
export interface PackageInfo {
  name: string;
  version?: string;
  loaded: boolean;
}

/**
 * Executor state
 */
export interface ExecutorState {
  ready: boolean;
  loading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  loadedPackages: string[];
  error: string | null;
}
