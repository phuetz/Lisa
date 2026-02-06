/**
 * Lisa Tools Module - Unified tool management
 *
 * This module provides the ToolRegistry for unified tool management.
 *
 * @example
 * ```typescript
 * import { toolRegistry } from '@/features/tools';
 *
 * // Register a tool
 * toolRegistry.register(myTool);
 *
 * // Execute a tool
 * const result = await toolRegistry.execute('MyTool', { param: 'value' });
 *
 * // Get OpenAI format for LLM function calling
 * const openaiTools = toolRegistry.toOpenAIFormat();
 * ```
 */

// Main registry
export { ToolRegistry, toolRegistry } from './ToolRegistry';

// Types
export type {
  Tool,
  ToolResult,
  ToolResultMetadata,
  ToolCategory,
  ToolDefinition,
  ToolRegistryStats,
  ToolExecutionContext,
  OpenAIToolDefinition,
  GeminiToolDefinition,
  ToolExecuteResult,
  ToolParams,
} from './types';
