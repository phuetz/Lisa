/**
 * Pyodide Service
 * Gère le préchargement et le cache de Pyodide pour une exécution Python rapide
 */

type PyodideStatus = 'idle' | 'loading' | 'ready' | 'error';

interface PyodideState {
  status: PyodideStatus;
  progress: number;
  error?: string;
}

class PyodideServiceClass {
  private state: PyodideState = { status: 'idle', progress: 0 };
  private listeners: Set<(state: PyodideState) => void> = new Set();
  private preloadPromise: Promise<void> | null = null;

  getState(): PyodideState {
    return { ...this.state };
  }

  subscribe(listener: (state: PyodideState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  private setState(partial: Partial<PyodideState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  /**
   * Précharge Pyodide en arrière-plan
   */
  async preload(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;
    if (this.state.status === 'ready') return;

    this.preloadPromise = this.doPreload();
    return this.preloadPromise;
  }

  private async doPreload(): Promise<void> {
    this.setState({ status: 'loading', progress: 0 });

    try {
      // Vérifier le cache du navigateur
      const cacheAvailable = await this.checkCache();
      if (cacheAvailable) {
        this.setState({ progress: 50 });
      }

      // Précharger le script Pyodide
      await this.preloadScript('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');
      this.setState({ progress: 100, status: 'ready' });
    } catch (error) {
      this.setState({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Erreur de chargement'
      });
    }
  }

  private async checkCache(): Promise<boolean> {
    try {
      const cache = await caches.open('pyodide-cache');
      const response = await cache.match('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');
      return !!response;
    } catch {
      return false;
    }
  }

  private preloadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Vérifier si déjà chargé
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('Failed to preload Pyodide'));
      document.head.appendChild(link);

      // Timeout de 30s
      setTimeout(() => resolve(), 30000);
    });
  }

  /**
   * Détecte les packages Python importés dans le code
   */
  private detectPackages(code: string): string[] {
    const packages: Set<string> = new Set();
    
    // Packages Pyodide disponibles
    const availablePackages = [
      'numpy', 'pandas', 'matplotlib', 'scipy', 'scikit-learn',
      'sympy', 'networkx', 'pillow', 'opencv-python', 'seaborn',
      'statsmodels', 'pytz', 'regex', 'pyyaml', 'lxml', 'beautifulsoup4',
      'sqlalchemy', 'openpyxl', 'xlrd'
    ];
    
    // Mapping des noms d'import vers les noms de packages
    const packageMapping: Record<string, string> = {
      'np': 'numpy',
      'pd': 'pandas',
      'plt': 'matplotlib',
      'cv2': 'opencv-python',
      'cv': 'opencv-python',
      'sns': 'seaborn',
      'sklearn': 'scikit-learn',
      'PIL': 'pillow',
      'bs4': 'beautifulsoup4',
      'yaml': 'pyyaml'
    };
    
    // Pattern pour détecter les imports
    const importPatterns = [
      /^import\s+(\w+)/gm,                    // import numpy
      /^from\s+(\w+)\s+import/gm,             // from numpy import
      /^import\s+(\w+)\s+as\s+\w+/gm,         // import numpy as np
    ];
    
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const moduleName = match[1];
        const mappedPackage = packageMapping[moduleName] || moduleName;
        if (availablePackages.includes(mappedPackage)) {
          packages.add(mappedPackage);
        }
      }
    }
    
    // Détecter aussi les alias courants
    if (code.includes('np.') && !packages.has('numpy')) packages.add('numpy');
    if (code.includes('pd.') && !packages.has('pandas')) packages.add('pandas');
    if (code.includes('plt.') && !packages.has('matplotlib')) packages.add('matplotlib');
    if (code.includes('sns.') && !packages.has('seaborn')) packages.add('seaborn');
    
    return Array.from(packages);
  }

  /**
   * Génère le HTML optimisé pour l'exécution Python
   */
  generatePythonHTML(code: string): string {
    const codeBase64 = btoa(unescape(encodeURIComponent(code)));
    const packages = this.detectPackages(code);
    const packagesJson = JSON.stringify(packages);
    
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Fira Code', 'JetBrains Mono', monospace; 
    background: #1a1a2e; 
    color: #10a37f; 
    padding: 20px; 
    min-height: 100vh; 
  }
  #output { white-space: pre-wrap; line-height: 1.6; }
  .loading { 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center; 
    height: 80vh; 
    color: #8b5cf6; 
  }
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #333;
    border-top-color: #8b5cf6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }
  .progress-bar {
    width: 200px;
    height: 4px;
    background: #333;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 12px;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #8b5cf6, #10a37f);
    width: 0%;
    transition: width 0.5s ease-out;
  }
  .status { margin-top: 8px; font-size: 12px; color: #888; }
  .error { color: #ef4444; }
  .success { color: #10a37f; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style></head>
<body>
  <div id="output">
    <div class="loading">
      <div class="spinner"></div>
      <div id="status-text">🐍 Initialisation de Python...</div>
      <div class="progress-bar"><div class="progress-fill" id="progress"></div></div>
      <div class="status" id="package-status"></div>
    </div>
  </div>
  <script>
    const output = document.getElementById('output');
    const pythonCode = decodeURIComponent(escape(atob('${codeBase64}')));
    const packagesToLoad = ${packagesJson};
    
    function updateProgress(percent, text) {
      const progress = document.getElementById('progress');
      const statusText = document.getElementById('status-text');
      const packageStatus = document.getElementById('package-status');
      if (progress) progress.style.width = percent + '%';
      if (statusText && text) statusText.textContent = text;
      if (packageStatus && packagesToLoad.length > 0) {
        packageStatus.textContent = 'Packages: ' + packagesToLoad.join(', ');
      }
    }
    
    async function run() {
      const startTime = Date.now();
      try {
        updateProgress(10, '🐍 Chargement de Pyodide...');
        
        const pyodide = await loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
        });
        
        updateProgress(40, '📦 Installation des packages...');
        
        // Charger les packages détectés
        if (packagesToLoad.length > 0) {
          let loaded = 0;
          for (const pkg of packagesToLoad) {
            try {
              updateProgress(40 + (loaded / packagesToLoad.length) * 40, '📦 Installation: ' + pkg + '...');
              await pyodide.loadPackage(pkg);
              loaded++;
            } catch (e) {
              console.warn('Package ' + pkg + ' non disponible:', e.message);
            }
          }
        }
        
        updateProgress(85, '🚀 Exécution du code...');
        
        // Rediriger stdout/stderr
        pyodide.setStdout({ 
          batched: t => { 
            if (output.querySelector('.loading')) output.innerHTML = '';
            output.innerHTML += t + '\\n'; 
          } 
        });
        pyodide.setStderr({ 
          batched: t => { 
            if (output.querySelector('.loading')) output.innerHTML = '';
            output.innerHTML += '<span class="error">' + t + '</span>\\n'; 
          } 
        });
        
        output.innerHTML = '';
        await pyodide.runPythonAsync(pythonCode);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        output.innerHTML += '\\n<span class="success">✓ Exécuté en ' + duration + 's</span>';
      } catch(e) { 
        output.innerHTML = '<span class="error">❌ ' + e.message + '</span>'; 
      }
    }
    run();
  </script>
</body></html>`;
  }
}

export const pyodideService = new PyodideServiceClass();
export default pyodideService;
