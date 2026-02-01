/**
 * Workflow History Hook
 *
 * Provides undo/redo functionality for workflow editing.
 * Uses zundo's temporal store for state history management.
 */

import { useCallback, useEffect } from 'react';
import { useTemporalStore } from 'zundo';
import useWorkflowStore from '../store/useWorkflowStore';

/**
 * Hook to manage workflow history (undo/redo)
 *
 * @example
 * ```tsx
 * const { undo, redo, canUndo, canRedo, clear } = useWorkflowHistory();
 *
 * return (
 *   <>
 *     <button onClick={undo} disabled={!canUndo}>Undo</button>
 *     <button onClick={redo} disabled={!canRedo}>Redo</button>
 *   </>
 * );
 * ```
 */
export function useWorkflowHistory() {
  // Access the temporal store created by zundo
  const temporal = useTemporalStore(useWorkflowStore);

  const {
    undo,
    redo,
    clear,
    pastStates,
    futureStates,
  } = temporal;

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if not in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+Z / Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y for redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  // Wrapped actions with logging
  const undoWithLog = useCallback(() => {
    console.log('[WorkflowHistory] Undo triggered');
    undo();
  }, [undo]);

  const redoWithLog = useCallback(() => {
    console.log('[WorkflowHistory] Redo triggered');
    redo();
  }, [redo]);

  const clearWithLog = useCallback(() => {
    console.log('[WorkflowHistory] History cleared');
    clear();
  }, [clear]);

  return {
    /** Undo the last change */
    undo: undoWithLog,
    /** Redo the last undone change */
    redo: redoWithLog,
    /** Clear all history */
    clear: clearWithLog,
    /** Whether undo is available */
    canUndo,
    /** Whether redo is available */
    canRedo,
    /** Number of past states */
    historyLength: pastStates.length,
    /** Number of future states */
    futureLength: futureStates.length,
  };
}

export default useWorkflowHistory;
