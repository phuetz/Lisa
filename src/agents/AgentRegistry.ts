/**
 * The central registry for all agents in the system.
 * This follows the Singleton pattern to ensure only one instance exists.
 */
import type { BaseAgent } from './types';
import { RobotAgent } from './RobotAgent';
import { TriggerAgent } from './TriggerAgent';
import { TransformAgent } from './TransformAgent';
import { ConditionAgent } from './ConditionAgent';
import { DelayAgent } from './DelayAgent';
import { WorkflowHTTPAgent } from './WorkflowHTTPAgent';
import { WorkflowCodeAgent } from './WorkflowCodeAgent';
import { RosAgent } from './RosAgent';
import { GeminiCodeAgent } from './GeminiCodeAgent';

class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseAgent> = new Map<string, BaseAgent>();

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
   * Check if an agent exists in the registry.
   * @param name - The name of the agent to check.
   * @returns Boolean indicating whether the agent exists.
   */
  public hasAgent(name: string): boolean {
    return this.agents.has(name);
  }

  /**
   * Execute a method on an agent.
   * @param name - The name of the agent to execute.
   * @param props - The properties to pass to the agent.
   * @returns The result of the execution.
   */
  public async execute(name: string, props: any): Promise<any> {
    const agent = this.getAgent(name);
    if (!agent) {
      return {
        success: false,
        output: null,
        error: `Agent ${name} not found`
      };
    }
    return await agent.execute(props);
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

// Register all the agents
agentRegistry.register(new RobotAgent());
agentRegistry.register(new TriggerAgent());
agentRegistry.register(new TransformAgent());
agentRegistry.register(new ConditionAgent());
agentRegistry.register(new DelayAgent());
agentRegistry.register(new WorkflowHTTPAgent());
agentRegistry.register(new WorkflowCodeAgent());
agentRegistry.register(new GeminiCodeAgent());

export default AgentRegistry;
