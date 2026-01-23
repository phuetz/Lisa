import { AgentDomains, type BaseAgent, type AgentExecuteProps, type AgentExecuteResult } from "./types";

export class DelayAgent implements BaseAgent {
  name = "DelayAgent";
  description = "Introduces a delay in workflows.";
  version = "0.1.0";
  domain = AgentDomains.PRODUCTIVITY;
  capabilities = ["delay"];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, parameters } = props;

    if (intent !== "delay") {
      return { success: false, output: null, error: `Unknown intent: ${intent}` };
    }

    const { delayMs, input } = parameters;

    try {
      const delay = parseInt(delayMs) || 1000;
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, 5000)));

      return {
        success: true,
        output: {
          delayed: true,
          delayMs: delay,
          original: input
        }
      };
    } catch (error: any) {
      return { success: false, output: null, error: `Delay execution failed: ${error.message}` };
    }
  }
}
