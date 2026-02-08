/**
 * AbstractAgent - Base class that eliminates boilerplate across all agents.
 *
 * Provides:
 * - Automatic execution timing + metadata
 * - Validation before execution (override validateInput)
 * - Consistent error handling
 * - canHandle() with keyword/regex matching
 * - getRequiredParameters() from Zod schemas
 * - getCapabilities() auto-generation
 */

import type {
  BaseAgent,
  AgentDomain,
  AgentExecuteProps,
  AgentExecuteResult,
  AgentParameter,
  AgentCapability,
  NodeInputOutput,
} from './types';
import { z } from 'zod';

export abstract class AbstractAgent implements BaseAgent {
  // Subclasses must define these
  abstract name: string;
  abstract description: string;
  abstract version: string;
  abstract domain: AgentDomain;
  abstract capabilities: string[];

  // Optional workflow editor metadata
  inputs?: NodeInputOutput[];
  outputs?: NodeInputOutput[];
  configSchema?: z.ZodObject<any>;

  /**
   * Subclasses implement this instead of execute().
   * Throw to signal failure; return value becomes output.
   */
  protected abstract run(
    intent: string,
    parameters: Record<string, any>,
    props: AgentExecuteProps
  ): Promise<any>;

  /**
   * Main execution method. Handles timing, validation, error wrapping.
   * Do NOT override this — override run() instead.
   */
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = performance.now();
    const intent = (props.intent || props.command || '') as string;
    const parameters = props.parameters || {};

    try {
      // Run validation if implemented
      const validation = await this.validateInput(props);
      if (!validation.valid) {
        return this.fail(
          `Validation failed: ${validation.errors?.join(', ')}`,
          startTime
        );
      }

      const output = await this.run(intent, parameters, props);

      return {
        success: true,
        output,
        metadata: {
          executionTime: Math.round(performance.now() - startTime),
          source: this.name,
          timestamp: Date.now(),
        },
      };
    } catch (error: any) {
      console.error(`[${this.name}] error executing ${intent}:`, error);
      return this.fail(
        error.message || 'Unknown error',
        startTime,
        error.stack
      );
    }
  }

  /**
   * Override to add input validation. Default: always valid.
   */
  async validateInput(
    _props: AgentExecuteProps
  ): Promise<{ valid: boolean; errors?: string[] }> {
    return { valid: true };
  }

  /**
   * Override to score how well this agent can handle a query.
   * Default implementation uses keywords and regexPatterns properties.
   */
  async canHandle(query: string, _context?: any): Promise<number> {
    const lower = query.toLowerCase();

    // Check regex patterns first (higher confidence)
    for (const regex of this.regexPatterns) {
      if (regex.test(lower)) return 0.85;
    }

    // Check keywords (medium confidence)
    for (const kw of this.keywords) {
      if (lower.includes(kw.toLowerCase())) return 0.65;
    }

    return 0;
  }

  /**
   * Override these to configure canHandle() matching.
   */
  protected get keywords(): string[] {
    return [];
  }
  protected get regexPatterns(): RegExp[] {
    return [];
  }

  /**
   * Auto-generates parameter list from a Zod schema.
   */
  protected parametersFromSchema(schema: z.ZodObject<any>): AgentParameter[] {
    const params: AgentParameter[] = [];
    if (!schema?.shape) return params;

    for (const [key, field] of Object.entries(schema.shape)) {
      const zodField = field as z.ZodTypeAny;
      params.push({
        name: key,
        type: this.zodTypeToString(zodField),
        required: !zodField.isOptional(),
        description: zodField.description,
      });
    }
    return params;
  }

  /**
   * Default getRequiredParameters. Override for custom behavior.
   */
  async getRequiredParameters(_task: string): Promise<AgentParameter[]> {
    if (this.configSchema) {
      return this.parametersFromSchema(this.configSchema);
    }
    return [];
  }

  /**
   * Default getCapabilities. Auto-generates from capabilities array.
   */
  async getCapabilities(): Promise<AgentCapability[]> {
    return this.capabilities.map((cap) => ({
      name: cap,
      description: `${this.name}: ${cap}`,
      requiredParameters: [],
    }));
  }

  // ── Helpers ──────────────────────────────────────────────

  /** Build a failure result with timing metadata. */
  protected fail(error: string, startTime: number, stack?: string): AgentExecuteResult {
    return {
      success: false,
      output: null,
      error,
      metadata: {
        executionTime: Math.round(performance.now() - startTime),
        source: this.name,
        timestamp: Date.now(),
        ...(stack ? { stack } : {}),
      },
    };
  }

  /** Map a Zod type to a simple string type name. */
  private zodTypeToString(
    field: z.ZodTypeAny
  ): 'string' | 'number' | 'boolean' | 'array' | 'object' {
    const typeName = (field as any)._def?.typeName;
    switch (typeName) {
      case 'ZodString':
      case 'ZodEnum':
      case 'ZodLiteral':
      case 'ZodDate':
        return 'string';
      case 'ZodNumber':
        return 'number';
      case 'ZodBoolean':
        return 'boolean';
      case 'ZodArray':
      case 'ZodTuple':
        return 'array';
      case 'ZodObject':
      case 'ZodRecord':
      case 'ZodMap':
        return 'object';
      case 'ZodOptional':
      case 'ZodDefault':
      case 'ZodNullable':
        return this.zodTypeToString((field as any)._def.innerType);
      case 'ZodUnion':
      case 'ZodDiscriminatedUnion': {
        const options = (field as any)._def.options;
        if (options?.[0]) return this.zodTypeToString(options[0]);
        return 'string';
      }
      default:
        return 'string';
    }
  }
}
