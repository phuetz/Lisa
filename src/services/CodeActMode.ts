/**
 * CodeActMode - Code as Action Execution Mode
 *
 * Mode where the LLM writes Python/TypeScript/JavaScript/shell as the universal
 * action instead of calling discrete tools. Only script execution + file reading
 * tools are exposed.
 *
 * Based on the CodeAct paradigm: "Code as Action"
 * - Paper: https://arxiv.org/abs/2402.01030
 * - Manus AI uses this as their primary execution model
 *
 * When enabled:
 * 1. System prompt changes to encourage code generation
 * 2. Only allowed tools (run_code, read_file, search, etc.) are available
 * 3. The LLM is instructed to solve tasks by writing executable scripts
 * 4. Results from script execution feed back into the conversation
 *
 * Ported from Code Buddy (grok-cli) and adapted for browser-compatible Lisa.
 */

// ============================================================================
// Types
// ============================================================================

export interface CodeActConfig {
  /** Primary language for code generation */
  language: 'python' | 'typescript' | 'javascript' | 'shell';
  /** Whether to allow the LLM to install packages */
  allowPackageInstall: boolean;
  /** Maximum script execution time in ms */
  scriptTimeout: number;
  /** Auto-persist scripts to workspace */
  persistScripts: boolean;
}

export interface CodeActState {
  enabled: boolean;
  config: CodeActConfig;
  executedScripts: number;
  totalDuration: number;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_CODEACT_CONFIG: CodeActConfig = {
  language: 'python',
  allowPackageInstall: true,
  scriptTimeout: 120000,
  persistScripts: true,
};

/**
 * Tools allowed in CodeAct mode.
 * All other tools are filtered out.
 */
const CODEACT_ALLOWED_TOOLS = new Set([
  'run_code',
  'read_file',
  'search',
  'list_files',
  'write_file',
  'bash',
]);

// ============================================================================
// CodeAct System Prompt
// ============================================================================

const CODEACT_SYSTEM_PROMPT = `You are operating in CodeAct mode. In this mode, you solve tasks by writing and executing code rather than using individual tool calls.

## Rules
1. Write complete, self-contained scripts to accomplish tasks
2. Use the \`run_code\` tool to execute your code
3. Read script output to verify results and iterate if needed
4. You may use \`read_file\`, \`search\`, and \`list_files\` to understand the codebase first
5. For file modifications, write a script that reads, transforms, and writes the file
6. Each script should be fully self-contained — import everything it needs

## Preferred Language: {{LANGUAGE}}

## Tips
- Break complex tasks into sequential scripts
- Print clear output to verify each step
- Handle errors gracefully in your scripts (try/catch, error codes)
- Use the filesystem as working memory (write intermediate results to files)
- You can install packages if needed (pip install / npm install)
- Prefer standard library modules when possible to avoid install overhead
- For data processing, Python with pandas/json is often the most concise approach

## Example
Instead of calling a "grep" tool, write:
\`\`\`python
import subprocess
result = subprocess.run(["grep", "-r", "TODO", "src/"], capture_output=True, text=True)
print(result.stdout)
\`\`\`

Instead of calling multiple file tools, write:
\`\`\`python
import os, json

# Read config
with open("config.json") as f:
    config = json.load(f)

# Transform
config["version"] = "2.0"
config["features"]["codeact"] = True

# Write back
with open("config.json", "w") as f:
    json.dump(config, f, indent=2)

print("Config updated successfully")
\`\`\`
`;

// ============================================================================
// CodeAct Mode Manager (Singleton)
// ============================================================================

export class CodeActMode {
  private static instance: CodeActMode | null = null;

  private enabled = false;
  private config: CodeActConfig;
  private executedScripts = 0;
  private totalDuration = 0;

  private constructor(config?: Partial<CodeActConfig>) {
    this.config = { ...DEFAULT_CODEACT_CONFIG, ...config };
  }

  static getInstance(): CodeActMode {
    if (!CodeActMode.instance) {
      CodeActMode.instance = new CodeActMode();
    }
    return CodeActMode.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    CodeActMode.instance = null;
  }

  /**
   * Enable CodeAct mode, optionally merging new config
   */
  enable(config?: Partial<CodeActConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.enabled = true;
    this.executedScripts = 0;
    this.totalDuration = 0;
    console.info(`[CodeActMode] Enabled (language: ${this.config.language})`);
  }

  /**
   * Disable CodeAct mode
   */
  disable(): void {
    this.enabled = false;
    console.info('[CodeActMode] Disabled');
  }

  /**
   * Toggle CodeAct mode on/off
   */
  toggle(): boolean {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.enabled;
  }

  /**
   * Check if CodeAct mode is active
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current configuration (returns a copy)
   */
  getConfig(): CodeActConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (partial merge)
   */
  setConfig(config: Partial<CodeActConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the CodeAct system prompt supplement.
   * Returns empty string when disabled.
   */
  getSystemPrompt(): string {
    if (!this.enabled) return '';

    return CODEACT_SYSTEM_PROMPT.replace('{{LANGUAGE}}', this.config.language);
  }

  /**
   * Filter tools for CodeAct mode — only allow script execution + file tools.
   * When disabled, returns all tools unchanged.
   *
   * The generic constraint requires tools to have a `function.name` property,
   * matching the OpenAI function-calling tool definition shape.
   */
  filterTools<T extends { function: { name: string } }>(tools: T[]): T[] {
    if (!this.enabled) return tools;

    return tools.filter(t => CODEACT_ALLOWED_TOOLS.has(t.function.name));
  }

  /**
   * Record a script execution for stats tracking
   */
  recordExecution(durationMs: number): void {
    this.executedScripts++;
    this.totalDuration += durationMs;
  }

  /**
   * Get current state snapshot
   */
  getState(): CodeActState {
    return {
      enabled: this.enabled,
      config: { ...this.config },
      executedScripts: this.executedScripts,
      totalDuration: this.totalDuration,
    };
  }

  /**
   * Get the list of allowed tool names in CodeAct mode
   */
  getAllowedTools(): string[] {
    return [...CODEACT_ALLOWED_TOOLS];
  }
}

/**
 * Convenience accessor for the CodeActMode singleton
 */
export function getCodeActMode(): CodeActMode {
  return CodeActMode.getInstance();
}
