# QUAL-003 Wave 3D: UI & Miscellaneous Fixes

**Wave:** 3 (Features & Polish)  
**Agent:** 3D (UI & Misc)  
**Priority:** 🟡 MEDIUM - Feature completion  
**Estimated Time:** 3 hours  
**Dependencies:** Wave 2 complete

---

## Mission

Complete miscellaneous UI fixes and server-side features including navigation, batch details, client archiving, calendar jobs, webhooks, and notification integration.

---

## Files You Own (EXCLUSIVE)

Only you will touch these files. No other agent will modify them.

| File | TODOs |
|------|-------|
| `client/src/components/inbox/InboxItem.tsx` | Line 97 |
| `client/src/components/inventory/BatchDetailDrawer.tsx` | Lines 324, 334, 611 |
| `client/src/pages/ClientsListPage.tsx` | Line 877 |
| `server/_core/calendarJobs.ts` | Lines 45, 124-127, 158, 174 |
| `server/webhooks/github.ts` | Line 131 |
| `server/routers/calendarMeetings.ts` | Line 111 |
| `server/routers/calendarParticipants.ts` | Line 92 |
| `server/paymentMethodsDb.ts` | Line 196 |

---

## Task W3-D1: Navigate to Entity in InboxItem.tsx (Line 97)

**Current Code:**
```typescript
// TODO: Navigate to entity
```

**Implementation:**

```typescript
import { useLocation } from "wouter";

// Inside InboxItem component:
const [, setLocation] = useLocation();

const handleNavigateToEntity = () => {
  if (!item.entityType || !item.entityId) return;

  const routes: Record<string, string> = {
    order: `/orders/${item.entityId}`,
    invoice: `/accounting/invoices/${item.entityId}`,
    client: `/clients/${item.entityId}`,
    batch: `/inventory/batches/${item.entityId}`,
    calendar_event: `/calendar?eventId=${item.entityId}`,
    task: `/tasks/${item.entityId}`,
    comment: `/comments/${item.entityId}`,
  };

  const route = routes[item.entityType];
  if (route) {
    setLocation(route);
    // Mark as read when navigating
    markAsRead.mutate({ inboxItemId: item.id });
  }
};

// In the JSX:
<button
  onClick={handleNavigateToEntity}
  className="text-blue-600 hover:text-blue-800 hover:underline"
  aria-label={`View ${item.entityType} ${item.entityId}`}
>
  View {item.entityType}
</button>
```

---

## Task W3-D2: BatchDetailDrawer Product Relation & Avg Price (Lines 324, 334, 611)

**Current Code (Line 324):**
```typescript
// TODO: Enable when product relation is available
```

**Current Code (Line 334):**
```typescript
// TODO: Enable when product relation is available
```

**Current Code (Line 611):**
```typescript
// TODO: Calculate average price from order history
```

**Implementation:**

```typescript
// Lines 324, 334 - Product relation should already be available via the query
// Check if the batch query includes product relation:

// In the parent component or query:
const { data: batch } = trpc.inventory.getBatch.useQuery(
  { batchId },
  { enabled: !!batchId }
);

// The batch should include product data:
// batch.product?.name, batch.product?.sku, etc.

// If product relation exists, enable the display:
{batch?.product && (
  <div className="space-y-2">
    <div className="flex justify-between">
      <span className="text-gray-500">Product</span>
      <span className="font-medium">{batch.product.name}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-gray-500">SKU</span>
      <span className="font-medium">{batch.product.sku ?? "N/A"}</span>
    </div>
  </div>
)}

// Line 611 - Calculate average price:
const { data: priceHistory } = trpc.inventory.getBatchPriceHistory.useQuery(
  { batchId },
  { enabled: !!batchId }
);

const averagePrice = useMemo(() => {
  if (!priceHistory?.length) return null;
  const sum = priceHistory.reduce((acc, p) => acc + p.price, 0);
  return sum / priceHistory.length;
}, [priceHistory]);

// Display:
{averagePrice !== null && (
  <div className="flex justify-between">
    <span className="text-gray-500">Avg. Sale Price</span>
    <span className="font-medium">${averagePrice.toFixed(2)}</span>
  </div>
)}
```

---

## Task W3-D3: Implement Client Archive (Line 877)

**Current Code:**
```typescript
// TODO: Implement archive functionality
```

**Implementation:**

```typescript
// In ClientsListPage.tsx:

const archiveClient = trpc.clients.archive.useMutation({
  onSuccess: () => {
    utils.clients.list.invalidate();
    toast.success("Client archived successfully");
  },
  onError: (error) => {
    toast.error(`Failed to archive client: ${error.message}`);
  },
});

const handleArchiveClient = async (clientId: number) => {
  // Confirm before archiving
  const confirmed = await confirmDialog({
    title: "Archive Client",
    message: "Are you sure you want to archive this client? They will be hidden from the active list but can be restored later.",
    confirmText: "Archive",
    cancelText: "Cancel",
  });

  if (confirmed) {
    archiveClient.mutate({ clientId });
  }
};

// In the actions menu:
<DropdownMenuItem
  onClick={() => handleArchiveClient(client.id)}
  className="text-amber-600"
>
  <ArchiveIcon className="mr-2 h-4 w-4" />
  Archive
</DropdownMenuItem>
```

**Server-side (if not exists):**
```typescript
// In server/routers/clients.ts:
archive: protectedProcedure
  .input(z.object({ clientId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const userId = getCurrentUserId(ctx);
    
    await db
      .update(clients)
      .set({
        deletedAt: new Date(),
        deletedBy: userId,
      })
      .where(eq(clients.id, input.clientId));

    return { success: true };
  }),
```

---

## Task W3-D4: Calendar Jobs Implementation (Lines 45, 124-127, 158, 174)

**Current Code (Line 45):**
```typescript
// TODO: Send notification
```

**Current Code (Lines 124-127):**
```typescript
// TODO: Implement cron job scheduling
```

**Current Code (Line 158):**
```typescript
// TODO: Send reminder notification
```

**Current Code (Line 174):**
```typescript
// TODO: Process recurring events
```

**Implementation:**

```typescript
// server/_core/calendarJobs.ts

import { sendNotification, sendReminder } from "../services/notificationService";
import { db } from "./db";
import { calendarEvents, calendarReminders } from "../../drizzle/schema";
import { eq, and, lte, gte, isNull } from "drizzle-orm";
import { addMinutes, addDays, addWeeks, addMonths } from "date-fns";

// Line 45 - Send notification for event
export async function sendEventNotification(
  eventId: number,
  notificationType: "created" | "updated" | "cancelled" | "reminder"
): Promise<void> {
  const event = await db.query.calendarEvents.findFirst({
    where: eq(calendarEvents.id, eventId),
    with: {
      participants: {
        with: { user: true },
      },
      createdByUser: true,
    },
  });

  if (!event) return;

  const participantUserIds = event.participants
    .map((p) => p.userId)
    .filter((id): id is number => id !== null);

  for (const userId of participantUserIds) {
    await sendNotification({
      userId,
      title: `Calendar Event ${notificationType}: ${event.title}`,
      message: `Event "${event.title}" has been ${notificationType}. Scheduled for ${event.startTime.toLocaleString()}`,
      method: "in-app",
      metadata: {
        eventId: event.id,
        eventType: notificationType,
        startTime: event.startTime.toISOString(),
      },
    });
  }
}

// Lines 124-127 - Cron job scheduling (stub for external scheduler)
export interface ScheduledJob {
  id: string;
  type: "reminder" | "recurring" | "cleanup";
  executeAt: Date;
  payload: Record<string, unknown>;
}

export async function scheduleJob(job: Omit<ScheduledJob, "id">): Promise<string> {
  // In production, this would integrate with a job queue (Bull, Agenda, etc.)
  // For now, store in database for polling
  const result = await db.insert(scheduledJobs).values({
    type: job.type,
    executeAt: job.executeAt,
    payload: JSON.stringify(job.payload),
    status: "pending",
    createdAt: new Date(),
  });

  return `job-${result.insertId}`;
}

export async function processScheduledJobs(): Promise<void> {
  const pendingJobs = await db.query.scheduledJobs.findMany({
    where: and(
      eq(scheduledJobs.status, "pending"),
      lte(scheduledJobs.executeAt, new Date())
    ),
    limit: 100,
  });

  for (const job of pendingJobs) {
    try {
      await executeJob(job);
      await db
        .update(scheduledJobs)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(scheduledJobs.id, job.id));
    } catch (error) {
      await db
        .update(scheduledJobs)
        .set({ status: "failed", error: String(error) })
        .where(eq(scheduledJobs.id, job.id));
    }
  }
}

// Line 158 - Send reminder notification
export async function sendReminderNotification(
  reminderId: number
): Promise<void> {
  const reminder = await db.query.calendarReminders.findFirst({
    where: eq(calendarReminders.id, reminderId),
    with: {
      event: true,
    },
  });

  if (!reminder || !reminder.event) return;

  await sendReminder(
    reminder.userId,
    "Event Reminder",
    reminder.eventId,
    "calendar_event"
  );

  // Mark reminder as sent
  await db
    .update(calendarReminders)
    .set({ sentAt: new Date() })
    .where(eq(calendarReminders.id, reminderId));
}

// Line 174 - Process recurring events
export async function processRecurringEvents(): Promise<void> {
  const recurringEvents = await db.query.calendarEvents.findMany({
    where: and(
      eq(calendarEvents.isRecurring, true),
      isNull(calendarEvents.deletedAt)
    ),
  });

  for (const event of recurringEvents) {
    await createNextOccurrence(event);
  }
}

async function createNextOccurrence(event: CalendarEvent): Promise<void> {
  if (!event.recurrenceRule) return;

  const rule = JSON.parse(event.recurrenceRule);
  let nextStart: Date;

  switch (rule.frequency) {
    case "daily":
      nextStart = addDays(event.startTime, rule.interval ?? 1);
      break;
    case "weekly":
      nextStart = addWeeks(event.startTime, rule.interval ?? 1);
      break;
    case "monthly":
      nextStart = addMonths(event.startTime, rule.interval ?? 1);
      break;
    default:
      return;
  }

  // Check if we've passed the end date
  if (rule.until && nextStart > new Date(rule.until)) return;

  // Create the next occurrence
  const duration = event.endTime.getTime() - event.startTime.getTime();
  
  await db.insert(calendarEvents).values({
    ...event,
    id: undefined, // Let DB generate new ID
    startTime: nextStart,
    endTime: new Date(nextStart.getTime() + duration),
    parentEventId: event.id,
    createdAt: new Date(),
  });
}
```

---

## Task W3-D5: GitHub Webhook Background Job (Line 131)

**Current Code:**
```typescript
// TODO: Implement background job for DO polling
```

**Implementation:**

```typescript
// server/webhooks/github.ts

import { scheduleJob } from "../_core/calendarJobs";

// After receiving GitHub webhook:
export async function handleGitHubPush(payload: GitHubPushPayload): Promise<void> {
  // 1. Log the push event
  await db.insert(deploymentEvents).values({
    source: "github",
    event: "push",
    ref: payload.ref,
    commitSha: payload.after,
    payload: JSON.stringify(payload),
    createdAt: new Date(),
  });

  // 2. Schedule background job to poll DigitalOcean for deployment status
  await scheduleJob({
    type: "deployment_poll",
    executeAt: new Date(Date.now() + 30000), // Start polling after 30 seconds
    payload: {
      commitSha: payload.after,
      ref: payload.ref,
      maxAttempts: 20,
      attemptInterval: 30000, // 30 seconds between polls
    },
  });
}

// Background job handler for DO polling
export async function pollDeploymentStatus(
  commitSha: string,
  attempt: number,
  maxAttempts: number
): Promise<void> {
  // Check DigitalOcean deployment status
  const status = await checkDODeploymentStatus(commitSha);

  if (status === "success" || status === "failed") {
    // Deployment complete - log result
    await db.insert(deploymentResults).values({
      commitSha,
      status,
      completedAt: new Date(),
    });

    // Send notification
    await sendNotification({
      userId: 1, // Admin user
      title: `Deployment ${status}`,
      message: `Deployment for commit ${commitSha.slice(0, 7)} ${status}`,
      method: "in-app",
    });
  } else if (attempt < maxAttempts) {
    // Still in progress - schedule another poll
    await scheduleJob({
      type: "deployment_poll",
      executeAt: new Date(Date.now() + 30000),
      payload: {
        commitSha,
        attempt: attempt + 1,
        maxAttempts,
      },
    });
  }
}

async function checkDODeploymentStatus(commitSha: string): Promise<string> {
  // This would call DigitalOcean API
  // For now, return a stub
  return "in_progress";
}
```

---

## Task W3-D6: Meeting Type Determination (Line 111)

**Current Code:**
```typescript
// TODO: Determine meeting type from context
```

**Implementation:**

```typescript
// server/routers/calendarMeetings.ts

type MeetingType = "internal" | "client" | "vendor" | "interview" | "other";

function determineMeetingType(
  participants: Participant[],
  title: string,
  description?: string
): MeetingType {
  // Check participant types
  const hasExternalClient = participants.some((p) => p.type === "client");
  const hasExternalVendor = participants.some((p) => p.type === "vendor");
  const allInternal = participants.every((p) => p.type === "internal");

  if (hasExternalClient) return "client";
  if (hasExternalVendor) return "vendor";
  if (allInternal) return "internal";

  // Check title/description for keywords
  const text = `${title} ${description ?? ""}`.toLowerCase();
  
  if (text.includes("interview") || text.includes("candidate")) {
    return "interview";
  }
  if (text.includes("client") || text.includes("customer")) {
    return "client";
  }
  if (text.includes("vendor") || text.includes("supplier")) {
    return "vendor";
  }

  return "other";
}

// In the create meeting procedure:
const meetingType = determineMeetingType(
  input.participants,
  input.title,
  input.description
);
```

---

## Task W3-D7: Notification Integration for Participants (Line 92)

**Current Code:**
```typescript
// TODO: Integrate with notification service
```

**Implementation:**

```typescript
// server/routers/calendarParticipants.ts

import { sendNotification } from "../services/notificationService";

// When adding a participant:
async function addParticipant(
  eventId: number,
  participantData: ParticipantInput,
  ctx: Context
): Promise<void> {
  const userId = getCurrentUserId(ctx);

  // 1. Add participant to event
  await db.insert(calendarParticipants).values({
    eventId,
    userId: participantData.userId,
    email: participantData.email,
    status: "pending",
    addedBy: userId,
    createdAt: new Date(),
  });

  // 2. Get event details for notification
  const event = await db.query.calendarEvents.findFirst({
    where: eq(calendarEvents.id, eventId),
  });

  // 3. Send notification to participant
  if (participantData.userId && event) {
    await sendNotification({
      userId: participantData.userId,
      title: "Calendar Invitation",
      message: `You've been invited to "${event.title}" on ${event.startTime.toLocaleDateString()}`,
      method: "in-app",
      metadata: {
        eventId,
        type: "calendar_invitation",
        startTime: event.startTime.toISOString(),
      },
    });
  }
}
```

---

## Task W3-D8: Payment Method Usage Check (Line 196)

**Current Code:**
```typescript
// TODO: Check if payment method is in use before deletion
```

**Implementation:**

```typescript
// server/paymentMethodsDb.ts

async function canDeletePaymentMethod(paymentMethodId: number): Promise<{
  canDelete: boolean;
  reason?: string;
  usageCount?: number;
}> {
  // Check if payment method is used in any transactions
  const usageCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(payments)
    .where(eq(payments.paymentMethodId, paymentMethodId));

  const count = usageCount[0]?.count ?? 0;

  if (count > 0) {
    return {
      canDelete: false,
      reason: `Payment method is used in ${count} transaction(s)`,
      usageCount: count,
    };
  }

  // Check if it's set as default for any client
  const defaultCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(clients)
    .where(eq(clients.defaultPaymentMethodId, paymentMethodId));

  const defaultUsage = defaultCount[0]?.count ?? 0;

  if (defaultUsage > 0) {
    return {
      canDelete: false,
      reason: `Payment method is set as default for ${defaultUsage} client(s)`,
      usageCount: defaultUsage,
    };
  }

  return { canDelete: true };
}

// In the delete procedure:
async function deletePaymentMethod(
  paymentMethodId: number,
  ctx: Context
): Promise<void> {
  const userId = getCurrentUserId(ctx);

  const { canDelete, reason } = await canDeletePaymentMethod(paymentMethodId);

  if (!canDelete) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: reason ?? "Cannot delete payment method",
    });
  }

  // Soft delete
  await db
    .update(paymentMethods)
    .set({
      deletedAt: new Date(),
      deletedBy: userId,
    })
    .where(eq(paymentMethods.id, paymentMethodId));
}
```

---

## Deliverables Checklist

- [ ] `InboxItem.tsx` - Line 97: Navigation to entity implemented
- [ ] `BatchDetailDrawer.tsx` - Lines 324, 334: Product relation display enabled
- [ ] `BatchDetailDrawer.tsx` - Line 611: Average price calculation
- [ ] `ClientsListPage.tsx` - Line 877: Archive functionality
- [ ] `calendarJobs.ts` - Line 45: Event notification sending
- [ ] `calendarJobs.ts` - Lines 124-127: Cron job scheduling
- [ ] `calendarJobs.ts` - Line 158: Reminder notifications
- [ ] `calendarJobs.ts` - Line 174: Recurring event processing
- [ ] `github.ts` - Line 131: Background job for DO polling
- [ ] `calendarMeetings.ts` - Line 111: Meeting type determination
- [ ] `calendarParticipants.ts` - Line 92: Notification integration
- [ ] `paymentMethodsDb.ts` - Line 196: Usage check before deletion
- [ ] All TODO comments removed from all files

---

## QA Requirements (Before Merge)

```bash
# 1. TypeScript check
pnpm typecheck

# 2. Lint check
pnpm lint

# 3. Verify no TODOs remain
grep -n "TODO" client/src/components/inbox/InboxItem.tsx \
  client/src/components/inventory/BatchDetailDrawer.tsx \
  client/src/pages/ClientsListPage.tsx \
  server/_core/calendarJobs.ts \
  server/webhooks/github.ts \
  server/routers/calendarMeetings.ts \
  server/routers/calendarParticipants.ts \
  server/paymentMethodsDb.ts
# Should return nothing (or only unrelated TODOs)

# 4. Run tests
pnpm test

# 5. Manual testing
# - Click inbox item and verify navigation
# - Open batch drawer and verify product info shows
# - Archive a client and verify it's hidden
# - Add calendar participant and verify notification
```

---

## Do NOT

- ❌ Touch files not in your ownership list
- ❌ Break existing functionality
- ❌ Skip confirmation dialogs for destructive actions
- ❌ Introduce new TODOs
- ❌ Hard-delete records (use soft delete)

---

## Dependencies

Use these Wave 0 utilities:
- `getCurrentUserId(ctx)` from `server/_core/authHelpers.ts`
- `sendNotification()` from `server/services/notificationService.ts`
- `sendReminder()` from `server/services/notificationService.ts`

---

## Success Criteria

Your work is complete when:

- [ ] All 12 TODOs resolved across 8 files
- [ ] Navigation works from inbox items
- [ ] Batch details show product info and avg price
- [ ] Client archiving works with confirmation
- [ ] Calendar jobs process correctly
- [ ] Notifications are sent appropriately
- [ ] Payment method deletion checks usage
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Code merged to main
