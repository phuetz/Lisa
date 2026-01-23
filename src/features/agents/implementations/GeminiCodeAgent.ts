import { AgentDomains } from '../core/types';
import type {
  AgentDomain,
  AgentExecuteProps,
  AgentExecuteResult,
  BaseAgent
} from '../core/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    // Initialize Gemini API if key is available
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      console.log('[GeminiCodeAgent] Gemini API initialized');
    } else {
      console.warn('[GeminiCodeAgent] No Gemini API key found. Set VITE_GEMINI_API_KEY in .env');
    }
  }

  /**
   * Méthode d'exécution principale de l'agent
   * @param props Propriétés d'exécution
   */
  public async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, parameters } = props;
    const request = parameters?.request || parameters?.prompt;

    if (!request) {
      return {
        success: false,
        output: null,
        error: 'No request/prompt provided for code generation'
      };
    }

    if (!this.model) {
      return {
        success: false,
        output: null,
        error: 'Gemini API not initialized. Please set VITE_GEMINI_API_KEY in .env'
      };
    }

    try {
      const prompt = `Generate code for the following request. Provide ONLY the code, no explanations or markdown code blocks unless requested.
      
      Request: ${request}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      return {
        success: true,
        output: {
          content,
          error: null
        }
      };
    } catch (error) {
      console.error('[GeminiCodeAgent] Error generating code:', error);
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Enregistrement de l'agent dans le registre
import { agentRegistry } from './AgentRegistry';
agentRegistry.register(new GeminiCodeAgent());

export default GeminiCodeAgent;
