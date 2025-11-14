/**
 * React hooks for Lisa utilities
 * Provides easy-to-use hooks for all utility functions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  analytics,
  profiler,
  modelCache,
  syncManager,
  agentLoader,
  type AgentMetrics,
  type PerformanceMetrics,
} from '../utils';

/**
 * Hook for tracking component analytics
 */
export function useAnalytics(componentName: string) {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);

  useEffect(() => {
    const updateMetrics = () => {
      const m = analytics.getMetrics(componentName);
      if (m) setMetrics(m);
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics();

    return () => clearInterval(interval);
  }, [componentName]);

  const trackExecution = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      return analytics.trackExecution(componentName, fn);
    },
    [componentName]
  );

  return { metrics, trackExecution };
}

/**
 * Hook for performance profiling
 */
export function useProfiler(operationName: string) {
  const startTime = useRef<number>(0);

  const start = useCallback(() => {
    startTime.current = performance.now();
    profiler.start(operationName);
  }, [operationName]);

  const end = useCallback(() => {
    const duration = profiler.end(operationName);
    return duration;
  }, [operationName]);

  const measure = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      return profiler.measure(operationName, fn);
    },
    [operationName]
  );

  const getMetrics = useCallback(() => {
    return profiler.getMetrics(operationName);
  }, [operationName]);

  return { start, end, measure, getMetrics };
}

/**
 * Hook for model caching
 */
export function useModelCache<T = any>(modelKey: string) {
  const [cached, setCached] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const get = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await modelCache.get<T>(modelKey);
      setCached(data);
      return data;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [modelKey]);

  const set = useCallback(
    async (data: T) => {
      setLoading(true);
      setError(null);
      try {
        await modelCache.set(modelKey, data);
        setCached(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [modelKey]
  );

  const getOrFetch = useCallback(
    async (fetcher: () => Promise<T>): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const data = await modelCache.getOrSet(modelKey, fetcher);
        setCached(data);
        return data;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [modelKey]
  );

  useEffect(() => {
    get();
  }, [get]);

  return { cached, loading, error, get, set, getOrFetch };
}

/**
 * Hook for offline sync status
 */
export function useSyncStatus() {
  const [status, setStatus] = useState(syncManager.getQueueStatus());
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateStatus = () => {
      setStatus(syncManager.getQueueStatus());
    };

    const handleOnline = () => {
      setOnline(true);
      updateStatus();
    };

    const handleOffline = () => {
      setOnline(false);
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(updateStatus, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const sync = useCallback(async () => {
    await syncManager.forceSyncNow();
    setStatus(syncManager.getQueueStatus());
  }, []);

  return { ...status, online, sync };
}

/**
 * Hook for lazy agent loading with caching
 */
export function useCachedAgent(agentName: string) {
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (loadedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const loadedAgent = await agentLoader.loadAgent(agentName);
      setAgent(loadedAgent);
      loadedRef.current = true;
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [agentName]);

  useEffect(() => {
    load();
  }, [load]);

  return { agent, loading, error, reload: load };
}

/**
 * Hook for online/offline status
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}

/**
 * Hook for debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttled value
 */
export function useThrottle<T>(value: T, interval: number = 300): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= interval) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, interval - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, interval]);

  return throttledValue;
}

/**
 * Hook for local storage with sync
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T) => {
      try {
        setStoredValue(value);
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(error);
      }
    },
    [key]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for async operation with loading state
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>(
    'idle'
  );
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setStatus('pending');
    setValue(null);
    setError(null);

    try {
      const response = await asyncFunction();
      setValue(response);
      setStatus('success');
      return response;
    } catch (error) {
      setError(error as Error);
      setStatus('error');
      throw error;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, status, value, error, loading: status === 'pending' };
}

/**
 * Hook for previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Hook for interval
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/**
 * Hook for timeout
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}

/**
 * Hook for window size
 */
export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

/**
 * Hook for media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

/**
 * Hook for clipboard
 */
export function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      setCopied(false);
      return false;
    }
  }, []);

  return { copied, copy };
}
