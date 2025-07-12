/**
 * handleAgentError.ts
 * 
 * Utility for handling and reporting errors that occur during workflow execution.
 * Provides structured error reporting and suggestions for recovery.
 */

import type { WorkflowStep, WorkflowErrorReport } from '../types/Planner';
import { logEvent } from './logger';

/**
 * Processes an error that occurred during workflow step execution
 * 
 * @param step - The workflow step that failed
 * @param error - The error that was thrown
 * @returns A structured error report with recovery suggestions
 */
export function handleAgentError(
  step: WorkflowStep,
  error: Error
): WorkflowErrorReport {
  // Create base error report
  const errorReport: WorkflowErrorReport = {
    failedStep: step,
    message: error.message,
    error,
    isRecoverable: determineIfRecoverable(step, error),
  };

  // Add recovery hints based on error type
  errorReport.recoveryHint = generateRecoveryHint(step, error);

  // Log the error event
  logEvent(
    'step_failed',
    { step, error: error.message },
    `Step ${step.id} (${step.agent}.${step.command}) failed: ${error.message}`
  );

  return errorReport;
}

/**
 * Determines whether an error is potentially recoverable by revising the plan
 * 
 * @param step - The failed workflow step
 * @param error - The error that occurred
 * @returns boolean indicating if recovery is possible
 */
function determineIfRecoverable(step: WorkflowStep, error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  
  // Non-recoverable errors (fundamental issues that revision won't fix)
  const nonRecoverablePatterns = [
    'api key',
    'authorization failed',
    'permission denied',
    'network unavailable',
    'service unavailable',
    'rate limit',
    'quota exceeded',
  ];
  
  // Check for non-recoverable patterns
  if (nonRecoverablePatterns.some(pattern => errorMessage.includes(pattern))) {
    return false;
  }

  // Agent not found is non-recoverable unless it's a typo
  if (errorMessage.includes('agent not found') || errorMessage.includes('unknown agent')) {
    return true; // LLM can try to find the correct agent name
  }

  // Invalid argument issues are often recoverable with a revised plan
  if (
    errorMessage.includes('invalid argument') ||
    errorMessage.includes('missing required') ||
    errorMessage.includes('expected')
  ) {
    return true;
  }

  // By default, assume errors are recoverable
  return true;
}

/**
 * Generates a helpful hint for resolving the error
 * 
 * @param step - The failed workflow step
 * @param error - The error that occurred
 * @returns A suggestion for recovery
 */
function generateRecoveryHint(step: WorkflowStep, error: Error): string {
  const errorMessage = error.message.toLowerCase();
  
  // Agent not found
  if (errorMessage.includes('agent not found') || errorMessage.includes('unknown agent')) {
    return 'Check the agent name and ensure it exists in the registry.';
  }
  
  // Command not found
  if (errorMessage.includes('command not found') || errorMessage.includes('method not found')) {
    return `Verify that the command "${step.command}" is supported by the ${step.agent}.`;
  }
  
  // Missing arguments
  if (errorMessage.includes('missing required') || errorMessage.includes('required parameter')) {
    return 'Ensure all required parameters are provided with the correct types.';
  }
  
  // Invalid argument value
  if (errorMessage.includes('invalid value')) {
    return 'Check that argument values match the expected format.';
  }
  
  // Rate limits
  if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
    return 'The service is rate limited. Try again later with fewer requests.';
  }
  
  // Generic fallback
  return 'Consider revising the step or its dependencies to address the error.';
}
