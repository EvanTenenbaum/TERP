# QUAL-003 Wave 0: Foundation Utilities

**Wave:** 0 (Foundation)  
**Agent:** Single Agent (Sequential)  
**Priority:** 🔴 BLOCKER - Must complete before Wave 1  
**Estimated Time:** 2-3 hours  
**Dependencies:** None

---

## Mission

Create shared utility functions that all subsequent waves will depend on. These utilities standardize authentication, fiscal period lookup, and account resolution across the codebase.

---

## Files to CREATE (New Files)

| File | Purpose |
|------|---------|
| `server/_core/authHelpers.ts` | User authentication helpers |
| `server/_core/fiscalPeriod.ts` | Fiscal period lookup utility |
| `server/_core/accountLookup.ts` | Chart of accounts lookup utility |
| `server/services/notificationService.ts` | Notification service stub |

---

## Task W0-001: Create authHelpers.ts

**File:** `server/_core/authHelpers.ts`

Create a helper that safely gets the current user ID and throws if not authenticated:

```typescript
import { TRPCError } from "@trpc/server";
import { Context } from "./context";
import { getAuthenticatedUserId } from "./trpc";

/**
 * Get the current authenticated user ID.
 * Throws UNAUTHORIZED if no user is authenticated or if it's a demo user.
 * 
 * Use this in mutations that require a real user for audit trails.
 */
export function getCurrentUserId(ctx: Context): number {
  const userId = getAuthenticatedUserId(ctx);
  
  if (!userId || userId <= 0) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }
  
  return userId;
}

/**
 * Get the current user ID, returning null if not authenticated.
 * Use this for optional user context (e.g., logging, analytics).
 */
export function getCurrentUserIdOrNull(ctx: Context): number | null {
  try {
    const userId = getAuthenticatedUserId(ctx);
    return userId > 0 ? userId : null;
  } catch {
    return null;
  }
}
```

**Tests Required:** `server/_core/authHelpers.test.ts`
- Test throws when no user
- Test throws when demo user (id <= 0)
- Test returns valid user ID
- Test `getCurrentUserIdOrNull` returns null safely

---

## Task W0-002: Create fiscalPeriod.ts

**File:** `server/_core/fiscalPeriod.ts`

Create a utility to look up fiscal periods by date:

```typescript
import { db } from "./db";
import { fiscalPeriods } from "../../drizzle/schema";
import { and, lte, gte, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Get the fiscal period ID for a given date.
 * Throws if no matching fiscal period is found.
 */
export async function getFiscalPeriodId(date: Date): Promise<number> {
  const period = await db.query.fiscalPeriods.findFirst({
    where: and(
      lte(fiscalPeriods.startDate, date),
      gte(fiscalPeriods.endDate, date)
    ),
  });

  if (!period) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `No fiscal period found for date ${date.toISOString()}`,
    });
  }

  return period.id;
}

/**
 * Get the current fiscal period ID (for today's date).
 */
export async function getCurrentFiscalPeriodId(): Promise<number> {
  return getFiscalPeriodId(new Date());
}

/**
 * Get fiscal period ID, returning a default if not found.
 * Use this when you need a fallback (e.g., for historical data).
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
```

**Tests Required:** `server/_core/fiscalPeriod.test.ts`
- Test finds period for valid date
- Test throws for date with no period
- Test `getCurrentFiscalPeriodId` works
- Test `getFiscalPeriodIdOrDefault` returns default on error

---

## Task W0-003: Create accountLookup.ts

**File:** `server/_core/accountLookup.ts`

Create a utility to look up chart of accounts by name or code:

```typescript
import { db } from "./db";
import { chartOfAccounts } from "../../drizzle/schema";
import { eq, or, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Common account names used throughout the system
export const ACCOUNT_NAMES = {
  ACCOUNTS_RECEIVABLE: "Accounts Receivable",
  ACCOUNTS_PAYABLE: "Accounts Payable",
  BAD_DEBT_EXPENSE: "Bad Debt Expense",
  SALES_REVENUE: "Sales Revenue",
  COST_OF_GOODS_SOLD: "Cost of Goods Sold",
  INVENTORY: "Inventory",
  CASH: "Cash",
} as const;

/**
 * Get account ID by name.
 * Throws if account not found.
 */
export async function getAccountIdByName(name: string): Promise<number> {
  const account = await db.query.chartOfAccounts.findFirst({
    where: and(
      eq(chartOfAccounts.name, name),
      isNull(chartOfAccounts.deletedAt)
    ),
  });

  if (!account) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Account "${name}" not found in chart of accounts`,
    });
  }

  return account.id;
}

/**
 * Get account ID by code (e.g., "1100" for AR).
 */
export async function getAccountIdByCode(code: string): Promise<number> {
  const account = await db.query.chartOfAccounts.findFirst({
    where: and(
      eq(chartOfAccounts.code, code),
      isNull(chartOfAccounts.deletedAt)
    ),
  });

  if (!account) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Account with code "${code}" not found`,
    });
  }

  return account.id;
}

/**
 * Get multiple account IDs by names.
 * Returns a map of name -> id.
 */
export async function getAccountIdsByNames(
  names: string[]
): Promise<Map<string, number>> {
  const accounts = await db.query.chartOfAccounts.findMany({
    where: isNull(chartOfAccounts.deletedAt),
  });

  const result = new Map<string, number>();
  for (const name of names) {
    const account = accounts.find((a) => a.name === name);
    if (account) {
      result.set(name, account.id);
    }
  }

  return result;
}
```

**Tests Required:** `server/_core/accountLookup.test.ts`
- Test finds account by name
- Test finds account by code
- Test throws for non-existent account
- Test `getAccountIdsByNames` returns map
- Test excludes soft-deleted accounts

---

## Task W0-004: Create notificationService.ts

**File:** `server/services/notificationService.ts`

Create a notification service stub that other modules can use:

```typescript
import { db } from "../_core/db";
import { logger } from "../_core/logger";

export type NotificationMethod = "email" | "sms" | "push" | "in-app";

export interface NotificationPayload {
  userId: number;
  title: string;
  message: string;
  method: NotificationMethod;
  metadata?: Record<string, unknown>;
}

/**
 * Send a notification to a user.
 * Currently logs the notification - implement actual delivery later.
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<void> {
  logger.info({ payload }, "Notification requested");

  // TODO: Implement actual notification delivery
  // For now, just log it
  switch (payload.method) {
    case "email":
      logger.info({ to: payload.userId, subject: payload.title }, "Email notification (stub)");
      break;
    case "sms":
      logger.info({ to: payload.userId }, "SMS notification (stub)");
      break;
    case "push":
      logger.info({ to: payload.userId }, "Push notification (stub)");
      break;
    case "in-app":
      // Could create inbox item here
      logger.info({ to: payload.userId }, "In-app notification (stub)");
      break;
  }
}

/**
 * Send notification to multiple users.
 */
export async function sendBulkNotification(
  userIds: number[],
  notification: Omit<NotificationPayload, "userId">
): Promise<void> {
  await Promise.all(
    userIds.map((userId) =>
      sendNotification({ ...notification, userId })
    )
  );
}

/**
 * Send a reminder notification.
 */
export async function sendReminder(
  userId: number,
  reminderType: string,
  entityId: number,
  entityType: string
): Promise<void> {
  await sendNotification({
    userId,
    title: `Reminder: ${reminderType}`,
    message: `You have a ${reminderType} for ${entityType} #${entityId}`,
    method: "in-app",
    metadata: { entityId, entityType, reminderType },
  });
}
```

**Tests Required:** `server/services/notificationService.test.ts`
- Test `sendNotification` logs correctly
- Test `sendBulkNotification` calls for each user
- Test `sendReminder` formats message correctly

---

## Deliverables Checklist

- [ ] `server/_core/authHelpers.ts` created with `getCurrentUserId`, `getCurrentUserIdOrNull`
- [ ] `server/_core/authHelpers.test.ts` with 4+ tests
- [ ] `server/_core/fiscalPeriod.ts` created with `getFiscalPeriodId`, `getCurrentFiscalPeriodId`, `getFiscalPeriodIdOrDefault`
- [ ] `server/_core/fiscalPeriod.test.ts` with 4+ tests
- [ ] `server/_core/accountLookup.ts` created with `getAccountIdByName`, `getAccountIdByCode`, `getAccountIdsByNames`, `ACCOUNT_NAMES`
- [ ] `server/_core/accountLookup.test.ts` with 5+ tests
- [ ] `server/services/notificationService.ts` created with `sendNotification`, `sendBulkNotification`, `sendReminder`
- [ ] `server/services/notificationService.test.ts` with 3+ tests

---

## QA Requirements (Before Merge)

```bash
# 1. TypeScript check
pnpm typecheck

# 2. Lint check  
pnpm lint

# 3. Run tests for new files
pnpm test authHelpers fiscalPeriod accountLookup notificationService

# 4. Run full test suite
pnpm test

# 5. Verify exports work
# Create a test file that imports all new utilities
```

---

## Do NOT

- ❌ Touch any existing files (except adding exports to index files if needed)
- ❌ Introduce new TODOs (except the one in notificationService which is intentional)
- ❌ Skip tests
- ❌ Use `any` types
- ❌ Add dependencies without approval

---

## Success Criteria

Wave 0 is complete when:

- [ ] All 4 utility files created
- [ ] All tests pass (16+ new tests)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Code merged to main
- [ ] Other waves can import these utilities

---

## Next Wave

After Wave 0 is complete and merged, Wave 1 (Security & Auth) can begin with 3 parallel agents.
