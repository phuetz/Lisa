/**
 * 🎯 Coordinator Agent
 * Orchestre l'exécution de multiples agents en parallèle
 * Gère les dépendances et optimise les performances
 */

import { type BaseAgent, AgentDomains, type AgentExecuteProps, type AgentExecuteResult } from '../core/types';
import { agentRegistry } from '../core/registry';
import { resilientExecutor } from '../../../utils/resilience/ResilientExecutor';

interface Task {
  id: string;
  name: string;
  agent: string;
  input: Record<string, unknown>;
  dependencies: string[];
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

interface TaskResult {
  taskId: string;
  success: boolean;
  output: unknown;
  duration: number;
  error?: string;
}

interface CoordinatorResult {
  success: boolean;
  results: TaskResult[];
  totalDuration: number;
  parallelism: number;
  output: string;
}

interface Graph {
  nodes: string[];
  edges: Array<{ from: string; to: string }>;
}

export class CoordinatorAgent implements BaseAgent {
  name = 'CoordinatorAgent';
  description = 'Orchestre l\'exécution parallèle de multiples agents avec gestion des dépendances';
  version = '1.0.0';
  domain = AgentDomains.PLANNING;
  capabilities = ['parallel_execution', 'dependency_management', 'workflow_optimization'];
  
  private tasks: Map<string, Task> = new Map();
  
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    try {
      const { tasks } = props as { tasks: Task[] };
      
      if (!tasks || !Array.isArray(tasks)) {
        return {
          success: false,
          output: 'Invalid tasks format',
          error: 'Tasks must be an array'
        };
      }
      
      // Stocker les tâches
      tasks.forEach(task => this.tasks.set(task.id, task));
      
      // Exécuter avec gestion parallèle
      const result = await this.executeParallel(tasks);
      
      return {
        success: result.success,
        output: JSON.stringify(result, null, 2)
      };
    } catch (error) {
      return {
        success: false,
        output: 'Execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Exécute plusieurs tâches en parallèle avec optimisation
   */
  async executeParallel(tasks: Task[]): Promise<CoordinatorResult> {
    const startTime = Date.now();
    
    // 1. Construire le graphe de dépendances
    const graph = this.buildDependencyGraph(tasks);
    
    // 2. Détecter les cycles (deadlocks)
    if (this.hasCycle(graph)) {
      throw new Error('Circular dependency detected in workflow');
    }
    
    // 3. Tri topologique
    const sorted = this.topologicalSort(graph);
    
    // 4. Regrouper par niveaux parallélisables
    const levels = this.groupByLevel(sorted, tasks);
    
    // 5. Exécuter niveau par niveau
    const results: TaskResult[] = [];
    
    for (const level of levels) {
      console.log(`[CoordinatorAgent] Executing level with ${level.length} tasks`);
      
      // Exécution parallèle du niveau
      const levelResults = await Promise.all(
        level.map(taskId => this.executeTask(taskId))
      );
      
      results.push(...levelResults);
      
      // Vérifier si tous ont réussi
      const allSuccess = levelResults.every(r => r.success);
      if (!allSuccess) {
        console.warn('[CoordinatorAgent] Level execution failed, stopping workflow');
        break;
      }
    }
    
    const totalDuration = Date.now() - startTime;
    const parallelism = this.calculateParallelism(levels);
    
    return {
      success: results.every(r => r.success),
      results,
      totalDuration,
      parallelism,
      output: `Executed ${results.length} tasks in ${totalDuration}ms (parallelism: ${parallelism.toFixed(2)}x)`
    };
  }
  
  /**
   * Construit le graphe de dépendances
   */
  private buildDependencyGraph(tasks: Task[]): Graph {
    const graph: Graph = {
      nodes: tasks.map(t => t.id),
      edges: []
    };
    
    tasks.forEach(task => {
      task.dependencies?.forEach(depId => {
        graph.edges.push({ from: depId, to: task.id });
      });
    });
    
    return graph;
  }
  
  /**
   * Détecte les cycles dans le graphe (DFS)
   */
  private hasCycle(graph: Graph): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    
    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);
      
      const neighbors = graph.edges
        .filter(e => e.from === node)
        .map(e => e.to);
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true; // Cycle détecté
        }
      }
      
      recStack.delete(node);
      return false;
    };
    
    for (const node of graph.nodes) {
      if (!visited.has(node)) {
        if (dfs(node)) return true;
      }
    }
    
    return false;
  }
  
  /**
   * Tri topologique (algorithme de Kahn)
   */
  private topologicalSort(graph: Graph): string[] {
    const inDegree = new Map<string, number>();
    const result: string[] = [];
    const queue: string[] = [];
    
    // Calculer in-degree
    graph.nodes.forEach(node => inDegree.set(node, 0));
    graph.edges.forEach(edge => {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    });
    
    // Initialiser la queue avec les nœuds sans dépendances
    graph.nodes.forEach(node => {
      if (inDegree.get(node) === 0) queue.push(node);
    });
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);
      
      // Réduire in-degree des voisins
      const neighbors = graph.edges
        .filter(e => e.from === node)
        .map(e => e.to);
      
      neighbors.forEach(neighbor => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }
    
    return result;
  }
  
  /**
   * Regroupe les tâches par niveaux exécutables en parallèle
   */
  private groupByLevel(sorted: string[], tasks: Task[]): string[][] {
    const levels: string[][] = [];
    const completed = new Set<string>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    while (completed.size < sorted.length) {
      const level: string[] = [];
      
      sorted.forEach(taskId => {
        if (completed.has(taskId)) return;
        
        const task = taskMap.get(taskId)!;
        const allDepsCompleted = task.dependencies?.every(d => completed.has(d)) ?? true;
        
        if (allDepsCompleted) {
          level.push(taskId);
        }
      });
      
      if (level.length === 0) break; // Deadlock
      
      levels.push(level);
      level.forEach(id => completed.add(id));
    }
    
    return levels;
  }
  
  /**
   * Exécute une tâche individuelle avec résilience
   */
  private async executeTask(taskId: string): Promise<TaskResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return {
        taskId,
        success: false,
        output: null,
        duration: 0,
        error: 'Task not found'
      };
    }
    
    const startTime = Date.now();
    task.status = 'running';
    
    try {
      // Charger l'agent
      const agent = await agentRegistry.getAgentAsync(task.agent);
      if (!agent) {
        throw new Error(`Agent "${task.agent}" not found`);
      }
      
      // Exécuter avec résilience
      const result = await resilientExecutor.executeWithRetry(
        () => agent.execute(task.input as AgentExecuteProps),
        {
          maxRetries: 3,
          circuitBreakerKey: task.agent,
          onRetry: (attempt, max) => {
            console.log(`[CoordinatorAgent] Retrying task ${taskId} (${attempt}/${max})`);
          }
        }
      );
      
      task.status = 'completed';
      
      return {
        taskId,
        success: result.success,
        output: result.output,
        duration: Date.now() - startTime
      };
    } catch (error) {
      task.status = 'failed';
      
      return {
        taskId,
        success: false,
        output: null,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Calcule le facteur de parallélisme
   */
  private calculateParallelism(levels: string[][]): number {
    if (levels.length === 0) return 0;
    
    const totalTasks = levels.reduce((sum, level) => sum + level.length, 0);
    const sequentialLevels = levels.length;
    
    return totalTasks / sequentialLevels;
  }
  
  /**
   * Obtenir la tâche
   */
  private getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }
}
