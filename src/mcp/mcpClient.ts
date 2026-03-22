/**
 * MCP Client
 * JSON-RPC 2.0 client for Model Context Protocol servers.
 * Lisa can both serve MCP (existing LisaMcpServer) and consume MCP (this client).
 * Adapted from PromptCommander's MCP client.
 */

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  serverId: string;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string;
  result?: unknown;
  error?: { code: number; message: string };
}

function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), ms);
  return controller.signal;
}

export function validateMCPUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Protocole non supporté : ${parsed.protocol} (utilisez http ou https)`);
    }
  } catch (e) {
    if (e instanceof TypeError) throw new Error(`URL invalide : ${url}`);
    throw e;
  }
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function rpcCall(serverUrl: string, method: string, params?: Record<string, unknown>, timeoutMs = 10000): Promise<unknown> {
  const req: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: generateId(),
    method,
    params,
  };

  const response = await fetch(serverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal: createTimeoutSignal(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Erreur serveur MCP : ${response.status}`);
  }

  const data = await response.json() as JsonRpcResponse;
  if (data.error) {
    throw new Error(`Erreur MCP : ${data.error.message}`);
  }

  return data.result;
}

export async function initializeMCPServer(serverUrl: string): Promise<{ name: string; version: string }> {
  const result = await rpcCall(serverUrl, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'Lisa', version: '1.0.0' },
  }) as { serverInfo: { name: string; version: string } };

  // Send initialized notification
  await fetch(serverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  }).catch(() => {});

  return result.serverInfo;
}

export async function listMCPTools(serverUrl: string): Promise<Omit<MCPTool, 'serverId'>[]> {
  const result = await rpcCall(serverUrl, 'tools/list') as {
    tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>;
  };
  return (result.tools || []).map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
}

export async function callMCPTool(serverUrl: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await rpcCall(serverUrl, 'tools/call', {
    name: toolName,
    arguments: args,
  }, 30000) as { content: Array<{ type: string; text?: string }> };

  const texts = (result.content || [])
    .filter((c: { type: string }) => c.type === 'text')
    .map((c: { text?: string }) => c.text || '');

  return { success: true, result: texts.join('\n') };
}

export async function checkMCPServer(serverUrl: string): Promise<boolean> {
  try {
    await initializeMCPServer(serverUrl);
    return true;
  } catch {
    return false;
  }
}
