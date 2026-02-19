import { eq, and, lte, desc } from "drizzle-orm";
import { getDb } from "./db";
import { recurringOrders, clients, users } from "../drizzle/schema";
import { logger } from "./_core/logger";

/**
 * Create a recurring order
 */
export async function createRecurringOrder(data: {
  clientId: number;
  frequency: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  orderTemplate: Record<string, unknown>;
  startDate: string;
  endDate?: string;
  notifyClient?: boolean;
  notifyEmail?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Calculate next generation date
    const nextGenerationDate = calculateNextGenerationDate(
      data.startDate,
      data.frequency,
      data.dayOfWeek,
      data.dayOfMonth
    );

    const [result] = await db.insert(recurringOrders).values({
      clientId: data.clientId,
      frequency: data.frequency as
        | "DAILY"
        | "WEEKLY"
        | "BIWEEKLY"
        | "MONTHLY"
        | "QUARTERLY",
      dayOfWeek: data.dayOfWeek,
      dayOfMonth: data.dayOfMonth,
      orderTemplate: data.orderTemplate,
      startDate: data.startDate,
      endDate: data.endDate,
      nextGenerationDate: nextGenerationDate as unknown as Date,
      notifyClient: data.notifyClient ?? true,
      notifyEmail: data.notifyEmail,
      createdBy: data.createdBy,
      status: "ACTIVE",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    return { success: true, recurringOrderId: result.insertId };
  } catch (error) {
    logger.error({
      msg: "Error creating recurring order",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update recurring order
 */
export async function updateRecurringOrder(
  recurringOrderId: number,
  data: {
    frequency?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    orderTemplate?: Record<string, unknown>;
    endDate?: string;
    notifyClient?: boolean;
    notifyEmail?: string;
    status?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [existing] = await db
      .select()
      .from(recurringOrders)
      .where(eq(recurringOrders.id, recurringOrderId));

    if (!existing) {
      return { success: false, error: "Recurring order not found" };
    }

    const updateData: Record<string, unknown> = {};
    if (data.frequency) updateData.frequency = data.frequency;
    if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
    if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth;
    if (data.orderTemplate) updateData.orderTemplate = data.orderTemplate;
    if (data.endDate) updateData.endDate = data.endDate;
    if (data.notifyClient !== undefined)
      updateData.notifyClient = data.notifyClient;
    if (data.notifyEmail) updateData.notifyEmail = data.notifyEmail;
    if (data.status) updateData.status = data.status;

    // Recalculate next generation date if frequency changed
    if (
      data.frequency ||
      data.dayOfWeek !== undefined ||
      data.dayOfMonth !== undefined
    ) {
      const nextGenerationDate = calculateNextGenerationDate(
        existing.nextGenerationDate.toString(),
        data.frequency || existing.frequency,
        data.dayOfWeek ?? existing.dayOfWeek,
        data.dayOfMonth ?? existing.dayOfMonth
      );
      updateData.nextGenerationDate = nextGenerationDate;
    }

    await db
      .update(recurringOrders)
      .set(updateData)
      .where(eq(recurringOrders.id, recurringOrderId));

    return { success: true };
  } catch (error) {
    logger.error({
      msg: "Error updating recurring order",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Pause recurring order
 */
export async function pauseRecurringOrder(recurringOrderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(recurringOrders)
      .set({ status: "PAUSED" })
      .where(eq(recurringOrders.id, recurringOrderId));

    return { success: true };
  } catch (error) {
    logger.error({
      msg: "Error pausing recurring order",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Resume recurring order
 */
export async function resumeRecurringOrder(recurringOrderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [existing] = await db
      .select()
      .from(recurringOrders)
      .where(eq(recurringOrders.id, recurringOrderId));

    if (!existing) {
      return { success: false, error: "Recurring order not found" };
    }

    // Recalculate next generation date from today
    const nextGenerationDate = calculateNextGenerationDate(
      new Date().toISOString().split("T")[0],
      existing.frequency,
      existing.dayOfWeek,
      existing.dayOfMonth
    );

    await db
      .update(recurringOrders)
      .set({
        status: "ACTIVE",
        nextGenerationDate: nextGenerationDate as unknown as Date,
      })
      .where(eq(recurringOrders.id, recurringOrderId));

    return { success: true };
  } catch (error) {
    logger.error({
      msg: "Error resuming recurring order",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Cancel recurring order
 */
export async function cancelRecurringOrder(recurringOrderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(recurringOrders)
      .set({ status: "CANCELLED" })
      .where(eq(recurringOrders.id, recurringOrderId));

    return { success: true };
  } catch (error) {
    logger.error({
      msg: "Error cancelling recurring order",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get recurring orders due for generation
 */
export async function getDueRecurringOrders() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const today = new Date().toISOString().split("T")[0];

    const dueOrders = await db
      .select({
        recurringOrder: recurringOrders,
        client: clients,
      })
      .from(recurringOrders)
      .leftJoin(clients, eq(recurringOrders.clientId, clients.id))
      .where(
        and(
          eq(recurringOrders.status, "ACTIVE"),
          lte(recurringOrders.nextGenerationDate, new Date(today))
        )
      );

    return { success: true, dueOrders };
  } catch (error) {
    logger.error({
      msg: "Error getting due recurring orders",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Mark recurring order as generated and calculate next date
 */
export async function markRecurringOrderGenerated(recurringOrderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [existing] = await db
      .select()
      .from(recurringOrders)
      .where(eq(recurringOrders.id, recurringOrderId));

    if (!existing) {
      return { success: false, error: "Recurring order not found" };
    }

    const today = new Date().toISOString().split("T")[0];
    const nextGenerationDate = calculateNextGenerationDate(
      today,
      existing.frequency,
      existing.dayOfWeek,
      existing.dayOfMonth
    );

    await db
      .update(recurringOrders)
      .set({
        lastGeneratedDate: today as unknown as Date,
        nextGenerationDate: nextGenerationDate as unknown as Date,
      })
      .where(eq(recurringOrders.id, recurringOrderId));

    return { success: true, nextGenerationDate };
  } catch (error) {
    logger.error({
      msg: "Error marking recurring order as generated",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * List recurring orders for a client
 */
export async function listRecurringOrdersForClient(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const orders = await db
      .select()
      .from(recurringOrders)
      .where(eq(recurringOrders.clientId, clientId))
      .orderBy(desc(recurringOrders.createdAt));

    return { success: true, orders };
  } catch (error) {
    logger.error({
      msg: "Error listing recurring orders for client",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * List all recurring orders
 */
export async function listAllRecurringOrders(_status?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const query = db
      .select({
        recurringOrder: recurringOrders,
        client: clients,
        creator: users,
      })
      .from(recurringOrders)
      .leftJoin(clients, eq(recurringOrders.clientId, clients.id))
      .leftJoin(users, eq(recurringOrders.createdBy, users.id))
      .orderBy(desc(recurringOrders.createdAt));

    const orders = await query;

    return { success: true, orders };
  } catch (error) {
    logger.error({
      msg: "Error listing all recurring orders",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Calculate next generation date based on frequency
 */
function calculateNextGenerationDate(
  fromDate: string,
  frequency: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): string {
  const date = new Date(fromDate);

  switch (frequency) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;

    case "WEEKLY": {
      // Move to next occurrence of dayOfWeek
      const targetDay = dayOfWeek ?? 1; // Default to Monday
      const currentDay = date.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntilTarget);
      break;
    }

    case "BIWEEKLY": {
      // Move to next occurrence of dayOfWeek, 2 weeks out
      const targetDay2 = dayOfWeek ?? 1;
      const currentDay2 = date.getDay();
      const daysUntilTarget2 = (targetDay2 - currentDay2 + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntilTarget2 + 7);
      break;
    }

    case "MONTHLY": {
      // Move to next occurrence of dayOfMonth
      const targetDayOfMonth = dayOfMonth ?? 1;
      date.setMonth(date.getMonth() + 1);
      date.setDate(
        Math.min(
          targetDayOfMonth,
          new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
        )
      );
      break;
    }

    case "QUARTERLY":
      // Move 3 months forward
      date.setMonth(date.getMonth() + 3);
      break;

    default:
      date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split("T")[0];
}
