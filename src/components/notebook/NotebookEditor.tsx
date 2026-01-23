/**
 * Notebook Editor - Éditeur de code style Jupyter Notebook
 * 
 * Fonctionnalités:
 * - Cellules code/markdown
 * - Chargement de fichiers .ipynb
 * - Exécution de code
 * - Outputs par cellule
 * - Drag & drop pour réorganiser
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export type CellType = 'code' | 'markdown' | 'raw';

export interface CellOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error';
  text?: string | string[];
  data?: Record<string, unknown>;
  name?: string; // stdout, stderr
  ename?: string;
  evalue?: string;
  traceback?: string[];
  execution_count?: number;
}

export interface NotebookCell {
  id: string;
  cell_type: CellType;
  source: string | string[];
  outputs?: CellOutput[];
  execution_count?: number | null;
  metadata?: Record<string, unknown>;
}

export interface NotebookMetadata {
  kernelspec?: {
    display_name: string;
    language: string;
    name: string;
  };
  language_info?: {
    name: string;
    version: string;
  };
}

export interface JupyterNotebook {
  nbformat: number;
  nbformat_minor: number;
  metadata: NotebookMetadata;
  cells: NotebookCell[];
}

// ============================================================================
// Cell Component
// ============================================================================

interface CellProps {
  cell: NotebookCell;
  index: number;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onUpdate: (source: string) => void;
  onRun: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChangeType: (type: CellType) => void;
  onAddBelow: () => void;
}

const Cell: React.FC<CellProps> = ({
  cell,
  index,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onUpdate,
  onRun,
  onDelete,
  onMoveUp,
  onMoveDown,
  onChangeType,
  onAddBelow
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      onRun();
    }
    if (e.key === 'Escape') {
      onSelect();
    }
  };

  const renderOutput = (output: CellOutput, idx: number) => {
    if (output.output_type === 'stream') {
      const text = Array.isArray(output.text) ? output.text.join('') : output.text;
      return (
        <pre 
          key={idx} 
          className={`text-sm p-2 ${output.name === 'stderr' ? 'text-red-400' : 'text-slate-300'}`}
        >
          {text}
        </pre>
      );
    }
    
    if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
      const data = output.data;
      if (data?.['text/plain']) {
        const text = Array.isArray(data['text/plain']) 
          ? (data['text/plain'] as string[]).join('') 
          : data['text/plain'];
        return (
          <pre key={idx} className="text-sm p-2 text-slate-300">
            {String(text)}
          </pre>
        );
      }
      if (data?.['text/html']) {
        const html = Array.isArray(data['text/html']) 
          ? (data['text/html'] as string[]).join('') 
          : data['text/html'];
        return (
          <div 
            key={idx} 
            className="p-2"
            dangerouslySetInnerHTML={{ __html: String(html) }}
          />
        );
      }
      if (data?.['image/png']) {
        return (
          <img 
            key={idx}
            src={`data:image/png;base64,${data['image/png']}`}
            alt="Output"
            className="max-w-full"
          />
        );
      }
    }

    if (output.output_type === 'error') {
      return (
        <div key={idx} className="p-2 bg-red-900/20 text-red-400">
          <div className="font-bold">{output.ename}: {output.evalue}</div>
          {output.traceback && (
            <pre className="text-xs mt-2 whitespace-pre-wrap">
              {output.traceback.join('\n')}
            </pre>
          )}
        </div>
      );
    }

    return null;
  };

  const renderMarkdownPreview = () => {
    // Simple markdown rendering (pour une vraie app, utiliser react-markdown)
    const html = source
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-3">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-slate-700 px-1 rounded">$1</code>')
      .replace(/\n/g, '<br/>');
    
    return (
      <div 
        className="prose prose-invert max-w-none p-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  return (
    <div 
      className={`group relative border-l-4 transition-all ${
        isSelected 
          ? 'border-blue-500 bg-slate-800/50' 
          : 'border-transparent hover:border-slate-600'
      }`}
      onClick={onSelect}
      onDoubleClick={onEdit}
    >
      {/* Cell toolbar */}
      <div className={`absolute -left-12 top-2 flex flex-col gap-1 transition-opacity ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
      }`}>
        <span className="text-xs text-slate-500 w-8 text-right">
          [{cell.execution_count ?? ' '}]
        </span>
      </div>

      {/* Cell type indicator & actions */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <select
            value={cell.cell_type}
            onChange={(e) => onChangeType(e.target.value as CellType)}
            className="text-xs bg-slate-700 text-slate-300 rounded px-2 py-1 border-none"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="code">Code</option>
            <option value="markdown">Markdown</option>
            <option value="raw">Raw</option>
          </select>
          <span className="text-xs text-slate-500">Cell {index + 1}</span>
        </div>

        <div className={`flex items-center gap-1 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <button
            onClick={(e) => { e.stopPropagation(); onRun(); }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400"
            title="Exécuter (Shift+Enter)"
          >
            ▶
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="Monter"
          >
            ↑
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="Descendre"
          >
            ↓
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAddBelow(); }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400"
            title="Ajouter cellule"
          >
            +
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
            title="Supprimer"
          >
            ×
          </button>
        </div>
      </div>

      {/* Cell content */}
      <div className="px-4 py-2">
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
            className={`w-full bg-slate-900 text-slate-100 font-mono text-sm p-3 rounded border-none outline-none resize-none ${
              cell.cell_type === 'code' ? 'font-mono' : ''
            }`}
            placeholder={cell.cell_type === 'code' ? '# Écrivez votre code ici...' : 'Écrivez votre texte...'}
            style={{ minHeight: '60px' }}
          />
        ) : (
          <div className="min-h-[40px]">
            {cell.cell_type === 'markdown' && !isEditing ? (
              renderMarkdownPreview()
            ) : (
              <pre className={`text-sm p-3 bg-slate-900/50 rounded ${
                cell.cell_type === 'code' ? 'font-mono text-slate-100' : 'text-slate-300'
              }`}>
                {source || <span className="text-slate-500 italic">Cellule vide</span>}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Cell outputs */}
      {cell.outputs && cell.outputs.length > 0 && (
        <div className="px-4 pb-2">
          <div className="bg-slate-900/30 rounded border border-slate-700/50">
            {cell.outputs.map((output, idx) => renderOutput(output, idx))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Notebook Editor Component
// ============================================================================

interface NotebookEditorProps {
  className?: string;
  initialNotebook?: JupyterNotebook;
  onSave?: (notebook: JupyterNotebook) => void;
  onExecuteCode?: (code: string, cellId: string) => Promise<CellOutput[]>;
}

export const NotebookEditor: React.FC<NotebookEditorProps> = ({
  className,
  initialNotebook,
  onSave,
  onExecuteCode
}) => {
  const [notebook, setNotebook] = useState<JupyterNotebook>(() => 
    initialNotebook || createEmptyNotebook()
  );
  const [selectedCellIndex, setSelectedCellIndex] = useState<number>(0);
  const [editingCellIndex, setEditingCellIndex] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => `cell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const updateCell = useCallback((index: number, updates: Partial<NotebookCell>) => {
    setNotebook(prev => ({
      ...prev,
      cells: prev.cells.map((cell, i) => 
        i === index ? { ...cell, ...updates } : cell
      )
    }));
  }, []);

  const addCell = useCallback((index: number, type: CellType = 'code') => {
    const newCell: NotebookCell = {
      id: generateId(),
      cell_type: type,
      source: '',
      outputs: [],
      execution_count: null,
      metadata: {}
    };

    setNotebook(prev => ({
      ...prev,
      cells: [
        ...prev.cells.slice(0, index + 1),
        newCell,
        ...prev.cells.slice(index + 1)
      ]
    }));

    setSelectedCellIndex(index + 1);
    setEditingCellIndex(index + 1);
  }, []);

  const deleteCell = useCallback((index: number) => {
    if (notebook.cells.length <= 1) return;

    setNotebook(prev => ({
      ...prev,
      cells: prev.cells.filter((_, i) => i !== index)
    }));

    if (selectedCellIndex >= index && selectedCellIndex > 0) {
      setSelectedCellIndex(selectedCellIndex - 1);
    }
  }, [notebook.cells.length, selectedCellIndex]);

  const moveCell = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= notebook.cells.length) return;

    setNotebook(prev => {
      const cells = [...prev.cells];
      [cells[index], cells[newIndex]] = [cells[newIndex], cells[index]];
      return { ...prev, cells };
    });

    setSelectedCellIndex(newIndex);
  }, [notebook.cells.length]);

  const runCell = useCallback(async (index: number) => {
    const cell = notebook.cells[index];
    if (cell.cell_type !== 'code' || !onExecuteCode) return;

    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
    if (!source.trim()) return;

    setIsRunning(cell.id);

    try {
      const outputs = await onExecuteCode(source, cell.id);
      updateCell(index, {
        outputs,
        execution_count: (cell.execution_count || 0) + 1
      });
    } catch (error) {
      updateCell(index, {
        outputs: [{
          output_type: 'error',
          ename: 'ExecutionError',
          evalue: (error as Error).message,
          traceback: [(error as Error).stack || '']
        }]
      });
    } finally {
      setIsRunning(null);
      // Auto-select next cell
      if (index < notebook.cells.length - 1) {
        setSelectedCellIndex(index + 1);
      }
    }
  }, [notebook.cells, onExecuteCode, updateCell]);

  const runAllCells = useCallback(async () => {
    for (let i = 0; i < notebook.cells.length; i++) {
      if (notebook.cells[i].cell_type === 'code') {
        await runCell(i);
      }
    }
  }, [notebook.cells, runCell]);

  const loadNotebook = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content) as JupyterNotebook;
        
        // Ensure all cells have IDs
        parsed.cells = parsed.cells.map(cell => ({
          ...cell,
          id: cell.id || generateId()
        }));

        setNotebook(parsed);
        setSelectedCellIndex(0);
        setEditingCellIndex(null);
      } catch (error) {
        console.error('Failed to parse notebook:', error);
        alert('Erreur: fichier .ipynb invalide');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadNotebook(file);
    }
  }, [loadNotebook]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.ipynb')) {
      loadNotebook(file);
    }
  }, [loadNotebook]);

  const exportNotebook = useCallback(() => {
    const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notebook.ipynb';
    a.click();
    URL.revokeObjectURL(url);
  }, [notebook]);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(notebook);
    } else {
      exportNotebook();
    }
  }, [notebook, onSave, exportNotebook]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingCellIndex !== null) return;

      if (e.key === 'ArrowUp' && selectedCellIndex > 0) {
        e.preventDefault();
        setSelectedCellIndex(selectedCellIndex - 1);
      }
      if (e.key === 'ArrowDown' && selectedCellIndex < notebook.cells.length - 1) {
        e.preventDefault();
        setSelectedCellIndex(selectedCellIndex + 1);
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        setEditingCellIndex(selectedCellIndex);
      }
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        runCell(selectedCellIndex);
      }
      if (e.key === 'b') {
        e.preventDefault();
        addCell(selectedCellIndex, 'code');
      }
      if (e.key === 'm') {
        e.preventDefault();
        updateCell(selectedCellIndex, { cell_type: 'markdown' });
      }
      if (e.key === 'y') {
        e.preventDefault();
        updateCell(selectedCellIndex, { cell_type: 'code' });
      }
      if (e.key === 'd' && e.ctrlKey) {
        e.preventDefault();
        deleteCell(selectedCellIndex);
      }
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCellIndex, editingCellIndex, notebook.cells.length, addCell, deleteCell, runCell, updateCell, handleSave]);

  return (
    <div 
      className={`flex flex-col h-full bg-slate-900 ${className || ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ipynb"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded flex items-center gap-2"
          >
            📂 Ouvrir
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded flex items-center gap-2"
          >
            💾 Sauvegarder
          </button>
          <button
            onClick={exportNotebook}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded flex items-center gap-2"
          >
            📤 Exporter
          </button>
          <div className="w-px h-6 bg-slate-600 mx-2" />
          <button
            onClick={() => addCell(notebook.cells.length - 1, 'code')}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded flex items-center gap-2"
          >
            + Code
          </button>
          <button
            onClick={() => addCell(notebook.cells.length - 1, 'markdown')}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded flex items-center gap-2"
          >
            + Markdown
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runAllCells}
            disabled={isRunning !== null}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white text-sm rounded flex items-center gap-2"
          >
            {isRunning ? '⏳' : '▶▶'} Tout exécuter
          </button>
          <span className="text-xs text-slate-400">
            {notebook.metadata.kernelspec?.display_name || 'Python'}
          </span>
        </div>
      </div>

      {/* Notebook info */}
      <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 text-xs text-slate-400">
        <span>{notebook.cells.length} cellules</span>
        <span className="mx-2">•</span>
        <span>nbformat {notebook.nbformat}.{notebook.nbformat_minor}</span>
        <span className="mx-2">•</span>
        <span className="text-slate-500">
          Raccourcis: Enter (éditer), Shift+Enter (exécuter), B (nouvelle cellule), M/Y (type)
        </span>
      </div>

      {/* Cells */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="max-w-4xl mx-auto pl-16 pr-4">
          {notebook.cells.map((cell, index) => (
            <Cell
              key={cell.id}
              cell={cell}
              index={index}
              isSelected={selectedCellIndex === index}
              isEditing={editingCellIndex === index}
              onSelect={() => {
                setSelectedCellIndex(index);
                setEditingCellIndex(null);
              }}
              onEdit={() => setEditingCellIndex(index)}
              onUpdate={(source) => updateCell(index, { source })}
              onRun={() => runCell(index)}
              onDelete={() => deleteCell(index)}
              onMoveUp={() => moveCell(index, 'up')}
              onMoveDown={() => moveCell(index, 'down')}
              onChangeType={(type) => updateCell(index, { cell_type: type })}
              onAddBelow={() => addCell(index, 'code')}
            />
          ))}
        </div>

        {/* Drop zone indicator */}
        {notebook.cells.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="text-6xl mb-4">📓</div>
            <p className="text-lg">Glissez un fichier .ipynb ici</p>
            <p className="text-sm">ou utilisez le bouton Ouvrir</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Helpers
// ============================================================================

function createEmptyNotebook(): JupyterNotebook {
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: 'Python 3',
        language: 'python',
        name: 'python3'
      },
      language_info: {
        name: 'python',
        version: '3.10.0'
      }
    },
    cells: [
      {
        id: `cell_${Date.now()}`,
        cell_type: 'code',
        source: '# Bienvenue dans le Notebook Lisa!\n# Shift+Enter pour exécuter une cellule',
        outputs: [],
        execution_count: null,
        metadata: {}
      }
    ]
  };
}

export default NotebookEditor;
