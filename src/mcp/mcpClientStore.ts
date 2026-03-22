/**
 * MCP Client Store
 * Manages MCP server connections and discovered tools.
 * Persists server config in localStorage.
 */

import { create } from 'zustand';
import type { MCPServerConfig, MCPTool } from './mcpClient';
import { validateMCPUrl, initializeMCPServer, listMCPTools, callMCPTool, checkMCPServer } from './mcpClient';

const STORAGE_KEY = 'lisa_mcp_servers';

interface MCPClientState {
  servers: MCPServerConfig[];
  tools: MCPTool[];
  loading: boolean;

  loadServers: () => void;
  addServer: (name: string, url: string) => Promise<void>;
  removeServer: (id: string) => void;
  toggleServer: (id: string) => Promise<void>;
  refreshTools: () => Promise<void>;
  executeTool: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
}

export const useMCPClientStore = create<MCPClientState>((set, get) => ({
  servers: [],
  tools: [],
  loading: false,

  loadServers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const servers = JSON.parse(raw) as MCPServerConfig[];
        set({ servers });
      }
    } catch (error) {
      console.error('[MCP] Failed to load servers:', error);
    }
  },

  async addServer(name: string, url: string) {
    validateMCPUrl(url);

    const id = `mcp-${Date.now().toString(36)}`;
    const isReachable = await checkMCPServer(url);

    const server: MCPServerConfig = {
      id,
      name,
      url,
      enabled: isReachable,
    };

    set(state => {
      const servers = [...state.servers, server];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
      return { servers };
    });

    if (isReachable) {
      await get().refreshTools();
    }
  },

  removeServer(id: string) {
    set(state => {
      const servers = state.servers.filter(s => s.id !== id);
      const tools = state.tools.filter(t => t.serverId !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
      return { servers, tools };
    });
  },

  async toggleServer(id: string) {
    const server = get().servers.find(s => s.id === id);
    if (!server) return;

    const newEnabled = !server.enabled;

    // If enabling, check reachability first
    if (newEnabled) {
      const isReachable = await checkMCPServer(server.url);
      if (!isReachable) {
        console.warn(`[MCP] Server ${server.name} is not reachable`);
        return;
      }
    }

    set(state => {
      const servers = state.servers.map(s =>
        s.id === id ? { ...s, enabled: newEnabled } : s
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));

      // Remove tools from disabled servers
      const tools = newEnabled
        ? state.tools
        : state.tools.filter(t => t.serverId !== id);

      return { servers, tools };
    });

    if (newEnabled) {
      await get().refreshTools();
    }
  },

  async refreshTools() {
    const { servers } = get();
    const enabledServers = servers.filter(s => s.enabled);
    if (enabledServers.length === 0) {
      set({ tools: [] });
      return;
    }

    set({ loading: true });

    const allTools: MCPTool[] = [];

    for (const server of enabledServers) {
      try {
        await initializeMCPServer(server.url);
        const tools = await listMCPTools(server.url);
        allTools.push(...tools.map(t => ({ ...t, serverId: server.id })));
      } catch (error) {
        console.warn(`[MCP] Failed to list tools from ${server.name}:`, error);
      }
    }

    set({ tools: allTools, loading: false });
  },

  async executeTool(toolName: string, args: Record<string, unknown>) {
    const tool = get().tools.find(t => t.name === toolName);
    if (!tool) throw new Error(`Outil MCP inconnu : ${toolName}`);

    const server = get().servers.find(s => s.id === tool.serverId);
    if (!server) throw new Error(`Serveur MCP introuvable pour l'outil : ${toolName}`);

    return callMCPTool(server.url, toolName, args);
  },
}));
