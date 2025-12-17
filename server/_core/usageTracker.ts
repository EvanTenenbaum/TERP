/**
 * Lightweight in-memory usage tracking for tRPC procedures.
 *
 * Purpose:
 * - Provide evidence for "what is actually used" in production/staging
 * - Help identify likely-unused endpoints and user flows
 *
 * Notes:
 * - In-memory only: resets on deploy/restart
 * - Safe: no PII stored (only user category + optional numeric id)
 */
export type TrpcCallerCategory = "public-demo" | "authenticated" | "admin" | "vip-portal" | "unknown";

export type TrpcUsageRecord = {
  procedure: string; // e.g. "query.orders.getAll"
  count: number;
  successCount: number;
  errorCount: number;
  totalDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastError?: string;
  lastErrorAt?: Date;
  callerBreakdown: Record<TrpcCallerCategory, number>;
};

type MutableUsageRecord = Omit<TrpcUsageRecord, "callerBreakdown"> & {
  callerBreakdown: Map<TrpcCallerCategory, number>;
};

const usageByProcedure = new Map<string, MutableUsageRecord>();
let trackingStartedAt = new Date();

export function recordTrpcUsage(input: {
  procedure: string;
  durationMs: number;
  success: boolean;
  error?: string;
  callerCategory?: TrpcCallerCategory;
}): void {
  const now = new Date();
  const key = input.procedure;
  const callerCategory: TrpcCallerCategory = input.callerCategory ?? "unknown";

  const existing = usageByProcedure.get(key);
  if (!existing) {
    const callerBreakdown = new Map<TrpcCallerCategory, number>();
    callerBreakdown.set(callerCategory, 1);
    usageByProcedure.set(key, {
      procedure: key,
      count: 1,
      successCount: input.success ? 1 : 0,
      errorCount: input.success ? 0 : 1,
      totalDurationMs: input.durationMs,
      minDurationMs: input.durationMs,
      maxDurationMs: input.durationMs,
      firstSeenAt: now,
      lastSeenAt: now,
      lastError: input.success ? undefined : input.error ?? "Unknown error",
      lastErrorAt: input.success ? undefined : now,
      callerBreakdown,
    });
    return;
  }

  existing.count += 1;
  existing.successCount += input.success ? 1 : 0;
  existing.errorCount += input.success ? 0 : 1;
  existing.totalDurationMs += input.durationMs;
  existing.minDurationMs = Math.min(existing.minDurationMs, input.durationMs);
  existing.maxDurationMs = Math.max(existing.maxDurationMs, input.durationMs);
  existing.lastSeenAt = now;
  if (!input.success) {
    existing.lastError = input.error ?? "Unknown error";
    existing.lastErrorAt = now;
  }

  existing.callerBreakdown.set(
    callerCategory,
    (existing.callerBreakdown.get(callerCategory) ?? 0) + 1
  );
}

export function getTrpcUsageStartedAt(): Date {
  return trackingStartedAt;
}

export function resetTrpcUsage(): { startedAt: Date } {
  usageByProcedure.clear();
  trackingStartedAt = new Date();
  return { startedAt: trackingStartedAt };
}

export function getTrpcUsageSnapshot(): TrpcUsageRecord[] {
  return Array.from(usageByProcedure.values()).map((r) => ({
    procedure: r.procedure,
    count: r.count,
    successCount: r.successCount,
    errorCount: r.errorCount,
    totalDurationMs: r.totalDurationMs,
    minDurationMs: r.minDurationMs,
    maxDurationMs: r.maxDurationMs,
    firstSeenAt: r.firstSeenAt,
    lastSeenAt: r.lastSeenAt,
    lastError: r.lastError,
    lastErrorAt: r.lastErrorAt,
    callerBreakdown: Object.fromEntries(r.callerBreakdown.entries()) as Record<
      TrpcCallerCategory,
      number
    >,
  }));
}

export function getTrpcUsageSummary() {
  const records = getTrpcUsageSnapshot();
  const totalCalls = records.reduce((sum, r) => sum + r.count, 0);
  const totalErrors = records.reduce((sum, r) => sum + r.errorCount, 0);
  return {
    startedAt: trackingStartedAt,
    proceduresSeen: records.length,
    totalCalls,
    totalErrors,
    errorRatePercent: totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0,
  };
}

