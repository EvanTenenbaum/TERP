/**
 * useReturnFocus
 *
 * Hook that captures the currently focused element on mount and returns focus
 * to it (or to a provided `triggerRef`) on unmount or when explicitly invoked.
 *
 * Why this exists (TER-1294):
 * Not all Sheet / Dialog call-sites in TERP hold an explicit ref to the
 * element that opened the drawer. Per the QA report (§8, Radix Sheet
 * trap-focus semantics), 6 of 12 current Sheet call sites rely on
 * `<SheetTrigger>` children without forwarding a ref. If focus-return only
 * worked when a ref was provided, those call sites would silently break
 * accessibility.
 *
 * This hook therefore supports BOTH modes:
 *
 * 1. Explicit trigger ref (preferred):
 *    ```tsx
 *    const triggerRef = useRef<HTMLButtonElement>(null);
 *    useReturnFocus({ triggerRef });
 *    ```
 *
 * 2. Implicit capture (fallback for ref-less triggers):
 *    The hook snapshots `document.activeElement` at mount time (i.e. at the
 *    moment the drawer content renders, which for Radix Dialog is synchronous
 *    with the click that opened it). On unmount it restores focus to that
 *    element — no ref required from the caller.
 *
 * The hook should be used INSIDE the portal-rendered content (e.g. within
 * `<SheetContent>` children) so that mount = drawer open and unmount =
 * drawer close.
 *
 * @example
 * ```tsx
 * function ManusSheetContent({ children }: Props) {
 *   useReturnFocus();
 *   return <SheetContent>{children}</SheetContent>;
 * }
 * ```
 *
 * @example With explicit trigger ref
 * ```tsx
 * const triggerRef = useRef<HTMLButtonElement>(null);
 * const { returnFocus } = useReturnFocus({ triggerRef });
 * // ... later, manually return focus (optional)
 * returnFocus();
 * ```
 */

import { useCallback, useEffect, useRef, type RefObject } from "react";

export interface UseReturnFocusOptions {
  /**
   * Optional ref to the element that should receive focus on close.
   * If not provided, the hook falls back to whatever was
   * `document.activeElement` at the moment the hook mounted.
   */
  triggerRef?: RefObject<HTMLElement | null>;

  /**
   * If `false`, the hook will NOT automatically return focus on unmount.
   * Use this when you want to call `returnFocus()` manually.
   * Defaults to `true`.
   */
  autoReturnOnUnmount?: boolean;

  /**
   * If `true`, the hook is a no-op. Useful for conditionally disabling
   * return-focus behavior without changing hook call order.
   * Defaults to `false`.
   */
  disabled?: boolean;
}

export interface UseReturnFocusReturn {
  /**
   * Manually trigger focus return. Safe to call multiple times; only the
   * first successful call takes effect per mount cycle.
   */
  returnFocus: () => void;
}

/**
 * Capture active element on mount, restore it on unmount (or on demand).
 */
export function useReturnFocus(
  options: UseReturnFocusOptions = {}
): UseReturnFocusReturn {
  const { triggerRef, autoReturnOnUnmount = true, disabled = false } = options;

  // Element that had focus when the drawer/dialog opened.
  const capturedElementRef = useRef<HTMLElement | null>(null);
  // Whether we've already restored focus for this mount.
  const hasRestoredRef = useRef(false);

  // Capture the currently-focused element synchronously on first render.
  // Using a ref-init pattern (rather than useEffect) guarantees we capture
  // BEFORE Radix moves focus into the dialog.
  if (
    capturedElementRef.current === null &&
    !disabled &&
    typeof document !== "undefined"
  ) {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      capturedElementRef.current = active;
    }
  }

  const returnFocus = useCallback(() => {
    if (disabled) return;
    if (hasRestoredRef.current) return;

    // Prefer explicit trigger ref (safer because it survives DOM churn).
    const target = triggerRef?.current ?? capturedElementRef.current ?? null;

    if (target && typeof target.focus === "function") {
      try {
        // `preventScroll` avoids a jarring scroll jump when focus returns
        // to an element that is outside the current viewport.
        target.focus({ preventScroll: true });
        hasRestoredRef.current = true;
      } catch {
        // Swallow: element may have been detached from the DOM.
        hasRestoredRef.current = true;
      }
    } else {
      // No viable target; mark done so we don't keep retrying.
      hasRestoredRef.current = true;
    }
  }, [triggerRef, disabled]);

  useEffect(() => {
    if (disabled) return;
    if (!autoReturnOnUnmount) return;

    return () => {
      returnFocus();
    };
    // `returnFocus` identity is stable across renders thanks to useCallback,
    // but we still depend on it to honor exhaustive-deps.
  }, [autoReturnOnUnmount, disabled, returnFocus]);

  return { returnFocus };
}

export default useReturnFocus;
