/**
 * The central registry for all agents in the system.
 * This follows the Singleton pattern to ensure only one instance exists.
 *
 * Enhanced with lazy loading support for improved performance.
 */
import type { BaseAgent } from './types.js';
import { LazyAgentLoader } from '../utils/lazyAgent';
import { featureFlags } from '../utils/featureFlags';
import { logInfo, logWarn } from '../utils/logger';
import { analytics } from '../utils/agentAnalytics';

// Eager imports (only for essential agents if lazy loading is disabled)
import { RobotAgent } from './RobotAgent';
import { TriggerAgent } from './TriggerAgent';
import { TransformAgent } from './TransformAgent';
import { ConditionAgent } from './ConditionAgent';
import { DelayAgent } from './DelayAgent';
import { WorkflowHTTPAgent } from './WorkflowHTTPAgent';
import { WorkflowCodeAgent } from './WorkflowCodeAgent';
import { RosAgent } from './RosAgent';

class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseAgent> = new Map();
  private lastAccess: Map<string, number> = new Map();
  private maxAgents = 50;
  private lazyLoader: LazyAgentLoader | null = null;

  // Private constructor to prevent direct instantiation.
  private constructor() {
    // Initialize lazy loader if feature flag is enabled
    if (featureFlags.isEnabled('lazy-loading')) {
      this.lazyLoader = new LazyAgentLoader();
      logInfo('Agent registry initialized with lazy loading', 'AgentRegistry');
    } else {
      logInfo('Agent registry initialized with eager loading', 'AgentRegistry');
    }
  }

  /**
   * Returns the singleton instance of the registry.
   */
  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Registers a new agent in the registry.
   * Throws an error if an agent with the same name is already registered.
   * @param agent - The agent instance to register.
   */
  public register(agent: BaseAgent): void {
    if (this.agents.has(agent.name)) {
      console.warn(`Agent with name "${agent.name}" is already registered.`);
      return;
    }
    if (this.agents.size >= this.maxAgents) {
      this.cleanupOldAgents();
    }
    this.agents.set(agent.name, agent);
    this.lastAccess.set(agent.name, Date.now());
  }

  /**
   * Retrieves an agent by its unique name.
   * Supports lazy loading - will load the agent on-demand if not already loaded.
   * @param name - The name of the agent to retrieve.
   * @returns The agent instance, or undefined if not found.
   */
  public async getAgent(name: string): Promise<BaseAgent | undefined> {
    // Check if agent is already loaded
    let agent = this.agents.get(name);

    // If not loaded and lazy loading is enabled, try to load it
    if (!agent && this.lazyLoader) {
      try {
        logInfo(`Lazy loading agent: ${name}`, 'AgentRegistry');
        agent = await this.lazyLoader.loadAgent(name);
        if (agent) {
          this.register(agent);
          logInfo(`Successfully lazy loaded agent: ${name}`, 'AgentRegistry');
        }
      } catch (error) {
        logWarn(`Failed to lazy load agent: ${name}`, 'AgentRegistry', error);
      }
    }

    if (agent) {
      this.lastAccess.set(name, Date.now());

      // Track agent access in analytics
      if (featureFlags.isEnabled('analytics')) {
        analytics.trackExecution(name, 0, true); // 0ms for access, success
      }
    }

    return agent;
  }

  /**
   * Synchronous version of getAgent for backward compatibility.
   * Will only return already-loaded agents.
   * @param name - The name of the agent to retrieve.
   * @returns The agent instance, or undefined if not loaded.
   * @deprecated Use getAgent() instead for lazy loading support
   */
  public getAgentSync(name: string): BaseAgent | undefined {
    const agent = this.agents.get(name);
    if (agent) {
      this.lastAccess.set(name, Date.now());
    }
    return agent;
  }

  /**
   * Returns an array of all registered agents.
   */
  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Returns a list of all registered agents.
   */
  public listAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Removes the least recently accessed agents when maximum capacity is reached.
   */
  private cleanupOldAgents(): void {
    const sorted = Array.from(this.lastAccess.entries()).sort((a, b) => a[1] - b[1]);
    const toRemove = Math.floor(this.maxAgents * 0.1);
    for (let i = 0; i < toRemove && i < sorted.length; i++) {
      const [name] = sorted[i];
      this.agents.delete(name);
      this.lastAccess.delete(name);
    }
  }

  /**
   * Preload commonly used agents to improve initial load performance.
   * Only works when lazy loading is enabled.
   * @param category - Optional category to preload (e.g., 'productivity', 'communication')
   */
  public async preloadAgents(category?: string): Promise<void> {
    if (!this.lazyLoader) {
      logWarn('Preload called but lazy loading is not enabled', 'AgentRegistry');
      return;
    }

    try {
      await this.lazyLoader.preloadCategory(category || 'productivity');
      logInfo(`Preloaded agents for category: ${category || 'productivity'}`, 'AgentRegistry');
    } catch (error) {
      logWarn(`Failed to preload agents for category: ${category}`, 'AgentRegistry', error);
    }
  }

  /**
   * Get agent loading statistics (useful for monitoring)
   */
  public getStats() {
    return {
      totalLoaded: this.agents.size,
      maxCapacity: this.maxAgents,
      loadPercentage: (this.agents.size / this.maxAgents) * 100,
      agentNames: Array.from(this.agents.keys()),
    };
  }
}

// Export a single instance of the registry for use throughout the application.
export const agentRegistry = AgentRegistry.getInstance();

// Register essential agents immediately only if lazy loading is disabled
// With lazy loading enabled, agents are loaded on-demand
if (!featureFlags.isEnabled('lazy-loading')) {
  logInfo('Eagerly registering essential agents', 'AgentRegistry');
  agentRegistry.register(new RobotAgent());
  agentRegistry.register(new TriggerAgent());
  agentRegistry.register(new TransformAgent());
  agentRegistry.register(new ConditionAgent());
  agentRegistry.register(new DelayAgent());
  agentRegistry.register(new WorkflowHTTPAgent());
  agentRegistry.register(new WorkflowCodeAgent());
  agentRegistry.register(new RosAgent());
} else {
  // With lazy loading, only register the most critical agents
  logInfo('Lazy loading enabled - registering only critical agents', 'AgentRegistry');
  agentRegistry.register(new TriggerAgent()); // Essential for workflows
  agentRegistry.register(new TransformAgent()); // Essential for data processing

  // Preload commonly used agent categories in the background
  agentRegistry.preloadAgents('productivity').catch((error) => {
    logWarn('Failed to preload productivity agents', 'AgentRegistry', error);
  });
}
