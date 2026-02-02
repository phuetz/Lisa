/**
 * Tool Schema Validator - OpenClaw Pattern
 *
 * Provides schema validation and helpers following OpenClaw patterns:
 * - No anyOf/oneOf/allOf (causes issues with Gemini)
 * - Use enums for string unions
 * - Keep schemas flat and simple
 * - Validate at registration time
 */

import { Type, type TSchema, type Static } from '@sinclair/typebox';
import { TypeCompiler, type TypeCheck } from '@sinclair/typebox/compiler';

/**
 * Validation result
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that a tool schema follows OpenClaw best practices
 * - No complex unions (anyOf/oneOf/allOf)
 * - Top-level must be object with properties
 * - Types should use uppercase for Gemini compatibility
 */
export function validateToolSchema(schema: TSchema): SchemaValidationResult {
  const result: SchemaValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  const schemaStr = JSON.stringify(schema);

  // Check for complex unions
  if (schemaStr.includes('anyOf')) {
    result.errors.push('Schema contains anyOf - use explicit enum or separate properties instead');
    result.valid = false;
  }

  if (schemaStr.includes('oneOf')) {
    result.errors.push('Schema contains oneOf - use explicit enum or separate properties instead');
    result.valid = false;
  }

  if (schemaStr.includes('allOf')) {
    result.errors.push('Schema contains allOf - flatten the schema instead');
    result.valid = false;
  }

  // Check top-level type
  if (schema.type !== 'object') {
    result.errors.push('Top-level schema must be type: object');
    result.valid = false;
  }

  // Check for properties
  if (!schema.properties && schema.type === 'object') {
    result.warnings.push('Schema has no properties defined');
  }

  // Check for required array
  if (schema.type === 'object' && !Array.isArray(schema.required)) {
    result.warnings.push('Schema is missing required array - add required: [] for Gemini compatibility');
  }

  return result;
}

/**
 * Create a compiled TypeBox validator for fast validation
 */
export function createSchemaValidator<T extends TSchema>(schema: T): TypeCheck<T> {
  return TypeCompiler.Compile(schema);
}

/**
 * Validate input against a compiled schema
 */
export function validateInput<T extends TSchema>(
  validator: TypeCheck<T>,
  input: unknown
): { valid: boolean; errors: string[]; value?: Static<T> } {
  if (validator.Check(input)) {
    return { valid: true, errors: [], value: input as Static<T> };
  }

  const errors = [...validator.Errors(input)].map(e => {
    const path = e.path || 'root';
    return `${path}: ${e.message}`;
  });

  return { valid: false, errors };
}

/**
 * Convert TypeBox schema to JSON Schema for tool definition
 */
export function toJsonSchema(schema: TSchema): Record<string, unknown> {
  // TypeBox schemas are already JSON Schema compatible
  // Just need to ensure proper structure
  return {
    type: schema.type,
    properties: schema.properties || {},
    required: schema.required || []
  };
}

/**
 * Convert TypeBox type to Gemini-compatible uppercase type
 */
export function toGeminiType(type: string): string {
  const typeMap: Record<string, string> = {
    'string': 'STRING',
    'number': 'NUMBER',
    'integer': 'INTEGER',
    'boolean': 'BOOLEAN',
    'object': 'OBJECT',
    'array': 'ARRAY',
    'null': 'STRING' // Fallback
  };

  return typeMap[type.toLowerCase()] || 'STRING';
}

/**
 * Convert a TypeBox schema to Gemini function declaration format
 */
export function toGeminiFunctionParameters(schema: TSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: 'OBJECT',
    properties: {},
    required: schema.required || []
  };

  if (schema.properties) {
    const props: Record<string, unknown> = {};

    for (const [key, prop] of Object.entries(schema.properties as Record<string, TSchema>)) {
      props[key] = {
        type: toGeminiType(prop.type as string || 'string'),
        description: prop.description || ''
      };

      // Add enum if present
      if (prop.enum) {
        props[key] = { ...(props[key] as object), enum: prop.enum };
      }

      // Handle const (for Literal types)
      if (prop.const !== undefined) {
        props[key] = { ...(props[key] as object), enum: [prop.const] };
      }
    }

    result.properties = props;
  }

  return result;
}

// Pre-built schema helpers using TypeBox

/**
 * Create a string enum schema (Gemini-safe)
 */
export function StringEnum<T extends readonly string[]>(values: T, description?: string) {
  return Type.Union(
    values.map(v => Type.Literal(v)),
    { description }
  );
}

/**
 * Create an optional string parameter
 */
export function OptionalString(description?: string) {
  return Type.Optional(Type.String({ description }));
}

/**
 * Create a required string parameter
 */
export function RequiredString(description?: string) {
  return Type.String({ description });
}

/**
 * Create an optional number parameter
 */
export function OptionalNumber(description?: string, min?: number, max?: number) {
  return Type.Optional(Type.Number({
    description,
    ...(min !== undefined && { minimum: min }),
    ...(max !== undefined && { maximum: max })
  }));
}

/**
 * Create a required number parameter
 */
export function RequiredNumber(description?: string, min?: number, max?: number) {
  return Type.Number({
    description,
    ...(min !== undefined && { minimum: min }),
    ...(max !== undefined && { maximum: max })
  });
}
