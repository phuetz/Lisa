/**
 * Lazy loading and code splitting for agents
 * Reduces initial bundle size by loading agents on demand
 */

import { logInfo, logError } from './logger';
import type { BaseAgent } from '../agents/types';

interface LazyAgentModule {
  default: new () => BaseAgent;
}

type AgentLoader = () => Promise<LazyAgentModule>;

/**
 * Lazy Agent Loader
 * Dynamically imports agents when needed
 */
export class LazyAgentLoader {
  private static instance: LazyAgentLoader;
  private loadedAgents: Map<string, BaseAgent> = new Map();
  private loading: Map<string, Promise<BaseAgent>> = new Map();
  private loaders: Map<string, AgentLoader> = new Map();

  private constructor() {
    this.registerAgentLoaders();
  }

  static getInstance(): LazyAgentLoader {
    if (!LazyAgentLoader.instance) {
      LazyAgentLoader.instance = new LazyAgentLoader();
    }
    return LazyAgentLoader.instance;
  }

  /**
   * Register all agent loaders
   * Uses dynamic imports for code splitting
   */
  private registerAgentLoaders(): void {
    // Core agents - always loaded
    // (none for now, all are lazy)

    // Productivity agents
    this.loaders.set('CalendarAgent', () => import('../agents/CalendarAgent').then(m => ({ default: m.CalendarAgent as any })));
    this.loaders.set('TodoAgent', () => import('../agents/TodoAgent').then(m => ({ default: m.TodoAgent as any })));
    this.loaders.set('EmailAgent', () => import('../agents/EmailAgent').then(m => ({ default: m.EmailAgent as any })));
    this.loaders.set('NotesAgent', () => import('../agents/NotesAgent').then(m => ({ default: m.NotesAgent as any })));

    // Information agents
    this.loaders.set('WeatherAgent', () => import('../agents/WeatherAgent').then(m => ({ default: m.WeatherAgent as any })));
    this.loaders.set('NewsAgent', () => import('../agents/NewsAgent').then(m => ({ default: m.NewsAgent as any })));
    this.loaders.set('WebSearchAgent', () => import('../agents/WebSearchAgent').then(m => ({ default: m.WebSearchAgent as any })));
    this.loaders.set('WikiAgent', () => import('../agents/WikiAgent').then(m => ({ default: m.WikiAgent as any })));

    // Analysis agents
    this.loaders.set('DataAnalysisAgent', () => import('../agents/DataAnalysisAgent').then(m => ({ default: m.DataAnalysisAgent as any })));
    this.loaders.set('CodeInterpreterAgent', () => import('../agents/CodeInterpreterAgent').then(m => ({ default: m.CodeInterpreterAgent as any })));
    this.loaders.set('VisionAgent', () => import('../agents/VisionAgent').then(m => ({ default: m.VisionAgent as any })));
    this.loaders.set('AudioAnalysisAgent', () => import('../agents/AudioAnalysisAgent').then(m => ({ default: m.AudioAnalysisAgent as any })));

    // Content agents
    this.loaders.set('ContentGeneratorAgent', () => import('../agents/ContentGeneratorAgent').then(m => ({ default: m.ContentGeneratorAgent as any })));
    this.loaders.set('TranslationAgent', () => import('../agents/TranslationAgent').then(m => ({ default: m.TranslationAgent as any })));
    this.loaders.set('SummarizationAgent', () => import('../agents/SummarizationAgent').then(m => ({ default: m.SummarizationAgent as any })));

    // Integration agents
    this.loaders.set('SmartHomeAgent', () => import('../agents/SmartHomeAgent').then(m => ({ default: m.SmartHomeAgent as any })));
    this.loaders.set('HealthMonitorAgent', () => import('../agents/HealthMonitorAgent').then(m => ({ default: m.HealthMonitorAgent as any })));
    this.loaders.set('RosAgent', () => import('../agents/RosAgent').then(m => ({ default: m.RosAgent as any })));

    // Planning agents
    this.loaders.set('PlannerAgent', () => import('../agents/PlannerAgent').then(m => ({ default: m.PlannerAgent as any })));
    this.loaders.set('WorkflowAgent', () => import('../agents/WorkflowAgent').then(m => ({ default: m.WorkflowAgent as any })));

    logInfo(`Registered ${this.loaders.size} lazy agent loaders`, 'LazyAgentLoader');
  }

  /**
   * Load an agent by name
   */
  async loadAgent(agentName: string): Promise<BaseAgent> {
    // Return if already loaded
    if (this.loadedAgents.has(agentName)) {
      return this.loadedAgents.get(agentName)!;
    }

    // Wait if currently loading
    if (this.loading.has(agentName)) {
      return this.loading.get(agentName)!;
    }

    // Get loader
    const loader = this.loaders.get(agentName);
    if (!loader) {
      throw new Error(`No loader registered for agent: ${agentName}`);
    }

    // Start loading
    const loadPromise = this.performLoad(agentName, loader);
    this.loading.set(agentName, loadPromise);

    try {
      const agent = await loadPromise;
      this.loadedAgents.set(agentName, agent);
      return agent;
    } finally {
      this.loading.delete(agentName);
    }
  }

  /**
   * Perform the actual loading
   */
  private async performLoad(
    agentName: string,
    loader: AgentLoader
  ): Promise<BaseAgent> {
    const startTime = performance.now();

    try {
      logInfo(`Loading agent: ${agentName}`, 'LazyAgentLoader');
      const module = await loader();
      const AgentClass = module.default;
      const agent = new AgentClass();

      const duration = performance.now() - startTime;
      logInfo(
        `Loaded agent: ${agentName} in ${duration.toFixed(2)}ms`,
        'LazyAgentLoader'
      );

      return agent;
    } catch (error) {
      logError(`Failed to load agent: ${agentName}`, 'LazyAgentLoader', error);
      throw error;
    }
  }

  /**
   * Preload multiple agents
   */
  async preloadAgents(agentNames: string[]): Promise<void> {
    logInfo(`Preloading ${agentNames.length} agents`, 'LazyAgentLoader');

    const promises = agentNames.map(name => this.loadAgent(name).catch(err => {
      logError(`Failed to preload ${name}`, 'LazyAgentLoader', err);
    }));

    await Promise.all(promises);
  }

  /**
   * Preload agents for a specific category
   */
  async preloadCategory(category: 'productivity' | 'information' | 'analysis' | 'content' | 'integration'): Promise<void> {
    const categoryAgents: Record<string, string[]> = {
      productivity: ['CalendarAgent', 'TodoAgent', 'EmailAgent', 'NotesAgent'],
      information: ['WeatherAgent', 'NewsAgent', 'WebSearchAgent', 'WikiAgent'],
      analysis: ['DataAnalysisAgent', 'CodeInterpreterAgent', 'VisionAgent', 'AudioAnalysisAgent'],
      content: ['ContentGeneratorAgent', 'TranslationAgent', 'SummarizationAgent'],
      integration: ['SmartHomeAgent', 'HealthMonitorAgent', 'RosAgent'],
    };

    const agents = categoryAgents[category] || [];
    await this.preloadAgents(agents);
  }

  /**
   * Check if an agent is loaded
   */
  isLoaded(agentName: string): boolean {
    return this.loadedAgents.has(agentName);
  }

  /**
   * Check if an agent is currently loading
   */
  isLoading(agentName: string): boolean {
    return this.loading.has(agentName);
  }

  /**
   * Get list of all loaded agents
   */
  getLoadedAgents(): string[] {
    return Array.from(this.loadedAgents.keys());
  }

  /**
   * Get loading statistics
   */
  getStats(): {
    total: number;
    loaded: number;
    loading: number;
    pending: number;
  } {
    return {
      total: this.loaders.size,
      loaded: this.loadedAgents.size,
      loading: this.loading.size,
      pending: this.loaders.size - this.loadedAgents.size - this.loading.size,
    };
  }

  /**
   * Unload an agent to free memory
   */
  unloadAgent(agentName: string): void {
    this.loadedAgents.delete(agentName);
    logInfo(`Unloaded agent: ${agentName}`, 'LazyAgentLoader');
  }

  /**
   * Unload all agents
   */
  unloadAll(): void {
    const count = this.loadedAgents.size;
    this.loadedAgents.clear();
    logInfo(`Unloaded ${count} agents`, 'LazyAgentLoader');
  }
}

/**
 * Decorator for lazy agent methods
 * Automatically loads agent before method execution
 */
export function LazyAgent(agentName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const loader = LazyAgentLoader.getInstance();

    descriptor.value = async function (...args: any[]) {
      await loader.loadAgent(agentName);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * React hook for lazy agent loading
 */
export function useLazyAgent(agentName: string): {
  agent: BaseAgent | null;
  loading: boolean;
  error: Error | null;
  load: () => Promise<void>;
} {
  const [state, setState] = React.useState<{
    agent: BaseAgent | null;
    loading: boolean;
    error: Error | null;
  }>({
    agent: null,
    loading: false,
    error: null,
  });

  const loader = React.useMemo(() => LazyAgentLoader.getInstance(), []);

  const load = React.useCallback(async () => {
    if (state.agent) return;

    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const agent = await loader.loadAgent(agentName);
      setState({ agent, loading: false, error: null });
    } catch (error) {
      setState({ agent: null, loading: false, error: error as Error });
    }
  }, [agentName, loader, state.agent]);

  React.useEffect(() => {
    load();
  }, [load]);

  return { ...state, load };
}

// Export singleton instance
export const agentLoader = LazyAgentLoader.getInstance();

// For use in non-React contexts
import * as React from 'react';
