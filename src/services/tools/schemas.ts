/**
 * Tool Schemas - TypeBox Definitions
 *
 * Centralized TypeBox schemas for all tools.
 * Following OpenClaw patterns:
 * - Flat schemas (no anyOf/oneOf/allOf)
 * - Explicit enums
 * - Type.Optional for optional fields
 */

import { Type, type Static } from '@sinclair/typebox';

// ============================================================================
// Todo Tool Schemas
// ============================================================================

/**
 * Priority enum for todos
 */
export const TodoPriorityEnum = Type.Union([
  Type.Literal('low'),
  Type.Literal('medium'),
  Type.Literal('high')
], { default: 'medium' });

/**
 * Filter enum for listing todos
 */
export const TodoFilterEnum = Type.Union([
  Type.Literal('all'),
  Type.Literal('active'),
  Type.Literal('completed')
], { default: 'all' });

/**
 * Schema for add_todo tool
 */
export const AddTodoSchema = Type.Object({
  text: Type.String({ description: 'The text/description of the task to add' }),
  priority: Type.Optional(TodoPriorityEnum)
}, {
  $id: 'AddTodoSchema',
  description: 'Add a new task/todo item'
});

/**
 * Schema for list_todos tool
 */
export const ListTodosSchema = Type.Object({
  filter: Type.Optional(TodoFilterEnum)
}, {
  $id: 'ListTodosSchema',
  description: 'List todos with optional filter'
});

/**
 * Schema for complete_todo tool
 */
export const CompleteTodoSchema = Type.Object({
  id: Type.Optional(Type.String({ description: 'The ID of the todo to complete' })),
  text: Type.Optional(Type.String({ description: 'The text of the todo to find and complete' }))
}, {
  $id: 'CompleteTodoSchema',
  description: 'Mark a todo as completed by ID or text match'
});

/**
 * Schema for remove_todo tool
 */
export const RemoveTodoSchema = Type.Object({
  id: Type.Optional(Type.String({ description: 'The ID of the todo to remove' })),
  text: Type.Optional(Type.String({ description: 'The text of the todo to find and remove' }))
}, {
  $id: 'RemoveTodoSchema',
  description: 'Remove a todo by ID or text match'
});

/**
 * Schema for clear_completed_todos tool
 */
export const ClearCompletedTodosSchema = Type.Object({}, {
  $id: 'ClearCompletedTodosSchema',
  description: 'Remove all completed todos'
});

// ============================================================================
// Web Tool Schemas
// ============================================================================

/**
 * Schema for web_search tool
 */
export const WebSearchSchema = Type.Object({
  query: Type.String({ description: 'The search query' }),
  count: Type.Optional(Type.Number({
    description: 'Number of results to return (1-10)',
    minimum: 1,
    maximum: 10,
    default: 5
  }))
}, {
  $id: 'WebSearchSchema',
  description: 'Search the web for information'
});

/**
 * Schema for fetch_url tool
 */
export const FetchUrlSchema = Type.Object({
  url: Type.String({ description: 'The URL to fetch content from' }),
  format: Type.Optional(Type.Union([
    Type.Literal('text'),
    Type.Literal('html'),
    Type.Literal('markdown')
  ], { default: 'text' }))
}, {
  $id: 'FetchUrlSchema',
  description: 'Fetch content from a URL'
});

/**
 * Schema for get_current_datetime tool
 */
export const GetCurrentDatetimeSchema = Type.Object({
  timezone: Type.Optional(Type.String({
    description: 'Timezone to use (e.g., "Europe/Paris", "America/New_York")',
    default: 'local'
  }))
}, {
  $id: 'GetCurrentDatetimeSchema',
  description: 'Get the current date and time'
});

// ============================================================================
// Utility Tool Schemas
// ============================================================================

/**
 * Schema for calculate tool
 */
export const CalculateSchema = Type.Object({
  expression: Type.String({ description: 'Mathematical expression to evaluate' })
}, {
  $id: 'CalculateSchema',
  description: 'Evaluate a mathematical expression'
});

/**
 * Schema for translate tool
 */
export const TranslateSchema = Type.Object({
  text: Type.String({ description: 'Text to translate' }),
  from: Type.Optional(Type.String({ description: 'Source language code (e.g., "en", "fr")' })),
  to: Type.String({ description: 'Target language code (e.g., "en", "fr")' })
}, {
  $id: 'TranslateSchema',
  description: 'Translate text between languages'
});

// ============================================================================
// Type Exports
// ============================================================================

export type AddTodoInput = Static<typeof AddTodoSchema>;
export type ListTodosInput = Static<typeof ListTodosSchema>;
export type CompleteTodoInput = Static<typeof CompleteTodoSchema>;
export type RemoveTodoInput = Static<typeof RemoveTodoSchema>;
export type ClearCompletedTodosInput = Static<typeof ClearCompletedTodosSchema>;

export type WebSearchInput = Static<typeof WebSearchSchema>;
export type FetchUrlInput = Static<typeof FetchUrlSchema>;
export type GetCurrentDatetimeInput = Static<typeof GetCurrentDatetimeSchema>;

export type CalculateInput = Static<typeof CalculateSchema>;
export type TranslateInput = Static<typeof TranslateSchema>;

// ============================================================================
// Schema Registry
// ============================================================================

/**
 * Registry of all tool schemas
 */
export const ToolSchemas = {
  // Todo tools
  add_todo: AddTodoSchema,
  list_todos: ListTodosSchema,
  complete_todo: CompleteTodoSchema,
  remove_todo: RemoveTodoSchema,
  clear_completed_todos: ClearCompletedTodosSchema,

  // Web tools
  web_search: WebSearchSchema,
  fetch_url: FetchUrlSchema,
  get_current_datetime: GetCurrentDatetimeSchema,

  // Utility tools
  calculate: CalculateSchema,
  translate: TranslateSchema
} as const;

export type ToolName = keyof typeof ToolSchemas;
