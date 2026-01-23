/**
 * WorkflowAgentFactory
 * Service capable d'instancier dynamiquement l'agent requis par un type de nœud
 * TASK-7.2: Unification du Workflow
 */

import { agentRegistry } from '../agents/core/registry';
import type { AgentExecuteResult } from '../agents/core/types';

/**
 * Mapping des types de nœuds vers leurs agents correspondants
 */
const NODE_TYPE_TO_AGENT: Record<string, string> = {
  // Triggers
  webhook: 'TriggerAgent',
  schedule: 'TriggerAgent',
  event: 'TriggerAgent',
  
  // HTTP/API
  httpRequest: 'WorkflowHTTPAgent',
  apiCall: 'WorkflowHTTPAgent',
  
  // Code execution
  code: 'WorkflowCodeAgent',
  function: 'WorkflowCodeAgent',
  script: 'WorkflowCodeAgent',
  
  // Data transformation
  transform: 'TransformAgent',
  map: 'TransformAgent',
  filter: 'TransformAgent',
  
  // Control flow
  condition: 'ConditionAgent',
  switch: 'ConditionAgent',
  delay: 'DelayAgent',
  
  // Variables
  set: 'SetAgent',
  get: 'GetAgent',
  
  // Loops
  'for-each': 'ForEachAgent',
  loop: 'LoopAgent',
  
  // LLM
  llmPromptNode: 'GeminiCodeAgent',
  llm: 'GeminiCodeAgent',
  chat: 'ChatAgent',
  
  // Conversation
  smallTalkNode: 'SmallTalkAgent',
  smallTalk: 'SmallTalkAgent',
  
  // External services
  email: 'EmailAgent',
  notification: 'NotificationAgent',
  database: 'DatabaseAgent',
  file: 'FileAgent',
};

/**
 * Intent par défaut pour chaque type de nœud
 */
const NODE_TYPE_TO_INTENT: Record<string, string> = {
  webhook: 'webhook',
  schedule: 'schedule',
  event: 'event',
  httpRequest: 'httpRequest',
  apiCall: 'apiCall',
  code: 'executeCode',
  function: 'executeCode',
  script: 'executeCode',
  transform: 'transform',
  map: 'map',
  filter: 'filter',
  condition: 'evaluateCondition',
  switch: 'evaluateSwitch',
  delay: 'delay',
  set: 'set',
  get: 'get',
  'for-each': 'forEach',
  loop: 'loop',
  llmPromptNode: 'generateCode',
  llm: 'generate',
  chat: 'chat',
  smallTalkNode: 'respond',
  smallTalk: 'respond',
  email: 'send',
  notification: 'send',
  database: 'query',
  file: 'read',
};

export interface NodeExecutionParams {
  nodeType: string;
  nodeId: string;
  config: Record<string, unknown>;
  inputData: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface NodeExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  agentUsed: string;
  duration: number;
}

/**
 * WorkflowAgentFactory
 * Centralise la logique de résolution et d'exécution des agents pour les workflows
 */
export class WorkflowAgentFactory {
  private static instance: WorkflowAgentFactory;
  
  private constructor() {}
  
  static getInstance(): WorkflowAgentFactory {
    if (!WorkflowAgentFactory.instance) {
      WorkflowAgentFactory.instance = new WorkflowAgentFactory();
    }
    return WorkflowAgentFactory.instance;
  }
  
  /**
   * Résout le nom de l'agent pour un type de nœud donné
   */
  resolveAgentName(nodeType: string): string {
    // 1. Chercher dans le mapping statique
    if (NODE_TYPE_TO_AGENT[nodeType]) {
      return NODE_TYPE_TO_AGENT[nodeType];
    }
    
    // 2. Essayer le pattern Workflow{Type}Agent
    const capitalizedType = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
    const workflowAgentName = `Workflow${capitalizedType}Agent`;
    if (agentRegistry.hasAgent(workflowAgentName)) {
      return workflowAgentName;
    }
    
    // 3. Essayer le pattern {Type}Agent
    const simpleAgentName = `${capitalizedType}Agent`;
    if (agentRegistry.hasAgent(simpleAgentName)) {
      return simpleAgentName;
    }
    
    // 4. Fallback: retourner un agent générique
    return 'GenericWorkflowAgent';
  }
  
  /**
   * Résout l'intent pour un type de nœud donné
   */
  resolveIntent(nodeType: string, configIntent?: string): string {
    // L'intent de la config a priorité
    if (configIntent) {
      return configIntent;
    }
    
    // Chercher dans le mapping statique
    return NODE_TYPE_TO_INTENT[nodeType] || 'execute';
  }
  
  /**
   * Vérifie si un agent existe pour un type de nœud
   */
  hasAgentForNodeType(nodeType: string): boolean {
    const agentName = this.resolveAgentName(nodeType);
    return agentRegistry.hasAgent(agentName);
  }
  
  /**
   * Exécute un nœud via son agent approprié
   */
  async executeNode(params: NodeExecutionParams): Promise<NodeExecutionResult> {
    const { nodeType, nodeId, config, inputData, context } = params;
    const startTime = Date.now();
    
    const agentName = this.resolveAgentName(nodeType);
    const intent = this.resolveIntent(nodeType, config.intent as string | undefined);
    
    try {
      // Vérifier si l'agent existe
      if (!agentRegistry.hasAgent(agentName)) {
        // Fallback: traitement inline pour les types simples
        const inlineResult = this.handleInlineExecution(nodeType, config, inputData);
        if (inlineResult !== null) {
          return {
            success: true,
            output: inlineResult,
            agentUsed: 'inline',
            duration: Date.now() - startTime,
          };
        }
        
        // Aucun agent trouvé
        return {
          success: false,
          error: `No agent found for node type: ${nodeType}`,
          agentUsed: 'none',
          duration: Date.now() - startTime,
        };
      }
      
      // Exécuter via l'agent
      const result: AgentExecuteResult = await agentRegistry.execute(agentName, {
        intent,
        parameters: {
          ...config,
          input: inputData,
          nodeId,
          context,
        },
      });
      
      return {
        success: result.success,
        output: result.output,
        error: result.error ? String(result.error) : undefined,
        agentUsed: agentName,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        agentUsed: agentName,
        duration: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Gère l'exécution inline pour les types de nœuds simples
   * qui ne nécessitent pas d'agent
   */
  private handleInlineExecution(
    nodeType: string,
    config: Record<string, unknown>,
    inputData: Record<string, unknown>
  ): unknown | null {
    switch (nodeType) {
      case 'set': {
        const result = { ...inputData };
        const key = typeof config.key === 'string' ? config.key : undefined;
        if (key && config.value !== undefined) {
          result[key] = config.value;
        }
        return result;
      }
      
      case 'get': {
        const key = typeof config.key === 'string' ? config.key : undefined;
        return key ? inputData[key] : inputData;
      }
      
      case 'passthrough':
      case 'identity':
        return inputData;
      
      case 'merge': {
        const sources = config.sources as string[] | undefined;
        if (Array.isArray(sources)) {
          const merged: Record<string, unknown> = { ...inputData };
          for (const source of sources) {
            if (typeof source === 'string' && inputData[source]) {
              Object.assign(merged, inputData[source]);
            }
          }
          return merged;
        }
        return inputData;
      }
      
      case 'log': {
        console.log(`[Workflow Node Log] ${config.message || ''}`, inputData);
        return inputData;
      }
      
      default:
        return null; // Non géré en inline
    }
  }
  
  /**
   * Retourne la liste des types de nœuds supportés
   */
  getSupportedNodeTypes(): string[] {
    return Object.keys(NODE_TYPE_TO_AGENT);
  }
  
  /**
   * Retourne le mapping complet type → agent
   */
  getNodeTypeToAgentMapping(): Record<string, string> {
    return { ...NODE_TYPE_TO_AGENT };
  }
}

// Export singleton
export const workflowAgentFactory = WorkflowAgentFactory.getInstance();

export default WorkflowAgentFactory;
