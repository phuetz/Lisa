import { BaseAgent } from './BaseAgent';
import { AgentDomains, type AgentExecuteProps, type AgentExecuteResult } from './types';
import { aiService } from '../../../services/aiService';

/**
 * LLMAgent
 * Universal agent for interacting with Large Language Models.
 * Bridges the workflow nodes to Lisa's aiService.
 */
export class LLMAgent extends BaseAgent {
  constructor() {
    super(
      'LLMAgent',
      'Universal LLM assistant for text and code generation',
      '1.0.0',
      AgentDomains.INTEGRATION
    );
  }

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { prompt, systemPrompt, provider, model, temperature } = props.parameters || {};
    const finalPrompt = prompt || props.request;

    if (!finalPrompt) {
      return {
        success: false,
        output: null,
        error: 'LLMAgent requires a prompt.'
      };
    }

    try {
      const response = await aiService.generateResponse(finalPrompt, {
        systemPrompt,
        provider,
        model,
        temperature: temperature ? parseFloat(temperature) : undefined
      });

      return {
        success: true,
        output: {
          content: response.content,
          usage: response.usage,
          model: response.model
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
