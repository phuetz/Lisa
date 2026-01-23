/**
 * GrokCliService Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GrokCliService } from './GrokCliService';

describe('GrokCliService', () => {
  let service: GrokCliService;

  beforeEach(() => {
    service = new GrokCliService();
  });

  describe('Configuration', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config.model).toBe('grok-code-fast-1'); // Updated default from grok-cli
      expect(config.securityMode).toBe('auto');
      expect(config.reasoningMode).toBe('medium');
      expect(config.maxRounds).toBe(30);
    });

    it('should update model', () => {
      service.setModel('grok-4');
      expect(service.getConfig().model).toBe('grok-4');
    });

    it('should update security mode', () => {
      service.setSecurityMode('read_only');
      expect(service.getConfig().securityMode).toBe('read_only');
    });

    it('should update reasoning mode', () => {
      service.setReasoningMode('deep');
      expect(service.getConfig().reasoningMode).toBe('deep');
    });

    it('should update config partially', () => {
      service.setConfig({ maxRounds: 50 });
      const config = service.getConfig();
      expect(config.maxRounds).toBe(50);
      expect(config.model).toBe('grok-code-fast-1'); // unchanged
    });
  });

  describe('Task Creation', () => {
    it('should create a task with required fields', () => {
      const task = service.createTask({
        kind: 'explain',
        description: 'Explain the authentication flow',
      });

      expect(task.id).toBeDefined();
      expect(task.kind).toBe('explain');
      expect(task.description).toBe('Explain the authentication flow');
      expect(task.reasoningMode).toBe('medium');
      expect(task.securityMode).toBe('auto');
      expect(task.createdAt).toBeDefined();
    });

    it('should create a task with custom options', () => {
      const task = service.createTask({
        kind: 'fix',
        title: 'Fix login bug',
        description: 'Fix the null pointer in auth.ts',
        filePattern: 'src/auth/*.ts',
        reasoningMode: 'deep',
        securityMode: 'full_access',
        maxRounds: 10,
        budgetUsd: 0.5,
      });

      expect(task.kind).toBe('fix');
      expect(task.title).toBe('Fix login bug');
      expect(task.filePattern).toBe('src/auth/*.ts');
      expect(task.reasoningMode).toBe('deep');
      expect(task.securityMode).toBe('full_access');
      expect(task.maxRounds).toBe(10);
      expect(task.budgetUsd).toBe(0.5);
    });

    it('should list all created tasks', () => {
      service.createTask({ kind: 'explain', description: 'Task 1' });
      service.createTask({ kind: 'review', description: 'Task 2' });
      service.createTask({ kind: 'fix', description: 'Task 3' });

      const tasks = service.listTasks();
      expect(tasks).toHaveLength(3);
    });

    it('should get a task by ID', () => {
      const created = service.createTask({ kind: 'test', description: 'Generate tests' });
      const retrieved = service.getTask(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe('Task Execution', () => {
    it('should execute a task and return result', async () => {
      const task = service.createTask({
        kind: 'explain',
        description: 'Explain this code',
      });

      const result = await service.executeTask(task.id);

      expect(result.taskId).toBe(task.id);
      expect(result.status).toBe('succeeded');
      expect(result.summary).toBeDefined();
      expect(result.logs).toBeDefined();
      expect(result.startedAt).toBeDefined();
      expect(result.finishedAt).toBeDefined();
    });

    it('should execute task with callbacks', async () => {
      const logs: string[] = [];
      const statusChanges: string[] = [];

      const task = service.createTask({
        kind: 'review',
        description: 'Review this code',
      });

      await service.executeTask(task.id, {
        onStatusChange: (status) => statusChanges.push(status),
        onLog: (log) => logs.push(log.message),
      });

      expect(statusChanges).toContain('running');
      expect(statusChanges).toContain('succeeded');
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should run task in one operation', async () => {
      const result = await service.runTask({
        kind: 'search',
        description: 'Search for authentication code',
      });

      expect(result.status).toBe('succeeded');
    });

    it('should reject write tasks in read_only mode', async () => {
      const task = service.createTask({
        kind: 'fix',
        description: 'Fix something',
        securityMode: 'read_only',
      });

      await expect(service.executeTask(task.id)).rejects.toThrow('read_only');
    });

    it('should get result after execution', async () => {
      const task = service.createTask({
        kind: 'explain',
        description: 'Explain code',
      });

      await service.executeTask(task.id);
      const result = service.getResult(task.id);

      expect(result).toBeDefined();
      expect(result?.status).toBe('succeeded');
    });

    it('should throw for non-existent task', async () => {
      await expect(service.executeTask('non-existent-id')).rejects.toThrow('Tâche non trouvée');
    });
  });

  describe('Task Results', () => {
    it('should include cost information', async () => {
      const result = await service.runTask({
        kind: 'explain',
        description: 'Explain code',
      });

      expect(result.cost).toBeDefined();
      expect(result.cost?.totalUsd).toBeGreaterThan(0);
      expect(result.cost?.inputTokens).toBeGreaterThan(0);
      expect(result.cost?.outputTokens).toBeGreaterThan(0);
    });

    it('should include diffs for fix tasks', async () => {
      const result = await service.runTask({
        kind: 'fix',
        description: 'Fix bug',
        securityMode: 'auto',
      });

      expect(result.diffs.length).toBeGreaterThan(0);
      expect(result.diffs[0].patch).toBeDefined();
    });

    it('should include logs', async () => {
      const result = await service.runTask({
        kind: 'review',
        description: 'Review code',
      });

      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs[0].ts).toBeDefined();
      expect(result.logs[0].level).toBeDefined();
      expect(result.logs[0].source).toBeDefined();
      expect(result.logs[0].message).toBeDefined();
    });
  });

  describe('Sessions', () => {
    it('should create a session', () => {
      const session = service.createSession('Test Session');
      
      expect(session.id).toBeDefined();
      expect(session.name).toBe('Test Session');
      expect(session.tasks).toHaveLength(0);
      expect(session.results).toHaveLength(0);
    });

    it('should create session with default name', () => {
      const session = service.createSession();
      expect(session.name).toContain('Session');
    });

    it('should get current session', () => {
      service.createSession('My Session');
      const current = service.getCurrentSession();
      
      expect(current).toBeDefined();
      expect(current?.name).toBe('My Session');
    });

    it('should switch sessions', () => {
      const s1 = service.createSession('Session 1');
      const s2 = service.createSession('Session 2');

      service.switchSession(s1.id);
      expect(service.getCurrentSession()?.id).toBe(s1.id);

      service.switchSession(s2.id);
      expect(service.getCurrentSession()?.id).toBe(s2.id);
    });

    it('should list sessions', () => {
      service.createSession('S1');
      service.createSession('S2');
      service.createSession('S3');

      const sessions = service.listSessions();
      expect(sessions).toHaveLength(3);
    });

    it('should delete session', () => {
      const session = service.createSession('To Delete');
      expect(service.listSessions()).toHaveLength(1);

      const deleted = service.deleteSession(session.id);
      expect(deleted).toBe(true);
      expect(service.listSessions()).toHaveLength(0);
    });

    it('should add tasks to current session', async () => {
      service.createSession('Task Session');
      
      await service.runTask({ kind: 'explain', description: 'Test' });
      
      const updated = service.getCurrentSession();
      expect(updated?.tasks.length).toBeGreaterThan(0);
      expect(updated?.results.length).toBeGreaterThan(0);
    });
  });

  describe('Memory', () => {
    it('should remember a value', () => {
      service.remember('testKey', 'testValue');
      expect(service.recall('testKey')).toBe('testValue');
    });

    it('should forget a value', () => {
      service.remember('toForget', 'value');
      expect(service.recall('toForget')).toBe('value');

      const forgotten = service.forgetMemory('toForget');
      expect(forgotten).toBe(true);
      expect(service.recall('toForget')).toBeUndefined();
    });

    it('should list memories', () => {
      service.remember('listKey1', 'value1');
      service.remember('listKey2', 'value2');

      const memories = service.listMemories();
      // Check that our keys are in the list (other tests may have added memories)
      const ourKeys = memories.filter(m => m.key.startsWith('listKey'));
      expect(ourKeys).toHaveLength(2);
    });
  });

  describe('Skills', () => {
    it('should activate skill', () => {
      service.activateSkill('typescript-expert');
      expect(service.getActiveSkills()).toContain('typescript-expert');
    });

    it('should deactivate skill', () => {
      service.activateSkill('react-specialist');
      service.deactivateSkill('react-specialist');
      expect(service.getActiveSkills()).not.toContain('react-specialist');
    });

    it('should not duplicate skills', () => {
      service.activateSkill('security-auditor');
      service.activateSkill('security-auditor');
      
      const skills = service.getActiveSkills();
      const count = skills.filter(s => s === 'security-auditor').length;
      expect(count).toBe(1);
    });
  });

  describe('Cost Report', () => {
    it('should return cost report', () => {
      const report = service.getCostReport();
      
      expect(report.sessionCost).toBeDefined();
      expect(report.dailyCost).toBeDefined();
      expect(report.totalCost).toBeDefined();
      expect(report.tokensUsed).toBeDefined();
      expect(report.isOverBudget).toBeDefined();
    });

    it('should track costs after execution', async () => {
      const reportBefore = service.getCostReport();
      
      await service.runTask({ kind: 'explain', description: 'Test' });
      
      const reportAfter = service.getCostReport();
      expect(reportAfter.totalCost).toBeGreaterThan(reportBefore.totalCost);
    });
  });

  describe('Logs', () => {
    it('should return logs', () => {
      const logs = service.getLogs();
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should limit logs returned', () => {
      const logs = service.getLogs(5);
      expect(logs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Backend Detection', () => {
    it('should detect backend type', () => {
      // In browser/test environment, should use simulated backend
      expect(service.isUsingRealBackend()).toBe(false);
    });

    it('should return backend type', () => {
      const backendType = service.getBackendType();
      expect(['grok-cli', 'lm-studio', 'simulation']).toContain(backendType);
    });

    it('should detect LM Studio status', () => {
      // In test environment, LM Studio should not be available
      expect(service.isUsingLMStudio()).toBe(false);
    });
  });
});
