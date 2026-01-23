/**
 * Chat Notebook Panel - Panneau notebook intégré au chat
 * 
 * S'ouvre automatiquement quand du code est généré
 * Permet d'exécuter et modifier le code directement
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Plus, Download, Maximize2, Minimize2, Code, FileCode, FileText } from 'lucide-react';
import type { NotebookCell, CellOutput, CellType } from '../notebook/NotebookEditor';
import { executeCode } from '../notebook/CodeExecutor';
import { pdfExportService } from '../../services/PDFExportService';
import { markdownExportService } from '../../services/MarkdownExportService';

// ============================================================================
// Types
// ============================================================================

interface CodeBlock {
  language: string;
  code: string;
  title?: string;
}

interface ChatNotebookPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: CodeBlock[];
  onCodeChange?: (cells: NotebookCell[]) => void;
}

// ============================================================================
// Mini Cell Component
// ============================================================================

interface MiniCellProps {
  cell: NotebookCell;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (source: string) => void;
  onRun: () => void;
  onDelete: () => void;
  onChangeType: (type: CellType) => void;
  isRunning: boolean;
}

const MiniCell: React.FC<MiniCellProps> = ({
  cell,
  isSelected,
  onSelect,
  onUpdate,
  onRun,
  onDelete,
  onChangeType,
  isRunning
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;

  useEffect(() => {
    if (isSelected && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isSelected, source]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      onRun();
    }
  };

  const renderOutput = (output: CellOutput, idx: number) => {
    if (output.output_type === 'stream') {
      const text = Array.isArray(output.text) ? output.text.join('') : output.text;
      return (
        <pre 
          key={idx} 
          className={`text-xs p-2 ${output.name === 'stderr' ? 'text-red-400' : 'text-green-400'}`}
        >
          {text}
        </pre>
      );
    }
    
    if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
      const data = output.data;
      
      // Render images (fractals, plots, etc.)
      if (data?.['image/png']) {
        return (
          <div key={idx} className="p-2">
            <img 
              src={`data:image/png;base64,${data['image/png']}`}
              alt="Output"
              className="max-w-full rounded border border-slate-600"
            />
            {data['text/plain'] ? (
              <div className="text-xs text-slate-500 mt-1">{String(data['text/plain'])}</div>
            ) : null}
          </div>
        );
      }
      
      if (data?.['text/plain']) {
        const text = Array.isArray(data['text/plain']) 
          ? (data['text/plain'] as string[]).join('') 
          : data['text/plain'];
        return (
          <pre key={idx} className="text-xs p-2 text-blue-400">
            {String(text)}
          </pre>
        );
      }
    }

    if (output.output_type === 'error') {
      return (
        <div key={idx} className="p-2 text-red-400 text-xs">
          <span className="font-bold">{output.ename}:</span> {output.evalue}
        </div>
      );
    }

    return null;
  };

  return (
    <div 
      className={`border-l-2 transition-all ${
        isSelected ? 'border-blue-500 bg-slate-800/50' : 'border-transparent hover:border-slate-600'
      }`}
      onClick={onSelect}
    >
      {/* Cell header */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">[{cell.execution_count ?? ' '}]</span>
          <select
            value={cell.cell_type}
            onChange={(e) => onChangeType(e.target.value as CellType)}
            className="text-xs bg-slate-700 text-slate-300 rounded px-1 py-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="code">Code</option>
            <option value="markdown">MD</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onRun(); }}
            disabled={isRunning}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400 disabled:opacity-50"
            title="Exécuter (Shift+Enter)"
          >
            {isRunning ? <span className="animate-spin">⏳</span> : <Play size={12} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
            title="Supprimer"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Cell content */}
      <div className="px-2 py-1">
        <textarea
          ref={textareaRef}
          value={source}
          onChange={(e) => {
            onUpdate(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onKeyDown={handleKeyDown}
          className="w-full bg-slate-900 text-slate-100 font-mono text-xs p-2 rounded border-none outline-none resize-none"
          placeholder="# Code..."
          style={{ minHeight: '40px' }}
        />
      </div>

      {/* Cell outputs */}
      {cell.outputs && cell.outputs.length > 0 && (
        <div className="mx-2 mb-2 bg-slate-900/50 rounded border border-slate-700/50">
          {cell.outputs.map((output, idx) => renderOutput(output, idx))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Panel Component
// ============================================================================

export const ChatNotebookPanel: React.FC<ChatNotebookPanelProps> = ({
  isOpen,
  onClose,
  initialCode = [],
  onCodeChange
}) => {
  const [cells, setCells] = useState<NotebookCell[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [runningCell, setRunningCell] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const generateId = () => `cell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Initialize cells from code blocks
  useEffect(() => {
    if (initialCode.length > 0) {
      const newCells: NotebookCell[] = initialCode.map((block) => ({
        id: generateId(),
        cell_type: 'code' as CellType,
        source: block.code,
        outputs: [],
        execution_count: null,
        metadata: { language: block.language, title: block.title }
      }));
      setCells(newCells);
      setSelectedIndex(0);
    }
  }, [initialCode]);

  // Notify parent of changes
  useEffect(() => {
    if (onCodeChange && cells.length > 0) {
      onCodeChange(cells);
    }
  }, [cells, onCodeChange]);

  const updateCell = useCallback((index: number, source: string) => {
    setCells(prev => prev.map((cell, i) => 
      i === index ? { ...cell, source } : cell
    ));
  }, []);

  const addCell = useCallback((type: CellType = 'code') => {
    const newCell: NotebookCell = {
      id: generateId(),
      cell_type: type,
      source: '',
      outputs: [],
      execution_count: null,
      metadata: {}
    };
    setCells(prev => [...prev, newCell]);
    setSelectedIndex(cells.length);
  }, [cells.length]);

  const deleteCell = useCallback((index: number) => {
    if (cells.length <= 1) return;
    setCells(prev => prev.filter((_, i) => i !== index));
    if (selectedIndex >= index && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  }, [cells.length, selectedIndex]);

  const changeType = useCallback((index: number, type: CellType) => {
    setCells(prev => prev.map((cell, i) => 
      i === index ? { ...cell, cell_type: type } : cell
    ));
  }, []);

  // Execute code with fractal/graphics support
  const runCell = useCallback(async (index: number) => {
    const cell = cells[index];
    if (cell.cell_type !== 'code') return;

    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
    if (!source.trim()) return;

    setRunningCell(cell.id);

    try {
      // Use the real code executor with fractal support
      const outputs = await executeCode(source);

      // Update cell with outputs
      setCells(prev => prev.map((c, i) => 
        i === index 
          ? { ...c, outputs, execution_count: (c.execution_count || 0) + 1 }
          : c
      ));

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
    a.download = 'lisa_notebook.ipynb';
    a.click();
    URL.revokeObjectURL(url);
  }, [cells]);

  const exportNotebookPDF = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await pdfExportService.exportNotebook(cells as any, 'lisa_notebook.pdf', {
      title: 'Lisa AI Notebook',
    });
  }, [cells]);

  const exportNotebookMarkdown = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const md = markdownExportService.exportNotebook(cells as any, {
      title: 'Lisa AI Notebook',
    });
    markdownExportService.download(md, 'lisa_notebook.md');
  }, [cells]);

  if (!isOpen) return null;

  return (
    <div 
      className={`flex flex-col bg-slate-900 border-l border-slate-700 transition-all ${
        isMaximized ? 'fixed inset-0 z-50' : 'w-[400px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <FileCode size={16} className="text-green-400" />
          <span className="text-sm font-medium text-white">Notebook</span>
          <span className="text-xs text-slate-400">({cells.length} cellules)</span>
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
            onClick={exportNotebookPDF}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
            title="Exporter PDF"
          >
            <FileText size={14} />
          </button>
          <button
            onClick={exportNotebookMarkdown}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-purple-400"
            title="Exporter Markdown"
          >
            <Code size={14} />
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

      {/* Cells */}
      <div className="flex-1 overflow-y-auto">
        {cells.length === 0 ? (
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
          <div className="py-2">
            {cells.map((cell, index) => (
              <MiniCell
                key={cell.id}
                cell={cell}
                isSelected={selectedIndex === index}
                onSelect={() => setSelectedIndex(index)}
                onUpdate={(source) => updateCell(index, source)}
                onRun={() => runCell(index)}
                onDelete={() => deleteCell(index)}
                onChangeType={(type) => changeType(index, type)}
                isRunning={runningCell === cell.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-slate-800/50 border-t border-slate-700 text-xs text-slate-500">
        <span className="mr-3">Shift+Enter: exécuter</span>
        <span>Mode: Simulation</span>
      </div>
    </div>
  );
};

// ============================================================================
// Helper: Extract code blocks from markdown
// ============================================================================

export function extractCodeBlocks(content: string): CodeBlock[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: CodeBlock[] = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || 'python';
    const code = match[2].trim();
    
    // Only extract meaningful code blocks
    if (code.length > 10 && !code.startsWith('bash') && !code.startsWith('$')) {
      blocks.push({ language, code });
    }
  }

  return blocks;
}

// ============================================================================
// Helper: Detect if message is a code request
// ============================================================================

export function isCodeRequest(message: string): boolean {
  const codeKeywords = [
    'code', 'script', 'fonction', 'function', 'programme', 'program',
    'écrire', 'écris', 'write', 'créer', 'create', 'génère', 'generate',
    'python', 'javascript', 'typescript', 'react', 'html', 'css',
    'algorithme', 'algorithm', 'implémenter', 'implement'
  ];
  
  const lowerMessage = message.toLowerCase();
  return codeKeywords.some(keyword => lowerMessage.includes(keyword));
}

export default ChatNotebookPanel;
