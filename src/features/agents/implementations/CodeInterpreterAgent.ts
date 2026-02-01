/**
 * CodeInterpreterAgent: An agent that uses the CodeInterpreterTool to execute Python code.
 */

import { CodeInterpreterTool } from '../../../tools/CodeInterpreterTool';
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import { AgentDomains } from '../core/types';

export class CodeInterpreterAgent implements BaseAgent {
  name = 'CodeInterpreterAgent';
  description = 'Executes Python code to perform calculations, data analysis, or other programmatic tasks. Use this for any task that involves running code.';
  version = '1.0.0';
  domain: AgentDomain = AgentDomains.ANALYSIS;
  capabilities = [
    'execute_python',
    'data_analysis',
    'calculations',
    'code_execution'
  ];
  private tool: CodeInterpreterTool;

  constructor(tool?: CodeInterpreterTool) {
    this.tool = tool || new CodeInterpreterTool();
  }

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { code } = props;

    if (!code || typeof code !== 'string') {
      return { success: false, error: 'A valid code string must be provided.', output: null };
    }

    try {
      const result = await this.tool.execute({ code });
      if (result.success) {
        return { success: true, output: result.output };
      }
      return { success: false, error: result.error ?? 'An unknown error occurred.', output: null };
    } catch (error: any) {
      console.error(`${this.name} execution failed:`, error);
      return { success: false, error: error.message, output: null };
    }
  }
}


