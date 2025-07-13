import type { Node, Edge } from 'reactflow';
import type { ExecutionOptions, ExecutionResult } from './types/workflow.d';
import { agentRegistry } from '../agents/AgentRegistry';
import { SmallTalkAgent } from '../agents/SmallTalkAgent';
import { useAppStore } from '../store/appStore';

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
    nodeExecutionData: Record<string, { input: any; output: any; error?: any; }>;
  };
  private options: ExecutionOptions;
  private startTime: number;
  private executionPath: string[] = [];
  private credentials: Record<string, unknown> = {};
  private debugMode: boolean = false;
  private setNodeExecutionStatus: (nodeId: string, status: 'idle' | 'running' | 'success' | 'failed' | 'skipped') => void;
  private setEdgeExecutionStatus: (edgeId: string, status: 'idle' | 'active' | 'skipped') => void;
  private resetExecutionStatus: () => void;

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
      nodeExecutionData: {},
    };
    this.debugMode = !!options.debugMode;
    
    // Get store actions
    const { setNodeExecutionStatus, setEdgeExecutionStatus, resetExecutionStatus } = useAppStore.getState().workflow;
    this.setNodeExecutionStatus = setNodeExecutionStatus;
    this.setEdgeExecutionStatus = setEdgeExecutionStatus;
    this.resetExecutionStatus = resetExecutionStatus;

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
    
    this.resetExecutionStatus(); // Reset all statuses at the beginning of execution

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
      
      // Mark any remaining idle nodes as skipped if they were not executed
      this.nodes.forEach(node => {
        if (!nodeResults[node.id] && !errors[node.id]) {
          this.setNodeExecutionStatus(node.id, 'skipped');
        }
      });

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
      // Vérifier si le nœud a déjà été exécuté avec succès
      if (nodeResults[node.id] && !errors[node.id]) {
        this.log('info', `Node ${node.id} already executed successfully, skipping re-execution`);
        this.setNodeExecutionStatus(node.id, 'skipped');
        return;
      }
      
      // Marquer le nœud comme en cours d'exécution
      this.setNodeExecutionStatus(node.id, 'running');
      this.log('info', `Executing node ${node.id}`, { type: node.type, inputData });
      this.executionPath.push(node.id);
      
      // Pause en mode pas à pas si configuré
      if (this.options.stepByStep) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      try {
        // Exécuter le nœud avec sandbox
        const result = await this.executeSandboxedNode(node, inputData);
        nodeResults[node.id] = result;
        this.context.nodeExecutionData[node.id] = { input: inputData, output: result };
        this.setNodeExecutionStatus(node.id, 'success');
        
        // Trouver et exécuter les nœuds suivants
        const outgoingEdges = this.edges.filter(edge => edge.source === node.id);
        
        for (const edge of outgoingEdges) {
          const targetNode = this.nodes.find(n => n.id === edge.target);
          if (!targetNode) {
            this.log('warn', `Target node ${edge.target} not found`);
            continue;
          }
          
          this.setEdgeExecutionStatus(edge.id, 'active'); // Marquer l'arête comme active
          
          // Préparer les données d'entrée pour le nœud suivant
          const targetInput = this.prepareInputForTarget(result, edge, targetNode);
          
          // Exécuter récursivement
          await this.executeNodeAndSuccessors(targetNode, targetInput, nodeResults, errors);
        }
      } catch (error) {
        this.log('error', `Error executing node ${node.id}`, { error });
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors[node.id] = errorMessage;
        nodeResults[node.id] = { error: errorMessage, success: false }; // Store error in nodeResults
        this.context.nodeExecutionData[node.id] = { input: inputData, output: null, error: errorMessage };
        this.setNodeExecutionStatus(node.id, 'failed'); // Marquer le nœud comme échoué
        
        // Si on n'est pas en mode debug, on arrête l'exécution à la première erreur
        if (!this.options.debugMode) {
          throw error;
        }
      }
    } catch (outerError) {
      this.log('error', `Unhandled error in executeNodeAndSuccessors for node ${node.id}`, { outerError });
      this.setNodeExecutionStatus(node.id, 'failed'); // Ensure node is marked failed even for unhandled errors
      throw outerError; // Re-throw to be caught by the main execute method
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
  private applyTransform(data: any, transform: string | Function): any {
    if (typeof transform === 'function') {
      return transform(data, this.context);
    }
    
    if (typeof transform === 'string') {
      // Regex pour trouver les expressions {{nodeId.outputKey}}
      const regex = /{{\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*}}/g;
      let transformedString = transform;

      // Remplacer les expressions par les valeurs réelles
      transformedString = transformedString.replace(regex, (match, nodeId, outputKey) => {
        const nodeOutput = this.context.nodeResults?.[nodeId];
        if (nodeOutput && typeof nodeOutput === 'object' && nodeOutput !== null && outputKey in nodeOutput) {
          return JSON.stringify(nodeOutput[outputKey]);
        } else {
          this.log('warn', `Expression not resolved: ${match}. Node ${nodeId} or key ${outputKey} not found.`, { nodeId, outputKey, nodeOutput: nodeOutput });
          return match; // Retourne l'expression non résolue si non trouvée
        }
      });

      try {
        // Tenter d'évaluer la chaîne transformée comme du JSON ou une expression JavaScript
        // Si la chaîne est un JSON valide, la parser
        if (transformedString.startsWith('{') && transformedString.endsWith('}') || transformedString.startsWith('[') && transformedString.endsWith(']')) {
          try {
            return JSON.parse(transformedString);
          } catch (e) {
            // Pas un JSON valide, continuer à traiter comme une expression JS
          }
        }
        
        // Évaluer l'expression de transformation comme du JavaScript
        const func = new Function('data', 'context', `
          with (context) {
            return ${transformedString};
          }
        `);
        return func(data, this.context);
      } catch (error) {
        this.log('error', 'Transform evaluation error', { transform: transformedString, error });
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
        case 'webhook':
          const webhookResult = await agentRegistry.execute('TriggerAgent', {
            intent: 'webhook',
            parameters: {
              path: config.path,
              method: config.method,
              responseBody: config.responseBody,
              responseHeaders: config.responseHeaders,
              statusCode: config.statusCode,
            }
          });

          if (!webhookResult.success) {
            throw new Error(webhookResult.error || 'Webhook execution failed');
          }

          return webhookResult.output;
          
        case 'httpRequest':
        case 'apiCall':
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
          
        case 'code':
        case 'function':
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
          
        case 'transform':
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
          
        case 'condition':
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

          // Le nœud conditionnel doit retourner un objet avec une propriété 'output'
          // qui indique quelle branche suivre (true ou false)
          return { output: conditionResult.output };
          
        case 'delay':
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
        
        case 'set':
          const setResult = { ...inputData };
          const key = config.key;
          const value = this.applyTransform(inputData, config.value);
          setResult[key] = value;
          return setResult;

        case 'for-each':
          const listToIterate = this.applyTransform(inputData, config.listExpression);

          if (!Array.isArray(listToIterate)) {
            throw new Error(`For-each node requires an array for iteration. Received: ${typeof listToIterate}`);
          }

          const iterationResults = [];
          for (const item of listToIterate) {
            // Créer un nouveau contexte pour chaque itération
            const iterationContext = {
              ...this.context,
              [config.iterationVariable]: item,
            };
            // Exécuter les nœuds suivants avec le nouveau contexte
            // Pour l'instant, nous ne gérons pas les sous-workflows complexes ici.
            // Cela nécessiterait une logique plus avancée pour identifier les nœuds du sous-workflow.
            // Pour cette implémentation simple, nous passons simplement l'élément courant.
            iterationResults.push(item); // Placeholder: devrait exécuter les nœuds suivants et collecter leurs résultats
          }
          return { iterationResults };
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

        case 'content-generator': {
          const result = await agentRegistry.execute('ContentGeneratorAgent', {
            intent: config.action,
            parameters: {
              text: config.text || inputData.text,
              prompt: config.prompt || inputData.prompt,
              targetLanguage: config.targetLanguage,
              style: config.style,
              length: config.length,
              subject: config.subject,
              recipient: config.recipient,
              points: config.points,
              context: config.context
            },
          });
          if (!result.success) throw new Error(result.error || 'ContentGeneratorAgent execution failed');
          return { ...inputData, generatedContent: result.output };
        }

        case 'memory': {
          const result = await agentRegistry.execute('MemoryAgent', {
            action: config.action,
            content: config.content || inputData.content,
            query: config.query || inputData.query,
            id: config.id || inputData.id,
            type: config.type,
            tags: config.tags,
            context: config.context
          });
          if (!result.success) throw new Error(result.error || 'MemoryAgent execution failed');
          return { ...inputData, memoryResult: result.output };
        }

        case 'personalization': {
          const result = await agentRegistry.execute('PersonalizationAgent', {
            intent: config.action,
            parameters: {
              category: config.category,
              key: config.key,
              value: config.value,
              context: config.context
            },
          });
          if (!result.success) throw new Error(result.error || 'PersonalizationAgent execution failed');
          return { ...inputData, personalizationResult: result.output };
        }

        case 'github': {
          const result = await agentRegistry.execute('GitHubAgent', {
            action: config.action,
            owner: config.owner,
            repo: config.repo,
            username: config.username,
            state: config.state,
            title: config.title,
            body: config.body,
            labels: config.labels,
            token: config.token || process.env.VITE_GITHUB_TOKEN,
            useCache: config.useCache
          });
          if (!result.success) throw new Error(result.error || 'GitHubAgent execution failed');
          return { ...inputData, githubResult: result.output };
        }

        case 'powershell': {
          const result = await agentRegistry.execute('PowerShellAgent', {
            action: config.action,
            command: config.command,
            options: config.options
          });
          if (!result.success) throw new Error(result.error || 'PowerShellAgent execution failed');
          return { ...inputData, powershellResult: result.output };
        }

        case 'delay':
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

        case 'log':
          // Log the message to console or a dedicated log stream
          const message = config.message || JSON.stringify(inputData);
          const level = config.level || 'info';
          this.log(level, message, inputData);
          return { logged: true, message, level, originalInput: inputData };

        case 'nlu': {
          const result = await agentRegistry.execute('NLUAgent', {
            task: config.task,
            parameters: {
              text: config.text || inputData.text,
              candidate_labels: config.candidate_labels,
            },
          });
          if (!result.success) throw new Error(result.error || 'NLUAgent execution failed');
          return { ...inputData, nluResult: result.output };
        }

        case 'mqtt': {
          const result = await agentRegistry.execute('MQTTAgent', {
            action: config.action,
            brokerUrl: config.brokerUrl,
            topic: config.topic,
            message: config.message,
            options: config.options
          });
          if (!result.success) throw new Error(result.error || 'MQTTAgent execution failed');
          return { ...inputData, mqttResult: result.output };
        }

        case 'rosPublisher':
          return agentRegistry.execute('RosAgent', { ...node.data, mode: 'publish' });
        case 'rosSubscriber':
          return agentRegistry.execute('RosAgent', { ...node.data, mode: 'subscribe' });
        case 'rosService':
          return agentRegistry.execute('RosAgent', { ...node.data, mode: 'service' });

        case 'rosTopic':
          return agentRegistry.execute('RosAgent', node.data);

        case 'subWorkflow': {
          const subWorkflowId = config.workflowId;
          if (!subWorkflowId) {
            throw new Error('Sub-workflow ID is required for subWorkflow node.');
          }

          // TODO: Implement a way to fetch sub-workflow definition (nodes and edges)
          // For now, let's mock it or assume it's available globally for simplicity
          // This will likely involve an API call or a lookup in a global store/registry
          const subWorkflowDefinition = await this.fetchWorkflowDefinition(subWorkflowId);
          if (!subWorkflowDefinition) {
            throw new Error(`Sub-workflow with ID ${subWorkflowId} not found.`);
          }

          const subExecutor = new WorkflowExecutor(
            subWorkflowDefinition.nodes,
            subWorkflowDefinition.edges,
            { ...this.options, variables: inputData } // Pass current input as sub-workflow variables
          );
          const subResult = await subExecutor.execute();

          if (!subResult.success) {
            throw new Error(`Sub-workflow ${subWorkflowId} failed: ${JSON.stringify(subResult.errors)}`);
          }

          return subResult.nodeResults; // Return the results of the sub-workflow
        }

        default:
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
    } catch (error) {
      this.log('error', `Agent execution error for node ${node.id}`, { error });
      throw error;
    }
  }

  // Placeholder for fetching sub-workflow definition
  private async fetchWorkflowDefinition(workflowId: string): Promise<{ nodes: Node[], edges: Edge[] } | null> {
    // In a real application, this would fetch from a backend API or a global store
    // For now, return a mock definition
    this.log('warn', `Fetching mock sub-workflow definition for ID: ${workflowId}`);
    return {
      nodes: [
        { id: 'sub-start', type: 'input', position: { x: 0, y: 0 }, data: { label: 'Sub-Workflow Start' } },
        { id: 'sub-log', type: 'log', position: { x: 200, y: 0 }, data: { label: 'Sub-Workflow Log', config: { message: `Executing sub-workflow: ${workflowId}` } } },
        { id: 'sub-end', type: 'output', position: { x: 400, y: 0 }, data: { label: 'Sub-Workflow End' } },
      ],
      edges: [
        { id: 'sub-e1-2', source: 'sub-start', target: 'sub-log' },
        { id: 'sub-e2-3', source: 'sub-log', target: 'sub-end' },
      ],
    };
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
