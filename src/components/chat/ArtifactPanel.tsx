/**
 * Artifact Panel Component
 * Panneau latéral style Claude.ai pour afficher les artefacts
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
  ExternalLink,
  ChevronLeft,
  Plus,
  File,
} from 'lucide-react';
import { useArtifactPanelStore } from '../../store/artifactPanelStore';
import { pyodideService } from '../../services/PyodideService';
import type { ArtifactType } from './Artifact';

const TYPE_CONFIG: Record<ArtifactType, { icon: React.ReactNode; color: string; label: string }> = {
  html: { icon: <FileCode size={16} />, color: '#e34c26', label: 'HTML' },
  react: { icon: <Atom size={16} />, color: '#61dafb', label: 'React' },
  javascript: { icon: <Terminal size={16} />, color: '#f7df1e', label: 'JavaScript' },
  typescript: { icon: <FileCode size={16} />, color: '#3178c6', label: 'TypeScript' },
  css: { icon: <Palette size={16} />, color: '#264de4', label: 'CSS' },
  python: { icon: <Terminal size={16} />, color: '#3776ab', label: 'Python' },
  svg: { icon: <FileCode size={16} />, color: '#ffb13b', label: 'SVG' },
  mermaid: { icon: <FileCode size={16} />, color: '#ff3670', label: 'Mermaid' },
};

export const ArtifactPanel = () => {
  const { isOpen, artifact, view, closePanel, setView, updateCode } = useArtifactPanelStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Debug logging
  useEffect(() => {
    if (isOpen && artifact) {
      console.log('[ArtifactPanel Debug] Received artifact:', {
        id: artifact.id,
        type: artifact.type,
        title: artifact.title,
        codeLength: artifact.code?.length || 0,
        codePreview: artifact.code?.substring(0, 100) || 'NO CODE',
        view,
      });
    }
  }, [isOpen, artifact, view]);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Get files array (support both single file and multi-file artifacts)
  const files = artifact?.files || (artifact ? [{ 
    name: artifact.title, 
    code: artifact.code, 
    language: artifact.language 
  }] : []);
  
  const currentFile = files[selectedFileIndex] || files[0];

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          closePanel();
        }
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isFullscreen, closePanel]);

  // Generate preview HTML based on artifact type
  const generatePreview = useCallback(() => {
    if (!artifact) return '';
    const code = artifact.code;
    
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
  body{font-family:'Fira Code',monospace;background:#1a1a2e;color:#10a37f;padding:20px;min-height:100vh;}
  #output{white-space:pre-wrap;line-height:1.6;}
  .log{color:#10a37f;}.error{color:#ef4444;}
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
  .log{color:#10a37f;}.error{color:#ef4444;}
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
        return `<pre style="background:#1a1a2e;color:#fff;padding:20px;margin:0;min-height:100vh;">${code}</pre>`;
    }
  }, [artifact]);

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

  const handleRefresh = () => {
    setPreviewKey(k => k + 1);
  };

  const handleCodeChange = (value: string | undefined) => {
    updateCode(value || '');
  };

  // Open in new window
  const handleOpenExternal = () => {
    const html = generatePreview();
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  // Auto-refresh on code change
  useEffect(() => {
    if (!artifact) return;
    const timer = setTimeout(() => setPreviewKey(k => k + 1), 500);
    return () => clearTimeout(timer);
  }, [artifact]);

  if (!isOpen || !artifact) return null;

  const config = TYPE_CONFIG[artifact.type];

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: '#0d0d0d',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          backgroundColor: '#1a1a1a',
          borderBottom: '1px solid #333',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: `${config.color}20`,
              color: config.color,
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              {config.icon}
              {config.label}
            </div>
            <span style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>
              {artifact.title}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setIsFullscreen(false)} style={actionButtonStyle}>
              <Minimize2 size={16} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, display: 'flex' }}>
          {view === 'code' ? (
            <Editor
              height="100%"
              language={artifact.language}
              value={artifact.code}
              theme="vs-dark"
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                padding: { top: 16 },
              }}
            />
          ) : (
            <iframe
              ref={iframeRef}
              key={previewKey}
              srcDoc={generatePreview()}
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' }}
              sandbox="allow-scripts allow-modals allow-same-origin"
              title={artifact.title}
            />
          )}
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
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 998,
          animation: 'fadeIn 0.2s ease-out',
        }}
      />
      
      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '50%',
          minWidth: '500px',
          maxWidth: '800px',
          backgroundColor: '#0d0d0d',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.5)',
          animation: 'slideIn 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: '#1a1a1a',
          borderBottom: '1px solid #333',
        }}>
          {/* Left - Close & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={closePanel}
              style={{
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
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#10a37f';
                e.currentTarget.style.color = '#10a37f';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#404040';
                e.currentTarget.style.color = '#888';
              }}
            >
              <ChevronLeft size={18} />
            </button>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: `${config.color}15`,
              color: config.color,
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {config.icon}
              {config.label}
            </div>
            
            <span style={{ 
              color: '#fff', 
              fontSize: '15px', 
              fontWeight: 600,
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {artifact.title}
            </span>
          </div>

          {/* Right - Actions */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleRefresh} style={actionButtonStyle} title="Rafraîchir">
              <RefreshCw size={16} />
            </button>
            <button onClick={handleCopy} style={actionButtonStyle} title="Copier le code">
              {copied ? <Check size={16} color="#10a37f" /> : <Copy size={16} />}
            </button>
            <button onClick={handleDownload} style={actionButtonStyle} title="Télécharger">
              <Download size={16} />
            </button>
            <button onClick={handleOpenExternal} style={actionButtonStyle} title="Ouvrir dans un nouvel onglet">
              <ExternalLink size={16} />
            </button>
            <button onClick={() => setIsFullscreen(true)} style={actionButtonStyle} title="Plein écran">
              <Maximize2 size={16} />
            </button>
            <button onClick={closePanel} style={actionButtonStyle} title="Fermer">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div style={{
          display: 'flex',
          padding: '12px 20px',
          backgroundColor: '#151515',
          borderBottom: '1px solid #333',
          gap: '4px',
        }}>
          <button
            onClick={() => setView('preview')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: view === 'preview' ? '#10a37f' : 'transparent',
              border: view === 'preview' ? 'none' : '1px solid #404040',
              borderRadius: '8px',
              color: view === 'preview' ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            <Eye size={16} />
            Aperçu
          </button>
          <button
            onClick={() => setView('code')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: view === 'code' ? '#10a37f' : 'transparent',
              border: view === 'code' ? 'none' : '1px solid #404040',
              borderRadius: '8px',
              color: view === 'code' ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            <Code size={16} />
            Code
          </button>
        </div>

        {/* File Tabs - Only show if multi-file artifact */}
        {files.length > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 20px',
            backgroundColor: '#0d0d0d',
            borderBottom: '1px solid #333',
            gap: '4px',
            overflowX: 'auto',
          }}>
            {files.map((file, index) => (
              <button
                key={index}
                onClick={() => setSelectedFileIndex(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: selectedFileIndex === index ? '#252525' : 'transparent',
                  border: selectedFileIndex === index ? '1px solid #404040' : '1px solid transparent',
                  borderRadius: '6px',
                  color: selectedFileIndex === index ? '#fff' : '#888',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                <File size={14} />
                {file.name}
              </button>
            ))}
            <button
              onClick={() => {
                const newFileName = prompt('Nom du nouveau fichier:');
                if (newFileName && artifact) {
                  const newFiles = [...files, { name: newFileName, code: '', language: 'javascript' }];
                  // Update artifact with new files - for now just log
                  console.log('New files:', newFiles);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                backgroundColor: 'transparent',
                border: '1px dashed #404040',
                borderRadius: '6px',
                color: '#666',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Ajouter un fichier"
            >
              <Plus size={14} />
            </button>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {view === 'preview' ? (
            <iframe
              ref={iframeRef}
              key={previewKey}
              srcDoc={generatePreview()}
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none',
                backgroundColor: '#fff',
              }}
              sandbox="allow-scripts allow-modals allow-same-origin"
              title={artifact.title}
            />
          ) : (
            <Editor
              height="100%"
              language={currentFile?.language || artifact.language}
              value={currentFile?.code || artifact.code}
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
                padding: { top: 16 },
              }}
            />
          )}
        </div>

        {/* Footer - Code stats */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          backgroundColor: '#1a1a1a',
          borderTop: '1px solid #333',
          fontSize: '12px',
          color: '#666',
        }}>
          <span>{artifact.code.split('\n').length} lignes</span>
          <span>{artifact.code.length} caractères</span>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
};

const actionButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  backgroundColor: 'transparent',
  border: '1px solid #404040',
  borderRadius: '8px',
  color: '#888',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

export default ArtifactPanel;
