export type StatusBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

const STATUS_BADGE_VARIANTS: Record<string, StatusBadgeVariant> = {
  // Active states intentionally keep the design-system "default" variant.
  // TER-1095 audits care about whether call sites are routed through this helper,
  // not whether the final rendered variant string stops being "default".
  ACTIVE: "default",
  AVAILABLE: "default",
  CONFIRMED: "default",
  IN_PROGRESS: "default",
  LIVE: "default",
  READY: "default",
  READY_FOR_PACKING: "default",
  SENT: "default",
  VIEWED: "default",
  WORKING: "default",

  CANCELLED: "secondary",
  DRAFT: "secondary",
  ENDED: "secondary",
  NEW: "secondary",
  ON_BREAK: "secondary",
  PAUSED: "secondary",
  PENDING: "secondary",
  REVIEWED: "secondary",
  SCHEDULED: "secondary",
  UNSENT: "secondary",

  ARCHIVED: "outline",
  BLOCKED: "destructive",
  CRITICAL: "destructive",
  OVERDUE: "destructive",
  QUARANTINED: "destructive",
  VOID: "destructive",

  COMPLETED: "outline",
  COMPLETE: "outline",
  CONVERTED: "outline",
  DELIVERED: "outline",
  PAID: "outline",
  RECEIVED: "outline",
  TRIGGERED: "default",
};

function normalizeStatusKey(status: string | null | undefined): string {
  return String(status ?? "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

export function getStatusBadgeVariant(
  status: string | null | undefined
): StatusBadgeVariant {
  return STATUS_BADGE_VARIANTS[normalizeStatusKey(status)] ?? "outline";
}
