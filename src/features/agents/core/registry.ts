/**
 * The central registry for all agents in the system.
 * This follows the Singleton pattern to ensure only one instance exists.
 * Supports lazy loading to improve startup performance and avoid circular dependencies.
 *
 * Enhanced features:
 * - Priority-based preloading (critical, high, normal, low)
 * - Usage-based smart preloading
 * - Agent categorization by domain
 * - Loading state tracking
 * - Memory-efficient caching
 */
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from './types';
import { agentStatsService } from '../../../services/AgentStatsService';

export type AgentPriority = 'critical' | 'high' | 'normal' | 'low';
export type AgentDomain = 'core' | 'communication' | 'analysis' | 'workflow' | 'integration' | 'media' | 'utility';

export interface AgentMetadata {
  name: string;
  modulePath: string;
  priority: AgentPriority;
  domain: AgentDomain;
  dependencies?: string[];
  description?: string;
}

export interface AgentLoadingState {
  name: string;
  status: 'idle' | 'loading' | 'loaded' | 'error';
  loadTime?: number;
  error?: string;
  usageCount: number;
  lastUsed?: number;
}

class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseAgent> = new Map();
  private agentFactories: Map<string, () => Promise<BaseAgent>> = new Map();
  private loadingPromises: Map<string, Promise<BaseAgent>> = new Map();
  private agentMetadata: Map<string, AgentMetadata> = new Map();
  private loadingStates: Map<string, AgentLoadingState> = new Map();
  private preloadedDomains: Set<AgentDomain> = new Set();

  private constructor() {
    this.initializeAgentFactories();
  }

  /**
   * Initialize lazy loading factories for all agents with metadata.
   * Add new agents here to make them available to the system.
   */
  private initializeAgentFactories(): void {
    const agentDefinitions: AgentMetadata[] = [
      // Critical Core Agents - Preloaded on startup
      { name: 'LLMAgent', modulePath: './LLMAgent', priority: 'critical', domain: 'core' },
      { name: 'CoordinatorAgent', modulePath: '../implementations/CoordinatorAgent', priority: 'critical', domain: 'core' },
      { name: 'PlannerAgent', modulePath: '../implementations/PlannerAgent', priority: 'critical', domain: 'core' },
      { name: 'MemoryAgent', modulePath: '../implementations/MemoryAgent', priority: 'critical', domain: 'core' },

      // High Priority - Common interactions
      { name: 'SmallTalkAgent', modulePath: '../implementations/SmallTalkAgent', priority: 'high', domain: 'communication' },
      { name: 'NLUAgent', modulePath: '../implementations/NLUAgent', priority: 'high', domain: 'core' },
      { name: 'ContextAgent', modulePath: '../implementations/ContextAgent', priority: 'high', domain: 'core' },
      { name: 'TodoAgent', modulePath: '../implementations/TodoAgent', priority: 'high', domain: 'utility' },
      { name: 'WeatherAgent', modulePath: '../implementations/WeatherAgent', priority: 'high', domain: 'utility' },
      { name: 'CalendarAgent', modulePath: '../implementations/CalendarAgent', priority: 'high', domain: 'utility' },

      // Normal Priority - Standard features
      { name: 'AudioAnalysisAgent', modulePath: '../implementations/AudioAnalysisAgent', priority: 'normal', domain: 'media' },
      { name: 'CodeInterpreterAgent', modulePath: '../implementations/CodeInterpreterAgent', priority: 'normal', domain: 'analysis' },
      { name: 'ConditionAgent', modulePath: '../implementations/ConditionAgent', priority: 'normal', domain: 'workflow' },
      { name: 'ContentGeneratorAgent', modulePath: '../implementations/ContentGeneratorAgent', priority: 'normal', domain: 'communication' },
      { name: 'CriticAgent', modulePath: '../implementations/CriticAgent', priority: 'normal', domain: 'analysis' },
      { name: 'CriticAgentV2', modulePath: '../implementations/CriticAgentV2', priority: 'normal', domain: 'analysis' },
      { name: 'DataAnalysisAgent', modulePath: '../implementations/DataAnalysisAgent', priority: 'normal', domain: 'analysis' },
      { name: 'DelayAgent', modulePath: '../implementations/DelayAgent', priority: 'normal', domain: 'workflow' },
      { name: 'EmailAgent', modulePath: '../implementations/EmailAgent', priority: 'normal', domain: 'communication' },
      { name: 'ForEachAgent', modulePath: '../implementations/ForEachAgent', priority: 'normal', domain: 'workflow' },
      { name: 'GeminiCliAgent', modulePath: '../implementations/GeminiCliAgent', priority: 'normal', domain: 'core' },
      { name: 'GeminiCodeAgent', modulePath: '../implementations/GeminiCodeAgent', priority: 'normal', domain: 'analysis' },
      { name: 'GitHubAgent', modulePath: '../implementations/GitHubAgent', priority: 'normal', domain: 'integration' },
      { name: 'GrokCliAgent', modulePath: '../implementations/GrokCliAgent', priority: 'normal', domain: 'core' },
      { name: 'HealthMonitorAgent', modulePath: '../implementations/HealthMonitorAgent', priority: 'normal', domain: 'utility' },
      { name: 'HearingAgent', modulePath: '../implementations/HearingAgent', priority: 'normal', domain: 'media' },
      { name: 'ImageAnalysisAgent', modulePath: '../implementations/ImageAnalysisAgent', priority: 'normal', domain: 'media' },
      { name: 'KnowledgeGraphAgent', modulePath: '../implementations/KnowledgeGraphAgent', priority: 'normal', domain: 'analysis' },
      { name: 'OCRAgent', modulePath: '../implementations/OCRAgent', priority: 'normal', domain: 'media' },
      { name: 'PersonalizationAgent', modulePath: '../implementations/PersonalizationAgent', priority: 'normal', domain: 'core' },
      { name: 'ProactiveSuggestionsAgent', modulePath: '../implementations/ProactiveSuggestionsAgent', priority: 'normal', domain: 'core' },
      { name: 'SchedulerAgent', modulePath: '../implementations/SchedulerAgent', priority: 'normal', domain: 'utility' },
      { name: 'SecurityAgent', modulePath: '../implementations/SecurityAgent', priority: 'normal', domain: 'utility' },
      { name: 'SetAgent', modulePath: '../implementations/SetAgent', priority: 'normal', domain: 'workflow' },
      { name: 'SpeechSynthesisAgent', modulePath: '../implementations/SpeechSynthesisAgent', priority: 'normal', domain: 'media' },
      { name: 'TransformAgent', modulePath: '../implementations/TransformAgent', priority: 'normal', domain: 'workflow' },
      { name: 'TranslationAgent', modulePath: '../implementations/TranslationAgent', priority: 'normal', domain: 'communication' },
      { name: 'TriggerAgent', modulePath: '../implementations/TriggerAgent', priority: 'normal', domain: 'workflow' },
      { name: 'VisionAgent', modulePath: '../implementations/VisionAgent', priority: 'normal', domain: 'media' },
      { name: 'WebContentReaderAgent', modulePath: '../implementations/WebContentReaderAgent', priority: 'normal', domain: 'utility' },
      { name: 'WebSearchAgent', modulePath: '../implementations/WebSearchAgent', priority: 'normal', domain: 'utility' },
      { name: 'WorkflowCodeAgent', modulePath: '../implementations/WorkflowCodeAgent', priority: 'normal', domain: 'workflow' },
      { name: 'WorkflowHTTPAgent', modulePath: '../implementations/WorkflowHTTPAgent', priority: 'normal', domain: 'workflow' },

      // Automation Agents
      { name: 'CodeBuddyAgent', modulePath: '../implementations/CodeBuddyAgent', priority: 'normal', domain: 'integration', description: 'AI-powered computer control with vision and automation' },

      // Low Priority - Specialized features
      { name: 'MQTTAgent', modulePath: '../implementations/MQTTAgent', priority: 'low', domain: 'integration' },
      { name: 'MetaHumanAgent', modulePath: '../implementations/MetaHumanAgent', priority: 'low', domain: 'media' },
      { name: 'PowerShellAgent', modulePath: '../implementations/PowerShellAgent', priority: 'low', domain: 'integration' },
      { name: 'RobotAgent', modulePath: '../implementations/RobotAgent', priority: 'low', domain: 'integration' },
      { name: 'RosAgent', modulePath: '../implementations/RosAgent', priority: 'low', domain: 'integration' },
      { name: 'RosPublisherAgent', modulePath: '../implementations/RosPublisherAgent', priority: 'low', domain: 'integration' },
      { name: 'ScreenShareAgent', modulePath: '../implementations/ScreenShareAgent', priority: 'low', domain: 'media' },
      { name: 'SmartHomeAgent', modulePath: '../implementations/SmartHomeAgent', priority: 'low', domain: 'integration' },
      { name: 'SystemIntegrationAgent', modulePath: '../implementations/SystemIntegrationAgent', priority: 'low', domain: 'integration' },
      { name: 'UserWorkflowAgent', modulePath: '../implementations/UserWorkflowAgent', priority: 'low', domain: 'workflow' },

      // Research & Analysis Agents
      { name: 'ResearchAgent', modulePath: '../implementations/ResearchAgent', priority: 'normal', domain: 'analysis' },
      { name: 'DataAnalystAgent', modulePath: '../implementations/DataAnalystAgent', priority: 'low', domain: 'analysis' },
      { name: 'CreativeMarketingAgent', modulePath: '../implementations/CreativeMarketingAgent', priority: 'low', domain: 'communication' },
      { name: 'CodeReviewAgent', modulePath: '../implementations/CodeReviewAgent', priority: 'low', domain: 'analysis' },

      // Workflow Specific Agents
      { name: 'AFlowOptimizerAgent', modulePath: '../implementations/AFlowOptimizerAgent', priority: 'low', domain: 'workflow' },
      { name: 'WindsurfAgent', modulePath: '../implementations/WindsurfAgent', priority: 'low', domain: 'workflow' },
    ];

    agentDefinitions.forEach((metadata) => {
      this.agentMetadata.set(metadata.name, metadata);
      this.loadingStates.set(metadata.name, {
        name: metadata.name,
        status: 'idle',
        usageCount: 0,
      });

      this.agentFactories.set(metadata.name, async () => {
        const module = await import(metadata.modulePath);
        const AgentClass = module[metadata.name] || module.default;

        if (!AgentClass) {
          throw new Error(`Agent class ${metadata.name} not found in module ${metadata.modulePath}`);
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
    const state = this.loadingStates.get(name);

    // Update usage stats
    if (state) {
      state.usageCount++;
      state.lastUsed = Date.now();
    }

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

    // Update loading state
    if (state) {
      state.status = 'loading';
    }

    const startTime = Date.now();

    const loadingPromise = factory().then(agent => {
      this.agents.set(name, agent);
      this.loadingPromises.delete(name);

      // Update loading state on success
      if (state) {
        state.status = 'loaded';
        state.loadTime = Date.now() - startTime;
      }

      return agent;
    }).catch(error => {
      console.error(`Failed to load agent ${name}:`, error);
      this.loadingPromises.delete(name);

      // Update loading state on error
      if (state) {
        state.status = 'error';
        state.error = error instanceof Error ? error.message : String(error);
      }

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

  /**
   * Preload agents by priority level
   */
  public async preloadByPriority(priority: AgentPriority): Promise<void> {
    const agentNames = Array.from(this.agentMetadata.entries())
      .filter(([, meta]) => meta.priority === priority)
      .map(([name]) => name);

    await this.preloadAgents(agentNames);
  }

  /**
   * Preload critical agents on startup
   */
  public async preloadCritical(): Promise<void> {
    await this.preloadByPriority('critical');
  }

  /**
   * Preload agents by domain
   */
  public async preloadByDomain(domain: AgentDomain): Promise<void> {
    if (this.preloadedDomains.has(domain)) return;

    const agentNames = Array.from(this.agentMetadata.entries())
      .filter(([, meta]) => meta.domain === domain)
      .map(([name]) => name);

    await this.preloadAgents(agentNames);
    this.preloadedDomains.add(domain);
  }

  /**
   * Smart preload based on usage patterns
   * Preloads top N most used agents
   */
  public async smartPreload(topN: number = 10): Promise<void> {
    const sortedByUsage = Array.from(this.loadingStates.values())
      .filter(state => state.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, topN)
      .map(state => state.name);

    if (sortedByUsage.length > 0) {
      await this.preloadAgents(sortedByUsage);
    }
  }

  /**
   * Get agent metadata
   */
  public getAgentMetadata(name: string): AgentMetadata | undefined {
    return this.agentMetadata.get(name);
  }

  /**
   * Get all agents by domain
   */
  public getAgentsByDomain(domain: AgentDomain): string[] {
    return Array.from(this.agentMetadata.entries())
      .filter(([, meta]) => meta.domain === domain)
      .map(([name]) => name);
  }

  /**
   * Get all agents by priority
   */
  public getAgentsByPriority(priority: AgentPriority): string[] {
    return Array.from(this.agentMetadata.entries())
      .filter(([, meta]) => meta.priority === priority)
      .map(([name]) => name);
  }

  /**
   * Get loading state for an agent
   */
  public getLoadingState(name: string): AgentLoadingState | undefined {
    return this.loadingStates.get(name);
  }

  /**
   * Get all loading states
   */
  public getAllLoadingStates(): AgentLoadingState[] {
    return Array.from(this.loadingStates.values());
  }

  /**
   * Get statistics about agent loading
   */
  public getLoadingStats(): {
    total: number;
    loaded: number;
    loading: number;
    idle: number;
    error: number;
    avgLoadTime: number;
    mostUsed: string[];
  } {
    const states = Array.from(this.loadingStates.values());
    const loadedStates = states.filter(s => s.status === 'loaded' && s.loadTime);
    const avgLoadTime = loadedStates.length > 0
      ? loadedStates.reduce((sum, s) => sum + (s.loadTime || 0), 0) / loadedStates.length
      : 0;

    const mostUsed = states
      .filter(s => s.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(s => s.name);

    return {
      total: states.length,
      loaded: states.filter(s => s.status === 'loaded').length,
      loading: states.filter(s => s.status === 'loading').length,
      idle: states.filter(s => s.status === 'idle').length,
      error: states.filter(s => s.status === 'error').length,
      avgLoadTime,
      mostUsed,
    };
  }

  /**
   * Unload agent from memory (for memory optimization)
   */
  public unloadAgent(name: string): boolean {
    if (!this.agents.has(name)) return false;

    this.agents.delete(name);
    const state = this.loadingStates.get(name);
    if (state) {
      state.status = 'idle';
    }
    return true;
  }

  /**
   * Unload agents not used recently (memory cleanup)
   */
  public unloadUnusedAgents(maxIdleMs: number = 300000): number {
    const now = Date.now();
    let unloadedCount = 0;

    this.loadingStates.forEach((state, name) => {
      // Don't unload critical agents
      const metadata = this.agentMetadata.get(name);
      if (metadata?.priority === 'critical') return;

      // Check if agent is loaded and hasn't been used recently
      if (state.status === 'loaded' && state.lastUsed) {
        const idleTime = now - state.lastUsed;
        if (idleTime > maxIdleMs) {
          if (this.unloadAgent(name)) {
            unloadedCount++;
          }
        }
      }
    });

    return unloadedCount;
  }
}

export const agentRegistry = AgentRegistry.getInstance();

// Export types
export type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from './types';
