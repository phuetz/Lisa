/**
 * Artifact Component
 * Affiche et exécute des artefacts de code (HTML, React, JS, CSS, Python)
 * Inspiré de Claude Artifacts
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  Code,
  Eye,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  X,
  FileCode,
  Palette,
  Terminal,
  Atom,
  Check,
} from 'lucide-react';
import { pyodideService } from '../../services/PyodideService';

export type ArtifactType = 'html' | 'react' | 'javascript' | 'typescript' | 'css' | 'python' | 'svg' | 'mermaid';

export interface ArtifactFile {
  name: string;
  code: string;
  language: string;
}

export interface ArtifactData {
  id: string;
  type: ArtifactType;
  title: string;
  code: string;
  language: string;
  // Support multi-file artifacts (like Claude.ai)
  files?: ArtifactFile[];
}

interface ArtifactProps {
  artifact: ArtifactData;
  onUpdate?: (code: string) => void;
  onClose?: () => void;
  embedded?: boolean;
}

const TYPE_CONFIG: Record<ArtifactType, { icon: React.ReactNode; color: string; label: string }> = {
  html: { icon: <FileCode size={14} />, color: '#e34c26', label: 'HTML' },
  react: { icon: <Atom size={14} />, color: '#61dafb', label: 'React' },
  javascript: { icon: <Terminal size={14} />, color: '#f7df1e', label: 'JavaScript' },
  typescript: { icon: <FileCode size={14} />, color: '#3178c6', label: 'TypeScript' },
  css: { icon: <Palette size={14} />, color: '#264de4', label: 'CSS' },
  python: { icon: <Terminal size={14} />, color: '#3776ab', label: 'Python' },
  svg: { icon: <FileCode size={14} />, color: '#ffb13b', label: 'SVG' },
  mermaid: { icon: <FileCode size={14} />, color: '#ff3670', label: 'Mermaid' },
};

export const Artifact = ({ artifact, onUpdate, onClose, embedded = true }: ArtifactProps) => {
  const [view, setView] = useState<'preview' | 'code' | 'split'>('preview');
  const [code, setCode] = useState(artifact.code);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const config = TYPE_CONFIG[artifact.type];

  // Generate preview HTML based on artifact type
  const generatePreview = useCallback(() => {
    switch (artifact.type) {
      case 'html':
        return code;

      case 'svg':
        return `<!DOCTYPE html><html><head><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a2e;}</style></head><body>${code}</body></html>`;

      case 'css':
        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${code}</style></head>
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
  body{font-family:'Fira Code',monospace;background:#1a1a2e;color:#f5a623;padding:20px;min-height:100vh;}
  #output{white-space:pre-wrap;line-height:1.6;}
  .log{color:#f5a623;}.error{color:#ef4444;}
</style></head>
<body>
  <div id="output"></div>
  <script>
    const output = document.getElementById('output');
    const _log = console.log, _error = console.error;
    console.log = (...args) => { _log(...args); output.innerHTML += '<div class="log">> ' + args.map(a => typeof a === 'object' ? JSON.stringify(a,null,2) : String(a)).join(' ') + '</div>'; };
    console.error = (...args) => { _error(...args); output.innerHTML += '<div class="error">❌ ' + args.join(' ') + '</div>'; };
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
  #output{white-space:pre-wrap;line-height:1.6;}
  .log{color:#f5a623;}.error{color:#ef4444;}
</style></head>
<body>
  <div id="output"></div>
  <script>
    const output = document.getElementById('output');
    const _log = console.log, _error = console.error;
    console.log = (...args) => { _log(...args); output.innerHTML += '<div class="log">> ' + args.map(a => typeof a === 'object' ? JSON.stringify(a,null,2) : String(a)).join(' ') + '</div>'; };
    console.error = (...args) => { _error(...args); output.innerHTML += '<div class="error">❌ ' + args.join(' ') + '</div>'; };
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
</style></head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try { ${code} } catch(e) { document.getElementById('root').innerHTML = '<div style="color:red;padding:20px;">Erreur: '+e.message+'</div>'; }
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
        return `<pre>${code}</pre>`;
    }
  }, [code, artifact.type]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = artifact.type === 'react' ? 'jsx' : artifact.type === 'typescript' ? 'ts' : artifact.type;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.toLowerCase().replace(/\s+/g, '-')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    setPreviewKey(k => k + 1);
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onUpdate?.(newCode);
  };

  // Auto-refresh on code change
  useEffect(() => {
    const timer = setTimeout(() => setPreviewKey(k => k + 1), 500);
    return () => clearTimeout(timer);
  }, [code]);

  const containerStyle: React.CSSProperties = isFullscreen
    ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: '#12121a' }
    : { borderRadius: '12px', border: '1px solid #333', overflow: 'hidden', backgroundColor: '#12121a' };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: '#0a0a0f',
        borderBottom: '1px solid #333',
      }}>
        {/* Left - Type & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: `${config.color}20`,
            color: config.color,
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
          }}>
            {config.icon}
            {config.label}
          </div>
          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>
            {artifact.title}
          </span>
        </div>

        {/* Center - View Toggle */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setView('preview')}
            style={{
              padding: '6px 12px',
              backgroundColor: view === 'preview' ? '#2d2d44' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: view === 'preview' ? '#fff' : '#6a6a82',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
            }}
          >
            <Eye size={14} />
            Aperçu
          </button>
          <button
            onClick={() => setView('code')}
            style={{
              padding: '6px 12px',
              backgroundColor: view === 'code' ? '#2d2d44' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: view === 'code' ? '#fff' : '#6a6a82',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
            }}
          >
            <Code size={14} />
            Code
          </button>
          <button
            onClick={() => setView('split')}
            style={{
              padding: '6px 12px',
              backgroundColor: view === 'split' ? '#2d2d44' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: view === 'split' ? '#fff' : '#6a6a82',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Split
          </button>
        </div>

        {/* Right - Actions */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={handleRefresh} style={iconButtonStyle} title="Rafraîchir">
            <RefreshCw size={14} />
          </button>
          <button onClick={handleCopy} style={iconButtonStyle} title="Copier">
            {copied ? <Check size={14} color="#f5a623" /> : <Copy size={14} />}
          </button>
          <button onClick={handleDownload} style={iconButtonStyle} title="Télécharger">
            <Download size={14} />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} style={iconButtonStyle} title="Plein écran">
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          {onClose && (
            <button onClick={onClose} style={iconButtonStyle} title="Fermer">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{
        display: 'flex',
        height: embedded && !isFullscreen ? '350px' : 'calc(100vh - 50px)',
      }}>
        {/* Code Editor */}
        {(view === 'code' || view === 'split') && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor
              height="100%"
              language={artifact.language}
              value={code}
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
              }}
            />
          </div>
        )}

        {/* Preview */}
        {(view === 'preview' || view === 'split') && (
          <div style={{
            flex: 1,
            backgroundColor: '#fff',
            borderLeft: view === 'split' ? '1px solid #333' : 'none',
          }}>
            <iframe
              ref={iframeRef}
              key={previewKey}
              srcDoc={generatePreview()}
              style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-scripts allow-modals allow-same-origin"
              title={artifact.title}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const iconButtonStyle: React.CSSProperties = {
  padding: '6px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '6px',
  color: '#6a6a82',
  cursor: 'pointer',
};

export default Artifact;
