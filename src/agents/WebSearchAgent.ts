/**
 * WebSearchAgent: An agent that uses the WebSearchTool to search the web.
 */
import { agentRegistry } from './registry';
import { WebSearchTool } from '../tools/WebSearchTool';
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from './types';

export class WebSearchAgent implements BaseAgent {
  name = 'WebSearchAgent';
  description = 'Performs a web search and provides a concise answer. Use this for questions about current events, facts, or information not found elsewhere.';
  version = '1.0.0';
  domain = 'knowledge' as const;
  capabilities = ['web_search', 'information_retrieval', 'question_answering'];
  valid = true;
  private tool: WebSearchTool;

  constructor() {
    this.tool = new WebSearchTool();
  }

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { query } = props;

    if (!query || typeof query !== 'string') {
      return { success: false, error: 'A valid search query must be provided.', output: null };
    }

    try {
      const result = await this.tool.execute({ query });
      if (result.success) {
        return { success: true, output: result.output?.summary || 'No summary available.' };
      }
      return { success: false, error: result.error ?? 'An unknown error occurred.', output: null };
    } catch (error: any) {
      console.error(`${this.name} execution failed:`, error);
      return { success: false, error: error.message, output: null };
    }
  }
}

agentRegistry.register(new WebSearchAgent());
