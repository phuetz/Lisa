/**
 * Tests for Manus AI context engineering patterns in Lisa ContextManager:
 * - Observation variation (anti-repetition)
 * - Error preservation (keep wrong stuff in)
 * - Todo attention bias (recency injection)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContextManager, resetContextManager } from '../ContextManager';
import { resetObservationVariator, getObservationVariator } from '../ObservationVariator';
import { getTodoTracker, resetTodoTracker } from '../TodoTracker';

describe('ContextManager — Manus AI patterns', () => {
  let cm: ContextManager;
  const sid = 'test-session';

  beforeEach(() => {
    resetContextManager();
    resetObservationVariator();
    resetTodoTracker();
    cm = new ContextManager();
    cm.createWindow(sid);
  });

  describe('Observation Variation (anti-repetition)', () => {
    it('should vary tool result presentation across turns', () => {
      const variator = getObservationVariator();

      const result1 = cm.addToolResult(sid, 'tool-1', 'data1', 'search');
      variator.nextTurn();
      const result2 = cm.addToolResult(sid, 'tool-2', 'data2', 'search');
      variator.nextTurn();
      const result3 = cm.addToolResult(sid, 'tool-3', 'data3', 'search');

      // Content should differ due to template rotation
      expect(result1.content).not.toBe(result2.content);
      expect(result2.content).not.toBe(result3.content);
    });

    it('should include tool name in varied content', () => {
      const result = cm.addToolResult(sid, 'tool-1', 'hello', 'file_read');
      expect(result.content).toContain('file_read');
      expect(result.content).toContain('hello');
    });

    it('should not vary tool results without toolName', () => {
      const result = cm.addToolResult(sid, 'tool-1', 'raw content');
      expect(result.content).toBe('raw content');
    });

    it('should vary memory blocks', () => {
      const variator = getObservationVariator();

      const mem1 = cm.addMemory(sid, 'fact1');
      variator.nextTurn();
      const mem2 = cm.addMemory(sid, 'fact2');
      variator.nextTurn();
      const mem3 = cm.addMemory(sid, 'fact3');

      // Each should use a different phrasing
      const prefixes = [mem1, mem2, mem3].map(m =>
        m.content.split('\n')[0]
      );
      expect(new Set(prefixes).size).toBe(3);
    });
  });

  describe('Error Preservation', () => {
    it('should not compress entries containing errors', () => {
      // Fill context with messages to trigger compression
      cm.updateConfig({ maxTokens: 500, reservedTokens: 100, compressionThreshold: 0.5, keepLastN: 2 });
      cm.createWindow(sid); // Recreate with new config

      // Add an error message
      cm.addMessage(sid, 'assistant', 'Error: file not found at /path/to/file');

      // Add many normal messages to trigger compression
      for (let i = 0; i < 20; i++) {
        cm.addMessage(sid, 'user', `Normal message number ${i} with some padding text to use tokens`);
      }

      // The error message should survive compression
      const window = cm.getWindow(sid);
      const errorEntry = window?.entries.find(e =>
        e.content.includes('Error: file not found') && !e.compressed
      );
      expect(errorEntry).toBeDefined();
    });

    it('should detect various error patterns', () => {
      const errorContents = [
        'Error: something went wrong',
        'The operation failed',
        '"success": false',
        '[ERROR] Connection refused',
        'Exception thrown in module',
        'Traceback (most recent call last)',
      ];

      for (const content of errorContents) {
        cm.updateConfig({ maxTokens: 300, reservedTokens: 50, compressionThreshold: 0.3, keepLastN: 1 });
        const freshSid = `error-test-${Math.random()}`;
        cm.createWindow(freshSid);

        cm.addMessage(freshSid, 'assistant', content);
        for (let i = 0; i < 15; i++) {
          cm.addMessage(freshSid, 'user', `Padding message ${i} to fill context buffer space`);
        }

        const w = cm.getWindow(freshSid);
        const preserved = w?.entries.find(e =>
          e.content === content && !e.compressed
        );
        expect(preserved, `Error pattern not preserved: "${content}"`).toBeDefined();
      }
    });
  });

  describe('Todo Attention Bias', () => {
    it('should inject todo context at the end of buildContext', () => {
      const tracker = getTodoTracker();
      tracker.addItem(sid, 'Fix the login bug');
      tracker.addItem(sid, 'Add unit tests');

      cm.addMessage(sid, 'user', 'What should I work on?');

      const context = cm.buildContext(sid);
      const lastEntry = context[context.length - 1];

      expect(lastEntry.content).toContain('<todo_context>');
      expect(lastEntry.content).toContain('Fix the login bug');
      expect(lastEntry.content).toContain('Add unit tests');
    });

    it('should not inject todo when no active items', () => {
      cm.addMessage(sid, 'user', 'Hello');

      const context = cm.buildContext(sid);
      const hasTodo = context.some(e => e.content.includes('<todo_context>'));
      expect(hasTodo).toBe(false);
    });

    it('should not inject completed todos', () => {
      const tracker = getTodoTracker();
      const item = tracker.addItem(sid, 'Done task');
      tracker.updateItem(sid, item.id, 'done');

      cm.addMessage(sid, 'user', 'Status?');

      const context = cm.buildContext(sid);
      const hasTodo = context.some(e => e.content.includes('<todo_context>'));
      expect(hasTodo).toBe(false);
    });
  });
});
