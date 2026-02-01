import { z } from 'zod';

/**
 * Agent Domains
 */
export const AgentDomains = {
  KNOWLEDGE: "knowledge",
  PRODUCTIVITY: "productivity",
  ANALYSIS: "analysis",
  INTEGRATION: "integration",
  PLANNING: "planning"
} as const;

export type AgentDomain = typeof AgentDomains[keyof typeof AgentDomains];

/**
 * Context provided to an agent during execution.
 * This replaces direct store access.
 */
export interface AgentContext {
  /** User preferences and settings */
  preferences: Record<string, unknown>;
  
  /** Access to current sensory state */
  percepts: Record<string, unknown>;
  
  /** Capability to store short-term memories */
  storeMemory: (content: string, metadata?: Record<string, unknown>) => Promise<void>;
  
  /** Capability to emit events or logs */
  emit: (event: string, data: unknown) => void;
  
  /** Current language */
  language: string;
}

export interface AgentExecuteProps {
  intent?: string;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AgentExecuteResult {
  success: boolean;
  output: unknown;
  error?: string;
  metadata?: {
    executionTime?: number;
    confidence?: number;
  };
}

/**
 * The Contract for Lisa Agents
 */
export interface Agent {
  name: string;
  description: string;
  version: string;
  domain: AgentDomain;
  
  /** Zod schema for configuration validation */
  configSchema?: z.ZodObject<z.ZodRawShape>;

  /** Main execution method */
  execute(props: AgentExecuteProps, context: AgentContext): Promise<AgentExecuteResult>;
  
  /** Optional capability check */
  canHandle?(query: string): Promise<number>;
}
