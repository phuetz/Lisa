import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../core/types';
import { AgentDomains } from '../core/types';

export class TransformAgent implements BaseAgent {
  name = "TransformAgent";
  description = "Handles data transformation nodes in workflows.";
  version = "0.1.0";
  domain = AgentDomains.ANALYSIS;
  capabilities = ["transform"];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, parameters } = props;

    if (intent !== "transform") {
      return { success: false, output: null, error: `Unknown intent: ${intent}` };
    }

    const { template, expression, input, context } = parameters;

    if (template && template.includes('{{')) {
      // Template-based transformation
      try {
        const output = this.applyTemplate(template, input);
        return { success: true, output };
      } catch (error: any) {
        return { success: false, output: null, error: `Template application failed: ${error.message}` };
      }
    } else if (expression) {
      // Expression evaluation (requires WorkflowCodeAgent or similar for safe execution)
      // For now, we'll simulate or require an external code execution agent
      // In a real scenario, this would delegate to a secure code execution environment.
      try {
        // This is a placeholder for actual expression evaluation.
        // In a real system, you'd use a secure sandbox or a dedicated code execution agent.
        const func = new Function('input', 'context', `with (context) { return ${expression}; }`);
        const output = func(input, context);
        return { success: true, output };
      } catch (error: any) {
        return { success: false, output: null, error: `Expression evaluation failed: ${error.message}` };
      }
    } else {
      // Passthrough if no transformation defined
      return { success: true, output: input };
    }
  }

  private applyTemplate(template: string, inputData: any): any {
    if (!template.includes('{{')) {
      return template;
    }

    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      try {
        const parts = path.trim().split('.');
        let value = inputData;

        for (const part of parts) {
          if (part === 'input') {
            value = inputData;
          } else {
            value = value?.[part];
          }

          if (value === undefined) {
            return match; // Keep the template if the value is undefined
          }
        }

        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      } catch (error: any) {
        throw new Error(`Template path evaluation error for '${path}': ${error.message}`);
      }
    });
  }
}
