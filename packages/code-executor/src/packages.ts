/**
 * Package detection and management for Pyodide
 */

/**
 * Packages available via pyodide.loadPackage (built-in)
 */
export const BUILTIN_PACKAGES = [
  'numpy',
  'pandas',
  'scipy',
  'scikit-learn',
  'matplotlib',
  'Pillow',
  'sympy',
  'networkx',
  'statsmodels',
  'seaborn',
  'bokeh',
  'sqlalchemy',
  'beautifulsoup4',
  'lxml',
  'html5lib',
  'openpyxl',
  'xlrd',
  'pyyaml',
  'regex',
  'jsonschema',
  'pyparsing',
  'packaging'
] as const;

/**
 * Packages that need micropip installation
 */
export const MICROPIP_PACKAGES = [
  'pyodide-http',
  'requests',
  'httpx',
  'aiohttp',
  'fastapi',
  'pydantic',
  'rich',
  'typer',
  'click'
] as const;

/**
 * Package aliases (import name -> package name)
 */
export const PACKAGE_ALIASES: Record<string, string> = {
  'sklearn': 'scikit-learn',
  'PIL': 'Pillow',
  'cv2': 'opencv-python',
  'bs4': 'beautifulsoup4',
  'yaml': 'pyyaml',
  'plt': 'matplotlib'
};

/**
 * Detect required packages from Python code
 */
export function detectPackages(code: string): {
  builtin: string[];
  micropip: string[];
} {
  const builtin: string[] = [];
  const micropip: string[] = [];
  
  // Match import statements
  const importRegex = /(?:^|\n)\s*(?:import|from)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match: RegExpExecArray | null;
  
  while ((match = importRegex.exec(code)) !== null) {
    const importName = match[1];
    const packageName = PACKAGE_ALIASES[importName] || importName;
    
    if (BUILTIN_PACKAGES.includes(packageName as typeof BUILTIN_PACKAGES[number])) {
      if (!builtin.includes(packageName)) {
        builtin.push(packageName);
      }
    } else if (MICROPIP_PACKAGES.includes(packageName as typeof MICROPIP_PACKAGES[number])) {
      if (!micropip.includes(packageName)) {
        micropip.push(packageName);
      }
    }
  }
  
  // Special detection for common patterns
  if (code.includes('plt.') || code.includes('pyplot')) {
    if (!builtin.includes('matplotlib')) builtin.push('matplotlib');
  }
  
  if (code.includes('pd.') || code.includes('DataFrame')) {
    if (!builtin.includes('pandas')) builtin.push('pandas');
  }
  
  if (code.includes('np.') || code.includes('numpy.')) {
    if (!builtin.includes('numpy')) builtin.push('numpy');
  }
  
  if (code.includes('requests.')) {
    if (!micropip.includes('pyodide-http')) micropip.push('pyodide-http');
    if (!micropip.includes('requests')) micropip.push('requests');
  }
  
  return { builtin, micropip };
}

/**
 * Check if a package is available in Pyodide
 */
export function isPackageAvailable(packageName: string): boolean {
  const normalized = PACKAGE_ALIASES[packageName] || packageName;
  return BUILTIN_PACKAGES.includes(normalized as typeof BUILTIN_PACKAGES[number]) ||
         MICROPIP_PACKAGES.includes(normalized as typeof MICROPIP_PACKAGES[number]);
}
