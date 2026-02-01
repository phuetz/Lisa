/**
 * Tool Calling Service - Native LLM Function Calling Protocol
 *
 * Provides a unified interface for tool/function calling across all LLM providers.
 * Handles tool registration, format conversion, and execution.
 *
 * Supports:
 * - OpenAI function calling format
 * - Google Gemini function declarations
 * - Anthropic Claude tool use
 */

import type { AIProvider } from './aiService';

// ============================================================================
// Types
// ============================================================================

/**
 * JSON Schema for tool parameters
 */
export interface JSONSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  description?: string;
  enum?: (string | number)[];
  default?: unknown;
}

/**
 * Tool definition - provider-agnostic format
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
  /** Optional handler function */
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Tool call from LLM response
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  tool_call_id: string;
  content: string;
  error?: boolean;
}

// ============================================================================
// Provider-Specific Types
// ============================================================================

/**
 * OpenAI tool format
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JSONSchema;
  };
}

/**
 * Gemini function declaration format
 */
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

/**
 * Claude tool format
 */
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: JSONSchema;
}

// ============================================================================
// Tool Calling Service
// ============================================================================

export class ToolCallingService {
  private tools: Map<string, ToolDefinition> = new Map();
  private executionHistory: Array<{
    toolCall: ToolCall;
    result: ToolResult;
    timestamp: number;
  }> = [];

  // ==========================================================================
  // Tool Registration
  // ==========================================================================

  /**
   * Register a tool
   */
  registerTool(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolCalling] Overwriting existing tool: ${tool.name}`);
    }

    // Validate tool definition
    if (!tool.name || !tool.description) {
      throw new Error('Tool must have name and description');
    }

    this.tools.set(tool.name, tool);
    console.log(`[ToolCalling] Registered tool: ${tool.name}`);
  }

  /**
   * Register multiple tools
   */
  registerTools(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get all registered tools
   */
  getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  // ==========================================================================
  // Format Conversion
  // ==========================================================================

  /**
   * Format tools for OpenAI API
   */
  formatForOpenAI(tools?: ToolDefinition[]): OpenAITool[] {
    const toolList = tools || this.getTools();

    return toolList.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * Format tools for Google Gemini API
   */
  formatForGemini(tools?: ToolDefinition[]): GeminiFunctionDeclaration[] {
    const toolList = tools || this.getTools();

    return toolList.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: this.convertSchemaToGemini(tool.parameters)
    }));
  }

  /**
   * Convert JSON Schema to Gemini format
   */
  private convertSchemaToGemini(schema: JSONSchema): GeminiFunctionDeclaration['parameters'] {
    const properties: Record<string, { type: string; description?: string; enum?: string[] }> = {};

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        properties[key] = {
          type: this.typeToGeminiType(prop.type),
          description: prop.description,
          enum: prop.enum as string[] | undefined
        };
      }
    }

    return {
      type: 'OBJECT',
      properties,
      required: schema.required
    };
  }

  /**
   * Convert JSON Schema type to Gemini type
   */
  private typeToGeminiType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'STRING',
      'number': 'NUMBER',
      'integer': 'INTEGER',
      'boolean': 'BOOLEAN',
      'array': 'ARRAY',
      'object': 'OBJECT'
    };
    return typeMap[type] || 'STRING';
  }

  /**
   * Format tools for Anthropic Claude API
   */
  formatForClaude(tools?: ToolDefinition[]): ClaudeTool[] {
    const toolList = tools || this.getTools();

    return toolList.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    }));
  }

  /**
   * Format tools for a specific provider
   */
  formatForProvider(provider: AIProvider, tools?: ToolDefinition[]): unknown {
    switch (provider) {
      case 'openai':
        return this.formatForOpenAI(tools);
      case 'gemini':
        return { functionDeclarations: this.formatForGemini(tools) };
      case 'anthropic':
        return this.formatForClaude(tools);
      default:
        return this.formatForOpenAI(tools);
    }
  }

  // ==========================================================================
  // Response Parsing
  // ==========================================================================

  /**
   * Parse tool calls from LLM response
   */
  parseToolCalls(response: unknown, provider: AIProvider): ToolCall[] {
    switch (provider) {
      case 'openai':
      case 'lmstudio':
        return this.parseOpenAIToolCalls(response);
      case 'gemini':
        return this.parseGeminiToolCalls(response);
      case 'anthropic':
        return this.parseClaudeToolCalls(response);
      default:
        return this.parseOpenAIToolCalls(response);
    }
  }

  /**
   * Parse OpenAI tool calls
   */
  private parseOpenAIToolCalls(response: unknown): ToolCall[] {
    const resp = response as {
      choices?: Array<{
        message?: {
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };

    const toolCalls = resp.choices?.[0]?.message?.tool_calls;
    if (!toolCalls) return [];

    return toolCalls.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: this.safeParseJSON(tc.function.arguments)
    }));
  }

  /**
   * Parse Gemini tool calls
   */
  private parseGeminiToolCalls(response: unknown): ToolCall[] {
    const resp = response as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            functionCall?: { name: string; args: Record<string, unknown> };
          }>;
        };
      }>;
    };

    const parts = resp.candidates?.[0]?.content?.parts;
    if (!parts) return [];

    return parts
      .filter(p => p.functionCall)
      .map((p, idx) => ({
        id: `gemini-call-${idx}-${Date.now()}`,
        name: p.functionCall!.name,
        arguments: p.functionCall!.args
      }));
  }

  /**
   * Parse Claude tool calls
   */
  private parseClaudeToolCalls(response: unknown): ToolCall[] {
    const resp = response as {
      content?: Array<{
        type: string;
        id?: string;
        name?: string;
        input?: Record<string, unknown>;
      }>;
    };

    if (!resp.content) return [];

    return resp.content
      .filter(c => c.type === 'tool_use')
      .map(c => ({
        id: c.id || `claude-call-${Date.now()}`,
        name: c.name || '',
        arguments: c.input || {}
      }));
  }

  /**
   * Safely parse JSON arguments
   */
  private safeParseJSON(str: string): Record<string, unknown> {
    try {
      return JSON.parse(str);
    } catch {
      console.warn('[ToolCalling] Failed to parse arguments:', str);
      return {};
    }
  }

  // ==========================================================================
  // Tool Execution
  // ==========================================================================

  /**
   * Execute a tool call
   */
  async executeTool(call: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(call.name);

    if (!tool) {
      return {
        tool_call_id: call.id,
        content: JSON.stringify({ error: `Unknown tool: ${call.name}` }),
        error: true
      };
    }

    if (!tool.handler) {
      return {
        tool_call_id: call.id,
        content: JSON.stringify({ error: `Tool ${call.name} has no handler` }),
        error: true
      };
    }

    try {
      console.log(`[ToolCalling] Executing tool: ${call.name}`, call.arguments);

      const result = await tool.handler(call.arguments);

      const toolResult: ToolResult = {
        tool_call_id: call.id,
        content: typeof result === 'string' ? result : JSON.stringify(result)
      };

      // Record execution
      this.executionHistory.push({
        toolCall: call,
        result: toolResult,
        timestamp: Date.now()
      });

      return toolResult;
    } catch (error) {
      console.error(`[ToolCalling] Tool execution error:`, error);

      return {
        tool_call_id: call.id,
        content: JSON.stringify({
          error: error instanceof Error ? error.message : 'Tool execution failed'
        }),
        error: true
      };
    }
  }

  /**
   * Execute multiple tool calls
   */
  async executeTools(calls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(calls.map(call => this.executeTool(call)));
  }

  // ==========================================================================
  // Result Formatting
  // ==========================================================================

  /**
   * Format tool results for OpenAI API
   */
  formatResultsForOpenAI(results: ToolResult[]): Array<{ role: 'tool'; tool_call_id: string; content: string }> {
    return results.map(r => ({
      role: 'tool' as const,
      tool_call_id: r.tool_call_id,
      content: r.content
    }));
  }

  /**
   * Format tool results for Gemini API
   */
  formatResultsForGemini(results: ToolResult[]): Array<{ functionResponse: { name: string; response: unknown } }> {
    return results.map(r => {
      // Find the original call to get the function name
      const historyEntry = this.executionHistory.find(h => h.result.tool_call_id === r.tool_call_id);

      return {
        functionResponse: {
          name: historyEntry?.toolCall.name || 'unknown',
          response: this.safeParseJSON(r.content)
        }
      };
    });
  }

  /**
   * Format tool results for Claude API
   */
  formatResultsForClaude(results: ToolResult[]): Array<{ type: 'tool_result'; tool_use_id: string; content: string }> {
    return results.map(r => ({
      type: 'tool_result' as const,
      tool_use_id: r.tool_call_id,
      content: r.content
    }));
  }

  /**
   * Format results for a specific provider
   */
  formatResultsForProvider(provider: AIProvider, results: ToolResult[]): unknown {
    switch (provider) {
      case 'openai':
        return this.formatResultsForOpenAI(results);
      case 'gemini':
        return this.formatResultsForGemini(results);
      case 'anthropic':
        return this.formatResultsForClaude(results);
      default:
        return this.formatResultsForOpenAI(results);
    }
  }

  // ==========================================================================
  // History & Stats
  // ==========================================================================

  /**
   * Get execution history
   */
  getHistory(): typeof this.executionHistory {
    return [...this.executionHistory];
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Get execution stats
   */
  getStats(): {
    registeredTools: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
  } {
    const successful = this.executionHistory.filter(h => !h.result.error).length;

    return {
      registeredTools: this.tools.size,
      totalExecutions: this.executionHistory.length,
      successfulExecutions: successful,
      failedExecutions: this.executionHistory.length - successful
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const toolCallingService = new ToolCallingService();

// ============================================================================
// Built-in Tools
// ============================================================================

/**
 * Register common built-in tools
 */
export function registerBuiltInTools(): void {
  // Current time tool
  toolCallingService.registerTool({
    name: 'get_current_time',
    description: 'Get the current date and time',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone (e.g., "Europe/Paris", "America/New_York")'
        }
      }
    },
    handler: async (args) => {
      const tz = args.timezone as string | undefined;
      const now = new Date();

      if (tz) {
        return now.toLocaleString('en-US', { timeZone: tz });
      }

      return now.toISOString();
    }
  });

  // Calculator tool
  toolCallingService.registerTool({
    name: 'calculator',
    description: 'Perform basic mathematical calculations',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)")'
        }
      },
      required: ['expression']
    },
    handler: async (args) => {
      const expr = args.expression as string;

      // Safe math evaluation (no eval)
      const sanitized = expr.replace(/[^0-9+\-*/().sqrt\s]/gi, '');

      // Replace sqrt with Math.sqrt
      const withMath = sanitized.replace(/sqrt/gi, 'Math.sqrt');

      try {
        // Use Function constructor for safer evaluation
        const result = new Function(`return ${withMath}`)();
        return { result, expression: expr };
      } catch (error) {
        return { error: 'Invalid expression', expression: expr };
      }
    }
  });

  console.log('[ToolCalling] Built-in tools registered');
}

export default toolCallingService;
