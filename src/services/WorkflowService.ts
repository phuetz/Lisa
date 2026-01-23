/**
 * ⚙️ Workflow Service - Exécution de Workflows Parallèles
 * Gère les workflows autonomes avec validation et audit
 */

import type { ActionProposal, ValidationResult } from '../agents/CriticAgentV2';
import { criticAgentV2 } from '../agents/CriticAgentV2';
import { auditActions } from './AuditService';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  action: ActionProposal;
  timeout?: number; // ms
  retries?: number;
  dependencies?: string[]; // IDs des étapes précédentes
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  parallel?: boolean;
  timeout?: number; // ms
  createdAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'paused';
  startTime: string;
  endTime?: string;
  stepResults: Map<string, StepResult>;
  error?: string;
}

export interface StepResult {
  stepId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
  duration: number; // ms
  validation?: ValidationResult;
}

class WorkflowServiceImpl {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private maxExecutions = 500;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Créer un workflow
   */
  createWorkflow(
    name: string,
    description: string,
    steps: WorkflowStep[],
    parallel: boolean = false
  ): WorkflowDefinition {
    const workflow: WorkflowDefinition = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      steps,
      parallel,
      createdAt: new Date().toISOString()
    };

    this.workflows.set(workflow.id, workflow);
    this.saveToStorage();

    auditActions.toolExecuted('createWorkflow', {
      workflowId: workflow.id,
      name,
      stepsCount: steps.length
    });

    return workflow;
  }

  /**
   * Exécuter un workflow
   */
  async executeWorkflow(
    workflowId: string,
    onApprovalRequired?: (result: ValidationResult) => Promise<boolean>
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      status: 'running',
      startTime: new Date().toISOString(),
      stepResults: new Map()
    };

    try {
      if (workflow.parallel) {
        await this.executeParallel(workflow, execution, onApprovalRequired);
      } else {
        await this.executeSequential(workflow, execution, onApprovalRequired);
      }

      execution.status = 'success';
      execution.endTime = new Date().toISOString();

      auditActions.toolExecuted('executeWorkflow', {
        workflowId,
        executionId: execution.id,
        status: 'success'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      execution.status = 'failed';
      execution.error = errorMsg;
      execution.endTime = new Date().toISOString();

      auditActions.errorOccurred(`Workflow execution failed: ${errorMsg}`, {
        workflowId,
        executionId: execution.id
      });
    }

    this.executions.set(execution.id, execution);
    if (this.executions.size > this.maxExecutions) {
      const firstKey = this.executions.keys().next().value;
      this.executions.delete(firstKey);
    }

    this.saveToStorage();
    return execution;
  }

  /**
   * Exécuter les étapes séquentiellement
   */
  private async executeSequential(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    onApprovalRequired?: (result: ValidationResult) => Promise<boolean>
  ): Promise<void> {
    for (const step of workflow.steps) {
      const stepResult: StepResult = {
        stepId: step.id,
        status: 'running',
        duration: 0
      };

      const startTime = Date.now();

      try {
        // Valider l'action
        const validation = await criticAgentV2.validateAction(step.action);
        stepResult.validation = validation;

        // Demander l'approbation si nécessaire
        if (validation.requiresUserApproval && onApprovalRequired) {
          const approved = await onApprovalRequired(validation);
          if (!approved) {
            stepResult.status = 'skipped';
            stepResult.result = 'User rejected';
            execution.stepResults.set(step.id, stepResult);
            continue;
          }
        }

        // Exécuter l'action
        if (validation.approved) {
          stepResult.result = await this.executeAction(step.action);
          stepResult.status = 'success';
        } else {
          stepResult.status = 'failed';
          stepResult.error = 'Action validation failed';
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stepResult.status = 'failed';
        stepResult.error = errorMsg;
      }

      stepResult.duration = Date.now() - startTime;
      execution.stepResults.set(step.id, stepResult);
    }
  }

  /**
   * Exécuter les étapes en parallèle
   */
  private async executeParallel(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    onApprovalRequired?: (result: ValidationResult) => Promise<boolean>
  ): Promise<void> {
    const promises = workflow.steps.map(step =>
      this.executeStep(step, execution, onApprovalRequired)
    );

    await Promise.all(promises);
  }

  /**
   * Exécuter une étape
   */
  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    onApprovalRequired?: (result: ValidationResult) => Promise<boolean>
  ): Promise<void> {
    const stepResult: StepResult = {
      stepId: step.id,
      status: 'running',
      duration: 0
    };

    const startTime = Date.now();

    try {
      // Valider l'action
      const validation = await criticAgentV2.validateAction(step.action);
      stepResult.validation = validation;

      // Demander l'approbation si nécessaire
      if (validation.requiresUserApproval && onApprovalRequired) {
        const approved = await onApprovalRequired(validation);
        if (!approved) {
          stepResult.status = 'skipped';
          stepResult.result = 'User rejected';
          execution.stepResults.set(step.id, stepResult);
          return;
        }
      }

      // Exécuter l'action
      if (validation.approved) {
        stepResult.result = await this.executeAction(step.action);
        stepResult.status = 'success';
      } else {
        stepResult.status = 'failed';
        stepResult.error = 'Action validation failed';
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      stepResult.status = 'failed';
      stepResult.error = errorMsg;
    }

    stepResult.duration = Date.now() - startTime;
    execution.stepResults.set(step.id, stepResult);
  }

  /**
   * Exécuter une action (placeholder)
   */
  private async executeAction(action: ActionProposal): Promise<unknown> {
    // Simuler l'exécution
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          actionId: action.id,
          executed: true,
          timestamp: new Date().toISOString()
        });
      }, 100);
    });
  }

  /**
   * Obtenir un workflow
   */
  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Obtenir une exécution
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Lister les workflows
   */
  listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Lister les exécutions
   */
  listExecutions(limit: number = 50): WorkflowExecution[] {
    return Array.from(this.executions.values())
      .slice(-limit)
      .reverse();
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    const executions = Array.from(this.executions.values());
    const successful = executions.filter(e => e.status === 'success').length;
    const failed = executions.filter(e => e.status === 'failed').length;

    const totalDuration = executions.reduce((sum, e) => {
      if (e.startTime && e.endTime) {
        return sum + (new Date(e.endTime).getTime() - new Date(e.startTime).getTime());
      }
      return sum;
    }, 0);

    return {
      totalWorkflows: this.workflows.size,
      totalExecutions: executions.length,
      successful,
      failed,
      successRate: executions.length > 0 ? Math.round((successful / executions.length) * 100) : 0,
      averageDuration: executions.length > 0 ? Math.round(totalDuration / executions.length) : 0
    };
  }

  /**
   * Sauvegarder dans localStorage
   */
  private saveToStorage(): void {
    const workflows = Array.from(this.workflows.values());
    localStorage.setItem('lisa:workflows:definitions', JSON.stringify(workflows));
  }

  /**
   * Charger depuis localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('lisa:workflows:definitions');
      if (stored) {
        const workflows = JSON.parse(stored);
        workflows.forEach((wf: WorkflowDefinition) => {
          this.workflows.set(wf.id, wf);
        });
      }
    } catch (e) {
      console.error('Erreur chargement workflows:', e);
    }
  }

  /**
   * Supprimer un workflow
   */
  deleteWorkflow(workflowId: string): boolean {
    return this.workflows.delete(workflowId);
  }
}

// Exporter une instance singleton
export const workflowService = new WorkflowServiceImpl();
