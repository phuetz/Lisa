/**
 * WorkflowExecutor.ts
 * Moteur d'exécution du workflow qui exécute les nœuds de manière séquentielle
 * ou en parallèle selon la configuration.
 * Prêt à être déplacé dans un Worker pour l'exécution asynchrone
 */

type ExecutionData = Record<string, unknown>;

export interface ExecutionNode {
  id: string;
  type: string;
  inputs?: ExecutionData;
  outputs?: ExecutionData;
  config?: ExecutionData;
  dependencies?: string[];
}

export interface WorkflowExecutionOptions {
  nodes: ExecutionNode[];
  edges: Array<{ source: string; target: string; sourceHandle?: string; targetHandle?: string }>;
  initialData?: ExecutionData;
  stepByStep?: boolean;
  maxExecutionTime?: number;
  maxRetries?: number;
  environment?: string;
  debugMode?: boolean;
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
      console.log(`Exécution HTTP ${method} vers ${url}`);
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

  // Flux de contrôle
  'condition': async (node) => {
    const { condition } = (node.config ?? Object.create(null)) as { condition?: string };
    if (typeof condition !== 'string') {
      throw new Error('Condition invalide pour le nœud condition');
    }
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
    const { code, language = 'javascript' } = (node.config ?? Object.create(null)) as {
      code?: string;
      language?: string;
    };
    if (typeof code !== 'string') {
      throw new Error('Code invalide pour le nœud code');
    }
    
    try {
      if (language === 'javascript') {
        // DANGER: À remplacer par une sandbox sécurisée comme VM2
        const funcBody = `
          const inputs = ${JSON.stringify(inputs)};
          ${code}
          return result;
        `;
        // Utiliser Function est dangereux - à remplacer par VM2
        const result = new Function(funcBody)() as unknown;
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
  'input': async (node) => {
    const { defaultValue = null } = (node.config ?? Object.create(null)) as { defaultValue?: unknown };
    return { data: defaultValue };
  },
  
  'output': async (_node, inputs) => {
    return inputs;
  }
};

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
  private stepResolver: (() => void) | null = null;
  private stepByStepMode: boolean;

  constructor(options: WorkflowExecutionOptions) {
    this.options = options;
    this.stepByStepMode = !!options.stepByStep;
    this.executionStartTime = 0;
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
  private async executeNode(nodeId: string): Promise<ExecutionData> {
    const node = this.nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Nœud ${nodeId} non trouvé`);
    }
    
    this.executionPath.push(nodeId);
    
    try {
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
    
    this.nodeMap.forEach((_node, nodeId) => {
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
        rootNodes.map(async (rootNode) => {
          await this.executeNode(rootNode.id);
          executedNodes.add(rootNode.id);
          await this.executeNextNodes(executedNodes);
        })
      );
      
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
    }
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
  console.log(`Test du workflow avec les nœuds: ${options.nodes.join(', ')}`);
  return {
    success: true,
    duration: 123,
    results: { output: "Test result data" }
  };
}

export default WorkflowExecutor;
