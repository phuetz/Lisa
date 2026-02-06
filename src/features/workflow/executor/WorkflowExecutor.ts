/**
 * WorkflowExecutor.ts
 * Moteur d'exécution du workflow qui exécute les nœuds de manière séquentielle
 * ou en parallèle selon la configuration.
 * Prêt à être déplacé dans un Worker pour l'exécution asynchrone
 *
 * Features:
 * - Parallel execution with concurrency control
 * - Node priority support
 * - Retry logic with exponential backoff
 * - Execution timeout per node
 * - Progress callbacks
 * - SECURE: Uses SafeEvaluator instead of eval/new Function
 */

import { safeEvaluate, safeEvaluateCondition, SafeEvaluationError } from './SafeEvaluator';

// Re-export SafeEvaluationError for consumers
export { SafeEvaluationError };

type ExecutionData = Record<string, unknown>;

export interface ExecutionNode {
  id: string;
  type: string;
  inputs?: ExecutionData;
  outputs?: ExecutionData;
  config?: ExecutionData;
  dependencies?: string[];
  priority?: number; // Higher = executed first when multiple nodes are eligible
  retryCount?: number; // Override default retry count
  timeoutMs?: number; // Override default timeout
}

export type NodeExecutionCallback = (
  nodeId: string,
  status: 'started' | 'completed' | 'failed' | 'retrying',
  data?: ExecutionData | Error
) => void;

export interface WorkflowExecutionOptions {
  nodes: ExecutionNode[];
  edges: Array<{ source: string; target: string; sourceHandle?: string; targetHandle?: string }>;
  initialData?: ExecutionData;
  stepByStep?: boolean;
  maxExecutionTime?: number;
  maxRetries?: number;
  environment?: string;
  debugMode?: boolean;
  // New parallel execution options
  maxConcurrency?: number; // Max nodes executing in parallel (default: 5)
  defaultNodeTimeout?: number; // Default timeout per node in ms (default: 30000)
  onNodeExecution?: NodeExecutionCallback; // Progress callback
}

export interface WorkflowExecutionResult {
  success: boolean;
  data: Record<string, ExecutionData>;
  errors: Record<string, string>;
  executionPath: string[];
  executionTime: number;
  nodeResults: Record<string, ExecutionData>;
}

type NodeHandler = (node: ExecutionNode, inputs: ExecutionData) => Promise<ExecutionData>;

// Handlers pour chaque type de nœud
const nodeHandlers: Record<string, NodeHandler> = {
  // Opérations HTTP
  'http-request': async (node) => {
    const config = (node.config ?? Object.create(null)) as {
      url?: string;
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
    };
    const { url, method = 'GET', headers = {}, body } = config;
    if (!url) {
      throw new Error('URL manquante pour la requête HTTP');
    }
    try {
      // Dans une vraie implémentation, on utiliserait fetch
      void method; // Used in real implementation
      const responseHeaders = Object.assign(Object.create(null), {
        'content-type': 'application/json',
        ...headers
      }) as Record<string, string>;
      return { 
        status: 200, 
        body: { success: true, data: 'Response data', requestBody: body },
        headers: responseHeaders
      };
    } catch (error) {
      throw new Error(`Erreur dans la requête HTTP: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  // Manipulation de données
  'data-transform': async (node, inputs) => {
    try {
      const { transformType } = (node.config ?? Object.create(null)) as { transformType?: string };
      const rawInput = inputs.data;
      const inputData: ExecutionData =
        typeof rawInput === 'object' && rawInput !== null
          ? (rawInput as ExecutionData)
          : Object.create(null) as ExecutionData;
      
      switch (transformType) {
        case 'map':
          return { data: Object.keys(inputData).map(key => inputData[key]) };
        case 'filter':
          // Implémentation du filtre
          return { data: inputData };
        case 'reduce':
          // Implémentation de reduce
          return { data: inputData };
        default:
          return { data: inputData };
      }
    } catch (error) {
      throw new Error(`Erreur dans la transformation de données: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  // Flux de contrôle - Uses SafeEvaluator for secure condition evaluation
  'condition': async (node, inputs) => {
    const { condition } = (node.config ?? Object.create(null)) as { condition?: string };
    if (typeof condition !== 'string') {
      throw new Error('Condition invalide pour le nœud condition');
    }
    try {
      // SECURE: Using SafeEvaluator instead of eval()
      // Context includes inputs and any config variables
      const context: Record<string, unknown> = {
        ...inputs,
        ...(node.config ?? {}),
      };
      const result = safeEvaluateCondition(condition, context);
      return { result };
    } catch (error) {
      if (error instanceof SafeEvaluationError) {
        throw new Error(`Erreur de sécurité dans la condition: ${error.message}`);
      }
      throw new Error(`Erreur dans l'évaluation de condition: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  // Code personnalisé - Uses SafeEvaluator for secure expression evaluation
  // NOTE: Full code execution requires CodeInterpreterAgent for complex scripts
  'code': async (node, inputs) => {
    const { code, language = 'javascript' } = (node.config ?? Object.create(null)) as {
      code?: string;
      language?: string;
    };
    if (typeof code !== 'string') {
      throw new Error('Code invalide pour le nœud code');
    }

    try {
      if (language === 'javascript') {
        // SECURE: Using SafeEvaluator for expression evaluation
        // For full code execution, use CodeInterpreterAgent via the agent registry
        // SafeEvaluator supports: comparisons, arithmetic, property access, safe functions
        const context: Record<string, unknown> = {
          inputs,
          data: inputs.data,
          ...(node.config ?? {}),
        };

        // If code looks like a simple expression, evaluate it directly
        // Otherwise, return an error suggesting to use CodeInterpreterAgent
        const isSimpleExpression = !code.includes(';') &&
                                    !code.includes('function') &&
                                    !code.includes('=>') &&
                                    !code.includes('for') &&
                                    !code.includes('while') &&
                                    !code.includes('if');

        if (isSimpleExpression) {
          const result = safeEvaluate(code, context);
          return { result };
        } else {
          // For complex code, return a warning - full execution requires CodeInterpreterAgent
          throw new SafeEvaluationError(
            'Complex code execution is not allowed in workflow nodes for security reasons. ' +
            'Use a simple expression or delegate to CodeInterpreterAgent for full code execution.'
          );
        }
      } else if (language === 'python') {
        // Python execution requires Pyodide or external service
        // Return error suggesting to use CodeInterpreterAgent
        throw new Error(
          'Python execution requires CodeInterpreterAgent. ' +
          'Use an agent node with CodeInterpreterAgent for Python code.'
        );
      } else {
        throw new Error(`Language ${language} non supporté`);
      }
    } catch (error) {
      if (error instanceof SafeEvaluationError) {
        throw new Error(`Erreur de sécurité dans le code: ${error.message}`);
      }
      throw new Error(`Erreur dans l'exécution du code: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  
  // Services externes
  'openai': async (node) => {
    const { prompt, model = 'gpt-3.5-turbo', temperature = 0.7 } = (node.config ?? Object.create(null)) as {
      prompt?: string;
      model?: string;
      temperature?: number;
    };
    if (!prompt) {
      throw new Error('Prompt manquant pour le nœud OpenAI');
    }
    try {
      // Simuler un appel à OpenAI
      void model; void temperature; // Used in real implementation
      return { 
        response: "Réponse simulée d'OpenAI...",
        usage: { total_tokens: 150 }
      };
    } catch (error) {
      throw new Error(`Erreur OpenAI: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  
  // Entrée/sortie
  'input': async (node) => {
    const { defaultValue = null } = (node.config ?? Object.create(null)) as { defaultValue?: unknown };
    return { data: defaultValue };
  },
  
  'output': async (_node, inputs) => {
    return inputs;
  }
};

/**
 * Semaphore for controlling concurrent execution
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    const next = this.waiting.shift();
    if (next) {
      this.permits--;
      next();
    }
  }

  get available(): number {
    return this.permits;
  }
}

/**
 * Classe principale d'exécution du workflow
 */
export class WorkflowExecutor {
  private nodeResults: Record<string, ExecutionData> = {};
  private nodeErrors: Record<string, string> = {};
  private executionPath: string[] = [];
  private executionStartTime: number;
  private options: WorkflowExecutionOptions;
  private nodeMap: Map<string, ExecutionNode> = new Map();
  private edgeMap: Map<string, string[]> = new Map();
  private reverseEdgeMap: Map<string, string[]> = new Map(); // target -> sources
  private stepResolver: (() => void) | null = null;
  private stepByStepMode: boolean;
  private semaphore: Semaphore;
  private abortController: AbortController | null = null;
  private runningNodes: Set<string> = new Set();

  constructor(options: WorkflowExecutionOptions) {
    this.options = options;
    this.stepByStepMode = !!options.stepByStep;
    this.executionStartTime = 0;
    this.semaphore = new Semaphore(options.maxConcurrency ?? 5);
    this.buildNodeAndEdgeMaps();
  }
  
  /**
   * Construit les maps pour faciliter l'accès aux nœuds et aux arêtes
   */
  private buildNodeAndEdgeMaps(): void {
    // Construire le map des nœuds
    this.options.nodes.forEach(node => {
      this.nodeMap.set(node.id, node);
    });

    // Construire le map des arêtes (source -> targets)
    this.options.edges.forEach(edge => {
      if (!this.edgeMap.has(edge.source)) {
        this.edgeMap.set(edge.source, []);
      }
      this.edgeMap.get(edge.source)?.push(edge.target);

      // Build reverse map (target -> sources) for dependency checking
      if (!this.reverseEdgeMap.has(edge.target)) {
        this.reverseEdgeMap.set(edge.target, []);
      }
      this.reverseEdgeMap.get(edge.target)?.push(edge.source);
    });
  }

  /**
   * Abort the current execution
   */
  public abort(): void {
    this.abortController?.abort();
  }

  /**
   * Check if execution was aborted
   */
  private checkAborted(): void {
    if (this.abortController?.signal.aborted) {
      throw new Error('Workflow execution aborted');
    }
  }

  /**
   * Notify callback about node execution status
   */
  private notifyCallback(
    nodeId: string,
    status: 'started' | 'completed' | 'failed' | 'retrying',
    data?: ExecutionData | Error
  ): void {
    this.options.onNodeExecution?.(nodeId, status, data);
  }

  /**
   * Execute with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    nodeId: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Node ${nodeId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Execute with retry logic
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    nodeId: string,
    maxRetries: number
  ): Promise<T> {
    let lastError: Error | null = null;
    const baseDelay = 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.checkAborted();
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          this.notifyCallback(nodeId, 'retrying', lastError);
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
  
  /**
   * Retourne les nœuds racines (sans dépendances)
   */
  private getRootNodes(): ExecutionNode[] {
    const targetNodes = new Set<string>();
    this.options.edges.forEach(edge => {
      targetNodes.add(edge.target);
    });
    
    return this.options.nodes.filter(node => !targetNodes.has(node.id));
  }
  
  /**
   * Attendre la confirmation pour passer à l'étape suivante en mode pas à pas
   */
  private async waitForStepConfirmation(): Promise<void> {
    if (!this.stepByStepMode) return Promise.resolve();
    
    return new Promise<void>(resolve => {
      this.stepResolver = resolve;
    });
  }
  
  /**
   * Confirme l'étape suivante en mode pas à pas
   */
  public confirmNextStep(): void {
    if (this.stepResolver) {
      this.stepResolver();
      this.stepResolver = null;
    }
  }
  
  /**
   * Exécute un nœud individuel avec concurrency control
   */
  private async executeNode(nodeId: string): Promise<ExecutionData> {
    const node = this.nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Nœud ${nodeId} non trouvé`);
    }

    // Acquire semaphore permit
    await this.semaphore.acquire();
    this.runningNodes.add(nodeId);
    this.notifyCallback(nodeId, 'started');
    this.executionPath.push(nodeId);

    try {
      this.checkAborted();

      // Collecter les entrées des nœuds parents
      const inputs: ExecutionData = { ...(this.options.initialData ?? {}) };

      // Trouver tous les nœuds qui ont des arêtes pointant vers ce nœud
      this.options.edges.forEach(edge => {
        if (edge.target === nodeId && this.nodeResults[edge.source]) {
          if (edge.sourceHandle && edge.targetHandle) {
            // Si handles spécifiés, utilisez-les pour mapper les entrées
            const sourceResult = this.nodeResults[edge.source];
            if (sourceResult) {
              inputs[edge.targetHandle] = sourceResult[edge.sourceHandle];
            }
          } else {
            // Sinon, fusionner tous les résultats
            Object.entries(this.nodeResults[edge.source] ?? {}).forEach(([key, value]) => {
              inputs[key] = value;
            });
          }
        }
      });

      // Exécuter le gestionnaire pour ce type de nœud
      const handler = nodeHandlers[node.type];
      if (!handler) {
        throw new Error(`Type de nœud non supporté: ${node.type}`);
      }

      // En mode pas à pas, attendre la confirmation
      if (this.stepByStepMode) {
        await this.waitForStepConfirmation();
      }

      // Execute with timeout and retry
      const timeout = node.timeoutMs ?? this.options.defaultNodeTimeout ?? 30000;
      const maxRetries = node.retryCount ?? this.options.maxRetries ?? 0;

      const result = await this.withRetry(
        () => this.withTimeout(handler(node, inputs), timeout, nodeId),
        nodeId,
        maxRetries
      );

      this.nodeResults[nodeId] = result;
      this.notifyCallback(nodeId, 'completed', result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.nodeErrors[nodeId] = errorMessage;
      this.notifyCallback(nodeId, 'failed', error instanceof Error ? error : new Error(errorMessage));
      throw error;
    } finally {
      this.runningNodes.delete(nodeId);
      this.semaphore.release();
    }
  }
  
  /**
   * Get eligible nodes sorted by priority (higher priority first)
   */
  private getEligibleNodes(executedNodes: Set<string>): ExecutionNode[] {
    const eligibleNodes: ExecutionNode[] = [];

    this.nodeMap.forEach((node, nodeId) => {
      // Skip already executed or currently running nodes
      if (executedNodes.has(nodeId) || this.runningNodes.has(nodeId)) return;

      // Check if all dependencies are satisfied
      const dependencies = this.reverseEdgeMap.get(nodeId) ?? [];
      const allDependenciesMet = dependencies.every(dep => executedNodes.has(dep));

      if (allDependenciesMet) {
        eligibleNodes.push(node);
      }
    });

    // Sort by priority (higher first)
    return eligibleNodes.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Obtient et exécute les prochains nœuds éligibles en fonction des résultats actuels
   * Uses semaphore for concurrency control
   */
  private async executeNextNodes(executedNodes: Set<string>): Promise<void> {
    this.checkAborted();

    // Get eligible nodes sorted by priority
    const eligibleNodes = this.getEligibleNodes(executedNodes);

    if (eligibleNodes.length === 0) return;

    // Execute all eligible nodes in parallel (semaphore controls concurrency)
    const executions = eligibleNodes.map(async (node) => {
      try {
        await this.executeNode(node.id);
        executedNodes.add(node.id);
        // After a node completes, check for newly eligible nodes
        await this.executeNextNodes(executedNodes);
      } catch {
        // Node failed, but we continue with other nodes
        // The error is already recorded in nodeErrors
        executedNodes.add(node.id); // Mark as "processed" to avoid retrying
      }
    });

    await Promise.all(executions);
  }
  
  /**
   * Exécute le workflow complet
   */
  public async execute(): Promise<WorkflowExecutionResult> {
    this.executionStartTime = Date.now();
    this.nodeResults = {};
    this.nodeErrors = {};
    this.executionPath = [];
    this.runningNodes.clear();
    this.abortController = new AbortController();

    const executedNodes = new Set<string>();

    // Apply global execution timeout if specified
    const timeoutPromise = this.options.maxExecutionTime
      ? new Promise<never>((_, reject) => {
          setTimeout(() => {
            this.abort();
            reject(new Error(`Workflow timed out after ${this.options.maxExecutionTime}ms`));
          }, this.options.maxExecutionTime);
        })
      : null;

    try {
      // Commencer par les nœuds racines
      const rootNodes = this.getRootNodes();

      // Sort root nodes by priority
      const sortedRootNodes = [...rootNodes].sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
      );

      // Execute root nodes in parallel (semaphore handles concurrency)
      const executionPromise = Promise.all(
        sortedRootNodes.map(async (rootNode) => {
          try {
            await this.executeNode(rootNode.id);
            executedNodes.add(rootNode.id);
            await this.executeNextNodes(executedNodes);
          } catch {
            // Root node failed, but continue with other roots
            executedNodes.add(rootNode.id);
          }
        })
      );

      // Race against timeout if specified
      if (timeoutPromise) {
        await Promise.race([executionPromise, timeoutPromise]);
      } else {
        await executionPromise;
      }

      // Collecter tous les résultats des nœuds de sortie
      const outputResults: Record<string, ExecutionData> = {};
      this.options.nodes
        .filter(node => node.type === 'output')
        .forEach(node => {
          if (this.nodeResults[node.id]) {
            outputResults[node.id] = this.nodeResults[node.id];
          }
        });

      return {
        success: Object.keys(this.nodeErrors).length === 0,
        data: outputResults,
        errors: this.nodeErrors,
        executionPath: this.executionPath,
        executionTime: Date.now() - this.executionStartTime,
        nodeResults: this.nodeResults
      };
    } catch (error) {
      return {
        success: false,
        data: {},
        errors: {
          global: error instanceof Error ? error.message : String(error),
          ...this.nodeErrors
        },
        executionPath: this.executionPath,
        executionTime: Date.now() - this.executionStartTime,
        nodeResults: this.nodeResults
      };
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Get current execution statistics
   */
  public getStats(): {
    runningNodes: string[];
    completedNodes: number;
    failedNodes: number;
    elapsedTime: number;
    availableConcurrency: number;
  } {
    return {
      runningNodes: Array.from(this.runningNodes),
      completedNodes: Object.keys(this.nodeResults).length,
      failedNodes: Object.keys(this.nodeErrors).length,
      elapsedTime: this.executionStartTime ? Date.now() - this.executionStartTime : 0,
      availableConcurrency: this.semaphore.available,
    };
  }
}

/**
 * Fonction utilitaire pour tester un workflow
 */
export interface WorkflowTestOptions {
  nodes: string[];
  data?: ExecutionData;
}

export interface WorkflowTestResult {
  success: boolean;
  duration: number;
  results: ExecutionData;
}

export async function testWorkflow(options: WorkflowTestOptions): Promise<WorkflowTestResult> {
  // Simuler un test de workflow
  void options.nodes; // Used in real implementation
  return {
    success: true,
    duration: 123,
    results: { output: "Test result data" }
  };
}

export default WorkflowExecutor;
