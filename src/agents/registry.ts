/**
 * The central registry for all agents in the system.
 * This follows the Singleton pattern to ensure only one instance exists.
 */
import type { BaseAgent } from './types.js';

class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseAgent> = new Map();

  // Private constructor to prevent direct instantiation.
  private constructor() {}

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
    this.agents.set(agent.name, agent);
  }

  /**
   * Retrieves an agent by its unique name.
   * @param name - The name of the agent to retrieve.
   * @returns The agent instance, or undefined if not found.
   */
  public getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name);
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
}

// Export a single instance of the registry for use throughout the application.
export const agentRegistry = AgentRegistry.getInstance();
