import { AgentDomains, type BaseAgent, type AgentExecuteProps, type AgentExecuteResult } from "./types";

export class ConditionAgent implements BaseAgent {
  name = "ConditionAgent";
  description = "Evaluates conditions in workflows.";
  version = "0.1.0";
  domain = AgentDomains.ANALYSIS;
  capabilities = ["evaluateCondition"];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, parameters } = props;

    if (intent !== "evaluateCondition") {
      return { success: false, output: null, error: `Unknown intent: ${intent}` };
    }

    const { condition, input, context } = parameters;

    try {
      // This is a placeholder for actual expression evaluation.
      // In a real system, you'd use a secure sandbox or a dedicated code execution agent.
      const func = new Function('input', 'context', `with (context) { return Boolean(${condition}); }`);
      const isTrue = func(input, context);

      return {
        success: true,
        output: {
          result: isTrue,
          path: isTrue ? 'true' : 'false',
          original: input
        }
      };
    } catch (error: any) {
      return { success: false, output: null, error: `Condition evaluation failed: ${error.message}` };
    }
  }
}
