/**
 * Interpreter Service
 *
 * Open Interpreter-compatible configuration and execution system for Lisa.
 * Provides profiles, safe mode, auto-run, budget tracking, and more.
 *
 * @see https://docs.openinterpreter.com/settings/all-settings
 */

import { aiService, type AIMessage, type AIProvider } from './aiService';

// ============================================================================
// Types
// ============================================================================

export type SafeMode = 'off' | 'ask' | 'auto';

export interface InterpreterProfile {
  name: string;
  description?: string;

  // LLM Settings
  llm: {
    model: string;
    provider: AIProvider;
    temperature?: number;
    maxTokens?: number;
    contextWindow?: number;
    apiKey?: string;
    apiBase?: string;
    supportsVision?: boolean;
    supportsFunctions?: boolean;
  };

  // Interpreter Settings
  interpreter: {
    autoRun?: boolean;
    safeMode?: SafeMode;
    loop?: boolean;
    verbose?: boolean;
    offline?: boolean;
    maxBudget?: number;  // USD
    customInstructions?: string;
  };

  // Computer Settings
  computer?: {
    enabled?: boolean;
    enableVision?: boolean;
    enableFiles?: boolean;
    enableSkills?: boolean;
  };
}

export interface InterpreterState {
  profile: InterpreterProfile;
  messages: AIMessage[];
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  costUsd: number;
  isRunning: boolean;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  code?: string;
  language?: string;
  error?: string;
  tokenUsage?: { input: number; output: number };
  costUsd?: number;
}

// ============================================================================
// Default Profiles
// ============================================================================

const DEFAULT_PROFILES: Record<string, InterpreterProfile> = {
  default: {
    name: 'default',
    description: 'Default balanced profile',
    llm: {
      model: 'gemini-2.0-flash',
      provider: 'gemini',
      temperature: 0,
      maxTokens: 4096,
      supportsVision: true,
      supportsFunctions: true
    },
    interpreter: {
      autoRun: false,
      safeMode: 'ask',
      loop: true,
      verbose: false,
      offline: false
    },
    computer: {
      enabled: true,
      enableVision: true,
      enableFiles: true,
      enableSkills: true
    }
  },

  fast: {
    name: 'fast',
    description: 'Fast responses with smaller model',
    llm: {
      model: 'gemini-2.0-flash',
      provider: 'gemini',
      temperature: 0,
      maxTokens: 2048,
      supportsVision: false,
      supportsFunctions: true
    },
    interpreter: {
      autoRun: true,
      safeMode: 'off',
      loop: false,
      verbose: false
    }
  },

  vision: {
    name: 'vision',
    description: 'Vision-enabled for screen control',
    llm: {
      model: 'gemini-2.0-flash',
      provider: 'gemini',
      temperature: 0,
      maxTokens: 4096,
      supportsVision: true,
      supportsFunctions: true
    },
    interpreter: {
      autoRun: false,
      safeMode: 'ask',
      loop: true,
      verbose: true
    },
    computer: {
      enabled: true,
      enableVision: true,
      enableFiles: true,
      enableSkills: true
    }
  },

  safe: {
    name: 'safe',
    description: 'Maximum safety with confirmations',
    llm: {
      model: 'gemini-2.0-flash',
      provider: 'gemini',
      temperature: 0,
      maxTokens: 2048,
      supportsVision: false,
      supportsFunctions: true
    },
    interpreter: {
      autoRun: false,
      safeMode: 'auto',
      loop: true,
      verbose: true
    },
    computer: {
      enabled: false
    }
  },

  local: {
    name: 'local',
    description: 'Local LM Studio model',
    llm: {
      model: 'local',
      provider: 'lmstudio',
      temperature: 0.7,
      maxTokens: 2048,
      apiBase: 'http://localhost:1234/v1',
      supportsVision: false,
      supportsFunctions: false
    },
    interpreter: {
      autoRun: false,
      safeMode: 'ask',
      loop: true,
      offline: true
    }
  },

  coding: {
    name: 'coding',
    description: 'Optimized for code generation',
    llm: {
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      temperature: 0,
      maxTokens: 8192,
      supportsVision: true,
      supportsFunctions: true
    },
    interpreter: {
      autoRun: true,
      safeMode: 'off',
      loop: true,
      verbose: false,
      customInstructions: 'You are an expert programmer. Write clean, efficient, well-documented code.'
    }
  }
};

// ============================================================================
// Cost Estimation (per 1M tokens)
// ============================================================================

const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'local': { input: 0, output: 0 }
};

// ============================================================================
// Interpreter Service
// ============================================================================

class InterpreterService {
  private state: InterpreterState;
  private profiles: Map<string, InterpreterProfile> = new Map();
  private onConfirmationNeeded?: (action: string) => Promise<boolean>;

  constructor() {
    // Load default profiles
    Object.entries(DEFAULT_PROFILES).forEach(([name, profile]) => {
      this.profiles.set(name, profile);
    });

    // Initialize state with default profile
    this.state = {
      profile: DEFAULT_PROFILES.default,
      messages: [],
      tokenUsage: { input: 0, output: 0, total: 0 },
      costUsd: 0,
      isRunning: false
    };
  }

  // --------------------------------------------------------------------------
  // Profile Management
  // --------------------------------------------------------------------------

  /**
   * Get available profile names
   */
  listProfiles(): string[] {
    return Array.from(this.profiles.keys());
  }

  /**
   * Get a profile by name
   */
  getProfile(name: string): InterpreterProfile | undefined {
    return this.profiles.get(name);
  }

  /**
   * Load a profile
   */
  loadProfile(name: string): boolean {
    const profile = this.profiles.get(name);
    if (!profile) {
      console.warn(`[Interpreter] Profile not found: ${name}`);
      return false;
    }

    this.state.profile = profile;
    console.log(`[Interpreter] Loaded profile: ${name}`);

    // Apply LLM settings
    aiService.configure({
      provider: profile.llm.provider,
      model: profile.llm.model,
      temperature: profile.llm.temperature,
      maxTokens: profile.llm.maxTokens
    });

    return true;
  }

  /**
   * Add or update a custom profile
   */
  addProfile(profile: InterpreterProfile): void {
    this.profiles.set(profile.name, profile);
    console.log(`[Interpreter] Added profile: ${profile.name}`);
  }

  /**
   * Get current profile
   */
  getCurrentProfile(): InterpreterProfile {
    return this.state.profile;
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  /**
   * Set auto-run mode
   */
  setAutoRun(enabled: boolean): void {
    this.state.profile.interpreter.autoRun = enabled;
  }

  /**
   * Set safe mode
   */
  setSafeMode(mode: SafeMode): void {
    this.state.profile.interpreter.safeMode = mode;
  }

  /**
   * Set max budget
   */
  setMaxBudget(usd: number): void {
    this.state.profile.interpreter.maxBudget = usd;
  }

  /**
   * Set custom instructions
   */
  setCustomInstructions(instructions: string): void {
    this.state.profile.interpreter.customInstructions = instructions;
  }

  /**
   * Set confirmation callback for safe mode
   */
  setConfirmationCallback(callback: (action: string) => Promise<boolean>): void {
    this.onConfirmationNeeded = callback;
  }

  // --------------------------------------------------------------------------
  // Execution
  // --------------------------------------------------------------------------

  /**
   * Execute a user request
   */
  async execute(userMessage: string): Promise<ExecutionResult> {
    const { profile } = this.state;

    // Check budget
    if (profile.interpreter.maxBudget && this.state.costUsd >= profile.interpreter.maxBudget) {
      return {
        success: false,
        error: `Budget exceeded: $${this.state.costUsd.toFixed(4)} / $${profile.interpreter.maxBudget}`
      };
    }

    this.state.isRunning = true;

    try {
      // Build messages
      const messages: AIMessage[] = [
        ...this.buildSystemMessages(),
        ...this.state.messages,
        { role: 'user', content: userMessage }
      ];

      // Add to history
      this.state.messages.push({ role: 'user', content: userMessage });

      // Get response
      const response = await aiService.sendMessage(messages);

      // Estimate tokens (rough estimate)
      const inputTokens = Math.ceil(messages.map(m => m.content).join('').length / 4);
      const outputTokens = Math.ceil(response.length / 4);

      // Update usage
      this.updateTokenUsage(inputTokens, outputTokens);

      // Add response to history
      this.state.messages.push({ role: 'assistant', content: response });

      // Check for code blocks
      const codeMatch = response.match(/```(\w+)?\n([\s\S]*?)```/);

      if (codeMatch) {
        const language = codeMatch[1] || 'python';
        const code = codeMatch[2].trim();

        // Handle safe mode
        if (profile.interpreter.safeMode !== 'off') {
          const shouldRun = await this.checkSafeMode(code, language);
          if (!shouldRun) {
            return {
              success: true,
              output: response,
              code,
              language,
              tokenUsage: { input: inputTokens, output: outputTokens },
              costUsd: this.estimateCost(inputTokens, outputTokens)
            };
          }
        }

        // Auto-run if enabled
        if (profile.interpreter.autoRun) {
          // Would execute code here
          console.log(`[Interpreter] Would execute ${language} code:`, code);
        }
      }

      return {
        success: true,
        output: response,
        code: codeMatch?.[2],
        language: codeMatch?.[1],
        tokenUsage: { input: inputTokens, output: outputTokens },
        costUsd: this.estimateCost(inputTokens, outputTokens)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed'
      };
    } finally {
      this.state.isRunning = false;
    }
  }

  /**
   * Continue execution (loop mode)
   */
  async continueExecution(): Promise<ExecutionResult> {
    if (!this.state.profile.interpreter.loop) {
      return { success: false, error: 'Loop mode is disabled' };
    }

    return this.execute('Continue. If the task is complete, say "Task completed."');
  }

  /**
   * Reset conversation
   */
  reset(): void {
    this.state.messages = [];
    this.state.tokenUsage = { input: 0, output: 0, total: 0 };
    this.state.costUsd = 0;
    console.log('[Interpreter] Conversation reset');
  }

  // --------------------------------------------------------------------------
  // State & Stats
  // --------------------------------------------------------------------------

  /**
   * Get current state
   */
  getState(): InterpreterState {
    return { ...this.state };
  }

  /**
   * Get token usage
   */
  getTokenUsage(): { input: number; output: number; total: number } {
    return { ...this.state.tokenUsage };
  }

  /**
   * Get total cost
   */
  getTotalCost(): number {
    return this.state.costUsd;
  }

  /**
   * Get conversation messages
   */
  getMessages(): AIMessage[] {
    return [...this.state.messages];
  }

  /**
   * Restore conversation from messages
   */
  restoreMessages(messages: AIMessage[]): void {
    this.state.messages = [...messages];
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private buildSystemMessages(): AIMessage[] {
    const { profile } = this.state;
    const parts: string[] = [];

    parts.push(`You are Lisa, an AI assistant with computer control capabilities.`);

    if (profile.interpreter.customInstructions) {
      parts.push(profile.interpreter.customInstructions);
    }

    if (profile.computer?.enabled) {
      parts.push(`
You have access to the computer API:
- computer.display.view() - Screenshot
- computer.mouse.click(text) - Click on element
- computer.keyboard.write(text) - Type text
- computer.keyboard.hotkey(...keys) - Key combination
- computer.clipboard.view() - Get clipboard
- computer.files.read(path) - Read file
- computer.files.write(path, content) - Write file
- computer.browser.search(query) - Web search
`);
    }

    if (profile.interpreter.safeMode === 'auto') {
      parts.push('Always explain what you are going to do before executing any code or action.');
    }

    return [{ role: 'system', content: parts.join('\n\n') }];
  }

  private async checkSafeMode(code: string, language: string): Promise<boolean> {
    const { safeMode } = this.state.profile.interpreter;

    if (safeMode === 'off') return true;

    // Check for dangerous patterns
    const dangerousPatterns = [
      /rm\s+-rf/i,
      /del\s+\/[sfq]/i,
      /format\s+[a-z]:/i,
      /drop\s+database/i,
      /truncate\s+table/i,
      /exec\s*\(/i,
      /eval\s*\(/i,
      /system\s*\(/i
    ];

    const isDangerous = dangerousPatterns.some(p => p.test(code));

    if (safeMode === 'auto' && !isDangerous) {
      return true;
    }

    // Ask for confirmation
    if (this.onConfirmationNeeded) {
      const actionDesc = isDangerous
        ? `Execute potentially dangerous ${language} code:\n${code}`
        : `Execute ${language} code:\n${code}`;

      return await this.onConfirmationNeeded(actionDesc);
    }

    // Default: don't run if can't confirm
    console.warn('[Interpreter] Safe mode blocked execution (no confirmation callback)');
    return false;
  }

  private updateTokenUsage(input: number, output: number): void {
    this.state.tokenUsage.input += input;
    this.state.tokenUsage.output += output;
    this.state.tokenUsage.total += input + output;
    this.state.costUsd += this.estimateCost(input, output);
  }

  private estimateCost(inputTokens: number, outputTokens: number): number {
    const model = this.state.profile.llm.model;
    const costs = TOKEN_COSTS[model] || TOKEN_COSTS['gemini-2.0-flash'];

    return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const interpreterService = new InterpreterService();
export default interpreterService;

// ============================================================================
// Convenience API (Open Interpreter style)
// ============================================================================

export const interpreter = {
  // Profile management
  profiles: () => interpreterService.listProfiles(),
  loadProfile: (name: string) => interpreterService.loadProfile(name),
  addProfile: (profile: InterpreterProfile) => interpreterService.addProfile(profile),

  // Configuration
  get autoRun() { return interpreterService.getCurrentProfile().interpreter.autoRun; },
  set autoRun(v: boolean) { interpreterService.setAutoRun(v); },

  get safeMode() { return interpreterService.getCurrentProfile().interpreter.safeMode; },
  set safeMode(v: SafeMode) { interpreterService.setSafeMode(v); },

  get maxBudget() { return interpreterService.getCurrentProfile().interpreter.maxBudget; },
  set maxBudget(v: number) { interpreterService.setMaxBudget(v); },

  get customInstructions() { return interpreterService.getCurrentProfile().interpreter.customInstructions; },
  set customInstructions(v: string) { interpreterService.setCustomInstructions(v); },

  // Execution
  chat: (message: string) => interpreterService.execute(message),
  continue: () => interpreterService.continueExecution(),
  reset: () => interpreterService.reset(),

  // State
  get messages() { return interpreterService.getMessages(); },
  set messages(v: AIMessage[]) { interpreterService.restoreMessages(v); },

  get tokenUsage() { return interpreterService.getTokenUsage(); },
  get totalCost() { return interpreterService.getTotalCost(); },

  // Confirmation callback
  onConfirmation: (cb: (action: string) => Promise<boolean>) =>
    interpreterService.setConfirmationCallback(cb)
};
