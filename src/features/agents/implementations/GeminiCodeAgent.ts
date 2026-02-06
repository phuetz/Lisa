import { AgentDomains } from '../core/types';
import type {
  AgentDomain,
  AgentParameter,
  AgentCapability,
  AgentExecuteProps,
  AgentExecuteResult,
  BaseAgent
} from '../core/types';

/**
 * Agent spécialisé pour la génération de code via l'API Gemini
 * Fournit une interface pour générer du code à partir de prompts textuels
 */
export class GeminiCodeAgent implements BaseAgent {
  // Identité et métadonnées
  public name = 'GeminiCodeAgent';
  public description = 'Agent pour la génération de code via l\'API Gemini';
  public version = '1.0.0';
  public domain: AgentDomain = AgentDomains.KNOWLEDGE;
  public capabilities = ['generateCode'];
  public valid = true;

  /**
   * Méthode d'exécution principale de l'agent
   * @param props Propriétés d'exécution
   */
  public async execute(_props: AgentExecuteProps): Promise<AgentExecuteResult> {
    // Simple stub implementation that returns a success response
    return Promise.resolve({
      success: true,
      output: {
        content: 'Generated code would appear here',
        error: null
      }
    });
  }
}

// Note: Agent is registered via lazy-loading in src/features/agents/core/registry.ts
// No manual registration needed here

export default GeminiCodeAgent;
