/**
 * Tests for SkillExecutor
 * Phase 3.2: Extensible skills system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkillExecutor, getSkillExecutor, resetSkillExecutor } from '../SkillExecutor';
import type { Skill } from '../SkillsManager';

describe('SkillExecutor', () => {
  let executor: SkillExecutor;

  const mockSkill: Skill = {
    id: 'test-skill',
    name: 'Test Skill',
    version: '1.0.0',
    description: 'Test skill for unit tests',
    author: 'Test',
    category: 'utility',
    status: 'enabled',
    config: { permissions: ['network_access'] },
    manifest: {
      tools: [
        {
          id: 'test_tool',
          name: 'Test Tool',
          description: 'A test tool',
          parameters: [
            { name: 'input', type: 'string', description: 'Input value', required: true }
          ],
          handler: 'test/handler'
        }
      ]
    }
  };

  beforeEach(() => {
    resetSkillExecutor();
    executor = new SkillExecutor();
  });

  describe('Handler Registration', () => {
    it('should register a handler', () => {
      const handler = vi.fn().mockResolvedValue({ result: 'test' });
      executor.registerHandler('test_tool', handler);

      expect(executor.hasHandler('test_tool')).toBe(true);
    });

    it('should unregister a handler', () => {
      const handler = vi.fn().mockResolvedValue({});
      executor.registerHandler('temp_tool', handler);
      expect(executor.hasHandler('temp_tool')).toBe(true);

      const result = executor.unregisterHandler('temp_tool');
      expect(result).toBe(true);
      expect(executor.hasHandler('temp_tool')).toBe(false);
    });

    it('should return false when unregistering non-existent handler', () => {
      const result = executor.unregisterHandler('nonexistent');
      expect(result).toBe(false);
    });

    it('should list registered handlers', () => {
      const handler = vi.fn();
      executor.registerHandler('custom_tool', handler);

      const handlers = executor.listHandlers();
      expect(handlers).toContain('custom_tool');
      // Also should have builtin handlers
      expect(handlers).toContain('search_web');
      expect(handlers).toContain('execute_code');
    });
  });

  describe('Permission Management', () => {
    it('should grant permissions', () => {
      executor.grantPermission('network_access');
      expect(executor.hasPermission('network_access')).toBe(true);
    });

    it('should revoke permissions', () => {
      executor.grantPermission('execute_code');
      expect(executor.hasPermission('execute_code')).toBe(true);

      executor.revokePermission('execute_code');
      expect(executor.hasPermission('execute_code')).toBe(false);
    });
  });

  describe('Execution', () => {
    it('should execute a tool successfully', async () => {
      const handler = vi.fn().mockResolvedValue({ output: 'success' });
      executor.registerHandler('test_tool', handler);

      const result = await executor.execute(mockSkill, 'test_tool', { input: 'test' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ output: 'success' });
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should fail when tool not found', async () => {
      const result = await executor.execute(mockSkill, 'nonexistent_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail when handler not registered', async () => {
      // Remove the test_tool handler if it was registered
      executor.unregisterHandler('test_tool');

      const result = await executor.execute(mockSkill, 'test_tool', { input: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No handler registered');
    });

    it('should fail when missing required permission', async () => {
      executor.registerHandler('protected_tool', async () => ({ ok: true }), {
        requiredPermissions: ['execute_code']
      });

      const skillWithProtectedTool: Skill = {
        ...mockSkill,
        manifest: {
          tools: [
            { id: 'protected_tool', name: 'Protected', description: 'Protected tool', parameters: [], handler: '' }
          ]
        }
      };

      const result = await executor.execute(skillWithProtectedTool, 'protected_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should succeed with granted permission', async () => {
      executor.grantPermission('execute_code');
      executor.registerHandler('protected_tool', async () => ({ ok: true }), {
        requiredPermissions: ['execute_code']
      });

      const skillWithProtectedTool: Skill = {
        ...mockSkill,
        manifest: {
          tools: [
            { id: 'protected_tool', name: 'Protected', description: 'Protected tool', parameters: [], handler: '' }
          ]
        }
      };

      const result = await executor.execute(skillWithProtectedTool, 'protected_tool', {});

      expect(result.success).toBe(true);
    });

    it('should fail when missing required parameter', async () => {
      executor.registerHandler('test_tool', async () => ({}));

      const result = await executor.execute(mockSkill, 'test_tool', {}); // Missing 'input'

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameter');
    });

    it('should handle execution errors', async () => {
      executor.registerHandler('failing_tool', async () => {
        throw new Error('Intentional failure');
      });

      const skillWithFailingTool: Skill = {
        ...mockSkill,
        manifest: {
          tools: [
            { id: 'failing_tool', name: 'Failing', description: 'Fails', parameters: [], handler: '' }
          ]
        }
      };

      const result = await executor.execute(skillWithFailingTool, 'failing_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Intentional failure');
    });

    it('should timeout long-running executions', async () => {
      executor.registerHandler('slow_tool', async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { ok: true };
      });

      const skillWithSlowTool: Skill = {
        ...mockSkill,
        manifest: {
          tools: [
            { id: 'slow_tool', name: 'Slow', description: 'Slow tool', parameters: [], handler: '' }
          ]
        }
      };

      const result = await executor.execute(
        skillWithSlowTool,
        'slow_tool',
        {},
        { timeout: 100 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  describe('Execution History', () => {
    it('should record executions', async () => {
      executor.registerHandler('test_tool', async () => ({ result: 'ok' }));
      await executor.execute(mockSkill, 'test_tool', { input: 'test' });

      const history = executor.getHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].skillId).toBe('test-skill');
      expect(history[0].toolId).toBe('test_tool');
    });

    it('should filter history by skillId', async () => {
      executor.registerHandler('test_tool', async () => ({}));
      await executor.execute(mockSkill, 'test_tool', { input: 'a' });

      const otherSkill = { ...mockSkill, id: 'other-skill' };
      await executor.execute(otherSkill, 'test_tool', { input: 'b' });

      const history = executor.getHistory({ skillId: 'test-skill' });
      expect(history.every(e => e.skillId === 'test-skill')).toBe(true);
    });

    it('should limit history results', async () => {
      executor.registerHandler('test_tool', async () => ({}));

      for (let i = 0; i < 10; i++) {
        await executor.execute(mockSkill, 'test_tool', { input: `test${i}` });
      }

      const history = executor.getHistory({ limit: 5 });
      expect(history.length).toBe(5);
    });

    it('should clear history', async () => {
      executor.registerHandler('test_tool', async () => ({}));
      await executor.execute(mockSkill, 'test_tool', { input: 'test' });

      expect(executor.getHistory().length).toBeGreaterThan(0);

      executor.clearHistory();
      expect(executor.getHistory().length).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track execution stats', async () => {
      executor.registerHandler('test_tool', async () => ({}));
      executor.registerHandler('another_tool', async () => ({}));

      await executor.execute(mockSkill, 'test_tool', { input: 'a' });
      await executor.execute(mockSkill, 'test_tool', { input: 'b' });

      const skillWithAnotherTool: Skill = {
        ...mockSkill,
        manifest: {
          tools: [
            { id: 'another_tool', name: 'Another', description: '', parameters: [], handler: '' }
          ]
        }
      };
      await executor.execute(skillWithAnotherTool, 'another_tool', {});

      const stats = executor.getStats();

      expect(stats.totalExecutions).toBe(3);
      expect(stats.successfulExecutions).toBe(3);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.executionsByTool['test_tool']).toBe(2);
      expect(stats.executionsByTool['another_tool']).toBe(1);
    });

    it('should calculate average execution time', async () => {
      executor.registerHandler('test_tool', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return {};
      });

      await executor.execute(mockSkill, 'test_tool', { input: 'test' });
      await executor.execute(mockSkill, 'test_tool', { input: 'test2' });

      const stats = executor.getStats();
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getSkillExecutor();
      const instance2 = getSkillExecutor();
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getSkillExecutor();
      resetSkillExecutor();
      const instance2 = getSkillExecutor();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Events', () => {
    it('should emit handler:registered event', () => {
      const callback = vi.fn();
      executor.on('handler:registered', callback);

      executor.registerHandler('event_test', async () => ({}));

      expect(callback).toHaveBeenCalledWith({ toolId: 'event_test' });
    });

    it('should emit execution:completed event', async () => {
      const callback = vi.fn();
      executor.on('execution:completed', callback);
      executor.registerHandler('test_tool', async () => ({ ok: true }));

      await executor.execute(mockSkill, 'test_tool', { input: 'test' });

      expect(callback).toHaveBeenCalled();
    });

    it('should emit execution:failed event', async () => {
      const callback = vi.fn();
      executor.on('execution:failed', callback);
      executor.registerHandler('failing_tool', async () => {
        throw new Error('Failed');
      });

      const skillWithFailingTool: Skill = {
        ...mockSkill,
        manifest: {
          tools: [
            { id: 'failing_tool', name: 'Failing', description: '', parameters: [], handler: '' }
          ]
        }
      };

      await executor.execute(skillWithFailingTool, 'failing_tool', {});

      expect(callback).toHaveBeenCalled();
    });

    it('should emit permission events', () => {
      const grantCallback = vi.fn();
      const revokeCallback = vi.fn();

      executor.on('permission:granted', grantCallback);
      executor.on('permission:revoked', revokeCallback);

      executor.grantPermission('network_access');
      executor.revokePermission('network_access');

      expect(grantCallback).toHaveBeenCalledWith({ permission: 'network_access' });
      expect(revokeCallback).toHaveBeenCalledWith({ permission: 'network_access' });
    });
  });
});
