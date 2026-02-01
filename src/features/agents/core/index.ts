/**
 * Agent Core - Central exports for agent system
 *
 * Usage:
 *   import { agentRegistry, agentCategories, preloadCoreAgents } from '../features/agents/core';
 */

// Main registry
export { agentRegistry } from './registry';

// Types
export type {
  BaseAgent,
  AgentExecuteProps,
  AgentExecuteResult,
  AgentDomain,
  AgentCapability,
} from './types';

export { AgentDomains } from './types';

// Enhanced registry utilities
export {
  agentCategories,
  type AgentCategory,
  // Preload functions
  preloadByCategory,
  preloadCategories,
  preloadCoreAgents,
  preloadByPriority,
  // Query functions
  getAgentsByDomain,
  getAgentCategory,
  getAllAgentNames,
  getLoadedAgentStats,
  // Memory management
  recordAgentUsage,
  getLeastRecentlyUsedAgents,
  getAgentMemoryStats,
  // Batch operations
  findAgentsWithCapability,
} from './registryEnhanced';
