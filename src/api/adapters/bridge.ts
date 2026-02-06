/**
 * Adaptateur pour les services MCP/Bridge
 * Découple l'API des imports MCP (src/mcp/)
 * Utilise des imports dynamiques avec fallback stub
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface IBridgeService {
  createSession(participants: string[]): any;
  getSession(sessionId: string): any | null;
  sendMessage(sessionId: string, content: string, source: string, target: string): Promise<any>;
  streamMessage(sessionId: string, content: string, source: string, target: string): AsyncGenerator<any>;
  getOpenAPISchema(): any;
}

export interface IMcpServer {
  getToolsAsOpenAIFunctions(): any[];
  getToolsAsAnthropicTools(): any[];
}

let _bridgeService: IBridgeService | null = null;
let _mcpServer: IMcpServer | null = null;

const STUB_BRIDGE: IBridgeService = {
  createSession: (_p: string[]) => ({
    id: 'stub-session',
    participants: _p,
    messages: [],
    context: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getSession: () => null,
  sendMessage: async () => ({
    content: 'Bridge service not available',
    source: 'system',
    timestamp: new Date().toISOString(),
  }),
  streamMessage: async function* () {
    yield { content: 'Bridge service not available', done: true };
  },
  getOpenAPISchema: () => ({ openapi: '3.1.0', info: { title: 'Lisa Bridge', version: '1.0.0' }, paths: {} }),
};

const STUB_MCP: IMcpServer = {
  getToolsAsOpenAIFunctions: () => [],
  getToolsAsAnthropicTools: () => [],
};

// Opaque paths — prevents TypeScript from resolving into src/mcp/
const BRIDGE_MODULE = '../../mcp/AIBridgeService.js';
const MCP_MODULE = '../../mcp/LisaMcpServer.js';

/**
 * Charge le service bridge de manière paresseuse
 */
export async function getBridgeService(): Promise<IBridgeService> {
  if (_bridgeService) return _bridgeService;
  try {
    const mod: any = await import(/* @vite-ignore */ BRIDGE_MODULE);
    _bridgeService = mod.aiBridgeService as IBridgeService;
    return _bridgeService;
  } catch {
    console.warn('[adapters/bridge] AI Bridge service not available, using stub');
    _bridgeService = STUB_BRIDGE;
    return _bridgeService;
  }
}

/**
 * Charge le serveur MCP de manière paresseuse
 */
export async function getMcpServer(): Promise<IMcpServer> {
  if (_mcpServer) return _mcpServer;
  try {
    const mod: any = await import(/* @vite-ignore */ MCP_MODULE);
    _mcpServer = mod.lisaMcpServer as IMcpServer;
    return _mcpServer;
  } catch {
    console.warn('[adapters/bridge] MCP server not available, using stub');
    _mcpServer = STUB_MCP;
    return _mcpServer;
  }
}
