/**
 * React components for @lisa-ai/code-executor
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { executeCode, isReady, preload } from './executor';
import type { CellOutput, ExecutorConfig, ExecutionResult } from './types';

/**
 * Hook for code execution
 */
export function useCodeExecutor(config: ExecutorConfig = {}) {
  const [ready, setReady] = useState(isReady());
  const [loading, setLoading] = useState(false);
  const [outputs, setOutputs] = useState<CellOutput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (!ready) {
      setLoading(true);
      preload(configRef.current)
        .then(() => setReady(true))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [ready]);

  const execute = useCallback(async (code: string): Promise<ExecutionResult> => {
    setLoading(true);
    setError(null);
    setOutputs([]);

    try {
      const result = await executeCode(code, configRef.current);
      setOutputs(result.outputs);
      if (!result.success) {
        setError(result.error || 'Execution failed');
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return {
        success: false,
        outputs: [],
        duration: 0,
        error: message
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    ready,
    loading,
    outputs,
    error,
    execute,
    clearOutputs: () => setOutputs([]),
    clearError: () => setError(null)
  };
}

/**
 * Props for CodeCell component
 */
export interface CodeCellProps {
  code: string;
  language?: string;
  autoRun?: boolean;
  showLineNumbers?: boolean;
  theme?: 'dark' | 'light';
  onExecute?: (result: ExecutionResult) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Inline code cell component with execution capability
 */
export function CodeCell({
  code,
  language = 'python',
  autoRun = false,
  showLineNumbers = true,
  theme = 'dark',
  onExecute,
  className,
  style
}: CodeCellProps) {
  const { ready, loading, outputs, error, execute } = useCodeExecutor();
  const [editableCode, setEditableCode] = useState(code);
  const hasRun = useRef(false);

  // Auto-run on mount if enabled
  useEffect(() => {
    if (autoRun && ready && !hasRun.current && language === 'python') {
      hasRun.current = true;
      execute(code).then(onExecute);
    }
  }, [autoRun, ready, code, language, execute, onExecute]);

  const handleRun = async () => {
    const result = await execute(editableCode);
    onExecute?.(result);
  };

  const isPython = language === 'python' || language === 'py';

  const colors = theme === 'dark' ? {
    bg: '#1e1e2e',
    border: '#313244',
    text: '#cdd6f4',
    accent: '#89b4fa',
    success: '#a6e3a1',
    error: '#f38ba8',
    muted: '#6c7086'
  } : {
    bg: '#ffffff',
    border: '#e0e0e0',
    text: '#1a1a1a',
    accent: '#1e88e5',
    success: '#43a047',
    error: '#e53935',
    muted: '#757575'
  };

  return (
    <div
      className={className}
      style={{
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
        fontFamily: 'monospace',
        fontSize: '14px',
        ...style
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`
      }}>
        <span style={{ color: colors.muted, fontSize: '12px' }}>
          {language.toUpperCase()}
        </span>
        {isPython && (
          <button
            onClick={handleRun}
            disabled={loading || !ready}
            style={{
              padding: '4px 12px',
              background: loading ? colors.muted : colors.accent,
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'wait' : 'pointer',
              fontSize: '12px'
            }}
          >
            {loading ? '⏳ Running...' : '▶ Run'}
          </button>
        )}
      </div>

      {/* Code */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={editableCode}
          onChange={(e) => setEditableCode(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: '100px',
            padding: showLineNumbers ? '12px 12px 12px 48px' : '12px',
            background: colors.bg,
            color: colors.text,
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: '1.5'
          }}
        />
        {showLineNumbers && (
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            padding: '12px 8px',
            color: colors.muted,
            userSelect: 'none',
            textAlign: 'right',
            width: '40px',
            lineHeight: '1.5'
          }}>
            {editableCode.split('\n').map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        )}
      </div>

      {/* Output */}
      {(outputs.length > 0 || error) && (
        <div style={{
          borderTop: `1px solid ${colors.border}`,
          padding: '12px',
          background: theme === 'dark' ? '#11111b' : '#f5f5f5'
        }}>
          {outputs.map((output, i) => (
            <OutputRenderer key={i} output={output} colors={colors} />
          ))}
          {error && (
            <div style={{ color: colors.error }}>
              ❌ {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Output renderer component
 */
function OutputRenderer({ 
  output, 
  colors 
}: { 
  output: CellOutput; 
  colors: Record<string, string>;
}) {
  if (output.output_type === 'stream') {
    return (
      <pre style={{
        margin: 0,
        color: output.name === 'stderr' ? colors.error : colors.text,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {output.text}
      </pre>
    );
  }

  if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
    if (output.data?.['image/png']) {
      return (
        <img
          src={`data:image/png;base64,${output.data['image/png']}`}
          alt="Output"
          style={{ maxWidth: '100%', borderRadius: '4px' }}
        />
      );
    }
    return (
      <pre style={{
        margin: 0,
        color: colors.success,
        whiteSpace: 'pre-wrap'
      }}>
        {output.data?.['text/plain']}
      </pre>
    );
  }

  if (output.output_type === 'error') {
    return (
      <div style={{ color: colors.error }}>
        <strong>{output.ename}: </strong>
        {output.evalue}
        {output.traceback && (
          <pre style={{
            margin: '8px 0 0',
            fontSize: '12px',
            opacity: 0.8,
            whiteSpace: 'pre-wrap'
          }}>
            {output.traceback.join('\n')}
          </pre>
        )}
      </div>
    );
  }

  return null;
}

export default CodeCell;
