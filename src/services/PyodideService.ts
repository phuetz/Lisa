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
   * Style VS Code avec coloration syntaxique
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
    font-family: 'Consolas', 'Monaco', 'Fira Code', monospace;
    background: #1e1e1e;
    color: #d4d4d4;
    font-size: 14px;
    line-height: 1.5;
  }

  /* Container */
  .container { display: flex; flex-direction: column; height: 100vh; }

  /* Code Editor Panel - Style VS Code */
  .editor {
    flex: 0 0 auto;
    max-height: 50%;
    overflow: auto;
    background: #1e1e1e;
    border-bottom: 1px solid #3c3c3c;
  }
  .editor-header {
    background: #252526;
    padding: 6px 12px;
    font-size: 12px;
    color: #969696;
    border-bottom: 1px solid #3c3c3c;
    display: flex;
    align-items: center;
    gap: 8px;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .editor-tab {
    background: #1e1e1e;
    padding: 4px 12px;
    border-radius: 3px 3px 0 0;
    color: #d4d4d4;
    font-size: 12px;
  }

  /* Code lines */
  .code-wrapper { display: table; width: 100%; }
  .line {
    display: table-row;
    height: 21px;
  }
  .line:hover { background: #2a2d2e; }
  .line-num {
    display: table-cell;
    width: 50px;
    padding: 0 16px 0 8px;
    text-align: right;
    color: #858585;
    background: #1e1e1e;
    user-select: none;
    vertical-align: top;
    font-size: 14px;
  }
  .line-code {
    display: table-cell;
    padding: 0 16px 0 8px;
    white-space: pre;
    vertical-align: top;
  }

  /* Syntax Highlighting - VS Code Dark+ Theme */
  .kw { color: #c586c0; }           /* import, from, def, class, if, for, while, return */
  .kw-ctrl { color: #c586c0; }      /* if, else, for, while, try, except */
  .kw-const { color: #569cd6; }     /* True, False, None */
  .fn { color: #dcdcaa; }           /* function names */
  .fn-call { color: #dcdcaa; }      /* function calls */
  .cls { color: #4ec9b0; }          /* class names */
  .str { color: #ce9178; }          /* strings */
  .num { color: #b5cea8; }          /* numbers */
  .cm { color: #6a9955; }           /* comments */
  .op { color: #d4d4d4; }           /* operators */
  .var { color: #9cdcfe; }          /* variables */
  .param { color: #9cdcfe; }        /* parameters */
  .self { color: #569cd6; }         /* self */
  .mod { color: #4ec9b0; }          /* module names */
  .method { color: #dcdcaa; }       /* methods */

  /* Output Panel */
  .output-panel {
    flex: 1;
    background: #1e1e1e;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .output-header {
    background: #252526;
    padding: 6px 12px;
    font-size: 12px;
    color: #969696;
    border-bottom: 1px solid #3c3c3c;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .output-content {
    flex: 1;
    overflow: auto;
    padding: 8px 16px;
    font-size: 13px;
  }

  /* Loading */
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #569cd6;
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid #3c3c3c;
    border-top-color: #569cd6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
  }
  .progress-bar {
    width: 180px;
    height: 3px;
    background: #3c3c3c;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 8px;
  }
  .progress-fill {
    height: 100%;
    background: #569cd6;
    width: 0%;
    transition: width 0.3s;
  }
  .status { margin-top: 8px; font-size: 11px; color: #858585; }

  /* Output lines */
  .stdout { color: #4ec9b0; }
  .stderr { color: #f14c4c; }
  .out-line { padding: 1px 0; }
  .success {
    color: #4ec9b0;
    margin-top: 8px;
    padding: 4px 0;
    border-top: 1px solid #3c3c3c;
  }
  .error-box {
    color: #f14c4c;
    background: rgba(241,76,76,0.1);
    padding: 8px 12px;
    border-radius: 4px;
    border-left: 3px solid #f14c4c;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style></head>
<body>
  <div class="container">
    <div class="editor">
      <div class="editor-header">
        <span class="editor-tab">📄 script.py</span>
      </div>
      <div class="code-wrapper" id="code-display"></div>
    </div>

    <div class="output-panel">
      <div class="output-header">
        <span>▶ OUTPUT</span>
        <span id="output-count" style="margin-left:auto;color:#4ec9b0"></span>
      </div>
      <div class="output-content" id="output-content">
        <div class="loading">
          <div class="spinner"></div>
          <div id="status-text">Initializing Python...</div>
          <div class="progress-bar"><div class="progress-fill" id="progress"></div></div>
          <div class="status" id="package-status"></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const output = document.getElementById('output-content');
    const codeDisplay = document.getElementById('code-display');
    const pythonCode = decodeURIComponent(escape(atob('${codeBase64}')));
    const packagesToLoad = ${packagesJson};
    let outputLineCount = 0;
    let outputCleared = false;

    // VS Code style syntax highlighting
    function highlight(code) {
      let html = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Comments first (preserve them)
      const comments = [];
      html = html.replace(/#.*/g, match => {
        comments.push(match);
        return '___COMMENT_' + (comments.length - 1) + '___';
      });

      // Strings
      html = html.replace(/("""[\\s\\S]*?"""|'''[\\s\\S]*?'''|"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')/g,
        '<span class="str">$1</span>');

      // Numbers
      html = html.replace(/\\b(\\d+\\.?\\d*e?[+-]?\\d*)\\b/g, '<span class="num">$1</span>');

      // Keywords
      html = html.replace(/\\b(import|from|as)\\b/g, '<span class="kw">$1</span>');
      html = html.replace(/\\b(def|class|lambda)\\b/g, '<span class="kw">$1</span>');
      html = html.replace(/\\b(if|elif|else|for|while|try|except|finally|with|return|yield|raise|pass|break|continue|and|or|not|in|is)\\b/g,
        '<span class="kw-ctrl">$1</span>');
      html = html.replace(/\\b(True|False|None)\\b/g, '<span class="kw-const">$1</span>');

      // self
      html = html.replace(/\\bself\\b/g, '<span class="self">self</span>');

      // Function definitions
      html = html.replace(/(<span class="kw">def<\\/span>\\s+)(\\w+)/g, '$1<span class="fn">$2</span>');
      html = html.replace(/(<span class="kw">class<\\/span>\\s+)(\\w+)/g, '$1<span class="cls">$2</span>');

      // Function calls (word followed by parenthesis)
      html = html.replace(/\\b([a-z_]\\w*)\\s*\\(/gi, (match, name) => {
        // Skip if already highlighted
        if (match.includes('<span')) return match;
        return '<span class="fn-call">' + name + '</span>(';
      });

      // Module names after import/from
      html = html.replace(/(<span class="kw">import<\\/span>\\s+)(\\w+)/g, '$1<span class="mod">$2</span>');
      html = html.replace(/(<span class="kw">from<\\/span>\\s+)(\\w+)/g, '$1<span class="mod">$2</span>');

      // Restore comments
      html = html.replace(/___COMMENT_(\\d+)___/g, (_, i) =>
        '<span class="cm">' + comments[parseInt(i)] + '</span>');

      return html;
    }

    // Display code with line numbers
    function displayCode() {
      const lines = pythonCode.split('\\n');
      let html = '';

      lines.forEach((line, i) => {
        html += '<div class="line">' +
          '<span class="line-num">' + (i + 1) + '</span>' +
          '<span class="line-code">' + highlight(line) + '</span>' +
          '</div>';
      });

      codeDisplay.innerHTML = html;
    }

    displayCode();

    function sendToConsole(method, message) {
      try {
        window.parent.postMessage({ type: 'console', method, message }, '*');
      } catch(e) {}
    }

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

    function appendOutput(text, className) {
      if (!text) return;

      if (!outputCleared) {
        output.innerHTML = '';
        outputCleared = true;
      }

      const div = document.createElement('div');
      div.className = 'out-line ' + className;
      div.textContent = text;
      output.appendChild(div);

      outputLineCount++;
      document.getElementById('output-count').textContent = outputLineCount + ' line' + (outputLineCount > 1 ? 's' : '');

      sendToConsole(className === 'stderr' ? 'error' : 'log', text);
    }

    async function run() {
      const startTime = Date.now();
      try {
        updateProgress(10, 'Loading Pyodide...');

        const pyodide = await loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
        });

        updateProgress(40, 'Installing packages...');

        if (packagesToLoad.length > 0) {
          let loaded = 0;
          for (const pkg of packagesToLoad) {
            try {
              updateProgress(40 + (loaded / packagesToLoad.length) * 40, 'Installing ' + pkg + '...');
              await pyodide.loadPackage(pkg);
              loaded++;
            } catch (e) {
              console.warn('Package ' + pkg + ' not available:', e.message);
            }
          }
        }

        updateProgress(85, 'Running code...');

        let stdoutBuffer = '';
        let stderrBuffer = '';

        pyodide.setStdout({
          write: (text) => {
            stdoutBuffer += text;
            const lines = stdoutBuffer.split('\\n');
            while (lines.length > 1) {
              const line = lines.shift();
              if (line !== undefined) appendOutput(line, 'stdout');
            }
            stdoutBuffer = lines[0] || '';
            return text.length;
          },
          isatty: () => true
        });

        pyodide.setStderr({
          write: (text) => {
            stderrBuffer += text;
            const lines = stderrBuffer.split('\\n');
            while (lines.length > 1) {
              const line = lines.shift();
              if (line !== undefined) appendOutput(line, 'stderr');
            }
            stderrBuffer = lines[0] || '';
            return text.length;
          },
          isatty: () => true
        });

        await pyodide.runPythonAsync(pythonCode);

        if (stdoutBuffer) appendOutput(stdoutBuffer, 'stdout');
        if (stderrBuffer) appendOutput(stderrBuffer, 'stderr');

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        if (!outputCleared) {
          output.innerHTML = '';
        }
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.textContent = '✓ Done in ' + duration + 's';
        output.appendChild(successDiv);

        sendToConsole('log', '✓ Completed in ' + duration + 's');
      } catch(e) {
        output.innerHTML = '<div class="error-box">Error: ' + e.message + '</div>';
        sendToConsole('error', e.message);
      }
    }
    run();
  </script>
</body></html>`;
  }
}

export const pyodideService = new PyodideServiceClass();
export default pyodideService;
