/**
 * Tool Sanitizer - OpenClaw Pattern
 *
 * Provides sanitization functions for tool calling:
 * - sanitizeToolUseResultPairing: Fixes orphaned tool_results after history truncation
 * - validateGeminiTurns: Merges consecutive assistant messages
 * - validateAnthropicTurns: Merges consecutive user messages
 */

import type { AIMessage } from './aiService';

interface ToolUseBlock {
  id: string;
  name: string;
  input: unknown;
}

interface ToolResultBlock {
  tool_use_id: string;
  content: unknown;
}

/**
 * Extract tool_use blocks from message content
 */
function extractToolUses(content: string): ToolUseBlock[] {
  try {
    const parsed = JSON.parse(content);

    // Gemini format
    if (parsed._gemini_function_call) {
      return [{
        id: parsed._gemini_function_call.id || `call-${Date.now()}`,
        name: parsed._gemini_function_call.name,
        input: parsed._gemini_function_call.args
      }];
    }

    // OpenAI format
    if (parsed._openai_tool_calls) {
      return parsed._openai_tool_calls.map((tc: { id: string; function: { name: string; arguments: unknown } }) => ({
        id: tc.id,
        name: tc.function.name,
        input: tc.function.arguments
      }));
    }

    // Anthropic format
    if (parsed._anthropic_tool_use) {
      return [{
        id: parsed._anthropic_tool_use.id,
        name: parsed._anthropic_tool_use.name,
        input: parsed._anthropic_tool_use.input
      }];
    }
  } catch {
    // Not JSON - no tool uses
  }
  return [];
}

/**
 * Extract tool_result blocks from message content
 */
function extractToolResults(content: string): ToolResultBlock[] {
  try {
    const parsed = JSON.parse(content);

    // Gemini format
    if (parsed._gemini_function_response) {
      return [{
        tool_use_id: parsed._gemini_function_response.id || 'unknown',
        content: parsed._gemini_function_response.response
      }];
    }

    // OpenAI format
    if (parsed._openai_tool_result) {
      return [{
        tool_use_id: parsed._openai_tool_result.tool_call_id,
        content: parsed._openai_tool_result.content
      }];
    }

    // Anthropic format
    if (parsed._anthropic_tool_result) {
      return [{
        tool_use_id: parsed._anthropic_tool_result.tool_use_id,
        content: parsed._anthropic_tool_result.content
      }];
    }
  } catch {
    // Not JSON - no tool results
  }
  return [];
}

/**
 * Pattern OpenClaw: Remove orphaned tool_results and create synthetic results
 * for missing tool_uses after history limiting
 *
 * This is critical because:
 * - After truncating history, we may have tool_results without their matching tool_use
 * - Or tool_uses without their tool_result
 * - Both cases cause API errors with Gemini/Anthropic/OpenAI
 */
export function sanitizeToolUseResultPairing(messages: AIMessage[]): AIMessage[] {
  const toolUseIds = new Set<string>();
  const toolResultIds = new Set<string>();

  // Collect all tool_use and tool_result IDs
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      const toolUses = extractToolUses(msg.content);
      toolUses.forEach(tu => toolUseIds.add(tu.id));
    }
    if (msg.role === 'user') {
      const toolResults = extractToolResults(msg.content);
      toolResults.forEach(tr => toolResultIds.add(tr.tool_use_id));
    }
  }

  // Find orphaned tool_results (no matching tool_use)
  const orphanedResults = [...toolResultIds].filter(id => !toolUseIds.has(id));

  // Find missing results (tool_use without tool_result)
  const missingResults = [...toolUseIds].filter(id => !toolResultIds.has(id));

  let sanitized = [...messages];

  // Remove messages with orphaned tool_results
  if (orphanedResults.length > 0) {
    console.log('[ToolSanitizer] Removing orphaned tool_results:', orphanedResults);
    sanitized = sanitized.filter(msg => {
      if (msg.role !== 'user') return true;
      const results = extractToolResults(msg.content);
      return !results.some(r => orphanedResults.includes(r.tool_use_id));
    });
  }

  // Create synthetic results for missing tool_uses
  if (missingResults.length > 0) {
    console.log('[ToolSanitizer] Creating synthetic results for:', missingResults);
    for (const id of missingResults) {
      sanitized.push({
        role: 'user',
        content: JSON.stringify({
          _synthetic_tool_result: {
            tool_use_id: id,
            content: { error: 'Tool result was truncated from history' }
          }
        })
      });
    }
  }

  return sanitized;
}

/**
 * Pattern OpenClaw: Merge consecutive assistant messages for Gemini
 *
 * Gemini requires strict alternation: user -> assistant -> user -> assistant
 * Consecutive assistant messages must be merged
 */
export function validateGeminiTurns(messages: AIMessage[]): AIMessage[] {
  const result: AIMessage[] = [];

  for (const msg of messages) {
    const lastMsg = result[result.length - 1];

    // Merge consecutive assistant messages
    if (lastMsg?.role === 'assistant' && msg.role === 'assistant') {
      lastMsg.content += '\n\n' + msg.content;
    } else {
      result.push({ ...msg });
    }
  }

  return result;
}

/**
 * Pattern OpenClaw: Merge consecutive user messages for Anthropic
 *
 * Anthropic requires that user messages not be consecutive
 */
export function validateAnthropicTurns(messages: AIMessage[]): AIMessage[] {
  const result: AIMessage[] = [];

  for (const msg of messages) {
    const lastMsg = result[result.length - 1];

    // Merge consecutive user messages
    if (lastMsg?.role === 'user' && msg.role === 'user') {
      lastMsg.content += '\n\n' + msg.content;
    } else {
      result.push({ ...msg });
    }
  }

  return result;
}

/**
 * Pattern OpenClaw: Ensure tool_use payloads include required input field
 */
export function sanitizeToolUseInput<T extends { arguments?: Record<string, unknown> }>(
  toolCall: T
): T {
  return {
    ...toolCall,
    arguments: toolCall.arguments ?? {}
  };
}

/**
 * Full sanitization pipeline for a specific provider
 */
export function sanitizeMessagesForProvider(
  messages: AIMessage[],
  provider: 'gemini' | 'openai' | 'anthropic'
): AIMessage[] {
  let sanitized = [...messages];

  // 1. Fix tool use/result pairing
  sanitized = sanitizeToolUseResultPairing(sanitized);

  // 2. Validate turns according to provider
  switch (provider) {
    case 'gemini':
      sanitized = validateGeminiTurns(sanitized);
      break;
    case 'anthropic':
      sanitized = validateAnthropicTurns(sanitized);
      break;
    case 'openai':
      // OpenAI is more flexible with turn order
      break;
  }

  return sanitized;
}
