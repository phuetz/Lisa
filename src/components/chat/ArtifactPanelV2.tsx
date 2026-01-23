/**
 * Artifact Panel V2 - Style Playground
 * Vue split: Éditeur de code à gauche, Prévisualisation à droite
 * Inspiré du Lisa Playground
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  Code,
  Play,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  X,
  Check,
  ExternalLink,
  ChevronDown,
  Terminal,
  ToggleLeft,
  ToggleRight,
  Columns,
  Layout,
} from 'lucide-react';
import { useArtifactPanelStore } from '../../store/artifactPanelStore';
import { pyodideService } from '../../services/PyodideService';

// Language configurations
const LANGUAGES = [
  { id: 'html', label: 'HTML', icon: '🌐', color: '#e34c26', monacoLang: 'html' },
  { id: 'css', label: 'CSS', icon: '🎨', color: '#264de4', monacoLang: 'css' },
  { id: 'javascript', label: 'JavaScript', icon: '⚡', color: '#f7df1e', monacoLang: 'javascript' },
  { id: 'typescript', label: 'TypeScript', icon: '📘', color: '#3178c6', monacoLang: 'typescript' },
  { id: 'python', label: 'Python', icon: '🐍', color: '#3776ab', monacoLang: 'python' },
  { id: 'react', label: 'React', icon: '⚛️', color: '#61dafb', monacoLang: 'javascript' },
] as const;

type ViewMode = 'split' | 'code' | 'preview';

export const ArtifactPanelV2 = () => {
  const { isOpen, artifact, closePanel, updateCode } = useArtifactPanelStore();
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [autoRun, setAutoRun] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const autoRunTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current language config
  const currentLang = LANGUAGES.find(l => l.id === artifact?.type) || LANGUAGES[0];

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        else closePanel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isFullscreen, closePanel]);

  // Generate preview HTML
  const generatePreview = useCallback(() => {
    if (!artifact) return '';
    const code = artifact.code;
    
    // Inject console capture
    const consoleCapture = `
      <script>
        const _originalConsole = { log: console.log, error: console.error, warn: console.warn };
        const _logs = [];
        ['log', 'error', 'warn'].forEach(method => {
          console[method] = (...args) => {
            _originalConsole[method](...args);
            const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
            window.parent.postMessage({ type: 'console', method, message: msg }, '*');
          };
        });
        window.onerror = (msg, url, line) => {
          window.parent.postMessage({ type: 'console', method: 'error', message: msg + ' (line ' + line + ')' }, '*');
        };
      </script>
    `;
    
    switch (artifact.type) {
      case 'html':
        return code.includes('<script>') ? code.replace('<script>', consoleCapture + '<script>') : code + consoleCapture;

      case 'css':
        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${code}</style>${consoleCapture}</head>
<body>
  <div class="demo-container">
    <h1>🎨 CSS Preview</h1>
    <p class="subtitle">Vos styles sont appliqués</p>
    <div class="card"><h2>Card</h2><p>Exemple de carte.</p><button class="btn">Bouton</button></div>
    <div class="grid"><div class="grid-item">1</div><div class="grid-item">2</div><div class="grid-item">3</div></div>
  </div>
</body></html>`;

      case 'javascript':
        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Fira Code',monospace;background:#1a1a2e;color:#10a37f;padding:20px;min-height:100vh;}
  #output{white-space:pre-wrap;line-height:1.6;}
</style>
${consoleCapture}
</head>
<body>
  <div id="output"></div>
  <script>
    try { ${code} } catch(e) { console.error(e.message); }
  </script>
</body></html>`;

      case 'typescript':
        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<script src="https://unpkg.com/typescript@latest/lib/typescript.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Fira Code',monospace;background:#1a1a2e;color:#3178c6;padding:20px;min-height:100vh;}
</style>
${consoleCapture}
</head>
<body>
  <script>
    try {
      const jsCode = ts.transpile(${JSON.stringify(code)}, { target: ts.ScriptTarget.ES2020 });
      eval(jsCode);
    } catch(e) { console.error(e.message); }
  </script>
</body></html>`;

      case 'react':
        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#1a1a2e;color:#fff;min-height:100vh;padding:20px;}
</style>
${consoleCapture}
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try { ${code} } catch(e) { console.error(e.message); document.getElementById('root').innerHTML = '<div style="color:red;padding:20px;">Erreur: '+e.message+'</div>'; }
  </script>
</body></html>`;

      case 'python':
        return pyodideService.generatePythonHTML(code);

      case 'mermaid':
        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<style>body{background:#1a1a2e;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;}</style>
</head>
<body>
  <div class="mermaid">${code}</div>
  <script>mermaid.initialize({startOnLoad:true,theme:'dark'});</script>
</body></html>`;

      default:
        return `<pre style="background:#1a1a2e;color:#fff;padding:20px;margin:0;min-height:100vh;">${code}</pre>`;
    }
  }, [artifact]);

  // Listen for console messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'console') {
        const { method, message } = event.data;
        const prefix = method === 'error' ? '❌ ' : method === 'warn' ? '⚠️ ' : '> ';
        setConsoleOutput(prev => [...prev.slice(-50), prefix + message]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Auto-run on code change
  useEffect(() => {
    if (!artifact || !autoRun) return;
    if (autoRunTimeoutRef.current) clearTimeout(autoRunTimeoutRef.current);
    autoRunTimeoutRef.current = setTimeout(() => {
      setConsoleOutput([]);
      setPreviewKey(k => k + 1);
    }, 800);
    return () => {
      if (autoRunTimeoutRef.current) clearTimeout(autoRunTimeoutRef.current);
    };
  }, [artifact, autoRun]);

  const handleRun = () => {
    setConsoleOutput([]);
    setPreviewKey(k => k + 1);
  };

  const handleCopy = async () => {
    if (!artifact) return;
    await navigator.clipboard.writeText(artifact.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!artifact) return;
    const ext = artifact.type === 'react' ? 'jsx' : artifact.type === 'typescript' ? 'ts' : artifact.type;
    const blob = new Blob([artifact.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.toLowerCase().replace(/\s+/g, '-')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenExternal = () => {
    const html = generatePreview();
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    updateCode(value || '');
  };

  if (!isOpen || !artifact) return null;

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#0d0d0d',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Fullscreen Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: '#1a1a1a',
          borderBottom: '1px solid #333',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>{currentLang.icon}</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{artifact.title}</span>
            <span style={{
              padding: '2px 8px',
              backgroundColor: `${currentLang.color}30`,
              color: currentLang.color,
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
            }}>
              {currentLang.label}
            </span>
          </div>
          <button onClick={() => setIsFullscreen(false)} style={iconButtonStyle}>
            <Minimize2 size={18} />
          </button>
        </div>

        {/* Fullscreen Content - Split View */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, borderRight: '1px solid #333' }}>
            <Editor
              height="100%"
              language={currentLang.monacoLang}
              value={artifact.code}
              theme="vs-dark"
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                fontFamily: "'Fira Code', monospace",
                lineNumbers: 'on',
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <iframe
              ref={iframeRef}
              key={previewKey}
              srcDoc={generatePreview()}
              style={{ flex: 1, border: 'none', backgroundColor: '#fff' }}
              sandbox="allow-scripts allow-modals allow-same-origin"
              title={artifact.title}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closePanel}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 998,
        }}
      />

      {/* Panel - Playground Style */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '95vw',
        maxWidth: '1400px',
        height: '90vh',
        backgroundColor: '#0d0d0d',
        borderRadius: '16px',
        border: '1px solid #333',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: '#1a1a1a',
          borderBottom: '1px solid #333',
        }}>
          {/* Left - Title & Language */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10a37f, #0d8a6a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}>
              {currentLang.icon}
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>
                {artifact.title}
              </div>
              <div style={{ color: '#888', fontSize: '12px' }}>
                Éditeur de code en temps réel
              </div>
            </div>
          </div>

          {/* Center - Language Tabs */}
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            backgroundColor: '#252525',
            borderRadius: '8px',
          }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                style={{
                  padding: '6px 12px',
                  backgroundColor: artifact.type === lang.id ? '#10a37f' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: artifact.type === lang.id ? '#fff' : '#888',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s',
                }}
              >
                <span>{lang.icon}</span>
                {lang.label}
              </button>
            ))}
          </div>

          {/* Right - Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Auto Toggle */}
            <button
              onClick={() => setAutoRun(!autoRun)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: autoRun ? '#10a37f20' : '#252525',
                border: `1px solid ${autoRun ? '#10a37f' : '#404040'}`,
                borderRadius: '8px',
                color: autoRun ? '#10a37f' : '#888',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {autoRun ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              Auto
            </button>

            {/* Run Button */}
            <button
              onClick={handleRun}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#10a37f',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Play size={16} fill="#fff" />
              Exécuter
            </button>

            {/* View Code Button - Style Claude */}
            <button
              onClick={() => setViewMode(viewMode === 'code' ? 'preview' : 'code')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: viewMode === 'code' ? '#10a37f' : '#252525',
                border: '1px solid #404040',
                borderRadius: '8px',
                color: viewMode === 'code' ? '#fff' : '#ccc',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Code size={16} />
              {viewMode === 'code' ? 'Masquer le code' : 'Voir le code'}
            </button>

            {/* View Mode Toggle */}
            <div style={{
              display: 'flex',
              backgroundColor: '#252525',
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              {[
                { mode: 'preview' as ViewMode, icon: <Layout size={16} />, title: 'Preview' },
                { mode: 'split' as ViewMode, icon: <Columns size={16} />, title: 'Split' },
                { mode: 'code' as ViewMode, icon: <Code size={16} />, title: 'Code' },
              ].map(({ mode, icon, title }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  title={title}
                  style={{
                    padding: '8px 10px',
                    backgroundColor: viewMode === mode ? '#10a37f' : 'transparent',
                    border: 'none',
                    color: viewMode === mode ? '#fff' : '#888',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* More Actions */}
            <button onClick={handleCopy} style={iconButtonStyle} title="Copier">
              {copied ? <Check size={16} color="#10a37f" /> : <Copy size={16} />}
            </button>
            <button onClick={handleDownload} style={iconButtonStyle} title="Télécharger">
              <Download size={16} />
            </button>
            <button onClick={handleOpenExternal} style={iconButtonStyle} title="Nouvel onglet">
              <ExternalLink size={16} />
            </button>
            <button onClick={() => setIsFullscreen(true)} style={iconButtonStyle} title="Plein écran">
              <Maximize2 size={16} />
            </button>
            <button onClick={closePanel} style={iconButtonStyle} title="Fermer">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Code Editor */}
          {(viewMode === 'split' || viewMode === 'code') && (
            <div style={{
              flex: viewMode === 'split' ? 1 : 1,
              display: 'flex',
              flexDirection: 'column',
              borderRight: viewMode === 'split' ? '1px solid #333' : 'none',
              backgroundColor: '#1e1e1e',
            }}>
              {/* File Tab */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                height: '36px',
                backgroundColor: '#252525',
                borderBottom: '1px solid #333',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: '#1e1e1e',
                  borderRadius: '6px 6px 0 0',
                  marginBottom: '-1px',
                  borderBottom: '1px solid #1e1e1e',
                }}>
                  <span style={{ fontSize: '12px' }}>{currentLang.icon}</span>
                  <span style={{ color: '#fff', fontSize: '12px' }}>
                    App.{artifact.type === 'react' ? 'jsx' : artifact.type}
                  </span>
                </div>
              </div>

              {/* Monaco Editor */}
              <div style={{ flex: 1 }}>
                <Editor
                  height="100%"
                  language={currentLang.monacoLang}
                  value={artifact.code}
                  theme="vs-dark"
                  onChange={handleCodeChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    padding: { top: 12 },
                    renderLineHighlight: 'line',
                    scrollbar: {
                      vertical: 'auto',
                      horizontal: 'auto',
                    },
                  }}
                />
              </div>

              {/* Editor Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                backgroundColor: '#1a1a1a',
                borderTop: '1px solid #333',
                fontSize: '11px',
                color: '#666',
              }}>
                <span>Ln {artifact.code.split('\n').length}, Col 1</span>
                <span>{artifact.code.length} caractères</span>
              </div>
            </div>
          )}

          {/* Preview Panel */}
          {(viewMode === 'split' || viewMode === 'preview') && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0d0d0d',
            }}>
              {/* Preview Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                height: '36px',
                backgroundColor: '#1a1a1a',
                borderBottom: '1px solid #333',
              }}>
                <span style={{ color: '#888', fontSize: '12px' }}>Prévisualisation</span>
                <span style={{ color: '#666', fontSize: '11px' }}>
                  Mis à jour: {new Date().toLocaleTimeString('fr-FR')}
                </span>
              </div>

              {/* Preview Content */}
              <div style={{ flex: 1, backgroundColor: '#fff' }}>
                <iframe
                  ref={iframeRef}
                  key={previewKey}
                  srcDoc={generatePreview()}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  sandbox="allow-scripts allow-modals allow-same-origin"
                  title={artifact.title}
                />
              </div>

              {/* Console */}
              {showConsole && (
                <div style={{
                  height: '120px',
                  backgroundColor: '#0d0d0d',
                  borderTop: '1px solid #333',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <div
                    onClick={() => setShowConsole(!showConsole)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      backgroundColor: '#1a1a1a',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Terminal size={14} color="#888" />
                      <span style={{ color: '#888', fontSize: '12px', fontWeight: 500 }}>Console</span>
                      {consoleOutput.length > 0 && (
                        <span style={{
                          padding: '2px 6px',
                          backgroundColor: '#10a37f30',
                          color: '#10a37f',
                          borderRadius: '4px',
                          fontSize: '10px',
                        }}>
                          {consoleOutput.length}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      size={14}
                      color="#666"
                      style={{ transform: showConsole ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                    />
                  </div>
                  <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '8px 12px',
                    fontFamily: "'Fira Code', monospace",
                    fontSize: '12px',
                    lineHeight: 1.5,
                  }}>
                    {consoleOutput.length === 0 ? (
                      <span style={{ color: '#555' }}>// Console output apparaîtra ici</span>
                    ) : (
                      consoleOutput.map((line, i) => (
                        <div
                          key={i}
                          style={{
                            color: line.startsWith('❌') ? '#ef4444' : line.startsWith('⚠️') ? '#f59e0b' : '#10a37f',
                          }}
                        >
                          {line}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const iconButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  backgroundColor: 'transparent',
  border: '1px solid #404040',
  borderRadius: '8px',
  color: '#888',
  cursor: 'pointer',
};

export default ArtifactPanelV2;
