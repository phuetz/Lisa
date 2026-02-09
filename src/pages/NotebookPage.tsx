/**
 * Notebook Page - Page d'edition de notebooks Jupyter
 */

import React, { useCallback } from 'react';
import { NotebookEditor, type CellOutput } from '../components/notebook';
import { safeEvaluate } from '../features/workflow/executor/SafeEvaluator';

const NotebookPage: React.FC = () => {
  // Simulateur d'execution de code (pour demo)
  const handleExecuteCode = useCallback(async (code: string, _cellId: string): Promise<CellOutput[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));

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
        evalue: 'Ceci est une erreur simulee',
        traceback: ['Traceback (most recent call last):', '  File "<stdin>", line 1', 'SimulatedError: Ceci est une erreur simulee']
      }];
    }

    const lines = code.trim().split('\n');
    const lastLine = lines[lines.length - 1];

    if (lastLine && !lastLine.startsWith('#') && !lastLine.includes('=') && !lastLine.startsWith('import')) {
      try {
        // Use SafeEvaluator instead of eval for security
        const result = safeEvaluate(lastLine);
        if (result !== undefined) {
          return [{
            output_type: 'execute_result',
            data: { 'text/plain': String(result) },
            execution_count: 1
          }];
        }
      } catch {
        // Ignore evaluation errors - expression might not be evaluable
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
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Lisa Notebook</h1>
          <p style={{ margin: '4px 0 24px', fontSize: '13px', color: 'var(--text-muted)' }}>Editeur de code style Jupyter</p>
        </div>
        <span style={{
          padding: '6px 12px',
          backgroundColor: 'color-mix(in srgb, var(--color-green) 12%, transparent)',
          color: 'var(--color-green)',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 500
        }}>
          Mode Simulation
        </span>
      </div>

      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-primary)',
        height: 'calc(100vh - 200px)',
        overflow: 'hidden'
      }}>
        <NotebookEditor
          onExecuteCode={handleExecuteCode}
          onSave={handleSave}
        />
      </div>
    </div>
  );
};

export default NotebookPage;
