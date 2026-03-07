import { describe, it, expect, beforeEach } from 'vitest';
import {
  ObservationVariator,
  getObservationVariator,
  resetObservationVariator,
} from '../ObservationVariator';

describe('ObservationVariator', () => {
  let variator: ObservationVariator;

  beforeEach(() => {
    variator = new ObservationVariator();
  });

  describe('turnIndex', () => {
    it('should start at 0', () => {
      expect(variator.getTurnIndex()).toBe(0);
    });

    it('should increment with nextTurn', () => {
      variator.nextTurn();
      expect(variator.getTurnIndex()).toBe(1);
      variator.nextTurn();
      expect(variator.getTurnIndex()).toBe(2);
    });

    it('should reset to 0', () => {
      variator.nextTurn();
      variator.nextTurn();
      variator.reset();
      expect(variator.getTurnIndex()).toBe(0);
    });
  });

  describe('wrapToolResult', () => {
    it('should rotate through 3 templates', () => {
      const results = [];
      for (let i = 0; i < 3; i++) {
        results.push(variator.wrapToolResult('search', 'data'));
        variator.nextTurn();
      }

      // All 3 should be different
      expect(new Set(results).size).toBe(3);
    });

    it('should cycle after 3 turns', () => {
      const first = variator.wrapToolResult('test', 'content');
      variator.nextTurn();
      variator.nextTurn();
      variator.nextTurn();
      const fourth = variator.wrapToolResult('test', 'content');
      expect(fourth).toBe(first);
    });

    it('should include tool name and content', () => {
      const result = variator.wrapToolResult('file_read', 'hello world');
      expect(result).toContain('file_read');
      expect(result).toContain('hello world');
    });

    it('template 0 should use "Result from"', () => {
      const result = variator.wrapToolResult('test', 'data');
      expect(result).toMatch(/^Result from test:/);
    });

    it('template 1 should use "Output of" with dashes', () => {
      variator.nextTurn();
      const result = variator.wrapToolResult('test', 'data');
      expect(result).toMatch(/^Output of test:/);
      expect(result).toContain('---');
    });

    it('template 2 should use bracket notation', () => {
      variator.nextTurn();
      variator.nextTurn();
      const result = variator.wrapToolResult('test', 'data');
      expect(result).toMatch(/^\[test\] returned:/);
    });
  });

  describe('wrapMemoryBlock', () => {
    it('should rotate through 3 phrasings', () => {
      const results = [];
      for (let i = 0; i < 3; i++) {
        results.push(variator.wrapMemoryBlock('memory data'));
        variator.nextTurn();
      }
      expect(new Set(results).size).toBe(3);
    });

    it('should always contain the content', () => {
      for (let i = 0; i < 3; i++) {
        expect(variator.wrapMemoryBlock('important fact')).toContain('important fact');
        variator.nextTurn();
      }
    });
  });

  describe('singleton', () => {
    beforeEach(() => {
      resetObservationVariator();
    });

    it('should return same instance', () => {
      const a = getObservationVariator();
      const b = getObservationVariator();
      expect(a).toBe(b);
    });

    it('should reset singleton', () => {
      const a = getObservationVariator();
      resetObservationVariator();
      const b = getObservationVariator();
      expect(a).not.toBe(b);
    });
  });
});
