/**
 * AI With Tools Service - LLM with Native Tool Calling
 *
 * Wraps aiService to add native function/tool calling capabilities.
 * The LLM can decide when to use tools (web search, fetch URL, etc.)
 * and this service handles the tool execution loop automatically.
 *
 * Flow:
 * 1. User sends message
 * 2. LLM receives message + tool definitions
 * 3. LLM may respond with tool calls
 * 4. Service executes tools and sends results back
 * 5. LLM generates final response
 * 6. Response returned to user
 */

import { aiService, type AIMessage, type AIStreamChunk, type AIProvider } from './aiService';
import { toolCallingService, type ToolCall, type ToolResult, type ToolDefinition } from './ToolCallingService';
import { registerWebTools, getWebTools } from './WebTools';
import { registerTodoTools, getTodoTools } from './TodoTools';

// Re-export for external use
export { getWebTools, getTodoTools };

// ============================================================================
// Types
// ============================================================================

export interface AIWithToolsConfig {
  /** Enable tool calling (default: true) */
  enableTools: boolean;
  /** Maximum tool call iterations (default: 5) */
  maxIterations: number;
  /** Tools to make available (default: all registered) */
  tools?: ToolDefinition[];
  /** Show tool usage in response (default: true) */
  showToolUsage: boolean;
}

export interface ToolUsageInfo {
  toolName: string;
  arguments: Record<string, unknown>;
  result: unknown;
  duration: number;
}

export interface AIWithToolsResponse {
  content: string;
  toolsUsed: ToolUsageInfo[];
  iterations: number;
}

// ============================================================================
// Constants
// ============================================================================

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const DEFAULT_CONFIG: AIWithToolsConfig = {
  enableTools: true,
  maxIterations: 5,
  showToolUsage: true
};

// ============================================================================
// AI With Tools Service
// ============================================================================

class AIWithToolsService {
  private config: AIWithToolsConfig;
  private initialized = false;

  constructor(config?: Partial<AIWithToolsConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the service and register tools
   */
  initialize(): void {
    if (this.initialized) return;

    // Register web tools
    registerWebTools();

    // Register todo tools
    registerTodoTools();

    this.initialized = true;
    const tools = toolCallingService.getTools();
    console.log('[AIWithTools] Initialized with', tools.length, 'tools:', tools.map(t => t.name));
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Send a message with tool support (non-streaming)
   */
  async sendMessage(messages: AIMessage[]): Promise<AIWithToolsResponse> {
    this.initialize();

    if (!this.config.enableTools) {
      const content = await aiService.sendMessage(messages);
      return { content, toolsUsed: [], iterations: 1 };
    }

    return this.sendWithToolLoop(messages);
  }

  /**
   * Stream a message with tool support
   */
  async *streamMessage(messages: AIMessage[]): AsyncGenerator<AIStreamChunk & { toolUsage?: ToolUsageInfo }> {
    this.initialize();

    if (!this.config.enableTools) {
      yield* aiService.streamMessage(messages);
      return;
    }

    yield* this.streamWithToolLoop(messages);
  }

  /**
   * Main tool execution loop (non-streaming)
   */
  private async sendWithToolLoop(messages: AIMessage[]): Promise<AIWithToolsResponse> {
    const toolsUsed: ToolUsageInfo[] = [];
    let iterations = 0;
    let currentMessages = [...messages];

    const config = aiService.getConfig();
    const provider = config.provider;

    while (iterations < this.config.maxIterations) {
      iterations++;

      // Make API call with tools
      const response = await this.callWithTools(currentMessages, provider);

      // Check for tool calls
      const toolCalls = toolCallingService.parseToolCalls(response, provider);

      if (toolCalls.length === 0) {
        // No tool calls, extract final response
        const content = this.extractContent(response, provider);
        return { content, toolsUsed, iterations };
      }

      // Execute tool calls
      console.log(`[AIWithTools] Executing ${toolCalls.length} tool calls`);

      for (const call of toolCalls) {
        const startTime = Date.now();
        const result = await toolCallingService.executeTool(call);
        const duration = Date.now() - startTime;

        toolsUsed.push({
          toolName: call.name,
          arguments: call.arguments,
          result: JSON.parse(result.content),
          duration
        });

        // Add tool result to messages
        currentMessages = this.addToolResultToMessages(
          currentMessages,
          call,
          result,
          provider
        );
      }
    }

    // Max iterations reached
    const finalContent = await aiService.sendMessage(currentMessages);
    return { content: finalContent, toolsUsed, iterations };
  }

  /**
   * Streaming tool execution loop
   */
  private async *streamWithToolLoop(
    messages: AIMessage[]
  ): AsyncGenerator<AIStreamChunk & { toolUsage?: ToolUsageInfo }> {
    let iterations = 0;
    let currentMessages = [...messages];

    const config = aiService.getConfig();
    const provider = config.provider;

    console.log('[AIWithTools] streamWithToolLoop - provider:', provider, 'maxIterations:', this.config.maxIterations);

    while (iterations < this.config.maxIterations) {
      iterations++;
      console.log('[AIWithTools] Iteration', iterations);

      // For streaming, we need to collect the full response first to check for tool calls
      const response = await this.callWithTools(currentMessages, provider);
      console.log('[AIWithTools] Response received:', JSON.stringify(response).slice(0, 500));

      const toolCalls = toolCallingService.parseToolCalls(response, provider);
      console.log('[AIWithTools] Parsed tool calls:', toolCalls.length, toolCalls.map(tc => tc.name));

      if (toolCalls.length === 0) {
        // No tool calls - stream the response
        const content = this.extractContent(response, provider);

        // Simulate streaming for the final response
        const words = content.split(' ');
        for (let i = 0; i < words.length; i++) {
          yield {
            content: words[i] + (i < words.length - 1 ? ' ' : ''),
            done: false
          };
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 20));
        }

        yield { content: '', done: true };
        return;
      }

      // Execute tool calls and notify
      for (const call of toolCalls) {
        // Notify about tool execution
        if (this.config.showToolUsage) {
          yield {
            content: `\n🔧 *Utilisation de ${call.name}...*\n`,
            done: false
          };
        }

        const startTime = Date.now();
        const result = await toolCallingService.executeTool(call);
        const duration = Date.now() - startTime;

        const toolUsage: ToolUsageInfo = {
          toolName: call.name,
          arguments: call.arguments,
          result: JSON.parse(result.content),
          duration
        };

        // Show tool result preview
        if (this.config.showToolUsage) {
          const preview = this.formatToolResultPreview(toolUsage);
          yield {
            content: preview + '\n\n',
            done: false,
            toolUsage
          };
        }

        // Add tool result to messages
        currentMessages = this.addToolResultToMessages(
          currentMessages,
          call,
          result,
          provider
        );
      }
    }

    yield { content: '[Max iterations reached]', done: true };
  }

  /**
   * Make API call with tool definitions
   */
  private async callWithTools(
    messages: AIMessage[],
    provider: AIProvider
  ): Promise<unknown> {
    const config = aiService.getConfig();
    const tools = this.config.tools || getWebTools();

    console.log('[AIWithTools] callWithTools - provider:', provider, 'tools:', tools.map(t => t.name));

    // Different API calls based on provider
    switch (provider) {
      case 'gemini':
        console.log('[AIWithTools] Using Gemini with tools');
        return this.callGeminiWithTools(messages, tools, config);
      case 'openai':
        console.log('[AIWithTools] Using OpenAI with tools');
        return this.callOpenAIWithTools(messages, tools, config);
      case 'anthropic':
        console.log('[AIWithTools] Using Anthropic with tools');
        return this.callAnthropicWithTools(messages, tools, config);
      case 'lmstudio':
        // LM Studio uses OpenAI-compatible API with tool support
        console.log('[AIWithTools] Using LM Studio (OpenAI-compatible) with tools');
        return this.callLMStudioWithTools(messages, tools, config);
      default: {
        // Fallback: no tool support, just make regular call
        console.log('[AIWithTools] Provider', provider, 'not supported for tools, using fallback');
        const content = await aiService.sendMessage(messages);
        return { content };
      }
    }
  }

  /**
   * Call Gemini API with function declarations
   */
  private async callGeminiWithTools(
    messages: AIMessage[],
    tools: ToolDefinition[],
    config: { apiKey?: string; model?: string; temperature?: number; maxTokens?: number }
  ): Promise<unknown> {
    const apiKey = config.apiKey || import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not configured');

    const model = config.model || 'gemini-2.0-flash';

    // Format messages for Gemini with proper function call/response handling
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const contents: Array<{
      role: string;
      parts: Array<{ text?: string; functionCall?: unknown; functionResponse?: unknown }>;
    }> = [];

    for (const msg of conversationMessages) {
      // Check for special Gemini function call/response markers
      try {
        const parsed = JSON.parse(msg.content);

        if (parsed._gemini_function_call) {
          // This is a function call from the model
          contents.push({
            role: 'model',
            parts: [{
              functionCall: {
                name: parsed._gemini_function_call.name,
                args: parsed._gemini_function_call.args
              }
            }]
          });
          continue;
        }

        if (parsed._gemini_function_response) {
          // This is a function response - Gemini expects role: 'function'
          contents.push({
            role: 'function',  // ✅ Correct: Gemini expects 'function', not 'user'
            parts: [{
              functionResponse: {
                name: parsed._gemini_function_response.name,
                response: {
                  name: parsed._gemini_function_response.name,
                  content: parsed._gemini_function_response.response  // ✅ Correct structure
                }
              }
            }]
          });
          continue;
        }
      } catch {
        // Not JSON, treat as regular message
      }

      // Regular text message
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    // Format tools for Gemini
    const functionDeclarations = toolCallingService.formatForGemini(tools);

    // Detect if this query should force tool usage
    // BUT only force on FIRST call - if we already have function responses, use AUTO
    const hasExistingFunctionResponse = contents.some(c =>
      c.parts.some(p => p.functionResponse !== undefined)
    );
    const forceTools = !hasExistingFunctionResponse && this.shouldForceToolUse(messages);
    const toolMode = forceTools ? 'ANY' : 'AUTO';

    console.log('[AIWithTools] Gemini request:', {
      model,
      contentsCount: contents.length,
      toolsCount: functionDeclarations.length,
      mode: toolMode,
      forceTools,
      systemPromptLength: systemMessage?.content.length || 0
    });

    const response = await fetch(
      `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemMessage ? {
            parts: [{ text: systemMessage.content }]
          } : undefined,
          tools: [{ functionDeclarations }],
          toolConfig: {
            functionCallingConfig: {
              mode: toolMode  // ANY forces tool use, AUTO lets model decide
            }
          },
          generationConfig: {
            temperature: config.temperature || 0.7,
            maxOutputTokens: config.maxTokens || 4096
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[AIWithTools] Gemini API error:', error);
      throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('[AIWithTools] Gemini response:', JSON.stringify(result).slice(0, 500));
    return result;
  }

  /**
   * Call OpenAI API with function calling
   */
  private async callOpenAIWithTools(
    messages: AIMessage[],
    tools: ToolDefinition[],
    config: { apiKey?: string; model?: string; temperature?: number; maxTokens?: number }
  ): Promise<unknown> {
    const apiKey = config.apiKey || import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const model = config.model || 'gpt-4o-mini';

    // Format tools for OpenAI
    const openaiTools = toolCallingService.formatForOpenAI(tools);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        tools: openaiTools,
        tool_choice: 'auto',
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 4096
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Call Anthropic API with tool use
   */
  private async callAnthropicWithTools(
    messages: AIMessage[],
    tools: ToolDefinition[],
    config: { apiKey?: string; model?: string; temperature?: number; maxTokens?: number }
  ): Promise<unknown> {
    const apiKey = config.apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Anthropic API key not configured');

    const model = config.model || 'claude-3-5-sonnet-20241022';

    // Format tools for Claude
    const claudeTools = toolCallingService.formatForClaude(tools);

    // Extract system message
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        system: systemMessage?.content,
        messages: conversationMessages.map(m => ({ role: m.role, content: m.content })),
        tools: claudeTools,
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature || 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Call LM Studio API with function calling (OpenAI-compatible)
   */
  private async callLMStudioWithTools(
    messages: AIMessage[],
    tools: ToolDefinition[],
    config: { model?: string; temperature?: number; maxTokens?: number; baseURL?: string }
  ): Promise<unknown> {
    const baseUrl = config.baseURL || '/lmstudio/v1';
    const model = config.model || 'local-model';

    // Format tools for OpenAI (LM Studio is OpenAI-compatible)
    const openaiTools = toolCallingService.formatForOpenAI(tools);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        tools: openaiTools,
        tool_choice: 'auto',
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AIWithTools] LM Studio error:', errorText);
      throw new Error(`LM Studio API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Detect if the user's query requires tool usage (news, weather, TV, etc.)
   * Returns true to force ANY mode, false for AUTO mode
   */
  private shouldForceToolUse(messages: AIMessage[]): boolean {
    // Get the last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return false;

    const content = lastUserMessage.content.toLowerCase();

    // Keywords that strongly indicate need for real-time information
    const toolTriggers = [
      // News / Actualités
      'actualités', 'actualité', 'actu', 'news', 'nouvelles',
      'quoi de neuf', "qu'est-ce qui se passe",
      // TV / Programs
      'programme tv', 'programme télé', 'télé ce soir', 'tv ce soir',
      'france 2', 'france 3', 'tf1', 'm6', 'arte', 'canal+',
      "qu'y a-t-il", "qu'est-ce qu'il y a", 'ce soir à la télé',
      // Weather / Météo
      'météo', 'meteo', 'temps qu\'il fait', 'température', 'temperature',
      'va-t-il pleuvoir', 'fait-il beau',
      // Time-sensitive
      'aujourd\'hui', 'ce soir', 'demain', 'cette semaine',
      'en ce moment', 'actuellement',
      // Prices / Commerce
      'prix de', 'coût de', 'combien coûte', 'tarif',
      // Events
      'événements', 'evenements', 'concerts', 'spectacles',
      // Sports
      'score', 'résultat du match', 'classement'
    ];

    const shouldForce = toolTriggers.some(trigger => content.includes(trigger));

    if (shouldForce) {
      console.log('[AIWithTools] Detected tool-requiring query, forcing ANY mode');
    }

    return shouldForce;
  }

  /**
   * Extract text content from provider response
   */
  private extractContent(response: unknown, provider: AIProvider): string {
    switch (provider) {
      case 'gemini': {
        const geminiResp = response as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> }
          }>
        };
        return geminiResp.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
      case 'openai':
      case 'lmstudio': {
        const openaiResp = response as {
          choices?: Array<{ message?: { content?: string } }>
        };
        return openaiResp.choices?.[0]?.message?.content || '';
      }
      case 'anthropic': {
        const claudeResp = response as {
          content?: Array<{ type: string; text?: string }>
        };
        const textBlock = claudeResp.content?.find(c => c.type === 'text');
        return textBlock?.text || '';
      }
      default:
        return '';
    }
  }

  /**
   * Add tool result to messages for next iteration
   * Uses provider-specific formats for proper tool result handling
   */
  private addToolResultToMessages(
    messages: AIMessage[],
    call: ToolCall,
    result: ToolResult,
    provider: AIProvider
  ): AIMessage[] {
    // Parse the result content
    let parsedResult: unknown;
    try {
      parsedResult = JSON.parse(result.content);
    } catch {
      parsedResult = { text: result.content };
    }

    // Provider-specific handling
    switch (provider) {
      case 'gemini': {
        // Gemini expects functionResponse format in the conversation
        // We encode this in a special way that callGeminiWithTools will parse
        return [
          ...messages,
          {
            role: 'assistant',
            content: JSON.stringify({
              _gemini_function_call: {
                name: call.name,
                args: call.arguments
              }
            })
          },
          {
            role: 'user',
            content: JSON.stringify({
              _gemini_function_response: {
                name: call.name,
                response: parsedResult  // This will be wrapped in { name, content } by callGeminiWithTools
              }
            })
          }
        ];
      }

      case 'openai':
      case 'lmstudio': {
        // OpenAI expects tool_calls in assistant message and tool role for results
        return [
          ...messages,
          {
            role: 'assistant',
            content: '',
            tool_calls: [{
              id: call.id,
              type: 'function' as const,
              function: {
                name: call.name,
                arguments: JSON.stringify(call.arguments)
              }
            }]
          },
          {
            role: 'tool',
            content: result.content,
            tool_call_id: call.id
          }
        ];
      }

      case 'anthropic': {
        // Claude expects tool_use and tool_result blocks
        return [
          ...messages,
          {
            role: 'assistant',
            content: JSON.stringify({
              _claude_tool_use: {
                id: call.id,
                name: call.name,
                input: call.arguments
              }
            })
          },
          {
            role: 'user',
            content: JSON.stringify({
              _claude_tool_result: {
                tool_use_id: call.id,
                content: result.content
              }
            })
          }
        ];
      }

      default: {
        // Fallback: simple text format
        const resultContent = `[Tool ${call.name} result]: ${result.content}`;
        return [
          ...messages,
          { role: 'assistant', content: `I'll use the ${call.name} tool.` },
          { role: 'user', content: resultContent }
        ];
      }
    }
  }

  /**
   * Format tool result for display
   */
  private formatToolResultPreview(usage: ToolUsageInfo): string {
    const { toolName, result, duration } = usage;

    if (toolName === 'web_search') {
      const searchResult = result as { results?: Array<{ title: string; url: string }> };
      const count = searchResult.results?.length || 0;
      return `✅ *Recherche terminée* (${count} résultats, ${duration}ms)`;
    }

    if (toolName === 'fetch_url') {
      const fetchResult = result as { title?: string; contentLength?: number };
      return `✅ *Page récupérée*: "${fetchResult.title}" (${duration}ms)`;
    }

    if (toolName === 'get_current_datetime') {
      const dtResult = result as { date?: string; time?: string };
      return `✅ ${dtResult.date} ${dtResult.time}`;
    }

    return `✅ *${toolName}* terminé (${duration}ms)`;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<AIWithToolsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AIWithToolsConfig {
    return { ...this.config };
  }

  /**
   * Check if tools are enabled
   */
  isToolsEnabled(): boolean {
    return this.config.enableTools;
  }

  /**
   * Get available tools
   */
  getAvailableTools(): ToolDefinition[] {
    return toolCallingService.getTools();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const aiWithToolsService = new AIWithToolsService();
export default aiWithToolsService;
