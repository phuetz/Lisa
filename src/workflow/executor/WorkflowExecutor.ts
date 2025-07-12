/**
 * WorkflowExecutor.ts
 * Moteur d'exécution du workflow qui exécute les nœuds de manière séquentielle
 * ou en parallèle selon la configuration.
 * Prêt à être déplacé dans un Worker pour l'exécution asynchrone
 */

// Type definitions
export interface ExecutionNode {
  id: string;
  type: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  config?: Record<string, any>;
  dependencies?: string[];
}

export interface WorkflowExecutionOptions {
  nodes: ExecutionNode[];
  edges: Array<{ source: string; target: string; sourceHandle?: string; targetHandle?: string }>;
  initialData?: Record<string, any>;
  stepByStep?: boolean;
  maxExecutionTime?: number;
  maxRetries?: number;
  environment?: string;
  debugMode?: boolean;
}

export interface WorkflowExecutionResult {
  success: boolean;
  data: Record<string, any>;
  errors: Record<string, any>;
  executionPath: string[];
  executionTime: number;
  nodeResults: Record<string, any>;
}

// Handlers pour chaque type de nœud
const nodeHandlers: Record<string, (node: ExecutionNode, inputs: any) => Promise<any>> = {
  // Opérations HTTP
  'http-request': async (node, inputs) => {
    const { url, method = 'GET', headers = {}, body } = node.config || {};
    try {
      // Dans une vraie implémentation, on utiliserait fetch
      console.log(`Exécution HTTP ${method} vers ${url}`);
      return { 
        status: 200, 
        body: { success: true, data: 'Response data' },
        headers: { 'content-type': 'application/json' }
      };
    } catch (error) {
      throw new Error(`Erreur dans la requête HTTP: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  // Manipulation de données
  'data-transform': async (node, inputs) => {
    try {
      const { transformType } = node.config || {};
      const inputData = inputs.data || {};
      
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

  // Flux de contrôle
  'condition': async (node, inputs) => {
    const { condition } = node.config || {};
    try {
      // Évaluation simple de la condition (à remplacer par une évaluation sécurisée)
      const result = eval(condition); // ATTENTION: à remplacer par une sandbox!
      return { result: Boolean(result) };
    } catch (error) {
      throw new Error(`Erreur dans l'évaluation de condition: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  // Code personnalisé
  'code': async (node, inputs) => {
    const { code, language = 'javascript' } = node.config || {};
    
    try {
      if (language === 'javascript') {
        // DANGER: À remplacer par une sandbox sécurisée comme VM2
        const funcBody = `
          const inputs = ${JSON.stringify(inputs)};
          ${code}
          return result;
        `;
        // Utiliser Function est dangereux - à remplacer par VM2
        const result = new Function(funcBody)();
        return { result };
      } else if (language === 'python') {
        // Simuler l'exécution Python (à remplacer par Pyodide ou un service)
        console.log("Exécution Python simulée");
        return { result: { success: true, message: "Python execution simulated" } };
      } else {
        throw new Error(`Language ${language} non supporté`);
      }
    } catch (error) {
      throw new Error(`Erreur dans l'exécution du code: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  
  // Services externes
  'openai': async (node, inputs) => {
    const { prompt, model = 'gpt-3.5-turbo', temperature = 0.7 } = node.config || {};
    try {
      // Simuler un appel à OpenAI
      console.log(`Appel OpenAI: ${prompt} (${model}, temp:${temperature})`);
      return { 
        response: "Réponse simulée d'OpenAI...",
        usage: { total_tokens: 150 }
      };
    } catch (error) {
      throw new Error(`Erreur OpenAI: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  
  // Entrée/sortie
  'input': async (node, inputs) => {
    return { data: node.config?.defaultValue || null };
  },
  
  'output': async (node, inputs) => {
    return inputs;
  }
};

/**
 * Classe principale d'exécution du workflow
 */
export class WorkflowExecutor {
  private nodeResults: Record<string, any> = {};
  private nodeErrors: Record<string, any> = {};
  private executionPath: string[] = [];
  private executionStartTime: number = 0;
  private options: WorkflowExecutionOptions;
  private nodeMap: Map<string, ExecutionNode> = new Map();
  private edgeMap: Map<string, string[]> = new Map();
  private stepResolver: (() => void) | null = null;
  private stepByStepMode: boolean = false;
  
  constructor(options: WorkflowExecutionOptions) {
    this.options = options;
    this.stepByStepMode = !!options.stepByStep;
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
    
    // Construire le map des arêtes
    this.options.edges.forEach(edge => {
      if (!this.edgeMap.has(edge.source)) {
        this.edgeMap.set(edge.source, []);
      }
      this.edgeMap.get(edge.source)?.push(edge.target);
    });
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
   * Exécute un nœud individuel
   */
  private async executeNode(nodeId: string): Promise<any> {
    const node = this.nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Nœud ${nodeId} non trouvé`);
    }
    
    this.executionPath.push(nodeId);
    
    try {
      // Collecter les entrées des nœuds parents
      const inputs: Record<string, any> = { ...this.options.initialData };
      
      // Trouver tous les nœuds qui ont des arêtes pointant vers ce nœud
      this.options.edges.forEach(edge => {
        if (edge.target === nodeId && this.nodeResults[edge.source]) {
          if (edge.sourceHandle && edge.targetHandle) {
            // Si handles spécifiés, utilisez-les pour mapper les entrées
            if (!inputs[edge.targetHandle]) inputs[edge.targetHandle] = {};
            inputs[edge.targetHandle] = this.nodeResults[edge.source][edge.sourceHandle];
          } else {
            // Sinon, fusionner tous les résultats
            Object.assign(inputs, this.nodeResults[edge.source]);
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
      
      // Exécuter le nœud et stocker le résultat
      const result = await handler(node, inputs);
      this.nodeResults[nodeId] = result;
      
      return result;
    } catch (error) {
      this.nodeErrors[nodeId] = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }
  
  /**
   * Obtient et exécute les prochains nœuds éligibles en fonction des résultats actuels
   */
  private async executeNextNodes(executedNodes: Set<string>): Promise<void> {
    // Trouver tous les nœuds qui ont leurs dépendances satisfaites
    const eligibleNodes: string[] = [];
    
    this.nodeMap.forEach((node, nodeId) => {
      if (executedNodes.has(nodeId)) return;
      
      let allDependenciesMet = true;
      
      // Vérifier si toutes les dépendances sont exécutées
      this.options.edges.forEach(edge => {
        if (edge.target === nodeId && !executedNodes.has(edge.source)) {
          allDependenciesMet = false;
        }
      });
      
      if (allDependenciesMet) {
        eligibleNodes.push(nodeId);
      }
    });
    
    if (eligibleNodes.length === 0) return;
    
    // Exécuter tous les nœuds éligibles en parallèle
    await Promise.all(
      eligibleNodes.map(async (nodeId) => {
        await this.executeNode(nodeId);
        executedNodes.add(nodeId);
        await this.executeNextNodes(executedNodes);
      })
    );
  }
  
  /**
   * Exécute le workflow complet
   */
  public async execute(): Promise<WorkflowExecutionResult> {
    this.executionStartTime = Date.now();
    this.nodeResults = {};
    this.nodeErrors = {};
    this.executionPath = [];
    const executedNodes = new Set<string>();
    
    try {
      // Commencer par les nœuds racines
      const rootNodes = this.getRootNodes();
      
      // Exécuter les nœuds racines en parallèle
      await Promise.all(
        rootNodes.map(async (node) => {
          await this.executeNode(node.id);
          executedNodes.add(node.id);
          await this.executeNextNodes(executedNodes);
        })
      );
      
      // Collecter tous les résultats des nœuds de sortie
      const outputResults: Record<string, any> = {};
      this.options.nodes
        .filter(node => node.type === 'output')
        .forEach(node => {
          outputResults[node.id] = this.nodeResults[node.id];
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
    }
  }
}

/**
 * Fonction utilitaire pour tester un workflow
 */
export async function testWorkflow(options: {
  nodes: string[];
  data?: Record<string, any>;
}): Promise<any> {
  // Simuler un test de workflow
  console.log(`Test du workflow avec les nœuds: ${options.nodes.join(', ')}`);
  return {
    success: true,
    duration: 123,
    results: { output: "Test result data" }
  };
}

export default WorkflowExecutor;
