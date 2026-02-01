/**
 * Lisa Skill Executor
 * Dynamic skill execution with sandboxing and permission checks
 * Phase 3.2: Extensible skills system
 * OpenClaw-inspired architecture
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';
import type { Skill, SkillTool, ToolParameter, SkillPermission } from './SkillsManager';
import { WebSearchTool } from '../tools/WebSearchTool';

// Execution context for skills
export interface SkillExecutionContext {
  skillId: string;
  toolId: string;
  parameters: Record<string, unknown>;
  permissions: SkillPermission[];
  timeout?: number;
  signal?: AbortSignal;
}

// Execution result
export interface SkillExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime: number;
  resourceUsage?: {
    memoryMB?: number;
    networkCalls?: number;
  };
}

// Tool handler function type
export type ToolHandler<T = unknown> = (
  params: Record<string, unknown>,
  context: SkillExecutionContext
) => Promise<T>;

// Registered handlers
interface RegisteredHandler {
  handler: ToolHandler;
  schema?: ToolParameter[];
  requiredPermissions?: SkillPermission[];
}

// Execution history entry
export interface ExecutionHistoryEntry {
  id: string;
  skillId: string;
  toolId: string;
  timestamp: Date;
  parameters: Record<string, unknown>;
  result: SkillExecutionResult;
  userId?: string;
}

export class SkillExecutor extends BrowserEventEmitter {
  private handlers: Map<string, RegisteredHandler> = new Map();
  private executionHistory: ExecutionHistoryEntry[] = [];
  private maxHistorySize = 1000;
  private defaultTimeout = 30000; // 30 seconds
  private grantedPermissions: Set<SkillPermission> = new Set();

  constructor() {
    super();
    this.registerBuiltinHandlers();
  }

  /**
   * Register built-in tool handlers
   */
  private registerBuiltinHandlers(): void {
    // Web Search handler - uses real WebSearchTool
    this.registerHandler('search_web', async (params) => {
      const query = params.query as string;
      const webSearchTool = new WebSearchTool();

      try {
        const result = await webSearchTool.execute({ query });

        if (result.success && result.output) {
          return {
            query,
            engine: 'google',
            results: result.output.results.map(r => ({
              title: r.title,
              url: r.link,
              snippet: r.snippet
            }))
          };
        } else {
          // Fallback to DuckDuckGo instant answer API (free, no key required)
          const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
          const response = await fetch(ddgUrl);
          const data = await response.json();

          const results = [];
          if (data.AbstractText) {
            results.push({
              title: data.Heading || query,
              url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
              snippet: data.AbstractText
            });
          }

          // Add related topics
          if (data.RelatedTopics) {
            for (const topic of data.RelatedTopics.slice(0, 5)) {
              if (topic.Text && topic.FirstURL) {
                results.push({
                  title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 50),
                  url: topic.FirstURL,
                  snippet: topic.Text
                });
              }
            }
          }

          return { query, engine: 'duckduckgo', results };
        }
      } catch (error) {
        console.error('[SkillExecutor] Web search error:', error);
        // Return empty results on error
        return {
          query,
          engine: 'fallback',
          results: [],
          error: error instanceof Error ? error.message : 'Search failed'
        };
      }
    }, { requiredPermissions: ['network_access'] });

    // Code execution handler
    this.registerHandler('execute_code', async (params, context) => {
      const code = params.code as string;
      const language = params.language as string;

      // Check permission
      if (!context.permissions.includes('execute_code')) {
        throw new Error('Permission denied: execute_code');
      }

      // Sandboxed execution (simplified)
      if (language === 'javascript') {
        try {
          // Using Function constructor for basic sandboxing
          // In production, use Web Workers or iframe sandbox
          const fn = new Function('return ' + code);
          const result = fn();
          return { success: true, output: result, language };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            language
          };
        }
      }

      return { success: false, error: `Language ${language} not supported in browser`, language };
    }, { requiredPermissions: ['execute_code'] });

    // File read handler (browser mock)
    this.registerHandler('read_file', async (params) => {
      const path = params.path as string;

      // In browser, use localStorage or IndexedDB
      const content = localStorage.getItem(`lisa-file:${path}`);
      if (content === null) {
        throw new Error(`File not found: ${path}`);
      }

      return { path, content, size: content.length };
    }, { requiredPermissions: ['read_files'] });

    // File write handler (browser mock)
    this.registerHandler('write_file', async (params) => {
      const path = params.path as string;
      const content = params.content as string;

      localStorage.setItem(`lisa-file:${path}`, content);

      return { path, size: content.length, success: true };
    }, { requiredPermissions: ['write_files'] });

    // Memory store handler
    this.registerHandler('memory_store', async (params) => {
      const content = params.content as string;
      const tags = (params.tags as string[]) || [];

      const id = `mem_${Date.now()}`;
      const memory = { id, content, tags, timestamp: new Date().toISOString() };

      // Store in localStorage
      const memories = JSON.parse(localStorage.getItem('lisa-memories') || '[]');
      memories.push(memory);
      localStorage.setItem('lisa-memories', JSON.stringify(memories));

      return { id, stored: true };
    });

    // Memory search handler
    this.registerHandler('memory_search', async (params) => {
      const query = (params.query as string).toLowerCase();

      const memories = JSON.parse(localStorage.getItem('lisa-memories') || '[]');
      const results = memories.filter((m: { content: string; tags: string[] }) =>
        m.content.toLowerCase().includes(query) ||
        m.tags.some((t: string) => t.toLowerCase().includes(query))
      );

      return { query, results, count: results.length };
    });

    // Browser navigation handler
    this.registerHandler('browser_navigate', async (params, context) => {
      if (!context.permissions.includes('browser_control')) {
        throw new Error('Permission denied: browser_control');
      }

      const url = params.url as string;
      const action = (params.action as string) || 'navigate';

      // In browser environment, limited to current tab manipulation
      if (action === 'navigate') {
        // Can't actually navigate, return mock result
        return {
          url,
          action,
          status: 'simulated',
          note: 'Browser control limited in web context'
        };
      }

      return { url, action, status: 'completed' };
    }, { requiredPermissions: ['browser_control'] });
  }

  /**
   * Register a tool handler
   */
  registerHandler(
    toolId: string,
    handler: ToolHandler,
    options?: {
      schema?: ToolParameter[];
      requiredPermissions?: SkillPermission[];
    }
  ): void {
    this.handlers.set(toolId, {
      handler,
      schema: options?.schema,
      requiredPermissions: options?.requiredPermissions
    });

    this.emit('handler:registered', { toolId });
  }

  /**
   * Unregister a tool handler
   */
  unregisterHandler(toolId: string): boolean {
    const result = this.handlers.delete(toolId);
    if (result) {
      this.emit('handler:unregistered', { toolId });
    }
    return result;
  }

  /**
   * Check if a handler exists
   */
  hasHandler(toolId: string): boolean {
    return this.handlers.has(toolId);
  }

  /**
   * Grant permissions to the executor
   */
  grantPermission(permission: SkillPermission): void {
    this.grantedPermissions.add(permission);
    this.emit('permission:granted', { permission });
  }

  /**
   * Revoke permissions
   */
  revokePermission(permission: SkillPermission): void {
    this.grantedPermissions.delete(permission);
    this.emit('permission:revoked', { permission });
  }

  /**
   * Check if permission is granted
   */
  hasPermission(permission: SkillPermission): boolean {
    return this.grantedPermissions.has(permission);
  }

  /**
   * Execute a skill tool
   */
  async execute(
    skill: Skill,
    toolId: string,
    parameters: Record<string, unknown>,
    options?: {
      timeout?: number;
      signal?: AbortSignal;
      userId?: string;
    }
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    const executionId = `exec_${startTime}_${Math.random().toString(36).slice(2, 9)}`;

    // Find the tool in skill manifest
    const tool = skill.manifest.tools?.find(t => t.id === toolId);
    if (!tool) {
      return this.recordFailure(executionId, skill.id, toolId, parameters, {
        success: false,
        error: `Tool ${toolId} not found in skill ${skill.id}`,
        executionTime: Date.now() - startTime
      }, options?.userId);
    }

    // Get handler
    const registered = this.handlers.get(toolId);
    if (!registered) {
      return this.recordFailure(executionId, skill.id, toolId, parameters, {
        success: false,
        error: `No handler registered for tool ${toolId}`,
        executionTime: Date.now() - startTime
      }, options?.userId);
    }

    // Check permissions
    const requiredPermissions = registered.requiredPermissions || [];
    for (const perm of requiredPermissions) {
      if (!this.grantedPermissions.has(perm)) {
        return this.recordFailure(executionId, skill.id, toolId, parameters, {
          success: false,
          error: `Permission denied: ${perm}`,
          executionTime: Date.now() - startTime
        }, options?.userId);
      }
    }

    // Validate parameters
    const validationError = this.validateParameters(parameters, tool.parameters);
    if (validationError) {
      return this.recordFailure(executionId, skill.id, toolId, parameters, {
        success: false,
        error: validationError,
        executionTime: Date.now() - startTime
      }, options?.userId);
    }

    // Build context
    const context: SkillExecutionContext = {
      skillId: skill.id,
      toolId,
      parameters,
      permissions: Array.from(this.grantedPermissions),
      timeout: options?.timeout || this.defaultTimeout,
      signal: options?.signal
    };

    // Execute with timeout
    try {
      const result = await this.executeWithTimeout(
        registered.handler,
        parameters,
        context,
        options?.timeout || this.defaultTimeout
      );

      const executionResult: SkillExecutionResult = {
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };

      this.recordExecution(executionId, skill.id, toolId, parameters, executionResult, options?.userId);
      this.emit('execution:completed', { skillId: skill.id, toolId, result: executionResult });

      return executionResult;
    } catch (error) {
      const executionResult: SkillExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };

      this.recordExecution(executionId, skill.id, toolId, parameters, executionResult, options?.userId);
      this.emit('execution:failed', { skillId: skill.id, toolId, error: executionResult.error });

      return executionResult;
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    handler: ToolHandler,
    params: Record<string, unknown>,
    context: SkillExecutionContext,
    timeout: number
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Execution timed out after ${timeout}ms`));
      }, timeout);

      // Check abort signal
      if (context.signal?.aborted) {
        clearTimeout(timer);
        reject(new Error('Execution aborted'));
        return;
      }

      context.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Execution aborted'));
      });

      handler(params, context)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Validate parameters against schema
   */
  private validateParameters(
    params: Record<string, unknown>,
    schema: ToolParameter[]
  ): string | null {
    for (const param of schema) {
      const value = params[param.name];

      // Check required
      if (param.required && (value === undefined || value === null)) {
        return `Missing required parameter: ${param.name}`;
      }

      // Skip optional undefined params
      if (value === undefined || value === null) continue;

      // Type check
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (param.type !== actualType && param.type !== 'object') {
        return `Invalid type for ${param.name}: expected ${param.type}, got ${actualType}`;
      }
    }

    return null;
  }

  /**
   * Record execution in history
   */
  private recordExecution(
    id: string,
    skillId: string,
    toolId: string,
    parameters: Record<string, unknown>,
    result: SkillExecutionResult,
    userId?: string
  ): void {
    const entry: ExecutionHistoryEntry = {
      id,
      skillId,
      toolId,
      timestamp: new Date(),
      parameters,
      result,
      userId
    };

    this.executionHistory.push(entry);

    // Trim history if needed
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Record failure and return result
   */
  private recordFailure(
    id: string,
    skillId: string,
    toolId: string,
    parameters: Record<string, unknown>,
    result: SkillExecutionResult,
    userId?: string
  ): SkillExecutionResult {
    this.recordExecution(id, skillId, toolId, parameters, result, userId);
    this.emit('execution:failed', { skillId, toolId, error: result.error });
    return result;
  }

  /**
   * Get execution history
   */
  getHistory(options?: {
    skillId?: string;
    toolId?: string;
    limit?: number;
    since?: Date;
  }): ExecutionHistoryEntry[] {
    let history = [...this.executionHistory];

    if (options?.skillId) {
      history = history.filter(e => e.skillId === options.skillId);
    }
    if (options?.toolId) {
      history = history.filter(e => e.toolId === options.toolId);
    }
    if (options?.since) {
      history = history.filter(e => e.timestamp >= options.since);
    }

    // Sort by timestamp descending
    history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      history = history.slice(0, options.limit);
    }

    return history;
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    executionsBySkill: Record<string, number>;
    executionsByTool: Record<string, number>;
  } {
    const successful = this.executionHistory.filter(e => e.result.success);
    const failed = this.executionHistory.filter(e => !e.result.success);

    const bySkill: Record<string, number> = {};
    const byTool: Record<string, number> = {};

    for (const entry of this.executionHistory) {
      bySkill[entry.skillId] = (bySkill[entry.skillId] || 0) + 1;
      byTool[entry.toolId] = (byTool[entry.toolId] || 0) + 1;
    }

    const totalTime = this.executionHistory.reduce(
      (sum, e) => sum + e.result.executionTime,
      0
    );

    return {
      totalExecutions: this.executionHistory.length,
      successfulExecutions: successful.length,
      failedExecutions: failed.length,
      averageExecutionTime: this.executionHistory.length > 0
        ? totalTime / this.executionHistory.length
        : 0,
      executionsBySkill: bySkill,
      executionsByTool: byTool
    };
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
    this.emit('history:cleared');
  }

  /**
   * List registered handlers
   */
  listHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler info
   */
  getHandlerInfo(toolId: string): { schema?: ToolParameter[]; permissions?: SkillPermission[] } | undefined {
    const handler = this.handlers.get(toolId);
    if (!handler) return undefined;

    return {
      schema: handler.schema,
      permissions: handler.requiredPermissions
    };
  }
}

// Singleton
let skillExecutorInstance: SkillExecutor | null = null;

export function getSkillExecutor(): SkillExecutor {
  if (!skillExecutorInstance) {
    skillExecutorInstance = new SkillExecutor();
  }
  return skillExecutorInstance;
}

export function resetSkillExecutor(): void {
  if (skillExecutorInstance) {
    skillExecutorInstance.removeAllListeners();
    skillExecutorInstance = null;
  }
}
