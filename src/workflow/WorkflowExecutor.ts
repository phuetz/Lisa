import type { Node, Edge } from 'reactflow';
import type { ExecutionOptions, ExecutionResult } from './types/workflow.d';
import { agentRegistry } from '../features/agents/core/registry';
import { SmallTalkAgent } from '../features/agents/implementations/SmallTalkAgent';

/**
 * Classe WorkflowExecutor
 * Responsable de l'exécution des workflows dans un environnement sécurisé
 * Peut s'exécuter dans un Web Worker pour ne pas bloquer l'UI
 */
export class WorkflowExecutor {
  private nodes: Node[];
  private edges: Edge[];
  private context: {
    global: Record<string, unknown>;
    env: Record<string, unknown>;
    nodes: Record<string, unknown>;
    cache: Map<string, unknown>;
  };
  private options: ExecutionOptions;
  private startTime: number;
  private executionPath: string[] = [];
  private credentials: Record<string, unknown> = {};
  private debugMode: boolean = false;

  /**
   * Constructeur
   * @param nodes Nœuds du workflow
   * @param edges Connexions du workflow
   * @param options Options d'exécution
   */
  constructor(nodes: Node[], edges: Edge[], options: ExecutionOptions = {}) {
    this.nodes = nodes;
    this.edges = edges;
    this.options = options;
    this.startTime = Date.now();
    this.context = {
      global: options.variables || {},
      env: {
        name: options.environment || 'development',
      },
      nodes: {},
      cache: new Map(),
    };
    this.debugMode = !!options.debugMode;
    
    // Initialisation du contexte
    this.initializeContext();
  }

  /**
   * Initialise le contexte d'exécution
   */
  private initializeContext(): void {
    // Pré-remplir le contexte avec les nœuds
    this.nodes.forEach(node => {
      this.context.nodes[node.id] = {
        id: node.id,
        type: node.type,
        data: node.data,
      };
    });
  }

  /**
   * Log pour debug
   */
  private log(level: string, message: string, data: any = {}): void {
    if (this.debugMode) {
      console.log(`[${level.toUpperCase()}] [${Date.now() - this.startTime}ms]`, message, data);
    }
  }

  /**
   * Exécute le workflow complet
   * @returns Résultat d'exécution
   */
  async execute(): Promise<ExecutionResult> {
    this.log('info', 'Starting workflow execution', { 
      nodeCount: this.nodes.length, 
      edgeCount: this.edges.length,
      options: this.options 
    });
    
    const startNodes = this.findStartNodes();
    if (startNodes.length === 0) {
      return {
        success: false,
        nodeResults: {},
        errors: { global: 'No start nodes found in workflow' },
        duration: Date.now() - this.startTime,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date().toISOString(),
        path: [],
      };
    }

    const nodeResults: Record<string, unknown> = {};
    const errors: Record<string, string | Error> = {};
    
    try {
      // Exécuter les nœuds de départ et leurs successeurs
      for (const startNode of startNodes) {
        await this.executeNodeAndSuccessors(startNode, {}, nodeResults, errors);
      }
      
      const success = Object.keys(errors).length === 0;
      
      return {
        success,
        nodeResults,
        errors: success ? undefined : errors,
        duration: Date.now() - this.startTime,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date().toISOString(),
        path: this.executionPath,
      };
    } catch (error) {
      return {
        success: false,
        nodeResults,
        errors: { 
          global: error instanceof Error ? error : new Error(String(error))
        },
        duration: Date.now() - this.startTime,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date().toISOString(),
        path: this.executionPath,
      };
    }
  }

  /**
   * Trouve les nœuds de départ (sans entrées)
   * @returns Liste des nœuds de départ
   */
  private findStartNodes(): Node[] {
    // Collecter tous les nœuds cibles
    const targetNodeIds = new Set(this.edges.map(edge => edge.target));
    
    // Trouver les nœuds qui ne sont pas des cibles (ce sont les points d'entrée)
    return this.nodes.filter(node => !targetNodeIds.has(node.id));
  }

  /**
   * Exécute un nœud et ses successeurs récursivement
   * @param node Nœud à exécuter
   * @param inputData Données d'entrée
   * @param nodeResults Résultats d'exécution
   * @param errors Erreurs d'exécution
   */
  private async executeNodeAndSuccessors(
    node: Node, 
    inputData: any, 
    nodeResults: Record<string, unknown>,
    errors: Record<string, string | Error>
  ): Promise<void> {
    try {
      // Vérifier si le nœud a déjà été exécuté
      if (nodeResults[node.id]) {
        this.log('info', `Node ${node.id} already executed, using cached result`);
        return;
      }
      
      // Exécuter le nœud actuel
      this.log('info', `Executing node ${node.id}`, { type: node.type, inputData });
      this.executionPath.push(node.id);
      
      // Pause en mode pas à pas si configuré
      if (this.options.stepByStep) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Exécuter le nœud avec sandbox
      const result = await this.executeSandboxedNode(node, inputData);
      nodeResults[node.id] = result;
      
      // Trouver et exécuter les nœuds suivants
      const outgoingEdges = this.edges.filter(edge => edge.source === node.id);
      
      for (const edge of outgoingEdges) {
        const targetNode = this.nodes.find(n => n.id === edge.target);
        if (!targetNode) {
          this.log('warn', `Target node ${edge.target} not found`);
          continue;
        }
        
        // Préparer les données d'entrée pour le nœud suivant
        const targetInput = this.prepareInputForTarget(result, edge, targetNode);
        
        // Exécuter récursivement
        await this.executeNodeAndSuccessors(targetNode, targetInput, nodeResults, errors);
      }
    } catch (error) {
      this.log('error', `Error executing node ${node.id}`, { error });
      errors[node.id] = error instanceof Error ? error : new Error(String(error));
      
      // Si on n'est pas en mode debug, on arrête l'exécution à la première erreur
      if (!this.debugMode) {
        throw error;
      }
    }
  }

  /**
   * Prépare les données d'entrée pour un nœud cible
   * @param sourceResult Résultat du nœud source
   * @param edge Connexion
   * @param targetNode Nœud cible
   * @returns Données préparées
   */
  private prepareInputForTarget(sourceResult: any, edge: Edge, targetNode: Node): any {
    // Si l'arête a une transformation définie, l'appliquer
    if (edge.data?.transform) {
      try {
        return this.applyTransform(sourceResult, edge.data.transform);
      } catch (error) {
        this.log('warn', `Transform error on edge ${edge.id}`, { error });
        return sourceResult;
      }
    }
    
    return sourceResult;
  }

  /**
   * Applique une transformation aux données
   * @param data Données source
   * @param transform Fonction ou expression de transformation
   * @returns Données transformées
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private applyTransform(data: any, transform: string | Function): any {
    if (typeof transform === 'function') {
      return transform(data, this.context);
    }
    
    if (typeof transform === 'string') {
      try {
        // Évalue l'expression de transformation
        const func = new Function('data', 'context', `
          with (context) {
            return ${transform};
          }
        `);
        return func(data, this.context);
      } catch (error) {
        this.log('error', 'Transform evaluation error', { transform, error });
        throw error;
      }
    }
    
    return data;
  }

  /**
   * Exécute un nœud dans un environnement sandbox via les agents spécialisés
   * @param node Nœud à exécuter
   * @param inputData Données d'entrée
   * @returns Résultat d'exécution
   */
  private async executeSandboxedNode(node: Node, inputData: any): Promise<any> {
    this.log('info', `Executing sandboxed node ${node.id}`, { type: node.type, data: node.data });

    const type = node.type;
    if (!type) {
      throw new Error(`Node ${node.id} has no type`);
    }
    
    const config = node.data || {};
    this.log('info', `Executing node using agent system: ${node.id} (${type})`, { config });
    
    try {
      // Utiliser les agents spécialisés selon le type de nœud
      switch (type) {
        case 'trigger':
        case 'webhook': {
          const triggerResult = await agentRegistry.execute('TriggerAgent', {
            intent: type === 'trigger' ? 'trigger' : 'webhook',
            parameters: {
              mockData: config.mockData
            }
          });

          if (!triggerResult.success) {
            throw new Error(triggerResult.error || 'Trigger/Webhook execution failed');
          }

          return triggerResult.output;
        }

        case 'httpRequest':
        case 'apiCall': {
          // Utiliser WorkflowHTTPAgent pour les requêtes HTTP
          const httpResult = await agentRegistry.execute('WorkflowHTTPAgent', {
            intent: type === 'httpRequest' ? 'httpRequest' : 'apiCall',
            parameters: {
              url: config.url,
              method: config.method || 'GET',
              headers: config.headers || {},
              data: inputData,
              timeout: config.timeout || 10000,
              // Pour apiCall
              endpoint: config.endpoint,
              apiKey: config.apiKey,
              service: config.service
            }
          });

          if (!httpResult.success) {
            throw new Error(httpResult.error || 'HTTP request failed');
          }

          return httpResult.output;
        }

        case 'code':
        case 'function': {
          // Utiliser WorkflowCodeAgent pour l'exécution de code
          const codeResult = await agentRegistry.execute('WorkflowCodeAgent', {
            intent: 'executeCode',
            parameters: {
              code: config.code || 'return { result: "Default result" }',
              input: inputData,
              timeout: config.timeout || 5000,
              context: {
                ...this.context,
                node: { id: node.id, type, config }
              }
            }
          });

          if (!codeResult.success) {
            throw new Error(codeResult.error || 'Code execution failed');
          }

          return codeResult.output;
        }

        case 'transform': {
          const transformResult = await agentRegistry.execute('TransformAgent', {
            intent: 'transform',
            parameters: {
              template: config.template,
              expression: config.expression,
              input: inputData,
              context: this.context
            }
          });

          if (!transformResult.success) {
            throw new Error(transformResult.error || 'Transform execution failed');
          }

          return transformResult.output;
        }

        case 'condition': {
          const conditionResult = await agentRegistry.execute('ConditionAgent', {
            intent: 'evaluateCondition',
            parameters: {
              condition: config.condition || 'true',
              input: inputData,
              context: this.context
            }
          });

          if (!conditionResult.success) {
            throw new Error(conditionResult.error || 'Condition evaluation failed');
          }

          return conditionResult.output;
        }

        case 'delay': {
          const delayResult = await agentRegistry.execute('DelayAgent', {
            intent: 'delay',
            parameters: {
              delayMs: config.delay,
              input: inputData
            }
          });

          if (!delayResult.success) {
            throw new Error(delayResult.error || 'Delay execution failed');
          }

          return delayResult.output;
        }

        case 'windForecastNode': {
          const result = await agentRegistry.execute('WindsurfAgent', {
            intent: 'getForecast',
            parameters: { spotId: config.spotId || 'tarifa' },
          });
          if (!result.success) throw new Error(result.error || 'WindsurfAgent execution failed');
          return { ...inputData, forecast: result.output };
        }

        case 'llmPromptNode': {
          const result = await agentRegistry.execute('GeminiCodeAgent', {
            intent: 'generateCode',
            parameters: { request: node.data.prompt },
          });
          if (!result.success) throw new Error(result.error || 'GeminiCodeAgent execution failed');
          return { ...inputData, response: result.output.content, error: result.output.error };
        }

        case 'smallTalkNode': {
          const result = await agentRegistry.execute('SmallTalkAgent', {
            request: config.text || inputData.text,
          });
          if (!result.success) throw new Error(result.error || 'SmallTalkAgent execution failed');
          return { ...inputData, response: result.output };
        }

        case 'rosTopic':
          return agentRegistry.execute('RosAgent', node.data);

        default: {
          // Essayer de trouver un agent capable de gérer ce type de nœud
          const agentName = `Workflow${type.charAt(0).toUpperCase() + type.slice(1)}Agent`;
          if (agentRegistry.hasAgent(agentName)) {
            const result = await agentRegistry.execute(agentName, {
              intent: config.intent || 'execute',
              parameters: {
                ...config,
                input: inputData
              }
            });

            if (!result.success) {
              throw new Error(result.error || `${type} execution failed`);
            }

            return result.output;
          }

          // Fallback pour les types inconnus
          this.log('warn', `No agent found for node type: ${type}, using default handling`);
          return {
            processed: true,
            nodeType: type,
            timestamp: new Date().toISOString(),
            data: inputData
          };
        }
      }
    } catch (error) {
      this.log('error', `Agent execution error for node ${node.id}`, { error });
      throw error;
    }
  }

  
}

/**
 * Crée un WorkflowExecutor configuré
 * @param nodes Nœuds du workflow
 * @param edges Connexions du workflow
 * @param options Options d'exécution
 * @returns Instance de WorkflowExecutor
 */
export function createExecutor(nodes: Node[], edges: Edge[], options: ExecutionOptions = {}): WorkflowExecutor {
  return new WorkflowExecutor(nodes, edges, options);
}

export default WorkflowExecutor;
