/**
 * Adaptateur pour le registre d'agents
 * Découple l'API du code frontend (features/agents/)
 * Utilise un import dynamique avec fallback stub
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AgentInfo {
  name: string;
  description: string;
  version: string;
  domain: string;
  capabilities: string[];
}

export interface AgentExecuteResult {
  success: boolean;
  output: any;
  error?: string;
}

export interface IAgentRegistry {
  getAgentAsync(name: string): Promise<any | null>;
  execute(name: string, props: any): Promise<AgentExecuteResult>;
  getAvailableAgents(): string[];
  getAllAgentsWithStats(): any[];
}

let _registry: IAgentRegistry | null = null;

const STUB_REGISTRY: IAgentRegistry = {
  getAgentAsync: async () => null,
  execute: async (_name: string) => ({
    success: false,
    output: 'Agent registry not available',
  }),
  getAvailableAgents: () => [],
  getAllAgentsWithStats: () => [],
};

// Opaque path — prevents TypeScript from resolving into src/features/
const REGISTRY_MODULE = '../../features/agents/core/registry.js';

/**
 * Charge le registre d'agents de manière paresseuse
 */
async function loadRegistry(): Promise<IAgentRegistry> {
  if (_registry) return _registry;
  try {
    const mod: any = await import(/* @vite-ignore */ REGISTRY_MODULE);
    _registry = mod.agentRegistry as IAgentRegistry;
    return _registry;
  } catch {
    console.warn('[adapters/agents] Agent registry not available, using stub');
    _registry = STUB_REGISTRY;
    return _registry;
  }
}

/**
 * Proxy paresseux vers le registre d'agents
 */
export const agentRegistry: IAgentRegistry = {
  async getAgentAsync(name: string) {
    const reg = await loadRegistry();
    return reg.getAgentAsync(name);
  },
  async execute(name: string, props: any) {
    const reg = await loadRegistry();
    return reg.execute(name, props);
  },
  getAvailableAgents() {
    // Synchrone — retourne [] si pas encore chargé
    return _registry?.getAvailableAgents() ?? [];
  },
  getAllAgentsWithStats() {
    return _registry?.getAllAgentsWithStats() ?? [];
  },
};
