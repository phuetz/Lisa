/**
 * Agent Registration System
 * 
 * Ce fichier centralise l'enregistrement de tous les agents spécialisés
 * dans le registre d'agents. Il doit être importé au démarrage de l'application.
 */

import { agentRegistry } from './registry';
import { SmartHomeAgent } from './SmartHomeAgent';
import { ContentGeneratorAgent } from './ContentGeneratorAgent';
import { PersonalizationAgent } from './PersonalizationAgent';
import { SpeechSynthesisAgent } from './SpeechSynthesisAgent';
import { WebSearchAgent } from './WebSearchAgent';
import { OCRAgent } from './OCRAgent';
import { VisionAgent } from './VisionAgent';
import { ContextAgent } from './ContextAgent';
import { ProactiveSuggestionsAgent } from './ProactiveSuggestionsAgent';
import { UserWorkflowAgent } from './UserWorkflowAgent';
import { SmallTalkAgent } from './SmallTalkAgent';
import { MemoryAgent } from './MemoryAgent';
import { GitHubAgent } from './GitHubAgent';
import { ScreenShareAgent } from './ScreenShareAgent';
import { PowerShellAgent } from './PowerShellAgent';
import { WorkflowHTTPAgent } from './WorkflowHTTPAgent';
import { WorkflowCodeAgent } from './WorkflowCodeAgent';
import { MetaHumanAgent } from './MetaHumanAgent';
import { GeminiCliAgent } from './GeminiCliAgent';
import { NLUAgent } from './NLUAgent';
import { MQTTAgent } from './MQTTAgent';
import { KnowledgeGraphAgent } from './KnowledgeGraphAgent';

// Fonction d'initialisation pour enregistrer tous les agents
export const registerAllAgents = (): void => {
  console.log('Registering specialized agents...');
  
  // Enregistre les agents spécialisés
  agentRegistry.register(new SmartHomeAgent());
  agentRegistry.register(new ContentGeneratorAgent());
  agentRegistry.register(new PersonalizationAgent());
  agentRegistry.register(new SpeechSynthesisAgent());
  agentRegistry.register(new WebSearchAgent());
  agentRegistry.register(new OCRAgent());
  agentRegistry.register(new VisionAgent());
  agentRegistry.register(new ContextAgent());
  agentRegistry.register(new ProactiveSuggestionsAgent());
  agentRegistry.register(new UserWorkflowAgent());
  agentRegistry.register(new SmallTalkAgent());
  agentRegistry.register(new MemoryAgent());
  agentRegistry.register(new GitHubAgent());
  agentRegistry.register(new ScreenShareAgent());
  agentRegistry.register(new PowerShellAgent());
  agentRegistry.register(new WorkflowHTTPAgent());
  agentRegistry.register(new WorkflowCodeAgent());
  agentRegistry.register(new MetaHumanAgent());
  agentRegistry.register(new GeminiCliAgent());
  agentRegistry.register(new NLUAgent());
  agentRegistry.register(new MQTTAgent());
  agentRegistry.register(new KnowledgeGraphAgent());
  
  // Log le nombre d'agents enregistrés
  const agents = agentRegistry.getAllAgents();
  console.log(`Successfully registered ${agents.length} specialized agents`);
  
  // Log les détails des agents
  agents.forEach(agent => {
    console.log(`- ${agent.name} (${agent.domain}): ${agent.description}`);
  });
};

// Export des types et interfaces publics des agents
export * from './types';
export * from './SmartHomeAgent';
export * from './ContentGeneratorAgent';
export * from './PersonalizationAgent';
export * from './SpeechSynthesisAgent';
export * from './WebSearchAgent';
export * from './OCRAgent';
export * from './VisionAgent';
export * from './ContextAgent';
export * from './ProactiveSuggestionsAgent';
export * from './UserWorkflowAgent';
export * from './SmallTalkAgent';
export * from './MemoryAgent';
export * from './GitHubAgent';
export * from './ScreenShareAgent';
export * from './PowerShellAgent';
export * from './WorkflowHTTPAgent';
export * from './WorkflowCodeAgent';
export * from './MetaHumanAgent';
export * from './GeminiCliAgent';
export * from './GeminiCodeAgent';

// Export du registre d'agents
export { agentRegistry } from './registry';
