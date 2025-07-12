/**
 * WebContentReaderAgent: An agent that uses the WebContentReaderTool to read and summarize web pages.
 */
import { agentRegistry } from './registry';
import { WebContentReaderTool } from '../tools/WebContentReaderTool';
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from './types';

export class WebContentReaderAgent implements BaseAgent {
  name = 'WebContentReaderAgent';
  description = 'Reads and summarizes the content of a given URL. Use this when you need to understand the content of a specific web page.';
  private tool: WebContentReaderTool;

  constructor() {
    this.tool = new WebContentReaderTool();
  }

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { url } = props;

    if (!url || typeof url !== 'string') {
      return { success: false, error: 'A valid URL must be provided.', output: null };
    }

    try {
      const result = await this.tool.execute({ url });
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

agentRegistry.register(new WebContentReaderAgent());

