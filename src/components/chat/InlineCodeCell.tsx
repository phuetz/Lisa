/**
 * Inline Code Cell - Cellule de code exécutable dans le chat
 * Design moderne inspiré de VS Code / GitHub Copilot
 */

import { useState, useCallback } from 'react';
import { usePython } from 'react-py';
import { Play, Square, Copy, Check, Loader2, Terminal, Sparkles } from 'lucide-react';

interface InlineCodeCellProps {
  code: string;
  language: string;
  title?: string;
}

// Syntax highlighting avancé
function highlightPython(code: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Triple-quoted strings first
  html = html.replace(
    /("""[\s\S]*?"""|'''[\s\S]*?''')/g,
    '<span class="py-string">$1</span>'
  );
  
  // Single/double quoted strings
  html = html.replace(
    /(?<!class="py-string">)(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
    '<span class="py-string">$&</span>'
  );
  
  // Comments
  html = html.replace(
    /#(?![a-f0-9]{6}).*/g,
    '<span class="py-comment">$&</span>'
  );
  
  // Decorators
  html = html.replace(
    /@\w+/g,
    '<span class="py-decorator">$&</span>'
  );
  
  // Keywords
  const keywords = /\b(def|class|if|else|elif|for|while|try|except|finally|with|as|import|from|return|yield|raise|pass|break|continue|lambda|and|or|not|in|is|async|await|global|nonlocal)\b/g;
  html = html.replace(keywords, '<span class="py-keyword">$1</span>');
  
  // Builtins
  const builtins = /\b(print|len|range|str|int|float|list|dict|set|tuple|bool|None|True|False|self|super|open|type|isinstance|hasattr|getattr|setattr|enumerate|zip|map|filter|sorted|reversed|sum|min|max|abs|round|input)\b/g;
  html = html.replace(builtins, '<span class="py-builtin">$1</span>');
  
  // Numbers
  html = html.replace(
    /\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi,
    '<span class="py-number">$1</span>'
  );
  
  // Function definitions
  html = html.replace(
    /\b(def)\s+(\w+)/g,
    '<span class="py-keyword">$1</span> <span class="py-function">$2</span>'
  );
  
  // Class definitions
  html = html.replace(
    /\b(class)\s+(\w+)/g,
    '<span class="py-keyword">$1</span> <span class="py-class">$2</span>'
  );
  
  // Function calls
  html = html.replace(
    /\b([a-zA-Z_]\w*)\s*\(/g,
    '<span class="py-call">$1</span>('
  );

  return html;
}

// Inject CSS styles
const injectStyles = () => {
  if (document.getElementById('inline-code-cell-styles')) return;
  
  const styleSheet = document.createElement('style');
  styleSheet.id = 'inline-code-cell-styles';
  styleSheet.textContent = `
    .code-cell {
      margin: 16px 0;
      border-radius: 16px;
      overflow: hidden;
      background: linear-gradient(145deg, #1e1e2e 0%, #181825 100%);
      border: 1px solid rgba(139, 92, 246, 0.2);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      transition: all 0.3s ease;
    }
    .code-cell:hover {
      border-color: rgba(139, 92, 246, 0.4);
      box-shadow: 0 8px 32px rgba(139, 92, 246, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
    }
    .code-cell-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: linear-gradient(90deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .code-cell-lang {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .code-cell-lang-icon {
      width: 20px;
      height: 20px;
      background: linear-gradient(135deg, #3776ab 0%, #ffd43b 100%);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      color: white;
    }
    .code-cell-lang-text {
      font-size: 12px;
      font-weight: 600;
      color: #a5b4fc;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .code-cell-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .code-cell-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 12px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .code-cell-btn-copy {
      background: rgba(255, 255, 255, 0.05);
      color: #888;
    }
    .code-cell-btn-copy:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .code-cell-btn-run {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }
    .code-cell-btn-run:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    .code-cell-btn-stop {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }
    .code-cell-btn-loading {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }
    .code-cell-code {
      padding: 16px 20px;
      overflow-x: auto;
      background: #0f0f1a;
    }
    .code-cell-code pre {
      margin: 0;
      font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 13px;
      line-height: 1.7;
      color: #e2e8f0;
      tab-size: 4;
    }
    .code-cell-code code {
      display: block;
    }
    .code-cell-output {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      background: linear-gradient(180deg, #0a0a14 0%, #0f0f1a 100%);
    }
    .code-cell-output-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      color: #64748b;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .code-cell-output-content {
      padding: 12px 20px 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    .code-cell-stdout {
      color: #4ade80;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .code-cell-stderr {
      color: #f87171;
      white-space: pre-wrap;
      word-break: break-word;
      margin-top: 8px;
      padding: 12px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 8px;
      border-left: 3px solid #ef4444;
    }
    .code-cell-running {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #a5b4fc;
    }
    .code-cell-empty {
      color: #475569;
      font-style: italic;
    }
    
    /* Syntax highlighting */
    .py-keyword { color: #c084fc; font-weight: 500; }
    .py-builtin { color: #60a5fa; }
    .py-string { color: #4ade80; }
    .py-comment { color: #64748b; font-style: italic; }
    .py-number { color: #fbbf24; }
    .py-function { color: #38bdf8; }
    .py-class { color: #f472b6; }
    .py-decorator { color: #fb923c; }
    .py-call { color: #93c5fd; }
    
    /* Animations */
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .animate-spin { animation: spin 1s linear infinite; }
    .animate-pulse { animation: pulse 2s ease-in-out infinite; }
  `;
  document.head.appendChild(styleSheet);
};

export function InlineCodeCell({ code, language, title }: InlineCodeCellProps) {
  const [copied, setCopied] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  
  // Inject styles on first render
  useState(() => { injectStyles(); });
  
  const { 
    runPython, 
    stdout, 
    stderr, 
    isLoading, 
    isRunning,
    interruptExecution 
  } = usePython();

  const handleRun = useCallback(async () => {
    if (language !== 'python' && language !== 'py') return;
    setHasRun(true);
    await runPython(code);
  }, [code, language, runPython]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleStop = useCallback(() => {
    interruptExecution();
  }, [interruptExecution]);

  const isPython = language === 'python' || language === 'py';

  return (
    <div className="code-cell">
      {/* Header */}
      <div className="code-cell-header">
        <div className="code-cell-lang">
          <div className="code-cell-lang-icon">🐍</div>
          <span className="code-cell-lang-text">{language}</span>
          {title && <span style={{ color: '#64748b', fontSize: 12 }}>• {title}</span>}
        </div>
        
        <div className="code-cell-actions">
          {isLoading && (
            <span className="code-cell-btn code-cell-btn-loading">
              <Loader2 size={14} className="animate-spin" />
              Loading Python...
            </span>
          )}
          
          <button 
            onClick={handleCopy} 
            className="code-cell-btn code-cell-btn-copy"
            title="Copy code"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          
          {isPython && !isLoading && (
            <button
              onClick={isRunning ? handleStop : handleRun}
              className={`code-cell-btn ${isRunning ? 'code-cell-btn-stop' : 'code-cell-btn-run'}`}
              title={isRunning ? 'Stop execution' : 'Run code'}
            >
              {isRunning ? (
                <><Square size={14} /> Stop</>
              ) : (
                <><Play size={14} /> Run</>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Code */}
      <div className="code-cell-code">
        <pre>
          <code 
            dangerouslySetInnerHTML={{ 
              __html: isPython ? highlightPython(code) : code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
            }} 
          />
        </pre>
      </div>
      
      {/* Output */}
      {hasRun && (
        <div className="code-cell-output">
          <div className="code-cell-output-header">
            {isRunning ? (
              <><Sparkles size={14} className="animate-pulse" /> Running...</>
            ) : stderr ? (
              <><Terminal size={14} style={{ color: '#f87171' }} /> Error</>
            ) : stdout ? (
              <><Terminal size={14} style={{ color: '#4ade80' }} /> Output</>
            ) : (
              <><Terminal size={14} /> Output</>
            )}
          </div>
          
          <div className="code-cell-output-content">
            {isRunning && !stdout && !stderr && (
              <div className="code-cell-running">
                <Loader2 size={16} className="animate-spin" />
                Executing Python code...
              </div>
            )}
            
            {stdout && <div className="code-cell-stdout">{stdout}</div>}
            {stderr && <div className="code-cell-stderr">{stderr}</div>}
            
            {!isRunning && !stdout && !stderr && (
              <div className="code-cell-empty">No output</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default InlineCodeCell;
