/**
 * Tool Calling Service - Native LLM Function Calling Protocol
 *
 * Uses shared types and format converters from @phuetz/ai-providers.
 * Keeps Lisa-specific service class (tool registry, execution, history).
 */

import type { AIProvider } from './aiService';
import { safeEvaluate } from '../features/workflow/executor/SafeEvaluator';

// Import and re-export shared types from @phuetz/ai-providers
import type {
  ToolDefinition as SharedToolDefinition,
  ToolResult as SharedToolResult,
  JSONSchema as SharedJSONSchema,
} from '@phuetz/ai-providers';
import {
  toOpenAITools,
  toGeminiTools,
  toClaudeTools,
  parseOpenAIToolCalls as sharedParseOpenAIToolCalls,
  parseGeminiToolCalls as sharedParseGeminiToolCalls,
  parseClaudeToolCalls as sharedParseClaudeToolCalls,
  parseToolArguments,
  hasToolCalls,
  toOpenAIToolResult,
  toGeminiFunctionResponse,
  toClaudeToolResult,
} from '@phuetz/ai-providers';

// Re-export shared converters and utilities for consumers
export {
  toOpenAITools,
  toGeminiTools,
  toClaudeTools,
  parseToolArguments,
  hasToolCalls,
  toOpenAIToolResult,
  toGeminiFunctionResponse,
  toClaudeToolResult,
};

// ============================================================================
// Types — Lisa-specific extensions over shared types
//
// Lisa's ToolDefinition adds an optional handler function.
// Lisa's ToolCall uses parsed Record<string, unknown> arguments instead of
// the shared JSON string format.
// We re-export these Lisa-specific interfaces so existing imports work.
// ============================================================================

/**
 * JSON Schema for tool parameters (re-exported from shared package).
 */
export type JSONSchema = SharedJSONSchema;

/**
 * Tool definition - Lisa extension adds optional handler function.
 */
export interface ToolDefinition extends SharedToolDefinition {
  /** Optional handler function for direct execution */
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Tool call from LLM response.
 * Lisa uses parsed arguments (Record) instead of the shared JSON string format.
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Tool execution result (matches shared ToolResult).
 */
export type ToolResult = SharedToolResult;

// ============================================================================
// Provider-Specific Types (kept for backward compat, derived from shared)
// ============================================================================

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JSONSchema;
  };
}

export type { GeminiFunctionDeclaration, ClaudeTool } from '@phuetz/ai-providers';

// ============================================================================
// Tool Calling Service
// ============================================================================

export class ToolCallingService {
  private tools: Map<string, ToolDefinition> = new Map();
  private static readonly MAX_HISTORY_SIZE = 500;
  private executionHistory: Array<{
    toolCall: ToolCall;
    result: ToolResult;
    timestamp: number;
  }> = [];

  // ==========================================================================
  // Tool Registration
  // ==========================================================================

  registerTool(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolCalling] Overwriting existing tool: ${tool.name}`);
    }
    if (!tool.name || !tool.description) {
      throw new Error('Tool must have name and description');
    }
    this.tools.set(tool.name, tool);
    console.log(`[ToolCalling] Registered tool: ${tool.name}`);
  }

  registerTools(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  // ==========================================================================
  // Format Conversion — delegates to @phuetz/ai-providers
  // ==========================================================================

  formatForOpenAI(tools?: ToolDefinition[]): OpenAITool[] {
    const toolList = tools || this.getTools();
    return toOpenAITools(toolList) as OpenAITool[];
  }

  formatForGemini(tools?: ToolDefinition[]) {
    const toolList = tools || this.getTools();
    return toGeminiTools(toolList);
  }

  formatForClaude(tools?: ToolDefinition[]) {
    const toolList = tools || this.getTools();
    return toClaudeTools(toolList);
  }

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
  //
  // The shared parsers return SharedToolCall (with JSON string arguments).
  // Lisa expects ToolCall with parsed Record arguments.
  // We bridge by parsing the JSON string.
  // ==========================================================================

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

  private parseOpenAIToolCalls(response: unknown): ToolCall[] {
    const resp = response as {
      choices?: Array<{
        message?: {
          tool_calls?: Array<{
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };

    const toolCalls = resp.choices?.[0]?.message?.tool_calls;
    if (!toolCalls) return [];

    // Use shared parser, then convert to Lisa's parsed-arguments format
    const shared = sharedParseOpenAIToolCalls(toolCalls);
    return shared.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: parseToolArguments(tc.function.arguments),
    }));
  }

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

    // Use shared parser, then convert to Lisa's parsed-arguments format
    const shared = sharedParseGeminiToolCalls(parts);
    return shared.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: parseToolArguments(tc.function.arguments),
    }));
  }

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

    // Use shared parser, then convert to Lisa's parsed-arguments format
    const shared = sharedParseClaudeToolCalls(resp.content);
    return shared.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: parseToolArguments(tc.function.arguments),
    }));
  }

  // ==========================================================================
  // Tool Execution (Lisa-specific)
  // ==========================================================================

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

      this.executionHistory.push({
        toolCall: call,
        result: toolResult,
        timestamp: Date.now()
      });
      // Trim history to prevent unbounded growth
      if (this.executionHistory.length > ToolCallingService.MAX_HISTORY_SIZE) {
        this.executionHistory = this.executionHistory.slice(-ToolCallingService.MAX_HISTORY_SIZE);
      }

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

  async executeTools(calls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(calls.map(call => this.executeTool(call)));
  }

  // ==========================================================================
  // Result Formatting
  // ==========================================================================

  formatResultsForOpenAI(results: ToolResult[]): Array<{ role: 'tool'; tool_call_id: string; content: string }> {
    return results.map(r => ({
      role: 'tool' as const,
      tool_call_id: r.tool_call_id,
      content: r.content
    }));
  }

  formatResultsForGemini(results: ToolResult[]): Array<{ functionResponse: { name: string; response: unknown } }> {
    return results.map(r => {
      const historyEntry = this.executionHistory.find(h => h.result.tool_call_id === r.tool_call_id);
      return {
        functionResponse: {
          name: historyEntry?.toolCall.name || 'unknown',
          response: parseToolArguments(r.content)
        }
      };
    });
  }

  formatResultsForClaude(results: ToolResult[]): Array<{ type: 'tool_result'; tool_use_id: string; content: string }> {
    return results.map(r => ({
      type: 'tool_result' as const,
      tool_use_id: r.tool_call_id,
      content: r.content
    }));
  }

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

  getHistory(): typeof this.executionHistory {
    return [...this.executionHistory];
  }

  clearHistory(): void {
    this.executionHistory = [];
  }

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

export function registerBuiltInTools(): void {
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
      const sanitized = expr.replace(/[^0-9+\-*/().sqrt\s]/gi, '');
      const withMath = sanitized.replace(/sqrt/gi, 'Math.sqrt');

      try {
        const result = safeEvaluate(withMath, {});
        return { result, expression: expr };
      } catch (error) {
        return { error: 'Invalid expression', expression: expr };
      }
    }
  });

  console.log('[ToolCalling] Built-in tools registered');
}

export default toolCallingService;
