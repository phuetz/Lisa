/**
 * Enhanced Agent Registry - Additional utilities for agent management
 * Provides categorization, priority preloading, and usage tracking
 *
 * Usage:
 *   import { agentCategories, preloadByCategory, getAgentsByDomain } from './registryEnhanced';
 */

import { agentRegistry } from './registry';
import type { BaseAgent, AgentDomain } from './types';

/* ---------- Agent Categories ---------- */
export const agentCategories = {
  /** Core agents loaded on startup */
  core: [
    'NLUAgent',
    'PlannerAgent',
    'MemoryAgent',
    'CoordinatorAgent',
  ],

  /** Vision and perception agents */
  vision: [
    'VisionAgent',
    'ImageAnalysisAgent',
    'OCRAgent',
  ],

  /** Audio and speech agents */
  audio: [
    'HearingAgent',
    'AudioAnalysisAgent',
    'SpeechSynthesisAgent',
  ],

  /** Workflow and automation agents */
  workflow: [
    'ConditionAgent',
    'DelayAgent',
    'ForEachAgent',
    'SetAgent',
    'TransformAgent',
    'TriggerAgent',
    'WorkflowCodeAgent',
    'WorkflowHTTPAgent',
    'UserWorkflowAgent',
    'AFlowOptimizerAgent',
    'WindsurfAgent',
  ],

  /** Code and development agents */
  development: [
    'CodeInterpreterAgent',
    'CodeReviewAgent',
    'GeminiCodeAgent',
    'GitHubAgent',
    'PowerShellAgent',
  ],

  /** Communication agents */
  communication: [
    'EmailAgent',
    'SmallTalkAgent',
    'TranslationAgent',
  ],

  /** Data and analysis agents */
  analysis: [
    'DataAnalysisAgent',
    'DataAnalystAgent',
    'ResearchAgent',
    'ContentGeneratorAgent',
    'CreativeMarketingAgent',
  ],

  /** Smart home and IoT agents */
  iot: [
    'SmartHomeAgent',
    'MQTTAgent',
    'RobotAgent',
    'RosAgent',
    'RosPublisherAgent',
  ],

  /** Utility agents */
  utility: [
    'CalendarAgent',
    'SchedulerAgent',
    'TodoAgent',
    'WeatherAgent',
    'WebContentReaderAgent',
    'WebSearchAgent',
  ],

  /** Security and validation agents */
  security: [
    'CriticAgent',
    'CriticAgentV2',
    'SecurityAgent',
  ],

  /** Health and assistance agents */
  health: [
    'HealthMonitorAgent',
    'ProactiveSuggestionsAgent',
    'PersonalizationAgent',
  ],

  /** AI CLI agents */
  aiCli: [
    'GeminiCliAgent',
    'GrokCliAgent',
    'LLMAgent',
  ],

  /** Specialized agents */
  specialized: [
    'ContextAgent',
    'KnowledgeGraphAgent',
    'MetaHumanAgent',
    'ScreenShareAgent',
    'SystemIntegrationAgent',
  ],
} as const;

export type AgentCategory = keyof typeof agentCategories;

/* ---------- Preload Functions ---------- */

/**
 * Preload agents by category
 */
export async function preloadByCategory(category: AgentCategory): Promise<BaseAgent[]> {
  const agentNames = agentCategories[category];
  const agents: BaseAgent[] = [];

  for (const name of agentNames) {
    try {
      const agent = await agentRegistry.getAgentAsync(name);
      if (agent) agents.push(agent);
    } catch (error) {
      console.warn(`Failed to preload agent ${name}:`, error);
    }
  }

  return agents;
}

/**
 * Preload multiple categories in parallel
 */
export async function preloadCategories(categories: AgentCategory[]): Promise<void> {
  await Promise.all(categories.map(cat => preloadByCategory(cat)));
}

/**
 * Preload core agents (recommended on app startup)
 */
export async function preloadCoreAgents(): Promise<void> {
  await preloadByCategory('core');
}

/**
 * Preload agents based on priority level
 * Priority 1: Core agents
 * Priority 2: Workflow + Utility
 * Priority 3: Everything else
 */
export async function preloadByPriority(maxPriority: 1 | 2 | 3 = 2): Promise<void> {
  // Priority 1: Core
  await preloadByCategory('core');

  if (maxPriority >= 2) {
    // Priority 2: Workflow + Utility (parallel)
    await Promise.all([
      preloadByCategory('workflow'),
      preloadByCategory('utility'),
    ]);
  }

  if (maxPriority >= 3) {
    // Priority 3: All others (parallel)
    const remainingCategories: AgentCategory[] = [
      'vision', 'audio', 'development', 'communication',
      'analysis', 'iot', 'security', 'health', 'aiCli', 'specialized'
    ];
    await preloadCategories(remainingCategories);
  }
}

/* ---------- Query Functions ---------- */

/**
 * Get agents by domain
 */
export function getAgentsByDomain(domain: AgentDomain): string[] {
  const domainToCategoryMap: Record<AgentDomain, AgentCategory[]> = {
    'vision': ['vision'],
    'audio': ['audio'],
    'workflow': ['workflow'],
    'communication': ['communication'],
    'integration': ['iot', 'specialized'],
    'analysis': ['analysis'],
    'utility': ['utility', 'health'],
    'custom': ['aiCli', 'development'],
    'ros': ['iot'],
    'security': ['security'],
  };

  const categories = domainToCategoryMap[domain] || [];
  return categories.flatMap(cat => [...agentCategories[cat]]);
}

/**
 * Get category for an agent
 */
export function getAgentCategory(agentName: string): AgentCategory | undefined {
  for (const [category, agents] of Object.entries(agentCategories)) {
    if ((agents as readonly string[]).includes(agentName)) {
      return category as AgentCategory;
    }
  }
  return undefined;
}

/**
 * Get all agent names in a flat list
 */
export function getAllAgentNames(): string[] {
  return Object.values(agentCategories).flat();
}

/**
 * Get loaded agents count by category
 */
export function getLoadedAgentStats(): Record<AgentCategory, { loaded: number; total: number }> {
  const loadedAgents = new Set(agentRegistry.getAllAgents().map(a => a.name));
  const stats: Record<string, { loaded: number; total: number }> = {};

  for (const [category, agents] of Object.entries(agentCategories)) {
    const loaded = agents.filter(name => loadedAgents.has(name)).length;
    stats[category] = { loaded, total: agents.length };
  }

  return stats as Record<AgentCategory, { loaded: number; total: number }>;
}

/* ---------- Usage Tracking ---------- */

/** Track agent usage timestamps for LRU management */
const agentUsageMap = new Map<string, number>();

/**
 * Record when an agent was used (for LRU tracking)
 */
export function recordAgentUsage(agentName: string): void {
  agentUsageMap.set(agentName, Date.now());
}

/**
 * Get least recently used agents (excludes core agents)
 * Useful for memory management decisions
 */
export function getLeastRecentlyUsedAgents(count: number): string[] {
  const loadedAgents = agentRegistry.getAllAgents();
  const coreAgentSet = new Set(agentCategories.core);

  // Filter out core agents and sort by usage time (oldest first)
  const nonCoreAgents = loadedAgents
    .filter(a => !coreAgentSet.has(a.name))
    .map(a => ({
      name: a.name,
      lastUsed: agentUsageMap.get(a.name) ?? 0,
    }))
    .sort((a, b) => a.lastUsed - b.lastUsed);

  return nonCoreAgents.slice(0, count).map(a => a.name);
}

/* ---------- Memory Stats ---------- */

/**
 * Get memory usage estimate (agents count)
 */
export function getAgentMemoryStats(): {
  loadedCount: number;
  availableCount: number;
  coreLoadedCount: number;
} {
  const loadedAgents = agentRegistry.getAllAgents();
  const loadedNames = new Set(loadedAgents.map(a => a.name));
  const coreAgentSet = new Set(agentCategories.core);

  return {
    loadedCount: loadedAgents.length,
    availableCount: agentRegistry.listAvailableAgentNames().length,
    coreLoadedCount: agentCategories.core.filter(name => loadedNames.has(name)).length,
  };
}

/* ---------- Batch Operations ---------- */

/**
 * Find agents that can handle a specific capability
 */
export async function findAgentsWithCapability(capability: string): Promise<BaseAgent[]> {
  const allNames = agentRegistry.listAvailableAgentNames();
  const matchingAgents: BaseAgent[] = [];

  for (const name of allNames) {
    const agent = await agentRegistry.getAgentAsync(name);
    if (agent?.capabilities?.includes(capability)) {
      matchingAgents.push(agent);
    }
  }

  return matchingAgents;
}
