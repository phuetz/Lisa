/**
 * Type declarations for @phuetz/grok-cli
 * 
 * Based on the GitHub source: https://github.com/phuetz/grok-cli
 * These types allow TypeScript to understand the grok-cli API.
 */

declare module '@phuetz/grok-cli' {
  import { EventEmitter } from 'events';

  /**
   * Chat entry types returned by GrokAgent
   */
  export type ChatEntryType = 'user' | 'assistant' | 'tool_call' | 'tool_result';

  /**
   * A single entry in the chat history
   */
  export interface ChatEntry {
    type: ChatEntryType;
    content: string;
    timestamp: Date;
    toolCall?: GrokToolCall;
    toolResult?: ToolResult;
    toolCalls?: GrokToolCall[];
  }

  /**
   * Streaming chunk types
   */
  export type StreamingChunkType = 
    | 'content' 
    | 'tool_calls' 
    | 'tool_result' 
    | 'token_count' 
    | 'done';

  /**
   * A streaming chunk from processUserMessageStream
   */
  export interface StreamingChunk {
    type: StreamingChunkType;
    content?: string;
    toolCalls?: GrokToolCall[];
    tokenCount?: number;
    toolResult?: ToolResult;
  }

  /**
   * Tool call structure
   */
  export interface GrokToolCall {
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  }

  /**
   * Result of a tool execution
   */
  export interface ToolResult {
    success: boolean;
    output?: string;
    error?: string;
  }

  /**
   * Security modes supported by grok-cli
   */
  export type SecurityMode = 'suggest' | 'auto-edit' | 'full-auto';

  /**
   * Agent modes
   */
  export type AgentMode = 'default' | 'yolo';

  /**
   * Main GrokAgent class that orchestrates conversation with Grok AI
   * 
   * @example
   * ```typescript
   * const agent = new GrokAgent(apiKey, baseURL, model);
   * 
   * // Process a message with streaming
   * for await (const chunk of agent.processUserMessageStream("Show me package.json")) {
   *   if (chunk.type === "content") {
   *     console.log(chunk.content);
   *   }
   * }
   * 
   * // Clean up when done
   * agent.dispose();
   * ```
   */
  export class GrokAgent extends EventEmitter {
    /**
     * Create a new GrokAgent instance
     * 
     * @param apiKey - API key for authentication
     * @param baseURL - Optional base URL for the API endpoint
     * @param model - Optional model name (defaults to saved model or grok-code-fast-1)
     * @param maxToolRounds - Maximum tool execution rounds (default: depends on YOLO mode)
     * @param useRAGToolSelection - Enable RAG-based tool selection (default: true)
     */
    constructor(
      apiKey: string,
      baseURL?: string,
      model?: string,
      maxToolRounds?: number,
      useRAGToolSelection?: boolean
    );

    /**
     * Process a user message and return all chat entries
     */
    processUserMessage(message: string): Promise<ChatEntry[]>;

    /**
     * Process a user message with streaming response
     * 
     * Runs an agentic loop that can execute multiple tool rounds.
     * Yields chunks as they arrive, including content, tool calls, and results.
     */
    processUserMessageStream(
      message: string
    ): AsyncGenerator<StreamingChunk, void, unknown>;

    /**
     * Execute a bash command
     */
    executeBashCommand(command: string): Promise<ToolResult>;

    /**
     * Enable or disable self-healing auto-correction
     */
    setSelfHealing(enabled: boolean): void;

    /**
     * Abort the current operation
     */
    abort(): void;

    /**
     * Clean up resources
     */
    dispose(): void;

    /**
     * Get the current model being used
     */
    getCurrentModel(): string;

    /**
     * Get the chat history
     */
    getChatHistory(): ChatEntry[];

    /**
     * Clear the chat history
     */
    clearHistory(): void;
  }

  /**
   * Settings manager for grok-cli configuration
   */
  export function getSettingsManager(): {
    loadUserSettings(): void;
    getApiKey(): string | undefined;
    getBaseURL(): string;
    getCurrentModel(): string;
    updateUserSetting(key: string, value: unknown): void;
  };

  /**
   * Cost tracker for monitoring API usage
   */
  export function getCostTracker(): {
    getSessionCost(): number;
    getDailyCost(): number;
    getTotalCost(): number;
    reset(): void;
  };

  /**
   * Embedding provider for vector search
   */
  export function getEmbeddingProvider(): {
    initialize(): Promise<void>;
    embed(text: string): Promise<{ embedding: Float32Array }>;
    isInitialized(): boolean;
  };

  /**
   * Checkpoint manager for session persistence
   */
  export function getCheckpointManager(): {
    createCheckpoint(name: string): Promise<string>;
    restoreCheckpoint(id: string): Promise<void>;
    listCheckpoints(): Promise<Array<{ id: string; name: string; createdAt: Date }>>;
    deleteCheckpoint(id: string): Promise<void>;
  };

  /**
   * Session store for conversation persistence
   */
  export function getSessionStore(): {
    saveSession(sessionId: string, data: unknown): Promise<void>;
    loadSession(sessionId: string): Promise<unknown>;
    listSessions(): Promise<string[]>;
    deleteSession(sessionId: string): Promise<void>;
  };
}
