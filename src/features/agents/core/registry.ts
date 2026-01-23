/**
 * The central registry for all agents in the system.
 * This follows the Singleton pattern to ensure only one instance exists.
 * Supports lazy loading to improve startup performance and avoid circular dependencies.
 */
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from './types';
import { agentStatsService } from '../../../services/AgentStatsService';

class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseAgent> = new Map();
  private agentFactories: Map<string, () => Promise<BaseAgent>> = new Map();
  private loadingPromises: Map<string, Promise<BaseAgent>> = new Map();

  private constructor() {
    this.initializeAgentFactories();
  }

  /**
   * Initialize lazy loading factories for all agents.
   * Add new agents here to make them available to the system.
   */
  private initializeAgentFactories(): void {
    const agentDefinitions: Array<[string, string]> = [
      // Standard Agents
      ['AudioAnalysisAgent', '../implementations/AudioAnalysisAgent'],
      ['CalendarAgent', '../implementations/CalendarAgent'],
      ['CodeInterpreterAgent', '../implementations/CodeInterpreterAgent'],
      ['ConditionAgent', '../implementations/ConditionAgent'],
      ['ContentGeneratorAgent', '../implementations/ContentGeneratorAgent'],
      ['CoordinatorAgent', '../implementations/CoordinatorAgent'],
      ['ContextAgent', '../implementations/ContextAgent'],
      ['CriticAgent', '../implementations/CriticAgent'],
      ['CriticAgentV2', '../implementations/CriticAgentV2'],
      ['DataAnalysisAgent', '../implementations/DataAnalysisAgent'],
      ['DelayAgent', '../implementations/DelayAgent'],
      ['EmailAgent', '../implementations/EmailAgent'],
      ['ForEachAgent', '../implementations/ForEachAgent'],
      ['GeminiCliAgent', '../implementations/GeminiCliAgent'],
      ['GeminiCodeAgent', '../implementations/GeminiCodeAgent'],
      ['GitHubAgent', '../implementations/GitHubAgent'],
      ['GrokCliAgent', '../implementations/GrokCliAgent'],
      ['HealthMonitorAgent', '../implementations/HealthMonitorAgent'],
      ['HearingAgent', '../implementations/HearingAgent'],
      ['ImageAnalysisAgent', '../implementations/ImageAnalysisAgent'],
      ['KnowledgeGraphAgent', '../implementations/KnowledgeGraphAgent'],
      ['LLMAgent', './LLMAgent'],
      ['MQTTAgent', '../implementations/MQTTAgent'],
      ['MemoryAgent', '../implementations/MemoryAgent'],
      ['MetaHumanAgent', '../implementations/MetaHumanAgent'],
      ['NLUAgent', '../implementations/NLUAgent'],
      ['OCRAgent', '../implementations/OCRAgent'],
      ['PersonalizationAgent', '../implementations/PersonalizationAgent'],
      ['PlannerAgent', '../implementations/PlannerAgent'],
      ['PowerShellAgent', '../implementations/PowerShellAgent'],
      ['ProactiveSuggestionsAgent', '../implementations/ProactiveSuggestionsAgent'],
      ['RobotAgent', '../implementations/RobotAgent'],
      ['RosAgent', '../implementations/RosAgent'],
      ['RosPublisherAgent', '../implementations/RosPublisherAgent'],
      ['SchedulerAgent', '../implementations/SchedulerAgent'],
      ['ScreenShareAgent', '../implementations/ScreenShareAgent'],
      ['SecurityAgent', '../implementations/SecurityAgent'],
      ['SetAgent', '../implementations/SetAgent'],
      ['SmallTalkAgent', '../implementations/SmallTalkAgent'],
      ['SmartHomeAgent', '../implementations/SmartHomeAgent'],
      ['SpeechSynthesisAgent', '../implementations/SpeechSynthesisAgent'],
      ['SystemIntegrationAgent', '../implementations/SystemIntegrationAgent'],
      ['TodoAgent', '../implementations/TodoAgent'],
      ['TransformAgent', '../implementations/TransformAgent'],
      ['TranslationAgent', '../implementations/TranslationAgent'],
      ['TriggerAgent', '../implementations/TriggerAgent'],
      ['UserWorkflowAgent', '../implementations/UserWorkflowAgent'],
      ['VisionAgent', '../implementations/VisionAgent'],
      ['WeatherAgent', '../implementations/WeatherAgent'],
      ['WebContentReaderAgent', '../implementations/WebContentReaderAgent'],
      ['WebSearchAgent', '../implementations/WebSearchAgent'],
      ['WorkflowCodeAgent', '../implementations/WorkflowCodeAgent'],
      ['WorkflowHTTPAgent', '../implementations/WorkflowHTTPAgent'],

      // Workflow Specific Agents
      ['AFlowOptimizerAgent', '../../workflow/agents/AFlowOptimizerAgent'],
      ['WindsurfAgent', '../../workflow/agents/WindsurfAgent'],
    ];

    agentDefinitions.forEach(([className, modulePath]) => {
      this.agentFactories.set(className, async () => {
        const module = await import(modulePath);
        const AgentClass = module[className] || module.default;
        
        if (!AgentClass) {
          throw new Error(`Agent class ${className} not found in module ${modulePath}`);
        }
        
        return new AgentClass();
      });
    });
  }

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  public register(agent: BaseAgent): void {
    if (this.agents.has(agent.name)) {
      console.warn(`Agent with name "${agent.name}" is already registered.`);
      return;
    }
    this.agents.set(agent.name, agent);
  }

  public getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }

  public async getAgentAsync(name: string): Promise<BaseAgent | undefined> {
    if (this.agents.has(name)) {
      return this.agents.get(name);
    }

    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name);
    }

    const factory = this.agentFactories.get(name);
    if (!factory) {
      return undefined;
    }

    const loadingPromise = factory().then(agent => {
      this.agents.set(name, agent);
      this.loadingPromises.delete(name);
      return agent;
    }).catch(error => {
      console.error(`Failed to load agent ${name}:`, error);
      this.loadingPromises.delete(name);
      throw error;
    });

    this.loadingPromises.set(name, loadingPromise);
    return loadingPromise;
  }

  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  public listAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  public listAvailableAgentNames(): string[] {
    return Array.from(this.agentFactories.keys());
  }

  public hasAgent(name: string): boolean {
    return this.agents.has(name) || this.agentFactories.has(name);
  }

  public async execute(name: string, props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const agent = await this.getAgentAsync(name);
    
    if (!agent) {
      agentStatsService.recordActivity(name, 'Agent not found', 'error');
      return {
        success: false,
        output: null,
        error: `Agent ${name} not found`
      };
    }

    try {
      const result = await agent.execute(props);
      const duration = Date.now() - startTime;
      
      const action = props.intent || props.command || 'Execution';
      agentStatsService.recordActivity(
        name,
        action,
        result.success ? 'success' : 'error',
        duration
      );
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const action = props.intent || props.command || 'Execution';
      agentStatsService.recordActivity(name, action, 'error', duration);
      
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async preloadAgents(names: string[]): Promise<void> {
    await Promise.all(names.map(name => this.getAgentAsync(name)));
  }

  public async preloadAllAgents(): Promise<void> {
    await this.preloadAgents(this.listAvailableAgentNames());
  }
}

export const agentRegistry = AgentRegistry.getInstance();
