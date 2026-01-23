/**
 * Enhanced Notebook - Notebook amélioré avec toutes les fonctionnalités
 * 
 * Features:
 * - Coloration syntaxique
 * - Panneau redimensionnable
 * - Indicateur de chargement Pyodide
 * - Historique des exécutions
 * - Inspecteur de variables
 * - Raccourcis clavier avancés
 * - Persistance localStorage
 * - Support Python + JavaScript
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, Play, Plus, Download, Maximize2, Minimize2, Code, FileCode,
  ChevronUp, ChevronDown, Copy, Trash2, RotateCcw, Variable,
  Loader2, CheckCircle, AlertCircle, GripVertical
} from 'lucide-react';
import type { NotebookCell, CellOutput, CellType } from './NotebookEditor';
import { executeCode, preloadPyodide } from './CodeExecutor';

// ============================================================================
// Types
// ============================================================================

interface CodeBlock {
  language: string;
  code: string;
  title?: string;
}

interface EnhancedNotebookProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: CodeBlock[];
  onCodeChange?: (cells: NotebookCell[]) => void;
}

interface ExecutionHistory {
  id: string;
  code: string;
  timestamp: Date;
  success: boolean;
  duration: number;
}

interface PythonVariable {
  name: string;
  type: string;
  value: string;
}

type NotebookTab = 'cells' | 'variables' | 'history';

// ============================================================================
// Syntax Highlighting (simple implementation)
// ============================================================================

const PYTHON_KEYWORDS = [
  'def', 'class', 'if', 'else', 'elif', 'for', 'while', 'try', 'except',
  'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'raise',
  'pass', 'break', 'continue', 'lambda', 'and', 'or', 'not', 'in', 'is',
  'None', 'True', 'False', 'async', 'await', 'global', 'nonlocal'
];

const JS_KEYWORDS = [
  'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'break', 'continue', 'return', 'try', 'catch', 'finally',
  'throw', 'new', 'class', 'extends', 'import', 'export', 'default', 'from',
  'async', 'await', 'yield', 'null', 'undefined', 'true', 'false', 'this'
];

function highlightCode(code: string, language: string): React.ReactNode[] {
  const keywords = language === 'python' ? PYTHON_KEYWORDS : JS_KEYWORDS;
  const lines = code.split('\n');
  
  return lines.map((line, lineIdx) => {
    const tokens: React.ReactNode[] = [];
    const remaining = line;
    
    // Comments
    const commentIdx = language === 'python' ? remaining.indexOf('#') : remaining.indexOf('//');
    if (commentIdx !== -1) {
      const beforeComment = remaining.slice(0, commentIdx);
      const comment = remaining.slice(commentIdx);
      tokens.push(<span key={`pre-${lineIdx}`}>{highlightTokens(beforeComment, keywords)}</span>);
      tokens.push(<span key={`comment-${lineIdx}`} className="text-slate-500 italic">{comment}</span>);
    } else {
      // String literals
      const parts = remaining.split(/(["'`](?:[^"'`\\]|\\.)*["'`])/g);
      parts.forEach((part, partIdx) => {
        if (part.match(/^["'`]/)) {
          tokens.push(<span key={`str-${lineIdx}-${partIdx}`} className="text-amber-400">{part}</span>);
        } else {
          tokens.push(<span key={`code-${lineIdx}-${partIdx}`}>{highlightTokens(part, keywords)}</span>);
        }
      });
    }
    
    return (
      <div key={lineIdx} className="leading-relaxed">
        {tokens.length > 0 ? tokens : ' '}
      </div>
    );
  });
}

function highlightTokens(text: string, keywords: string[]): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const words = text.split(/(\s+|[()[\]{},.:;=+\-*/<>!&|])/g);
  
  words.forEach((word, idx) => {
    if (keywords.includes(word)) {
      tokens.push(<span key={idx} className="text-purple-400 font-semibold">{word}</span>);
    } else if (word.match(/^\d+\.?\d*$/)) {
      tokens.push(<span key={idx} className="text-cyan-400">{word}</span>);
    } else if (word.match(/^[A-Z][a-zA-Z0-9]*$/)) {
      tokens.push(<span key={idx} className="text-yellow-300">{word}</span>);
    } else if (word.match(/^(print|len|range|str|int|float|list|dict|set|tuple|open|input)$/)) {
      tokens.push(<span key={idx} className="text-green-400">{word}</span>);
    } else {
      tokens.push(<span key={idx}>{word}</span>);
    }
  });
  
  return tokens;
}

// ============================================================================
// Cell Component
// ============================================================================

interface CellProps {
  cell: NotebookCell;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (source: string) => void;
  onRun: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onChangeType: (type: CellType) => void;
  onChangeLanguage: (lang: string) => void;
  isRunning: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const NotebookCell: React.FC<CellProps> = ({
  cell,
  isSelected,
  onSelect,
  onUpdate,
  onRun,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onChangeType,
  onChangeLanguage,
  isRunning,
  canMoveUp,
  canMoveDown
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
  const language = (cell.metadata?.language as string) || 'python';

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.focus();
    }
  }, [isEditing, source]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      onRun();
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const renderOutput = (output: CellOutput, idx: number) => {
    if (output.output_type === 'stream') {
      const text = Array.isArray(output.text) ? output.text.join('') : output.text;
      return (
        <pre 
          key={idx} 
          className={`text-xs p-2 font-mono whitespace-pre-wrap ${
            output.name === 'stderr' ? 'text-red-400' : 'text-green-400'
          }`}
        >
          {text}
        </pre>
      );
    }
    
    if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
      const data = output.data;
      
      if (data?.['image/png']) {
        return (
          <div key={idx} className="p-2">
            <img 
              src={`data:image/png;base64,${data['image/png']}`}
              alt="Output"
              className="max-w-full rounded border border-slate-600"
            />
          </div>
        );
      }
      
      if (data?.['text/html']) {
        return (
          <div 
            key={idx} 
            className="p-2 text-sm"
            dangerouslySetInnerHTML={{ __html: String(data['text/html']) }}
          />
        );
      }
      
      if (data?.['text/plain']) {
        const text = Array.isArray(data['text/plain']) 
          ? (data['text/plain'] as string[]).join('') 
          : String(data['text/plain']);
        return (
          <pre key={idx} className="text-xs p-2 text-blue-400 font-mono">
            {text}
          </pre>
        );
      }
    }

    if (output.output_type === 'error') {
      return (
        <div key={idx} className="p-2 bg-red-950/30 rounded m-2 border border-red-800/50">
          <div className="text-red-400 font-bold text-sm mb-1">
            {output.ename}: {output.evalue}
          </div>
          {output.traceback && output.traceback.length > 0 && (
            <pre className="text-xs text-red-300/70 font-mono overflow-x-auto">
              {output.traceback.slice(-5).join('\n')}
            </pre>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div 
      className={`group border-l-2 transition-all mb-2 ${
        isSelected ? 'border-blue-500 bg-slate-800/50' : 'border-transparent hover:border-slate-600'
      }`}
      onClick={onSelect}
    >
      {/* Cell header */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-8">[{cell.execution_count ?? ' '}]</span>
          
          <select
            value={cell.cell_type}
            onChange={(e) => onChangeType(e.target.value as CellType)}
            className="text-xs bg-slate-700 text-slate-300 rounded px-1.5 py-0.5 border-none"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="code">Code</option>
            <option value="markdown">Markdown</option>
          </select>
          
          {cell.cell_type === 'code' && (
            <select
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value)}
              className="text-xs bg-slate-700 text-slate-300 rounded px-1.5 py-0.5 border-none"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
          )}
        </div>
        
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={!canMoveUp}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30"
            title="Monter"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={!canMoveDown}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30"
            title="Descendre"
          >
            <ChevronDown size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400"
            title="Dupliquer"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRun(); }}
            disabled={isRunning}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400 disabled:opacity-50"
            title="Exécuter (Shift+Enter)"
          >
            {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
            title="Supprimer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Cell content */}
      <div className="relative">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={source}
            onChange={(e) => {
              onUpdate(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => setIsEditing(false)}
            className="w-full bg-slate-900 text-slate-100 font-mono text-sm p-3 border-none outline-none resize-none"
            style={{ minHeight: '60px' }}
            spellCheck={false}
          />
        ) : (
          <div 
            className="p-3 font-mono text-sm cursor-text bg-slate-900/30 min-h-[60px]"
            onClick={() => setIsEditing(true)}
          >
            {source ? highlightCode(source, language) : (
              <span className="text-slate-500 italic">Cliquez pour éditer...</span>
            )}
          </div>
        )}
      </div>

      {/* Cell outputs */}
      {cell.outputs && cell.outputs.length > 0 && (
        <div className="border-t border-slate-700/50 bg-slate-950/30">
          {cell.outputs.map((output, idx) => renderOutput(output, idx))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Variables Panel
// ============================================================================

const VariablesPanel: React.FC<{ variables: PythonVariable[] }> = ({ variables }) => {
  if (variables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4">
        <Variable size={24} className="mb-2" />
        <p className="text-sm">Aucune variable</p>
        <p className="text-xs mt-1">Exécutez du code pour voir les variables</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 border-b border-slate-700">
            <th className="text-left p-2">Nom</th>
            <th className="text-left p-2">Type</th>
            <th className="text-left p-2">Valeur</th>
          </tr>
        </thead>
        <tbody>
          {variables.map((v, idx) => (
            <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
              <td className="p-2 text-blue-400 font-mono">{v.name}</td>
              <td className="p-2 text-purple-400">{v.type}</td>
              <td className="p-2 text-slate-300 font-mono truncate max-w-[150px]" title={v.value}>
                {v.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// History Panel
// ============================================================================

const HistoryPanel: React.FC<{ 
  history: ExecutionHistory[];
  onRerun: (code: string) => void;
}> = ({ history, onRerun }) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4">
        <RotateCcw size={24} className="mb-2" />
        <p className="text-sm">Aucun historique</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {history.slice().reverse().map((h) => (
        <div 
          key={h.id}
          className="p-2 bg-slate-800/50 rounded border border-slate-700 hover:border-slate-600 cursor-pointer"
          onClick={() => onRerun(h.code)}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">
              {h.timestamp.toLocaleTimeString()}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">{h.duration}ms</span>
              {h.success ? (
                <CheckCircle size={12} className="text-green-400" />
              ) : (
                <AlertCircle size={12} className="text-red-400" />
              )}
            </div>
          </div>
          <pre className="text-xs text-slate-300 font-mono truncate">
            {h.code.split('\n')[0]}
          </pre>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const EnhancedNotebook: React.FC<EnhancedNotebookProps> = ({
  isOpen,
  onClose,
  initialCode = [],
  onCodeChange
}) => {
  const [cells, setCells] = useState<NotebookCell[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [runningCell, setRunningCell] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [panelWidth, setPanelWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const [activeTab, setActiveTab] = useState<NotebookTab>('cells');
  const [pyodideStatus, setPyodideStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [variables, _setVariables] = useState<PythonVariable[]>([]);
  const [history, setHistory] = useState<ExecutionHistory[]>([]);
  
  const resizeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const generateId = () => `cell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('lisa-notebook-cells');
    if (saved && initialCode.length === 0) {
      try {
        setCells(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize cells from code blocks
  useEffect(() => {
    if (initialCode.length > 0) {
      const newCells: NotebookCell[] = initialCode.map((block) => ({
        id: generateId(),
        cell_type: 'code' as CellType,
        source: block.code,
        outputs: [],
        execution_count: null,
        metadata: { language: block.language || 'python' }
      }));
      setCells(newCells);
      setSelectedIndex(0);
    }
  }, [initialCode]);

  // Save to localStorage
  useEffect(() => {
    if (cells.length > 0) {
      localStorage.setItem('lisa-notebook-cells', JSON.stringify(cells));
    }
  }, [cells]);

  // Preload Pyodide
  useEffect(() => {
    if (isOpen && pyodideStatus === 'idle') {
      setPyodideStatus('loading');
      preloadPyodide()
        .then(() => setPyodideStatus('ready'))
        .catch(() => setPyodideStatus('error'));
    }
  }, [isOpen, pyodideStatus]);

  // Notify parent of changes
  useEffect(() => {
    if (onCodeChange && cells.length > 0) {
      onCodeChange(cells);
    }
  }, [cells, onCodeChange]);

  // Resize handling
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.max(300, Math.min(800, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Ctrl/Cmd + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        exportNotebook();
      }

      // Ctrl/Cmd + Enter: Run current cell
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCell(selectedIndex);
      }

      // Arrow navigation when not editing
      if (e.target === document.body) {
        if (e.key === 'ArrowUp' && selectedIndex > 0) {
          setSelectedIndex(selectedIndex - 1);
        }
        if (e.key === 'ArrowDown' && selectedIndex < cells.length - 1) {
          setSelectedIndex(selectedIndex + 1);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedIndex, cells.length]);

  const updateCell = useCallback((index: number, source: string) => {
    setCells(prev => prev.map((cell, i) => 
      i === index ? { ...cell, source } : cell
    ));
  }, []);

  const addCell = useCallback((type: CellType = 'code', afterIndex?: number) => {
    const newCell: NotebookCell = {
      id: generateId(),
      cell_type: type,
      source: '',
      outputs: [],
      execution_count: null,
      metadata: { language: 'python' }
    };
    
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : cells.length;
    setCells(prev => [...prev.slice(0, insertAt), newCell, ...prev.slice(insertAt)]);
    setSelectedIndex(insertAt);
  }, [cells.length]);

  const deleteCell = useCallback((index: number) => {
    if (cells.length <= 1) return;
    setCells(prev => prev.filter((_, i) => i !== index));
    if (selectedIndex >= index && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  }, [cells.length, selectedIndex]);

  const moveCell = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= cells.length) return;
    
    setCells(prev => {
      const newCells = [...prev];
      [newCells[index], newCells[newIndex]] = [newCells[newIndex], newCells[index]];
      return newCells;
    });
    setSelectedIndex(newIndex);
  }, [cells.length]);

  const duplicateCell = useCallback((index: number) => {
    const cell = cells[index];
    const newCell: NotebookCell = {
      ...cell,
      id: generateId(),
      outputs: [],
      execution_count: null
    };
    setCells(prev => [...prev.slice(0, index + 1), newCell, ...prev.slice(index + 1)]);
    setSelectedIndex(index + 1);
  }, [cells]);

  const changeType = useCallback((index: number, type: CellType) => {
    setCells(prev => prev.map((cell, i) => 
      i === index ? { ...cell, cell_type: type } : cell
    ));
  }, []);

  const changeLanguage = useCallback((index: number, language: string) => {
    setCells(prev => prev.map((cell, i) => 
      i === index ? { ...cell, metadata: { ...cell.metadata, language } } : cell
    ));
  }, []);

  const runCell = useCallback(async (index: number) => {
    const cell = cells[index];
    if (cell.cell_type !== 'code') return;

    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
    if (!source.trim()) return;

    const startTime = Date.now();
    setRunningCell(cell.id);

    try {
      const language = (cell.metadata?.language as string) || 'python';
      let outputs: CellOutput[];

      if (language === 'javascript') {
        outputs = await executeJavaScript(source);
      } else {
        outputs = await executeCode(source);
      }

      const duration = Date.now() - startTime;

      // Update cell with outputs
      setCells(prev => prev.map((c, i) => 
        i === index 
          ? { ...c, outputs, execution_count: (c.execution_count || 0) + 1 }
          : c
      ));

      // Add to history
      setHistory(prev => [...prev, {
        id: generateId(),
        code: source,
        timestamp: new Date(),
        success: !outputs.some(o => o.output_type === 'error'),
        duration
      }]);

      // Auto-select next cell
      if (index < cells.length - 1) {
        setSelectedIndex(index + 1);
      }
    } finally {
      setRunningCell(null);
    }
  }, [cells]);

  const runAllCells = useCallback(async () => {
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].cell_type === 'code') {
        await runCell(i);
      }
    }
  }, [cells, runCell]);

  const clearAllOutputs = useCallback(() => {
    setCells(prev => prev.map(c => ({ ...c, outputs: [], execution_count: null })));
  }, []);

  const exportNotebook = useCallback(() => {
    const notebook = {
      nbformat: 4,
      nbformat_minor: 5,
      metadata: {
        kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }
      },
      cells: cells.map(c => ({
        cell_type: c.cell_type,
        source: Array.isArray(c.source) ? c.source : c.source.split('\n').map((l, i, arr) => i < arr.length - 1 ? l + '\n' : l),
        metadata: c.metadata || {},
        outputs: c.outputs || [],
        execution_count: c.execution_count
      }))
    };

    const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lisa_notebook_${new Date().toISOString().slice(0, 10)}.ipynb`;
    a.click();
    URL.revokeObjectURL(url);
  }, [cells]);

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col bg-slate-900 border-l border-slate-700 transition-all select-none ${
        isMaximized ? 'fixed inset-0 z-50' : ''
      }`}
      style={{ width: isMaximized ? '100%' : panelWidth }}
    >
      {/* Resize handle */}
      {!isMaximized && (
        <div
          ref={resizeRef}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/50 transition-colors"
          onMouseDown={() => setIsResizing(true)}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 p-1 text-slate-600">
            <GripVertical size={12} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <FileCode size={16} className="text-green-400" />
          <span className="text-sm font-medium text-white">Notebook</span>
          
          {/* Pyodide status */}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
            pyodideStatus === 'ready' ? 'bg-green-900/50 text-green-400' :
            pyodideStatus === 'loading' ? 'bg-yellow-900/50 text-yellow-400' :
            pyodideStatus === 'error' ? 'bg-red-900/50 text-red-400' :
            'bg-slate-700 text-slate-400'
          }`}>
            {pyodideStatus === 'loading' && <Loader2 size={10} className="animate-spin" />}
            {pyodideStatus === 'ready' && <CheckCircle size={10} />}
            {pyodideStatus === 'error' && <AlertCircle size={10} />}
            <span>
              {pyodideStatus === 'ready' ? 'Python' :
               pyodideStatus === 'loading' ? 'Chargement...' :
               pyodideStatus === 'error' ? 'Erreur' : 'Idle'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={runAllCells}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400"
            title="Tout exécuter"
          >
            <Play size={14} />
          </button>
          <button
            onClick={clearAllOutputs}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-yellow-400"
            title="Effacer les sorties"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => addCell('code')}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400"
            title="Ajouter cellule"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={exportNotebook}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="Exporter .ipynb"
          >
            <Download size={14} />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title={isMaximized ? 'Réduire' : 'Agrandir'}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
            title="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('cells')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'cells' 
              ? 'text-white border-b-2 border-blue-500' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code size={12} />
          Cellules ({cells.length})
        </button>
        <button
          onClick={() => setActiveTab('variables')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'variables' 
              ? 'text-white border-b-2 border-blue-500' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Variable size={12} />
          Variables
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'history' 
              ? 'text-white border-b-2 border-blue-500' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <RotateCcw size={12} />
          Historique ({history.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'cells' && (
          cells.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4">
              <Code size={32} className="mb-2" />
              <p className="text-sm">Aucune cellule</p>
              <button
                onClick={() => addCell('code')}
                className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
              >
                + Ajouter
              </button>
            </div>
          ) : (
            <div className="py-2 px-1">
              {cells.map((cell, index) => (
                <NotebookCell
                  key={cell.id}
                  cell={cell}
                  isSelected={selectedIndex === index}
                  onSelect={() => setSelectedIndex(index)}
                  onUpdate={(source) => updateCell(index, source)}
                  onRun={() => runCell(index)}
                  onDelete={() => deleteCell(index)}
                  onMoveUp={() => moveCell(index, 'up')}
                  onMoveDown={() => moveCell(index, 'down')}
                  onDuplicate={() => duplicateCell(index)}
                  onChangeType={(type) => changeType(index, type)}
                  onChangeLanguage={(lang) => changeLanguage(index, lang)}
                  isRunning={runningCell === cell.id}
                  canMoveUp={index > 0}
                  canMoveDown={index < cells.length - 1}
                />
              ))}
              
              {/* Add cell button */}
              <button
                onClick={() => addCell('code')}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded transition-colors"
              >
                + Ajouter une cellule
              </button>
            </div>
          )
        )}

        {activeTab === 'variables' && <VariablesPanel variables={variables} />}
        
        {activeTab === 'history' && (
          <HistoryPanel 
            history={history} 
            onRerun={(code) => {
              addCell('code');
              updateCell(cells.length, code);
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-slate-800/50 border-t border-slate-700 text-xs text-slate-500 flex justify-between">
        <div>
          <kbd className="px-1 py-0.5 bg-slate-700 rounded mr-1">Shift+Enter</kbd> exécuter
          <span className="mx-2">|</span>
          <kbd className="px-1 py-0.5 bg-slate-700 rounded mr-1">Ctrl+S</kbd> sauvegarder
        </div>
        <span>{cells.length} cellule{cells.length > 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};

// ============================================================================
// JavaScript Executor
// ============================================================================

async function executeJavaScript(code: string): Promise<CellOutput[]> {
  const outputs: CellOutput[] = [];
  const logs: string[] = [];

  // Capture console.log
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  };

  try {
    const result = eval(code);
    
    if (logs.length > 0) {
      outputs.push({
        output_type: 'stream',
        name: 'stdout',
        text: logs.join('\n') + '\n'
      });
    }

    if (result !== undefined) {
      outputs.push({
        output_type: 'execute_result',
        data: { 
          'text/plain': typeof result === 'object' 
            ? JSON.stringify(result, null, 2) 
            : String(result) 
        },
        execution_count: 1
      });
    }
  } catch (error) {
    outputs.push({
      output_type: 'error',
      ename: 'Error',
      evalue: error instanceof Error ? error.message : String(error),
      traceback: [String(error)]
    });
  } finally {
    console.log = originalLog;
  }

  return outputs;
}

export default EnhancedNotebook;
