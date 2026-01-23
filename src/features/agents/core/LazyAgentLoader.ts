/**
 * Lazy loader pour les agents - améliore les performances de démarrage
 */

import { type BaseAgent } from './types.js';

export class LazyAgentLoader {
  private static instance: LazyAgentLoader;
  private loadedAgents = new Map<string, BaseAgent>();
  private loadingPromises = new Map<string, Promise<BaseAgent>>();

  static getInstance(): LazyAgentLoader {
    if (!LazyAgentLoader.instance) {
      LazyAgentLoader.instance = new LazyAgentLoader();
    }
    return LazyAgentLoader.instance;
  }

  async loadAgent(agentName: string): Promise<BaseAgent> {
    // Si l'agent est déjà chargé, le retourner
    if (this.loadedAgents.has(agentName)) {
      return this.loadedAgents.get(agentName)!;
    }

    // Si l'agent est en cours de chargement, attendre la promesse existante
    if (this.loadingPromises.has(agentName)) {
      return this.loadingPromises.get(agentName)!;
    }

    // Charger l'agent de manière asynchrone
    const loadingPromise = this.dynamicImportAgent(agentName);
    this.loadingPromises.set(agentName, loadingPromise);

    try {
      const agent = await loadingPromise;
      this.loadedAgents.set(agentName, agent);
      this.loadingPromises.delete(agentName);
      return agent;
    } catch (error) {
      this.loadingPromises.delete(agentName);
      throw error;
    }
  }

  private async dynamicImportAgent(agentName: string): Promise<BaseAgent> {
    try {
      // Mapping des noms d'agents vers leurs fichiers
      const agentModules: Record<string, () => Promise<any>> = {
        'PlannerAgent': () => import('./PlannerAgent.js'),
        'VisionAgent': () => import('./VisionAgent.js'),
        'RobotAgent': () => import('./RobotAgent.js'),
        'WeatherAgent': () => import('./WeatherAgent.js'),
        'TodoAgent': () => import('./TodoAgent.js'),
        'MemoryAgent': () => import('./MemoryAgent.js'),
        'OCRAgent': () => import('./OCRAgent.js'),
        'SystemIntegrationAgent': () => import('./SystemIntegrationAgent.js'),
        'TransformAgent': () => import('./TransformAgent.js'),
        'TriggerAgent': () => import('./TriggerAgent.js'),
        'CalendarAgent': () => import('./CalendarAgent.js'),
        'CodeInterpreterAgent': () => import('./CodeInterpreterAgent.js'),
        'ContentGeneratorAgent': () => import('./ContentGeneratorAgent.js'),
        'WebSearchAgent': () => import('./WebSearchAgent.js'),
        'SmartHomeAgent': () => import('./SmartHomeAgent.js'),
        'MetaHumanAgent': () => import('./MetaHumanAgent.js'),
        'SpeechSynthesisAgent': () => import('./SpeechSynthesisAgent.js'),
        'NLUAgent': () => import('./NLUAgent.js'),
        'PersonalizationAgent': () => import('./PersonalizationAgent.js'),
        'ProactiveSuggestionsAgent': () => import('./ProactiveSuggestionsAgent.js'),
        'SmallTalkAgent': () => import('./SmallTalkAgent.js'),
        'UserWorkflowAgent': () => import('./UserWorkflowAgent.js'),
        'WorkflowCodeAgent': () => import('./WorkflowCodeAgent.js'),
        'WorkflowHTTPAgent': () => import('./WorkflowHTTPAgent.js'),
        'WebContentReaderAgent': () => import('./WebContentReaderAgent.js'),
        'KnowledgeGraphAgent': () => import('./KnowledgeGraphAgent.js'),
        'MQTTAgent': () => import('./MQTTAgent.js'),
        'RosAgent': () => import('./RosAgent.js'),
        'RosPublisherAgent': () => import('./RosPublisherAgent.js'),
        'GitHubAgent': () => import('./GitHubAgent.js'),
        'GeminiCliAgent': () => import('./GeminiCliAgent.js'),
        'GeminiCodeAgent': () => import('./GeminiCodeAgent.js'),
        'PowerShellAgent': () => import('./PowerShellAgent.js'),
        'ScreenShareAgent': () => import('./ScreenShareAgent.js'),
        'ConditionAgent': () => import('./ConditionAgent.js'),
        'ContextAgent': () => import('./ContextAgent.js'),
        'DelayAgent': () => import('./DelayAgent.js')
      };

      const moduleLoader = agentModules[agentName];
      if (!moduleLoader) {
        throw new Error(`Agent inconnu: ${agentName}`);
      }

      console.log(`🔄 Chargement lazy de l'agent: ${agentName}`);
      const module = await moduleLoader();
      
      // Chercher la classe d'agent dans le module
      const AgentClass = module[agentName] || module.default;
      if (!AgentClass) {
        throw new Error(`Classe d'agent non trouvée dans le module: ${agentName}`);
      }

      const agent = new AgentClass();
      console.log(`✅ Agent chargé avec succès: ${agentName}`);
      
      return agent;
    } catch (error) {
      console.error(`❌ Erreur lors du chargement de l'agent ${agentName}:`, error);
      throw new Error(`Impossible de charger l'agent ${agentName}: ${error}`);
    }
  }

  isAgentLoaded(agentName: string): boolean {
    return this.loadedAgents.has(agentName);
  }

  getLoadedAgents(): string[] {
    return Array.from(this.loadedAgents.keys());
  }

  unloadAgent(agentName: string): void {
    this.loadedAgents.delete(agentName);
    this.loadingPromises.delete(agentName);
  }

  clearCache(): void {
    this.loadedAgents.clear();
    this.loadingPromises.clear();
  }

  getMemoryUsage(): { loadedCount: number; loadingCount: number } {
    return {
      loadedCount: this.loadedAgents.size,
      loadingCount: this.loadingPromises.size
    };
  }
}

export const lazyAgentLoader = LazyAgentLoader.getInstance();
