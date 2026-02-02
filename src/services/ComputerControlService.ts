/**
 * Computer Control Service
 *
 * Provides an API for LLMs to control the computer, inspired by Open Interpreter.
 *
 * Architecture:
 * - Browser Mode: Limited to screen capture via Screen Capture API
 * - Desktop Mode: Full control via local Python backend with pyautogui
 *
 * @see https://github.com/openinterpreter/open-interpreter
 * @see https://github.com/AmberSahdev/Open-Interface
 */

import { screenCaptureService } from './ScreenCaptureService';

// ============================================================================
// Types
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface ScreenBounds {
  width: number;
  height: number;
}

export interface UIElement {
  type: 'text' | 'icon' | 'button' | 'input' | 'unknown';
  text?: string;
  bounds: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface MouseAction {
  type: 'click' | 'doubleClick' | 'rightClick' | 'move' | 'drag' | 'scroll';
  x?: number;
  y?: number;
  text?: string;      // Click on text (uses vision)
  icon?: string;      // Click on icon description (uses vision)
  button?: 'left' | 'right' | 'middle';
  scrollAmount?: number;
  dragTo?: Point;
}

export interface KeyboardAction {
  type: 'write' | 'hotkey' | 'press';
  text?: string;      // For write
  keys?: string[];    // For hotkey (e.g., ['ctrl', 'c'])
  key?: string;       // For press
}

export interface ComputerAction {
  mouse?: MouseAction;
  keyboard?: KeyboardAction;
  clipboard?: 'copy' | 'paste' | 'view';
  wait?: number;      // Wait in ms
}

export interface ComputerControlConfig {
  /** Use local Python backend for full control */
  useBackend: boolean;
  /** Backend URL (default: http://localhost:8765) */
  backendUrl: string;
  /** Safety delay between actions (ms) */
  actionDelay: number;
  /** Enable screenshot analysis with vision models */
  enableVision: boolean;
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
  screenshot?: string;  // Base64
  clipboardContent?: string;
  elements?: UIElement[];
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ComputerControlConfig = {
  useBackend: false,
  backendUrl: 'http://localhost:8765',
  actionDelay: 100,
  enableVision: true
};

// ============================================================================
// Computer Control Service
// ============================================================================

class ComputerControlService {
  private config: ComputerControlConfig;
  private isBackendConnected = false;
  private screenStream: MediaStream | null = null;
  private interruptRequested = false;

  constructor(config: Partial<ComputerControlConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  configure(config: Partial<ComputerControlConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ComputerControlConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Connection
  // --------------------------------------------------------------------------

  /**
   * Check if backend is available and connect
   */
  async connectBackend(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.backendUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      this.isBackendConnected = response.ok;
      return this.isBackendConnected;
    } catch {
      this.isBackendConnected = false;
      return false;
    }
  }

  /**
   * Check if full computer control is available
   */
  isFullControlAvailable(): boolean {
    return this.isBackendConnected;
  }

  // --------------------------------------------------------------------------
  // Display API
  // --------------------------------------------------------------------------

  /**
   * Capture current screen (computer.display.view)
   */
  async captureScreen(): Promise<string | null> {
    // Try backend first for full screen capture
    if (this.isBackendConnected) {
      try {
        const response = await fetch(`${this.config.backendUrl}/display/view`);
        const data = await response.json();
        return data.screenshot;
      } catch (error) {
        console.warn('[ComputerControl] Backend capture failed, falling back to browser');
      }
    }

    // Browser fallback - use screen capture service
    return await screenCaptureService.captureScreen();
  }

  /**
   * Get screen dimensions
   */
  async getScreenBounds(): Promise<ScreenBounds | null> {
    if (this.isBackendConnected) {
      try {
        const response = await fetch(`${this.config.backendUrl}/display/bounds`);
        return await response.json();
      } catch {
        // Fallback
      }
    }

    // Browser - return window dimensions
    return {
      width: window.screen.width,
      height: window.screen.height
    };
  }

  /**
   * Find UI elements on screen using vision
   */
  async findElements(query: string): Promise<UIElement[]> {
    const screenshot = await this.captureScreen();
    if (!screenshot) return [];

    if (this.isBackendConnected) {
      try {
        const response = await fetch(`${this.config.backendUrl}/display/find`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, screenshot })
        });
        return await response.json();
      } catch {
        return [];
      }
    }

    // Without backend, return empty - would need OCR/vision processing
    console.warn('[ComputerControl] Element finding requires backend or vision model');
    return [];
  }

  // --------------------------------------------------------------------------
  // Mouse API
  // --------------------------------------------------------------------------

  /**
   * Execute mouse action (computer.mouse.*)
   */
  async mouse(action: MouseAction): Promise<ExecutionResult> {
    if (!this.isBackendConnected) {
      return {
        success: false,
        error: 'Mouse control requires desktop backend. Install and run: pip install lisa-desktop && lisa-desktop'
      };
    }

    try {
      // If clicking on text/icon, first find the element
      if (action.text || action.icon) {
        const query = action.text || action.icon || '';
        const elements = await this.findElements(query);

        if (elements.length === 0) {
          return {
            success: false,
            error: `Could not find element: "${query}"`
          };
        }

        // Use center of first matching element
        const el = elements[0];
        action.x = el.bounds.x + el.bounds.width / 2;
        action.y = el.bounds.y + el.bounds.height / 2;
      }

      const response = await fetch(`${this.config.backendUrl}/mouse/${action.type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });

      const result = await response.json();

      // Add delay after action
      await this.delay(this.config.actionDelay);

      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Mouse action failed'
      };
    }
  }

  /**
   * Click at position or on text/icon
   */
  async click(target: string | Point): Promise<ExecutionResult> {
    if (typeof target === 'string') {
      return this.mouse({ type: 'click', text: target });
    }
    return this.mouse({ type: 'click', x: target.x, y: target.y });
  }

  /**
   * Double click
   */
  async doubleClick(target: string | Point): Promise<ExecutionResult> {
    if (typeof target === 'string') {
      return this.mouse({ type: 'doubleClick', text: target });
    }
    return this.mouse({ type: 'doubleClick', x: target.x, y: target.y });
  }

  /**
   * Right click
   */
  async rightClick(target: string | Point): Promise<ExecutionResult> {
    if (typeof target === 'string') {
      return this.mouse({ type: 'rightClick', text: target });
    }
    return this.mouse({ type: 'rightClick', x: target.x, y: target.y });
  }

  /**
   * Move mouse to position or element
   */
  async moveTo(target: string | Point): Promise<ExecutionResult> {
    if (typeof target === 'string') {
      return this.mouse({ type: 'move', icon: target });
    }
    return this.mouse({ type: 'move', x: target.x, y: target.y });
  }

  /**
   * Scroll at current position
   */
  async scroll(amount: number): Promise<ExecutionResult> {
    return this.mouse({ type: 'scroll', scrollAmount: amount });
  }

  /**
   * Drag from current position to target
   */
  async drag(to: Point): Promise<ExecutionResult> {
    return this.mouse({ type: 'drag', dragTo: to });
  }

  // --------------------------------------------------------------------------
  // Keyboard API
  // --------------------------------------------------------------------------

  /**
   * Execute keyboard action (computer.keyboard.*)
   */
  async keyboard(action: KeyboardAction): Promise<ExecutionResult> {
    if (!this.isBackendConnected) {
      return {
        success: false,
        error: 'Keyboard control requires desktop backend. Install and run: pip install lisa-desktop && lisa-desktop'
      };
    }

    try {
      const response = await fetch(`${this.config.backendUrl}/keyboard/${action.type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });

      const result = await response.json();

      await this.delay(this.config.actionDelay);

      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Keyboard action failed'
      };
    }
  }

  /**
   * Type text
   */
  async write(text: string): Promise<ExecutionResult> {
    return this.keyboard({ type: 'write', text });
  }

  /**
   * Press a single key
   */
  async press(key: string): Promise<ExecutionResult> {
    return this.keyboard({ type: 'press', key });
  }

  /**
   * Execute hotkey combination
   */
  async hotkey(...keys: string[]): Promise<ExecutionResult> {
    return this.keyboard({ type: 'hotkey', keys });
  }

  // --------------------------------------------------------------------------
  // Clipboard API
  // --------------------------------------------------------------------------

  /**
   * Get clipboard contents
   */
  async clipboardView(): Promise<string | null> {
    if (this.isBackendConnected) {
      try {
        const response = await fetch(`${this.config.backendUrl}/clipboard/view`);
        const data = await response.json();
        return data.content;
      } catch {
        // Fallback
      }
    }

    // Browser - try to read clipboard
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  }

  /**
   * Copy to clipboard
   */
  async clipboardCopy(text: string): Promise<ExecutionResult> {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Clipboard copy failed'
      };
    }
  }

  // --------------------------------------------------------------------------
  // Action Execution
  // --------------------------------------------------------------------------

  /**
   * Execute a sequence of actions
   */
  async execute(actions: ComputerAction[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    this.interruptRequested = false;

    for (const action of actions) {
      // Check for interrupt
      if (this.interruptRequested) {
        results.push({
          success: false,
          error: 'Execution interrupted by user'
        });
        break;
      }

      let result: ExecutionResult = { success: true };

      if (action.wait) {
        await this.delay(action.wait);
      }

      if (action.mouse) {
        result = await this.mouse(action.mouse);
      }

      if (action.keyboard) {
        const kbResult = await this.keyboard(action.keyboard);
        if (!kbResult.success) result = kbResult;
      }

      if (action.clipboard) {
        if (action.clipboard === 'view') {
          const content = await this.clipboardView();
          result = { success: !!content, clipboardContent: content || undefined };
        } else if (action.clipboard === 'copy') {
          result = await this.hotkey('ctrl', 'c');
        } else if (action.clipboard === 'paste') {
          result = await this.hotkey('ctrl', 'v');
        }
      }

      results.push(result);

      // Stop on error
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Interrupt current execution
   */
  interrupt(): void {
    this.interruptRequested = true;
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --------------------------------------------------------------------------
  // OS API (Open Interpreter compatible)
  // --------------------------------------------------------------------------

  /**
   * Get currently selected text on screen
   */
  async getSelectedText(): Promise<string | null> {
    if (this.isBackendConnected) {
      try {
        const response = await fetch(`${this.config.backendUrl}/os/selected_text`);
        const data = await response.json();
        return data.text;
      } catch {
        // Fallback
      }
    }

    // Browser fallback - use selection API
    const selection = window.getSelection();
    return selection ? selection.toString() : null;
  }

  // --------------------------------------------------------------------------
  // Browser API (Open Interpreter compatible)
  // --------------------------------------------------------------------------

  /**
   * Search the web silently without opening browser
   * Uses Lisa's WebSearchAgent internally
   */
  async browserSearch(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
    try {
      // Use Lisa's existing web search capability
      const { agentRegistry } = await import('../features/agents/core/registry');
      const result = await agentRegistry.execute('WebSearchAgent', {
        command: 'search',
        input: query
      });

      if (result.success && result.output) {
        return result.output.results || [];
      }
      return [];
    } catch (error) {
      console.error('[ComputerControl] Browser search failed:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Files API (Open Interpreter compatible)
  // --------------------------------------------------------------------------

  /**
   * Read a file's contents
   */
  async fileRead(path: string): Promise<string | null> {
    if (this.isBackendConnected) {
      try {
        const response = await fetch(`${this.config.backendUrl}/files/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
        });
        const data = await response.json();
        return data.content;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Write content to a file
   */
  async fileWrite(path: string, content: string): Promise<ExecutionResult> {
    if (!this.isBackendConnected) {
      return { success: false, error: 'File operations require desktop backend' };
    }

    try {
      const response = await fetch(`${this.config.backendUrl}/files/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content })
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'File write failed' };
    }
  }

  /**
   * List files in a directory
   */
  async fileList(path: string): Promise<{ name: string; type: 'file' | 'directory'; size?: number }[]> {
    if (this.isBackendConnected) {
      try {
        const response = await fetch(`${this.config.backendUrl}/files/list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
        });
        const data = await response.json();
        return data.files || [];
      } catch {
        return [];
      }
    }
    return [];
  }

  // --------------------------------------------------------------------------
  // Icon Detection API
  // --------------------------------------------------------------------------

  /**
   * Find icons on screen using template matching
   * @param iconName - Icon description or template name
   * @param threshold - Match confidence threshold (0-1)
   */
  async findIcons(iconName: string, threshold: number = 0.8): Promise<UIElement[]> {
    if (!this.isBackendConnected) {
      console.warn('[ComputerControl] Icon detection requires desktop backend');
      return [];
    }

    try {
      const response = await fetch(`${this.config.backendUrl}/display/find_icons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon: iconName, threshold })
      });
      const data = await response.json();
      return data.icons || [];
    } catch (error) {
      console.error('[ComputerControl] Icon detection failed:', error);
      return [];
    }
  }

  /**
   * Click on an icon by description
   */
  async clickIcon(iconName: string): Promise<ExecutionResult> {
    const icons = await this.findIcons(iconName);
    if (icons.length === 0) {
      return { success: false, error: `Icon not found: "${iconName}"` };
    }

    const icon = icons[0];
    const x = icon.bounds.x + icon.bounds.width / 2;
    const y = icon.bounds.y + icon.bounds.height / 2;

    return this.click({ x, y });
  }

  /**
   * Register a custom icon template for detection
   */
  async registerIconTemplate(name: string, imageBase64: string): Promise<ExecutionResult> {
    if (!this.isBackendConnected) {
      return { success: false, error: 'Icon registration requires desktop backend' };
    }

    try {
      const response = await fetch(`${this.config.backendUrl}/display/register_icon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, template: imageBase64 })
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Icon registration failed' };
    }
  }

  // --------------------------------------------------------------------------
  // Skills API (Open Interpreter inspired)
  // --------------------------------------------------------------------------

  private skills: Map<string, { name: string; description: string; steps: ComputerAction[] }> = new Map();

  /**
   * Learn a new skill from a sequence of actions
   */
  learnSkill(name: string, description: string, steps: ComputerAction[]): void {
    this.skills.set(name, { name, description, steps });
    console.log(`[ComputerControl] Learned skill: ${name}`);
  }

  /**
   * Execute a learned skill
   */
  async executeSkill(name: string): Promise<ExecutionResult[]> {
    const skill = this.skills.get(name);
    if (!skill) {
      return [{ success: false, error: `Skill not found: ${name}` }];
    }
    return this.execute(skill.steps);
  }

  /**
   * List all learned skills
   */
  listSkills(): { name: string; description: string }[] {
    return Array.from(this.skills.values()).map(s => ({
      name: s.name,
      description: s.description
    }));
  }

  /**
   * Remove a skill
   */
  removeSkill(name: string): boolean {
    return this.skills.delete(name);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const computerControlService = new ComputerControlService();
export default computerControlService;

// ============================================================================
// Computer API (Open Interpreter compatible interface)
// ============================================================================

/**
 * Computer API - Open Interpreter compatible interface
 *
 * Usage:
 *   computer.display.view()           - Get screenshot
 *   computer.display.center()         - Get screen center coordinates
 *   computer.mouse.click("text")      - Click on text
 *   computer.mouse.move(x, y)         - Move mouse
 *   computer.keyboard.write("hello")  - Type text
 *   computer.keyboard.hotkey("ctrl", "c") - Execute hotkey
 *   computer.clipboard.view()         - Get clipboard
 *   computer.os.get_selected_text()   - Get selected text
 *   computer.browser.search(query)    - Silent web search
 *   computer.files.read(path)         - Read file
 *   computer.files.write(path, text)  - Write file
 *   computer.skills.learn(...)        - Learn a skill
 *   computer.skills.run(name)         - Execute skill
 */
export const computer = {
  display: {
    view: () => computerControlService.captureScreen(),
    bounds: () => computerControlService.getScreenBounds(),
    center: async () => {
      const bounds = await computerControlService.getScreenBounds();
      return bounds ? { x: bounds.width / 2, y: bounds.height / 2 } : null;
    },
    find: (query: string) => computerControlService.findElements(query),
    findIcons: (iconName: string, threshold?: number) => computerControlService.findIcons(iconName, threshold),
    registerIcon: (name: string, templateBase64: string) => computerControlService.registerIconTemplate(name, templateBase64)
  },
  mouse: {
    click: (target: string | Point) => computerControlService.click(target),
    doubleClick: (target: string | Point) => computerControlService.doubleClick(target),
    rightClick: (target: string | Point) => computerControlService.rightClick(target),
    move: (target: string | Point) => computerControlService.moveTo(target),
    scroll: (amount: number) => computerControlService.scroll(amount),
    drag: (to: Point) => computerControlService.drag(to),
    clickIcon: (iconName: string) => computerControlService.clickIcon(iconName)
  },
  keyboard: {
    write: (text: string) => computerControlService.write(text),
    press: (key: string) => computerControlService.press(key),
    hotkey: (...keys: string[]) => computerControlService.hotkey(...keys)
  },
  clipboard: {
    view: () => computerControlService.clipboardView(),
    copy: (text: string) => computerControlService.clipboardCopy(text)
  },
  os: {
    get_selected_text: () => computerControlService.getSelectedText()
  },
  browser: {
    search: (query: string) => computerControlService.browserSearch(query)
  },
  files: {
    read: (path: string) => computerControlService.fileRead(path),
    write: (path: string, content: string) => computerControlService.fileWrite(path, content),
    list: (path: string) => computerControlService.fileList(path)
  },
  skills: {
    learn: (name: string, description: string, steps: ComputerAction[]) =>
      computerControlService.learnSkill(name, description, steps),
    run: (name: string) => computerControlService.executeSkill(name),
    list: () => computerControlService.listSkills(),
    remove: (name: string) => computerControlService.removeSkill(name)
  },
  // Control methods
  execute: (actions: ComputerAction[]) => computerControlService.execute(actions),
  interrupt: () => computerControlService.interrupt(),
  isAvailable: () => computerControlService.isFullControlAvailable(),
  connect: () => computerControlService.connectBackend()
};
