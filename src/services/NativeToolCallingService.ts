/**
 * Native Tool Calling Service
 * 
 * Implémente le tool calling natif pour OpenAI et Anthropic
 * avec boucle d'exécution et validation des résultats.
 */

import { z } from 'zod';

// ============================================================================
// Types & Schemas
// ============================================================================

export type ToolScope = 
  | 'read:memory'
  | 'write:memory'
  | 'read:calendar'
  | 'write:calendar'
  | 'read:device'
  | 'write:device'
  | 'sensors:camera'
  | 'sensors:microphone'
  | 'workflow:execute'
  | 'agent:invoke'
  | 'system:status';

export const ToolScopeSchema = z.enum([
  'read:memory',
  'write:memory',
  'read:calendar',
  'write:calendar',
  'read:device',
  'write:device',
  'sensors:camera',
  'sensors:microphone',
  'workflow:execute',
  'agent:invoke',
  'system:status'
]);

export interface ToolDefinition {
  name: string;
  description: string;
  scopes: ToolScope[];
  inputSchema: z.ZodType;
  handler: (args: unknown) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
  durationMs?: number;
  traceId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  toolCallId: string;
  name: string;
  result: ToolResult;
}

export interface NativeToolCallResponse {
  finalResponse?: string;
  toolCalls: ToolCallResult[];
  totalDurationMs: number;
  traceId: string;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

// ============================================================================
// Tool Registry with Scopes
// ============================================================================

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private grantedScopes: Set<ToolScope> = new Set();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  grantScopes(scopes: ToolScope[]): void {
    scopes.forEach(scope => this.grantedScopes.add(scope));
  }

  revokeScopes(scopes: ToolScope[]): void {
    scopes.forEach(scope => this.grantedScopes.delete(scope));
  }

  revokeAllScopes(): void {
    this.grantedScopes.clear();
  }

  hasScope(scope: ToolScope): boolean {
    return this.grantedScopes.has(scope);
  }

  getGrantedScopes(): ToolScope[] {
    return Array.from(this.grantedScopes);
  }

  isToolAllowed(toolName: string): boolean {
    const tool = this.tools.get(toolName);
    if (!tool) return false;
    return tool.scopes.every(scope => this.grantedScopes.has(scope));
  }

  getAllowedTools(): ToolDefinition[] {
    return this.getAll().filter(tool => this.isToolAllowed(tool.name));
  }

  getToolsForOpenAI(): OpenAITool[] {
    return this.getAllowedTools().map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: this.zodToJsonSchema(tool.inputSchema)
      }
    }));
  }

  getToolsForAnthropic(): AnthropicTool[] {
    return this.getAllowedTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: this.zodToJsonSchema(tool.inputSchema)
    }));
  }

  private zodToJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
    // Simple conversion - pour une version complète, utiliser zod-to-json-schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = schema as any;
    if (s._def?.typeName === 'ZodObject' || s.shape) {
      const shape = s.shape || s._def?.shape?.();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      if (shape) {
        for (const [key, value] of Object.entries(shape)) {
          properties[key] = this.zodTypeToJsonSchema(value as z.ZodType<unknown>);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const v = value as any;
          if (v._def?.typeName !== 'ZodOptional') {
            required.push(key);
          }
        }
      }

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined
      };
    }

    return { type: 'object', properties: {} };
  }

  private zodTypeToJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = schema as any;
    const typeName = s._def?.typeName;
    
    if (typeName === 'ZodString') {
      return { type: 'string' };
    }
    if (typeName === 'ZodNumber') {
      return { type: 'number' };
    }
    if (typeName === 'ZodBoolean') {
      return { type: 'boolean' };
    }
    if (typeName === 'ZodArray') {
      return { type: 'array', items: this.zodTypeToJsonSchema(s._def?.type || s.element) };
    }
    if (typeName === 'ZodEnum') {
      return { type: 'string', enum: s._def?.values || s.options };
    }
    if (typeName === 'ZodOptional') {
      return this.zodTypeToJsonSchema(s._def?.innerType || s.unwrap?.());
    }
    if (typeName === 'ZodObject') {
      return this.zodToJsonSchema(schema);
    }
    return { type: 'string' };
  }
}

// ============================================================================
// OpenAI Types
// ============================================================================

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: 'stop' | 'tool_calls' | 'length';
  }>;
}

// ============================================================================
// Anthropic Types
// ============================================================================

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    tool_use_id?: string;
    content?: string;
  }>;
}

interface AnthropicResponse {
  content: Array<{
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  }>;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens';
}

// ============================================================================
// Native Tool Calling Service
// ============================================================================

export class NativeToolCallingService {
  private registry: ToolRegistry = new ToolRegistry();
  private openaiApiKey?: string;
  private anthropicApiKey?: string;
  private maxIterations: number = 10;
  private defaultModel: string = 'gpt-4o-mini';

  constructor(config?: {
    openaiApiKey?: string;
    anthropicApiKey?: string;
    maxIterations?: number;
    defaultModel?: string;
  }) {
    this.openaiApiKey = config?.openaiApiKey || import.meta.env.VITE_OPENAI_API_KEY;
    this.anthropicApiKey = config?.anthropicApiKey || import.meta.env.VITE_ANTHROPIC_API_KEY;
    this.maxIterations = config?.maxIterations || 10;
    this.defaultModel = config?.defaultModel || 'gpt-4o-mini';
  }

  // Registry access
  getRegistry(): ToolRegistry {
    return this.registry;
  }

  registerTool(tool: ToolDefinition): void {
    this.registry.register(tool);
  }

  grantScopes(scopes: ToolScope[]): void {
    this.registry.grantScopes(scopes);
  }

  revokeScopes(scopes: ToolScope[]): void {
    this.registry.revokeScopes(scopes);
  }

  /**
   * Exécuter une conversation avec tool calling natif (OpenAI)
   */
  async executeWithToolsOpenAI(
    messages: ConversationMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      traceId?: string;
    }
  ): Promise<NativeToolCallResponse> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const traceId = options?.traceId || this.generateTraceId();
    const startTime = Date.now();
    const toolResults: ToolCallResult[] = [];
    const tools = this.registry.getToolsForOpenAI();

    // Convertir les messages
    const openaiMessages: OpenAIMessage[] = messages.map(m => ({
      role: m.role === 'tool' ? 'tool' : m.role,
      content: m.content,
      tool_call_id: m.toolCallId
    }));

    let iterations = 0;

    while (iterations < this.maxIterations) {
      iterations++;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: options?.model || this.defaultModel,
          messages: openaiMessages,
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: tools.length > 0 ? 'auto' : undefined,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
      }

      const data: OpenAIResponse = await response.json();
      const choice = data.choices[0];

      // Réponse finale (pas de tool calls)
      if (choice.finish_reason === 'stop' || !choice.message.tool_calls) {
        return {
          finalResponse: choice.message.content || undefined,
          toolCalls: toolResults,
          totalDurationMs: Date.now() - startTime,
          traceId
        };
      }

      // Ajouter le message assistant avec tool_calls
      openaiMessages.push({
        role: 'assistant',
        content: choice.message.content,
        tool_calls: choice.message.tool_calls
      });

      // Exécuter les tool calls
      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        const result = await this.executeTool(toolName, toolArgs, traceId);
        
        toolResults.push({
          toolCallId: toolCall.id,
          name: toolName,
          result
        });

        // Ajouter le résultat comme message tool
        openaiMessages.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id
        });
      }
    }

    throw new Error(`Max iterations (${this.maxIterations}) reached without final response`);
  }

  /**
   * Exécuter une conversation avec tool calling natif (Anthropic)
   */
  async executeWithToolsAnthropic(
    messages: ConversationMessage[],
    systemPrompt?: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      traceId?: string;
    }
  ): Promise<NativeToolCallResponse> {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const traceId = options?.traceId || this.generateTraceId();
    const startTime = Date.now();
    const toolResults: ToolCallResult[] = [];
    const tools = this.registry.getToolsForAnthropic();

    // Convertir les messages (Anthropic n'a pas de role 'system' dans messages)
    const anthropicMessages: AnthropicMessage[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    let iterations = 0;

    while (iterations < this.maxIterations) {
      iterations++;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options?.model || 'claude-3-5-sonnet-20241022',
          max_tokens: options?.maxTokens ?? 4096,
          temperature: options?.temperature ?? 0.7,
          system: systemPrompt,
          messages: anthropicMessages,
          tools: tools.length > 0 ? tools : undefined
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Anthropic API Error: ${error.error?.message || response.statusText}`);
      }

      const data: AnthropicResponse = await response.json();

      // Vérifier si on a des tool_use
      const toolUseBlocks = data.content.filter(block => block.type === 'tool_use');
      const textBlocks = data.content.filter(block => block.type === 'text');

      // Réponse finale (pas de tool use)
      if (data.stop_reason === 'end_turn' && toolUseBlocks.length === 0) {
        const finalText = textBlocks.map(b => b.text).join('\n');
        return {
          finalResponse: finalText || undefined,
          toolCalls: toolResults,
          totalDurationMs: Date.now() - startTime,
          traceId
        };
      }

      // Ajouter le message assistant
      anthropicMessages.push({
        role: 'assistant',
        content: data.content.map(block => {
          if (block.type === 'text') {
            return { type: 'text' as const, text: block.text };
          }
          return {
            type: 'tool_use' as const,
            id: block.id,
            name: block.name,
            input: block.input
          };
        })
      });

      // Exécuter les tool calls et préparer les résultats
      const toolResultContents: Array<{
        type: 'tool_result';
        tool_use_id: string;
        content: string;
      }> = [];

      for (const toolUse of toolUseBlocks) {
        const toolName = toolUse.name!;
        const toolArgs = toolUse.input!;

        const result = await this.executeTool(toolName, toolArgs, traceId);
        
        toolResults.push({
          toolCallId: toolUse.id!,
          name: toolName,
          result
        });

        toolResultContents.push({
          type: 'tool_result',
          tool_use_id: toolUse.id!,
          content: JSON.stringify(result)
        });
      }

      // Ajouter les résultats comme message user
      anthropicMessages.push({
        role: 'user',
        content: toolResultContents
      });
    }

    throw new Error(`Max iterations (${this.maxIterations}) reached without final response`);
  }

  /**
   * Exécuter un tool avec validation et timing
   */
  private async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    traceId: string
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const tool = this.registry.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' not found`,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        traceId
      };
    }

    // Vérifier les permissions
    if (!this.registry.isToolAllowed(toolName)) {
      const requiredScopes = tool.scopes.join(', ');
      return {
        success: false,
        error: `Permission denied. Required scopes: ${requiredScopes}`,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        traceId
      };
    }

    // Valider les arguments avec Zod
    const validation = tool.inputSchema.safeParse(args);
    if (!validation.success) {
      return {
        success: false,
        error: `Invalid arguments: ${validation.error.message}`,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        traceId
      };
    }

    // Exécuter le handler
    try {
      const result = await tool.handler(validation.data);
      return {
        ...result,
        durationMs: Date.now() - startTime,
        traceId
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        traceId
      };
    }
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Singleton export
// ============================================================================

export const nativeToolCallingService = new NativeToolCallingService();

export default NativeToolCallingService;
