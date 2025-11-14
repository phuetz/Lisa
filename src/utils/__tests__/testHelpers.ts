/**
 * Test helpers and utilities
 * Provides common testing utilities for Lisa
 */

import { vi } from 'vitest';

/**
 * Wait for a specified time
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a mock async function that resolves after a delay
 */
export function createDelayedMock<T>(value: T, delay: number = 100) {
  return vi.fn().mockImplementation(async () => {
    await wait(delay);
    return value;
  });
}

/**
 * Create a mock that fails N times then succeeds
 */
export function createFlakeyMock<T>(
  successValue: T,
  failCount: number = 2,
  error: Error = new Error('Mock error')
) {
  let attempts = 0;
  return vi.fn().mockImplementation(async () => {
    attempts++;
    if (attempts <= failCount) {
      throw error;
    }
    return successValue;
  });
}

/**
 * Create a mock that alternates between success and failure
 */
export function createAlternatingMock<T>(
  successValue: T,
  error: Error = new Error('Mock error')
) {
  let callCount = 0;
  return vi.fn().mockImplementation(async () => {
    callCount++;
    if (callCount % 2 === 0) {
      throw error;
    }
    return successValue;
  });
}

/**
 * Mock IndexedDB for testing
 */
export function mockIndexedDB() {
  const stores = new Map<string, Map<string, any>>();

  const mockIDB = {
    open: vi.fn((name: string, version: number) => {
      return {
        result: {
          objectStoreNames: {
            contains: (storeName: string) => stores.has(storeName),
          },
          createObjectStore: (storeName: string) => {
            stores.set(storeName, new Map());
            return {
              createIndex: vi.fn(),
            };
          },
          transaction: (storeNames: string[], mode: string) => {
            return {
              objectStore: (storeName: string) => {
                const store = stores.get(storeName) || new Map();
                return {
                  get: (key: string) => ({
                    result: store.get(key),
                    onsuccess: null,
                    onerror: null,
                  }),
                  put: (value: any) => ({
                    onsuccess: null,
                    onerror: null,
                  }),
                  delete: (key: string) => ({
                    onsuccess: null,
                    onerror: null,
                  }),
                  clear: () => ({
                    onsuccess: null,
                    onerror: null,
                  }),
                  getAllKeys: () => ({
                    result: Array.from(store.keys()),
                    onsuccess: null,
                    onerror: null,
                  }),
                };
              },
            };
          },
        },
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
    }),
  };

  global.indexedDB = mockIDB as any;
  return mockIDB;
}

/**
 * Mock localStorage for testing
 */
export function mockLocalStorage() {
  const store = new Map<string, string>();

  const mockStorage = {
    getItem: vi.fn((key: string) => store.get(key) || null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    get length() {
      return store.size;
    },
    key: vi.fn((index: number) => {
      return Array.from(store.keys())[index] || null;
    }),
  };

  global.localStorage = mockStorage as any;
  return mockStorage;
}

/**
 * Mock fetch for testing
 */
export function mockFetch() {
  const mockResponses = new Map<string, any>();

  const mockFn = vi.fn((url: string, options?: RequestInit) => {
    const response = mockResponses.get(url);
    if (!response) {
      return Promise.reject(new Error(`No mock response for ${url}`));
    }

    return Promise.resolve({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      statusText: response.statusText ?? 'OK',
      json: async () => response.json ?? response,
      text: async () => response.text ?? JSON.stringify(response),
      arrayBuffer: async () => response.arrayBuffer ?? new ArrayBuffer(0),
    });
  });

  const addResponse = (url: string, response: any) => {
    mockResponses.set(url, response);
  };

  global.fetch = mockFn as any;

  return { fetch: mockFn, addResponse, mockResponses };
}

/**
 * Mock performance.now() for testing
 */
export function mockPerformanceNow() {
  let currentTime = 0;

  const mockNow = vi.fn(() => currentTime);
  const advance = (ms: number) => {
    currentTime += ms;
  };
  const reset = () => {
    currentTime = 0;
  };

  global.performance.now = mockNow;

  return { now: mockNow, advance, reset };
}

/**
 * Mock Service Worker for testing
 */
export function mockServiceWorker() {
  const mockSW = {
    ready: Promise.resolve({
      sync: {
        register: vi.fn(),
      },
    }),
  };

  global.navigator.serviceWorker = mockSW as any;
  return mockSW;
}

/**
 * Create a mock agent for testing
 */
export function createMockAgent(name: string, executeFn?: (...args: any[]) => Promise<any>) {
  return {
    name,
    execute: executeFn || vi.fn().mockResolvedValue({ success: true }),
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
  };
}

/**
 * Suppress console output during tests
 */
export function suppressConsole() {
  const originalConsole = { ...console };

  beforeEach(() => {
    global.console = {
      ...console,
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
  });

  afterEach(() => {
    global.console = originalConsole;
  });
}

/**
 * Create a test timeout
 */
export function createTestTimeout(message: string, timeout: number = 5000) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Test timeout: ${message}`)), timeout);
  });
}

/**
 * Run test with timeout
 */
export async function runWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number = 5000
): Promise<T> {
  return Promise.race([
    fn(),
    createTestTimeout('Operation took too long', timeout) as Promise<T>,
  ]);
}

/**
 * Assert that a function throws
 */
export async function expectToThrow(fn: () => any, errorMessage?: string) {
  let didThrow = false;
  let thrownError: any;

  try {
    await fn();
  } catch (error) {
    didThrow = true;
    thrownError = error;
  }

  if (!didThrow) {
    throw new Error('Expected function to throw but it did not');
  }

  if (errorMessage && thrownError.message !== errorMessage) {
    throw new Error(
      `Expected error message "${errorMessage}" but got "${thrownError.message}"`
    );
  }

  return thrownError;
}

/**
 * Create a spy that tracks all calls
 */
export function createCallTracker<T extends (...args: any[]) => any>() {
  const calls: Array<{
    args: Parameters<T>;
    timestamp: number;
    result?: ReturnType<T>;
    error?: Error;
  }> = [];

  const spy = vi.fn((...args: Parameters<T>) => {
    const call = {
      args,
      timestamp: Date.now(),
    };

    calls.push(call);
    return undefined as ReturnType<T>;
  });

  return {
    spy,
    calls,
    getCallCount: () => calls.length,
    getLastCall: () => calls[calls.length - 1],
    getCallAt: (index: number) => calls[index],
    clear: () => {
      calls.length = 0;
      spy.mockClear();
    },
  };
}

/**
 * Mock timers utilities
 */
export function createMockTimers() {
  vi.useFakeTimers();

  return {
    advance: (ms: number) => vi.advanceTimersByTime(ms),
    runAll: () => vi.runAllTimers(),
    runPending: () => vi.runOnlyPendingTimers(),
    restore: () => vi.useRealTimers(),
  };
}

/**
 * Create a mock event emitter
 */
export function createMockEventEmitter() {
  const listeners = new Map<string, Set<Function>>();

  return {
    on: (event: string, handler: Function) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);
    },
    off: (event: string, handler: Function) => {
      listeners.get(event)?.delete(handler);
    },
    emit: (event: string, ...args: any[]) => {
      listeners.get(event)?.forEach(handler => handler(...args));
    },
    clear: () => {
      listeners.clear();
    },
    getListenerCount: (event: string) => listeners.get(event)?.size || 0,
  };
}
