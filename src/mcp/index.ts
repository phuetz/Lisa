/**
 * MCP Module - Model Context Protocol integration
 * 
 * Point d'entrée pour l'intégration MCP de Lisa.
 * Expose les outils, le bridge, et les types pour l'interopérabilité
 * avec ChatGPT, Claude AI et autres LLMs.
 */

// Export du serveur MCP
export { LisaMcpServer, lisaMcpServer, type LisaTool } from './LisaMcpServer';

// Export du bridge service
export {
  aiBridgeService,
  type BridgeMessage,
  type BridgeSession,
  type BridgeConfig,
  type ToolCall,
  type ToolResult
} from './AIBridgeService';
export { default as AIBridgeService } from './AIBridgeService';

// Types utilitaires pour l'intégration
export interface MCPCapabilities {
  tools: boolean;
  resources: boolean;
  prompts: boolean;
  streaming: boolean;
}

export interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

// Configuration par défaut
export const DEFAULT_MCP_CONFIG = {
  serverName: 'lisa-mcp-server',
  version: '1.0.0',
  capabilities: {
    tools: true,
    resources: true,
    prompts: false,
    streaming: true
  } as MCPCapabilities
};

// Liste des outils disponibles (pour référence rapide)
export const AVAILABLE_TOOLS = [
  'lisa_chat',
  'lisa_vision_analyze',
  'lisa_calendar_query',
  'lisa_smart_home',
  'lisa_memory_store',
  'lisa_memory_recall',
  'lisa_workflow_execute',
  'lisa_agent_invoke',
  'lisa_system_status'
] as const;

export type LisaToolName = typeof AVAILABLE_TOOLS[number];

// Helper pour créer un client MCP
export function createMcpClient(baseUrl = 'http://localhost:3000/api/bridge') {
  return {
    async invoke(tool: LisaToolName, args: Record<string, unknown> = {}) {
      const response = await fetch(`${baseUrl}/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, arguments: args })
      });
      return response.json();
    },

    async chat(message: string, sessionId?: string) {
      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });
      return response.json();
    },

    async getTools() {
      const response = await fetch(`${baseUrl}/tools`);
      return response.json();
    },

    async getOpenAPISchema() {
      const response = await fetch(`${baseUrl}/openapi.json`);
      return response.json();
    }
  };
}
