/**
 * TER-293: Semantic Status Design Tokens
 *
 * Centralized color tokens for status badges, pills, and highlights
 * across all Work Surfaces. Replace hardcoded bg/text color classes
 * with these tokens to ensure consistent styling.
 *
 * Each token is a string of Tailwind classes for bg, text, and border.
 */

// ─── Semantic Status Tokens ────────────────────────────────────────

/** Positive/success states: paid, complete, live, approved */
export const STATUS_SUCCESS = "bg-green-100 text-green-800 border-green-200";
/** Positive subtle: success backgrounds, completion highlights */
export const STATUS_SUCCESS_SUBTLE =
  "bg-green-50 text-green-800 border-green-200";
/** Positive strong: progress bars, solid indicators */
export const STATUS_SUCCESS_SOLID = "bg-green-500 text-white";

/** Warning states: pending, partial, awaiting, 30-day aging */
export const STATUS_WARNING = "bg-yellow-100 text-yellow-800 border-yellow-200";
/** Warning subtle: backgrounds, section highlights */
export const STATUS_WARNING_SUBTLE =
  "bg-yellow-50 text-yellow-800 border-yellow-200";

/** Caution states: on-hold, 60-day aging, needs attention */
export const STATUS_CAUTION = "bg-orange-100 text-orange-800 border-orange-200";

/** Danger states: overdue, quarantined, voided, 90-day aging */
export const STATUS_DANGER = "bg-red-100 text-red-800 border-red-200";
/** Danger subtle: error backgrounds */
export const STATUS_DANGER_SUBTLE = "bg-red-50 text-red-800 border-red-200";
/** Danger strong: 90+ day aging, critical */
export const STATUS_DANGER_STRONG = "bg-red-200 text-red-900 border-red-300";

/** Info/active states: sent, picking, in-progress, selected */
export const STATUS_INFO = "bg-blue-100 text-blue-800 border-blue-200";
/** Info subtle: selected row, active focus */
export const STATUS_INFO_SUBTLE = "bg-blue-50 text-blue-800 border-blue-200";

/** Neutral states: draft, new, default */
export const STATUS_NEUTRAL = "bg-slate-100 text-slate-800 border-slate-200";

/** Complete/applied states: fully used, applied */
export const STATUS_COMPLETE =
  "bg-emerald-100 text-emerald-700 border-emerald-200";

// ─── Domain-Specific Status Maps ───────────────────────────────────

/** Inventory batch status → token */
export const INVENTORY_STATUS_TOKENS: Record<string, string> = {
  AWAITING_INTAKE: STATUS_WARNING,
  LIVE: STATUS_SUCCESS,
  PHOTOGRAPHY_COMPLETE: STATUS_INFO,
  ON_HOLD: STATUS_CAUTION,
  QUARANTINED: STATUS_DANGER,
};

/** Invoice status → token */
export const INVOICE_STATUS_TOKENS: Record<string, string> = {
  DRAFT: STATUS_NEUTRAL,
  SENT: STATUS_INFO,
  VIEWED: STATUS_INFO,
  PARTIAL: STATUS_WARNING,
  PAID: STATUS_SUCCESS,
  OVERDUE: STATUS_DANGER,
};

/** Invoice aging bucket → token */
export const INVOICE_AGING_TOKENS: Record<string, string> = {
  current: STATUS_SUCCESS,
  "30": STATUS_WARNING,
  "60": STATUS_CAUTION,
  "90": STATUS_DANGER,
  "90+": STATUS_DANGER_STRONG,
};

/** Pick-pack order status → token */
export const PICK_PACK_STATUS_TOKENS: Record<string, string> = {
  PENDING: STATUS_WARNING,
  PICKING: STATUS_INFO,
  PACKED: STATUS_SUCCESS,
  READY: STATUS_SUCCESS,
};

/** Ledger transaction type → token */
export const LEDGER_TYPE_TOKENS: Record<string, string> = {
  INVOICE: STATUS_INFO,
  PAYMENT: STATUS_SUCCESS,
  ADJUSTMENT: STATUS_CAUTION,
  CREDIT: STATUS_COMPLETE,
  REFUND: STATUS_DANGER,
};
