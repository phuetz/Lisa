/**
 * Lisa Browser Controller
 * CDP-based browser automation (Playwright-compatible)
 * Inspired by OpenClaw's browser control
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface BrowserConfig {
  headless: boolean;
  executablePath?: string;
  userDataDir?: string;
  viewport: { width: number; height: number };
  timeout: number;
  proxy?: string;
}

export interface BrowserPage {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
  createdAt: Date;
}

export interface BrowserAction {
  type: BrowserActionType;
  target?: string;
  value?: string;
  options?: Record<string, unknown>;
}

export type BrowserActionType = 
  | 'navigate'
  | 'click'
  | 'type'
  | 'screenshot'
  | 'evaluate'
  | 'scroll'
  | 'wait'
  | 'select'
  | 'hover'
  | 'press'
  | 'upload'
  | 'download'
  | 'pdf';

export interface BrowserResult {
  success: boolean;
  action: BrowserActionType;
  data?: unknown;
  screenshot?: string; // base64
  error?: string;
  duration: number;
}

export interface PageSnapshot {
  url: string;
  title: string;
  html: string;
  text: string;
  screenshot?: string;
  timestamp: Date;
}

const DEFAULT_CONFIG: BrowserConfig = {
  headless: true,
  viewport: { width: 1280, height: 720 },
  timeout: 30000
};

export class BrowserController extends BrowserEventEmitter {
  private config: BrowserConfig;
  private pages: Map<string, BrowserPage> = new Map();
  private activePageId: string | null = null;
  private isConnected = false;
  private actionHistory: BrowserResult[] = [];

  constructor(config: Partial<BrowserConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private generatePageId(): string {
    return `page_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  // Connection management
  async connect(): Promise<boolean> {
    if (this.isConnected) return true;

    try {
      // In real implementation, connect to Playwright/Puppeteer
      this.isConnected = true;
      this.emit('browser:connected');
      return true;
    } catch (error) {
      this.emit('browser:error', { error });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    // Close all pages
    for (const pageId of this.pages.keys()) {
      await this.closePage(pageId);
    }

    this.isConnected = false;
    this.emit('browser:disconnected');
  }

  isActive(): boolean {
    return this.isConnected;
  }

  // Page management
  async newPage(url?: string): Promise<BrowserPage> {
    const id = this.generatePageId();
    const page: BrowserPage = {
      id,
      url: url || 'about:blank',
      title: 'New Tab',
      isActive: true,
      createdAt: new Date()
    };

    // Deactivate other pages
    for (const p of this.pages.values()) {
      p.isActive = false;
    }

    this.pages.set(id, page);
    this.activePageId = id;

    if (url) {
      await this.navigate(url);
    }

    this.emit('page:created', page);
    return page;
  }

  async closePage(pageId: string): Promise<boolean> {
    const page = this.pages.get(pageId);
    if (!page) return false;

    this.pages.delete(pageId);

    if (this.activePageId === pageId) {
      const remaining = Array.from(this.pages.keys());
      this.activePageId = remaining.length > 0 ? remaining[0] : null;
      if (this.activePageId) {
        const newActive = this.pages.get(this.activePageId);
        if (newActive) newActive.isActive = true;
      }
    }

    this.emit('page:closed', { pageId });
    return true;
  }

  getPages(): BrowserPage[] {
    return Array.from(this.pages.values());
  }

  getActivePage(): BrowserPage | null {
    return this.activePageId ? this.pages.get(this.activePageId) || null : null;
  }

  setActivePage(pageId: string): boolean {
    if (!this.pages.has(pageId)) return false;

    for (const p of this.pages.values()) {
      p.isActive = p.id === pageId;
    }
    this.activePageId = pageId;
    this.emit('page:activated', { pageId });
    return true;
  }

  // Navigation
  async navigate(url: string): Promise<BrowserResult> {
    const start = Date.now();
    
    try {
      const page = this.getActivePage();
      if (!page) {
        await this.newPage();
      }

      // Simulate navigation
      const activePage = this.getActivePage()!;
      activePage.url = url;
      activePage.title = this.extractTitleFromUrl(url);

      const result: BrowserResult = {
        success: true,
        action: 'navigate',
        data: { url, title: activePage.title },
        duration: Date.now() - start
      };

      this.actionHistory.push(result);
      this.emit('action:navigate', result);
      return result;
    } catch (error) {
      return this.createErrorResult('navigate', error, start);
    }
  }

  private extractTitleFromUrl(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  // Actions
  async click(selector: string): Promise<BrowserResult> {
    const start = Date.now();
    
    try {
      // Simulate click action
      const result: BrowserResult = {
        success: true,
        action: 'click',
        data: { selector },
        duration: Date.now() - start
      };

      this.actionHistory.push(result);
      this.emit('action:click', result);
      return result;
    } catch (error) {
      return this.createErrorResult('click', error, start);
    }
  }

  async type(selector: string, text: string, options?: { delay?: number }): Promise<BrowserResult> {
    const start = Date.now();
    
    try {
      // Simulate type action
      const result: BrowserResult = {
        success: true,
        action: 'type',
        data: { selector, text, options },
        duration: Date.now() - start
      };

      this.actionHistory.push(result);
      this.emit('action:type', result);
      return result;
    } catch (error) {
      return this.createErrorResult('type', error, start);
    }
  }

  async screenshot(options?: { fullPage?: boolean; path?: string }): Promise<BrowserResult> {
    const start = Date.now();
    
    try {
      // Simulate screenshot - in real impl, would capture actual screenshot
      const mockScreenshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const result: BrowserResult = {
        success: true,
        action: 'screenshot',
        screenshot: mockScreenshot,
        data: { options },
        duration: Date.now() - start
      };

      this.actionHistory.push(result);
      this.emit('action:screenshot', result);
      return result;
    } catch (error) {
      return this.createErrorResult('screenshot', error, start);
    }
  }

  async evaluate(script: string): Promise<BrowserResult> {
    const start = Date.now();
    
    try {
      // In real implementation, would evaluate JS in browser context
      // For now, simulate with basic eval
      let evalResult: unknown;
      
      try {
        // Safe evaluation for demo purposes
        if (script === 'document.title') {
          evalResult = this.getActivePage()?.title || '';
        } else if (script === 'window.location.href') {
          evalResult = this.getActivePage()?.url || '';
        } else {
          evalResult = `[Evaluated: ${script.slice(0, 50)}...]`;
        }
      } catch {
        evalResult = null;
      }

      const result: BrowserResult = {
        success: true,
        action: 'evaluate',
        data: { script, result: evalResult },
        duration: Date.now() - start
      };

      this.actionHistory.push(result);
      this.emit('action:evaluate', result);
      return result;
    } catch (error) {
      return this.createErrorResult('evaluate', error, start);
    }
  }

  async scroll(options: { x?: number; y?: number; selector?: string }): Promise<BrowserResult> {
    const start = Date.now();
    
    try {
      const result: BrowserResult = {
        success: true,
        action: 'scroll',
        data: options,
        duration: Date.now() - start
      };

      this.actionHistory.push(result);
      this.emit('action:scroll', result);
      return result;
    } catch (error) {
      return this.createErrorResult('scroll', error, start);
    }
  }

  async wait(ms: number): Promise<BrowserResult> {
    const start = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, ms));

    const result: BrowserResult = {
      success: true,
      action: 'wait',
      data: { ms },
      duration: Date.now() - start
    };

    this.actionHistory.push(result);
    return result;
  }

  async waitForSelector(selector: string, timeout?: number): Promise<BrowserResult> {
    const start = Date.now();
    
    try {
      // Simulate waiting for selector
      await new Promise(resolve => setTimeout(resolve, 100));

      const result: BrowserResult = {
        success: true,
        action: 'wait',
        data: { selector, timeout: timeout || this.config.timeout },
        duration: Date.now() - start
      };

      this.actionHistory.push(result);
      return result;
    } catch (error) {
      return this.createErrorResult('wait', error, start);
    }
  }

  async select(selector: string, value: string): Promise<BrowserResult> {
    const start = Date.now();
    
    try {
      const result: BrowserResult = {
        success: true,
        action: 'select',
        data: { selector, value },
        duration: Date.now() - start
      };

      this.actionHistory.push(result);
      this.emit('action:select', result);
      return result;
    } catch (error) {
      return this.createErrorResult('select', error, start);
    }
  }

  async hover(selector: string): Promise<BrowserResult> {
    const start = Date.now();
    
    try {
      const result: BrowserResult = {
        success: true,
        action: 'hover',
        data: { selector },
        duration: Date.now() - start
      };

      this.actionHistory.push(result);
      this.emit('action:hover', result);
      return result;
    } catch (error) {
      return this.createErrorResult('hover', error, start);
    }
  }

  async press(key: string): Promise<BrowserResult> {
    const start = Date.now();
    
    try {
      const result: BrowserResult = {
        success: true,
        action: 'press',
        data: { key },
        duration: Date.now() - start
      };

      this.actionHistory.push(result);
      this.emit('action:press', result);
      return result;
    } catch (error) {
      return this.createErrorResult('press', error, start);
    }
  }

  async pdf(options?: { path?: string; format?: string }): Promise<BrowserResult> {
    const start = Date.now();
    
    try {
      const result: BrowserResult = {
        success: true,
        action: 'pdf',
        data: { options, generated: true },
        duration: Date.now() - start
      };

      this.actionHistory.push(result);
      this.emit('action:pdf', result);
      return result;
    } catch (error) {
      return this.createErrorResult('pdf', error, start);
    }
  }

  // Snapshot
  async snapshot(): Promise<PageSnapshot | null> {
    const page = this.getActivePage();
    if (!page) return null;

    const screenshotResult = await this.screenshot();

    return {
      url: page.url,
      title: page.title,
      html: '<html><!-- Page HTML would be captured here --></html>',
      text: 'Page text content would be extracted here',
      screenshot: screenshotResult.screenshot,
      timestamp: new Date()
    };
  }

  // Execute action batch
  async execute(actions: BrowserAction[]): Promise<BrowserResult[]> {
    const results: BrowserResult[] = [];

    for (const action of actions) {
      let result: BrowserResult;

      switch (action.type) {
        case 'navigate':
          result = await this.navigate(action.value || '');
          break;
        case 'click':
          result = await this.click(action.target || '');
          break;
        case 'type':
          result = await this.type(action.target || '', action.value || '');
          break;
        case 'screenshot':
          result = await this.screenshot(action.options);
          break;
        case 'evaluate':
          result = await this.evaluate(action.value || '');
          break;
        case 'scroll':
          result = await this.scroll(action.options || {});
          break;
        case 'wait':
          result = await this.wait(Number(action.value) || 1000);
          break;
        case 'select':
          result = await this.select(action.target || '', action.value || '');
          break;
        case 'hover':
          result = await this.hover(action.target || '');
          break;
        case 'press':
          result = await this.press(action.value || 'Enter');
          break;
        case 'pdf':
          result = await this.pdf(action.options);
          break;
        default:
          result = {
            success: false,
            action: action.type,
            error: `Unknown action: ${action.type}`,
            duration: 0
          };
      }

      results.push(result);

      // Stop on error if not in batch mode
      if (!result.success) break;
    }

    return results;
  }

  // History
  getHistory(limit?: number): BrowserResult[] {
    const history = [...this.actionHistory];
    return limit ? history.slice(-limit) : history;
  }

  clearHistory(): void {
    this.actionHistory = [];
  }

  // Error helper
  private createErrorResult(action: BrowserActionType, error: unknown, start: number): BrowserResult {
    const result: BrowserResult = {
      success: false,
      action,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start
    };
    this.actionHistory.push(result);
    this.emit('action:error', result);
    return result;
  }

  // Config
  getConfig(): BrowserConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<BrowserConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:changed', this.config);
  }

  // Stats
  getStats(): {
    isConnected: boolean;
    pageCount: number;
    actionCount: number;
    successRate: number;
  } {
    const successCount = this.actionHistory.filter(r => r.success).length;
    return {
      isConnected: this.isConnected,
      pageCount: this.pages.size,
      actionCount: this.actionHistory.length,
      successRate: this.actionHistory.length > 0 
        ? Math.round((successCount / this.actionHistory.length) * 100) 
        : 100
    };
  }
}

// Singleton
let browserControllerInstance: BrowserController | null = null;

export function getBrowserController(): BrowserController {
  if (!browserControllerInstance) {
    browserControllerInstance = new BrowserController();
  }
  return browserControllerInstance;
}

export function resetBrowserController(): void {
  if (browserControllerInstance) {
    browserControllerInstance.disconnect();
    browserControllerInstance.removeAllListeners();
    browserControllerInstance = null;
  }
}

