# QUAL-003 Wave 2D: Calendar Financials Integration

**Wave:** 2 (Core Business Logic)  
**Agent:** 2D (Calendar Financials)  
**Priority:** 🟡 HIGH - Feature completion  
**Estimated Time:** 2 hours  
**Dependencies:** Wave 1 complete

---

## Mission

Complete the calendar financials integration by connecting calendar events to the accounting module and implementing proper timezone handling.

---

## Files You Own (EXCLUSIVE)

Only you will touch these files. No other agent will modify them.

| File | TODOs |
|------|-------|
| `server/routers/calendarFinancials.ts` | Lines 25, 62, 87, 134 |

---

## Task W2-D1: Integrate with Accounting Module (Lines 25, 62, 87)

**Current Code (Line 25):**
```typescript
// TODO: Integrate with accounting module
```

**Current Code (Line 62):**
```typescript
// TODO: Integrate with accounting module
```

**Current Code (Line 87):**
```typescript
// TODO: Integrate with accounting module
```

**Implementation:**

```typescript
import { router, protectedProcedure } from "../_core/trpc";
import { getCurrentUserId } from "../_core/authHelpers";
import { getFiscalPeriodId } from "../_core/fiscalPeriod";
import { getAccountIdByName, ACCOUNT_NAMES } from "../_core/accountLookup";
import { db } from "../_core/db";
import { calendarEvents, ledgerEntries, invoices } from "../../drizzle/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

export const calendarFinancialsRouter = router({
  // Get financial summary for calendar period
  getFinancialSummary: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = getCurrentUserId(ctx);
      const { startDate, endDate } = input;

      // Get revenue from completed orders in period
      const revenueData = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(total), 0)`,
          orderCount: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, "completed"),
            gte(orders.completedAt, startDate),
            lte(orders.completedAt, endDate)
          )
        );

      // Get expenses from bills in period
      const expenseData = await db
        .select({
          totalExpenses: sql<number>`COALESCE(SUM(amount), 0)`,
          billCount: sql<number>`COUNT(*)`,
        })
        .from(bills)
        .where(
          and(
            gte(bills.dueDate, startDate),
            lte(bills.dueDate, endDate)
          )
        );

      // Get calendar events with financial impact
      const financialEvents = await db.query.calendarEvents.findMany({
        where: and(
          gte(calendarEvents.startTime, startDate),
          lte(calendarEvents.endTime, endDate),
          eq(calendarEvents.hasFinancialImpact, true)
        ),
      });

      return {
        period: { startDate, endDate },
        revenue: revenueData[0]?.totalRevenue ?? 0,
        expenses: expenseData[0]?.totalExpenses ?? 0,
        netIncome: (revenueData[0]?.totalRevenue ?? 0) - (expenseData[0]?.totalExpenses ?? 0),
        orderCount: revenueData[0]?.orderCount ?? 0,
        billCount: expenseData[0]?.billCount ?? 0,
        financialEventCount: financialEvents.length,
      };
    }),

  // Link calendar event to financial transaction
  linkEventToTransaction: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      transactionType: z.enum(["invoice", "bill", "payment", "expense"]),
      transactionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = getCurrentUserId(ctx);
      const { eventId, transactionType, transactionId } = input;

      // Verify event exists
      const event = await db.query.calendarEvents.findFirst({
        where: eq(calendarEvents.id, eventId),
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar event not found",
        });
      }

      // Update event with financial link
      await db
        .update(calendarEvents)
        .set({
          hasFinancialImpact: true,
          linkedTransactionType: transactionType,
          linkedTransactionId: transactionId,
          updatedAt: new Date(),
        })
        .where(eq(calendarEvents.id, eventId));

      return { eventId, transactionType, transactionId };
    }),

  // Get financial events for calendar view
  getFinancialEvents: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      includeInvoices: z.boolean().default(true),
      includeBills: z.boolean().default(true),
      includePayments: z.boolean().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const userId = getCurrentUserId(ctx);
      const { startDate, endDate, includeInvoices, includeBills, includePayments } = input;

      const events: FinancialCalendarEvent[] = [];

      // Get invoice due dates
      if (includeInvoices) {
        const invoicesDue = await db.query.invoices.findMany({
          where: and(
            gte(invoices.dueDate, startDate),
            lte(invoices.dueDate, endDate),
            eq(invoices.status, "open")
          ),
          with: { customer: true },
        });

        events.push(...invoicesDue.map((inv) => ({
          id: `invoice-${inv.id}`,
          type: "invoice" as const,
          title: `Invoice #${inv.id} due`,
          date: inv.dueDate,
          amount: inv.total,
          entityId: inv.id,
          entityName: inv.customer?.name ?? "Unknown",
          status: inv.status,
        })));
      }

      // Get bill due dates
      if (includeBills) {
        const billsDue = await db.query.bills.findMany({
          where: and(
            gte(bills.dueDate, startDate),
            lte(bills.dueDate, endDate),
            eq(bills.status, "open")
          ),
          with: { vendor: true },
        });

        events.push(...billsDue.map((bill) => ({
          id: `bill-${bill.id}`,
          type: "bill" as const,
          title: `Bill #${bill.id} due`,
          date: bill.dueDate,
          amount: bill.amount,
          entityId: bill.id,
          entityName: bill.vendor?.name ?? "Unknown",
          status: bill.status,
        })));
      }

      // Get scheduled payments
      if (includePayments) {
        const scheduledPayments = await db.query.scheduledPayments.findMany({
          where: and(
            gte(scheduledPayments.scheduledDate, startDate),
            lte(scheduledPayments.scheduledDate, endDate),
            eq(scheduledPayments.status, "pending")
          ),
        });

        events.push(...scheduledPayments.map((pmt) => ({
          id: `payment-${pmt.id}`,
          type: "payment" as const,
          title: `Scheduled payment`,
          date: pmt.scheduledDate,
          amount: pmt.amount,
          entityId: pmt.id,
          entityName: pmt.description ?? "Payment",
          status: pmt.status,
        })));
      }

      // Sort by date
      events.sort((a, b) => a.date.getTime() - b.date.getTime());

      return events;
    }),
});
```

---

## Task W2-D2: Implement Timezone Handling (Line 134)

**Current Code:**
```typescript
// TODO: Use user's timezone
```

**Implementation:**

```typescript
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

// Get user's timezone from preferences or default
async function getUserTimezone(userId: number): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { timezone: true },
  });
  
  return user?.timezone ?? "America/Los_Angeles"; // Default to Pacific
}

// In the router:
getEventsInUserTimezone: protectedProcedure
  .input(z.object({
    startDate: z.date(),
    endDate: z.date(),
  }))
  .query(async ({ ctx, input }) => {
    const userId = getCurrentUserId(ctx);
    const userTimezone = await getUserTimezone(userId);
    
    // Convert input dates to user's timezone
    const startInTz = toZonedTime(input.startDate, userTimezone);
    const endInTz = toZonedTime(input.endDate, userTimezone);
    
    const events = await db.query.calendarEvents.findMany({
      where: and(
        gte(calendarEvents.startTime, startInTz),
        lte(calendarEvents.endTime, endInTz)
      ),
    });
    
    // Format event times in user's timezone
    return events.map((event) => ({
      ...event,
      startTimeFormatted: formatInTimeZone(
        event.startTime,
        userTimezone,
        "yyyy-MM-dd HH:mm:ss zzz"
      ),
      endTimeFormatted: formatInTimeZone(
        event.endTime,
        userTimezone,
        "yyyy-MM-dd HH:mm:ss zzz"
      ),
      userTimezone,
    }));
  }),

// Helper for creating events with timezone awareness
createEventWithTimezone: protectedProcedure
  .input(z.object({
    title: z.string(),
    startTime: z.date(),
    endTime: z.date(),
    timezone: z.string().optional(),
    // ... other fields
  }))
  .mutation(async ({ ctx, input }) => {
    const userId = getCurrentUserId(ctx);
    const userTimezone = input.timezone ?? await getUserTimezone(userId);
    
    // Store times in UTC but record the original timezone
    const event = await db.insert(calendarEvents).values({
      title: input.title,
      startTime: input.startTime, // Already in UTC from client
      endTime: input.endTime,
      timezone: userTimezone, // Store for display purposes
      createdBy: userId,
      createdAt: new Date(),
    });
    
    return event;
  }),
```

---

## Type Definitions

Add these types to support the calendar financials:

```typescript
interface FinancialCalendarEvent {
  id: string;
  type: "invoice" | "bill" | "payment" | "expense";
  title: string;
  date: Date;
  amount: number;
  entityId: number;
  entityName: string;
  status: string;
}

interface FinancialSummary {
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenue: number;
  expenses: number;
  netIncome: number;
  orderCount: number;
  billCount: number;
  financialEventCount: number;
}
```

---

## Deliverables Checklist

- [ ] `getFinancialSummary` procedure - returns revenue, expenses, net income for period
- [ ] `linkEventToTransaction` procedure - links calendar events to financial transactions
- [ ] `getFinancialEvents` procedure - returns invoices, bills, payments as calendar events
- [ ] Timezone handling implemented with `getUserTimezone` helper
- [ ] Events formatted in user's timezone
- [ ] All TODO comments removed from `server/routers/calendarFinancials.ts`

---

## QA Requirements (Before Merge)

```bash
# 1. TypeScript check
pnpm typecheck

# 2. Lint check
pnpm lint

# 3. Verify no TODOs remain
grep -n "TODO" server/routers/calendarFinancials.ts
# Should return nothing

# 4. Run tests
pnpm test calendarFinancials

# 5. Integration test
# - Get financial summary for a date range
# - Verify revenue and expenses are calculated correctly
# - Create event with timezone
# - Verify times display correctly in user's timezone
```

---

## Do NOT

- ❌ Touch files not in your ownership list
- ❌ Modify calendar event schema (use existing fields)
- ❌ Store times in local timezone (always use UTC)
- ❌ Introduce new TODOs
- ❌ Hardcode timezone values

---

## Dependencies

Use these Wave 0 utilities:
- `getCurrentUserId(ctx)` from `server/_core/authHelpers.ts`
- `getFiscalPeriodId(date)` from `server/_core/fiscalPeriod.ts`

External dependencies (should already be installed):
- `date-fns-tz` for timezone handling

---

## Success Criteria

Your work is complete when:

- [ ] All 4 TODOs resolved
- [ ] Financial summary integrates with accounting data
- [ ] Calendar events can be linked to transactions
- [ ] Timezone handling works correctly
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Code merged to main
