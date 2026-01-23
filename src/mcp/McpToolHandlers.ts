/**
 * MCP Tool Handlers - Implémentation réelle des outils MCP
 * 
 * Connecte les outils MCP aux vrais agents et services de Lisa.
 */

import { agentRegistry } from '../features/agents/core/registry';
import { memoryService } from '../services/MemoryService';
import { smartHomeService } from '../services/SmartHomeService';
import { workflowService } from '../services/WorkflowService';
import type { Memory } from '../services/MemoryService';
import type { SmartDevice } from '../services/SmartHomeService';
import type { WorkflowDefinition } from '../services/WorkflowService';
import { aiService } from '../services/aiService';

// Types
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Handler pour lisa_chat - Conversation avec Lisa via AI
 */
export async function handleChat(args: {
  message: string;
  context?: string;
  language?: string;
}): Promise<ToolResult> {
  try {
    const { message, context, language } = args;
    
    // Construire le prompt système
    const systemPrompt = `Tu es Lisa, une assistante IA bienveillante et serviable.
${context ? `Contexte: ${context}` : ''}
${language ? `Réponds en ${language}.` : 'Réponds en français.'}
Sois concise, précise et amicale.`;

    // Appeler le service AI
    const response = await aiService.sendMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ]);

    return {
      success: true,
      data: {
        response,
        context: context || 'default',
        language: language || 'fr'
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Handler pour lisa_vision_analyze - Analyse d'image via VisionAgent
 */
export async function handleVisionAnalyze(args: {
  image: string;
  prompt?: string;
}): Promise<ToolResult> {
  try {
    const { image, prompt } = args;
    
    // Charger l'agent Vision
    const visionAgent = await agentRegistry.getAgentAsync('VisionAgent');
    
    if (!visionAgent) {
      // Fallback: utiliser le service AI avec vision
      const response = await aiService.sendMessage([
        { role: 'system', content: 'Tu es un expert en analyse d\'images. Décris ce que tu vois.' },
        { 
          role: 'user', 
          content: prompt || 'Décris cette image en détail.',
          image: image
        }
      ]);

      return {
        success: true,
        data: {
          analysis: response,
          method: 'ai_vision',
          prompt: prompt || 'Description générale'
        },
        timestamp: new Date().toISOString()
      };
    }

    // Utiliser VisionAgent
    const result = await visionAgent.execute({
      intent: 'analyze',
      input: prompt || 'Analyse cette image',
      context: { image }
    });

    return {
      success: result.success,
      data: result.output,
      error: typeof result.error === 'string' ? result.error : result.error?.message,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Handler pour lisa_calendar_query - Gestion du calendrier via CalendarAgent
 */
export async function handleCalendarQuery(args: {
  action: 'list' | 'create' | 'update' | 'delete';
  date?: string;
  title?: string;
  description?: string;
  eventId?: string;
}): Promise<ToolResult> {
  try {
    const { action, date, title, description, eventId } = args;
    
    // Charger l'agent Calendrier
    const calendarAgent = await agentRegistry.getAgentAsync('CalendarAgent');
    
    if (!calendarAgent) {
      return {
        success: false,
        error: 'CalendarAgent non disponible',
        timestamp: new Date().toISOString()
      };
    }

    let intent: string;
    let params: Record<string, unknown> = {};

    switch (action) {
      case 'list':
        intent = 'list_events';
        params = { period: date ? 'custom' : 'today', startDate: date };
        break;
      case 'create':
        intent = 'create_event';
        params = {
          summary: title || 'Nouvel événement',
          description,
          start: { dateTime: date || new Date().toISOString() },
          end: { dateTime: date ? new Date(new Date(date).getTime() + 3600000).toISOString() : new Date(Date.now() + 3600000).toISOString() }
        };
        break;
      case 'update':
        intent = 'update_event';
        params = { eventId, eventData: { summary: title, description } };
        break;
      case 'delete':
        intent = 'delete_event';
        params = { eventId };
        break;
      default:
        return {
          success: false,
          error: `Action non supportée: ${action}`,
          timestamp: new Date().toISOString()
        };
    }

    const result = await calendarAgent.execute({
      intent,
      input: JSON.stringify(params),
      context: params
    });

    return {
      success: result.success,
      data: {
        action,
        ...result.output as object
      },
      error: typeof result.error === 'string' ? result.error : result.error?.message,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Handler pour lisa_smart_home - Contrôle domotique via SmartHomeAgent
 */
export async function handleSmartHome(args: {
  device: string;
  action: 'on' | 'off' | 'toggle' | 'set' | 'status';
  value?: number;
}): Promise<ToolResult> {
  try {
    const { device, action, value } = args;
    
    // Essayer d'abord via SmartHomeAgent
    const smartHomeAgent = await agentRegistry.getAgentAsync('SmartHomeAgent');
    
    if (smartHomeAgent) {
      const result = await smartHomeAgent.execute({
        intent: action === 'status' ? 'get_device_status' : 'control_device',
        input: device,
        context: { action, value }
      });

      return {
        success: result.success,
        data: {
          device,
          action,
          value,
          result: result.output
        },
        error: typeof result.error === 'string' ? result.error : result.error?.message,
        timestamp: new Date().toISOString()
      };
    }

    // Fallback: utiliser smartHomeService directement
    let resultData: unknown;
    let success = false;
    
    switch (action) {
      case 'status': {
        // Chercher l'appareil dans la liste
        const devices = smartHomeService.getAllDevices();
        const foundDevice = devices.find((d: SmartDevice) => d.id === device || d.name === device);
        resultData = foundDevice ? foundDevice.state : { error: 'Appareil non trouvé' };
        success = !!foundDevice;
        break;
      }
      case 'on':
      case 'off':
      case 'toggle':
        success = await smartHomeService.controlDevice(device, action);
        resultData = { action, success };
        break;
      case 'set':
        success = await smartHomeService.controlDevice(device, 'set', value || 0);
        resultData = { action, value, success };
        break;
    }

    return {
      success: true,
      data: {
        device,
        action,
        value,
        result: resultData
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Handler pour lisa_memory_store - Stockage en mémoire via MemoryAgent
 */
export async function handleMemoryStore(args: {
  key: string;
  value: string;
  category?: 'preference' | 'fact' | 'context';
}): Promise<ToolResult> {
  try {
    const { key, value, category } = args;
    
    // Essayer via MemoryAgent
    const memoryAgent = await agentRegistry.getAgentAsync('MemoryAgent');
    
    if (memoryAgent) {
      const result = await memoryAgent.execute({
        intent: 'store',
        input: value,
        context: { key, category: category || 'fact' }
      });

      return {
        success: result.success,
        data: {
          stored: true,
          key,
          value,
          category: category || 'fact',
          memoryId: (result.output as { id?: string })?.id
        },
        error: typeof result.error === 'string' ? result.error : result.error?.message,
        timestamp: new Date().toISOString()
      };
    }

    // Fallback: utiliser MemoryService
    const memory = memoryService.createMemory(
      category || 'fact',
      `${key}: ${value}`,
      'mcp_bridge',
      [key, category || 'fact']
    );

    return {
      success: true,
      data: {
        stored: true,
        key,
        value,
        category: category || 'fact',
        memoryId: memory.id
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Handler pour lisa_memory_recall - Rappel de mémoire via MemoryAgent
 */
export async function handleMemoryRecall(args: {
  key?: string;
  category?: string;
  semantic_query?: string;
}): Promise<ToolResult> {
  try {
    const { key, category, semantic_query } = args;
    
    // Essayer via MemoryAgent
    const memoryAgent = await agentRegistry.getAgentAsync('MemoryAgent');
    
    if (memoryAgent) {
      const result = await memoryAgent.execute({
        intent: 'recall',
        input: semantic_query || key || '',
        context: { key, category }
      });

      return {
        success: result.success,
        data: {
          found: true,
          results: result.output,
          query: { key, category, semantic_query }
        },
        error: typeof result.error === 'string' ? result.error : result.error?.message,
        timestamp: new Date().toISOString()
      };
    }

    // Fallback: utiliser MemoryService
    const query = semantic_query || key || '';
    const memories = memoryService.getRelevantMemories(query, 10);
    
    // Filtrer par catégorie si spécifiée
    const filtered = category 
      ? memories.filter((m: Memory) => m.type === category)
      : memories;

    return {
      success: true,
      data: {
        found: filtered.length > 0,
        results: filtered,
        query: { key, category, semantic_query }
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Handler pour lisa_workflow_execute - Exécution de workflow
 */
export async function handleWorkflowExecute(args: {
  workflow_id?: string;
  workflow_name?: string;
  parameters?: Record<string, unknown>;
}): Promise<ToolResult> {
  try {
    const { workflow_id, workflow_name, parameters } = args;
    
    // Utiliser WorkflowService
    let execution;
    
    if (workflow_id) {
      execution = await workflowService.executeWorkflow(workflow_id);
    } else if (workflow_name) {
      // Chercher le workflow par nom
      const workflows = workflowService.listWorkflows();
      const workflow = workflows.find((w: WorkflowDefinition) => w.name === workflow_name);
      
      if (workflow) {
        execution = await workflowService.executeWorkflow(workflow.id);
      } else {
        return {
          success: false,
          error: `Workflow "${workflow_name}" non trouvé`,
          timestamp: new Date().toISOString()
        };
      }
    } else {
      return {
        success: false,
        error: 'workflow_id ou workflow_name requis',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: execution?.status === 'success',
      data: {
        executed: true,
        workflow_id: workflow_id || execution?.workflowId,
        workflow_name,
        parameters,
        execution
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Handler pour lisa_agent_invoke - Invocation d'agent générique
 */
export async function handleAgentInvoke(args: {
  agent: string;
  input: string;
  options?: Record<string, unknown>;
}): Promise<ToolResult> {
  try {
    const { agent, input, options } = args;
    
    // Normaliser le nom de l'agent
    const agentName = agent.endsWith('Agent') ? agent : `${agent}Agent`;
    const capitalizedName = agentName.charAt(0).toUpperCase() + agentName.slice(1);
    
    // Charger l'agent
    const agentInstance = await agentRegistry.getAgentAsync(capitalizedName);
    
    if (!agentInstance) {
      // Essayer sans "Agent" suffix
      const alternativeName = agent.charAt(0).toUpperCase() + agent.slice(1) + 'Agent';
      const altAgent = await agentRegistry.getAgentAsync(alternativeName);
      
      if (!altAgent) {
        return {
          success: false,
          error: `Agent "${agent}" non trouvé. Agents disponibles: ${agentRegistry.listAvailableAgentNames().join(', ')}`,
          timestamp: new Date().toISOString()
        };
      }
      
      const result = await altAgent.execute({
        intent: options?.intent as string || 'execute',
        input,
        context: options
      });

      return {
        success: result.success,
        data: {
          agent: alternativeName,
          input,
          output: result.output
        },
        error: typeof result.error === 'string' ? result.error : result.error?.message,
        timestamp: new Date().toISOString()
      };
    }

    // Exécuter l'agent
    const result = await agentInstance.execute({
      intent: options?.intent as string || 'execute',
      input,
      context: options
    });

    return {
      success: result.success,
      data: {
        agent: capitalizedName,
        input,
        output: result.output
      },
      error: typeof result.error === 'string' ? result.error : result.error?.message,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Handler pour lisa_system_status - Statut système
 */
export async function handleSystemStatus(args: {
  components?: string[];
}): Promise<ToolResult> {
  try {
    const { components } = args;
    const requestedComponents = components || ['all'];
    
    const status: Record<string, unknown> = {
      status: 'healthy',
      uptime: typeof process !== 'undefined' ? process.uptime() : 0,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    // Agents
    if (requestedComponents.includes('all') || requestedComponents.includes('agents')) {
      const availableAgents = agentRegistry.listAvailableAgentNames();
      const loadedAgents = agentRegistry.getAllAgents();
      
      status.agents = {
        available: availableAgents.length,
        loaded: loadedAgents.length,
        list: availableAgents
      };
    }

    // Memory
    if (requestedComponents.includes('all') || requestedComponents.includes('memory')) {
      try {
        const memoryStats = memoryService.getStats();
        status.memory = memoryStats;
      } catch {
        status.memory = { error: 'Service non disponible' };
      }
    }

    // Smart Home
    if (requestedComponents.includes('all') || requestedComponents.includes('smarthome')) {
      try {
        const devices = smartHomeService.getAllDevices();
        status.smarthome = {
          devices: devices.length,
          online: devices.filter((d: SmartDevice) => d.status === 'online').length
        };
      } catch {
        status.smarthome = { error: 'Service non disponible' };
      }
    }

    // Workflows
    if (requestedComponents.includes('all') || requestedComponents.includes('workflows')) {
      try {
        const workflows = workflowService.listWorkflows();
        status.workflows = {
          total: workflows.length,
          active: workflows.filter((w: WorkflowDefinition) => w.parallel).length
        };
      } catch {
        status.workflows = { error: 'Service non disponible' };
      }
    }

    return {
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Export tous les handlers
 */
export const mcpToolHandlers = {
  lisa_chat: handleChat,
  lisa_vision_analyze: handleVisionAnalyze,
  lisa_calendar_query: handleCalendarQuery,
  lisa_smart_home: handleSmartHome,
  lisa_memory_store: handleMemoryStore,
  lisa_memory_recall: handleMemoryRecall,
  lisa_workflow_execute: handleWorkflowExecute,
  lisa_agent_invoke: handleAgentInvoke,
  lisa_system_status: handleSystemStatus
};

export default mcpToolHandlers;
