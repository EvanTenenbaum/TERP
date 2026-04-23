import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * FreshnessBadge — small primitive that surfaces data freshness inline.
 *
 * Reads `dataUpdatedAt` (epoch ms) from a tRPC/React Query result and renders:
 *   - live:    "Live · 2m ago"           (relative time, refreshes every 60s)
 *   - nightly: "Nightly · as of 06:00"   (clock time, HH:MM)
 *   - hourly:  "Hourly · 06:00"          (clock time, HH:MM)
 *
 * [TER-1296] — UX-7 freshness disclosure for workspace pages.
 */
export type FreshnessCadence = "live" | "nightly" | "hourly";

export type FreshnessBadgeProps = Omit<
  React.ComponentProps<"span">,
  "children"
> & {
  /** React Query / tRPC query result — only `dataUpdatedAt` (ms epoch) is read. */
  queryResult: { dataUpdatedAt: number };
  /** Cadence of the underlying data source. */
  cadence: FreshnessCadence;
  className?: string;
};

function formatRelative(fromMs: number, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((nowMs - fromMs) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatClock(fromMs: number): string {
  if (!fromMs) return "--:--";
  const d = new Date(fromMs);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

const CADENCE_LABEL: Record<FreshnessCadence, string> = {
  live: "Live",
  nightly: "Nightly",
  hourly: "Hourly",
};

export function FreshnessBadge({
  queryResult,
  cadence,
  className,
  ...props
}: FreshnessBadgeProps) {
  const { dataUpdatedAt } = queryResult;

  // Tick every 60s so the relative label stays fresh without a parent re-render.
  const [now, setNow] = React.useState<number>(() => Date.now());
  React.useEffect(() => {
    if (cadence !== "live") return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [cadence]);

  let suffix: string;
  if (cadence === "live") {
    suffix = dataUpdatedAt ? formatRelative(dataUpdatedAt, now) : "—";
  } else if (cadence === "nightly") {
    suffix = `as of ${formatClock(dataUpdatedAt)}`;
  } else {
    suffix = formatClock(dataUpdatedAt);
  }

  const label = `${CADENCE_LABEL[cadence]} · ${suffix}`;

  return (
    <span
      data-slot="freshness-badge"
      data-cadence={cadence}
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap",
        className,
      )}
      aria-label={label}
      title={dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : undefined}
      {...props}
    >
      {label}
    </span>
  );
}

export default FreshnessBadge;
