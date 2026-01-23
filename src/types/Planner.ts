/**
 * Planner.ts
 * 
 * Type definitions for the PlannerAgent and workflow execution system
 */

import type { AgentExecuteProps, AgentExecuteResult } from '../features/agents/core/types.js';

/**
 * Status of a workflow step
 */
export type WorkflowStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * Represents a single step in a workflow
 */
export interface WorkflowStep {
  /** Unique identifier for this step */
  id: number;
  /** Human-readable description of what this step does */
  description: string;
  /** Name of the agent responsible for executing this step */
  agent: string;
  /** The command/function to call on the agent */
  command: string;
  /** Arguments to pass to the command */
  args: Record<string, unknown>;
  /** IDs of steps that must complete before this one can start */
  dependencies: number[];
  /** Current execution status */
  status: WorkflowStepStatus;
  /** Output of the step execution */
  result?: unknown;
  /** Performance timestamp when step started */
  startTime?: number;
  /** Performance timestamp when step completed */
  endTime?: number;
  /** Execution time in milliseconds */
  duration?: number;
}

/**
 * Input properties for the PlannerAgent execute method
 */
export interface PlannerAgentExecuteProps extends AgentExecuteProps {
  /** Name to save the current plan as a reusable template */
  saveAsTemplate?: string;
  /** Name of an existing template to load instead of generating a new plan */
  loadFromTemplate?: string;
  /** ID of a checkpoint to resume execution from */
  resumeFromCheckpointId?: string;
  /** Callback to notify UI of plan updates */
  onPlanUpdate?: (plan: WorkflowStep[]) => void;
}

/**
 * A custom error class for detailed reporting when a workflow step fails.
 * Extends the native Error class to ensure type compatibility.
 */
export class WorkflowErrorReport extends Error {
  /** The step that failed */
  failedStep: WorkflowStep;
  /** Whether the error can be recovered by revising the plan */
  isRecoverable: boolean;
  /** Suggested action to recover */
  recoveryHint?: string;

  constructor(message: string, failedStep: WorkflowStep, isRecoverable = false, recoveryHint?: string) {
    super(message);
    this.name = 'WorkflowErrorReport';
    this.failedStep = failedStep;
    this.isRecoverable = isRecoverable;
    this.recoveryHint = recoveryHint;

    // This is necessary for custom errors to work correctly in TypeScript
    Object.setPrototypeOf(this, WorkflowErrorReport.prototype);
  }
}

/**
 * Result of a workflow plan execution.
 * Extends the standard agent result to include planner-specific data.
 */
export interface PlannerResult extends AgentExecuteResult {
  /** Whether the execution was successful */
  success: boolean;
  /** The final state of all workflow steps */
  plan: WorkflowStep[];
  /** Detailed error report if the workflow failed */
  error?: WorkflowErrorReport | Error | string;
  /** Human-readable summary of the execution, mapped to output */
  output: string;
  /** Total execution time in milliseconds */
  totalDuration?: number;
  /** A detailed explanation of the generated plan */
  explanation?: string | null;
  /** The unique identifier for the execution trace */
  traceId?: string | null;
}

/**
 * Log event types for workflow execution
 */
export type WorkflowEventType = 
  | 'plan_generated'
  | 'plan_loaded'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'plan_revised'
  | 'plan_completed'
  | 'plan_failed'
  | 'checkpoint_created'
  | 'checkpoint_resumed'
  | 'template_saved'
  | 'template_loaded'
  | 'plan_status'
  | 'plan_execution_started'
  | 'plan_explanation_failed'
  | 'plan_explanation'
  | 'plan_revision_failed'
  | 'plan_template_saved'
  | 'checkpoint_deleted'
  | 'plan_succeeded'
  | 'checkpoint_saved';

/**
 * Structure of a workflow log event
 */
export interface WorkflowEvent {
  /** Type of event */
  type: WorkflowEventType;
  /** Timestamp when the event occurred */
  timestamp: number;
  /** Additional data specific to the event type */
  payload?: Record<string, unknown>;
  /** Human-readable message */
  message: string;
}
