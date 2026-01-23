/**
 * GrokCliStore
 * 
 * Store Zustand pour la gestion de l'état Grok-CLI dans Lisa.
 * Gère les tâches, sessions, configuration et coûts.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { grokCliService, type CreateTaskOptions, type TaskExecutionCallbacks } from '../services/GrokCliService';
import type {
  GrokCliConfig,
  GrokCliTask,
  GrokCliResult,
  GrokCliRunStatus,
  GrokCliLogEntry,
  GrokCliReasoningMode,
  GrokCliSecurityMode,
  GrokSession,
  GrokMemory,
  GrokBranch,
  GrokModel,
  GrokSkill,
  GrokCostReport,
  GrokPipeline,
  GrokPipelineResult,
} from '../types/grokCli';

// ============================================
// Interface du Store
// ============================================

interface GrokCliStore {
  // Configuration
  config: GrokCliConfig;
  setConfig: (config: Partial<GrokCliConfig>) => void;
  setModel: (model: GrokModel) => void;
  setSecurityMode: (mode: GrokCliSecurityMode) => void;
  setReasoningMode: (mode: GrokCliReasoningMode) => void;

  // Tâches
  tasks: GrokCliTask[];
  currentTaskId: string | null;
  taskResults: Map<string, GrokCliResult>;
  createTask: (options: CreateTaskOptions) => GrokCliTask;
  executeTask: (taskId: string) => Promise<GrokCliResult>;
  runTask: (options: CreateTaskOptions) => Promise<GrokCliResult>;
  cancelTask: () => void;
  getTask: (taskId: string) => GrokCliTask | undefined;
  getResult: (taskId: string) => GrokCliResult | undefined;

  // État d'exécution
  isExecuting: boolean;
  currentStatus: GrokCliRunStatus | null;
  currentLogs: GrokCliLogEntry[];
  streamOutput: string;

  // Sessions
  sessions: GrokSession[];
  currentSessionId: string | null;
  createSession: (name?: string) => GrokSession;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  getCurrentSession: () => GrokSession | null;

  // Pipelines
  isPipelineRunning: boolean;
  currentPipeline: GrokPipeline | null;
  pipelineProgress: number;
  runPipeline: (pipeline: GrokPipeline, target?: string) => Promise<GrokPipelineResult>;

  // Mémoire
  memories: GrokMemory[];
  remember: (key: string, value: string) => void;
  recall: (key: string) => string | undefined;
  forgetMemory: (key: string) => void;
  loadMemories: () => void;

  // Branches
  branches: GrokBranch[];
  currentBranchId: string;
  forkBranch: (name: string) => GrokBranch | null;
  checkoutBranch: (branchId: string) => void;

  // Skills
  activeSkills: GrokSkill[];
  activateSkill: (skill: GrokSkill) => void;
  deactivateSkill: (skill: GrokSkill) => void;
  toggleSkill: (skill: GrokSkill) => void;

  // Coûts
  costReport: GrokCostReport;
  refreshCostReport: () => void;
  resetSessionCosts: () => void;

  // UI State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  selectedTab: 'tasks' | 'sessions' | 'skills' | 'memory' | 'costs' | 'logs';
  setSelectedTab: (tab: 'tasks' | 'sessions' | 'skills' | 'memory' | 'costs' | 'logs') => void;

  // Logs
  logs: GrokCliLogEntry[];
  clearLogs: () => void;
}

// ============================================
// Création du Store
// ============================================

export const useGrokCliStore = create<GrokCliStore>()(
  persist(
    (set, get) => ({
      // ============================================
      // Configuration
      // ============================================
      
      config: {
        model: 'grok-3',
        yoloMode: 'off',
        securityMode: 'auto',
        reasoningMode: 'medium',
        maxRounds: 30,
        autoEdit: false,
        activeSkills: [],
      },

      setConfig: (newConfig) => {
        set((state) => ({
          config: { ...state.config, ...newConfig },
        }));
        grokCliService.setConfig(newConfig);
      },

      setModel: (model) => {
        set((state) => ({
          config: { ...state.config, model },
        }));
        grokCliService.setModel(model);
      },

      setSecurityMode: (mode) => {
        set((state) => ({
          config: { ...state.config, securityMode: mode },
        }));
        grokCliService.setSecurityMode(mode);
      },

      setReasoningMode: (mode) => {
        set((state) => ({
          config: { ...state.config, reasoningMode: mode },
        }));
        grokCliService.setReasoningMode(mode);
      },

      // ============================================
      // Tâches
      // ============================================

      tasks: [],
      currentTaskId: null,
      taskResults: new Map(),

      createTask: (options) => {
        const task = grokCliService.createTask(options);
        set((state) => ({
          tasks: [...state.tasks, task],
          currentTaskId: task.id,
        }));
        return task;
      },

      executeTask: async (taskId) => {
        set({ 
          isExecuting: true, 
          currentTaskId: taskId,
          currentStatus: 'pending',
          currentLogs: [],
          streamOutput: '',
        });

        const callbacks: TaskExecutionCallbacks = {
          onStatusChange: (status) => {
            set({ currentStatus: status });
          },
          onLog: (log) => {
            set((state) => ({
              currentLogs: [...state.currentLogs, log],
              logs: [...state.logs.slice(-99), log],
            }));
          },
          onStream: (chunk) => {
            set((state) => ({
              streamOutput: state.streamOutput + chunk,
            }));
          },
        };

        try {
          const result = await grokCliService.executeTask(taskId, callbacks);
          
          set((state) => {
            const newResults = new Map(state.taskResults);
            newResults.set(taskId, result);
            return {
              taskResults: newResults,
              isExecuting: false,
              currentStatus: result.status,
            };
          });

          get().refreshCostReport();
          return result;

        } catch (error) {
          const errorResult: GrokCliResult = {
            taskId,
            status: 'failed',
            summary: error instanceof Error ? error.message : 'Erreur inconnue',
            diffs: [],
            logs: get().currentLogs,
          };

          set((state) => {
            const newResults = new Map(state.taskResults);
            newResults.set(taskId, errorResult);
            return {
              taskResults: newResults,
              isExecuting: false,
              currentStatus: 'failed',
            };
          });

          return errorResult;
        }
      },

      runTask: async (options) => {
        const task = get().createTask(options);
        return get().executeTask(task.id);
      },

      cancelTask: () => {
        grokCliService.cancelTask();
        set({ isExecuting: false, currentStatus: 'cancelled' });
      },

      getTask: (taskId) => {
        return get().tasks.find(t => t.id === taskId);
      },

      getResult: (taskId) => {
        return get().taskResults.get(taskId);
      },

      // ============================================
      // État d'exécution
      // ============================================

      isExecuting: false,
      currentStatus: null,
      currentLogs: [],
      streamOutput: '',

      // ============================================
      // Sessions
      // ============================================

      sessions: [],
      currentSessionId: null,

      createSession: (name) => {
        const session = grokCliService.createSession(name);
        set((state) => ({
          sessions: [...state.sessions, session],
          currentSessionId: session.id,
          branches: session.branches,
          currentBranchId: session.currentBranchId,
        }));
        return session;
      },

      switchSession: (sessionId) => {
        const session = grokCliService.switchSession(sessionId);
        if (session) {
          set({
            currentSessionId: sessionId,
            branches: session.branches,
            currentBranchId: session.currentBranchId,
          });
        }
      },

      deleteSession: (sessionId) => {
        grokCliService.deleteSession(sessionId);
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
        }));
      },

      getCurrentSession: () => {
        const { currentSessionId, sessions } = get();
        return sessions.find((s) => s.id === currentSessionId) || null;
      },

      // ============================================
      // Pipelines
      // ============================================

      isPipelineRunning: false,
      currentPipeline: null,
      pipelineProgress: 0,

      runPipeline: async (pipeline, target) => {
        set({
          isPipelineRunning: true,
          currentPipeline: pipeline,
          pipelineProgress: 0,
        });

        try {
          const result = await grokCliService.runPipeline(pipeline, target);
          const completed = result.steps.filter((s) => s.status === 'completed').length;
          set({ pipelineProgress: Math.round((completed / result.steps.length) * 100) });
          return result;
        } finally {
          set({ isPipelineRunning: false, currentPipeline: null });
        }
      },

      // ============================================
      // Mémoire
      // ============================================

      memories: [],

      remember: (key, value) => {
        grokCliService.remember(key, value);
        get().loadMemories();
      },

      recall: (key) => {
        return grokCliService.recall(key);
      },

      forgetMemory: (key) => {
        grokCliService.forgetMemory(key);
        get().loadMemories();
      },

      loadMemories: () => {
        const memories = grokCliService.listMemories();
        set({ memories });
      },

      // ============================================
      // Branches
      // ============================================

      branches: [{ id: 'main', name: 'main', messageStartIndex: 0, createdAt: new Date() }],
      currentBranchId: 'main',

      forkBranch: (name) => {
        const branch = grokCliService.forkBranch(name);
        if (branch) {
          set((state) => ({
            branches: [...state.branches, branch],
            currentBranchId: branch.id,
          }));
        }
        return branch;
      },

      checkoutBranch: (branchId) => {
        const success = grokCliService.checkoutBranch(branchId);
        if (success) {
          set({ currentBranchId: branchId });
        }
      },

      // ============================================
      // Skills
      // ============================================

      activeSkills: [],

      activateSkill: (skill) => {
        grokCliService.activateSkill(skill);
        set((state) => ({
          activeSkills: state.activeSkills.includes(skill)
            ? state.activeSkills
            : [...state.activeSkills, skill],
        }));
      },

      deactivateSkill: (skill) => {
        grokCliService.deactivateSkill(skill);
        set((state) => ({
          activeSkills: state.activeSkills.filter((s) => s !== skill),
        }));
      },

      toggleSkill: (skill) => {
        const { activeSkills } = get();
        if (activeSkills.includes(skill)) {
          get().deactivateSkill(skill);
        } else {
          get().activateSkill(skill);
        }
      },

      // ============================================
      // Coûts
      // ============================================

      costReport: {
        sessionCost: 0,
        dailyCost: 0,
        totalCost: 0,
        tokensUsed: { input: 0, output: 0 },
        isOverBudget: false,
      },

      refreshCostReport: () => {
        const report = grokCliService.getCostReport();
        set({ costReport: report });
      },

      resetSessionCosts: () => {
        grokCliService.resetSessionCosts();
        get().refreshCostReport();
      },

      // ============================================
      // UI State
      // ============================================

      isSidebarOpen: true,
      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
      },

      selectedTab: 'tasks',
      setSelectedTab: (tab) => {
        set({ selectedTab: tab });
      },

      // ============================================
      // Logs
      // ============================================

      logs: [],
      clearLogs: () => {
        set({ logs: [], currentLogs: [] });
      },
    }),
    {
      name: 'grok-cli-store',
      partialize: (state) => ({
        config: state.config,
        activeSkills: state.activeSkills,
        isSidebarOpen: state.isSidebarOpen,
        selectedTab: state.selectedTab,
      }),
    }
  )
);
