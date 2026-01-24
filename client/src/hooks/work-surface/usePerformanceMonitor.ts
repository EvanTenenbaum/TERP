/**
 * usePerformanceMonitor Hook (UXS-802)
 *
 * Performance monitoring for Work Surfaces.
 * Tracks render times, interaction latency, and reports violations.
 *
 * Performance Budgets:
 * - Grid render: <100ms
 * - Inspector open: <50ms
 * - Keystroke response: <50ms
 *
 * @see ATOMIC_UX_STRATEGY.md for performance requirements
 */

import { useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceBudget {
  /** Budget for grid render time in ms */
  gridRender: number;
  /** Budget for inspector open time in ms */
  inspectorOpen: number;
  /** Budget for keystroke response time in ms */
  keystrokeResponse: number;
  /** Budget for mutation completion time in ms */
  mutationComplete: number;
  /** Budget for search response time in ms */
  searchResponse: number;
}

export interface PerformanceViolation {
  type: keyof PerformanceBudget;
  budget: number;
  actual: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface UsePerformanceMonitorOptions {
  /** Enable performance monitoring (default: true in dev, false in prod) */
  enabled?: boolean;
  /** Custom performance budgets */
  budgets?: Partial<PerformanceBudget>;
  /** Callback when budget is violated */
  onViolation?: (violation: PerformanceViolation) => void;
  /** Log violations to console (default: true in dev) */
  logViolations?: boolean;
  /** Surface name for reporting */
  surfaceName?: string;
}

export interface UsePerformanceMonitorReturn {
  /** Start timing an operation */
  startMark: (name: string, metadata?: Record<string, unknown>) => void;
  /** End timing and check against budget */
  endMark: (name: string, type?: keyof PerformanceBudget) => number;
  /** Measure a function execution time */
  measure: <T>(name: string, fn: () => T, type?: keyof PerformanceBudget) => T;
  /** Measure an async function execution time */
  measureAsync: <T>(name: string, fn: () => Promise<T>, type?: keyof PerformanceBudget) => Promise<T>;
  /** Get current marks */
  getMarks: () => PerformanceMark[];
  /** Get violations */
  getViolations: () => PerformanceViolation[];
  /** Clear all marks and violations */
  clear: () => void;
  /** Performance budgets in use */
  budgets: PerformanceBudget;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_BUDGETS: PerformanceBudget = {
  gridRender: 100,
  inspectorOpen: 50,
  keystrokeResponse: 50,
  mutationComplete: 2000,
  searchResponse: 200,
};

const isDev = process.env.NODE_ENV === 'development';

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for monitoring Work Surface performance
 *
 * @example
 * ```tsx
 * const { startMark, endMark, measure } = usePerformanceMonitor({
 *   surfaceName: 'Orders',
 *   onViolation: (v) => reportToAnalytics(v),
 * });
 *
 * // Track grid render
 * startMark('grid-render');
 * // ... render grid
 * endMark('grid-render', 'gridRender');
 *
 * // Or use measure helper
 * const result = measure('filter-data', () => filterData(items), 'gridRender');
 * ```
 */
export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {}
): UsePerformanceMonitorReturn {
  const {
    enabled = isDev,
    budgets: customBudgets,
    onViolation,
    logViolations = isDev,
    surfaceName = 'WorkSurface',
  } = options;

  const budgets: PerformanceBudget = {
    ...DEFAULT_BUDGETS,
    ...customBudgets,
  };

  const marksRef = useRef<Map<string, PerformanceMark>>(new Map());
  const completedMarksRef = useRef<PerformanceMark[]>([]);
  const violationsRef = useRef<PerformanceViolation[]>([]);

  // Check if duration violates budget
  const checkBudget = useCallback(
    (duration: number, type: keyof PerformanceBudget, metadata?: Record<string, unknown>) => {
      const budget = budgets[type];

      if (duration > budget) {
        const violation: PerformanceViolation = {
          type,
          budget,
          actual: Math.round(duration),
          timestamp: Date.now(),
          metadata,
        };

        violationsRef.current.push(violation);

        if (logViolations) {
          console.warn(
            `[${surfaceName}] Performance budget exceeded for ${type}: ` +
            `${Math.round(duration)}ms > ${budget}ms`,
            metadata
          );
        }

        onViolation?.(violation);
      }
    },
    [budgets, logViolations, onViolation, surfaceName]
  );

  // Start a performance mark
  const startMark = useCallback(
    (name: string, metadata?: Record<string, unknown>) => {
      if (!enabled) return;

      const mark: PerformanceMark = {
        name,
        startTime: performance.now(),
        metadata,
      };

      marksRef.current.set(name, mark);

      // Also use Performance API if available
      if (typeof performance !== 'undefined' && performance.mark) {
        try {
          performance.mark(`${surfaceName}-${name}-start`);
        } catch {
          // Performance API may not support marking in some environments
          // Silently ignore - this is optional performance instrumentation
        }
      }
    },
    [enabled, surfaceName]
  );

  // End a performance mark
  const endMark = useCallback(
    (name: string, type?: keyof PerformanceBudget): number => {
      if (!enabled) return 0;

      const mark = marksRef.current.get(name);
      if (!mark) {
        console.warn(`Performance mark "${name}" not found`);
        return 0;
      }

      const endTime = performance.now();
      const duration = endTime - mark.startTime;

      // Complete the mark
      const completedMark: PerformanceMark = {
        ...mark,
        duration,
      };
      completedMarksRef.current.push(completedMark);
      marksRef.current.delete(name);

      // Check budget if type specified
      if (type) {
        checkBudget(duration, type, mark.metadata);
      }

      // Use Performance API if available
      if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
        try {
          performance.mark(`${surfaceName}-${name}-end`);
          performance.measure(
            `${surfaceName}-${name}`,
            `${surfaceName}-${name}-start`,
            `${surfaceName}-${name}-end`
          );
        } catch {
          // Performance API may fail if start mark doesn't exist or isn't supported
          // Silently ignore - this is optional performance instrumentation
        }
      }

      return duration;
    },
    [enabled, checkBudget, surfaceName]
  );

  // Measure synchronous function
  const measure = useCallback(
    <T>(name: string, fn: () => T, type?: keyof PerformanceBudget): T => {
      if (!enabled) return fn();

      startMark(name);
      const result = fn();
      endMark(name, type);
      return result;
    },
    [enabled, startMark, endMark]
  );

  // Measure async function
  const measureAsync = useCallback(
    async <T>(name: string, fn: () => Promise<T>, type?: keyof PerformanceBudget): Promise<T> => {
      if (!enabled) return fn();

      startMark(name);
      try {
        const result = await fn();
        endMark(name, type);
        return result;
      } catch (error) {
        endMark(name, type);
        throw error;
      }
    },
    [enabled, startMark, endMark]
  );

  // Get completed marks
  const getMarks = useCallback(() => [...completedMarksRef.current], []);

  // Get violations
  const getViolations = useCallback(() => [...violationsRef.current], []);

  // Clear all
  const clear = useCallback(() => {
    marksRef.current.clear();
    completedMarksRef.current = [];
    violationsRef.current = [];
  }, []);

  return {
    startMark,
    endMark,
    measure,
    measureAsync,
    getMarks,
    getViolations,
    clear,
    budgets,
  };
}

// ============================================================================
// Performance Observer Hook
// ============================================================================

export interface UsePerformanceObserverOptions {
  /** Entry types to observe */
  entryTypes?: PerformanceEntryType[];
  /** Callback for entries */
  onEntry?: (entry: PerformanceEntry) => void;
  /** Filter function */
  filter?: (entry: PerformanceEntry) => boolean;
}

type PerformanceEntryType = 'mark' | 'measure' | 'navigation' | 'resource' | 'longtask' | 'paint' | 'largest-contentful-paint' | 'first-input' | 'layout-shift';

/**
 * Hook for observing Performance API entries
 */
export function usePerformanceObserver(options: UsePerformanceObserverOptions = {}) {
  const { entryTypes = ['measure'], onEntry, filter } = options;

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (filter && !filter(entry)) continue;
          onEntry?.(entry);
        }
      });

      observer.observe({ entryTypes: entryTypes as string[] });

      return () => observer.disconnect();
    } catch {
      // Browser doesn't support this entry type - silently ignore
      return;
    }
  }, [entryTypes, onEntry, filter]);
}

// ============================================================================
// Web Vitals Hook
// ============================================================================

export interface WebVitals {
  /** Largest Contentful Paint */
  lcp?: number;
  /** First Input Delay */
  fid?: number;
  /** Cumulative Layout Shift */
  cls?: number;
  /** First Contentful Paint */
  fcp?: number;
  /** Time to First Byte */
  ttfb?: number;
}

/**
 * Hook for tracking Core Web Vitals
 */
export function useWebVitals(onReport?: (vitals: WebVitals) => void) {
  const vitalsRef = useRef<WebVitals>({});

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;

    const observers: PerformanceObserver[] = [];

    // LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitalsRef.current.lcp = lastEntry.startTime;
        onReport?.({ ...vitalsRef.current });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true } as any);
      observers.push(lcpObserver);
    } catch {
      // LCP observer not supported in this browser - silently ignore
    }

    // FID
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0] as any;
        vitalsRef.current.fid = firstEntry.processingStart - firstEntry.startTime;
        onReport?.({ ...vitalsRef.current });
      });
      fidObserver.observe({ type: 'first-input', buffered: true } as any);
      observers.push(fidObserver);
    } catch {
      // FID observer not supported in this browser - silently ignore
    }

    // CLS
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        vitalsRef.current.cls = clsValue;
        onReport?.({ ...vitalsRef.current });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true } as any);
      observers.push(clsObserver);
    } catch {
      // CLS observer not supported in this browser - silently ignore
    }

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, [onReport]);

  return vitalsRef.current;
}

export default usePerformanceMonitor;
