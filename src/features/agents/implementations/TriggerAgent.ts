import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../core/types';
import { AgentDomains } from '../core/types';

export class TriggerAgent implements BaseAgent {
  name = "TriggerAgent";
  description = "Handles trigger and webhook nodes in workflows.";
  version = "0.1.0";
  domain = AgentDomains.INTEGRATION;
  capabilities = ["trigger", "webhook"];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, parameters } = props;

    switch (intent) {
      case "trigger":
      case "webhook":
        return {
          success: true,
          output: {
            triggered: true,
            timestamp: new Date().toISOString(),
            payload: parameters?.mockData || {}
          }
        };
      default:
        return { success: false, output: null, error: `Unknown intent: ${intent}` };
    }
  }
}
