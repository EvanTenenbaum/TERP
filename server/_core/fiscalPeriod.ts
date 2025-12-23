import { db } from "../db";
import { fiscalPeriods } from "../../drizzle/schema";
import { and, lte, gte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Get the fiscal period ID for a given date.
 * Throws if no matching fiscal period is found.
 *
 * @param date - The date to find the fiscal period for
 * @returns The fiscal period ID
 * @throws TRPCError with code NOT_FOUND if no period matches
 */
export async function getFiscalPeriodId(date: Date): Promise<number> {
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  }

  const dateStr = date.toISOString().split("T")[0];
  const period = await db.query.fiscalPeriods.findFirst({
    where: and(
      lte(fiscalPeriods.startDate, sql`${dateStr}`),
      gte(fiscalPeriods.endDate, sql`${dateStr}`)
    ),
  });

  if (!period) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `No fiscal period found for date ${date.toISOString().split("T")[0]}`,
    });
  }

  return period.id;
}

/**
 * Get the current fiscal period ID (for today's date).
 *
 * @returns The current fiscal period ID
 * @throws TRPCError with code NOT_FOUND if no period matches today
 */
export async function getCurrentFiscalPeriodId(): Promise<number> {
  return getFiscalPeriodId(new Date());
}

/**
 * Get fiscal period ID, returning a default if not found.
 * Use this when you need a fallback (e.g., for historical data).
 *
 * @param date - The date to find the fiscal period for
 * @param defaultPeriodId - The default period ID to return if not found (default: 1)
 * @returns The fiscal period ID or the default
 */
export async function getFiscalPeriodIdOrDefault(
  date: Date,
  defaultPeriodId: number = 1
): Promise<number> {
  try {
    return await getFiscalPeriodId(date);
  } catch {
    return defaultPeriodId;
  }
}
