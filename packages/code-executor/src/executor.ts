/**
 * Python Code Executor using Pyodide
 */

import type { CellOutput, ExecutorConfig, ExecutionResult, PyodideInterface } from './types';
import { detectPackages } from './packages';

const DEFAULT_PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/';

declare global {
  interface Window {
    loadPyodide: (options: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

let pyodideInstance: PyodideInterface | null = null;
let pyodideLoading: Promise<PyodideInterface> | null = null;
const loadedPackages = new Set<string>();

/**
 * Load Pyodide instance (singleton)
 */
async function loadPyodideInstance(
  config: ExecutorConfig = {}
): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoading) return pyodideLoading;

  const cdnUrl = config.pyodideCdn || DEFAULT_PYODIDE_CDN;

  pyodideLoading = (async () => {
    config.onProgress?.(0, 'Loading Pyodide...');

    // Load Pyodide script if not already loaded
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${cdnUrl}pyodide.js`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide'));
        document.head.appendChild(script);
      });
    }

    config.onProgress?.(30, 'Initializing Python runtime...');

    const pyodide = await window.loadPyodide({
      indexURL: cdnUrl
    });

    config.onProgress?.(60, 'Loading core packages...');

    // Load micropip for package installation
    await pyodide.loadPackage(['micropip']);
    loadedPackages.add('micropip');

    // Preload additional packages if specified
    if (config.preloadPackages?.length) {
      config.onProgress?.(80, `Loading ${config.preloadPackages.join(', ')}...`);
      await pyodide.loadPackage(config.preloadPackages);
      config.preloadPackages.forEach(pkg => loadedPackages.add(pkg));
    }

    config.onProgress?.(100, 'Ready');
    pyodideInstance = pyodide;
    return pyodide;
  })();

  return pyodideLoading;
}

/**
 * Install packages via micropip
 */
async function installMicropipPackages(
  pyodide: PyodideInterface,
  packages: string[]
): Promise<void> {
  for (const pkg of packages) {
    if (!loadedPackages.has(pkg)) {
      await pyodide.runPythonAsync(`
import micropip
await micropip.install('${pkg}')
`);
      loadedPackages.add(pkg);
    }
  }
}

/**
 * Setup matplotlib for headless rendering
 */
async function setupMatplotlib(pyodide: PyodideInterface): Promise<void> {
  await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io, base64

def _lisa_show_plot():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#1a1a2e')
    buf.seek(0)
    img_data = base64.b64encode(buf.read()).decode('utf-8')
    plt.clf()
    return img_data
`);
}

/**
 * Setup requests compatibility via pyodide-http
 */
async function setupRequests(pyodide: PyodideInterface): Promise<void> {
  await installMicropipPackages(pyodide, ['pyodide-http', 'requests']);
  await pyodide.runPythonAsync(`
import pyodide_http
pyodide_http.patch_all()
import requests
`);
}

/**
 * Execute Python code
 */
export async function executeCode(
  code: string,
  config: ExecutorConfig = {}
): Promise<ExecutionResult> {
  const startTime = performance.now();
  const outputs: CellOutput[] = [];
  let stdoutBuffer = '';
  let stderrBuffer = '';

  try {
    const pyodide = await loadPyodideInstance(config);

    // Setup output capture
    pyodide.setStdout({
      batched: (text: string) => {
        stdoutBuffer += text;
        config.onStdout?.(text);
      }
    });
    pyodide.setStderr({
      batched: (text: string) => {
        stderrBuffer += text;
        config.onStderr?.(text);
      }
    });

    // Auto-detect and install packages
    if (config.autoDetectPackages !== false) {
      const { builtin, micropip } = detectPackages(code);

      // Load builtin packages
      const toLoad = builtin.filter(pkg => !loadedPackages.has(pkg));
      if (toLoad.length > 0) {
        await pyodide.loadPackage(toLoad);
        toLoad.forEach(pkg => loadedPackages.add(pkg));
      }

      // Install micropip packages
      if (micropip.length > 0) {
        await installMicropipPackages(pyodide, micropip);
      }

      // Setup matplotlib if needed
      if (builtin.includes('matplotlib') && !loadedPackages.has('matplotlib-setup')) {
        await setupMatplotlib(pyodide);
        loadedPackages.add('matplotlib-setup');
      }

      // Setup requests if needed
      if (micropip.includes('requests') && !loadedPackages.has('requests-setup')) {
        await setupRequests(pyodide);
        loadedPackages.add('requests-setup');
      }
    }

    // Execute the code
    const result = await pyodide.runPythonAsync(code);

    // Collect stdout
    if (stdoutBuffer) {
      outputs.push({
        output_type: 'stream',
        name: 'stdout',
        text: stdoutBuffer
      });
    }

    // Collect stderr
    if (stderrBuffer) {
      outputs.push({
        output_type: 'stream',
        name: 'stderr',
        text: stderrBuffer
      });
    }

    // Handle matplotlib plots
    if (code.includes('plt.show()') || code.includes('plt.savefig')) {
      try {
        const imageBase64 = await pyodide.runPythonAsync('_lisa_show_plot()') as string;
        if (imageBase64) {
          outputs.push({
            output_type: 'display_data',
            data: {
              'image/png': imageBase64,
              'text/plain': '<Figure>'
            }
          });
        }
      } catch {
        // No figure to show
      }
    }

    // Handle return value
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

    // Default success message if no output
    if (outputs.length === 0) {
      outputs.push({
        output_type: 'stream',
        name: 'stdout',
        text: 'OK\n'
      });
    }

    return {
      success: true,
      outputs,
      duration: performance.now() - startTime
    };

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

    return {
      success: false,
      outputs,
      duration: performance.now() - startTime,
      error: errorMessage
    };
  }
}

/**
 * Check if Pyodide is ready
 */
export function isReady(): boolean {
  return pyodideInstance !== null;
}

/**
 * Preload Pyodide and packages
 */
export async function preload(config: ExecutorConfig = {}): Promise<void> {
  await loadPyodideInstance(config);
}

/**
 * Get list of loaded packages
 */
export function getLoadedPackages(): string[] {
  return Array.from(loadedPackages);
}

/**
 * Reset the executor (for testing)
 */
export function reset(): void {
  pyodideInstance = null;
  pyodideLoading = null;
  loadedPackages.clear();
}

/**
 * Create a new executor instance with custom config
 */
export function createExecutor(config: ExecutorConfig = {}) {
  return {
    execute: (code: string) => executeCode(code, config),
    isReady,
    preload: () => preload(config),
    getLoadedPackages,
    reset
  };
}
