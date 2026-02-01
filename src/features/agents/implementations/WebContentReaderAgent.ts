/**
 * WebContentReaderAgent: An agent that uses the WebContentReaderTool to read and summarize web pages.
 */

import { WebContentReaderTool } from '../../../tools/WebContentReaderTool';
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import { AgentDomains } from '../core/types';

export class WebContentReaderAgent implements BaseAgent {
  name = 'WebContentReaderAgent';
  description = 'Reads and summarizes the content of a given URL. Use this when you need to understand the content of a specific web page.';
  version = '1.0.0';
  domain: AgentDomain = AgentDomains.KNOWLEDGE;
  capabilities = [
    'read_web_content',
    'summarize_url',
    'extract_text',
    'web_scraping'
  ];
  private tool: WebContentReaderTool;

  constructor(tool?: WebContentReaderTool) {
    this.tool = tool || new WebContentReaderTool();
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



