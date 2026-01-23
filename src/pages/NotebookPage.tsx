/**
 * Notebook Page - Page d'édition de notebooks Jupyter
 */

import React, { useCallback } from 'react';
import { NotebookEditor, type CellOutput } from '../components/notebook';

const NotebookPage: React.FC = () => {
  // Simulateur d'exécution de code (pour démo)
  // En production, connecter à un kernel Jupyter ou à un service d'exécution
  const handleExecuteCode = useCallback(async (code: string, _cellId: string): Promise<CellOutput[]> => {
    // Simulation d'exécution
    await new Promise(resolve => setTimeout(resolve, 500));

    // Détecter certains patterns pour simuler des outputs
    if (code.includes('print(')) {
      const match = code.match(/print\(['"](.*?)['"]\)/);
      if (match) {
        return [{
          output_type: 'stream',
          name: 'stdout',
          text: match[1] + '\n'
        }];
      }
    }

    if (code.includes('error') || code.includes('raise')) {
      return [{
        output_type: 'error',
        ename: 'SimulatedError',
        evalue: 'Ceci est une erreur simulée',
        traceback: ['Traceback (most recent call last):', '  File "<stdin>", line 1', 'SimulatedError: Ceci est une erreur simulée']
      }];
    }

    // Expression simple (retourne la dernière ligne)
    const lines = code.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    
    if (lastLine && !lastLine.startsWith('#') && !lastLine.includes('=') && !lastLine.startsWith('import')) {
      // Évaluation simple de nombres
      try {
        if (/^[\d\s+\-*/().]+$/.test(lastLine)) {
          const result = eval(lastLine);
          return [{
            output_type: 'execute_result',
            data: { 'text/plain': String(result) },
            execution_count: 1
          }];
        }
      } catch {
        // Ignore eval errors
      }

      return [{
        output_type: 'execute_result',
        data: { 'text/plain': `'${lastLine}'` },
        execution_count: 1
      }];
    }

    return [];
  }, []);

  const handleSave = useCallback((notebook: unknown) => {
    console.log('Saving notebook:', notebook);
    // TODO: Implémenter la sauvegarde vers un fichier ou un backend
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📓</span>
          <div>
            <h1 className="text-lg font-semibold text-white">Lisa Notebook</h1>
            <p className="text-xs text-slate-400">Éditeur de code style Jupyter</p>
          </div>
        </div>
        <div className="text-sm text-slate-400">
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
            Mode Simulation
          </span>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <NotebookEditor 
          onExecuteCode={handleExecuteCode}
          onSave={handleSave}
        />
      </div>
    </div>
  );
};

export default NotebookPage;
