/**
 * Tool Policy Service - OpenClaw Pattern
 *
 * Filters tools based on policies before sending to LLM.
 * Provides security and context-based tool filtering.
 */

import type { ToolDefinition } from './ToolCallingService';
import { toolLogger } from './ToolLogger';

/**
 * A policy defines which tools are allowed/denied
 */
export interface ToolPolicy {
  name: string;
  description?: string;
  allowedTools?: string[];      // Whitelist (if set, only these tools)
  deniedTools?: string[];       // Blacklist (always denied)
  requiresAuth?: boolean;       // Require user authentication
  maxExecutionsPerMinute?: number;
  categories?: string[];        // Allow entire categories
}

/**
 * Tool categories for grouping
 */
export type ToolCategory = 'todo' | 'web' | 'utility' | 'system' | 'dangerous';

/**
 * Tool metadata including category
 */
interface ToolMetadata {
  name: string;
  category: ToolCategory;
}

/**
 * Default policies
 */
const DEFAULT_POLICIES: ToolPolicy[] = [
  {
    name: 'safe',
    description: 'Allow all safe tools, deny dangerous operations',
    deniedTools: ['execute_code', 'shell_exec', 'file_write', 'file_delete'],
    categories: ['todo', 'web', 'utility']
  },
  {
    name: 'todo_only',
    description: 'Only todo management tools',
    allowedTools: ['add_todo', 'list_todos', 'complete_todo', 'remove_todo', 'clear_completed_todos']
  },
  {
    name: 'web_only',
    description: 'Only web search and fetch tools',
    allowedTools: ['web_search', 'fetch_url', 'get_current_datetime']
  },
  {
    name: 'minimal',
    description: 'Minimal safe tools for basic operations',
    allowedTools: ['list_todos', 'get_current_datetime']
  },
  {
    name: 'all',
    description: 'Allow all tools (use with caution)',
    deniedTools: []
  },
  {
    name: 'offline',
    description: 'Only tools that work offline',
    deniedTools: ['web_search', 'fetch_url'],
    categories: ['todo', 'utility']
  }
];

/**
 * Default tool categories
 */
const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  // Todo tools
  'add_todo': 'todo',
  'list_todos': 'todo',
  'complete_todo': 'todo',
  'remove_todo': 'todo',
  'clear_completed_todos': 'todo',

  // Web tools
  'web_search': 'web',
  'fetch_url': 'web',
  'get_current_datetime': 'utility',

  // Utility tools
  'calculate': 'utility',
  'translate': 'utility',

  // System/dangerous tools
  'execute_code': 'dangerous',
  'shell_exec': 'dangerous',
  'file_write': 'dangerous',
  'file_delete': 'dangerous',
  'file_read': 'system'
};

/**
 * Rate limiting tracker
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class ToolPolicyService {
  private policies = new Map<string, ToolPolicy>();
  private activePolicy: string = 'safe';
  private toolCategories = new Map<string, ToolCategory>(Object.entries(TOOL_CATEGORIES));
  private rateLimits = new Map<string, RateLimitEntry>();

  constructor() {
    // Register default policies
    DEFAULT_POLICIES.forEach(p => this.policies.set(p.name, p));
  }

  /**
   * Register a custom policy
   */
  registerPolicy(policy: ToolPolicy): void {
    this.policies.set(policy.name, policy);
    console.log(`[ToolPolicy] Registered policy: ${policy.name}`);
  }

  /**
   * Register a tool's category
   */
  registerToolCategory(toolName: string, category: ToolCategory): void {
    this.toolCategories.set(toolName, category);
  }

  /**
   * Set the active policy
   */
  setActivePolicy(name: string): void {
    if (!this.policies.has(name)) {
      console.warn(`[ToolPolicy] Unknown policy: ${name}, keeping current: ${this.activePolicy}`);
      return;
    }
    this.activePolicy = name;
    console.log(`[ToolPolicy] Active policy: ${name}`);
  }

  /**
   * Get the active policy name
   */
  getActivePolicy(): string {
    return this.activePolicy;
  }

  /**
   * Get all available policies
   */
  getPolicies(): ToolPolicy[] {
    return [...this.policies.values()];
  }

  /**
   * Filter tools based on active policy
   */
  filterTools(tools: ToolDefinition[]): ToolDefinition[] {
    const policy = this.policies.get(this.activePolicy);
    if (!policy) {
      console.warn(`[ToolPolicy] No active policy found`);
      return tools;
    }

    return tools.filter(tool => {
      const allowed = this.isToolAllowed(tool.name, policy);
      if (!allowed) {
        toolLogger.logFiltered(tool.name, `Policy "${policy.name}" denied`);
      }
      return allowed;
    });
  }

  /**
   * Check if a specific tool is allowed under current policy
   */
  isToolAllowed(toolName: string, policy?: ToolPolicy): boolean {
    const activePolicy = policy || this.policies.get(this.activePolicy);
    if (!activePolicy) return true;

    // Check blacklist first
    if (activePolicy.deniedTools?.includes(toolName)) {
      return false;
    }

    // If whitelist exists, tool must be in it
    if (activePolicy.allowedTools && activePolicy.allowedTools.length > 0) {
      return activePolicy.allowedTools.includes(toolName);
    }

    // Check categories if specified
    if (activePolicy.categories && activePolicy.categories.length > 0) {
      const toolCategory = this.toolCategories.get(toolName);
      if (toolCategory && !activePolicy.categories.includes(toolCategory)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check rate limit for a tool
   */
  checkRateLimit(toolName: string): boolean {
    const policy = this.policies.get(this.activePolicy);
    if (!policy?.maxExecutionsPerMinute) return true;

    const now = Date.now();
    const key = `${this.activePolicy}:${toolName}`;
    let entry = this.rateLimits.get(key);

    // Reset if window expired
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + 60000 };
    }

    // Check limit
    if (entry.count >= policy.maxExecutionsPerMinute) {
      toolLogger.logFiltered(toolName, `Rate limit exceeded (${policy.maxExecutionsPerMinute}/min)`);
      return false;
    }

    // Increment
    entry.count++;
    this.rateLimits.set(key, entry);
    return true;
  }

  /**
   * Get tools for a specific policy (for UI display)
   */
  getToolsForPolicy(policyName: string): { allowed: string[]; denied: string[] } {
    const policy = this.policies.get(policyName);
    if (!policy) {
      return { allowed: [], denied: [] };
    }

    const allTools = [...this.toolCategories.keys()];
    const allowed: string[] = [];
    const denied: string[] = [];

    for (const tool of allTools) {
      if (this.isToolAllowed(tool, policy)) {
        allowed.push(tool);
      } else {
        denied.push(tool);
      }
    }

    return { allowed, denied };
  }

  /**
   * Create a policy dynamically based on context
   */
  createContextPolicy(context: {
    isAuthenticated?: boolean;
    isOffline?: boolean;
    userRole?: string;
  }): ToolPolicy {
    const policy: ToolPolicy = {
      name: 'context_policy',
      description: 'Dynamically created context policy',
      deniedTools: []
    };

    // Deny web tools if offline
    if (context.isOffline) {
      policy.deniedTools = [...(policy.deniedTools || []), 'web_search', 'fetch_url'];
    }

    // Deny dangerous tools unless admin
    if (context.userRole !== 'admin') {
      policy.deniedTools = [...(policy.deniedTools || []), 'execute_code', 'shell_exec', 'file_write', 'file_delete'];
    }

    return policy;
  }

  /**
   * Apply a temporary context-based filter
   */
  filterWithContext(
    tools: ToolDefinition[],
    context: Parameters<typeof this.createContextPolicy>[0]
  ): ToolDefinition[] {
    const contextPolicy = this.createContextPolicy(context);

    return tools.filter(tool => {
      // First check active policy
      if (!this.isToolAllowed(tool.name)) {
        return false;
      }

      // Then check context policy
      if (contextPolicy.deniedTools?.includes(tool.name)) {
        toolLogger.logFiltered(tool.name, 'Context policy denied');
        return false;
      }

      return true;
    });
  }
}

// Singleton instance
export const toolPolicyService = new ToolPolicyService();

// Convenience exports
export const filterTools = toolPolicyService.filterTools.bind(toolPolicyService);
export const setToolPolicy = toolPolicyService.setActivePolicy.bind(toolPolicyService);
export const isToolAllowed = toolPolicyService.isToolAllowed.bind(toolPolicyService);
