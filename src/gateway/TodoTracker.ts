/**
 * Todo Tracker — Manus AI "Attention Through Recitation" pattern
 *
 * Injects a todo/checklist block at the END of the context (after all
 * messages) to exploit recency bias in transformer models. Items placed
 * at the end of the context receive disproportionately more attention
 * ("lost-in-the-middle" phenomenon), so placing the current plan/todo
 * list there keeps the model focused on remaining tasks.
 *
 * Ported from Code Buddy's todo-tracker.ts.
 * Ref: "Context Engineering for AI Agents: Lessons from Building Manus"
 */

export interface TodoItem {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'done' | 'skipped';
  createdAt: Date;
  completedAt?: Date;
}

export class TodoTracker {
  private items: Map<string, TodoItem[]> = new Map();

  /**
   * Add a todo item for a session.
   */
  addItem(sessionId: string, text: string): TodoItem {
    if (!this.items.has(sessionId)) {
      this.items.set(sessionId, []);
    }

    const item: TodoItem = {
      id: `todo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      text,
      status: 'pending',
      createdAt: new Date(),
    };

    this.items.get(sessionId)!.push(item);
    return item;
  }

  /**
   * Update a todo item's status.
   */
  updateItem(sessionId: string, itemId: string, status: TodoItem['status']): boolean {
    const items = this.items.get(sessionId);
    const item = items?.find(i => i.id === itemId);
    if (!item) return false;

    item.status = status;
    if (status === 'done' || status === 'skipped') {
      item.completedAt = new Date();
    }
    return true;
  }

  /**
   * Remove a todo item.
   */
  removeItem(sessionId: string, itemId: string): boolean {
    const items = this.items.get(sessionId);
    if (!items) return false;

    const idx = items.findIndex(i => i.id === itemId);
    if (idx === -1) return false;

    items.splice(idx, 1);
    return true;
  }

  /**
   * Get all items for a session.
   */
  getItems(sessionId: string): TodoItem[] {
    return this.items.get(sessionId) || [];
  }

  /**
   * Clear all items for a session.
   */
  clearSession(sessionId: string): void {
    this.items.delete(sessionId);
  }

  /**
   * Build the todo context block for injection at the END of context.
   * Returns null if there are no active items.
   */
  buildTodoContext(sessionId: string): string | null {
    const items = this.items.get(sessionId);
    if (!items || items.length === 0) return null;

    const activeItems = items.filter(i => i.status !== 'done' && i.status !== 'skipped');
    if (activeItems.length === 0) return null;

    const statusIcons: Record<TodoItem['status'], string> = {
      pending: '[ ]',
      in_progress: '[/]',
      done: '[x]',
      skipped: '[-]',
    };

    const lines = activeItems.map(item =>
      `${statusIcons[item.status]} ${item.text}`
    );

    return `<todo_context>\nCurrent tasks:\n${lines.join('\n')}\n</todo_context>`;
  }

  /**
   * Get stats for a session.
   */
  getStats(sessionId: string): {
    total: number;
    pending: number;
    inProgress: number;
    done: number;
    skipped: number;
  } {
    const items = this.items.get(sessionId) || [];
    return {
      total: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      inProgress: items.filter(i => i.status === 'in_progress').length,
      done: items.filter(i => i.status === 'done').length,
      skipped: items.filter(i => i.status === 'skipped').length,
    };
  }
}

// Singleton
let _todoTracker: TodoTracker | null = null;

export function getTodoTracker(): TodoTracker {
  if (!_todoTracker) _todoTracker = new TodoTracker();
  return _todoTracker;
}

export function resetTodoTracker(): void {
  _todoTracker = null;
}
