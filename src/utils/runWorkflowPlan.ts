/**
 * runWorkflowPlan.ts
 * 
 * Core utility for executing a multi-step workflow plan
 * with dependency resolution, parallel execution, and error handling.
 */

import type { WorkflowStep, PlannerResult } from '../types/Planner';
import { agentRegistry } from '../agents/registry';
import { logEvent } from './logger';
import { handleAgentError } from './handleAgentError';
import { performance } from 'perf_hooks';

const perf = typeof performance !== 'undefined' ? performance : { now: Date.now };

/**
 * Executes a workflow plan step by step, respecting dependencies
 * 
 * @param plan - Array of workflow steps to execute
 * @param onPlanUpdate - Optional callback to notify of plan changes
 * @returns Promise resolving to execution results
 */
export async function runWorkflowPlan(
  plan: WorkflowStep[],
  onPlanUpdate?: (plan: WorkflowStep[]) => void
): Promise<PlannerResult> {
  const totalStartTime = perf.now();
  let currentPlan = [...plan]; // Work with a copy to avoid mutating the input
  let hasError = false;
  let progressMade = false;
  let pending = new Set<WorkflowStep>();
  
  try {
    // Log the start of execution
    logEvent(
      'plan_generated',
      { plan: currentPlan },
      `Starting execution of workflow with ${currentPlan.length} steps`
    );
    
    // Continue until all steps are either completed or failed
    while (currentPlan.some(step => step.status === 'pending' || step.status === 'in_progress')) {
      // Find steps that can be started (all dependencies satisfied)
      const runnableSteps = findRunnableSteps(currentPlan);
      pending = new Set(currentPlan.filter(s => s.status === 'pending'));
      
      if (runnableSteps.length === 0) {
        // No runnable steps but workflow not complete - we're deadlocked
        if (currentPlan.some(step => step.status === 'pending')) {
          throw new Error('Workflow deadlock: Some steps are pending but their dependencies cannot be satisfied');
        }
        break;
      }
      
      // Execute runnable steps in parallel
      const executionPromises = runnableSteps.map(step => executeWorkflowStep(step, currentPlan));
      const stepResults = await Promise.all(executionPromises);
      progressMade = stepResults.some(r => r.success);
      
      // Update the plan with results
      stepResults.forEach(({ step, success, error }) => {
        const index = currentPlan.findIndex(s => s.id === step.id);
        if (index !== -1) {
          currentPlan[index] = step;
        }
        
        if (!success) {
          hasError = true;
        }
      });
      
      // Notify about plan updates
      if (onPlanUpdate) {
        onPlanUpdate([...currentPlan]);
      }
      
      // If any step failed, stop execution
      if (hasError) {
        break;
      }
    }

    if (pending.size && !progressMade) {
      throw new Error('Dead-lock detected: circular dependencies or all steps failed');
    }
    
    // Calculate total duration
    const totalDuration = perf.now() - totalStartTime;
    
    // Generate summary and result
    const successCount = currentPlan.filter(s => s.status === 'completed').length;
    const failedCount = currentPlan.filter(s => s.status === 'failed').length;
    const pendingCount = currentPlan.filter(s => s.status === 'pending').length;
    
    const summary = hasError
      ? `Workflow execution failed after ${successCount} completed steps`
      : `Workflow completed successfully (${successCount}/${currentPlan.length} steps) in ${(totalDuration / 1000).toFixed(2)}s`;
    
    // Log completion
    logEvent(
      hasError ? 'plan_failed' : 'plan_completed',
      { plan: currentPlan },
      summary
    );
    
    return {
      success: !hasError,
      plan: currentPlan,
      summary,
      totalDuration,
    };
    
  } catch (error) {
    // Handle unexpected execution errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logEvent(
      'plan_failed',
      { plan: currentPlan, error: errorMessage },
      `Workflow execution failed with error: ${errorMessage}`
    );
    
    return {
      success: false,
      plan: currentPlan,
      error: error instanceof Error
        ? handleAgentError(
            currentPlan.find(s => s.status === 'in_progress') || currentPlan[0],
            error
          )
        : undefined,
      summary: `Workflow execution failed: ${errorMessage}`,
      totalDuration: perf.now() - totalStartTime,
    };
  }
}

/**
 * Find steps that are ready to be executed (dependencies satisfied)
 * 
 * @param plan - Current state of the workflow plan
 * @returns Array of steps ready for execution
 */
function findRunnableSteps(plan: WorkflowStep[]): WorkflowStep[] {
  return plan.filter(step => {
    // Only consider pending steps
    if (step.status !== 'pending') {
      return false;
    }
    
    // Check if all dependencies are completed
    const allDependenciesSatisfied = step.dependencies.every(depId => {
      const depStep = plan.find(s => s.id === depId);
      return depStep && depStep.status === 'completed';
    });
    
    return allDependenciesSatisfied;
  });
}

/**
 * Execute a single workflow step by calling the appropriate agent
 * 
 * @param step - The workflow step to execute
 * @param plan - The complete workflow plan (for context)
 * @returns Promise with updated step and success status
 */
async function executeWorkflowStep(
  step: WorkflowStep,
  plan: WorkflowStep[]
): Promise<{ step: WorkflowStep, success: boolean, error?: Error }> {
  // Mark step as in progress
  step.status = 'in_progress';
  step.startTime = perf.now();
  
  // Log step start
  logEvent(
    'step_started',
    { step },
    `Starting step ${step.id}: ${step.description}`
  );
  
  try {
    // Find the agent in the registry
    const agent = agentRegistry.getAgent(step.agent);
    if (!agent) {
      throw new Error(`Agent "${step.agent}" not found in registry`);
    }
    
    // Execute the command on the agent
    const context = { plan };
    const result = await agent.execute({
      command: step.command,
      parameters: step.args,
      context,
    });
    
    // Update step with results
    step.status = 'completed';
    step.endTime = perf.now();
    step.duration = step.endTime - step.startTime;
    step.result = result;
    
    // Log step completion
    logEvent(
      'step_completed',
      { step, result },
      `Completed step ${step.id} in ${(step.duration / 1000).toFixed(2)}s: ${step.description}`
    );
    
    return { step, success: true };
    
  } catch (error) {
    // Update step with error information
    step.status = 'failed';
    step.endTime = perf.now();
    step.duration = step.endTime - step.startTime;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    step.result = { success: false, error: errorMessage };
    
    // Log step failure
    logEvent(
      'step_failed',
      { step, error: errorMessage },
      `Failed step ${step.id}: ${errorMessage}`
    );
    
    return { 
      step,
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
