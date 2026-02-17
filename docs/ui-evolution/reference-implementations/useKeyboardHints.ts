/**
 * useKeyboardHints — Manage keyboard hint visibility
 * Part of TERP UI Evolution Wave 3
 *
 * Controls whether keyboard shortcut badges are visible throughout the UI.
 * Persists preference in localStorage.
 *
 * Usage:
 * ```tsx
 * const { showHints, toggleHints } = useKeyboardHints();
 *
 * // In a toolbar:
 * <Button onClick={toggleHints}>
 *   {showHints ? "Hide" : "Show"} Keyboard Hints
 * </Button>
 * ```
 */
import { useState, useCallback } from "react";

const STORAGE_KEY = "terp-keyboard-hints";

export function useKeyboardHints() {
  const [showHints, setShowHints] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const toggleHints = useCallback(() => {
    setShowHints((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const setHints = useCallback((value: boolean) => {
    setShowHints(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  return { showHints, toggleHints, setHints };
}
