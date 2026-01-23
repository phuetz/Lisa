/**
 * WorkflowEngine.ts
 * 
 * A dedicated engine for executing multi-step workflows with advanced features:
 * - Parallel execution of independent steps
 * - Auto-retry and recovery mechanisms
 * - Workflow visualization helpers
 * - Execution history and performance metrics
 */

import { v4 as uuidv4 } from 'uuid';
import { saveToStorage, loadFromStorage } from './storage';
import { agentRegistry } from '../features/agents/core/registry';
import type { BaseAgent } from '../features/agents/core/types';

// Storage keys
const WORKFLOW_HISTORY_KEY = 'workflow_history';
const WORKFLOW_TEMPLATES_KEY = 'workflow_templates';

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // ms
const MAX_HISTORY_ITEMS = 50;
const MAX_PARALLEL_STEPS = 3;

// --- Type Definitions ---

export interface WorkflowStep {
  id: number;
  description: string;
  agent: string;
  command: string;
  args: Record<string, any>;
  dependencies: number[];
  status: 'pending' | 'waiting' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  startTime?: number;
  endTime?: number;
  duration?: number;
  retryCount?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
  progress: number; // 0-100
  elapsedTime?: number;
}

export interface WorkflowHistoryItem {
  id: string;
  workflow: Workflow;
  startTime: number;
  endTime?: number;
  duration?: number;
  outcome: 'completed' | 'failed' | 'cancelled';
  summary?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: Omit<WorkflowStep, 'status' | 'result' | 'startTime' | 'endTime' | 'duration' | 'retryCount'>[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowEngineOptions {
  maxRetries?: number;
  retryDelay?: number;
  maxParallelSteps?: number;
  onStepUpdate?: (step: WorkflowStep) => void;
  onWorkflowUpdate?: (workflow: Workflow) => void;
}

type WorkflowEventType = 'step-started' | 'step-completed' | 'step-failed' | 'workflow-started' | 
                         'workflow-completed' | 'workflow-failed' | 'workflow-paused' | 'workflow-resumed';

interface WorkflowEvent {
  type: WorkflowEventType;
  workflowId: string;
  stepId?: number;
  timestamp: number;
  data?: any;
}

// --- WorkflowEngine Class ---

export class WorkflowEngine {
  private templates: Map<string, WorkflowTemplate>;
  private history: WorkflowHistoryItem[];
  private activeWorkflows: Map<string, Workflow>;
  private options: Required<WorkflowEngineOptions>;
  private eventListeners: Map<WorkflowEventType, Array<(event: WorkflowEvent) => void>>;
  private workflowAbortControllers: Map<string, AbortController>;

  constructor(options: WorkflowEngineOptions = {}) {
    // Initialize options with defaults
    this.options = {
      maxRetries: options.maxRetries ?? MAX_RETRIES,
      retryDelay: options.retryDelay ?? RETRY_DELAY,
      maxParallelSteps: options.maxParallelSteps ?? MAX_PARALLEL_STEPS,
      onStepUpdate: options.onStepUpdate ?? (() => {}),
      onWorkflowUpdate: options.onWorkflowUpdate ?? (() => {})
    };

    // Load saved data
    this.templates = new Map(loadFromStorage<[string, WorkflowTemplate][]>(WORKFLOW_TEMPLATES_KEY) ?? []);
    this.history = loadFromStorage<WorkflowHistoryItem[]>(WORKFLOW_HISTORY_KEY) ?? [];
    this.activeWorkflows = new Map();
    this.eventListeners = new Map();
    this.workflowAbortControllers = new Map();

    // Limit history size
    if (this.history.length > MAX_HISTORY_ITEMS) {
      this.history = this.history.slice(-MAX_HISTORY_ITEMS);
      this.saveHistory();
    }
  }

  // --- Public API ---

  /**
   * Create a new workflow from a template or raw steps
   */
  createWorkflow(params: {
    name: string,
    description: string,
    templateId?: string,
    steps?: Omit<WorkflowStep, 'status' | 'result' | 'startTime' | 'endTime' | 'duration' | 'retryCount'>[]
  }): Workflow {
    let steps: WorkflowStep[];

    if (params.templateId) {
      const template = this.templates.get(params.templateId);
      if (!template) throw new Error(`Template ${params.templateId} not found`);
      steps = template.steps.map(step => ({
        ...step,
        status: 'pending' as const,
        retryCount: 0
      }));
    } else if (params.steps) {
      steps = params.steps.map(step => ({
        ...step,
        status: 'pending' as const,
        retryCount: 0
      }));
    } else {
      throw new Error('Either templateId or steps must be provided');
    }

    const workflow: Workflow = {
      id: uuidv4(),
      name: params.name,
      description: params.description,
      steps,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'pending',
      progress: 0
    };

    this.activeWorkflows.set(workflow.id, workflow);
    return workflow;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    // Create abort controller for this workflow
    const abortController = new AbortController();
    this.workflowAbortControllers.set(workflowId, abortController);

    // Create history entry
    const historyItem: WorkflowHistoryItem = {
      id: uuidv4(),
      workflow: JSON.parse(JSON.stringify(workflow)), // deep copy
      startTime: Date.now(),
      outcome: 'completed' // optimistic default
    };
    
    // Start execution
    workflow.status = 'in_progress';
    workflow.updatedAt = Date.now();
    this.notifyWorkflowUpdate(workflow);
    this.emitEvent({ type: 'workflow-started', workflowId, timestamp: Date.now() });

    try {
      // Execute workflow steps
      await this.executeSteps(workflow, abortController.signal);
      
      // Complete workflow
      workflow.status = 'completed';
      workflow.progress = 100;
      workflow.updatedAt = Date.now();
      workflow.elapsedTime = Date.now() - historyItem.startTime;
      
      // Update history
      historyItem.endTime = Date.now();
      historyItem.duration = historyItem.endTime - historyItem.startTime;
      historyItem.outcome = 'completed';
      historyItem.summary = this.generateWorkflowSummary(workflow);
      historyItem.workflow = JSON.parse(JSON.stringify(workflow)); // Final state
      
      this.history.push(historyItem);
      this.saveHistory();
      
      this.notifyWorkflowUpdate(workflow);
      this.emitEvent({ type: 'workflow-completed', workflowId, timestamp: Date.now() });
      
      // Clean up
      this.workflowAbortControllers.delete(workflowId);
      
      return workflow;
    } catch (error) {
      // Handle failure
      workflow.status = 'failed';
      workflow.updatedAt = Date.now();
      workflow.elapsedTime = Date.now() - historyItem.startTime;
      
      // Update history
      historyItem.endTime = Date.now();
      historyItem.duration = historyItem.endTime - historyItem.startTime;
      historyItem.outcome = 'failed';
      historyItem.summary = `Failed: ${error instanceof Error ? error.message : String(error)}`;
      historyItem.workflow = JSON.parse(JSON.stringify(workflow)); // Final state
      
      this.history.push(historyItem);
      this.saveHistory();
      
      this.notifyWorkflowUpdate(workflow);
      this.emitEvent({ 
        type: 'workflow-failed', 
        workflowId, 
        timestamp: Date.now(),
        data: { error: error instanceof Error ? error.message : String(error) }
      });
      
      // Clean up
      this.workflowAbortControllers.delete(workflowId);
      
      throw error;
    }
  }

  /**
   * Pause a running workflow
   */
  pauseWorkflow(workflowId: string): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    
    if (workflow.status !== 'in_progress') {
      throw new Error(`Cannot pause workflow in ${workflow.status} state`);
    }
    
    const abortController = this.workflowAbortControllers.get(workflowId);
    if (abortController) {
      abortController.abort('Workflow paused by user');
    }
    
    workflow.status = 'paused';
    workflow.updatedAt = Date.now();
    this.notifyWorkflowUpdate(workflow);
    this.emitEvent({ type: 'workflow-paused', workflowId, timestamp: Date.now() });
  }

  /**
   * Resume a paused workflow
   */
  async resumeWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    
    if (workflow.status !== 'paused') {
      throw new Error(`Cannot resume workflow in ${workflow.status} state`);
    }
    
    workflow.status = 'in_progress';
    workflow.updatedAt = Date.now();
    this.notifyWorkflowUpdate(workflow);
    this.emitEvent({ type: 'workflow-resumed', workflowId, timestamp: Date.now() });
    
    return this.executeWorkflow(workflowId);
  }

  /**
   * Cancel a workflow
   */
  cancelWorkflow(workflowId: string): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    
    if (workflow.status === 'completed' || workflow.status === 'failed') {
      throw new Error(`Cannot cancel workflow in ${workflow.status} state`);
    }
    
    const abortController = this.workflowAbortControllers.get(workflowId);
    if (abortController) {
      abortController.abort('Workflow cancelled by user');
    }
    
    // Find and mark all in-progress steps as failed
    workflow.steps
      .filter(step => step.status === 'in_progress')
      .forEach(step => {
        step.status = 'failed';
        step.endTime = Date.now();
        if (step.startTime) {
          step.duration = step.endTime - step.startTime;
        }
        this.options.onStepUpdate(step);
      });
    
    // Add to history
    const historyItem: WorkflowHistoryItem = {
      id: uuidv4(),
      workflow: JSON.parse(JSON.stringify(workflow)),
      startTime: workflow.steps.find(s => s.startTime)?.startTime || Date.now(),
      endTime: Date.now(),
      outcome: 'cancelled',
      summary: 'Workflow cancelled by user'
    };
    
    if (historyItem.endTime && historyItem.startTime) {
      historyItem.duration = historyItem.endTime - historyItem.startTime;
    }
    
    this.history.push(historyItem);
    this.saveHistory();
    
    // Clean up
    this.workflowAbortControllers.delete(workflowId);
    this.activeWorkflows.delete(workflowId);
  }

  /**
   * Save a workflow as a template
   */
  saveAsTemplate(workflowId: string, name: string, description: string, tags: string[] = []): WorkflowTemplate {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    
    // Extract reusable steps from workflow
    const templateSteps = workflow.steps.map(({
      id, description, agent, command, args, dependencies
    }) => ({
      id, description, agent, command, args, dependencies
    }));
    
    const template: WorkflowTemplate = {
      id: uuidv4(),
      name,
      description,
      steps: templateSteps,
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.templates.set(template.id, template);
    this.saveTemplates();
    
    return template;
  }

  /**
   * Get all workflow templates
   */
  getTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get workflow history
   */
  getHistory(): WorkflowHistoryItem[] {
    return [...this.history];
  }

  /**
   * Subscribe to workflow events
   */
  addEventListener(
    event: WorkflowEventType | '*', 
    callback: (event: WorkflowEvent) => void
  ): () => void {
    if (event === '*') {
      // Subscribe to all event types
      const allEvents: WorkflowEventType[] = [
        'step-started', 'step-completed', 'step-failed',
        'workflow-started', 'workflow-completed', 'workflow-failed',
        'workflow-paused', 'workflow-resumed'
      ];
      
      const unsubscribes = allEvents.map(e => this.addEventListener(e, callback));
      return () => unsubscribes.forEach(unsub => unsub());
    }
    
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    const listeners = this.eventListeners.get(event)!;
    listeners.push(callback);
    
    return () => {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  }

  // --- Private Methods ---

  private async executeSteps(workflow: Workflow, signal: AbortSignal): Promise<void> {
    const totalSteps = workflow.steps.length;
    const completedSteps = () => workflow.steps.filter(s => s.status === 'completed').length;
    
    // Mark initial steps as waiting
    workflow.steps.forEach(step => {
      if (step.dependencies.length === 0) {
        step.status = 'waiting';
      }
    });
    
    // Continue until all steps are completed or workflow fails
    while (completedSteps() < totalSteps) {
      if (signal.aborted) {
        throw new Error(`Workflow execution aborted: ${signal.reason}`);
      }
      
      // Find steps that can be executed (all dependencies satisfied)
      const executableSteps = workflow.steps.filter(step => {
        if (step.status !== 'waiting') return false;
        
        // Check if all dependencies are completed
        return step.dependencies.every(depId => {
          const depStep = workflow.steps.find(s => s.id === depId);
          return depStep && depStep.status === 'completed';
        });
      });
      
      if (executableSteps.length === 0 && completedSteps() < totalSteps) {
        // Check for deadlock
        const pendingOrWaiting = workflow.steps.filter(s => 
          s.status === 'pending' || s.status === 'waiting' || s.status === 'in_progress'
        );
        
        if (pendingOrWaiting.length > 0) {
          // Wait for in-progress steps to complete
          if (workflow.steps.some(s => s.status === 'in_progress')) {
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          } else {
            // Deadlock detected
            throw new Error('Workflow deadlock: no executable steps but workflow not complete');
          }
        }
      }
      
      // Execute steps in parallel, up to maxParallelSteps
      const stepPromises: Promise<void>[] = [];
      const stepsToRun = executableSteps.slice(0, this.options.maxParallelSteps);
      
      for (const step of stepsToRun) {
        stepPromises.push(this.executeStep(workflow, step, signal));
      }
      
      if (stepPromises.length === 0 && completedSteps() < totalSteps) {
        // No steps to execute but workflow not complete - wait for in-progress steps
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // Wait for all parallel steps to complete
      await Promise.all(stepPromises);
      
      // Update workflow progress
      workflow.progress = Math.round((completedSteps() / totalSteps) * 100);
      workflow.updatedAt = Date.now();
      this.notifyWorkflowUpdate(workflow);
    }
  }

  private async executeStep(
    workflow: Workflow, 
    step: WorkflowStep,
    signal: AbortSignal
  ): Promise<void> {
    // Mark as in progress
    step.status = 'in_progress';
    step.startTime = Date.now();
    step.retryCount = step.retryCount ?? 0;
    
    this.notifyStepUpdate(step);
    this.emitEvent({
      type: 'step-started',
      workflowId: workflow.id,
      stepId: step.id,
      timestamp: Date.now()
    });
    
    try {
      // Get agent from registry
      const agent = agentRegistry.getAgent(step.agent);
      if (!agent) {
        throw new Error(`Agent "${step.agent}" not found in registry`);
      }
      
      // Execute the agent command
      const result = await Promise.race([
        agent.execute({
          ...step.args,
          command: step.command
        }),
        new Promise<never>((_, reject) => {
          signal.addEventListener('abort', () => {
            reject(new Error(`Step execution aborted: ${signal.reason}`));
          });
        })
      ]);
      
      // Mark as completed
      step.status = 'completed';
      step.endTime = Date.now();
      step.duration = step.endTime - step.startTime;
      step.result = result;
      
      this.notifyStepUpdate(step);
      this.emitEvent({
        type: 'step-completed',
        workflowId: workflow.id,
        stepId: step.id,
        timestamp: Date.now(),
        data: { result }
      });
      
      // Check subsequent steps that can now be executed
      this.updateDependentSteps(workflow, step);
      
    } catch (error) {
      // Handle retry logic
      step.retryCount = (step.retryCount ?? 0) + 1;
      
      if (step.retryCount <= this.options.maxRetries && !signal.aborted) {
        // Retry after delay
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
        return this.executeStep(workflow, step, signal);
      }
      
      // Mark as failed if max retries exceeded
      step.status = 'failed';
      step.endTime = Date.now();
      step.duration = step.endTime - step.startTime;
      step.result = { 
        error: error instanceof Error ? error.message : String(error),
        success: false
      };
      
      this.notifyStepUpdate(step);
      this.emitEvent({
        type: 'step-failed',
        workflowId: workflow.id,
        stepId: step.id,
        timestamp: Date.now(),
        data: { error: error instanceof Error ? error.message : String(error) }
      });
      
      throw error;
    }
  }

  private updateDependentSteps(workflow: Workflow, completedStep: WorkflowStep): void {
    workflow.steps
      .filter(step => 
        step.status === 'pending' && 
        step.dependencies.includes(completedStep.id)
      )
      .forEach(step => {
        // Check if all dependencies are now completed
        const allDependenciesMet = step.dependencies.every(depId => {
          const depStep = workflow.steps.find(s => s.id === depId);
          return depStep && depStep.status === 'completed';
        });
        
        if (allDependenciesMet) {
          step.status = 'waiting';
          this.notifyStepUpdate(step);
        }
      });
  }

  private notifyStepUpdate(step: WorkflowStep): void {
    this.options.onStepUpdate(JSON.parse(JSON.stringify(step)));
  }

  private notifyWorkflowUpdate(workflow: Workflow): void {
    this.options.onWorkflowUpdate(JSON.parse(JSON.stringify(workflow)));
  }

  private emitEvent(event: WorkflowEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => listener(event));
  }

  private saveHistory(): void {
    // Limit history size
    if (this.history.length > MAX_HISTORY_ITEMS) {
      this.history = this.history.slice(-MAX_HISTORY_ITEMS);
    }
    saveToStorage(WORKFLOW_HISTORY_KEY, this.history);
  }

  private saveTemplates(): void {
    saveToStorage(WORKFLOW_TEMPLATES_KEY, Array.from(this.templates.entries()));
  }

  private generateWorkflowSummary(workflow: Workflow): string {
    const totalSteps = workflow.steps.length;
    const completedSteps = workflow.steps.filter(s => s.status === 'completed').length;
    const failedSteps = workflow.steps.filter(s => s.status === 'failed').length;
    
    const timeTaken = workflow.elapsedTime 
      ? `${(workflow.elapsedTime / 1000).toFixed(2)} seconds` 
      : 'unknown time';
      
    return `Completed ${completedSteps}/${totalSteps} steps (${failedSteps} failed) in ${timeTaken}`;
  }
}

// Create singleton instance
export const workflowEngine = new WorkflowEngine();
export default workflowEngine;
