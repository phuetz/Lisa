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
import { sanitizeMessagesForProvider } from './ToolSanitizer';
import { toolLogger } from './ToolLogger';
import { toolPolicyService } from './ToolPolicy';

// Re-export for external use
export { getWebTools, getTodoTools };
export { toolLogger } from './ToolLogger';
export { toolPolicyService, type ToolPolicy } from './ToolPolicy';

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

/** Maximum number of messages to keep in history */
const MAX_HISTORY_MESSAGES = 20;

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
   * Limit and sanitize messages before sending to API
   * OpenClaw Pattern: sanitization must happen AFTER history limiting
   */
  private sanitizeMessages(messages: AIMessage[], provider: AIProvider): AIMessage[] {
    let sanitized = [...messages];

    // 1. Keep system message if present
    const systemMessage = sanitized.find(m => m.role === 'system');
    const otherMessages = sanitized.filter(m => m.role !== 'system');

    // 2. Limit history to prevent context overflow
    if (otherMessages.length > MAX_HISTORY_MESSAGES) {
      toolLogger.logSanitized('limit_history', {
        before: otherMessages.length,
        after: MAX_HISTORY_MESSAGES
      });
      sanitized = [
        ...(systemMessage ? [systemMessage] : []),
        ...otherMessages.slice(-MAX_HISTORY_MESSAGES)
      ];
    }

    // 3. CRITICAL: Re-validate after limiting (OpenClaw pattern)
    // This fixes orphaned tool results and consecutive same-role messages
    sanitized = sanitizeMessagesForProvider(sanitized, provider);

    return sanitized;
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

    const config = aiService.getConfig();
    const provider = config.provider;

    // Sanitize messages before starting
    let currentMessages = this.sanitizeMessages(messages, provider);

    while (iterations < this.config.maxIterations) {
      iterations++;

      // Make API call with tools
      const response = await this.callWithTools(currentMessages, provider);

      // Check for tool calls
      const rawToolCalls = toolCallingService.parseToolCalls(response, provider);

      // Deduplicate tool calls - only keep unique calls (same name + same args)
      const toolCalls = rawToolCalls.filter((call, index, arr) => {
        const key = `${call.name}:${JSON.stringify(call.arguments)}`;
        return arr.findIndex(c => `${c.name}:${JSON.stringify(c.arguments)}` === key) === index;
      });

      if (toolCalls.length === 0) {
        // No tool calls, extract final response
        const content = this.extractContent(response, provider);
        return { content, toolsUsed, iterations };
      }

      // Execute tool calls
      console.log(`[AIWithTools] Executing ${toolCalls.length} tool calls (${rawToolCalls.length} before dedup)`);

      for (const call of toolCalls) {
        // Log tool call start
        const startTime = toolLogger.logCall(call.name, call.arguments);
        let result: ToolResult;

        try {
          result = await toolCallingService.executeTool(call);
          const duration = Date.now() - startTime;

          // Log success
          let parsedResult: unknown;
          try {
            parsedResult = JSON.parse(result.content);
          } catch {
            parsedResult = { raw: result.content };
          }
          toolLogger.logResult(call.name, parsedResult, startTime);

          toolsUsed.push({
            toolName: call.name,
            arguments: call.arguments,
            result: parsedResult,
            duration
          });
        } catch (error) {
          toolLogger.logError(call.name, error instanceof Error ? error : String(error), startTime);
          throw error;
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

    const config = aiService.getConfig();
    const provider = config.provider;

    // Sanitize messages before starting
    let currentMessages = this.sanitizeMessages(messages, provider);

    console.log('[AIWithTools] streamWithToolLoop - provider:', provider, 'maxIterations:', this.config.maxIterations);

    while (iterations < this.config.maxIterations) {
      iterations++;
      console.log('[AIWithTools] Iteration', iterations);

      // For streaming, we need to collect the full response first to check for tool calls
      const response = await this.callWithTools(currentMessages, provider);
      console.log('[AIWithTools] Response received:', JSON.stringify(response).slice(0, 500));

      const rawToolCalls = toolCallingService.parseToolCalls(response, provider);

      // Deduplicate tool calls - only keep unique calls (same name + same args)
      const toolCalls = rawToolCalls.filter((call, index, arr) => {
        const key = `${call.name}:${JSON.stringify(call.arguments)}`;
        return arr.findIndex(c => `${c.name}:${JSON.stringify(c.arguments)}` === key) === index;
      });

      console.log('[AIWithTools] Parsed tool calls:', rawToolCalls.length, '→ deduplicated:', toolCalls.length, toolCalls.map(tc => tc.name));

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

        // Log tool call start
        const startTime = toolLogger.logCall(call.name, call.arguments);

        let parsedResult: unknown;
        let duration: number;
        let result: ToolResult;

        try {
          result = await toolCallingService.executeTool(call);
          duration = Date.now() - startTime;

          // Parse result safely
          try {
            parsedResult = JSON.parse(result.content);
          } catch {
            console.warn('[AIWithTools] Failed to parse tool result:', result.content);
            parsedResult = { raw: result.content };
          }

          // Log success
          toolLogger.logResult(call.name, parsedResult, startTime);
        } catch (error) {
          duration = Date.now() - startTime;
          toolLogger.logError(call.name, error instanceof Error ? error : String(error), startTime);
          parsedResult = { error: error instanceof Error ? error.message : String(error) };
          // Create error result for message chain
          result = { success: false, content: JSON.stringify(parsedResult) };
        }

        const toolUsage: ToolUsageInfo = {
          toolName: call.name,
          arguments: call.arguments,
          result: parsedResult,
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

    // Get tools based on request type
    let tools: ToolDefinition[];
    if (this.config.tools) {
      tools = this.config.tools;
    } else {
      // Detect which tools are relevant for this request
      const requestType = this.detectRequestType(messages);
      tools = this.getToolsForRequestType(requestType);
    }

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
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string }; functionCall?: unknown; functionResponse?: unknown }>;
    }> = [];

    for (const msg of conversationMessages) {
      // Check for special Gemini function call/response markers
      try {
        const parsed = JSON.parse(msg.content);

        if (parsed._gemini_function_call) {
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
          contents.push({
            role: 'function',
            parts: [{
              functionResponse: {
                name: parsed._gemini_function_response.name,
                response: {
                  name: parsed._gemini_function_response.name,
                  content: parsed._gemini_function_response.response
                }
              }
            }]
          });
          continue;
        }
      } catch {
        // Not JSON, treat as regular message
      }

      // Regular text message, with optional image
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
      if (msg.content) parts.push({ text: msg.content });
      if (msg.image) {
        const matches = msg.image.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          parts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
        } else {
          parts.push({ inlineData: { mimeType: 'image/jpeg', data: msg.image } });
        }
      }
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts
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
      hasExistingFunctionResponse,
      systemPromptLength: systemMessage?.content.length || 0
    });

    // Log full contents for debugging
    console.log('[AIWithTools] Gemini contents:', JSON.stringify(contents, null, 2));

    // Build request body - DON'T send tools if we already have a function response
    // This forces Gemini to respond with text instead of trying to call more tools
    const requestBody: Record<string, unknown> = {
      contents,
      systemInstruction: systemMessage ? {
        parts: [{ text: systemMessage.content }]
      } : undefined,
      generationConfig: {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 4096
      }
    };

    // Only include tools on the first call (before function response exists)
    if (!hasExistingFunctionResponse) {
      requestBody.tools = [{ functionDeclarations }];
      requestBody.toolConfig = {
        functionCallingConfig: {
          mode: toolMode
        }
      };
    }

    const response = await fetch(
      `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
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

    const formattedMessages = messages.map(m => {
      if (m.image) {
        const imageUrl = m.image.startsWith('data:') ? m.image : `data:image/jpeg;base64,${m.image}`;
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content || '' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        };
      }
      return { role: m.role, content: m.content };
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
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
        messages: conversationMessages.map(m => {
          if (m.image) {
            const base64Data = m.image.startsWith('data:') ? m.image.split(',')[1] : m.image;
            return {
              role: m.role,
              content: [
                { type: 'text', text: m.content || '' },
                { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Data } }
              ]
            };
          }
          return { role: m.role, content: m.content };
        }),
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

    const formattedMessages = messages.map(m => {
      if (m.image) {
        const imageUrl = m.image.startsWith('data:') ? m.image : `data:image/jpeg;base64,${m.image}`;
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content || '' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        };
      }
      return { role: m.role, content: m.content };
    });

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
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
   * Detect what type of request this is (todo, web_search, general)
   */
  private detectRequestType(messages: AIMessage[]): 'todo' | 'web' | 'news' | 'general' {
    // Find the ORIGINAL user message (not function responses which are encoded as user role)
    // Skip messages that look like JSON (function call/response markers)
    const userMessages = messages.filter(m => {
      if (m.role !== 'user') return false;
      // Skip function responses (they start with { and contain special markers)
      if (m.content.startsWith('{') && m.content.includes('_gemini_function')) return false;
      return true;
    });

    // Get the LAST actual user message (not function response)
    const lastUserMessage = userMessages[userMessages.length - 1];
    if (!lastUserMessage) return 'general';

    const content = lastUserMessage.content.toLowerCase();

    // Todo triggers - check FIRST (before web triggers)
    const todoTriggers = [
      'ajoute une tâche', 'ajouter une tâche', 'nouvelle tâche', 'créer une tâche',
      'ajoute un todo', 'ajoute un rappel', 'rappelle-moi', 'rappelle moi',
      'liste mes tâches', 'liste les tâches', 'mes tâches', 'les tâches',
      'quelles tâches', 'voir les tâches', 'voir mes tâches', 'affiche les tâches',
      'liste des tâches', 'montre les tâches', 'montre mes tâches',
      'todo list', 'todolist', 'to-do', 'ma todo', 'list tasks', 'show tasks',
      'tâche terminée', 'j\'ai fini', 'j\'ai terminé', 'marque comme fait',
      'supprime la tâche', 'supprimer la tâche', 'enlève la tâche',
      'add task', 'add todo', 'add a task', 'create task', 'new task',
      'ajoute', 'ajouter'  // Generic "add" in French - if combined with task-like words
    ];

    // Check if it's a todo request
    if (todoTriggers.some(trigger => content.includes(trigger))) {
      console.log('[AIWithTools] Detected TODO request');
      return 'todo';
    }

    // Also check for patterns like "ajoute X à ma liste" or "ajoute acheter du pain"
    if (content.match(/ajoute[rz]?\s+(?!la recherche|le son|une image)/)) {
      console.log('[AIWithTools] Detected TODO request via pattern match');
      return 'todo';
    }

    // NEWS triggers - specific to actualités (before general web)
    const newsTriggers = [
      'actualités', 'actualité', 'actu', 'news', 'nouvelles',
      'quoi de neuf', 'qu\'est-ce qui se passe', 'dernières infos',
      'journal', 'informations du jour'
    ];

    if (newsTriggers.some(trigger => content.includes(trigger))) {
      console.log('[AIWithTools] Detected NEWS request');
      return 'news';
    }

    // Web search triggers (other than news)
    const webTriggers = [
      'programme tv', 'programme télé', 'télé ce soir', 'tv ce soir',
      'météo', 'meteo', 'temps qu\'il fait',
      'prix de', 'combien coûte', 'recherche', 'cherche sur le web',
      'score', 'résultat du match', 'classement'
    ];

    if (webTriggers.some(trigger => content.includes(trigger))) {
      console.log('[AIWithTools] Detected WEB request');
      return 'web';
    }

    return 'general';
  }

  /**
   * Get the appropriate tools for a given request type
   * Also applies policy-based filtering
   */
  private getToolsForRequestType(requestType: 'todo' | 'web' | 'news' | 'general'): ToolDefinition[] {
    const todoTools = getTodoTools();
    const webTools = getWebTools();

    let tools: ToolDefinition[];

    switch (requestType) {
      case 'todo':
        // ONLY return todo tools to force Gemini to use them
        tools = todoTools;
        console.log('[AIWithTools] Providing TODO tools only:', tools.map(t => t.name));
        break;
      case 'news':
        // Return ONLY get_news tool to force it to be used
        tools = webTools.filter(t => t.name === 'get_news');
        console.log('[AIWithTools] Providing NEWS tool only:', tools.map(t => t.name));
        break;
      case 'web':
        // Return web tools for web-related queries
        tools = webTools;
        console.log('[AIWithTools] Providing WEB tools:', tools.map(t => t.name));
        break;
      case 'general':
      default:
        // Return all tools for general queries
        tools = [...todoTools, ...webTools];
        console.log('[AIWithTools] Providing ALL tools:', tools.map(t => t.name));
        break;
    }

    // Apply policy-based filtering
    const filteredTools = toolPolicyService.filterTools(tools);
    if (filteredTools.length !== tools.length) {
      console.log('[AIWithTools] After policy filter:', filteredTools.map(t => t.name));
    }

    return filteredTools;
  }

  /**
   * Detect if the user's query requires tool usage
   * Returns true to force ANY mode for both todo and web requests
   */
  private shouldForceToolUse(messages: AIMessage[]): boolean {
    const requestType = this.detectRequestType(messages);

    if (requestType !== 'general') {
      console.log(`[AIWithTools] Detected ${requestType} request, forcing ANY mode`);
      return true;
    }

    return false;
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
