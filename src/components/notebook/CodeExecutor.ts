/**
 * Code Executor - Exécution Python via Pyodide
 * Support: NumPy, Pandas, Matplotlib, SciPy, scikit-learn, SymPy, NetworkX, Seaborn, Plotly
 * 
 * @module CodeExecutor
 * @example
 * ```typescript
 * import { executeCode, preloadPyodide, getLoadedPackages } from './CodeExecutor';
 * 
 * // Preload Pyodide for faster first execution
 * await preloadPyodide();
 * 
 * // Execute Python code
 * const outputs = await executeCode('print("Hello, World!")');
 * ```
 */

import type { CellOutput } from './NotebookEditor';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Pyodide runtime interface */
export interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched: (text: string) => void }) => void;
  setStderr: (options: { batched: (text: string) => void }) => void;
  loadPackage: (packages: string | string[]) => Promise<void>;
  globals: { get: (name: string) => unknown };
}

/** Execution options */
export interface ExecuteOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Callback for stdout */
  onStdout?: (text: string) => void;
  /** Callback for stderr */
  onStderr?: (text: string) => void;
  /** Callback when packages are being loaded */
  onPackageLoad?: (packages: string[]) => void;
}

/** Execution result with metadata */
export interface ExecutionResult {
  outputs: CellOutput[];
  duration: number;
  packagesLoaded: string[];
  success: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Pyodide CDN version */
export const PYODIDE_VERSION = '0.26.2';

/** Pyodide CDN URL */
export const PYODIDE_CDN_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/** Package detection patterns for auto-loading */
export const PACKAGE_PATTERNS: Record<string, string[]> = {
  pandas: ['pandas', 'pd.', 'DataFrame', 'Series', 'read_csv', 'read_json', 'read_excel'],
  scipy: ['scipy', 'from scipy'],
  'scikit-learn': ['sklearn', 'from sklearn'],
  sympy: ['sympy', 'from sympy', 'Symbol', 'solve', 'diff', 'integrate'],
  networkx: ['networkx', 'nx.'],
  seaborn: ['seaborn', 'sns.'],
  plotly: ['plotly', 'px.', 'go.'],
  statsmodels: ['statsmodels', 'sm.'],
  requests: ['requests.get', 'requests.post', 'import requests'],
};

/** Default packages loaded with Pyodide */
export const DEFAULT_PACKAGES = ['numpy', 'micropip'] as const;

// ============================================================================
// State
// ============================================================================

let pyodideInstance: PyodideInterface | null = null;
let pyodideLoading: Promise<PyodideInterface> | null = null;
const loadedPackages: Set<string> = new Set(DEFAULT_PACKAGES);

declare global {
  interface Window {
    loadPyodide: (options: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

// Detect required packages from code
function detectPackages(code: string): string[] {
  const needed: string[] = [];
  for (const [pkg, patterns] of Object.entries(PACKAGE_PATTERNS)) {
    if (patterns.some(p => code.includes(p)) && !loadedPackages.has(pkg)) {
      needed.push(pkg);
    }
  }
  return needed;
}

async function loadPyodideInstance(): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoading) return pyodideLoading;

  pyodideLoading = (async () => {
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide'));
        document.head.appendChild(script);
      });
    }

    const pyodide = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'
    });

    await pyodide.loadPackage(['numpy', 'micropip']);
    pyodideInstance = pyodide;
    return pyodide;
  })();

  return pyodideLoading;
}

export async function executeCode(code: string): Promise<CellOutput[]> {
  const outputs: CellOutput[] = [];
  let stdoutBuffer = '';
  let stderrBuffer = '';

  try {
    const pyodide = await loadPyodideInstance();

    pyodide.setStdout({ batched: (text: string) => { stdoutBuffer += text; } });
    pyodide.setStderr({ batched: (text: string) => { stderrBuffer += text; } });

    // Auto-detect and load required packages
    const neededPackages = detectPackages(code);
    if (neededPackages.length > 0) {
      console.log('[CodeExecutor] Loading packages:', neededPackages);
      for (const pkg of neededPackages) {
        await pyodide.loadPackage([pkg]);
        loadedPackages.add(pkg);
      }
    }

    // Setup matplotlib if needed
    if (code.includes('matplotlib') || code.includes('plt.')) {
      if (!loadedPackages.has('matplotlib')) {
        await pyodide.loadPackage(['matplotlib']);
        loadedPackages.add('matplotlib');
      }
      await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io, base64
def _show_plot():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#1a1a2e')
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')
`);
    }

    // Setup Pillow if needed
    if (code.includes('PIL') || code.includes('Image')) {
      if (!loadedPackages.has('Pillow')) {
        await pyodide.loadPackage(['Pillow']);
        loadedPackages.add('Pillow');
      }
    }

    const result = await pyodide.runPythonAsync(code);

    if (stdoutBuffer) {
      outputs.push({ output_type: 'stream', name: 'stdout', text: stdoutBuffer });
    }

    if (stderrBuffer) {
      outputs.push({ output_type: 'stream', name: 'stderr', text: stderrBuffer });
    }

    if (code.includes('plt.show()') || code.includes('plt.savefig')) {
      try {
        const imageBase64 = await pyodide.runPythonAsync('_show_plot()') as string;
        if (imageBase64) {
          outputs.push({
            output_type: 'display_data',
            data: { 'image/png': imageBase64, 'text/plain': '<Figure>' }
          });
        }
        await pyodide.runPythonAsync('plt.clf()');
      } catch { /* No figure to show */ }
    }

    if (result !== undefined && result !== null) {
      const resultStr = String(result);
      if (resultStr !== 'None' && resultStr !== 'undefined') {
        outputs.push({
          output_type: 'execute_result',
          data: { 'text/plain': resultStr },
          execution_count: 1
        });
      }
    }

    if (outputs.length === 0) {
      outputs.push({ output_type: 'stream', name: 'stdout', text: 'OK\n' });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lines = errorMessage.split('\n');
    const lastLine = lines[lines.length - 1] || '';
    outputs.push({
      output_type: 'error',
      ename: lastLine.split(':')[0] || 'Error',
      evalue: lastLine.split(':').slice(1).join(':').trim() || errorMessage,
      traceback: lines
    });
  }

  return outputs;
}

// ============================================================================
// Utility Functions
// ============================================================================

/** Check if Pyodide is loaded and ready */
export function isPyodideReady(): boolean {
  return pyodideInstance !== null;
}

/** Check if Pyodide is currently loading */
export function isPyodideLoading(): boolean {
  return pyodideLoading !== null && pyodideInstance === null;
}

/** Preload Pyodide for faster first execution */
export async function preloadPyodide(): Promise<void> {
  await loadPyodideInstance();
}

/** Get list of currently loaded packages */
export function getLoadedPackages(): string[] {
  return Array.from(loadedPackages);
}

/** Check if a specific package is loaded */
export function isPackageLoaded(packageName: string): boolean {
  return loadedPackages.has(packageName);
}

/** Detect which packages a code snippet requires */
export function detectRequiredPackages(code: string): string[] {
  return detectPackages(code);
}

/** Execute code with options and return detailed result */
export async function executeCodeWithOptions(
  code: string,
  options: ExecuteOptions = {}
): Promise<ExecutionResult> {
  const startTime = performance.now();
  const packagesLoadedDuringExecution: string[] = [];
  
  // Detect packages before execution
  const neededPackages = detectPackages(code);
  if (neededPackages.length > 0) {
    options.onPackageLoad?.(neededPackages);
    packagesLoadedDuringExecution.push(...neededPackages);
  }
  
  try {
    const outputs = await executeCode(code);
    const duration = performance.now() - startTime;
    
    return {
      outputs,
      duration,
      packagesLoaded: packagesLoadedDuringExecution,
      success: !outputs.some(o => o.output_type === 'error'),
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      outputs: [{
        output_type: 'error',
        ename: 'ExecutionError',
        evalue: error instanceof Error ? error.message : String(error),
        traceback: [],
      }],
      duration,
      packagesLoaded: packagesLoadedDuringExecution,
      success: false,
    };
  }
}

/** Reset Pyodide instance (useful for testing or clearing state) */
export function resetPyodide(): void {
  pyodideInstance = null;
  pyodideLoading = null;
  loadedPackages.clear();
  DEFAULT_PACKAGES.forEach(pkg => loadedPackages.add(pkg));
}

// ============================================================================
// Default Export
// ============================================================================

export default executeCode;
