import { describe, it, expect, beforeEach } from 'vitest';
import {
  TodoTracker,
  getTodoTracker,
  resetTodoTracker,
} from '../TodoTracker';

describe('TodoTracker', () => {
  let tracker: TodoTracker;
  const sessionId = 'test-session';

  beforeEach(() => {
    tracker = new TodoTracker();
  });

  describe('addItem', () => {
    it('should create a pending todo item', () => {
      const item = tracker.addItem(sessionId, 'Fix the bug');
      expect(item.text).toBe('Fix the bug');
      expect(item.status).toBe('pending');
      expect(item.id).toMatch(/^todo_/);
      expect(item.createdAt).toBeInstanceOf(Date);
    });

    it('should add multiple items', () => {
      tracker.addItem(sessionId, 'Task 1');
      tracker.addItem(sessionId, 'Task 2');
      expect(tracker.getItems(sessionId)).toHaveLength(2);
    });
  });

  describe('updateItem', () => {
    it('should update item status to in_progress', () => {
      const item = tracker.addItem(sessionId, 'Task');
      const updated = tracker.updateItem(sessionId, item.id, 'in_progress');
      expect(updated).toBe(true);
      expect(tracker.getItems(sessionId)[0].status).toBe('in_progress');
    });

    it('should set completedAt when done', () => {
      const item = tracker.addItem(sessionId, 'Task');
      tracker.updateItem(sessionId, item.id, 'done');
      expect(tracker.getItems(sessionId)[0].completedAt).toBeInstanceOf(Date);
    });

    it('should set completedAt when skipped', () => {
      const item = tracker.addItem(sessionId, 'Task');
      tracker.updateItem(sessionId, item.id, 'skipped');
      expect(tracker.getItems(sessionId)[0].completedAt).toBeInstanceOf(Date);
    });

    it('should return false for unknown item', () => {
      expect(tracker.updateItem(sessionId, 'nonexistent', 'done')).toBe(false);
    });

    it('should return false for unknown session', () => {
      expect(tracker.updateItem('unknown', 'id', 'done')).toBe(false);
    });
  });

  describe('removeItem', () => {
    it('should remove an item', () => {
      const item = tracker.addItem(sessionId, 'Task');
      expect(tracker.removeItem(sessionId, item.id)).toBe(true);
      expect(tracker.getItems(sessionId)).toHaveLength(0);
    });

    it('should return false for unknown item', () => {
      expect(tracker.removeItem(sessionId, 'nonexistent')).toBe(false);
    });
  });

  describe('clearSession', () => {
    it('should remove all items for a session', () => {
      tracker.addItem(sessionId, 'Task 1');
      tracker.addItem(sessionId, 'Task 2');
      tracker.clearSession(sessionId);
      expect(tracker.getItems(sessionId)).toHaveLength(0);
    });
  });

  describe('buildTodoContext', () => {
    it('should return null when no items', () => {
      expect(tracker.buildTodoContext(sessionId)).toBeNull();
    });

    it('should return null when all items done', () => {
      const item = tracker.addItem(sessionId, 'Task');
      tracker.updateItem(sessionId, item.id, 'done');
      expect(tracker.buildTodoContext(sessionId)).toBeNull();
    });

    it('should include pending items with [ ]', () => {
      tracker.addItem(sessionId, 'Fix the bug');
      const context = tracker.buildTodoContext(sessionId);
      expect(context).toContain('[ ] Fix the bug');
      expect(context).toContain('<todo_context>');
    });

    it('should include in_progress items with [/]', () => {
      const item = tracker.addItem(sessionId, 'Working on it');
      tracker.updateItem(sessionId, item.id, 'in_progress');
      const context = tracker.buildTodoContext(sessionId);
      expect(context).toContain('[/] Working on it');
    });

    it('should not include done or skipped items', () => {
      const done = tracker.addItem(sessionId, 'Done task');
      const skipped = tracker.addItem(sessionId, 'Skipped task');
      tracker.addItem(sessionId, 'Active task');
      tracker.updateItem(sessionId, done.id, 'done');
      tracker.updateItem(sessionId, skipped.id, 'skipped');

      const context = tracker.buildTodoContext(sessionId);
      expect(context).not.toContain('Done task');
      expect(context).not.toContain('Skipped task');
      expect(context).toContain('Active task');
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      const item1 = tracker.addItem(sessionId, 'Task 1');
      tracker.addItem(sessionId, 'Task 2');
      const item3 = tracker.addItem(sessionId, 'Task 3');
      tracker.updateItem(sessionId, item1.id, 'done');
      tracker.updateItem(sessionId, item3.id, 'in_progress');

      const stats = tracker.getStats(sessionId);
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.skipped).toBe(0);
    });

    it('should return zeros for unknown session', () => {
      const stats = tracker.getStats('unknown');
      expect(stats.total).toBe(0);
    });
  });

  describe('singleton', () => {
    beforeEach(() => resetTodoTracker());

    it('should return same instance', () => {
      expect(getTodoTracker()).toBe(getTodoTracker());
    });

    it('should reset singleton', () => {
      const a = getTodoTracker();
      resetTodoTracker();
      expect(getTodoTracker()).not.toBe(a);
    });
  });
});
