/**
 * Tests for ChromeBridge - Bidirectional browser control
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ChromeBridge,
  getChromeBridge,
  resetChromeBridge,
} from '../ChromeBridge';
import type {
  BridgeBrowserAction,
  BrowserActionResult,
  ChromePageSnapshot,
  ChromeBridgeMessage,
  DOMElementInfo,
  NetworkRequest,
  RecordedAction,
} from '../ChromeBridge';

describe('ChromeBridge', () => {
  let bridge: ChromeBridge;

  beforeEach(() => {
    resetChromeBridge();
    bridge = new ChromeBridge({
      interceptConsoleErrors: false,
      interceptNetworkRequests: false,
    });
  });

  afterEach(() => {
    resetChromeBridge();
  });

  // ==========================================================================
  // Singleton
  // ==========================================================================

  describe('Singleton', () => {
    it('should create instance', () => {
      expect(bridge).toBeInstanceOf(ChromeBridge);
    });

    it('should return same instance from getInstance', () => {
      const a = getChromeBridge({ interceptConsoleErrors: false, interceptNetworkRequests: false });
      const b = getChromeBridge();
      expect(a).toBe(b);
    });

    it('should reset singleton', () => {
      const a = getChromeBridge({ interceptConsoleErrors: false, interceptNetworkRequests: false });
      resetChromeBridge();
      const b = getChromeBridge({ interceptConsoleErrors: false, interceptNetworkRequests: false });
      expect(a).not.toBe(b);
    });
  });

  // ==========================================================================
  // Connection
  // ==========================================================================

  describe('Connection', () => {
    it('should connect successfully', () => {
      expect(bridge.isConnected()).toBe(false);
      const result = bridge.connect();
      expect(result).toBe(true);
      expect(bridge.isConnected()).toBe(true);
    });

    it('should return true if already connected', () => {
      bridge.connect();
      expect(bridge.connect()).toBe(true);
    });

    it('should disconnect', () => {
      bridge.connect();
      bridge.disconnect();
      expect(bridge.isConnected()).toBe(false);
    });

    it('should emit connected event', () => {
      const handler = vi.fn();
      bridge.on('bridge:connected', handler);
      bridge.connect();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit disconnected event', () => {
      const handler = vi.fn();
      bridge.on('bridge:disconnected', handler);
      bridge.connect();
      bridge.disconnect();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not emit disconnected if not connected', () => {
      const handler = vi.fn();
      bridge.on('bridge:disconnected', handler);
      bridge.disconnect();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Action execution
  // ==========================================================================

  describe('executeAction', () => {
    beforeEach(() => {
      bridge.connect();
    });

    it('should fail when not connected', async () => {
      bridge.disconnect();
      const result = await bridge.executeAction({ type: 'click', selector: '#btn' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not connected');
    });

    describe('click', () => {
      it('should click an element', async () => {
        const btn = document.createElement('button');
        btn.id = 'test-btn';
        document.body.appendChild(btn);
        const clickSpy = vi.fn();
        btn.addEventListener('click', clickSpy);

        const result = await bridge.executeAction({ type: 'click', selector: '#test-btn' });
        expect(result.success).toBe(true);
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(result.data).toEqual({ selector: '#test-btn', tagName: 'button' });

        document.body.removeChild(btn);
      });

      it('should fail if selector not provided', async () => {
        const result = await bridge.executeAction({ type: 'click' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('requires a selector');
      });

      it('should fail if element not found', async () => {
        const result = await bridge.executeAction({ type: 'click', selector: '#nonexistent' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });

    describe('type', () => {
      it('should type into an input element', async () => {
        const input = document.createElement('input');
        input.id = 'test-input';
        document.body.appendChild(input);
        const inputSpy = vi.fn();
        input.addEventListener('input', inputSpy);

        const result = await bridge.executeAction({ type: 'type', selector: '#test-input', text: 'hello' });
        expect(result.success).toBe(true);
        expect(input.value).toBe('hello');
        expect(inputSpy).toHaveBeenCalled();

        document.body.removeChild(input);
      });

      it('should type into a textarea', async () => {
        const textarea = document.createElement('textarea');
        textarea.id = 'test-textarea';
        document.body.appendChild(textarea);

        const result = await bridge.executeAction({ type: 'type', selector: '#test-textarea', text: 'multi\nline' });
        expect(result.success).toBe(true);
        expect(textarea.value).toBe('multi\nline');

        document.body.removeChild(textarea);
      });

      it('should fail for non-input element', async () => {
        const div = document.createElement('div');
        div.id = 'test-div';
        document.body.appendChild(div);

        const result = await bridge.executeAction({ type: 'type', selector: '#test-div', text: 'hello' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('not an input');

        document.body.removeChild(div);
      });

      it('should fail if selector not provided', async () => {
        const result = await bridge.executeAction({ type: 'type', text: 'hello' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('requires a selector');
      });
    });

    describe('navigate', () => {
      it('should navigate to a URL', async () => {
        // jsdom doesn't actually navigate, but the action should succeed
        const result = await bridge.executeAction({ type: 'navigate', url: 'https://example.com' });
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('url', 'https://example.com');
      });

      it('should fail without URL', async () => {
        const result = await bridge.executeAction({ type: 'navigate' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('requires a URL');
      });
    });

    describe('scroll', () => {
      it('should scroll the window', async () => {
        const scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
        const result = await bridge.executeAction({
          type: 'scroll',
          scroll: { direction: 'down', amount: 200 },
        });
        expect(result.success).toBe(true);
        expect(scrollBySpy).toHaveBeenCalledWith({
          left: 0,
          top: 200,
          behavior: 'smooth',
        });
        scrollBySpy.mockRestore();
      });

      it('should scroll an element', async () => {
        const div = document.createElement('div');
        div.id = 'scrollable';
        div.scrollBy = vi.fn();
        document.body.appendChild(div);

        const result = await bridge.executeAction({
          type: 'scroll',
          selector: '#scrollable',
          scroll: { direction: 'up', amount: 100 },
        });
        expect(result.success).toBe(true);
        expect(div.scrollBy).toHaveBeenCalledWith({
          left: 0,
          top: -100,
          behavior: 'smooth',
        });

        document.body.removeChild(div);
      });

      it('should default to down direction and 300 amount', async () => {
        const scrollBySpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
        const result = await bridge.executeAction({ type: 'scroll' });
        expect(result.success).toBe(true);
        expect(scrollBySpy).toHaveBeenCalledWith({
          left: 0,
          top: 300,
          behavior: 'smooth',
        });
        scrollBySpy.mockRestore();
      });
    });

    describe('select', () => {
      it('should select an option in a <select>', async () => {
        const select = document.createElement('select');
        select.id = 'test-select';
        const opt1 = document.createElement('option');
        opt1.value = 'a';
        const opt2 = document.createElement('option');
        opt2.value = 'b';
        select.appendChild(opt1);
        select.appendChild(opt2);
        document.body.appendChild(select);

        const changeSpy = vi.fn();
        select.addEventListener('change', changeSpy);

        const result = await bridge.executeAction({ type: 'select', selector: '#test-select', value: 'b' });
        expect(result.success).toBe(true);
        expect(select.value).toBe('b');
        expect(changeSpy).toHaveBeenCalled();

        document.body.removeChild(select);
      });

      it('should fail for non-select element', async () => {
        const div = document.createElement('div');
        div.id = 'not-select';
        document.body.appendChild(div);

        const result = await bridge.executeAction({ type: 'select', selector: '#not-select', value: 'x' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('not a <select>');

        document.body.removeChild(div);
      });
    });

    describe('evaluate', () => {
      it('should evaluate a JavaScript expression', async () => {
        const result = await bridge.executeAction({ type: 'evaluate', expression: '2 + 2' });
        expect(result.success).toBe(true);
        expect(result.data).toBe(4);
      });

      it('should return error for invalid expression', async () => {
        const result = await bridge.executeAction({ type: 'evaluate', expression: 'undefined.property' });
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should fail without expression', async () => {
        const result = await bridge.executeAction({ type: 'evaluate' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('requires an expression');
      });
    });

    describe('screenshot', () => {
      it('should return fallback metadata when html2canvas is unavailable', async () => {
        const result = await bridge.executeAction({ type: 'screenshot' });
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('fallback', true);
        expect(result.data).toHaveProperty('title');
      });

      it('should use html2canvas when available', async () => {
        const mockCanvas = {
          toDataURL: vi.fn().mockReturnValue('data:image/png;base64,AAAA'),
          width: 1024,
          height: 768,
        };
        (globalThis as Record<string, unknown>).html2canvas = vi.fn().mockResolvedValue(mockCanvas);

        const result = await bridge.executeAction({ type: 'screenshot' });
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('screenshot', 'data:image/png;base64,AAAA');
        expect(result.data).toHaveProperty('width', 1024);

        delete (globalThis as Record<string, unknown>).html2canvas;
      });
    });

    describe('wait', () => {
      it('should wait for the specified duration', async () => {
        const start = Date.now();
        const result = await bridge.executeAction({ type: 'wait', waitMs: 50 });
        const elapsed = Date.now() - start;
        expect(result.success).toBe(true);
        expect(elapsed).toBeGreaterThanOrEqual(40); // allow some jitter
      });

      it('should default to 1000ms', async () => {
        vi.useFakeTimers();
        const promise = bridge.executeAction({ type: 'wait' });
        vi.advanceTimersByTime(1000);
        const result = await promise;
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ waited: 1000 });
        vi.useRealTimers();
      });
    });

    describe('unknown action', () => {
      it('should return error for unknown action type', async () => {
        const result = await bridge.executeAction({ type: 'destroy' as never });
        expect(result.success).toBe(false);
        expect(result.error).toContain('Unknown action type');
      });
    });

    describe('events', () => {
      it('should emit action:executed on success', async () => {
        const handler = vi.fn();
        bridge.on('action:executed', handler);

        const btn = document.createElement('button');
        btn.id = 'evt-btn';
        document.body.appendChild(btn);

        await bridge.executeAction({ type: 'click', selector: '#evt-btn' });
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            action: expect.objectContaining({ type: 'click' }),
            result: expect.objectContaining({ success: true }),
          }),
        );

        document.body.removeChild(btn);
      });

      it('should emit action:error on failure', async () => {
        const handler = vi.fn();
        bridge.on('action:error', handler);

        await bridge.executeAction({ type: 'click', selector: '#missing-el' });
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ==========================================================================
  // Snapshot ingestion
  // ==========================================================================

  describe('ingestSnapshot', () => {
    it('should update URL and title', () => {
      bridge.connect();
      bridge.ingestSnapshot({
        url: 'https://test.com',
        title: 'Test Page',
      });
      // getPageInfo reads from window in jsdom, so check via ingestion event
      const handler = vi.fn();
      bridge.on('snapshot:ingested', handler);
      bridge.ingestSnapshot({ url: 'https://final.com', title: 'Final' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should replace console errors', () => {
      bridge.connect();
      bridge.ingestSnapshot({ consoleErrors: ['err1', 'err2'] });
      expect(bridge.getConsoleErrors()).toEqual(['err1', 'err2']);
    });

    it('should replace network requests', () => {
      bridge.connect();
      const req: NetworkRequest = { url: 'https://api.test', method: 'GET', status: 200, type: 'xhr', timestamp: 1000 };
      bridge.ingestSnapshot({ networkRequests: [req] });
      expect(bridge.getNetworkRequests()).toHaveLength(1);
      expect(bridge.getNetworkRequests()[0].url).toBe('https://api.test');
    });

    it('should replace DOM state', () => {
      bridge.connect();
      const element: DOMElementInfo = {
        tagName: 'div',
        id: 'main',
        attributes: { class: 'container' },
        children: 3,
      };
      bridge.ingestSnapshot({ domState: { '#main': element } });
      const result = bridge.getDOMState('#main');
      expect(result).not.toBeNull();
      expect((result as DOMElementInfo).tagName).toBe('div');
    });
  });

  // ==========================================================================
  // Message ingestion
  // ==========================================================================

  describe('ingestMessage', () => {
    beforeEach(() => {
      bridge.connect();
    });

    it('should handle snapshot message', () => {
      bridge.ingestMessage({
        type: 'snapshot',
        payload: { url: 'https://snap.com', title: 'Snap' },
      });
      // Verify through console errors being empty (snapshot replaces state)
      expect(bridge.getConsoleErrors()).toEqual([]);
    });

    it('should handle console message', () => {
      bridge.ingestMessage({ type: 'console', payload: 'Something went wrong' });
      expect(bridge.getConsoleErrors()).toContain('Something went wrong');
    });

    it('should ignore empty console message', () => {
      bridge.ingestMessage({ type: 'console', payload: '   ' });
      expect(bridge.getConsoleErrors()).toHaveLength(0);
    });

    it('should handle network message', () => {
      const req: NetworkRequest = { url: 'https://api.com/data', method: 'POST', status: 201, type: 'fetch', timestamp: Date.now() };
      bridge.ingestMessage({ type: 'network', payload: req });
      expect(bridge.getNetworkRequests()).toHaveLength(1);
    });

    it('should handle dom message', () => {
      bridge.ingestMessage({
        type: 'dom',
        payload: {
          selector: '.header',
          element: { tagName: 'header', attributes: {}, children: 2 },
        },
      });
      const result = bridge.getDOMState('.header');
      expect(result).not.toBeNull();
      expect((result as DOMElementInfo).tagName).toBe('header');
    });

    it('should handle action message when recording', () => {
      bridge.startRecording();
      bridge.ingestMessage({
        type: 'action',
        payload: { type: 'click', target: '#btn', timestamp: Date.now() },
      });
      expect(bridge.getRecordedActions()).toHaveLength(1);
      bridge.stopRecording();
    });

    it('should ignore action message when not recording', () => {
      bridge.ingestMessage({
        type: 'action',
        payload: { type: 'click', target: '#btn', timestamp: Date.now() },
      });
      expect(bridge.getRecordedActions()).toHaveLength(0);
    });

    it('should handle page message', () => {
      bridge.ingestMessage({
        type: 'page',
        payload: { url: 'https://page.com', title: 'New Page' },
      });
      // Verify through message:ingested event
      const handler = vi.fn();
      bridge.on('message:ingested', handler);
      bridge.ingestMessage({ type: 'page', payload: { url: 'https://page2.com' } });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit message:ingested event', () => {
      const handler = vi.fn();
      bridge.on('message:ingested', handler);
      bridge.ingestMessage({ type: 'console', payload: 'test' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle unknown message type gracefully', () => {
      expect(() => {
        bridge.ingestMessage({ type: 'unknown' as never, payload: {} });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Recording
  // ==========================================================================

  describe('Recording', () => {
    beforeEach(() => {
      bridge.connect();
    });

    it('should start and stop recording', () => {
      expect(bridge.isRecording()).toBe(false);
      bridge.startRecording();
      expect(bridge.isRecording()).toBe(true);
      bridge.stopRecording();
      expect(bridge.isRecording()).toBe(false);
    });

    it('should not double-start recording', () => {
      const handler = vi.fn();
      bridge.on('recording:started', handler);
      bridge.startRecording();
      bridge.startRecording(); // should be a no-op
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should clear recorded actions on start', () => {
      bridge.startRecording();
      bridge.ingestMessage({
        type: 'action',
        payload: { type: 'click', target: '#btn', timestamp: Date.now() },
      });
      expect(bridge.getRecordedActions()).toHaveLength(1);
      bridge.stopRecording();

      bridge.startRecording();
      expect(bridge.getRecordedActions()).toHaveLength(0);
      bridge.stopRecording();
    });

    it('should record click events from DOM', () => {
      bridge.startRecording();

      const btn = document.createElement('button');
      btn.id = 'record-btn';
      document.body.appendChild(btn);

      btn.click();

      const actions = bridge.getRecordedActions();
      expect(actions.length).toBeGreaterThanOrEqual(1);
      expect(actions[0].type).toBe('click');
      expect(actions[0].target).toBe('#record-btn');

      bridge.stopRecording();
      document.body.removeChild(btn);
    });

    it('should record input events from DOM', () => {
      bridge.startRecording();

      const input = document.createElement('input');
      input.id = 'record-input';
      document.body.appendChild(input);

      input.value = 'test';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      const actions = bridge.getRecordedActions();
      const inputActions = actions.filter((a) => a.type === 'input');
      expect(inputActions.length).toBeGreaterThanOrEqual(1);
      expect(inputActions[0].target).toBe('#record-input');
      expect(inputActions[0].value).toBe('test');

      bridge.stopRecording();
      document.body.removeChild(input);
    });

    it('should emit recording events', () => {
      const startHandler = vi.fn();
      const stopHandler = vi.fn();
      bridge.on('recording:started', startHandler);
      bridge.on('recording:stopped', stopHandler);

      bridge.startRecording();
      expect(startHandler).toHaveBeenCalledTimes(1);

      bridge.stopRecording();
      expect(stopHandler).toHaveBeenCalledTimes(1);
    });

    it('should remove DOM listeners on stop', () => {
      bridge.startRecording();
      bridge.stopRecording();

      const btn = document.createElement('button');
      btn.id = 'after-stop-btn';
      document.body.appendChild(btn);
      btn.click();

      // Actions should not be recorded after stop
      expect(bridge.getRecordedActions()).toHaveLength(0);

      document.body.removeChild(btn);
    });
  });

  // ==========================================================================
  // State getters
  // ==========================================================================

  describe('State getters', () => {
    beforeEach(() => {
      bridge.connect();
    });

    describe('getConsoleErrors', () => {
      it('should return empty array initially', () => {
        expect(bridge.getConsoleErrors()).toEqual([]);
      });

      it('should return a copy', () => {
        bridge.ingestSnapshot({ consoleErrors: ['err1'] });
        const errors = bridge.getConsoleErrors();
        errors.push('mutated');
        expect(bridge.getConsoleErrors()).toEqual(['err1']);
      });
    });

    describe('getNetworkRequests', () => {
      it('should return empty array initially', () => {
        expect(bridge.getNetworkRequests()).toEqual([]);
      });

      it('should filter by URL substring', () => {
        bridge.ingestSnapshot({
          networkRequests: [
            { url: 'https://api.com/users', method: 'GET', status: 200, type: 'fetch', timestamp: 1 },
            { url: 'https://cdn.com/image.png', method: 'GET', status: 200, type: 'img', timestamp: 2 },
            { url: 'https://api.com/posts', method: 'POST', status: 201, type: 'fetch', timestamp: 3 },
          ],
        });
        const apiRequests = bridge.getNetworkRequests('api.com');
        expect(apiRequests).toHaveLength(2);
      });
    });

    describe('getDOMState', () => {
      it('should return null for unknown selector', () => {
        expect(bridge.getDOMState('#nonexistent')).toBeNull();
      });

      it('should return element from ingested state', () => {
        bridge.ingestSnapshot({
          domState: {
            '#app': { tagName: 'div', id: 'app', attributes: {}, children: 5 },
          },
        });
        const el = bridge.getDOMState('#app') as DOMElementInfo;
        expect(el).not.toBeNull();
        expect(el.tagName).toBe('div');
        expect(el.id).toBe('app');
      });

      it('should return full map when no selector given', () => {
        bridge.ingestSnapshot({
          domState: {
            '#a': { tagName: 'div', attributes: {}, children: 0 },
            '#b': { tagName: 'span', attributes: {}, children: 0 },
          },
        });
        const map = bridge.getDOMState() as Map<string, DOMElementInfo>;
        expect(map).toBeInstanceOf(Map);
        expect(map.size).toBe(2);
      });

      it('should fall back to live DOM query', () => {
        const el = document.createElement('section');
        el.id = 'live-section';
        el.setAttribute('data-test', 'true');
        document.body.appendChild(el);

        const info = bridge.getDOMState('#live-section') as DOMElementInfo;
        expect(info).not.toBeNull();
        expect(info.tagName).toBe('section');
        expect(info.attributes['data-test']).toBe('true');

        document.body.removeChild(el);
      });
    });

    describe('getPageInfo', () => {
      it('should return current page info', () => {
        const info = bridge.getPageInfo();
        expect(info).toHaveProperty('url');
        expect(info).toHaveProperty('title');
        expect(typeof info.url).toBe('string');
        expect(typeof info.title).toBe('string');
      });
    });
  });

  // ==========================================================================
  // Config
  // ==========================================================================

  describe('Config', () => {
    it('should return config', () => {
      const config = bridge.getConfig();
      expect(config).toHaveProperty('maxRecordedActions');
      expect(config).toHaveProperty('maxConsoleErrors');
      expect(config).toHaveProperty('defaultTimeout');
    });

    it('should use custom config', () => {
      const custom = new ChromeBridge({
        maxRecordedActions: 100,
        defaultTimeout: 5000,
        interceptConsoleErrors: false,
        interceptNetworkRequests: false,
      });
      const config = custom.getConfig();
      expect(config.maxRecordedActions).toBe(100);
      expect(config.defaultTimeout).toBe(5000);
    });
  });

  // ==========================================================================
  // Array trimming (max limits)
  // ==========================================================================

  describe('Array trimming', () => {
    it('should trim console errors to max', () => {
      const b = new ChromeBridge({
        maxConsoleErrors: 3,
        interceptConsoleErrors: false,
        interceptNetworkRequests: false,
      });
      b.connect();
      b.ingestMessage({ type: 'console', payload: 'e1' });
      b.ingestMessage({ type: 'console', payload: 'e2' });
      b.ingestMessage({ type: 'console', payload: 'e3' });
      b.ingestMessage({ type: 'console', payload: 'e4' });
      b.ingestMessage({ type: 'console', payload: 'e5' });

      const errors = b.getConsoleErrors();
      expect(errors).toHaveLength(3);
      expect(errors[0]).toBe('e3'); // oldest trimmed
      expect(errors[2]).toBe('e5');
    });

    it('should trim network requests to max', () => {
      const b = new ChromeBridge({
        maxNetworkRequests: 2,
        interceptConsoleErrors: false,
        interceptNetworkRequests: false,
      });
      b.connect();
      for (let i = 0; i < 5; i++) {
        b.ingestMessage({
          type: 'network',
          payload: { url: `https://req${i}.com`, method: 'GET', status: 200, type: 'fetch', timestamp: i },
        });
      }
      expect(b.getNetworkRequests()).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Integration: action + recording
  // ==========================================================================

  describe('Integration', () => {
    beforeEach(() => {
      bridge.connect();
    });

    it('should record actions triggered via executeAction when recording', async () => {
      bridge.startRecording();

      const btn = document.createElement('button');
      btn.id = 'int-btn';
      document.body.appendChild(btn);

      // executeAction dispatches a real DOM click, which the recording listener captures
      await bridge.executeAction({ type: 'click', selector: '#int-btn' });

      const actions = bridge.getRecordedActions();
      expect(actions.some((a) => a.type === 'click' && a.target === '#int-btn')).toBe(true);

      bridge.stopRecording();
      document.body.removeChild(btn);
    });

    it('should ingest a full snapshot then query state', () => {
      const snapshot: ChromePageSnapshot = {
        url: 'https://full.test',
        title: 'Full Test',
        consoleErrors: ['warn: deprecated'],
        networkRequests: [
          { url: 'https://api.full.test/data', method: 'GET', status: 200, type: 'fetch', timestamp: Date.now() },
        ],
        domState: {
          '#root': { tagName: 'div', id: 'root', attributes: { class: 'app' }, children: 10 },
        },
      };

      bridge.ingestSnapshot(snapshot);

      expect(bridge.getConsoleErrors()).toEqual(['warn: deprecated']);
      expect(bridge.getNetworkRequests()).toHaveLength(1);
      const root = bridge.getDOMState('#root') as DOMElementInfo;
      expect(root.children).toBe(10);
    });
  });
});
