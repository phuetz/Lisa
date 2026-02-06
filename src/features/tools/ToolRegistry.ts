/**
 * ToolRegistry - Unified registry for Lisa's tools
 *
 * Provides:
 * - Tool registration and discovery
 * - Lazy loading support
 * - OpenAI/Gemini format conversion
 * - Execution tracking and stats
 *
 * @example
 * ```typescript
 * const registry = ToolRegistry.getInstance();
 *
 * // Register a tool
 * registry.register(weatherTool);
 *
 * // Get a tool
 * const tool = registry.get('Weather');
 *
 * // Execute a tool
 * const result = await registry.execute('Weather', { location: 'Paris' });
 *
 * // Get OpenAI format for all tools
 * const openaiTools = registry.toOpenAIFormat();
 * ```
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import type {
  Tool,
  ToolCategory,
  ToolResult,
  ToolRegistryStats,
  ToolExecutionContext,
  OpenAIToolDefinition,
  GeminiToolDefinition,
} from './types';

/* ---------- ToolRegistry Class ---------- */

export class ToolRegistry {
  private static instance: ToolRegistry | null = null;

  private tools: Map<string, Tool> = new Map();
  private executionCounts: Map<string, number> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    ToolRegistry.instance = null;
  }

  /* ---------- Registration ---------- */

  /**
   * Register a tool
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolRegistry] Tool "${tool.name}" already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
    this.executionCounts.set(tool.name, 0);
  }

  /**
   * Register multiple tools
   */
  registerMany(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /* ---------- Retrieval ---------- */

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get all tools
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ToolCategory): Tool[] {
    return this.getAll().filter(t => t.category === category);
  }

  /* ---------- Execution ---------- */

  /**
   * Execute a tool by name
   */
  async execute<P, R>(
    name: string,
    params: P,
    context?: ToolExecutionContext
  ): Promise<ToolResult<R>> {
    const tool = this.get(name);

    if (!tool) {
      return {
        success: false,
        error: `Tool "${name}" not found`,
      };
    }

    // Track execution
    this.executionCounts.set(name, (this.executionCounts.get(name) || 0) + 1);

    const startTime = Date.now();

    try {
      // Validate if validation function exists
      if (tool.validate && !tool.validate(params)) {
        return {
          success: false,
          error: `Invalid parameters for tool "${name}"`,
        };
      }

      // Parse through Zod schema
      const parsed = tool.schema.parse(params);

      // Apply timeout if specified
      let result: ToolResult<R>;
      if (context?.timeout) {
        const timeoutPromise = new Promise<ToolResult<R>>((_, reject) =>
          setTimeout(() => reject(new Error('Tool execution timeout')), context.timeout)
        );
        result = await Promise.race([
          tool.execute(parsed) as Promise<ToolResult<R>>,
          timeoutPromise,
        ]);
      } else {
        result = (await tool.execute(parsed)) as ToolResult<R>;
      }

      // Add execution time metadata
      result.metadata = {
        ...result.metadata,
        executionTime: Date.now() - startTime,
      };

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  /* ---------- Format Conversion ---------- */

  /**
   * Convert tools to OpenAI function calling format
   */
  toOpenAIFormat(names?: string[]): OpenAIToolDefinition[] {
    const tools = names
      ? names.map(n => this.get(n)).filter((t): t is Tool => !!t)
      : this.getAll();

    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodToJsonSchema(tool.schema) as Record<string, unknown>,
      },
    }));
  }

  /**
   * Convert tools to Gemini function calling format
   */
  toGeminiFormat(names?: string[]): GeminiToolDefinition[] {
    const tools = names
      ? names.map(n => this.get(n)).filter((t): t is Tool => !!t)
      : this.getAll();

    return tools.map(tool => {
      const schema = zodToJsonSchema(tool.schema) as Record<string, unknown>;
      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object' as const,
          properties: (schema.properties as Record<string, unknown>) || {},
          required: (schema.required as string[]) || [],
        },
      };
    });
  }

  /* ---------- Stats ---------- */

  /**
   * Get registry statistics
   */
  getStats(): ToolRegistryStats {
    const byCategory: Record<ToolCategory, number> = {
      information: 0,
      utility: 0,
      media: 0,
      code: 0,
      integration: 0,
      custom: 0,
    };

    for (const tool of this.getAll()) {
      const category = tool.category || 'custom';
      byCategory[category]++;
    }

    return {
      totalTools: this.tools.size,
      byCategory,
      executionCounts: Object.fromEntries(this.executionCounts),
    };
  }

  /**
   * Get execution count for a tool
   */
  getExecutionCount(name: string): number {
    return this.executionCounts.get(name) || 0;
  }

  /**
   * Reset execution counts
   */
  resetExecutionCounts(): void {
    for (const name of this.executionCounts.keys()) {
      this.executionCounts.set(name, 0);
    }
  }
}

/* ---------- Singleton Export ---------- */

export const toolRegistry = ToolRegistry.getInstance();
