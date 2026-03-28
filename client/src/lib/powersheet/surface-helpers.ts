/**
 * Shared helpers for powersheet surface components.
 *
 * Extracted from the 9 accounting surfaces to eliminate code duplication.
 * Each surface previously defined its own copy of these utilities.
 */

import { format } from "date-fns";
import type { KeyboardHint } from "@/components/work-surface/KeyboardHintBar";
import type { PowersheetAffordance } from "@/components/spreadsheet-native/PowersheetGrid";

// ============================================================================
// FORMAT HELPERS
// ============================================================================

/**
 * Format a currency value as USD. Accepts string, number, null, or undefined.
 * Returns "$0.00" for NaN/null/undefined.
 */
export function fmtCurrency(
  value: string | number | null | undefined
): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

/**
 * Format a currency value as compact USD (no decimals).
 * Returns "$0" for NaN/null/undefined.
 */
export function fmtCurrencyCompact(
  value: string | number | null | undefined
): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format a date value as "MMM d, yyyy" (e.g. "Mar 27, 2026").
 * Returns "-" for null/undefined/invalid.
 */
export function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return format(d, "MMM d, yyyy");
  } catch {
    return "-";
  }
}

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

/** True when running on macOS. */
export const IS_MAC =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);

/** Modifier key string: "⌘" on Mac, "Ctrl" otherwise. */
export const MOD_KEY = IS_MAC ? "\u2318" : "Ctrl";

// ============================================================================
// AFFORDANCE PRESETS
// ============================================================================

/** Affordances for read-only registry surfaces (Payments, Invoices, Bills, GL). */
export const REGISTRY_AFFORDANCES: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
  { label: "Sort", available: true },
  { label: "Filter", available: true },
];

/** Affordances for editable surfaces (CoA, Expenses, BankAccounts, BankTransactions, FiscalPeriods). */
export const EDITABLE_AFFORDANCES: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: true },
  { label: "Fill", available: true },
  { label: "Edit", available: true },
  { label: "Undo/Redo", available: true },
];

// ============================================================================
// KEYBOARD HINT PRESETS
// ============================================================================

/** Keyboard hints for read-only registry surfaces. */
export const REGISTRY_KEYBOARD_HINTS: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: "Shift+Click", label: "extend range" },
  { key: `${MOD_KEY}+Click`, label: "add to selection" },
  { key: `${MOD_KEY}+C`, label: "copy cells" },
  { key: "Escape", label: "close inspector" },
];

/** Keyboard hints for editable surfaces. */
export const EDITABLE_KEYBOARD_HINTS: KeyboardHint[] = [
  { key: "Click", label: "select cell" },
  { key: "Double-click", label: "edit cell" },
  { key: `${MOD_KEY}+C`, label: "copy" },
  { key: `${MOD_KEY}+V`, label: "paste" },
  { key: `${MOD_KEY}+Z`, label: "undo" },
  { key: "Escape", label: "cancel edit" },
];
