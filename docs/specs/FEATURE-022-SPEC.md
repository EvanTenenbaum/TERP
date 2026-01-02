# FEATURE-022: Multi-Role Assignment with Responsibility-Based Notifications

**Version:** 1.0  
**Date:** January 2, 2026  
**Author:** Manus AI Agent  
**Status:** Specification Complete  
**Feature Flag:** `feature-responsibility-notifications`

---

## Executive Summary

This feature enhances the existing RBAC system to support multiple role assignments per user with defined **areas of responsibility**. When actions are needed within a responsibility area (e.g., photography, pick & pack, scheduling, matchmaking), the Notification Center automatically alerts the responsible users.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Database Schema](#3-database-schema)
4. [Responsibility Areas](#4-responsibility-areas)
5. [Notification Triggers](#5-notification-triggers)
6. [API Endpoints](#6-api-endpoints)
7. [Frontend Components](#7-frontend-components)
8. [Integration Points](#8-integration-points)
9. [Implementation Plan](#9-implementation-plan)
10. [Success Criteria](#10-success-criteria)

---

## 1. Problem Statement

### Current Limitations

1. **Single Role Focus:** While RBAC supports multiple roles per user, there's no concept of "responsibility areas" that trigger notifications
2. **Manual Notification:** Staff must manually check for pending work in their areas
3. **No Ownership:** No clear assignment of who is responsible for specific operational areas
4. **Missed Actions:** Important tasks may be delayed because no one is specifically notified

### Business Impact

- Delayed photography means products can't be listed
- Unfulfilled pick & pack requests delay orders
- Unscheduled appointments frustrate clients
- Matchmaking opportunities are missed

---

## 2. Solution Overview

### Core Concepts

| Concept                         | Description                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------- |
| **Responsibility Area**         | A defined operational domain (e.g., Photography, Pick & Pack)                |
| **Responsibility Assignment**   | Links a user to one or more responsibility areas                             |
| **Trigger Event**               | An action or state change that requires attention in a responsibility area   |
| **Responsibility Notification** | An inbox item sent to all users assigned to the relevant responsibility area |

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RESPONSIBILITY-BASED NOTIFICATIONS                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐         │
│  │   TRIGGER    │────▶│ RESPONSIBILITY   │────▶│  NOTIFICATION    │         │
│  │   EVENT      │     │ ROUTER           │     │  CENTER          │         │
│  └──────────────┘     └──────────────────┘     └──────────────────┘         │
│         │                      │                        │                    │
│         │                      │                        │                    │
│  ┌──────▼──────┐      ┌───────▼───────┐       ┌───────▼───────┐             │
│  │ New batch   │      │ Find users    │       │ Create inbox  │             │
│  │ needs photo │      │ with PHOTO    │       │ items for     │             │
│  │             │      │ responsibility│       │ each user     │             │
│  └─────────────┘      └───────────────┘       └───────────────┘             │
│                                                                              │
│  ┌─────────────┐      ┌───────────────┐       ┌───────────────┐             │
│  │ Order ready │      │ Find users    │       │ Badge count   │             │
│  │ for pick    │      │ with PICK_PACK│       │ updates       │             │
│  │             │      │ responsibility│       │               │             │
│  └─────────────┘      └───────────────┘       └───────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### 3.1 New Tables

#### responsibility_areas

Defines the available responsibility areas in the system.

```typescript
export const responsibilityAreas = mysqlTable("responsibility_areas", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(), // e.g., "PHOTOGRAPHY"
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Photography"
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // Lucide icon name
  color: varchar("color", { length: 20 }), // Tailwind color class
  module: varchar("module", { length: 50 }), // Related module
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
```

#### user_responsibilities

Links users to their assigned responsibility areas.

```typescript
export const userResponsibilities = mysqlTable(
  "user_responsibilities",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    responsibilityId: int("responsibility_id")
      .notNull()
      .references(() => responsibilityAreas.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false), // Primary contact
    notifyEmail: boolean("notify_email").notNull().default(true),
    notifyInApp: boolean("notify_in_app").notNull().default(true),
    notifyPush: boolean("notify_push").notNull().default(false),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    assignedBy: int("assigned_by").references(() => users.id),
  },
  table => ({
    userResponsibilityIdx: uniqueIndex("idx_user_responsibility").on(
      table.userId,
      table.responsibilityId
    ),
  })
);
```

#### responsibility_triggers

Defines what events trigger notifications for each responsibility area.

```typescript
export const responsibilityTriggers = mysqlTable("responsibility_triggers", {
  id: int("id").autoincrement().primaryKey(),
  responsibilityId: int("responsibility_id")
    .notNull()
    .references(() => responsibilityAreas.id, { onDelete: "cascade" }),
  triggerKey: varchar("trigger_key", { length: 100 }).notNull(), // e.g., "batch.needs_photo"
  triggerName: varchar("trigger_name", { length: 200 }).notNull(),
  triggerDescription: text("trigger_description"),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // e.g., "batch", "order"
  isActive: boolean("is_active").notNull().default(true),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"])
    .notNull()
    .default("normal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 3.2 Modify Existing Tables

#### inbox_items (add columns)

```typescript
// Add to existing inbox_items table
responsibilityId: int("responsibility_id")
  .references(() => responsibilityAreas.id),
triggerId: int("trigger_id")
  .references(() => responsibilityTriggers.id),
priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"])
  .notNull()
  .default("normal"),
```

---

## 4. Responsibility Areas

### 4.1 Predefined Responsibility Areas

| Key                | Name               | Description                                 | Module     | Icon           |
| ------------------ | ------------------ | ------------------------------------------- | ---------- | -------------- |
| `PHOTOGRAPHY`      | Photography        | Product photography and image management    | inventory  | Camera         |
| `PICK_PACK`        | Pick & Pack        | Order fulfillment and packaging             | orders     | Package        |
| `SCHEDULING`       | Scheduling         | Appointment and calendar management         | calendar   | Calendar       |
| `MATCHMAKING`      | Matchmaking        | Client-product matching and recommendations | sales      | Users          |
| `INTAKE`           | Product Intake     | Receiving and processing new inventory      | inventory  | PackagePlus    |
| `QUALITY_CONTROL`  | Quality Control    | Product quality inspection                  | inventory  | CheckCircle    |
| `SHIPPING`         | Shipping           | Order shipping and logistics                | orders     | Truck          |
| `RETURNS`          | Returns Processing | Handling returns and refunds                | orders     | RotateCcw      |
| `CLIENT_SUPPORT`   | Client Support     | Client inquiries and support                | clients    | HeadphonesIcon |
| `VENDOR_RELATIONS` | Vendor Relations   | Vendor communication and management         | vendors    | Building       |
| `ACCOUNTING`       | Accounting         | Financial tasks and reconciliation          | accounting | Calculator     |
| `COMPLIANCE`       | Compliance         | Regulatory compliance tasks                 | admin      | Shield         |

### 4.2 Seed Data

```typescript
const RESPONSIBILITY_AREAS = [
  {
    key: "PHOTOGRAPHY",
    name: "Photography",
    description:
      "Responsible for product photography, image editing, and photo management",
    icon: "Camera",
    color: "purple",
    module: "inventory",
    sortOrder: 1,
  },
  {
    key: "PICK_PACK",
    name: "Pick & Pack",
    description:
      "Responsible for picking orders, packing products, and preparing shipments",
    icon: "Package",
    color: "blue",
    module: "orders",
    sortOrder: 2,
  },
  {
    key: "SCHEDULING",
    name: "Scheduling",
    description:
      "Responsible for managing appointments, calendar events, and scheduling",
    icon: "Calendar",
    color: "green",
    module: "calendar",
    sortOrder: 3,
  },
  {
    key: "MATCHMAKING",
    name: "Matchmaking",
    description:
      "Responsible for matching clients with products and making recommendations",
    icon: "Users",
    color: "pink",
    module: "sales",
    sortOrder: 4,
  },
  // ... additional areas
];
```

---

## 5. Notification Triggers

### 5.1 Photography Triggers

| Trigger Key                | Event                                | Priority |
| -------------------------- | ------------------------------------ | -------- |
| `batch.needs_photo`        | New batch created without photos     | Normal   |
| `batch.photo_requested`    | Photo explicitly requested for batch | High     |
| `batch.photo_expired`      | Batch photos older than 30 days      | Low      |
| `product.needs_hero_image` | Product missing hero image           | Normal   |

### 5.2 Pick & Pack Triggers

| Trigger Key            | Event                                    | Priority |
| ---------------------- | ---------------------------------------- | -------- |
| `order.ready_for_pick` | Order status changed to "Ready for Pick" | High     |
| `order.pick_overdue`   | Order not picked within SLA              | Urgent   |
| `order.pack_requested` | Order picked, ready for packing          | Normal   |
| `order.rush_pick`      | Rush order needs immediate pick          | Urgent   |

### 5.3 Scheduling Triggers

| Trigger Key                     | Event                          | Priority |
| ------------------------------- | ------------------------------ | -------- |
| `appointment.requested`         | Client requested appointment   | High     |
| `appointment.reschedule_needed` | Appointment needs rescheduling | Normal   |
| `appointment.reminder_24h`      | Appointment in 24 hours        | Normal   |
| `calendar.conflict_detected`    | Calendar conflict detected     | High     |

### 5.4 Matchmaking Triggers

| Trigger Key                   | Event                                          | Priority |
| ----------------------------- | ---------------------------------------------- | -------- |
| `client.needs_match`          | Client expressed interest, needs product match | Normal   |
| `inventory.new_arrival`       | New inventory matches client preferences       | Normal   |
| `client.reorder_due`          | Client due for reorder based on history        | Low      |
| `live_shopping.match_request` | Live shopping match request                    | High     |

### 5.5 Additional Triggers

| Area             | Trigger Key              | Event                                 | Priority |
| ---------------- | ------------------------ | ------------------------------------- | -------- |
| Intake           | `po.received`            | Purchase order received, needs intake | High     |
| QC               | `batch.needs_inspection` | Batch requires quality inspection     | Normal   |
| Shipping         | `order.ready_for_ship`   | Order packed, ready for shipping      | Normal   |
| Returns          | `return.received`        | Return received, needs processing     | Normal   |
| Client Support   | `client.inquiry`         | Client submitted inquiry              | Normal   |
| Vendor Relations | `vendor.payment_due`     | Vendor payment coming due             | Normal   |
| Accounting       | `invoice.overdue`        | Invoice past due date                 | High     |
| Compliance       | `license.expiring`       | License expiring soon                 | Urgent   |

---

## 6. API Endpoints

### 6.1 Responsibility Management Router

```typescript
// server/routers/responsibilities.ts

export const responsibilitiesRouter = router({
  // ========== RESPONSIBILITY AREAS ==========

  // List all responsibility areas
  list: publicProcedure.query(async ({ ctx }) => {
    return await responsibilitiesDb.listAreas();
  }),

  // Get responsibility area by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await responsibilitiesDb.getAreaById(input.id);
    }),

  // Create responsibility area (admin only)
  create: protectedProcedure
    .input(createResponsibilityAreaSchema)
    .mutation(async ({ input, ctx }) => {
      return await responsibilitiesDb.createArea(input);
    }),

  // Update responsibility area (admin only)
  update: protectedProcedure
    .input(updateResponsibilityAreaSchema)
    .mutation(async ({ input, ctx }) => {
      return await responsibilitiesDb.updateArea(input.id, input);
    }),

  // ========== USER ASSIGNMENTS ==========

  // Get users assigned to a responsibility area
  getUsersByArea: publicProcedure
    .input(z.object({ responsibilityId: z.number() }))
    .query(async ({ input }) => {
      return await responsibilitiesDb.getUsersByArea(input.responsibilityId);
    }),

  // Get responsibilities assigned to a user
  getByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return await responsibilitiesDb.getByUser(input.userId);
    }),

  // Assign responsibility to user
  assignToUser: protectedProcedure
    .input(assignResponsibilitySchema)
    .mutation(async ({ input, ctx }) => {
      return await responsibilitiesDb.assignToUser({
        ...input,
        assignedBy: ctx.user.id,
      });
    }),

  // Remove responsibility from user
  removeFromUser: protectedProcedure
    .input(z.object({ userId: z.number(), responsibilityId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await responsibilitiesDb.removeFromUser(
        input.userId,
        input.responsibilityId
      );
    }),

  // Update user notification preferences for a responsibility
  updateNotificationPrefs: protectedProcedure
    .input(updateNotificationPrefsSchema)
    .mutation(async ({ input, ctx }) => {
      return await responsibilitiesDb.updateNotificationPrefs(input);
    }),

  // ========== TRIGGERS ==========

  // List triggers for a responsibility area
  listTriggers: publicProcedure
    .input(z.object({ responsibilityId: z.number() }))
    .query(async ({ input }) => {
      return await responsibilitiesDb.listTriggers(input.responsibilityId);
    }),

  // Toggle trigger active status
  toggleTrigger: protectedProcedure
    .input(z.object({ triggerId: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      return await responsibilitiesDb.toggleTrigger(
        input.triggerId,
        input.isActive
      );
    }),
});
```

### 6.2 Notification Service Extension

```typescript
// server/services/responsibilityNotificationService.ts

export interface ResponsibilityNotification {
  triggerKey: string;
  entityType: string;
  entityId: number;
  title: string;
  description: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send notification to all users with a specific responsibility
 */
export async function notifyResponsibility(
  notification: ResponsibilityNotification
): Promise<void> {
  // 1. Find the trigger configuration
  const trigger = await responsibilitiesDb.getTriggerByKey(
    notification.triggerKey
  );
  if (!trigger || !trigger.isActive) {
    logger.debug(
      { triggerKey: notification.triggerKey },
      "Trigger not active, skipping"
    );
    return;
  }

  // 2. Get all users assigned to this responsibility area
  const users = await responsibilitiesDb.getUsersByArea(
    trigger.responsibilityId
  );
  if (users.length === 0) {
    logger.warn(
      { responsibilityId: trigger.responsibilityId },
      "No users assigned to responsibility"
    );
    return;
  }

  // 3. Create inbox items for each user based on their notification preferences
  const inboxItems = users
    .filter(u => u.notifyInApp)
    .map(user => ({
      userId: user.userId,
      sourceType: "responsibility_alert" as const,
      sourceId: trigger.id,
      referenceType: notification.entityType,
      referenceId: notification.entityId,
      title: notification.title,
      description: notification.description,
      responsibilityId: trigger.responsibilityId,
      triggerId: trigger.id,
      priority: trigger.priority,
      status: "unread" as const,
    }));

  await inboxDb.createMany(inboxItems);

  // 4. Send email notifications to users who opted in
  const emailUsers = users.filter(u => u.notifyEmail);
  if (emailUsers.length > 0) {
    await sendBulkEmail(
      emailUsers.map(u => u.email),
      {
        subject: `[${trigger.responsibilityName}] ${notification.title}`,
        body: notification.description,
        actionUrl: notification.actionUrl,
      }
    );
  }

  // 5. Send push notifications to users who opted in
  const pushUsers = users.filter(u => u.notifyPush);
  if (pushUsers.length > 0) {
    await sendBulkPush(
      pushUsers.map(u => u.userId),
      {
        title: notification.title,
        body: notification.description,
      }
    );
  }

  logger.info(
    {
      triggerKey: notification.triggerKey,
      usersNotified: users.length,
      inAppCount: inboxItems.length,
      emailCount: emailUsers.length,
      pushCount: pushUsers.length,
    },
    "Responsibility notification sent"
  );
}

/**
 * Helper functions for common triggers
 */
export const ResponsibilityTriggers = {
  // Photography
  batchNeedsPhoto: (batchId: number, batchName: string) =>
    notifyResponsibility({
      triggerKey: "batch.needs_photo",
      entityType: "batch",
      entityId: batchId,
      title: "New Batch Needs Photography",
      description: `Batch "${batchName}" has been created and needs product photos.`,
      actionUrl: `/inventory/batches/${batchId}`,
    }),

  // Pick & Pack
  orderReadyForPick: (orderId: number, clientName: string) =>
    notifyResponsibility({
      triggerKey: "order.ready_for_pick",
      entityType: "order",
      entityId: orderId,
      title: "Order Ready for Pick",
      description: `Order #${orderId} for ${clientName} is ready to be picked.`,
      actionUrl: `/orders/${orderId}`,
    }),

  // Scheduling
  appointmentRequested: (
    appointmentId: number,
    clientName: string,
    requestedDate: string
  ) =>
    notifyResponsibility({
      triggerKey: "appointment.requested",
      entityType: "appointment",
      entityId: appointmentId,
      title: "Appointment Request",
      description: `${clientName} has requested an appointment for ${requestedDate}.`,
      actionUrl: `/calendar/appointments/${appointmentId}`,
    }),

  // Matchmaking
  clientNeedsMatch: (
    clientId: number,
    clientName: string,
    preferences: string
  ) =>
    notifyResponsibility({
      triggerKey: "client.needs_match",
      entityType: "client",
      entityId: clientId,
      title: "Client Needs Product Match",
      description: `${clientName} is looking for: ${preferences}`,
      actionUrl: `/clients/${clientId}`,
    }),
};
```

---

## 7. Frontend Components

### 7.1 User Responsibility Assignment

```typescript
// client/src/components/settings/UserResponsibilities.tsx

interface UserResponsibilitiesProps {
  userId: number;
}

export function UserResponsibilities({ userId }: UserResponsibilitiesProps) {
  const { data: areas } = trpc.responsibilities.list.useQuery();
  const { data: userResponsibilities } = trpc.responsibilities.getByUser.useQuery({ userId });
  const assignMutation = trpc.responsibilities.assignToUser.useMutation();
  const removeMutation = trpc.responsibilities.removeFromUser.useMutation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Responsibility Areas
        </CardTitle>
        <CardDescription>
          Assign areas of responsibility to receive relevant notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {areas?.map(area => {
            const isAssigned = userResponsibilities?.some(r => r.responsibilityId === area.id);
            const assignment = userResponsibilities?.find(r => r.responsibilityId === area.id);

            return (
              <div key={area.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", `bg-${area.color}-100`)}>
                    <DynamicIcon name={area.icon} className={`h-5 w-5 text-${area.color}-600`} />
                  </div>
                  <div>
                    <p className="font-medium">{area.name}</p>
                    <p className="text-sm text-muted-foreground">{area.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAssigned && (
                    <NotificationPrefsPopover
                      assignment={assignment}
                      onUpdate={updateNotificationPrefs}
                    />
                  )}
                  <Switch
                    checked={isAssigned}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        assignMutation.mutate({ userId, responsibilityId: area.id });
                      } else {
                        removeMutation.mutate({ userId, responsibilityId: area.id });
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 7.2 Responsibility Badge in Inbox

```typescript
// client/src/components/inbox/ResponsibilityBadge.tsx

interface ResponsibilityBadgeProps {
  responsibilityId: number;
  priority: "low" | "normal" | "high" | "urgent";
}

const PRIORITY_STYLES = {
  low: "bg-gray-100 text-gray-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700 animate-pulse",
};

export function ResponsibilityBadge({ responsibilityId, priority }: ResponsibilityBadgeProps) {
  const { data: area } = trpc.responsibilities.getById.useQuery({ id: responsibilityId });

  if (!area) return null;

  return (
    <Badge className={cn("flex items-center gap-1", PRIORITY_STYLES[priority])}>
      <DynamicIcon name={area.icon} className="h-3 w-3" />
      {area.name}
    </Badge>
  );
}
```

### 7.3 Admin Responsibility Management Page

```typescript
// client/src/pages/settings/ResponsibilityManagement.tsx

export default function ResponsibilityManagementPage() {
  const { data: areas } = trpc.responsibilities.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Responsibility Areas</h1>
          <p className="text-muted-foreground">
            Manage responsibility areas and their notification triggers
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Area
        </Button>
      </div>

      <div className="grid gap-4">
        {areas?.map(area => (
          <ResponsibilityAreaCard
            key={area.id}
            area={area}
            onEdit={() => openEditDialog(area)}
            onManageTriggers={() => openTriggersDialog(area)}
            onViewAssignments={() => openAssignmentsDialog(area)}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 8. Integration Points

### 8.1 Batch Creation (Photography Trigger)

```typescript
// In server/routers/batches.ts - create mutation

.mutation(async ({ input, ctx }) => {
  const batch = await batchesDb.create(input);

  // Trigger photography notification if batch has no photos
  if (!input.photos || input.photos.length === 0) {
    await ResponsibilityTriggers.batchNeedsPhoto(batch.id, batch.name);
  }

  return batch;
});
```

### 8.2 Order Status Change (Pick & Pack Trigger)

```typescript
// In server/routers/orders.ts - updateStatus mutation

.mutation(async ({ input, ctx }) => {
  const order = await ordersDb.updateStatus(input.orderId, input.status);

  // Trigger pick & pack notification when order is ready
  if (input.status === "READY_FOR_PICK") {
    const client = await clientsDb.getById(order.clientId);
    await ResponsibilityTriggers.orderReadyForPick(order.id, client.name);
  }

  return order;
});
```

### 8.3 Appointment Request (Scheduling Trigger)

```typescript
// In server/routers/calendar.ts - requestAppointment mutation

.mutation(async ({ input, ctx }) => {
  const appointment = await calendarDb.createAppointmentRequest(input);

  // Trigger scheduling notification
  const client = await clientsDb.getById(input.clientId);
  await ResponsibilityTriggers.appointmentRequested(
    appointment.id,
    client.name,
    format(input.requestedDate, "PPP")
  );

  return appointment;
});
```

### 8.4 Live Shopping Match Request (Matchmaking Trigger)

```typescript
// In server/routers/liveShopping.ts - requestMatch mutation

.mutation(async ({ input, ctx }) => {
  const request = await liveShoppingDb.createMatchRequest(input);

  // Trigger matchmaking notification
  const client = await clientsDb.getById(input.clientId);
  await ResponsibilityTriggers.clientNeedsMatch(
    client.id,
    client.name,
    input.preferences
  );

  return request;
});
```

---

## 9. Implementation Plan

### Phase 1: Database & Core Service (16h)

| Task                        | Hours | Description                                                                     |
| --------------------------- | ----- | ------------------------------------------------------------------------------- |
| Create schema migration     | 4h    | Add responsibility_areas, user_responsibilities, responsibility_triggers tables |
| Modify inbox_items table    | 2h    | Add responsibilityId, triggerId, priority columns                               |
| Create responsibilitiesDb   | 4h    | Database operations layer                                                       |
| Create notification service | 4h    | responsibilityNotificationService.ts                                            |
| Seed predefined areas       | 2h    | Seed 12 responsibility areas and triggers                                       |

### Phase 2: API Layer (12h)

| Task                           | Hours | Description                              |
| ------------------------------ | ----- | ---------------------------------------- |
| Create responsibilities router | 6h    | CRUD endpoints for areas and assignments |
| Extend inbox router            | 2h    | Filter by responsibility, priority       |
| Add trigger integration        | 4h    | Integrate triggers into existing routers |

### Phase 3: Frontend (20h)

| Task                              | Hours | Description                                |
| --------------------------------- | ----- | ------------------------------------------ |
| User responsibility assignment UI | 6h    | Settings page component                    |
| Admin management page             | 6h    | Full CRUD for responsibility areas         |
| Inbox enhancements                | 4h    | Responsibility badges, priority indicators |
| Notification preferences          | 4h    | Per-responsibility notification settings   |

### Phase 4: Integration & Testing (12h)

| Task               | Hours | Description                                  |
| ------------------ | ----- | -------------------------------------------- |
| Integrate triggers | 6h    | Add triggers to batch, order, calendar, etc. |
| Write tests        | 4h    | Unit and integration tests                   |
| Documentation      | 2h    | Update API docs and user guide               |

### Total Effort: 60 hours

---

## 10. Success Criteria

### Functional Requirements

- [ ] Users can be assigned to multiple responsibility areas
- [ ] Each responsibility area has configurable notification triggers
- [ ] Inbox items show responsibility area and priority
- [ ] Users can configure notification preferences per responsibility
- [ ] Admins can create/edit responsibility areas and triggers
- [ ] All predefined triggers fire correctly

### Performance Requirements

- [ ] Notification delivery < 2 seconds from trigger
- [ ] Inbox query with responsibility filter < 100ms
- [ ] Bulk notification to 50+ users < 5 seconds

### User Experience Requirements

- [ ] Clear visual distinction between responsibility types in inbox
- [ ] Priority indicators (urgent items pulse/highlight)
- [ ] One-click navigation to relevant entity from notification
- [ ] Easy toggle for notification preferences

---

## Appendix A: Migration Script

```sql
-- 0023_add_responsibility_areas.sql

-- Create responsibility_areas table
CREATE TABLE responsibility_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  module VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Create user_responsibilities table
CREATE TABLE user_responsibilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  responsibility_id INT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  notify_email BOOLEAN NOT NULL DEFAULT TRUE,
  notify_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  notify_push BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  assigned_by INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (responsibility_id) REFERENCES responsibility_areas(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  UNIQUE INDEX idx_user_responsibility (user_id, responsibility_id)
);

-- Create responsibility_triggers table
CREATE TABLE responsibility_triggers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  responsibility_id INT NOT NULL,
  trigger_key VARCHAR(100) NOT NULL,
  trigger_name VARCHAR(200) NOT NULL,
  trigger_description TEXT,
  entity_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (responsibility_id) REFERENCES responsibility_areas(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_trigger_key (trigger_key)
);

-- Modify inbox_items table
ALTER TABLE inbox_items
  ADD COLUMN responsibility_id INT REFERENCES responsibility_areas(id),
  ADD COLUMN trigger_id INT REFERENCES responsibility_triggers(id),
  ADD COLUMN priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  MODIFY COLUMN source_type ENUM('mention', 'task_assignment', 'task_update', 'responsibility_alert') NOT NULL;

-- Add indexes
CREATE INDEX idx_inbox_responsibility ON inbox_items(responsibility_id);
CREATE INDEX idx_inbox_priority ON inbox_items(priority);
```

---

## Appendix B: Feature Flag Integration

**Flag Key:** `feature-responsibility-notifications`  
**Parent Module:** None (system-wide)  
**Default:** Disabled (gradual rollout)

```typescript
// Add to seedFeatureFlags.ts
{
  key: "feature-responsibility-notifications",
  name: "Responsibility-Based Notifications",
  description: "Enable responsibility area assignments and automatic notifications",
  module: null,
  systemEnabled: true,
  defaultEnabled: false,
},
```

---

**End of Specification**
