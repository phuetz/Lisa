/**
 * Unified Tool Types for Lisa AI
 *
 * Tools are atomic units of functionality that can be executed by Agents.
 * They provide Zod schemas for LLM-compatible parameter validation.
 */

import { z } from 'zod';

/* ---------- Tool Interface ---------- */

/**
 * Standard interface for all Tools in Lisa.
 * Tools must provide a Zod schema for their input parameters.
 *
 * @template P - Input parameter type
 * @template R - Result type
 */
export interface Tool<P = unknown, R = unknown> {
  /** Unique name of the tool (e.g., 'WebSearch', 'Weather') */
  name: string;

  /** Clear description of what the tool does */
  description: string;

  /** Zod schema defining the input parameters */
  schema: z.ZodType<P>;

  /** Optional category for organization */
  category?: ToolCategory;

  /** Execute the tool with validated parameters */
  execute(params: P): Promise<ToolResult<R>>;

  /** Optional validation before execution */
  validate?(params: unknown): params is P;
}

/* ---------- Result Types ---------- */

export interface ToolResult<R = unknown> {
  success: boolean;
  output?: R;
  error?: string;
  metadata?: ToolResultMetadata;
}

export interface ToolResultMetadata {
  executionTime?: number;
  cached?: boolean;
  source?: string;
}

/* ---------- Categories ---------- */

export type ToolCategory =
  | 'information' // Weather, Dictionary, WebSearch
  | 'utility' // Calculator, Reminder, Translator
  | 'media' // ImageGenerator, Summarizer
  | 'code' // CodeInterpreter
  | 'integration' // External APIs
  | 'custom';

/* ---------- Registry Types ---------- */

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  factory?: () => Tool;
  instance?: Tool;
}

export interface ToolRegistryStats {
  totalTools: number;
  byCategory: Record<ToolCategory, number>;
  executionCounts: Record<string, number>;
}

/* ---------- Execution Context ---------- */

export interface ToolExecutionContext {
  sessionId?: string;
  userId?: string;
  timeout?: number;
  retryCount?: number;
}

/* ---------- OpenAI/Gemini Format Types ---------- */

/**
 * OpenAI function calling format
 */
export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Gemini function calling format
 */
export interface GeminiToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/* ---------- Helper Types ---------- */

export type ToolExecuteResult<T extends Tool> = T extends Tool<infer _P, infer R>
  ? ToolResult<R>
  : never;

export type ToolParams<T extends Tool> = T extends Tool<infer P, infer _R>
  ? P
  : never;
