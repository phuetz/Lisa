/**
 * Workflow Store - Domain-specific selectors for workflow state
 * Provides typed access to workflow-related state from appStore
 *
 * Usage:
 *   import { useWorkflowStore, workflowSelectors, workflowActions } from '../store/workflowStore';
 *   const plan = useWorkflowStore(workflowSelectors.plan);
 *   const nodeStatus = useWorkflowStore(workflowSelectors.nodeExecutionStatus);
 */

import { useAppStore, type AppState, type WorkflowStep, type NodeExecutionStatus, type EdgeExecutionStatus } from './appStore';

/* ---------- Workflow State Type ---------- */
export interface WorkflowState {
  plan: WorkflowStep[] | null;
  templates: string[];
  checkpoints: string[];
  nodeExecutionStatus: Record<string, NodeExecutionStatus>;
  edgeExecutionStatus: Record<string, EdgeExecutionStatus>;
}

/* ---------- Re-export types ---------- */
export type { WorkflowStep, NodeExecutionStatus, EdgeExecutionStatus };

/* ---------- Selectors ---------- */
export const workflowSelectors = {
  /** Current workflow plan */
  plan: (state: AppState): WorkflowStep[] | null => state.plan,

  /** Workflow templates */
  templates: (state: AppState): string[] => state.templates,

  /** Workflow checkpoints */
  checkpoints: (state: AppState): string[] => state.checkpoints,

  /** Node execution status map */
  nodeExecutionStatus: (state: AppState): Record<string, NodeExecutionStatus> =>
    state.nodeExecutionStatus,

  /** Edge execution status map */
  edgeExecutionStatus: (state: AppState): Record<string, EdgeExecutionStatus> =>
    state.edgeExecutionStatus,

  /** Get full workflow state */
  all: (state: AppState): WorkflowState => ({
    plan: state.plan,
    templates: state.templates,
    checkpoints: state.checkpoints,
    nodeExecutionStatus: state.nodeExecutionStatus,
    edgeExecutionStatus: state.edgeExecutionStatus,
  }),

  /** Check if plan is active */
  hasPlan: (state: AppState): boolean => state.plan !== null && state.plan.length > 0,

  /** Get plan step count */
  planStepCount: (state: AppState): number => state.plan?.length ?? 0,

  /** Get specific node status */
  getNodeStatus: (nodeId: string) => (state: AppState): NodeExecutionStatus =>
    state.nodeExecutionStatus[nodeId] ?? 'idle',

  /** Get specific edge status */
  getEdgeStatus: (edgeId: string) => (state: AppState): EdgeExecutionStatus =>
    state.edgeExecutionStatus[edgeId] ?? 'idle',

  /** Get completed steps */
  completedSteps: (state: AppState): WorkflowStep[] =>
    (state.plan ?? []).filter(step => step.status === 'completed'),

  /** Get pending steps */
  pendingSteps: (state: AppState): WorkflowStep[] =>
    (state.plan ?? []).filter(step => step.status === 'pending'),

  /** Get current step (first in_progress) */
  currentStep: (state: AppState): WorkflowStep | undefined =>
    (state.plan ?? []).find(step => step.status === 'in_progress'),

  /** Check if workflow is running */
  isRunning: (state: AppState): boolean =>
    (state.plan ?? []).some(step => step.status === 'in_progress'),

  /** Get progress percentage */
  progress: (state: AppState): number => {
    const plan = state.plan ?? [];
    if (plan.length === 0) return 0;
    const completed = plan.filter(s => s.status === 'completed').length;
    return Math.round((completed / plan.length) * 100);
  },
};

/* ---------- Actions ---------- */
export const workflowActions = {
  /** Set workflow plan */
  setPlan: (plan: WorkflowStep[] | null) => {
    useAppStore.getState().setPlan(plan);
  },

  /** Set templates */
  setTemplates: (templates: string[]) => {
    useAppStore.getState().setTemplates(templates);
  },

  /** Set checkpoints */
  setCheckpoints: (checkpoints: string[]) => {
    useAppStore.getState().setCheckpoints(checkpoints);
  },

  /** Set node execution status */
  setNodeExecutionStatus: (nodeId: string, status: NodeExecutionStatus) => {
    useAppStore.getState().setNodeExecutionStatus(nodeId, status);
  },

  /** Set edge execution status */
  setEdgeExecutionStatus: (edgeId: string, status: EdgeExecutionStatus) => {
    useAppStore.getState().setEdgeExecutionStatus(edgeId, status);
  },

  /** Reset all execution status */
  resetExecutionStatus: () => {
    useAppStore.getState().resetExecutionStatus();
  },

  /** Update step status in plan */
  updateStepStatus: (stepId: number, status: WorkflowStep['status'], result?: unknown, error?: string) => {
    const plan = useAppStore.getState().plan;
    if (!plan) return;

    const updatedPlan = plan.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          status,
          result: result ?? step.result,
          error: error ?? step.error,
          endTime: status === 'completed' || status === 'failed' ? Date.now() : step.endTime,
          duration: step.startTime && (status === 'completed' || status === 'failed')
            ? Date.now() - step.startTime
            : step.duration,
        };
      }
      return step;
    });

    useAppStore.getState().setPlan(updatedPlan);
  },

  /** Start a step */
  startStep: (stepId: number) => {
    const plan = useAppStore.getState().plan;
    if (!plan) return;

    const updatedPlan = plan.map(step => {
      if (step.id === stepId) {
        return { ...step, status: 'in_progress' as const, startTime: Date.now() };
      }
      return step;
    });

    useAppStore.getState().setPlan(updatedPlan);
  },

  /** Clear plan */
  clearPlan: () => {
    useAppStore.getState().setPlan(null);
    useAppStore.getState().resetExecutionStatus();
  },
};

/* ---------- Hook ---------- */
/**
 * Hook to access workflow state with a selector
 * @example
 * const plan = useWorkflowStore(workflowSelectors.plan);
 * const isRunning = useWorkflowStore(workflowSelectors.isRunning);
 */
export function useWorkflowStore<T>(selector: (state: AppState) => T): T {
  return useAppStore(selector);
}

/* ---------- Direct state access (for non-React code) ---------- */
export const getWorkflowState = (): WorkflowState => workflowSelectors.all(useAppStore.getState());

/* ---------- Subscribe to workflow state changes ---------- */
export const subscribeToWorkflow = (
  selector: (state: AppState) => unknown,
  callback: (value: unknown, prevValue: unknown) => void
) => {
  return useAppStore.subscribe(selector, callback);
};
