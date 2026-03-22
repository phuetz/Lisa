/**
 * Calculator Agent
 * Evaluates mathematical expressions using mathjs.
 * Supports variables, derivatives, simplification, and plot generation.
 * Lazy-loads mathjs to avoid impacting bundle size (~170KB).
 */

import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../core/types';

let mathInstance: typeof import('mathjs') | null = null;

async function getMath() {
  if (!mathInstance) {
    mathInstance = await import(/* @vite-ignore */ 'mathjs');
  }
  return mathInstance;
}

export class CalculatorAgent implements BaseAgent {
  name = 'CalculatorAgent';
  description = 'Évalue des expressions mathématiques (calculs, dérivées, simplifications, variables)';
  version = '1.0.0';
  domain = 'utility';
  capabilities = ['calculate', 'derive', 'simplify', 'solve'];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { parameters } = props;
    const expressions = parameters?.expressions as string | string[] | undefined;

    if (!expressions) {
      return { success: false, output: null, error: 'Le paramètre "expressions" est requis' };
    }

    const exprList = Array.isArray(expressions) ? expressions : [expressions];

    try {
      const math = await getMath();
      const scope: Record<string, unknown> = {};
      const results: Array<{ expression: string; result: string; type: string }> = [];

      for (const expr of exprList) {
        try {
          // Variable assignment (e.g., "x = 5")
          if (expr.includes('=') && !expr.includes('==')) {
            const [name, value] = expr.split('=').map(s => s.trim());
            if (name && value) {
              const evaluated = math.evaluate(value, scope);
              scope[name] = evaluated;
              results.push({
                expression: expr,
                result: String(evaluated),
                type: 'assignment',
              });
              continue;
            }
          }

          // Derivative
          if (expr.startsWith('derive(') || expr.startsWith('derivative(')) {
            const match = expr.match(/(?:derive|derivative)\((.+),\s*(\w+)\)/);
            if (match) {
              const derivative = math.derivative(match[1], match[2]);
              results.push({
                expression: expr,
                result: derivative.toString(),
                type: 'derivative',
              });
              continue;
            }
          }

          // Simplify
          if (expr.startsWith('simplify(')) {
            const match = expr.match(/simplify\((.+)\)/);
            if (match) {
              const simplified = math.simplify(match[1]);
              results.push({
                expression: expr,
                result: simplified.toString(),
                type: 'simplification',
              });
              continue;
            }
          }

          // Standard evaluation
          const evaluated = math.evaluate(expr, scope);
          results.push({
            expression: expr,
            result: String(evaluated),
            type: typeof evaluated === 'number' ? 'number' : 'expression',
          });
        } catch (e) {
          results.push({
            expression: expr,
            result: `Erreur: ${(e as Error).message}`,
            type: 'error',
          });
        }
      }

      const variables = Object.entries(scope).map(([name, value]) => ({
        name,
        value: String(value),
        type: typeof value,
      }));

      return {
        success: true,
        output: {
          results,
          variables,
          summary: results.map(r => `${r.expression} = ${r.result}`).join('\n'),
        },
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: `Erreur du moteur mathématique: ${(error as Error).message}`,
      };
    }
  }
}
