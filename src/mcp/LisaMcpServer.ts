/**
 * Lisa MCP Server - Model Context Protocol Server
 * 
 * Expose les capacités de Lisa via le protocole MCP pour permettre
 * l'interopérabilité avec ChatGPT, Claude AI et d'autres LLMs.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  type Tool,
  type Resource,
} from '@modelcontextprotocol/sdk/types.js';
import { mcpToolHandlers } from './McpToolHandlers';

// Types pour les outils Lisa
export interface LisaTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, object>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

// Outils exposés par Lisa
const LISA_TOOLS: LisaTool[] = [
  {
    name: 'lisa_chat',
    description: 'Envoyer un message à Lisa et recevoir une réponse contextuelle',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Le message à envoyer à Lisa' },
        context: { type: 'string', description: 'Contexte additionnel (optionnel)' },
        language: { type: 'string', description: 'Langue de réponse (fr, en, etc.)' }
      },
      required: ['message']
    },
    handler: async (args) => {
      const result = await mcpToolHandlers.lisa_chat(args as { message: string; context?: string; language?: string });
      return result.data || { error: result.error };
    }
  },
  {
    name: 'lisa_vision_analyze',
    description: 'Analyser une image avec la vision de Lisa',
    inputSchema: {
      type: 'object',
      properties: {
        image: { type: 'string', description: 'Image en base64 ou URL' },
        prompt: { type: 'string', description: 'Question ou instruction pour l\'analyse' }
      },
      required: ['image']
    },
    handler: async (args) => {
      const result = await mcpToolHandlers.lisa_vision_analyze(args as { image: string; prompt?: string });
      return result.data || { error: result.error };
    }
  },
  {
    name: 'lisa_calendar_query',
    description: 'Interroger le calendrier de Lisa',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'create', 'update', 'delete'], description: 'Action à effectuer' },
        date: { type: 'string', description: 'Date au format ISO' },
        title: { type: 'string', description: 'Titre de l\'événement' },
        description: { type: 'string', description: 'Description de l\'événement' }
      },
      required: ['action']
    },
    handler: async (args) => {
      const result = await mcpToolHandlers.lisa_calendar_query(args as { action: 'list' | 'create' | 'update' | 'delete'; date?: string; title?: string; description?: string; eventId?: string });
      return result.data || { error: result.error };
    }
  },
  {
    name: 'lisa_smart_home',
    description: 'Contrôler les appareils domotiques via Lisa',
    inputSchema: {
      type: 'object',
      properties: {
        device: { type: 'string', description: 'Nom ou ID de l\'appareil' },
        action: { type: 'string', enum: ['on', 'off', 'toggle', 'set', 'status'], description: 'Action' },
        value: { type: 'number', description: 'Valeur (pour set)' }
      },
      required: ['device', 'action']
    },
    handler: async (args) => {
      const result = await mcpToolHandlers.lisa_smart_home(args as { device: string; action: 'on' | 'off' | 'toggle' | 'set' | 'status'; value?: number });
      return result.data || { error: result.error };
    }
  },
  {
    name: 'lisa_memory_store',
    description: 'Stocker une information dans la mémoire de Lisa',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé de stockage' },
        value: { type: 'string', description: 'Valeur à stocker' },
        category: { type: 'string', description: 'Catégorie (preference, fact, context)' }
      },
      required: ['key', 'value']
    },
    handler: async (args) => {
      const result = await mcpToolHandlers.lisa_memory_store(args as { key: string; value: string; category?: 'preference' | 'fact' | 'context' });
      return result.data || { error: result.error };
    }
  },
  {
    name: 'lisa_memory_recall',
    description: 'Rappeler une information de la mémoire de Lisa',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé à rechercher' },
        category: { type: 'string', description: 'Catégorie à filtrer' },
        semantic_query: { type: 'string', description: 'Recherche sémantique' }
      }
    },
    handler: async (args) => {
      const result = await mcpToolHandlers.lisa_memory_recall(args as { key?: string; category?: string; semantic_query?: string });
      return result.data || { error: result.error };
    }
  },
  {
    name: 'lisa_workflow_execute',
    description: 'Exécuter un workflow Lisa prédéfini',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'ID du workflow' },
        workflow_name: { type: 'string', description: 'Nom du workflow' },
        parameters: { type: 'object', description: 'Paramètres du workflow' }
      }
    },
    handler: async (args) => {
      const result = await mcpToolHandlers.lisa_workflow_execute(args as { workflow_id?: string; workflow_name?: string; parameters?: Record<string, unknown> });
      return result.data || { error: result.error };
    }
  },
  {
    name: 'lisa_agent_invoke',
    description: 'Invoquer un agent spécifique de Lisa',
    inputSchema: {
      type: 'object',
      properties: {
        agent: { 
          type: 'string', 
          description: 'Nom de l\'agent (planner, critic, memory, vision, hearing, etc.)' 
        },
        input: { type: 'string', description: 'Entrée pour l\'agent' },
        options: { type: 'object', description: 'Options supplémentaires' }
      },
      required: ['agent', 'input']
    },
    handler: async (args) => {
      const result = await mcpToolHandlers.lisa_agent_invoke(args as { agent: string; input: string; options?: Record<string, unknown> });
      return result.data || { error: result.error };
    }
  },
  {
    name: 'lisa_system_status',
    description: 'Obtenir le statut système de Lisa',
    inputSchema: {
      type: 'object',
      properties: {
        components: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Composants à vérifier (all, agents, services, memory, etc.)' 
        }
      }
    },
    handler: async (args) => {
      const result = await mcpToolHandlers.lisa_system_status(args as { components?: string[] });
      return result.data || { error: result.error };
    }
  }
];

// Ressources exposées par Lisa
const LISA_RESOURCES: Resource[] = [
  {
    uri: 'lisa://agents/list',
    name: 'Liste des agents Lisa',
    description: 'Tous les agents disponibles dans Lisa',
    mimeType: 'application/json'
  },
  {
    uri: 'lisa://memory/context',
    name: 'Contexte mémoire',
    description: 'Contexte actuel de la mémoire de Lisa',
    mimeType: 'application/json'
  },
  {
    uri: 'lisa://workflows/templates',
    name: 'Templates de workflows',
    description: 'Templates de workflows disponibles',
    mimeType: 'application/json'
  },
  {
    uri: 'lisa://config/capabilities',
    name: 'Capacités de Lisa',
    description: 'Configuration et capacités actuelles',
    mimeType: 'application/json'
  }
];

export class LisaMcpServer {
  private server: Server;
  private toolHandlers: Map<string, LisaTool['handler']>;

  constructor() {
    this.server = new Server(
      {
        name: 'lisa-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.toolHandlers = new Map();
    LISA_TOOLS.forEach(tool => {
      this.toolHandlers.set(tool.name, tool.handler);
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Liste des outils disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = LISA_TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
      return { tools };
    });

    // Appel d'un outil
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const handler = this.toolHandlers.get(name);

      if (!handler) {
        throw new Error(`Outil inconnu: ${name}`);
      }

      try {
        const result = await handler(args || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: (error as Error).message }),
            },
          ],
          isError: true,
        };
      }
    });

    // Liste des ressources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: LISA_RESOURCES };
    });

    // Lecture d'une ressource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      let content: unknown;

      switch (uri) {
        case 'lisa://agents/list':
          content = {
            agents: LISA_TOOLS.filter(t => t.name.includes('agent')).map(t => t.name),
            total: 47
          };
          break;
        case 'lisa://memory/context':
          content = { context: 'current', memories: [] };
          break;
        case 'lisa://workflows/templates':
          content = { templates: [] };
          break;
        case 'lisa://config/capabilities':
          content = {
            vision: true,
            hearing: true,
            speech: true,
            memory: true,
            workflows: true,
            smartHome: true,
            calendar: true
          };
          break;
        default:
          throw new Error(`Ressource inconnue: ${uri}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(content, null, 2),
          },
        ],
      };
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Lisa MCP Server démarré');
  }

  // Méthode pour ajouter dynamiquement des outils
  addTool(tool: LisaTool): void {
    LISA_TOOLS.push(tool);
    this.toolHandlers.set(tool.name, tool.handler);
  }

  // Obtenir les outils pour l'export vers GPT Actions
  getToolsAsOpenAIFunctions(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: LisaTool['inputSchema'];
    };
  }> {
    return LISA_TOOLS.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  // Obtenir les outils pour Claude
  getToolsAsAnthropicTools(): Array<{
    name: string;
    description: string;
    input_schema: LisaTool['inputSchema'];
  }> {
    return LISA_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }
}

// Export singleton
export const lisaMcpServer = new LisaMcpServer();

// Point d'entrée pour exécution standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  lisaMcpServer.start().catch(console.error);
}
