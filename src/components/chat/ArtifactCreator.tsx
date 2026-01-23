/**
 * Artifact Creator Component
 * Panneau pour créer des artefacts manuellement
 */

import { useState, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import {
  X,
  FileCode,
  Atom,
  Terminal,
  Palette,
  Play,
  Wand2,
  Eye,
  Code,
  Columns,
} from 'lucide-react';
import type { ArtifactType, ArtifactData } from './Artifact';
import { pyodideService } from '../../services/PyodideService';

interface ArtifactCreatorProps {
  onClose: () => void;
  onInsert: (artifact: ArtifactData) => void;
}

const ARTIFACT_TYPES: { type: ArtifactType; icon: React.ReactNode; label: string; color: string; description: string; template: string }[] = [
  {
    type: 'html',
    icon: <FileCode size={18} />,
    label: 'HTML',
    color: '#e34c26',
    description: 'Page web complète avec HTML, CSS et JavaScript',
    template: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mon Page</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 20px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      min-height: 100vh;
    }
    h1 { color: #10a37f; }
  </style>
</head>
<body>
  <h1>Hello World!</h1>
  <p>Éditez ce code pour créer votre page.</p>
</body>
</html>`,
  },
  {
    type: 'react',
    icon: <Atom size={18} />,
    label: 'React',
    color: '#61dafb',
    description: 'Composant React avec hooks et état',
    template: `const App = () => {
  const [count, setCount] = React.useState(0);
  
  return (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ color: '#61dafb' }}>⚛️ React App</h1>
      <p style={{ color: '#888' }}>Compteur: {count}</p>
      <button 
        onClick={() => setCount(c => c + 1)}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#61dafb',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          color: '#1a1a2e'
        }}
      >
        Incrémenter
      </button>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);`,
  },
  {
    type: 'javascript',
    icon: <Terminal size={18} />,
    label: 'JavaScript',
    color: '#f7df1e',
    description: 'Code JavaScript avec console interactive',
    template: `// JavaScript Artifact
console.log("🚀 Hello from JavaScript!");

// Exemple de fonction
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculer les 10 premiers nombres de Fibonacci
const results = [];
for (let i = 0; i < 10; i++) {
  results.push(fibonacci(i));
}

console.log("Fibonacci:", results);`,
  },
  {
    type: 'python',
    icon: <Terminal size={18} />,
    label: 'Python',
    color: '#3776ab',
    description: 'Code Python avec NumPy, Pandas, Matplotlib',
    template: `# Python Artifact (via Pyodide)
import numpy as np

print("🐍 Hello from Python!")

# Créer un tableau NumPy
arr = np.array([1, 2, 3, 4, 5])
print(f"Array: {arr}")
print(f"Mean: {np.mean(arr)}")
print(f"Sum: {np.sum(arr)}")

# Fonction factorielle
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

for i in range(1, 8):
    print(f"{i}! = {factorial(i)}")`,
  },
  {
    type: 'css',
    icon: <Palette size={18} />,
    label: 'CSS',
    color: '#264de4',
    description: 'Styles CSS avec preview en direct',
    template: `/* CSS Artifact */
body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
  padding: 40px;
  min-height: 100vh;
}

.demo-container {
  max-width: 600px;
  margin: 0 auto;
}

h1 {
  color: #10a37f;
  text-align: center;
}

.card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  margin: 20px 0;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn {
  background: linear-gradient(135deg, #10a37f 0%, #0d8a6a 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: transform 0.2s;
}

.btn:hover {
  transform: translateY(-2px);
}`,
  },
  {
    type: 'svg',
    icon: <FileCode size={18} />,
    label: 'SVG',
    color: '#ffb13b',
    description: 'Graphiques vectoriels SVG',
    template: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10a37f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d8a6a;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="80" fill="url(#grad)" />
  <text x="100" y="115" text-anchor="middle" fill="white" font-size="40">✨</text>
</svg>`,
  },
];

export const ArtifactCreator = ({ onClose, onInsert }: ArtifactCreatorProps) => {
  const [selectedType, setSelectedType] = useState<ArtifactType>('html');
  const [title, setTitle] = useState('Mon Artefact');
  const [code, setCode] = useState(ARTIFACT_TYPES[0].template);
  const [view, setView] = useState<'code' | 'preview' | 'split'>('split');
  const [previewKey, setPreviewKey] = useState(0);

  const currentType = ARTIFACT_TYPES.find(t => t.type === selectedType)!;

  const handleTypeChange = (type: ArtifactType) => {
    setSelectedType(type);
    const template = ARTIFACT_TYPES.find(t => t.type === type)?.template || '';
    setCode(template);
    setPreviewKey(k => k + 1);
  };

  const handleCreate = () => {
    const artifact: ArtifactData = {
      id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: selectedType,
      title,
      code,
      language: selectedType === 'react' ? 'javascript' : selectedType === 'svg' ? 'xml' : selectedType,
    };
    onInsert(artifact);
    onClose();
  };

  // Generate preview HTML based on artifact type
  const generatePreview = useCallback(() => {
    switch (selectedType) {
      case 'html':
        return code;
      case 'svg':
        return `<!DOCTYPE html><html><head><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a2e;}</style></head><body>${code}</body></html>`;
      case 'css':
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${code}</style></head><body><div class="demo-container"><h1>🎨 CSS Preview</h1><p class="subtitle">Vos styles sont appliqués</p><div class="card"><h2>Card</h2><p>Exemple de carte.</p><button class="btn">Bouton</button></div></div></body></html>`;
      case 'javascript':
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Fira Code',monospace;background:#1a1a2e;color:#10a37f;padding:20px;min-height:100vh;}#output{white-space:pre-wrap;line-height:1.6;}.log{color:#10a37f;}.error{color:#ef4444;}</style></head><body><div id="output"></div><script>const output=document.getElementById('output');const _log=console.log,_error=console.error;console.log=(...args)=>{_log(...args);output.innerHTML+='<div class="log">> '+args.map(a=>typeof a==='object'?JSON.stringify(a,null,2):String(a)).join(' ')+'</div>';};console.error=(...args)=>{_error(...args);output.innerHTML+='<div class="error">❌ '+args.join(' ')+'</div>';};try{${code}}catch(e){console.error(e.message);}</script></body></html>`;
      case 'react':
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><script src="https://unpkg.com/react@18/umd/react.development.js"></script><script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',system-ui,sans-serif;background:#1a1a2e;color:#fff;min-height:100vh;padding:20px;}</style></head><body><div id="root"></div><script type="text/babel">try{${code}}catch(e){document.getElementById('root').innerHTML='<div style="color:red;padding:20px;">Erreur: '+e.message+'</div>';}</script></body></html>`;
      case 'python':
        return pyodideService.generatePythonHTML(code);
      default:
        return `<pre style="background:#1a1a2e;color:#fff;padding:20px;margin:0;min-height:100vh;">${code}</pre>`;
    }
  }, [code, selectedType]);

  // Debounced preview update
  const previewHtml = useMemo(() => generatePreview(), [generatePreview]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90vh',
        backgroundColor: '#1e1e1e',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #333',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Wand2 size={20} color="#10a37f" />
            <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>
              Créer un Artefact
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Type Selector */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '16px 20px',
          borderBottom: '1px solid #333',
          overflowX: 'auto',
        }}>
          {ARTIFACT_TYPES.map((type) => (
            <button
              key={type.type}
              onClick={() => handleTypeChange(type.type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: selectedType === type.type ? `${type.color}20` : 'transparent',
                border: `1px solid ${selectedType === type.type ? type.color : '#333'}`,
                borderRadius: '8px',
                color: selectedType === type.type ? type.color : '#888',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {type.icon}
              {type.label}
            </button>
          ))}
        </div>

        {/* Title Input */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #333' }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de l'artefact..."
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#0d0d0d',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
            }}
          />
        </div>

        {/* View Toggle */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 20px',
          borderBottom: '1px solid #333',
          backgroundColor: '#0d0d0d',
        }}>
          <button
            onClick={() => setView('code')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: view === 'code' ? '#333' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: view === 'code' ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            <Code size={14} />
            Code
          </button>
          <button
            onClick={() => setView('preview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: view === 'preview' ? '#333' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: view === 'preview' ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            <Eye size={14} />
            Aperçu
          </button>
          <button
            onClick={() => setView('split')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: view === 'split' ? '#333' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: view === 'split' ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            <Columns size={14} />
            Split
          </button>
        </div>

        {/* Code Editor + Preview */}
        <div style={{ flex: 1, minHeight: '300px', display: 'flex' }}>
          {/* Code Editor */}
          {(view === 'code' || view === 'split') && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Editor
                height="100%"
                language={currentType.type === 'react' ? 'javascript' : currentType.type === 'svg' ? 'xml' : currentType.type}
                value={code}
                theme="vs-dark"
                onChange={(value) => setCode(value || '')}
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
                key={previewKey}
                srcDoc={previewHtml}
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-scripts allow-modals allow-same-origin"
                title="Preview"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '16px 20px',
          borderTop: '1px solid #333',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#10a37f',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <Play size={16} />
            Créer l'Artefact
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtifactCreator;
