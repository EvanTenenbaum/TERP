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

/** Relationship role → token (Customer/Supplier/Brand/Referee/Contractor). */
export const RELATIONSHIP_ROLE_TOKENS: Record<string, string> = {
  Customer: STATUS_INFO,
  Supplier: STATUS_COMPLETE,
  Brand: "bg-violet-100 text-violet-800 border-violet-200",
  Referee: STATUS_NEUTRAL,
  Contractor: STATUS_WARNING,
};

/** Relationship operational status → token (toneKey from getRelationshipStatus). */
export const RELATIONSHIP_STATUS_TOKENS: Record<string, string> = {
  ACTIVE: STATUS_SUCCESS,
  WATCH: STATUS_WARNING,
  "NEEDS-ATTENTION": STATUS_DANGER,
  DORMANT: STATUS_NEUTRAL,
};

// ─── Order Status Tokens (420-fork Wave 1) ─────────────────────────

export const ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  FULFILLED: "Fulfilled",
  INVOICED: "Invoiced",
  VOIDED: "Voided",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
};

export const ORDER_STATUS_CLASSES: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700 border border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  FULFILLED: "bg-sky-50 text-sky-700 border border-sky-200",
  INVOICED: "bg-violet-50 text-violet-700 border border-violet-200",
  VOIDED: "bg-neutral-100 text-neutral-500 border border-neutral-200",
  CANCELLED: "bg-neutral-100 text-neutral-500 border border-neutral-200",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
};

export function getOrderStatusLabel(status: string): string {
  return (
    ORDER_STATUS_LABELS[status] ??
    status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
  );
}

export function getOrderStatusClass(status: string): string {
  return (
    ORDER_STATUS_CLASSES[status] ??
    "bg-muted text-muted-foreground border border-border"
  );
}

// ─── PO Status Tokens (420-fork Wave 2) ────────────────────────────────────

export const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  SENT: "Sent",
  RECEIVING: "Receiving",
  RECEIVED: "Received",
  PARTIALLY_RECEIVED: "Partial",
  VOIDED: "Voided",
  CANCELLED: "Cancelled",
};

export const PO_STATUS_CLASSES: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700 border border-amber-200",
  CONFIRMED: "bg-sky-50 text-sky-700 border border-sky-200",
  SENT: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  RECEIVING: "bg-violet-50 text-violet-700 border border-violet-200",
  RECEIVED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PARTIALLY_RECEIVED: "bg-purple-50 text-purple-700 border border-purple-200",
  VOIDED: "bg-neutral-100 text-neutral-500 border border-neutral-200",
  CANCELLED: "bg-neutral-100 text-neutral-500 border border-neutral-200",
};

export function getPoStatusLabel(status: string): string {
  return (
    PO_STATUS_LABELS[status] ??
    status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
  );
}

export function getPoStatusClass(status: string): string {
  return (
    PO_STATUS_CLASSES[status] ??
    "bg-muted text-muted-foreground border border-border"
  );
}

export const PAYMENT_TERM_LABELS: Record<string, string> = {
  CONSIGNMENT: "Consignment",
  NET_30: "Net 30",
  NET_15: "Net 15",
  NET_7: "Net 7",
  COD: "Cash on Delivery",
  PREPAID: "Prepaid",
  DUE_ON_RECEIPT: "Due on Receipt",
  WIRE: "Wire Transfer",
};

export function getPaymentTermLabel(term: string): string {
  return PAYMENT_TERM_LABELS[term] ?? term.replace(/_/g, " ");
}

// ─── Batch Status Tokens (420-fork Wave 3) ────────────────────────────────────

export const BATCH_STATUS_LABELS: Record<string, string> = {
  AWAITING_INTAKE: "Awaiting Intake",
  LIVE: "Available",
  ON_HOLD: "On Hold",
  QUARANTINED: "Quality Hold",
  SOLD_OUT: "Sold Out",
  CLOSED: "Closed",
};

export const BATCH_STATUS_CLASSES: Record<string, string> = {
  AWAITING_INTAKE: "bg-blue-50 text-blue-700 border border-blue-200",
  LIVE: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  ON_HOLD: "bg-amber-50 text-amber-700 border border-amber-200",
  QUARANTINED: "bg-red-50 text-red-700 border border-red-200",
  SOLD_OUT: "bg-neutral-100 text-neutral-500 border border-neutral-200",
  CLOSED: "bg-neutral-100 text-neutral-400 border border-neutral-200",
};

export function getBatchStatusLabel(status: string): string {
  return (
    BATCH_STATUS_LABELS[status] ??
    status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
  );
}

export function getBatchStatusClass(status: string): string {
  return (
    BATCH_STATUS_CLASSES[status] ??
    "bg-muted text-muted-foreground border border-border"
  );
}

export const GRADE_CLASSES: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold",
  "A+": "bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold",
  B: "bg-sky-100 text-sky-800 border border-sky-200 font-medium",
  C: "bg-amber-100 text-amber-800 border border-amber-200",
  D: "bg-neutral-100 text-neutral-600 border border-neutral-200",
};

export function getGradeClass(grade: string): string {
  const normalized = grade.toUpperCase();
  return (
    GRADE_CLASSES[normalized] ??
    "bg-muted text-muted-foreground border border-border"
  );
}

// ─── Invoice/Bill Status Tokens (420-fork Wave 5) ──────────────────────────

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  PARTIAL: "Partial",
  OVERDUE: "Overdue",
  VOIDED: "Voided",
  CANCELLED: "Cancelled",
  WRITE_OFF: "Written Off",
};

export const INVOICE_STATUS_CLASSES: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700 border border-amber-200",
  SENT: "bg-sky-50 text-sky-700 border border-sky-200",
  PAID: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PARTIAL: "bg-violet-50 text-violet-700 border border-violet-200",
  OVERDUE: "bg-red-50 text-red-700 border border-red-200 font-semibold",
  VOIDED: "bg-neutral-100 text-neutral-500 border border-neutral-200",
  CANCELLED: "bg-neutral-100 text-neutral-500 border border-neutral-200",
  WRITE_OFF:
    "bg-neutral-200 text-neutral-600 border border-neutral-300 line-through",
};

export function getInvoiceStatusLabel(status: string): string {
  return (
    INVOICE_STATUS_LABELS[status] ??
    status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
  );
}

export function getInvoiceStatusClass(status: string): string {
  return (
    INVOICE_STATUS_CLASSES[status] ??
    "bg-muted text-muted-foreground border border-border"
  );
}

// Currency formatting helper
export function formatCurrency(
  value: number | string | null | undefined,
  opts?: { showSign?: boolean }
): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return "—";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));
  if (opts?.showSign) {
    return num >= 0 ? `+${formatted}` : `-${formatted}`;
  }
  return formatted;
}
