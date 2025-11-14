/**
 * Optimized memoization hooks
 * Advanced memoization strategies for React components
 */

import { useCallback, useEffect, useMemo, useRef, DependencyList } from 'react';

/**
 * Deep comparison for dependencies
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  return false;
}

/**
 * useMemo with deep comparison of dependencies
 */
export function useDeepMemo<T>(factory: () => T, deps: DependencyList): T {
  const ref = useRef<{ deps: DependencyList; value: T }>();

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory(),
    };
  }

  return ref.current.value;
}

/**
 * useCallback with deep comparison of dependencies
 */
export function useDeepCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList
): T {
  const ref = useRef<{ deps: DependencyList; callback: T }>();

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      callback,
    };
  }

  return ref.current.callback;
}

/**
 * Memoize with TTL (Time To Live)
 */
export function useMemoWithTTL<T>(
  factory: () => T,
  deps: DependencyList,
  ttl: number = 5000
): T {
  const ref = useRef<{ value: T; timestamp: number }>();

  const shouldRecompute =
    !ref.current ||
    Date.now() - ref.current.timestamp > ttl ||
    !deepEqual(deps, ref.current);

  if (shouldRecompute) {
    ref.current = {
      value: factory(),
      timestamp: Date.now(),
    };
  }

  return ref.current.value;
}

/**
 * Lazy memoization - compute on first access
 */
export function useLazyMemo<T>(factory: () => T): () => T {
  const ref = useRef<{ computed: boolean; value?: T }>({ computed: false });

  return useCallback(() => {
    if (!ref.current.computed) {
      ref.current.value = factory();
      ref.current.computed = true;
    }
    return ref.current.value!;
  }, [factory]);
}

/**
 * Memoize async function with caching
 */
export function useAsyncMemo<T>(
  factory: () => Promise<T>,
  deps: DependencyList
): {
  value: T | undefined;
  loading: boolean;
  error: Error | undefined;
} {
  const [state, setState] = useRef({
    value: undefined as T | undefined,
    loading: false,
    error: undefined as Error | undefined,
  }).current;

  useEffect(() => {
    let cancelled = false;

    setState.loading = true;
    setState.error = undefined;

    factory()
      .then(value => {
        if (!cancelled) {
          setState.value = value;
          setState.loading = false;
        }
      })
      .catch(error => {
        if (!cancelled) {
          setState.error = error;
          setState.loading = false;
        }
      });

    return () => {
      cancelled = true;
    };
  }, deps);

  return state;
}

/**
 * Debounced memoization
 */
export function useDebouncedMemo<T>(
  factory: () => T,
  deps: DependencyList,
  delay: number = 300
): T | undefined {
  const [value, setValue] = useRef<T>().current;
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setValue(factory());
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps);

  return value;
}

/**
 * Throttled memoization
 */
export function useThrottledMemo<T>(
  factory: () => T,
  deps: DependencyList,
  interval: number = 300
): T | undefined {
  const [value, setValue] = useRef<T>().current;
  const lastRunRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRunRef.current;

    if (timeSinceLastRun >= interval) {
      setValue(factory());
      lastRunRef.current = now;
    } else {
      const timeout = setTimeout(() => {
        setValue(factory());
        lastRunRef.current = Date.now();
      }, interval - timeSinceLastRun);

      return () => clearTimeout(timeout);
    }
  }, deps);

  return value;
}

/**
 * Memoize with size limit (LRU cache)
 */
export function useLRUMemo<K, V>(maxSize: number = 100): {
  get: (key: K) => V | undefined;
  set: (key: K, value: V) => void;
  has: (key: K) => boolean;
  clear: () => void;
} {
  const cache = useRef(new Map<K, V>());

  const get = useCallback((key: K): V | undefined => {
    const value = cache.current.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      cache.current.delete(key);
      cache.current.set(key, value);
    }
    return value;
  }, []);

  const set = useCallback(
    (key: K, value: V): void => {
      // Remove if exists
      if (cache.current.has(key)) {
        cache.current.delete(key);
      }

      // Add to end
      cache.current.set(key, value);

      // Evict oldest if over size
      if (cache.current.size > maxSize) {
        const firstKey = cache.current.keys().next().value;
        cache.current.delete(firstKey);
      }
    },
    [maxSize]
  );

  const has = useCallback((key: K): boolean => {
    return cache.current.has(key);
  }, []);

  const clear = useCallback((): void => {
    cache.current.clear();
  }, []);

  return { get, set, has, clear };
}

/**
 * Memoize expensive calculations with Web Worker
 */
export function useWorkerMemo<T, A extends any[]>(
  workerFactory: () => Worker,
  deps: DependencyList
): {
  compute: (...args: A) => Promise<T>;
  terminate: () => void;
} {
  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = workerFactory();

    return () => {
      workerRef.current?.terminate();
    };
  }, deps);

  const compute = useCallback(
    (...args: A): Promise<T> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        const handler = (event: MessageEvent) => {
          resolve(event.data);
          workerRef.current?.removeEventListener('message', handler);
        };

        const errorHandler = (error: ErrorEvent) => {
          reject(error);
          workerRef.current?.removeEventListener('error', errorHandler);
        };

        workerRef.current.addEventListener('message', handler);
        workerRef.current.addEventListener('error', errorHandler);
        workerRef.current.postMessage(args);
      });
    },
    []
  );

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = undefined;
  }, []);

  return { compute, terminate };
}

/**
 * Memoize with reference counting
 */
export function useRefCountedMemo<T extends { dispose?: () => void }>(
  factory: () => T,
  deps: DependencyList
): T {
  const ref = useRef<{ value: T; count: number }>();

  if (!ref.current || !deepEqual(deps, ref.current)) {
    if (ref.current && ref.current.count === 0) {
      ref.current.value.dispose?.();
    }
    ref.current = {
      value: factory(),
      count: 1,
    };
  } else {
    ref.current.count++;
  }

  useEffect(() => {
    return () => {
      if (ref.current) {
        ref.current.count--;
        if (ref.current.count === 0) {
          ref.current.value.dispose?.();
        }
      }
    };
  }, []);

  return ref.current.value;
}

/**
 * Selective memoization - only memoize if condition is met
 */
export function useSelectiveMemo<T>(
  factory: () => T,
  deps: DependencyList,
  shouldMemoize: boolean
): T {
  const memoized = useMemo(factory, deps);
  const nonMemoized = factory();

  return shouldMemoize ? memoized : nonMemoized;
}

/**
 * Batched memoization - compute multiple values together
 */
export function useBatchedMemo<T extends Record<string, any>>(
  factories: { [K in keyof T]: () => T[K] },
  deps: DependencyList
): T {
  return useMemo(() => {
    const result = {} as T;
    for (const key in factories) {
      result[key] = factories[key]();
    }
    return result;
  }, deps);
}
