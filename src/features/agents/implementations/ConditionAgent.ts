import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../core/types';
import { AgentDomains } from '../core/types';

/**
 * Safe expression evaluator with security validation.
 * Only allows simple comparisons, logical operators, arithmetic, and property access.
 * Blocks all dangerous patterns (eval, Function, global access, assignments, etc.)
 */
export class SafeExpressionEvaluator {
  private static readonly UNSAFE_PATTERNS: RegExp[] = [
    /\beval\b/,
    /\bFunction\b/,
    /\bwindow\b/,
    /\bdocument\b/,
    /\bglobalThis\b/,
    /\bprocess\b/,
    /\brequire\s*\(/,
    /\bimport\s*\(/,
    /__proto__/,
    /\.constructor\b/,
    /\.prototype\b/,
    /`/,                        // template literals
    /(?<![!=<>])=(?!=)/,        // assignment (not ==, !=, <=, >=, ===, !==)
    /\+\+/,                     // increment
    /--/,                       // decrement
    /\bthis\b/,
    /\bnew\b/,
    /=>/,                       // arrow functions
    /\bfunction\b/,
    /\[["']/,                   // bracket notation with strings
    /\w+\s*\(/,                 // function calls
  ];

  static validate(condition: string): { valid: boolean; error?: string } {
    if (!condition || typeof condition !== 'string') {
      return { valid: false, error: 'Condition must be a non-empty string' };
    }

    for (const pattern of SafeExpressionEvaluator.UNSAFE_PATTERNS) {
      if (pattern.test(condition)) {
        return { valid: false, error: 'Unsafe pattern detected in expression' };
      }
    }

    return { valid: true };
  }

  static evaluate(condition: string, input: unknown, context: Record<string, unknown>): boolean {
    const validation = SafeExpressionEvaluator.validate(condition);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Use a Proxy so that undefined variables return undefined instead of throwing ReferenceError
    const BUILTINS = new Set([
      'Boolean', 'Number', 'String', 'Array', 'Object', 'Date', 'Math', 'JSON',
      'undefined', 'NaN', 'Infinity', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
      'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent',
      'RegExp', 'Error', 'TypeError', 'RangeError', 'Map', 'Set', 'Promise',
      'input', 'context', // Function parameter names - must not be intercepted by Proxy
    ]);
    const safeContext = new Proxy(context || {}, {
      has(_target, prop) {
        if (typeof prop === 'symbol') return false;
        if (BUILTINS.has(prop as string)) return false;
        return true;
      },
      get(target, prop) {
        if (typeof prop === 'string' && prop in target) {
          return (target as Record<string, unknown>)[prop];
        }
        return undefined;
      }
    });

    const func = new Function('input', 'context', `with (context) { return Boolean(${condition}); }`);
    return func(input, safeContext);
  }
}

export class ConditionAgent implements BaseAgent {
  name = 'ConditionAgent';
  description = 'Evaluates conditions in workflows.';
  version = '1.0.0';
  domain = AgentDomains.ANALYSIS;
  capabilities = ['evaluateCondition', 'validateCondition'];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, parameters } = props;

    if (intent === 'validateCondition') {
      const { condition } = parameters;
      const validation = SafeExpressionEvaluator.validate(condition);
      return {
        success: true,
        output: { valid: validation.valid, error: validation.error },
      };
    }

    if (intent === 'evaluateCondition') {
      const { condition, input, context } = parameters;

      try {
        const result = SafeExpressionEvaluator.evaluate(condition, input, context || {});
        return {
          success: true,
          output: {
            result,
            path: result ? 'true' : 'false',
            original: input,
          },
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, output: null, error: `Condition evaluation failed: ${message}` };
      }
    }

    return { success: false, output: null, error: `Unknown intent: ${intent}` };
  }
}
