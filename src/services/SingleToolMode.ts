/**
 * SingleToolMode - Reduces prompt tokens by exposing only ONE tool per LLM turn.
 *
 * When enabled, the LLM only sees a single tool definition instead of the full
 * registry. This focuses the model on the task and significantly reduces prompt
 * token usage.
 *
 * Modes:
 * - Forced tool: always expose a specific tool (set via `enable('tool_name')`)
 * - Auto-select: pick the best tool based on user query keywords
 * - Manual: enabled but no tool selected (returns empty list until set)
 *
 * @example
 * ```typescript
 * const stm = SingleToolMode.getInstance();
 *
 * // Force a specific tool
 * stm.enable('web_search');
 *
 * // Auto-select based on query
 * stm.enable();
 * stm.config.autoSelect = true;
 * const selected = stm.selectToolForQuery('search for cats', tools);
 *
 * // Filter tool list for LLM
 * const filtered = stm.filterTools(openAITools);
 *
 * // Disable
 * stm.disable();
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface SingleToolModeConfig {
  enabled: boolean;
  /** If set, only this tool is available */
  forcedTool?: string;
  /** Auto-select based on user intent keywords */
  autoSelect: boolean;
}

export interface SingleToolModeState {
  enabled: boolean;
  currentTool: string | null;
  config: SingleToolModeConfig;
}

// ============================================================================
// Keyword Mapping
// ============================================================================

/**
 * Maps user intent keywords to tool names.
 * Each entry: [keywords[], toolName].
 * Order matters: first match wins.
 */
const KEYWORD_TOOL_MAP: Array<[string[], string]> = [
  // Web & search
  [['search', 'find', 'look up', 'lookup', 'google', 'query'], 'web_search'],
  [['fetch', 'url', 'http', 'website', 'webpage', 'browse', 'open'], 'fetch_url'],

  // File operations
  [['file', 'read', 'open file', 'load', 'content of'], 'read_file'],
  [['write', 'save', 'create file', 'write file'], 'write_file'],
  [['list files', 'directory', 'folder', 'ls'], 'list_files'],

  // Code
  [['code', 'program', 'script', 'function', 'implement', 'debug'], 'code_interpreter'],
  [['run', 'execute', 'eval', 'interpret'], 'code_interpreter'],

  // Math
  [['calculate', 'math', 'compute', 'multiply', 'divide', 'subtract', 'equation'], 'calculator'],

  // Time
  [['time', 'date', 'clock', 'timezone', 'hour', 'day'], 'get_current_time'],

  // Memory & knowledge
  [['remember', 'memory', 'recall', 'forget', 'store'], 'memory_store'],
  [['knowledge', 'wiki', 'encyclopedia', 'definition', 'define'], 'knowledge_search'],

  // Weather
  [['weather', 'temperature', 'forecast', 'rain', 'sunny', 'cloudy'], 'weather'],

  // Image & media
  [['image', 'picture', 'photo', 'screenshot', 'draw', 'generate image'], 'image_generate'],
  [['video', 'clip', 'play'], 'video_search'],

  // Todo
  [['todo', 'task', 'reminder', 'checklist', 'to-do', 'to do'], 'todo_manage'],

  // Document analysis
  [['pdf', 'document', 'analyze document', 'extract text'], 'document_analyze'],
  [['summarize', 'summary', 'tldr', 'recap'], 'summarize'],

  // Translation
  [['translate', 'translation', 'language'], 'translate'],
];

// ============================================================================
// SingleToolMode Class
// ============================================================================

export class SingleToolMode {
  private static instance: SingleToolMode | null = null;

  private _config: SingleToolModeConfig = {
    enabled: false,
    autoSelect: true,
  };

  private _currentTool: string | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): SingleToolMode {
    if (!SingleToolMode.instance) {
      SingleToolMode.instance = new SingleToolMode();
    }
    return SingleToolMode.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    SingleToolMode.instance = null;
  }

  // ==========================================================================
  // Configuration Accessors
  // ==========================================================================

  get config(): SingleToolModeConfig {
    return this._config;
  }

  // ==========================================================================
  // Enable / Disable / Toggle
  // ==========================================================================

  /**
   * Enable single-tool mode.
   * @param toolName - If provided, force this specific tool. Otherwise, rely
   *   on auto-select or manual selection.
   */
  enable(toolName?: string): void {
    this._config.enabled = true;

    if (toolName) {
      this._config.forcedTool = toolName;
      this._currentTool = toolName;
    }
  }

  /**
   * Disable single-tool mode. Resets forced tool and current selection.
   */
  disable(): void {
    this._config.enabled = false;
    this._config.forcedTool = undefined;
    this._currentTool = null;
  }

  /**
   * Toggle single-tool mode on/off.
   * When toggling on, preserves the previous forced tool if any.
   */
  toggle(): void {
    if (this._config.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Check if single-tool mode is enabled.
   */
  isEnabled(): boolean {
    return this._config.enabled;
  }

  // ==========================================================================
  // Tool Selection
  // ==========================================================================

  /**
   * Select the best tool for a query based on keyword matching.
   *
   * Scans the query for known keywords and returns the name of the matching
   * tool if it exists in the available tools list. If no keyword matches,
   * returns null.
   *
   * @param query - The user's message/query
   * @param availableTools - List of available tools with name and description
   * @returns The selected tool name, or null if no match
   */
  selectToolForQuery(
    query: string,
    availableTools: Array<{ name: string; description: string }>
  ): string | null {
    if (!this._config.autoSelect) {
      return this._currentTool;
    }

    const lowerQuery = query.toLowerCase();
    const availableNames = new Set(availableTools.map(t => t.name));

    // Check forced tool first
    if (this._config.forcedTool && availableNames.has(this._config.forcedTool)) {
      this._currentTool = this._config.forcedTool;
      return this._currentTool;
    }

    // Keyword matching (word-boundary aware to avoid substring false positives)
    for (const [keywords, toolName] of KEYWORD_TOOL_MAP) {
      if (!availableNames.has(toolName)) continue;

      const matched = keywords.some(keyword => {
        // Multi-word keywords use simple includes
        if (keyword.includes(' ')) {
          return lowerQuery.includes(keyword);
        }
        // Single-word keywords use word boundary regex
        const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
        return pattern.test(lowerQuery);
      });
      if (matched) {
        this._currentTool = toolName;
        return toolName;
      }
    }

    // Fallback: try matching tool names/descriptions directly
    for (const tool of availableTools) {
      const toolLower = tool.name.toLowerCase().replace(/_/g, ' ');
      const descLower = tool.description.toLowerCase();

      // Check if any significant word from the query matches the tool name
      const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 3);
      for (const word of queryWords) {
        if (toolLower.includes(word) || descLower.includes(word)) {
          this._currentTool = tool.name;
          return tool.name;
        }
      }
    }

    // No match found
    return null;
  }

  /**
   * Set the current tool manually (without enabling forced mode).
   */
  setCurrentTool(toolName: string | null): void {
    this._currentTool = toolName;
  }

  /**
   * Get the currently selected tool name.
   */
  getCurrentTool(): string | null {
    return this._currentTool;
  }

  // ==========================================================================
  // Tool Filtering
  // ==========================================================================

  /**
   * Filter a list of tools to only include the currently selected tool.
   *
   * Works with any tool format that has `function.name` (OpenAI format,
   * which is the most common). If single-tool mode is disabled or no tool
   * is selected, returns the original list unchanged.
   *
   * @param tools - Array of tool definitions (OpenAI format with function.name)
   * @returns Filtered array (single element or original list)
   */
  filterTools<T extends { function: { name: string } }>(tools: T[]): T[] {
    if (!this._config.enabled) {
      return tools;
    }

    const targetTool = this._config.forcedTool || this._currentTool;
    if (!targetTool) {
      return tools;
    }

    const filtered = tools.filter(t => t.function.name === targetTool);
    return filtered.length > 0 ? filtered : tools;
  }

  /**
   * Filter tools in flat format (name property directly on the object).
   * Works with Gemini format and ToolDefinition format.
   */
  filterToolsFlat<T extends { name: string }>(tools: T[]): T[] {
    if (!this._config.enabled) {
      return tools;
    }

    const targetTool = this._config.forcedTool || this._currentTool;
    if (!targetTool) {
      return tools;
    }

    const filtered = tools.filter(t => t.name === targetTool);
    return filtered.length > 0 ? filtered : tools;
  }

  // ==========================================================================
  // State
  // ==========================================================================

  /**
   * Get the full current state (useful for debugging and UI display).
   */
  getState(): SingleToolModeState {
    return {
      enabled: this._config.enabled,
      currentTool: this._currentTool,
      config: { ...this._config },
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const singleToolMode = SingleToolMode.getInstance();
