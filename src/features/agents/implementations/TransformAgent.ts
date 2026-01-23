import { AgentDomains, type BaseAgent, type AgentExecuteProps, type AgentExecuteResult } from "./types";

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
      // Expression evaluation requires backend sandboxing
      const backendAvailable = false; // TODO: Check for backend connection

      if (!backendAvailable) {
        return {
          success: false,
          output: null,
          error: 'Expression evaluation requires backend deployment (Sandboxing). See BACKEND_REQUIRED.md'
        };
      }

      // Code inaccessible tant que le backend n'est pas connecté
      // const func = new Function('input', 'context', `with (context) { return ${expression}; }`);
      // const output = func(input, context);
      // return { success: true, output };
      throw new Error('Backend integration not implemented');
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
