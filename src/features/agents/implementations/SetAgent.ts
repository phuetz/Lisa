import { BaseAgent } from '../core/BaseAgent';
import { AgentDomains, type AgentExecuteProps, type AgentExecuteResult } from '../core/types';

/**
 * SetAgent
 * Specialized agent for managing variables within a workflow.
 */
export class SetAgent extends BaseAgent {
  constructor() {
    super(
      'SetAgent',
      'Manages variables and state within a workflow',
      '1.0.0',
      AgentDomains.PRODUCTIVITY
    );
  }

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { key, value, input } = props.parameters || {};

    try {
      // Merge input data with the new key/value pair
      const output = { 
        ...(input || {}),
        [key]: value 
      };

      return {
        success: true,
        output
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
