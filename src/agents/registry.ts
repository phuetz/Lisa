/**
 * The central registry for all agents in the system.
 * This follows the Singleton pattern to ensure only one instance exists.
 */
import type { BaseAgent } from './types.js';
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
    if (this.agents.size >= this.maxAgents) {
      this.cleanupOldAgents();
    }
    this.agents.set(agent.name, agent);
    this.lastAccess.set(agent.name, Date.now());
  }

  /**
   * Retrieves an agent by its unique name.
   * @param name - The name of the agent to retrieve.
   * @returns The agent instance, or undefined if not found.
   */
  public getAgent(name: string): BaseAgent | undefined {
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
}

// Export a single instance of the registry for use throughout the application.
export const agentRegistry = AgentRegistry.getInstance();

agentRegistry.register(new RobotAgent());
agentRegistry.register(new TriggerAgent());
agentRegistry.register(new TransformAgent());
agentRegistry.register(new ConditionAgent());
agentRegistry.register(new DelayAgent());
agentRegistry.register(new WorkflowHTTPAgent());
agentRegistry.register(new WorkflowCodeAgent());
agentRegistry.register(new RosAgent());
