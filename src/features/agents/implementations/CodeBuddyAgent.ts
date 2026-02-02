/**
 * Code Buddy Agent
 *
 * AI-powered computer control agent inspired by Open Interpreter's OS Mode.
 * Uses vision models to understand the screen and execute tasks automatically.
 *
 * Capabilities:
 * - Screen analysis with vision models (GPT-4V, Gemini Vision, Claude)
 * - Mouse and keyboard automation
 * - Multi-step task execution with progress tracking
 * - Safety controls and interruption
 *
 * @see https://docs.openinterpreter.com/guides/os-mode
 * @see https://github.com/AmberSahdev/Open-Interface
 */

import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../core/types';
import { computer, computerControlService, type ComputerAction, type UIElement } from '../../../services/ComputerControlService';
import { aiService, type AIMessage } from '../../../services/aiService';

// ============================================================================
// Types
// ============================================================================

interface CodeBuddyTask {
  goal: string;
  steps: string[];
  currentStep: number;
  screenshots: string[];
  attempts: number;
}

interface CodeBuddyConfig {
  /** Maximum steps per task */
  maxSteps: number;
  /** Maximum retries per step */
  maxRetries: number;
  /** Take screenshot after each action */
  screenshotAfterAction: boolean;
  /** Safety mode - require confirmation for destructive actions */
  safetyMode: boolean;
  /** Vision model to use */
  visionModel: 'gemini' | 'openai' | 'anthropic';
}

// ============================================================================
// System Prompts
// ============================================================================

const ANALYSIS_PROMPT = `You are Code Buddy, an AI assistant that can see and control a computer.

You are looking at a screenshot of the user's screen. Your task is to:
1. Understand what's currently visible on the screen
2. Determine the next action to achieve the user's goal
3. Return a specific action to execute

Available actions:
- click(text): Click on visible text or button
- click(x, y): Click at specific coordinates
- doubleClick(text): Double click on element
- rightClick(text): Right click on element
- write(text): Type text using keyboard
- hotkey(key1, key2, ...): Press key combination (e.g., hotkey("ctrl", "c"))
- scroll(amount): Scroll up (positive) or down (negative)
- wait(ms): Wait for specified milliseconds

Response format (JSON):
{
  "analysis": "Brief description of what you see on screen",
  "reasoning": "Why you're taking this action",
  "action": {
    "type": "click|write|hotkey|scroll|wait",
    "params": { ... }
  },
  "isComplete": false,
  "error": null
}

If the goal is achieved, set isComplete to true.
If there's an error or the goal cannot be achieved, set error to a description.

IMPORTANT:
- Be precise with click targets - use exact visible text
- If you can't find an element, describe what you see
- Prefer clicking on buttons/links over typing coordinates
- Always verify the result of actions in subsequent screenshots`;

const DESTRUCTIVE_ACTIONS = ['delete', 'remove', 'uninstall', 'format', 'clear'];

// ============================================================================
// Code Buddy Agent
// ============================================================================

export class CodeBuddyAgent implements BaseAgent {
  name = 'CodeBuddyAgent';
  description = 'AI computer control agent that can see your screen and execute tasks automatically';
  version = '1.0.0';
  domain = 'automation' as const;
  capabilities = [
    'screen_analysis',
    'mouse_control',
    'keyboard_control',
    'task_automation',
    'ui_interaction'
  ];

  private config: CodeBuddyConfig = {
    maxSteps: 20,
    maxRetries: 3,
    screenshotAfterAction: true,
    safetyMode: true,
    visionModel: 'gemini'
  };

  private currentTask: CodeBuddyTask | null = null;
  private isRunning = false;
  private onProgress?: (step: number, total: number, message: string) => void;

  /**
   * Configure the agent
   */
  configure(config: Partial<CodeBuddyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: (step: number, total: number, message: string) => void): void {
    this.onProgress = callback;
  }

  /**
   * Execute a task
   */
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { input, context } = props;
    const goal = typeof input === 'string' ? input : input.goal || input.task;

    if (!goal) {
      return {
        success: false,
        error: 'No task goal specified. Please describe what you want to do.',
        output: null
      };
    }

    // Check if backend is available for full control
    const backendAvailable = await computer.connect();

    if (!backendAvailable) {
      // Limited mode - only screen analysis
      return this.analyzeScreenOnly(goal);
    }

    // Full automation mode
    return this.executeWithAutomation(goal);
  }

  /**
   * Limited mode - only analyze screen and suggest actions
   */
  private async analyzeScreenOnly(goal: string): Promise<AgentExecuteResult> {
    try {
      const screenshot = await computer.display.view();

      if (!screenshot) {
        return {
          success: false,
          error: 'Could not capture screen. Please enable screen sharing.',
          output: null
        };
      }

      // Analyze with vision model
      const analysis = await this.analyzeWithVision(screenshot, goal);

      return {
        success: true,
        output: {
          mode: 'analysis_only',
          message: 'Desktop backend not available. Showing analysis only.',
          analysis: analysis.analysis,
          suggestedAction: analysis.action,
          reasoning: analysis.reasoning,
          installInstructions: `To enable full automation, install the desktop backend:

1. Install Python 3.9+
2. Run: pip install lisa-desktop
3. Start: lisa-desktop
4. Retry your task`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Screen analysis failed',
        output: null
      };
    }
  }

  /**
   * Full automation mode
   */
  private async executeWithAutomation(goal: string): Promise<AgentExecuteResult> {
    this.isRunning = true;
    this.currentTask = {
      goal,
      steps: [],
      currentStep: 0,
      screenshots: [],
      attempts: 0
    };

    // Safety check for destructive actions
    if (this.config.safetyMode) {
      const isDestructive = DESTRUCTIVE_ACTIONS.some(action =>
        goal.toLowerCase().includes(action)
      );

      if (isDestructive) {
        return {
          success: false,
          error: `Safety mode blocked this action. The goal contains potentially destructive keywords. Disable safety mode to proceed.`,
          output: { blockedGoal: goal }
        };
      }
    }

    const results: Array<{
      step: number;
      action: string;
      success: boolean;
      screenshot?: string;
    }> = [];

    try {
      while (
        this.isRunning &&
        this.currentTask.currentStep < this.config.maxSteps
      ) {
        // Capture current screen
        const screenshot = await computer.display.view();

        if (!screenshot) {
          return {
            success: false,
            error: 'Lost screen capture. Please re-enable screen sharing.',
            output: { completedSteps: results }
          };
        }

        this.currentTask.screenshots.push(screenshot);

        // Report progress
        this.onProgress?.(
          this.currentTask.currentStep + 1,
          this.config.maxSteps,
          `Analyzing screen...`
        );

        // Analyze and get next action
        const analysis = await this.analyzeWithVision(screenshot, goal);

        // Check if complete
        if (analysis.isComplete) {
          return {
            success: true,
            output: {
              goal,
              completedSteps: results,
              finalAnalysis: analysis.analysis,
              totalSteps: this.currentTask.currentStep
            }
          };
        }

        // Check for error
        if (analysis.error) {
          return {
            success: false,
            error: analysis.error,
            output: { completedSteps: results }
          };
        }

        // Execute the action
        if (analysis.action) {
          this.onProgress?.(
            this.currentTask.currentStep + 1,
            this.config.maxSteps,
            `Executing: ${analysis.action.type}`
          );

          const actionResult = await this.executeAction(analysis.action);

          results.push({
            step: this.currentTask.currentStep + 1,
            action: JSON.stringify(analysis.action),
            success: actionResult.success,
            screenshot: this.config.screenshotAfterAction
              ? await computer.display.view() || undefined
              : undefined
          });

          if (!actionResult.success) {
            this.currentTask.attempts++;

            if (this.currentTask.attempts >= this.config.maxRetries) {
              return {
                success: false,
                error: `Action failed after ${this.config.maxRetries} attempts: ${actionResult.error}`,
                output: { completedSteps: results }
              };
            }

            // Retry
            continue;
          }

          this.currentTask.attempts = 0;
        }

        this.currentTask.currentStep++;
        this.currentTask.steps.push(analysis.reasoning || 'Action executed');

        // Small delay between steps
        await this.delay(500);
      }

      // Max steps reached
      return {
        success: false,
        error: `Maximum steps (${this.config.maxSteps}) reached without completing the goal`,
        output: { completedSteps: results }
      };
    } finally {
      this.isRunning = false;
      this.currentTask = null;
    }
  }

  /**
   * Analyze screenshot with vision model
   */
  private async analyzeWithVision(
    screenshot: string,
    goal: string
  ): Promise<{
    analysis: string;
    reasoning: string;
    action: { type: string; params: Record<string, unknown> } | null;
    isComplete: boolean;
    error: string | null;
  }> {
    const messages: AIMessage[] = [
      { role: 'system', content: ANALYSIS_PROMPT },
      {
        role: 'user',
        content: `Goal: ${goal}

Screenshot is attached as a base64 image.

[IMAGE: data:image/png;base64,${screenshot}]

What action should I take next to achieve this goal?`
      }
    ];

    try {
      const response = await aiService.sendMessage(messages);

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          analysis: response,
          reasoning: 'Could not parse structured response',
          action: null,
          isComplete: false,
          error: null
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        analysis: parsed.analysis || '',
        reasoning: parsed.reasoning || '',
        action: parsed.action || null,
        isComplete: parsed.isComplete || false,
        error: parsed.error || null
      };
    } catch (error) {
      return {
        analysis: '',
        reasoning: '',
        action: null,
        isComplete: false,
        error: error instanceof Error ? error.message : 'Vision analysis failed'
      };
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: {
    type: string;
    params: Record<string, unknown>;
  }): Promise<{ success: boolean; error?: string }> {
    const { type, params } = action;

    switch (type) {
      case 'click':
        if (params.text) {
          return computer.mouse.click(params.text as string);
        }
        if (params.x !== undefined && params.y !== undefined) {
          return computer.mouse.click({ x: params.x as number, y: params.y as number });
        }
        return { success: false, error: 'Invalid click parameters' };

      case 'doubleClick':
        if (params.text) {
          return computer.mouse.doubleClick(params.text as string);
        }
        return { success: false, error: 'Invalid doubleClick parameters' };

      case 'rightClick':
        if (params.text) {
          return computer.mouse.rightClick(params.text as string);
        }
        return { success: false, error: 'Invalid rightClick parameters' };

      case 'write':
        if (params.text) {
          return computer.keyboard.write(params.text as string);
        }
        return { success: false, error: 'No text to write' };

      case 'hotkey':
        if (params.keys && Array.isArray(params.keys)) {
          return computer.keyboard.hotkey(...(params.keys as string[]));
        }
        return { success: false, error: 'Invalid hotkey parameters' };

      case 'scroll':
        if (params.amount !== undefined) {
          return computer.mouse.scroll(params.amount as number);
        }
        return { success: false, error: 'Invalid scroll amount' };

      case 'wait':
        await this.delay(params.ms as number || 1000);
        return { success: true };

      default:
        return { success: false, error: `Unknown action type: ${type}` };
    }
  }

  /**
   * Stop current execution
   */
  stop(): void {
    this.isRunning = false;
    computer.interrupt();
  }

  /**
   * Get current task status
   */
  getStatus(): {
    isRunning: boolean;
    currentStep: number;
    goal: string | null;
  } {
    return {
      isRunning: this.isRunning,
      currentStep: this.currentTask?.currentStep || 0,
      goal: this.currentTask?.goal || null
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default CodeBuddyAgent;
