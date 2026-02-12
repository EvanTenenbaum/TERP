import { useRef } from "react";

type noop = (...args: unknown[]) => unknown;

/**
 * usePersistFn 可以替代 useCallback 以降低心智负担
 */
export function usePersistFn<T extends noop>(fn: T) {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const persistFn = useRef<T>(null);
  if (!persistFn.current) {
    persistFn.current = function (this: unknown, ...args) {
      // fnRef.current is always defined because we set it above
      return (fnRef.current as T).apply(this, args);
    } as T;
  }

  return persistFn.current as T;
}
