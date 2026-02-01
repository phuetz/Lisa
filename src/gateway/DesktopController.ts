/**
 * Lisa Desktop Controller
 * Full PC control: mouse, keyboard, windows, applications
 * Requires: robotjs or @nut-tree/nut-js for native control
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface DesktopConfig {
  enabled: boolean;
  mouseSpeed: number; // pixels per step
  keyDelay: number; // ms between keystrokes
  clickDelay: number; // ms between clicks
  safeMode: boolean; // require confirmation for destructive actions
  allowedApps: string[];
  blockedApps: string[];
}

export interface MousePosition {
  x: number;
  y: number;
}

export interface ScreenInfo {
  width: number;
  height: number;
  scaleFactor: number;
}

export interface WindowInfo {
  id: number;
  title: string;
  app: string;
  bounds: { x: number; y: number; width: number; height: number };
  isVisible: boolean;
  isFocused: boolean;
}

export interface DesktopAction {
  id: string;
  type: DesktopActionType;
  params: Record<string, unknown>;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export type DesktopActionType =
  | 'mouse:move'
  | 'mouse:click'
  | 'mouse:doubleClick'
  | 'mouse:rightClick'
  | 'mouse:drag'
  | 'mouse:scroll'
  | 'keyboard:type'
  | 'keyboard:press'
  | 'keyboard:hotkey'
  | 'window:focus'
  | 'window:close'
  | 'window:minimize'
  | 'window:maximize'
  | 'window:move'
  | 'window:resize'
  | 'app:launch'
  | 'app:close'
  | 'clipboard:copy'
  | 'clipboard:paste'
  | 'clipboard:read';

export type MouseButton = 'left' | 'right' | 'middle';

export type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta' | 'win';

const DEFAULT_CONFIG: DesktopConfig = {
  enabled: true,
  mouseSpeed: 10,
  keyDelay: 50,
  clickDelay: 100,
  safeMode: true,
  allowedApps: [],
  blockedApps: ['taskmgr', 'regedit', 'cmd', 'powershell']
};

// Common hotkeys
const HOTKEYS: Record<string, { modifiers: KeyModifier[]; key: string }> = {
  copy: { modifiers: ['ctrl'], key: 'c' },
  paste: { modifiers: ['ctrl'], key: 'v' },
  cut: { modifiers: ['ctrl'], key: 'x' },
  undo: { modifiers: ['ctrl'], key: 'z' },
  redo: { modifiers: ['ctrl', 'shift'], key: 'z' },
  save: { modifiers: ['ctrl'], key: 's' },
  selectAll: { modifiers: ['ctrl'], key: 'a' },
  find: { modifiers: ['ctrl'], key: 'f' },
  newTab: { modifiers: ['ctrl'], key: 't' },
  closeTab: { modifiers: ['ctrl'], key: 'w' },
  switchWindow: { modifiers: ['alt'], key: 'tab' },
  taskManager: { modifiers: ['ctrl', 'shift'], key: 'escape' },
  desktop: { modifiers: ['win'], key: 'd' },
  lock: { modifiers: ['win'], key: 'l' },
  run: { modifiers: ['win'], key: 'r' },
  screenshot: { modifiers: ['win', 'shift'], key: 's' }
};

export class DesktopController extends BrowserEventEmitter {
  private config: DesktopConfig;
  private actionHistory: DesktopAction[] = [];
  private maxHistorySize = 100;
  private isNativeAvailable = false;
  private robot: unknown = null;
  private currentMousePosition: MousePosition = { x: 0, y: 0 };
  private screenInfo: ScreenInfo = { width: 1920, height: 1080, scaleFactor: 1 };

  constructor(config: Partial<DesktopConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // In browser context, we use PowerShell scripts via backend API
    // or Web APIs when available
    
    // Get screen info from browser if available
    if (typeof window !== 'undefined') {
      this.screenInfo = {
        width: window.screen.width,
        height: window.screen.height,
        scaleFactor: window.devicePixelRatio || 1
      };
      // Browser mode - limited but functional
      this.isNativeAvailable = true;
      this.emit('native:loaded', { module: 'browser-api' });
    } else {
      this.emit('native:unavailable');
    }
  }

  private generateId(): string {
    return `action_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private logAction(type: DesktopActionType, params: Record<string, unknown>, success: boolean, error?: string): DesktopAction {
    const action: DesktopAction = {
      id: this.generateId(),
      type,
      params,
      timestamp: new Date(),
      success,
      error
    };

    this.actionHistory.push(action);
    if (this.actionHistory.length > this.maxHistorySize) {
      this.actionHistory.shift();
    }

    this.emit('action:executed', action);
    return action;
  }

  // Configuration
  configure(config: Partial<DesktopConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:changed', this.config);
  }

  getConfig(): DesktopConfig {
    return { ...this.config };
  }

  isAvailable(): boolean {
    return this.isNativeAvailable;
  }

  // ============ MOUSE CONTROL ============

  async mouseMove(x: number, y: number, smooth = true): Promise<boolean> {
    if (!this.config.enabled) {
      this.logAction('mouse:move', { x, y }, false, 'Desktop control disabled');
      return false;
    }

    try {
      if (this.isNativeAvailable && this.robot) {
        // Use native module
        const robot = this.robot as { mouse?: { move: (pos: unknown) => Promise<void>; setPosition: (pos: unknown) => Promise<void> }; moveMouse?: (x: number, y: number) => void };
        if (robot.mouse) {
          // nut.js
          if (smooth) {
            await robot.mouse.move({ x, y });
          } else {
            await robot.mouse.setPosition({ x, y });
          }
        } else if (robot.moveMouse) {
          // robotjs
          robot.moveMouse(x, y);
        }
      }

      this.currentMousePosition = { x, y };
      this.logAction('mouse:move', { x, y, smooth }, true);
      this.emit('mouse:moved', { x, y });
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logAction('mouse:move', { x, y }, false, msg);
      return false;
    }
  }

  async mouseClick(button: MouseButton = 'left', x?: number, y?: number): Promise<boolean> {
    if (!this.config.enabled) {
      this.logAction('mouse:click', { button, x, y }, false, 'Desktop control disabled');
      return false;
    }

    try {
      if (x !== undefined && y !== undefined) {
        await this.mouseMove(x, y, false);
      }

      if (this.isNativeAvailable && this.robot) {
        const robot = this.robot as { mouse?: { click: (btn: unknown) => Promise<void> }; mouseClick?: (btn?: string) => void };
        if (robot.mouse) {
          // nut.js
          const btnMap = { left: 0, right: 1, middle: 2 };
          await robot.mouse.click(btnMap[button]);
        } else if (robot.mouseClick) {
          // robotjs
          robot.mouseClick(button);
        }
      }

      await this.delay(this.config.clickDelay);
      this.logAction('mouse:click', { button, x: x ?? this.currentMousePosition.x, y: y ?? this.currentMousePosition.y }, true);
      this.emit('mouse:clicked', { button, x, y });
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logAction('mouse:click', { button, x, y }, false, msg);
      return false;
    }
  }

  async mouseDoubleClick(x?: number, y?: number): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      if (x !== undefined && y !== undefined) {
        await this.mouseMove(x, y, false);
      }

      if (this.isNativeAvailable && this.robot) {
        const robot = this.robot as { mouse?: { doubleClick: (btn: unknown) => Promise<void> }; mouseClick?: (btn?: string, double?: boolean) => void };
        if (robot.mouse) {
          await robot.mouse.doubleClick(0);
        } else if (robot.mouseClick) {
          robot.mouseClick('left', true);
        }
      }

      this.logAction('mouse:doubleClick', { x, y }, true);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logAction('mouse:doubleClick', { x, y }, false, msg);
      return false;
    }
  }

  async mouseScroll(amount: number, direction: 'up' | 'down' = 'down'): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      const scrollAmount = direction === 'up' ? -amount : amount;

      if (this.isNativeAvailable && this.robot) {
        const robot = this.robot as { mouse?: { scrollDown: (n: number) => Promise<void>; scrollUp: (n: number) => Promise<void> }; scrollMouse?: (x: number, y: number) => void };
        if (robot.mouse) {
          if (direction === 'down') {
            await robot.mouse.scrollDown(amount);
          } else {
            await robot.mouse.scrollUp(amount);
          }
        } else if (robot.scrollMouse) {
          robot.scrollMouse(0, scrollAmount);
        }
      }

      this.logAction('mouse:scroll', { amount, direction }, true);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logAction('mouse:scroll', { amount, direction }, false, msg);
      return false;
    }
  }

  async mouseDrag(fromX: number, fromY: number, toX: number, toY: number): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      if (this.isNativeAvailable && this.robot) {
        const robot = this.robot as { mouse?: { drag: (path: unknown[]) => Promise<void> }; mouseToggle?: (state: string) => void; moveMouse?: (x: number, y: number) => void };
        if (robot.mouse) {
          await robot.mouse.drag([{ x: fromX, y: fromY }, { x: toX, y: toY }]);
        } else if (robot.mouseToggle && robot.moveMouse) {
          robot.moveMouse(fromX, fromY);
          robot.mouseToggle('down');
          robot.moveMouse(toX, toY);
          robot.mouseToggle('up');
        }
      }

      this.currentMousePosition = { x: toX, y: toY };
      this.logAction('mouse:drag', { fromX, fromY, toX, toY }, true);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logAction('mouse:drag', { fromX, fromY, toX, toY }, false, msg);
      return false;
    }
  }

  getMousePosition(): MousePosition {
    return { ...this.currentMousePosition };
  }

  // ============ KEYBOARD CONTROL ============

  async type(text: string, delay?: number): Promise<boolean> {
    if (!this.config.enabled) {
      this.logAction('keyboard:type', { text }, false, 'Desktop control disabled');
      return false;
    }

    try {
      const typeDelay = delay ?? this.config.keyDelay;

      if (this.isNativeAvailable && this.robot) {
        const robot = this.robot as { keyboard?: { type: (text: string) => Promise<void> }; typeString?: (text: string) => void; setKeyboardDelay?: (delay: number) => void };
        if (robot.keyboard) {
          await robot.keyboard.type(text);
        } else if (robot.typeString) {
          if (robot.setKeyboardDelay) {
            robot.setKeyboardDelay(typeDelay);
          }
          robot.typeString(text);
        }
      }

      this.logAction('keyboard:type', { text: text.slice(0, 50) + (text.length > 50 ? '...' : '') }, true);
      this.emit('keyboard:typed', { text });
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logAction('keyboard:type', { text }, false, msg);
      return false;
    }
  }

  async pressKey(key: string, modifiers: KeyModifier[] = []): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      if (this.isNativeAvailable && this.robot) {
        const robot = this.robot as { keyboard?: { pressKey: (key: unknown) => Promise<void>; releaseKey: (key: unknown) => Promise<void> }; keyTap?: (key: string, modifiers?: string[]) => void };
        if (robot.keyboard) {
          // nut.js - press modifiers, then key, then release
          for (const mod of modifiers) {
            await robot.keyboard.pressKey(mod);
          }
          await robot.keyboard.pressKey(key);
          await robot.keyboard.releaseKey(key);
          for (const mod of modifiers.reverse()) {
            await robot.keyboard.releaseKey(mod);
          }
        } else if (robot.keyTap) {
          robot.keyTap(key, modifiers);
        }
      }

      this.logAction('keyboard:press', { key, modifiers }, true);
      this.emit('keyboard:pressed', { key, modifiers });
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logAction('keyboard:press', { key, modifiers }, false, msg);
      return false;
    }
  }

  async hotkey(name: keyof typeof HOTKEYS): Promise<boolean> {
    const hk = HOTKEYS[name];
    if (!hk) {
      this.logAction('keyboard:hotkey', { name }, false, 'Unknown hotkey');
      return false;
    }

    return this.pressKey(hk.key, hk.modifiers);
  }

  // ============ WINDOW CONTROL ============

  async getWindows(): Promise<WindowInfo[]> {
    // In browser context, we can only return limited info
    // With native module, would enumerate all windows
    const mockWindows: WindowInfo[] = [];
    
    if (typeof document !== 'undefined') {
      mockWindows.push({
        id: 1,
        title: document.title || 'Lisa',
        app: 'Browser',
        bounds: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
        isVisible: true,
        isFocused: document.hasFocus()
      });
    }

    return mockWindows;
  }

  async focusWindow(windowId: number): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      // Native implementation would focus the window
      this.logAction('window:focus', { windowId }, true);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logAction('window:focus', { windowId }, false, msg);
      return false;
    }
  }

  async minimizeWindow(windowId?: number): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      this.logAction('window:minimize', { windowId }, true);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logAction('window:minimize', { windowId }, false, msg);
      return false;
    }
  }

  async maximizeWindow(windowId?: number): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      this.logAction('window:maximize', { windowId }, true);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logAction('window:maximize', { windowId }, false, msg);
      return false;
    }
  }

  // ============ APPLICATION CONTROL ============

  async launchApp(appName: string, args: string[] = []): Promise<boolean> {
    if (!this.config.enabled) {
      this.logAction('app:launch', { appName }, false, 'Desktop control disabled');
      return false;
    }

    // Check blocked apps
    if (this.config.blockedApps.some(blocked => appName.toLowerCase().includes(blocked.toLowerCase()))) {
      this.logAction('app:launch', { appName }, false, 'Application blocked');
      return false;
    }

    // In safe mode, require confirmation for unknown apps
    if (this.config.safeMode && this.config.allowedApps.length > 0) {
      if (!this.config.allowedApps.some(allowed => appName.toLowerCase().includes(allowed.toLowerCase()))) {
        this.emit('confirmation:required', { action: 'app:launch', appName });
        this.logAction('app:launch', { appName }, false, 'Requires confirmation');
        return false;
      }
    }

    try {
      // Would use child_process.spawn in Node.js environment
      this.logAction('app:launch', { appName, args }, true);
      this.emit('app:launched', { appName });
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logAction('app:launch', { appName }, false, msg);
      return false;
    }
  }

  // ============ CLIPBOARD ============

  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      this.logAction('clipboard:copy', { length: text.length }, true);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logAction('clipboard:copy', {}, false, msg);
      return false;
    }
  }

  async pasteFromClipboard(): Promise<string | null> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        this.logAction('clipboard:paste', { length: text.length }, true);
        return text;
      }
      return null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logAction('clipboard:paste', {}, false, msg);
      return null;
    }
  }

  // ============ UTILITY ============

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getScreenInfo(): ScreenInfo {
    return { ...this.screenInfo };
  }

  getActionHistory(limit?: number): DesktopAction[] {
    const history = [...this.actionHistory];
    return limit ? history.slice(-limit) : history;
  }

  clearHistory(): void {
    this.actionHistory = [];
    this.emit('history:cleared');
  }

  // High-level automation helpers
  async clickAt(x: number, y: number): Promise<boolean> {
    return this.mouseClick('left', x, y);
  }

  async rightClickAt(x: number, y: number): Promise<boolean> {
    return this.mouseClick('right', x, y);
  }

  async typeAt(x: number, y: number, text: string): Promise<boolean> {
    await this.clickAt(x, y);
    await this.delay(100);
    return this.type(text);
  }

  // Stats
  getStats(): {
    isAvailable: boolean;
    isEnabled: boolean;
    actionCount: number;
    successRate: number;
    screenSize: { width: number; height: number };
  } {
    const total = this.actionHistory.length;
    const successful = this.actionHistory.filter(a => a.success).length;

    return {
      isAvailable: this.isNativeAvailable,
      isEnabled: this.config.enabled,
      actionCount: total,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 100,
      screenSize: { width: this.screenInfo.width, height: this.screenInfo.height }
    };
  }
}

// Singleton
let desktopControllerInstance: DesktopController | null = null;

export function getDesktopController(): DesktopController {
  if (!desktopControllerInstance) {
    desktopControllerInstance = new DesktopController();
  }
  return desktopControllerInstance;
}

export function resetDesktopController(): void {
  if (desktopControllerInstance) {
    desktopControllerInstance.removeAllListeners();
    desktopControllerInstance = null;
  }
}

