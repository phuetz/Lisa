/**
 * PlannerAgent.ts
 *
 * A lightweight, modular orchestrator that coordinates complex workflows using
 * separate utilities for planning, execution, error handling and logging.
 */
import { agentRegistry } from './registry';
import { v4 as uuidv4 } from 'uuid';
import { saveToStorage, loadFromStorage } from '../utils/storage';

// Import refactored utilities
import { buildPlannerPrompt, buildPlanExplanationPrompt, PromptOptions } from '../utils/buildPlannerPrompt';
import { runWorkflowPlan } from '../utils/runWorkflowPlan';
import { logEvent } from '../utils/logger';
import { revisePlan } from '../utils/revisePlan';
import { planTracer } from '../utils/planTracer';
// Import types
import type { BaseAgent, AgentExecuteResult } from './types';
import type { WorkflowStep, PlannerAgentExecuteProps, PlannerResult } from '../types/Planner';

// Constants
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const MAX_REVISIONS = 3;
const PLANNER_TEMPLATES_KEY = 'planner_templates';
const PLANNER_CHECKPOINTS_KEY = 'planner_checkpoints';

/**
 * PlannerAgent: Orchestrates multi-step workflows using a modular architecture
 */
export class PlannerAgent implements BaseAgent {
  name = 'PlannerAgent';
  description = 'Generates and executes complex, resilient, and efficient multi-step workflows.';
  capabilities = ['planning', 'orchestration', 'workflow'];
  version = '2.0.0';
  domain = 'workflow';

  private workflowTemplates: Map<string, WorkflowStep[]>;
  private workflowCheckpoints: Map<string, WorkflowStep[]>;

  constructor() {
    // Load saved templates and checkpoints from storage
    const savedTemplates = loadFromStorage<[string, WorkflowStep[]][]>(PLANNER_TEMPLATES_KEY);
    this.workflowTemplates = savedTemplates ? new Map(savedTemplates) : new Map();

    const savedCheckpoints = loadFromStorage<[string, WorkflowStep[]][]>(PLANNER_CHECKPOINTS_KEY);
    this.workflowCheckpoints = savedCheckpoints ? new Map(savedCheckpoints) : new Map();
  }

  /**
   * Main execution method - generates and runs a plan to fulfill a request
   */
  async execute(props: PlannerAgentExecuteProps): Promise<AgentExecuteResult> {
    if (!OPENAI_API_KEY) {
      return { success: false, error: 'OpenAI API key is not configured.', output: null };
    }

    // Initialiser le traçage pour cette exécution
    const traceId = planTracer.startTrace(props.request);
    logEvent('plan_execution_started', { requestId: props.request.substring(0, 50) }, 'PlannerAgent execution started');
    
    let plan: WorkflowStep[] = [];
    let revisionCount = 0;
    let checkpointId: string | null = null;
    let explanation: string | null = null;

    try {
      // Phase 1: Get the plan (from template, checkpoint, or generate new)
      planTracer.addStep(traceId, 'plan_generation', {
        metadata: { 
          fromTemplate: Boolean(props.loadFromTemplate),
          fromCheckpoint: Boolean(props.resumeFromCheckpointId)
        }
      });
      
      plan = await this.getPlan(props);
      
      // Générer une explication du plan pour l'utilisateur
      try {
        const explainPrompt = buildPlanExplanationPrompt(plan, props.request, {
          detailLevel: 'concise',
          language: 'fr'
        });
        const explainResponse = await this.callLLM(explainPrompt);
        explanation = explainResponse.trim();
        
        // Ajouter l'explication à la trace
        planTracer.addStep(traceId, 'plan_generation', {
          explanation,
          result: plan,
        });
      } catch (explainError) {
        // Si l'explication échoue, on continue sans
        logEvent('plan_explanation_failed', 
          { error: String(explainError) },
          'Failed to generate plan explanation');
      }
      
      // Phase 2: Execute the plan
      planTracer.addStep(traceId, 'plan_execution', {
        metadata: { planSize: plan.length }
      });
      
      let result = await this.executePlan(plan, props);
      
      // Phase 3: Handle revisions if needed
      while (!result.success && revisionCount < MAX_REVISIONS) {
        revisionCount++;
        
        planTracer.addStep(traceId, 'plan_revision', {
          metadata: { 
            attempt: revisionCount,
            error: result.error?.message 
          }
        });
        
        plan = await this.revisePlan(
          props.request, 
          plan, 
          result.error?.message, 
          revisionCount,
          traceId
        );
        
        result = await this.executePlan(plan, props);
        
        if (result.success) {
          planTracer.addStep(traceId, 'plan_execution', {
            metadata: { success: true, revisionCount },
            result: result.summary
          });
          break;
        }
      }
      
      // Phase 4: Finalize (save template, cleanup)
      const finalResult = this.finalizePlan(result, plan, props, checkpointId);
      
      // Terminer la trace avec le résultat final
      planTracer.endTrace(traceId, finalResult.output as string || finalResult.error);
      
      // Ajouter l'explication au résultat si disponible
      if (explanation && finalResult.success) {
        return {
          ...finalResult,
          explanation,
          traceId
        };
      }
      
      return {
        ...finalResult,
        traceId
      };
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      
      // Enregistrer l'erreur dans la trace
      planTracer.addStep(traceId, 'plan_execution', {
        error: message
      });
      planTracer.endTrace(traceId, `Execution failed: ${message}`);
      
      logEvent('plan_failed', { error: message }, `PlannerAgent execution failed: ${message}`);
      return { success: false, error: message, output: null, traceId };
    }
  }

  /**
   * Get initial plan from template, checkpoint or generate new one
   */
  private async getPlan(props: PlannerAgentExecuteProps): Promise<WorkflowStep[]> {
    let plan: WorkflowStep[];
    
    if (props.resumeFromCheckpointId) {
      plan = this.resumeFromCheckpoint(props.resumeFromCheckpointId);
      logEvent('checkpoint_resumed', { checkpointId: props.resumeFromCheckpointId }, 
              `Resumed from checkpoint ${props.resumeFromCheckpointId}`);
    } 
    else if (props.loadFromTemplate) {
      plan = this.loadTemplate(props.loadFromTemplate);
      logEvent('template_loaded', { templateName: props.loadFromTemplate }, 
              `Loaded template: ${props.loadFromTemplate}`);
    } 
    else {
      // Generate new plan
      const prompt = buildPlannerPrompt(props.request);
      const planJson = await this.callLLM(prompt);
      
      try {
        const parsedPlan = JSON.parse(planJson);
        if (!Array.isArray(parsedPlan)) {
          throw new Error('LLM response is not a valid plan array');
        }
        
        plan = parsedPlan.map(step => ({
          ...step,
          status: 'pending',
          dependencies: Array.isArray(step.dependencies) ? step.dependencies : [],
          args: step.args || {},
        }));
        
        logEvent('plan_generated', { plan }, `Generated new plan with ${plan.length} steps`);
      } catch (error) {
        console.error('Failed to parse LLM plan:', error);
        throw new Error(`Failed to generate workflow plan: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    if (props.onPlanUpdate) {
      props.onPlanUpdate([...plan]);
    }
    
    return plan;
  }

  /**
   * Execute a plan using the runWorkflowPlan utility
   */
  private async executePlan(
    plan: WorkflowStep[],
    props: PlannerAgentExecuteProps
  ): Promise<PlannerResult> {
    // Create checkpoint before execution
    const checkpointId = this.createCheckpoint(plan);
    logEvent('checkpoint_created', { checkpointId }, `Created execution checkpoint ${checkpointId}`);
    
    // Execute the plan
    return runWorkflowPlan(plan, props.onPlanUpdate);
  }

  /**
   * Revise a failed plan using the revisePlan utility
   */
  private async revisePlan(
    request: string, 
    failedPlan: WorkflowStep[],
    errorMessage?: string,
    attempt?: number,
    traceId?: string
  ): Promise<WorkflowStep[]> {
    try {
      const attemptNumber = attempt || 1;
      if (attemptNumber > MAX_REVISIONS) {
        throw new Error(`Maximum revision attempts (${MAX_REVISIONS}) exceeded`);
      }
      
      // Préparer les options pour la révision
      const revisionOptions: Parameters<typeof revisePlan>[4] = {
        apiKey: OPENAI_API_KEY,
        traceId,
        onExplanation: (explanation) => {
          // Journal pour l'explication (sera utilisé pour l'interface utilisateur)
          logEvent('plan_explanation', { attempt: attemptNumber }, explanation);
        }
      };
      
      // Utiliser l'utilitaire revisePlan
      const result = await revisePlan(
        request,
        failedPlan,
        errorMessage,
        attemptNumber,
        revisionOptions
      );
      
      return result.plan;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logEvent('plan_revision_failed', { error: message }, `Plan revision failed: ${message}`);
   */
  private finalizePlan(
    result: { success: boolean; error?: string; summary?: string },
    plan: WorkflowStep[],
    props: PlannerAgentExecuteProps,
    checkpointId?: string | null,
    explanation?: string | null,
    traceId?: string
  ): PlannerResult {
    // Mettre à jour le store avec l'explication du plan et l'ID de trace
    const store = agentRegistry.getStore();
    if (store && explanation) {
      store.setLastPlanExplanation(explanation, traceId);
    }
    
    // Get API request ID if one was used
    if (result.success) {
      // Save as template if specified
      if (props.saveAsTemplate && typeof props.saveAsTemplate === 'string') {
        this.saveAsTemplate(props.saveAsTemplate, plan);
        logEvent('plan_template_saved', { name: props.saveAsTemplate }, `Saved plan as template: ${props.saveAsTemplate}`);
      }
      
      // Clean up checkpoint if we succeeded
      if (checkpointId) {
        this.workflowCheckpoints.delete(checkpointId);
        saveToStorage(PLANNER_CHECKPOINTS_KEY, Array.from(this.workflowCheckpoints.entries()));
        logEvent('checkpoint_deleted', { id: checkpointId }, `Deleted checkpoint ${checkpointId} after successful execution`);
      }
      
      logEvent('plan_succeeded', { request: props.request }, `Plan executed successfully`);
      return { 
        success: true, 
        output: result.summary || 'Plan executed successfully', 
        plan,
        explanation,
        traceId
      };
    } else {
      // Add checkpoint for failed plan
      const errorMessage = result.error || 'Unknown error';
      
      if (!props.preventCheckpoint) {
        const id = checkpointId || uuidv4();
        this.workflowCheckpoints.set(id, plan);
        saveToStorage(PLANNER_CHECKPOINTS_KEY, Array.from(this.workflowCheckpoints.entries()));
        logEvent('checkpoint_saved', { id }, `Saved checkpoint for failed plan: ${id}`);
      }
      
      logEvent('plan_failed', { error: errorMessage }, `Plan failed: ${errorMessage}`);
      return { 
        success: false, 
        error: errorMessage, 
        plan,
        explanation,
        traceId
      };
    }
  }

// ... (rest of the code remains the same)
      }),
    });
    
    if (!response.ok) {
      throw new Error(`LLM API request failed: ${response.status} ${await response.text()}`);
    }
    
    const result = await response.json();
    return result.choices[0].message.content;
  }

  // --- Template & Checkpoint Methods ---
  
  public saveAsTemplate(name: string, plan: WorkflowStep[]): void {
    // Create a clean copy without execution details
    const templatePlan = plan.map(step => ({
      ...step,
      status: 'pending' as const,
      result: undefined,
      startTime: undefined,
      endTime: undefined,
      duration: undefined
    }));
    
    this.workflowTemplates.set(name, templatePlan);
    saveToStorage(PLANNER_TEMPLATES_KEY, Array.from(this.workflowTemplates.entries()));
  }

  public loadTemplate(name: string): WorkflowStep[] {
    const template = this.workflowTemplates.get(name);
    if (!template) {
      throw new Error(`Template '${name}' not found`);
    }
    return JSON.parse(JSON.stringify(template)); // Deep copy to prevent mutation
  }

  public createCheckpoint(plan: WorkflowStep[]): string {
    const checkpointId = uuidv4();
    this.workflowCheckpoints.set(checkpointId, JSON.parse(JSON.stringify(plan)));
    saveToStorage(PLANNER_CHECKPOINTS_KEY, Array.from(this.workflowCheckpoints.entries()));
    return checkpointId;
  }

  public resumeFromCheckpoint(checkpointId: string): WorkflowStep[] {
    const plan = this.workflowCheckpoints.get(checkpointId);
    if (!plan) {
      throw new Error(`Checkpoint '${checkpointId}' not found`);
    }
    return JSON.parse(JSON.stringify(plan)); // Deep copy to prevent mutation
  }

  public getTemplates(): string[] {
    return Array.from(this.workflowTemplates.keys());
  }

  public getCheckpoints(): string[] {
    return Array.from(this.workflowCheckpoints.keys());
  }
}

// Register the agent
agentRegistry.register(new PlannerAgent());
