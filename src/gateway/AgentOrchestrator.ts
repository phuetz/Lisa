/**
 * Lisa Agent Orchestrator
 * Multi-agent coordination and workflow execution
 * Inspired by OpenClaw's agent orchestration system
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';
import { getGateway } from './GatewayServer';
import { safeEvaluateCondition } from '../features/workflow/executor/SafeEvaluator';

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model?: string;
  tools?: string[];
  temperature?: number;
  maxTokens?: number;
}

export interface AgentTask {
  id: string;
  agentId: string;
  input: string;
  context?: Record<string, unknown>;
  dependencies?: string[]; // Task IDs that must complete first
  status: TaskStatus;
  result?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  variables: Record<string, unknown>;
  status: WorkflowStatus;
  currentStep: number;
  results: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
}

export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  config: StepConfig;
  condition?: string; // JS expression to evaluate
  onSuccess?: string; // Next step ID
  onFailure?: string; // Step ID on failure
}

export type StepType = 'agent' | 'parallel' | 'conditional' | 'loop' | 'delay' | 'human_input' | 'tool';

export type StepConfig = 
  | AgentStepConfig
  | ParallelStepConfig
  | ConditionalStepConfig
  | LoopStepConfig
  | DelayStepConfig
  | HumanInputStepConfig
  | ToolStepConfig;

export interface AgentStepConfig {
  agentId: string;
  prompt: string;
  inputMapping?: Record<string, string>; // Map workflow variables to agent input
  outputVariable?: string; // Store result in this variable
}

export interface ParallelStepConfig {
  steps: string[]; // Step IDs to run in parallel
  waitForAll: boolean;
}

export interface ConditionalStepConfig {
  condition: string; // JS expression
  trueStep: string;
  falseStep: string;
}

export interface LoopStepConfig {
  items: string; // Variable name containing items
  itemVariable: string; // Variable name for current item
  bodyStep: string; // Step to execute for each item
  maxIterations?: number;
}

export interface DelayStepConfig {
  durationMs: number;
}

export interface HumanInputStepConfig {
  prompt: string;
  inputVariable: string;
  timeout?: number;
}

export interface ToolStepConfig {
  toolId: string;
  parameters: Record<string, string>; // Can reference variables with {{var}}
  outputVariable?: string;
}

// Pre-defined agent templates
const AGENT_TEMPLATES: AgentDefinition[] = [
  {
    id: 'planner',
    name: 'Planner Agent',
    description: 'Crée des plans détaillés pour accomplir des tâches complexes',
    systemPrompt: `Tu es un agent de planification expert. Ton rôle est de:
1. Analyser les tâches complexes
2. Les décomposer en étapes simples et actionnables
3. Identifier les dépendances entre les étapes
4. Proposer un plan structuré et réaliste

Format tes plans avec des étapes numérotées et des sous-tâches si nécessaire.`,
    temperature: 0.3
  },
  {
    id: 'researcher',
    name: 'Research Agent',
    description: 'Recherche et synthétise des informations',
    systemPrompt: `Tu es un agent de recherche. Ton rôle est de:
1. Rechercher des informations pertinentes
2. Vérifier les sources et la fiabilité
3. Synthétiser les informations de manière claire
4. Citer tes sources

Sois objectif et factuel dans tes recherches.`,
    tools: ['web-search'],
    temperature: 0.2
  },
  {
    id: 'coder',
    name: 'Coder Agent',
    description: 'Écrit et améliore du code',
    systemPrompt: `Tu es un agent de développement expert. Ton rôle est de:
1. Écrire du code propre et bien documenté
2. Suivre les bonnes pratiques du langage utilisé
3. Gérer les erreurs correctement
4. Optimiser les performances quand nécessaire

Fournis toujours du code fonctionnel et testé.`,
    tools: ['code-interpreter'],
    temperature: 0.1
  },
  {
    id: 'reviewer',
    name: 'Review Agent',
    description: 'Revoit et améliore le travail des autres agents',
    systemPrompt: `Tu es un agent de revue critique. Ton rôle est de:
1. Analyser le travail fourni
2. Identifier les erreurs et les points à améliorer
3. Suggérer des améliorations concrètes
4. Valider quand le travail est satisfaisant

Sois constructif et précis dans tes retours.`,
    temperature: 0.3
  },
  {
    id: 'writer',
    name: 'Writer Agent',
    description: 'Rédige et améliore du contenu textuel',
    systemPrompt: `Tu es un agent rédacteur expert. Ton rôle est de:
1. Rédiger du contenu clair et engageant
2. Adapter le ton au contexte
3. Structurer l'information de manière logique
4. Corriger et améliorer les textes existants

Adapte ton style au public cible.`,
    temperature: 0.7
  },
  {
    id: 'analyst',
    name: 'Analyst Agent',
    description: 'Analyse des données et fournit des insights',
    systemPrompt: `Tu es un agent analyste. Ton rôle est de:
1. Analyser les données fournies
2. Identifier les tendances et patterns
3. Fournir des insights actionnables
4. Présenter les résultats de manière claire

Base tes analyses sur les données, pas sur des suppositions.`,
    temperature: 0.2
  }
];

export class AgentOrchestrator extends BrowserEventEmitter {
  private agents: Map<string, AgentDefinition> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private workflows: Map<string, Workflow> = new Map();
  private runningWorkflows: Set<string> = new Set();

  constructor() {
    super();
    this.loadAgentTemplates();
  }

  private loadAgentTemplates(): void {
    for (const agent of AGENT_TEMPLATES) {
      this.agents.set(agent.id, agent);
    }
  }

  // Agent management
  registerAgent(agent: AgentDefinition): void {
    this.agents.set(agent.id, agent);
    this.emit('agent:registered', agent);
  }

  unregisterAgent(id: string): boolean {
    const deleted = this.agents.delete(id);
    if (deleted) {
      this.emit('agent:unregistered', { id });
    }
    return deleted;
  }

  getAgent(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  listAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  // Task execution
  async executeTask(agentId: string, input: string, context?: Record<string, unknown>): Promise<AgentTask> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    
    const task: AgentTask = {
      id: taskId,
      agentId,
      input,
      context,
      status: 'pending',
      startedAt: new Date()
    };

    this.tasks.set(taskId, task);
    this.emit('task:created', task);

    try {
      task.status = 'running';
      this.emit('task:started', task);

      // Execute via Gateway
      const gateway = getGateway();
      const session = await gateway.createSession('orchestrator', 'api', {
        model: agent.model,
        customPrompt: agent.systemPrompt,
        skills: agent.tools
      });

      // Build full prompt with context
      let fullPrompt = input;
      if (context) {
        fullPrompt = `Context:\n${JSON.stringify(context, null, 2)}\n\nTask:\n${input}`;
      }

      await gateway.sendMessage(session.id, {
        content: fullPrompt,
        role: 'user'
      });

      // Wait for response
      const result = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Task timeout'));
        }, 120000); // 2 minute timeout

        gateway.once('message:received', (msg: { sessionId: string; payload: { role: string; content: string } }) => {
          if (msg.sessionId === session.id && msg.payload.role === 'assistant') {
            clearTimeout(timeout);
            resolve(msg.payload.content);
          }
        });
      });

      task.result = result;
      task.status = 'completed';
      task.completedAt = new Date();
      
      await gateway.closeSession(session.id);
      
      this.emit('task:completed', task);
      
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.completedAt = new Date();
      this.emit('task:failed', task);
    }

    return task;
  }

  // Workflow management
  createWorkflow(name: string, description: string, steps: WorkflowStep[]): Workflow {
    const id = `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    
    const workflow: Workflow = {
      id,
      name,
      description,
      steps,
      variables: {},
      status: 'idle',
      currentStep: 0,
      results: {},
      createdAt: new Date()
    };

    this.workflows.set(id, workflow);
    this.emit('workflow:created', workflow);
    
    return workflow;
  }

  async runWorkflow(id: string, initialVariables: Record<string, unknown> = {}): Promise<Workflow> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    if (this.runningWorkflows.has(id)) {
      throw new Error('Workflow is already running');
    }

    workflow.variables = { ...initialVariables };
    workflow.status = 'running';
    workflow.currentStep = 0;
    workflow.results = {};
    this.runningWorkflows.add(id);

    this.emit('workflow:started', workflow);

    try {
      while (workflow.currentStep < workflow.steps.length && workflow.status === 'running') {
        const step = workflow.steps[workflow.currentStep];
        
        // Check condition
        if (step.condition) {
          const shouldRun = this.evaluateCondition(step.condition, workflow.variables);
          if (!shouldRun) {
            workflow.currentStep++;
            continue;
          }
        }

        this.emit('workflow:step:started', { workflowId: id, step });

        try {
          await this.executeStep(workflow, step);
          
          this.emit('workflow:step:completed', { workflowId: id, step });
          
          // Determine next step
          if (step.onSuccess) {
            const nextIndex = workflow.steps.findIndex(s => s.id === step.onSuccess);
            if (nextIndex !== -1) {
              workflow.currentStep = nextIndex;
            } else {
              workflow.currentStep++;
            }
          } else {
            workflow.currentStep++;
          }
          
        } catch (error) {
          this.emit('workflow:step:failed', { workflowId: id, step, error });
          
          if (step.onFailure) {
            const failIndex = workflow.steps.findIndex(s => s.id === step.onFailure);
            if (failIndex !== -1) {
              workflow.currentStep = failIndex;
              continue;
            }
          }
          
          throw error;
        }
      }

      workflow.status = 'completed';
      workflow.completedAt = new Date();
      this.emit('workflow:completed', workflow);
      
    } catch (error) {
      workflow.status = 'failed';
      workflow.completedAt = new Date();
      this.emit('workflow:failed', { workflow, error });
    } finally {
      this.runningWorkflows.delete(id);
    }

    return workflow;
  }

  private async executeStep(workflow: Workflow, step: WorkflowStep): Promise<void> {
    switch (step.type) {
      case 'agent': {
        const config = step.config as AgentStepConfig;
        const prompt = this.interpolate(config.prompt, workflow.variables);
        
        const task = await this.executeTask(config.agentId, prompt);
        
        if (task.status === 'failed') {
          throw new Error(task.error || 'Agent task failed');
        }
        
        if (config.outputVariable && task.result) {
          workflow.variables[config.outputVariable] = task.result;
          workflow.results[step.id] = task.result;
        }
        break;
      }

      case 'parallel': {
        const config = step.config as ParallelStepConfig;
        const parallelSteps = config.steps.map(stepId => 
          workflow.steps.find(s => s.id === stepId)
        ).filter(Boolean) as WorkflowStep[];

        const promises = parallelSteps.map(s => this.executeStep(workflow, s));
        
        if (config.waitForAll) {
          await Promise.all(promises);
        } else {
          await Promise.race(promises);
        }
        break;
      }

      case 'conditional': {
        const config = step.config as ConditionalStepConfig;
        const result = this.evaluateCondition(config.condition, workflow.variables);
        
        const nextStepId = result ? config.trueStep : config.falseStep;
        const nextStep = workflow.steps.find(s => s.id === nextStepId);
        
        if (nextStep) {
          await this.executeStep(workflow, nextStep);
        }
        break;
      }

      case 'loop': {
        const config = step.config as LoopStepConfig;
        const items = workflow.variables[config.items] as unknown[];
        const bodyStep = workflow.steps.find(s => s.id === config.bodyStep);
        
        if (!bodyStep || !Array.isArray(items)) break;

        const maxIterations = config.maxIterations || items.length;
        
        for (let i = 0; i < Math.min(items.length, maxIterations); i++) {
          workflow.variables[config.itemVariable] = items[i];
          workflow.variables['_index'] = i;
          await this.executeStep(workflow, bodyStep);
        }
        break;
      }

      case 'delay': {
        const config = step.config as DelayStepConfig;
        await new Promise(resolve => setTimeout(resolve, config.durationMs));
        break;
      }

      case 'human_input': {
        const config = step.config as HumanInputStepConfig;
        
        // Emit event and wait for human input
        this.emit('workflow:human_input_required', {
          workflowId: workflow.id,
          stepId: step.id,
          prompt: config.prompt
        });

        // In real implementation, this would wait for user input
        // For now, we'll set a placeholder
        workflow.variables[config.inputVariable] = '[Human input required]';
        break;
      }

      case 'tool': {
        const config = step.config as ToolStepConfig;
        const gateway = getGateway();
        
        const params: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(config.parameters)) {
          params[key] = this.interpolate(value, workflow.variables);
        }

        const result = await gateway.invokeTool({
          toolId: config.toolId,
          parameters: params,
          sessionId: 'orchestrator'
        });

        if (config.outputVariable) {
          workflow.variables[config.outputVariable] = result;
          workflow.results[step.id] = result;
        }
        break;
      }
    }
  }

  private evaluateCondition(condition: string, variables: Record<string, unknown>): boolean {
    try {
      return safeEvaluateCondition(condition, variables);
    } catch {
      return false;
    }
  }

  private interpolate(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : '';
    });
  }

  // Workflow control
  pauseWorkflow(id: string): boolean {
    const workflow = this.workflows.get(id);
    if (workflow && workflow.status === 'running') {
      workflow.status = 'paused';
      this.emit('workflow:paused', workflow);
      return true;
    }
    return false;
  }

  resumeWorkflow(id: string): boolean {
    const workflow = this.workflows.get(id);
    if (workflow && workflow.status === 'paused') {
      this.runWorkflow(id, workflow.variables);
      return true;
    }
    return false;
  }

  cancelWorkflow(id: string): boolean {
    const workflow = this.workflows.get(id);
    if (workflow && (workflow.status === 'running' || workflow.status === 'paused')) {
      workflow.status = 'failed';
      this.runningWorkflows.delete(id);
      this.emit('workflow:cancelled', workflow);
      return true;
    }
    return false;
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  // Pre-built workflow templates
  createResearchWorkflow(topic: string): Workflow {
    return this.createWorkflow(
      `Research: ${topic}`,
      `Recherche approfondie sur: ${topic}`,
      [
        {
          id: 'plan',
          name: 'Create Research Plan',
          type: 'agent',
          config: {
            agentId: 'planner',
            prompt: `Crée un plan de recherche pour: ${topic}`,
            outputVariable: 'research_plan'
          } as AgentStepConfig
        },
        {
          id: 'research',
          name: 'Conduct Research',
          type: 'agent',
          config: {
            agentId: 'researcher',
            prompt: `Recherche des informations sur: ${topic}\n\nPlan à suivre:\n{{research_plan}}`,
            outputVariable: 'research_results'
          } as AgentStepConfig
        },
        {
          id: 'analyze',
          name: 'Analyze Results',
          type: 'agent',
          config: {
            agentId: 'analyst',
            prompt: `Analyse les résultats de recherche suivants:\n{{research_results}}`,
            outputVariable: 'analysis'
          } as AgentStepConfig
        },
        {
          id: 'write',
          name: 'Write Report',
          type: 'agent',
          config: {
            agentId: 'writer',
            prompt: `Rédige un rapport de synthèse basé sur:\n\nRecherche:\n{{research_results}}\n\nAnalyse:\n{{analysis}}`,
            outputVariable: 'report'
          } as AgentStepConfig
        },
        {
          id: 'review',
          name: 'Review Report',
          type: 'agent',
          config: {
            agentId: 'reviewer',
            prompt: `Revois et améliore ce rapport:\n{{report}}`,
            outputVariable: 'final_report'
          } as AgentStepConfig
        }
      ]
    );
  }

  createCodeWorkflow(task: string): Workflow {
    return this.createWorkflow(
      `Code: ${task}`,
      `Développement: ${task}`,
      [
        {
          id: 'plan',
          name: 'Plan Implementation',
          type: 'agent',
          config: {
            agentId: 'planner',
            prompt: `Planifie l'implémentation de: ${task}`,
            outputVariable: 'implementation_plan'
          } as AgentStepConfig
        },
        {
          id: 'code',
          name: 'Write Code',
          type: 'agent',
          config: {
            agentId: 'coder',
            prompt: `Implémente le code suivant le plan:\n{{implementation_plan}}\n\nTâche: ${task}`,
            outputVariable: 'code'
          } as AgentStepConfig
        },
        {
          id: 'review',
          name: 'Code Review',
          type: 'agent',
          config: {
            agentId: 'reviewer',
            prompt: `Fais une revue de code:\n{{code}}`,
            outputVariable: 'review_feedback'
          } as AgentStepConfig
        },
        {
          id: 'improve',
          name: 'Apply Improvements',
          type: 'agent',
          config: {
            agentId: 'coder',
            prompt: `Applique les améliorations suggérées:\n\nCode original:\n{{code}}\n\nFeedback:\n{{review_feedback}}`,
            outputVariable: 'final_code'
          } as AgentStepConfig
        }
      ]
    );
  }

  // Stats
  getStats(): {
    agents: number;
    tasks: { total: number; completed: number; failed: number; running: number };
    workflows: { total: number; completed: number; running: number };
  } {
    const tasks = Array.from(this.tasks.values());
    const workflows = Array.from(this.workflows.values());

    return {
      agents: this.agents.size,
      tasks: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length,
        running: tasks.filter(t => t.status === 'running').length
      },
      workflows: {
        total: workflows.length,
        completed: workflows.filter(w => w.status === 'completed').length,
        running: this.runningWorkflows.size
      }
    };
  }
}

// Singleton
let agentOrchestratorInstance: AgentOrchestrator | null = null;

export function getAgentOrchestrator(): AgentOrchestrator {
  if (!agentOrchestratorInstance) {
    agentOrchestratorInstance = new AgentOrchestrator();
  }
  return agentOrchestratorInstance;
}

export function resetAgentOrchestrator(): void {
  if (agentOrchestratorInstance) {
    agentOrchestratorInstance.removeAllListeners();
    agentOrchestratorInstance = null;
  }
}

