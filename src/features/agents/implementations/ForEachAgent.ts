import { BaseAgent } from '../core/BaseAgent';
import { AgentDomains, type AgentExecuteProps, type AgentExecuteResult } from '../core/types';

/**
 * ForEachAgent
 * Specialized agent for iterating over collections in a workflow.
 */
export class ForEachAgent extends BaseAgent {
  constructor() {
    super(
      'ForEachAgent',
      'Iterates over collections and prepares data for sequential processing',
      '1.0.0',
      AgentDomains.PRODUCTIVITY
    );
  }

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { list } = props.parameters || {};

    try {
      if (!Array.isArray(list)) {
        return {
          success: false,
          output: null,
          error: `ForEachAgent requires an array. Received: ${typeof list}`
        };
      }

      // Prepare iteration results
      // In a more advanced implementation, this agent could handle
      // chunking or parallel distribution logic.
      const iterationResults = list.map(item => item);

      return {
        success: true,
        output: { iterationResults }
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
