/**
 * Chrome Bridge - Bidirectional Browser Control
 *
 * Adapted from Code Buddy's chrome-bridge.ts for Lisa's in-browser context.
 * Since Lisa runs directly in the browser, actions execute via real DOM APIs
 * (document.querySelector, window.location, etc.) instead of CDP or Native Messaging.
 *
 * Capabilities:
 * - Execute browser actions (click, type, navigate, scroll, select, evaluate, screenshot, wait)
 * - Ingest page snapshots and messages from external sources
 * - Record user actions for replay
 * - Track console errors, network requests, DOM state
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

// ============================================================================
// Types (aligned with Code Buddy's chrome-bridge.ts)
// ============================================================================

export interface DOMElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  attributes: Record<string, string>;
  children: number;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  type: string;
  timestamp: number;
}

export interface RecordedAction {
  type: 'click' | 'input' | 'navigation' | 'scroll';
  target: string;
  value?: string;
  timestamp: number;
}

export interface BridgeBrowserAction {
  type: 'click' | 'type' | 'navigate' | 'scroll' | 'select' | 'evaluate' | 'screenshot' | 'wait';
  /** CSS selector for click/type/select */
  selector?: string;
  /** URL for navigate action */
  url?: string;
  /** Text for type action */
  text?: string;
  /** Value for select action */
  value?: string;
  /** JavaScript expression for evaluate action */
  expression?: string;
  /** Scroll direction and amount */
  scroll?: { direction: 'up' | 'down' | 'left' | 'right'; amount?: number };
  /** Wait duration in ms */
  waitMs?: number;
  /** Timeout for action in ms (default: 10000) */
  timeout?: number;
}

export interface BrowserActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: number;
}

export interface ChromePageSnapshot {
  url?: string;
  title?: string;
  consoleErrors?: string[];
  networkRequests?: NetworkRequest[];
  domState?: Record<string, DOMElementInfo>;
}

export interface ChromeBridgeMessage {
  type: 'snapshot' | 'console' | 'network' | 'dom' | 'action' | 'page';
  payload: unknown;
}

export interface ChromeBridgeConfig {
  /** Maximum recorded actions to keep */
  maxRecordedActions: number;
  /** Maximum console errors to keep */
  maxConsoleErrors: number;
  /** Maximum network requests to keep */
  maxNetworkRequests: number;
  /** Default action timeout in ms */
  defaultTimeout: number;
  /** Whether to intercept console.error automatically */
  interceptConsoleErrors: boolean;
  /** Whether to intercept network requests via PerformanceObserver */
  interceptNetworkRequests: boolean;
}

const DEFAULT_CONFIG: ChromeBridgeConfig = {
  maxRecordedActions: 500,
  maxConsoleErrors: 200,
  maxNetworkRequests: 500,
  defaultTimeout: 10000,
  interceptConsoleErrors: true,
  interceptNetworkRequests: true,
};

// ============================================================================
// ChromeBridge (Singleton)
// ============================================================================

let instance: ChromeBridge | null = null;

export class ChromeBridge extends BrowserEventEmitter {
  private config: ChromeBridgeConfig;
  private connected = false;
  private recording = false;
  private recordedActions: RecordedAction[] = [];
  private consoleErrors: string[] = [];
  private networkRequests: NetworkRequest[] = [];
  private domState: Map<string, DOMElementInfo> = new Map();
  private currentUrl = '';
  private currentTitle = '';

  // Interceptor cleanup
  private originalConsoleError: ((...args: unknown[]) => void) | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private recordingListeners: Array<{ event: string; handler: EventListener }> = [];

  constructor(config?: Partial<ChromeBridgeConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<ChromeBridgeConfig>): ChromeBridge {
    if (!instance) {
      instance = new ChromeBridge(config);
    }
    return instance;
  }

  static resetInstance(): void {
    if (instance) {
      instance.disconnect();
    }
    instance = null;
  }

  // ============================================================================
  // Connection lifecycle
  // ============================================================================

  /**
   * Connect to the browser context.
   * Since Lisa runs in the browser, this sets up interceptors for
   * console errors and network requests.
   */
  connect(): boolean {
    if (this.connected) return true;

    this.connected = true;
    this.currentUrl = typeof window !== 'undefined' ? window.location.href : 'about:blank';
    this.currentTitle = typeof document !== 'undefined' ? document.title : '';

    if (this.config.interceptConsoleErrors) {
      this.setupConsoleInterceptor();
    }
    if (this.config.interceptNetworkRequests) {
      this.setupNetworkInterceptor();
    }

    this.emit('bridge:connected');
    return true;
  }

  /**
   * Disconnect and clean up interceptors.
   */
  disconnect(): void {
    if (!this.connected) return;

    this.stopRecording();
    this.teardownConsoleInterceptor();
    this.teardownNetworkInterceptor();

    this.connected = false;
    this.emit('bridge:disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ============================================================================
  // Action execution — real DOM operations
  // ============================================================================

  /**
   * Execute a browser action using native DOM APIs.
   */
  async executeAction(action: BridgeBrowserAction): Promise<BrowserActionResult> {
    if (!this.connected) {
      return { success: false, error: 'Chrome bridge not connected', timestamp: Date.now() };
    }

    const timeout = action.timeout ?? this.config.defaultTimeout;

    try {
      const result = await this.withTimeout(
        this.dispatchAction(action),
        timeout,
      );
      if (result.success) {
        this.emit('action:executed', { action, result });
      } else {
        this.emit('action:error', { action, result });
      }
      return result;
    } catch (err) {
      const result: BrowserActionResult = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        timestamp: Date.now(),
      };
      this.emit('action:error', { action, result });
      return result;
    }
  }

  private async dispatchAction(action: BridgeBrowserAction): Promise<BrowserActionResult> {
    switch (action.type) {
      case 'click':
        return this.doClick(action.selector);
      case 'type':
        return this.doType(action.selector, action.text ?? '');
      case 'navigate':
        return this.doNavigate(action.url ?? '');
      case 'scroll':
        return this.doScroll(action.selector, action.scroll);
      case 'select':
        return this.doSelect(action.selector, action.value ?? '');
      case 'evaluate':
        return this.doEvaluate(action.expression ?? '');
      case 'screenshot':
        return this.doScreenshot();
      case 'wait':
        return this.doWait(action.waitMs ?? 1000);
      default:
        return { success: false, error: `Unknown action type: ${(action as BridgeBrowserAction).type}`, timestamp: Date.now() };
    }
  }

  private async doClick(selector?: string): Promise<BrowserActionResult> {
    if (!selector) {
      return { success: false, error: 'Click requires a selector', timestamp: Date.now() };
    }
    const el = document.querySelector(selector);
    if (!el) {
      return { success: false, error: `Element not found: ${selector}`, timestamp: Date.now() };
    }
    (el as HTMLElement).click();
    return {
      success: true,
      data: { selector, tagName: el.tagName.toLowerCase() },
      timestamp: Date.now(),
    };
  }

  private async doType(selector: string | undefined, text: string): Promise<BrowserActionResult> {
    if (!selector) {
      return { success: false, error: 'Type requires a selector', timestamp: Date.now() };
    }
    const el = document.querySelector(selector);
    if (!el) {
      return { success: false, error: `Element not found: ${selector}`, timestamp: Date.now() };
    }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (el instanceof HTMLElement && el.isContentEditable) {
      el.textContent = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      return { success: false, error: `Element is not an input: ${selector}`, timestamp: Date.now() };
    }
    return {
      success: true,
      data: { selector, text, tagName: el.tagName.toLowerCase() },
      timestamp: Date.now(),
    };
  }

  private async doNavigate(url: string): Promise<BrowserActionResult> {
    if (!url) {
      return { success: false, error: 'Navigate requires a URL', timestamp: Date.now() };
    }
    // Validate URL protocol to prevent javascript: and data: injection
    const ALLOWED_PROTOCOLS = ['http:', 'https:', 'about:'];
    try {
      const parsed = new URL(url, window.location.href);
      if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
        return { success: false, error: `Blocked navigation to unsafe protocol: ${parsed.protocol}`, timestamp: Date.now() };
      }
    } catch {
      return { success: false, error: `Invalid URL: ${url}`, timestamp: Date.now() };
    }
    const previousUrl = this.currentUrl;
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
    this.currentUrl = url;
    return {
      success: true,
      data: { url, previousUrl },
      timestamp: Date.now(),
    };
  }

  private async doScroll(
    selector?: string,
    scroll?: { direction: 'up' | 'down' | 'left' | 'right'; amount?: number },
  ): Promise<BrowserActionResult> {
    const amount = scroll?.amount ?? 300;
    const direction = scroll?.direction ?? 'down';

    let dx = 0;
    let dy = 0;
    switch (direction) {
      case 'up': dy = -amount; break;
      case 'down': dy = amount; break;
      case 'left': dx = -amount; break;
      case 'right': dx = amount; break;
    }

    if (selector) {
      const el = document.querySelector(selector);
      if (!el) {
        return { success: false, error: `Element not found: ${selector}`, timestamp: Date.now() };
      }
      el.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
    } else if (typeof window !== 'undefined') {
      window.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
    }

    return {
      success: true,
      data: { direction, amount, selector: selector ?? 'window' },
      timestamp: Date.now(),
    };
  }

  private async doSelect(selector: string | undefined, value: string): Promise<BrowserActionResult> {
    if (!selector) {
      return { success: false, error: 'Select requires a selector', timestamp: Date.now() };
    }
    const el = document.querySelector(selector);
    if (!el) {
      return { success: false, error: `Element not found: ${selector}`, timestamp: Date.now() };
    }
    if (!(el instanceof HTMLSelectElement)) {
      return { success: false, error: `Element is not a <select>: ${selector}`, timestamp: Date.now() };
    }
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      success: true,
      data: { selector, value, tagName: 'select' },
      timestamp: Date.now(),
    };
  }

  private async doEvaluate(expression: string): Promise<BrowserActionResult> {
    if (!expression) {
      return { success: false, error: 'Evaluate requires an expression', timestamp: Date.now() };
    }
    try {
      // Use Function constructor for sandboxed evaluation (no access to local scope)
      const fn = new Function(`'use strict'; return (${expression})`);
      const result = fn();
      return {
        success: true,
        data: result,
        timestamp: Date.now(),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        timestamp: Date.now(),
      };
    }
  }

  private async doScreenshot(): Promise<BrowserActionResult> {
    // html2canvas or similar would be used here in production.
    // Provide a lightweight fallback that captures page metadata.
    try {
      if (typeof document === 'undefined') {
        return { success: false, error: 'No document available', timestamp: Date.now() };
      }

      // Try to use html2canvas if available globally (loaded by app or CDN)
      const html2canvas = (globalThis as Record<string, unknown>).html2canvas as
        | ((el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>)
        | undefined;

      if (html2canvas && typeof html2canvas === 'function') {
        const canvas = await html2canvas(document.documentElement, {
          useCORS: true,
          logging: false,
          scale: 1,
        });
        const dataUrl = canvas.toDataURL('image/png');
        return {
          success: true,
          data: { screenshot: dataUrl, width: canvas.width, height: canvas.height },
          timestamp: Date.now(),
        };
      }

      // Fallback: return page metadata instead of actual screenshot
      return {
        success: true,
        data: {
          screenshot: null,
          fallback: true,
          url: typeof window !== 'undefined' ? window.location.href : '',
          title: document.title,
          viewport: {
            width: typeof window !== 'undefined' ? window.innerWidth : 0,
            height: typeof window !== 'undefined' ? window.innerHeight : 0,
          },
        },
        timestamp: Date.now(),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        timestamp: Date.now(),
      };
    }
  }

  private async doWait(ms: number): Promise<BrowserActionResult> {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return { success: true, data: { waited: ms }, timestamp: Date.now() };
  }

  // ============================================================================
  // Snapshot & message ingestion (from external sources)
  // ============================================================================

  /**
   * Replace all captured browser state with a fresh snapshot.
   * Useful when receiving state from a Chrome extension, iframe, or service worker.
   */
  ingestSnapshot(snapshot: ChromePageSnapshot): void {
    if (snapshot.url) {
      this.currentUrl = snapshot.url;
    }
    if (snapshot.title) {
      this.currentTitle = snapshot.title;
    }
    if (Array.isArray(snapshot.consoleErrors)) {
      this.consoleErrors = [...snapshot.consoleErrors];
    }
    if (Array.isArray(snapshot.networkRequests)) {
      this.networkRequests = snapshot.networkRequests.map((r) => ({ ...r }));
    }
    if (snapshot.domState) {
      this.domState.clear();
      for (const [selector, info] of Object.entries(snapshot.domState)) {
        this.domState.set(selector, { ...info, attributes: { ...info.attributes } });
      }
    }
    this.emit('snapshot:ingested', snapshot);
  }

  /**
   * Handle an individual message from a browser extension or external source.
   */
  ingestMessage(message: ChromeBridgeMessage): void {
    switch (message.type) {
      case 'snapshot':
        this.ingestSnapshot(message.payload as ChromePageSnapshot);
        break;
      case 'console':
        if (typeof message.payload === 'string' && message.payload.trim().length > 0) {
          this.consoleErrors.push(message.payload);
          this.trimArray(this.consoleErrors, this.config.maxConsoleErrors);
        }
        break;
      case 'network':
        if (message.payload && typeof message.payload === 'object' && !Array.isArray(message.payload)) {
          this.networkRequests.push({ ...(message.payload as NetworkRequest) });
          this.trimArray(this.networkRequests, this.config.maxNetworkRequests);
        }
        break;
      case 'dom':
        if (message.payload && typeof message.payload === 'object' && !Array.isArray(message.payload)) {
          const payload = message.payload as { selector?: string; element?: DOMElementInfo };
          if (payload.selector && payload.element) {
            this.domState.set(payload.selector, {
              ...payload.element,
              attributes: { ...payload.element.attributes },
            });
          }
        }
        break;
      case 'action':
        if (this.recording && message.payload && typeof message.payload === 'object' && !Array.isArray(message.payload)) {
          this.recordedActions.push({ ...(message.payload as RecordedAction) });
          this.trimArray(this.recordedActions, this.config.maxRecordedActions);
        }
        break;
      case 'page':
        if (message.payload && typeof message.payload === 'object' && !Array.isArray(message.payload)) {
          const payload = message.payload as { url?: string; title?: string };
          if (payload.url) this.currentUrl = payload.url;
          if (payload.title) this.currentTitle = payload.title;
        }
        break;
      default:
        break;
    }
    this.emit('message:ingested', message);
  }

  // ============================================================================
  // Recording
  // ============================================================================

  /**
   * Start recording user actions on the page.
   * Attaches DOM event listeners for click, input, and scroll events.
   */
  startRecording(): void {
    if (this.recording) return;
    this.recording = true;
    this.recordedActions = [];

    if (typeof document !== 'undefined') {
      const clickHandler = ((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        this.recordedActions.push({
          type: 'click',
          target: this.selectorForElement(target),
          timestamp: Date.now(),
        });
        this.trimArray(this.recordedActions, this.config.maxRecordedActions);
      }) as EventListener;

      const inputHandler = ((e: Event) => {
        const target = e.target as HTMLInputElement;
        this.recordedActions.push({
          type: 'input',
          target: this.selectorForElement(target),
          value: target.value,
          timestamp: Date.now(),
        });
        this.trimArray(this.recordedActions, this.config.maxRecordedActions);
      }) as EventListener;

      const scrollHandler = (() => {
        this.recordedActions.push({
          type: 'scroll',
          target: 'window',
          value: `${window.scrollX},${window.scrollY}`,
          timestamp: Date.now(),
        });
        this.trimArray(this.recordedActions, this.config.maxRecordedActions);
      }) as EventListener;

      document.addEventListener('click', clickHandler, true);
      document.addEventListener('input', inputHandler, true);
      window.addEventListener('scroll', scrollHandler, { passive: true });

      this.recordingListeners = [
        { event: 'click', handler: clickHandler },
        { event: 'input', handler: inputHandler },
        { event: 'scroll', handler: scrollHandler },
      ];
    }

    this.emit('recording:started');
  }

  /**
   * Stop recording user actions.
   */
  stopRecording(): void {
    if (!this.recording) return;
    this.recording = false;

    // Remove DOM listeners
    for (const { event, handler } of this.recordingListeners) {
      if (event === 'scroll') {
        if (typeof window !== 'undefined') {
          window.removeEventListener(event, handler);
        }
      } else {
        if (typeof document !== 'undefined') {
          document.removeEventListener(event, handler, true);
        }
      }
    }
    this.recordingListeners = [];

    this.emit('recording:stopped');
  }

  /**
   * Get all recorded actions.
   */
  getRecordedActions(): RecordedAction[] {
    return [...this.recordedActions];
  }

  /**
   * Check if currently recording.
   */
  isRecording(): boolean {
    return this.recording;
  }

  // ============================================================================
  // State getters
  // ============================================================================

  /**
   * Get captured console errors.
   */
  getConsoleErrors(): string[] {
    return [...this.consoleErrors];
  }

  /**
   * Get captured network requests, optionally filtered by URL substring.
   */
  getNetworkRequests(filter?: string): NetworkRequest[] {
    if (filter) {
      return this.networkRequests.filter((r) => r.url.includes(filter));
    }
    return [...this.networkRequests];
  }

  /**
   * Get DOM state for a selector, or the entire map if no selector given.
   */
  getDOMState(selector?: string): DOMElementInfo | Map<string, DOMElementInfo> | null {
    if (selector) {
      // Check the ingested state first
      const cached = this.domState.get(selector);
      if (cached) {
        return { ...cached, attributes: { ...cached.attributes } };
      }
      // Fall back to live DOM query
      if (typeof document !== 'undefined') {
        const el = document.querySelector(selector);
        if (el) {
          return this.elementToInfo(el as HTMLElement);
        }
      }
      return null;
    }
    // Return a copy of the full map
    const copy = new Map<string, DOMElementInfo>();
    for (const [key, val] of this.domState) {
      copy.set(key, { ...val, attributes: { ...val.attributes } });
    }
    return copy;
  }

  /**
   * Get current page URL and title.
   * Reads from the live window when available, otherwise returns cached values.
   */
  getPageInfo(): { url: string; title: string } {
    if (typeof window !== 'undefined') {
      return {
        url: window.location.href,
        title: typeof document !== 'undefined' ? document.title : this.currentTitle,
      };
    }
    return { url: this.currentUrl, title: this.currentTitle };
  }

  /**
   * Get bridge configuration.
   */
  getConfig(): ChromeBridgeConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Interceptors (auto-capture console errors + network)
  // ============================================================================

  private setupConsoleInterceptor(): void {
    if (typeof console === 'undefined') return;

    this.originalConsoleError = console.error;
    const origError = this.originalConsoleError;
    const errors = this.consoleErrors;
    const maxErrors = this.config.maxConsoleErrors;
    const trimArr = this.trimArray.bind(this);
    const emit = this.emit.bind(this);
    console.error = function (...args: unknown[]) {
      const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      errors.push(message);
      trimArr(errors, maxErrors);
      emit('console:error', message);
      // Call original
      if (origError) {
        origError.apply(console, args);
      }
    };
  }

  private teardownConsoleInterceptor(): void {
    if (this.originalConsoleError && typeof console !== 'undefined') {
      console.error = this.originalConsoleError;
      this.originalConsoleError = null;
    }
  }

  private setupNetworkInterceptor(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.networkRequests.push({
              url: resourceEntry.name,
              method: 'GET', // PerformanceObserver doesn't expose method
              status: 0, // Not available from PerformanceObserver
              type: resourceEntry.initiatorType,
              timestamp: Math.round(resourceEntry.startTime + performance.timeOrigin),
            });
            this.trimArray(this.networkRequests, this.config.maxNetworkRequests);
          }
        }
      });
      this.performanceObserver.observe({ entryTypes: ['resource'] });
    } catch {
      // PerformanceObserver not supported in this environment
      this.performanceObserver = null;
    }
  }

  private teardownNetworkInterceptor(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Generate a CSS selector for a given DOM element.
   */
  private selectorForElement(el: HTMLElement): string {
    if (el.id) return `#${el.id}`;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
    }
    return el.tagName.toLowerCase();
  }

  /**
   * Convert a live DOM element to DOMElementInfo.
   */
  private elementToInfo(el: HTMLElement): DOMElementInfo {
    const attributes: Record<string, string> = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      attributes[attr.name] = attr.value;
    }
    return {
      tagName: el.tagName.toLowerCase(),
      id: el.id || undefined,
      className: el.className || undefined,
      textContent: (el.textContent || '').slice(0, 200),
      attributes,
      children: el.children.length,
    };
  }

  /**
   * Run a promise with a timeout.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Action timed out after ${ms}ms`)), ms);
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); },
      );
    });
  }

  /**
   * Trim an array to a max length, removing oldest entries.
   */
  private trimArray<T>(arr: T[], max: number): void {
    if (arr.length > max) {
      arr.splice(0, arr.length - max);
    }
  }
}

// ============================================================================
// Singleton accessors
// ============================================================================

export function getChromeBridge(config?: Partial<ChromeBridgeConfig>): ChromeBridge {
  return ChromeBridge.getInstance(config);
}

export function resetChromeBridge(): void {
  ChromeBridge.resetInstance();
}
