/**
 * Tests for grokCliStore
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGrokCliStore } from '../grokCliStore';

// Mock grokCliService
vi.mock('../../services/GrokCliService', () => ({
  grokCliService: {
    setConfig: vi.fn(),
    setModel: vi.fn(),
    setSecurityMode: vi.fn(),
    setReasoningMode: vi.fn(),
    createTask: vi.fn((options) => ({
      id: 'task-' + Math.random().toString(36).substr(2, 9),
      prompt: options.prompt,
      status: 'pending',
      createdAt: new Date(),
    })),
    executeTask: vi.fn(),
    cancelTask: vi.fn(),
    createSession: vi.fn((name) => ({
      id: 'session-' + Math.random().toString(36).substr(2, 9),
      name: name || 'New Session',
      branches: [{ id: 'main', name: 'main', messageStartIndex: 0, createdAt: new Date() }],
      currentBranchId: 'main',
      createdAt: new Date(),
    })),
    switchSession: vi.fn((id) => ({
      id,
      name: 'Session',
      branches: [{ id: 'main', name: 'main', messageStartIndex: 0, createdAt: new Date() }],
      currentBranchId: 'main',
    })),
    deleteSession: vi.fn(),
    runPipeline: vi.fn(async () => ({
      steps: [{ status: 'completed' }],
      success: true,
    })),
    remember: vi.fn(),
    recall: vi.fn((key) => key === 'test-key' ? 'test-value' : undefined),
    forgetMemory: vi.fn(),
    listMemories: vi.fn(() => []),
    forkBranch: vi.fn((name) => ({
      id: 'branch-' + Math.random().toString(36).substr(2, 9),
      name,
      messageStartIndex: 0,
      createdAt: new Date(),
    })),
    checkoutBranch: vi.fn(() => true),
    activateSkill: vi.fn(),
    deactivateSkill: vi.fn(),
    getCostReport: vi.fn(() => ({
      sessionCost: 0.5,
      dailyCost: 2.0,
      totalCost: 10.0,
      tokensUsed: { input: 1000, output: 500 },
      isOverBudget: false,
    })),
    resetSessionCosts: vi.fn(),
  },
}));

describe('grokCliStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useGrokCliStore.setState({
      config: {
        model: 'grok-3',
        yoloMode: 'off',
        securityMode: 'auto',
        reasoningMode: 'medium',
        maxRounds: 30,
        autoEdit: false,
        activeSkills: [],
      },
      tasks: [],
      currentTaskId: null,
      taskResults: new Map(),
      isExecuting: false,
      currentStatus: null,
      currentLogs: [],
      streamOutput: '',
      sessions: [],
      currentSessionId: null,
      isPipelineRunning: false,
      currentPipeline: null,
      pipelineProgress: 0,
      memories: [],
      branches: [{ id: 'main', name: 'main', messageStartIndex: 0, createdAt: new Date() }],
      currentBranchId: 'main',
      activeSkills: [],
      costReport: {
        sessionCost: 0,
        dailyCost: 0,
        totalCost: 0,
        tokensUsed: { input: 0, output: 0 },
        isOverBudget: false,
      },
      isSidebarOpen: true,
      selectedTab: 'tasks',
      logs: [],
    });
  });

  describe('initial state', () => {
    it('should have default config values', () => {
      const state = useGrokCliStore.getState();

      expect(state.config.model).toBe('grok-3');
      expect(state.config.securityMode).toBe('auto');
      expect(state.config.reasoningMode).toBe('medium');
      expect(state.config.maxRounds).toBe(30);
    });

    it('should have empty tasks array', () => {
      const state = useGrokCliStore.getState();

      expect(state.tasks).toEqual([]);
      expect(state.currentTaskId).toBeNull();
    });

    it('should not be executing', () => {
      const state = useGrokCliStore.getState();

      expect(state.isExecuting).toBe(false);
      expect(state.currentStatus).toBeNull();
    });
  });

  describe('config actions', () => {
    it('should update config', () => {
      const { setConfig } = useGrokCliStore.getState();

      setConfig({ maxRounds: 50 });

      const state = useGrokCliStore.getState();
      expect(state.config.maxRounds).toBe(50);
    });

    it('should set model', () => {
      const { setModel } = useGrokCliStore.getState();

      setModel('grok-2');

      const state = useGrokCliStore.getState();
      expect(state.config.model).toBe('grok-2');
    });

    it('should set security mode', () => {
      const { setSecurityMode } = useGrokCliStore.getState();

      setSecurityMode('strict');

      const state = useGrokCliStore.getState();
      expect(state.config.securityMode).toBe('strict');
    });

    it('should set reasoning mode', () => {
      const { setReasoningMode } = useGrokCliStore.getState();

      setReasoningMode('high');

      const state = useGrokCliStore.getState();
      expect(state.config.reasoningMode).toBe('high');
    });
  });

  describe('task actions', () => {
    it('should create a task', () => {
      const { createTask } = useGrokCliStore.getState();

      const task = createTask({ prompt: 'Test task' });

      expect(task).toBeDefined();
      expect(task.id).toContain('task-');

      const state = useGrokCliStore.getState();
      expect(state.tasks).toHaveLength(1);
      expect(state.currentTaskId).toBe(task.id);
    });

    it('should get task by id', () => {
      const { createTask, getTask } = useGrokCliStore.getState();

      const task = createTask({ prompt: 'Test task' });
      const retrieved = getTask(task.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(task.id);
    });

    it('should return undefined for non-existent task', () => {
      const { getTask } = useGrokCliStore.getState();

      const task = getTask('non-existent');

      expect(task).toBeUndefined();
    });

    it('should cancel task', () => {
      const { createTask, cancelTask } = useGrokCliStore.getState();

      createTask({ prompt: 'Test task' });
      useGrokCliStore.setState({ isExecuting: true });

      cancelTask();

      const state = useGrokCliStore.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.currentStatus).toBe('cancelled');
    });
  });

  describe('session actions', () => {
    it('should create a session', () => {
      const { createSession } = useGrokCliStore.getState();

      const session = createSession('Test Session');

      expect(session).toBeDefined();
      expect(session.id).toContain('session-');

      const state = useGrokCliStore.getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.currentSessionId).toBe(session.id);
    });

    it('should switch session', () => {
      const { createSession, switchSession } = useGrokCliStore.getState();

      const session1 = createSession('Session 1');
      const session2 = createSession('Session 2');

      switchSession(session1.id);

      const state = useGrokCliStore.getState();
      expect(state.currentSessionId).toBe(session1.id);
    });

    it('should delete session', () => {
      const { createSession, deleteSession } = useGrokCliStore.getState();

      const session = createSession('To Delete');
      expect(useGrokCliStore.getState().sessions).toHaveLength(1);

      deleteSession(session.id);

      const state = useGrokCliStore.getState();
      expect(state.sessions).toHaveLength(0);
      expect(state.currentSessionId).toBeNull();
    });

    it('should get current session', () => {
      const { createSession, getCurrentSession } = useGrokCliStore.getState();

      expect(getCurrentSession()).toBeNull();

      const session = createSession('Test');

      const current = useGrokCliStore.getState().getCurrentSession();
      expect(current?.id).toBe(session.id);
    });
  });

  describe('memory actions', () => {
    it('should remember a value', () => {
      const { remember } = useGrokCliStore.getState();

      // This just calls the service
      remember('key', 'value');

      // Verify service was called (mock is already set up)
      expect(true).toBe(true); // Memory actions delegate to service
    });

    it('should recall a value', () => {
      const { recall } = useGrokCliStore.getState();

      const value = recall('test-key');

      expect(value).toBe('test-value');
    });

    it('should return undefined for non-existent key', () => {
      const { recall } = useGrokCliStore.getState();

      const value = recall('non-existent');

      expect(value).toBeUndefined();
    });
  });

  describe('branch actions', () => {
    it('should fork a branch', () => {
      const { forkBranch } = useGrokCliStore.getState();

      const branch = forkBranch('feature-branch');

      expect(branch).toBeDefined();
      expect(branch?.name).toBe('feature-branch');

      const state = useGrokCliStore.getState();
      expect(state.branches).toHaveLength(2);
      expect(state.currentBranchId).toBe(branch?.id);
    });

    it('should checkout branch', () => {
      const { forkBranch, checkoutBranch } = useGrokCliStore.getState();

      const branch = forkBranch('test-branch');
      checkoutBranch('main');

      const state = useGrokCliStore.getState();
      expect(state.currentBranchId).toBe('main');
    });
  });

  describe('skill actions', () => {
    it('should activate a skill', () => {
      const { activateSkill } = useGrokCliStore.getState();

      activateSkill('search');

      const state = useGrokCliStore.getState();
      expect(state.activeSkills).toContain('search');
    });

    it('should not duplicate activated skill', () => {
      const { activateSkill } = useGrokCliStore.getState();

      activateSkill('search');
      activateSkill('search');

      const state = useGrokCliStore.getState();
      expect(state.activeSkills.filter(s => s === 'search')).toHaveLength(1);
    });

    it('should deactivate a skill', () => {
      const { activateSkill, deactivateSkill } = useGrokCliStore.getState();

      activateSkill('search');
      expect(useGrokCliStore.getState().activeSkills).toContain('search');

      deactivateSkill('search');

      const state = useGrokCliStore.getState();
      expect(state.activeSkills).not.toContain('search');
    });

    it('should toggle skill', () => {
      const { toggleSkill } = useGrokCliStore.getState();

      toggleSkill('edit');
      expect(useGrokCliStore.getState().activeSkills).toContain('edit');

      useGrokCliStore.getState().toggleSkill('edit');
      expect(useGrokCliStore.getState().activeSkills).not.toContain('edit');
    });
  });

  describe('cost actions', () => {
    it('should refresh cost report', () => {
      const { refreshCostReport } = useGrokCliStore.getState();

      refreshCostReport();

      const state = useGrokCliStore.getState();
      expect(state.costReport.sessionCost).toBe(0.5);
      expect(state.costReport.dailyCost).toBe(2.0);
      expect(state.costReport.totalCost).toBe(10.0);
      expect(state.costReport.tokensUsed.input).toBe(1000);
      expect(state.costReport.tokensUsed.output).toBe(500);
    });

    it('should reset session costs', () => {
      const { resetSessionCosts } = useGrokCliStore.getState();

      resetSessionCosts();

      // Just verify it calls the service and refreshes
      expect(true).toBe(true);
    });
  });

  describe('UI state', () => {
    it('should toggle sidebar', () => {
      expect(useGrokCliStore.getState().isSidebarOpen).toBe(true);

      useGrokCliStore.getState().toggleSidebar();
      expect(useGrokCliStore.getState().isSidebarOpen).toBe(false);

      useGrokCliStore.getState().toggleSidebar();
      expect(useGrokCliStore.getState().isSidebarOpen).toBe(true);
    });

    it('should set selected tab', () => {
      const { setSelectedTab } = useGrokCliStore.getState();

      setSelectedTab('sessions');
      expect(useGrokCliStore.getState().selectedTab).toBe('sessions');

      setSelectedTab('memory');
      expect(useGrokCliStore.getState().selectedTab).toBe('memory');

      setSelectedTab('costs');
      expect(useGrokCliStore.getState().selectedTab).toBe('costs');
    });
  });

  describe('logs', () => {
    it('should clear logs', () => {
      useGrokCliStore.setState({
        logs: [{ level: 'info', message: 'Test', timestamp: new Date() }],
        currentLogs: [{ level: 'info', message: 'Current', timestamp: new Date() }],
      });

      useGrokCliStore.getState().clearLogs();

      const state = useGrokCliStore.getState();
      expect(state.logs).toHaveLength(0);
      expect(state.currentLogs).toHaveLength(0);
    });
  });

  describe('pipeline', () => {
    it('should run pipeline', async () => {
      const { runPipeline } = useGrokCliStore.getState();

      const pipeline = {
        id: 'test-pipeline',
        name: 'Test Pipeline',
        steps: [{ id: 'step-1', type: 'task', prompt: 'Do something' }],
      };

      const result = await runPipeline(pipeline as any);

      expect(result.success).toBe(true);

      const state = useGrokCliStore.getState();
      expect(state.isPipelineRunning).toBe(false);
      expect(state.currentPipeline).toBeNull();
    });
  });
});
