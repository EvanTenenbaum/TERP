# QA-044: Event Invitation Workflow - Database Schema Design

**Version:** 1.0  
**Date:** 2025-11-14  
**Status:** Design Phase

---

## Overview

This document defines the database schema for the Event Invitation Workflow feature. The design builds upon the existing `calendarEventParticipants` table to add a formal invitation layer with auto-accept functionality and admin controls.

---

## Design Philosophy

The invitation system is designed as a **workflow layer** on top of the existing participant system:

1. **Invitation** = The act of inviting someone (can be pending, sent, accepted, declined)
2. **Participant** = Someone who is actually participating in the event (created after invitation is accepted)

This separation allows us to:

- Track invitation history even if declined
- Support auto-accept functionality
- Provide admin override capabilities
- Send bulk invitations with different settings per invitee

---

## New Tables

### 1. `calendar_event_invitations`

Primary table for managing event invitations.

```typescript
export const calendarEventInvitations = mysqlTable(
  "calendar_event_invitations",
  {
    id: int("id").autoincrement().primaryKey(),

    // Event reference
    eventId: int("event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),

    // Invitee information
    inviteeType: mysqlEnum("invitee_type", [
      "USER",
      "CLIENT",
      "EXTERNAL",
    ]).notNull(),
    userId: int("user_id").references(() => users.id, { onDelete: "cascade" }),
    clientId: int("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }),
    externalEmail: varchar("external_email", { length: 320 }),
    externalName: varchar("external_name", { length: 255 }),

    // Invitation details
    role: mysqlEnum("role", ["ORGANIZER", "REQUIRED", "OPTIONAL", "OBSERVER"])
      .default("REQUIRED")
      .notNull(),
    message: text("message"), // Custom invitation message

    // Status tracking
    status: mysqlEnum("status", [
      "DRAFT", // Created but not sent
      "PENDING", // Sent, awaiting response
      "ACCEPTED", // Invitee accepted
      "DECLINED", // Invitee declined
      "AUTO_ACCEPTED", // Automatically accepted
      "CANCELLED", // Invitation cancelled by organizer
      "EXPIRED", // Invitation expired
    ])
      .default("DRAFT")
      .notNull(),

    // Auto-accept functionality
    autoAccept: boolean("auto_accept").default(false).notNull(),
    autoAcceptReason: varchar("auto_accept_reason", { length: 255 }), // e.g., "User setting", "Admin override"

    // Admin controls
    adminOverride: boolean("admin_override").default(false).notNull(),
    overriddenBy: int("overridden_by").references(() => users.id),
    overrideReason: text("override_reason"),
    overriddenAt: timestamp("overridden_at"),

    // Timestamps
    sentAt: timestamp("sent_at"),
    respondedAt: timestamp("responded_at"),
    expiresAt: timestamp("expires_at"), // Optional expiration for invitations

    // Metadata
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),

    // Link to participant record (created after acceptance)
    participantId: int("participant_id").references(
      () => calendarEventParticipants.id,
      { onDelete: "set null" }
    ),
  },
  table => ({
    // Indexes for performance
    eventIdx: index("idx_invitation_event").on(table.eventId),
    userIdx: index("idx_invitation_user").on(table.userId),
    clientIdx: index("idx_invitation_client").on(table.clientId),
    statusIdx: index("idx_invitation_status").on(table.status),
    createdByIdx: index("idx_invitation_created_by").on(table.createdBy),

    // Unique constraint: one invitation per invitee per event
    uniqueInvitation: unique("idx_unique_invitation").on(
      table.eventId,
      table.inviteeType,
      table.userId,
      table.clientId,
      table.externalEmail
    ),
  })
);
```

### 2. `calendar_invitation_settings`

User-level settings for auto-accepting invitations.

```typescript
export const calendarInvitationSettings = mysqlTable(
  "calendar_invitation_settings",
  {
    id: int("id").autoincrement().primaryKey(),

    userId: int("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),

    // Auto-accept rules
    autoAcceptAll: boolean("auto_accept_all").default(false).notNull(),
    autoAcceptFromOrganizers: json("auto_accept_from_organizers").$type<
      number[]
    >(), // Array of user IDs
    autoAcceptByEventType: json("auto_accept_by_event_type").$type<string[]>(), // Array of event types
    autoAcceptByModule: json("auto_accept_by_module").$type<string[]>(), // Array of modules

    // Notification preferences
    notifyOnInvitation: boolean("notify_on_invitation").default(true).notNull(),
    notifyOnAutoAccept: boolean("notify_on_auto_accept")
      .default(true)
      .notNull(),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  }
);
```

### 3. `calendar_invitation_history`

Audit trail for invitation actions.

```typescript
export const calendarInvitationHistory = mysqlTable(
  "calendar_invitation_history",
  {
    id: int("id").autoincrement().primaryKey(),

    invitationId: int("invitation_id")
      .notNull()
      .references(() => calendarEventInvitations.id, { onDelete: "cascade" }),

    action: mysqlEnum("action", [
      "CREATED",
      "SENT",
      "ACCEPTED",
      "DECLINED",
      "AUTO_ACCEPTED",
      "CANCELLED",
      "EXPIRED",
      "ADMIN_OVERRIDE",
      "RESENT",
    ]).notNull(),

    performedBy: int("performed_by").references(() => users.id),
    performedAt: timestamp("performed_at").defaultNow().notNull(),

    notes: text("notes"),
    metadata: json("metadata"), // Additional context
  },
  table => ({
    invitationIdx: index("idx_history_invitation").on(table.invitationId),
    performedByIdx: index("idx_history_performed_by").on(table.performedBy),
  })
);
```

---

## Data Flow

### Invitation Workflow

1. **Create Invitation (Draft)**
   - Organizer creates invitation(s) for an event
   - Status: `DRAFT`
   - Check user's auto-accept settings
   - If auto-accept applies, set `autoAccept = true`

2. **Send Invitation**
   - Status changes: `DRAFT` → `PENDING` or `AUTO_ACCEPTED`
   - If `autoAccept = true`:
     - Status: `AUTO_ACCEPTED`
     - Automatically create participant record
     - Link invitation to participant via `participantId`
   - If `autoAccept = false`:
     - Status: `PENDING`
     - Send notification to invitee
   - Record in history

3. **Respond to Invitation**
   - Invitee accepts or declines
   - Status changes: `PENDING` → `ACCEPTED` or `DECLINED`
   - If accepted:
     - Create participant record
     - Link invitation to participant
   - Record in history

4. **Admin Override**
   - Admin can force accept/decline any invitation
   - Set `adminOverride = true`
   - Record override reason and admin user
   - Update status accordingly
   - Record in history

---

## Auto-Accept Logic

Auto-accept is determined by checking (in order):

1. **Admin Override**: If `adminOverride = true`, use admin's decision
2. **User Settings**: Check `calendarInvitationSettings` for the invitee:
   - If `autoAcceptAll = true` → auto-accept
   - If organizer in `autoAcceptFromOrganizers` → auto-accept
   - If event type in `autoAcceptByEventType` → auto-accept
   - If module in `autoAcceptByModule` → auto-accept
3. **Default**: No auto-accept, status = `PENDING`

---

## Integration with Existing System

### Relationship to `calendarEventParticipants`

- **Before QA-044**: Participants were added directly to events
- **After QA-044**:
  - Invitations are sent first (tracked in `calendar_event_invitations`)
  - Participants are created only after invitation is accepted
  - Direct participant addition still supported (for backwards compatibility)

### Migration Strategy

- Existing participants remain unchanged
- New workflow uses invitation → participant flow
- Both systems coexist seamlessly

---

## API Endpoints (Preview)

The following tRPC procedures will be implemented:

### Invitation Management

- `createInvitation` - Create a draft invitation
- `sendInvitation` - Send invitation(s) to invitees
- `bulkSendInvitations` - Send multiple invitations at once
- `respondToInvitation` - Accept or decline an invitation
- `cancelInvitation` - Cancel a pending invitation
- `resendInvitation` - Resend an invitation

### Settings Management

- `getInvitationSettings` - Get user's auto-accept settings
- `updateInvitationSettings` - Update auto-accept preferences

### Admin Controls

- `adminOverrideInvitation` - Force accept/decline with reason
- `getInvitationHistory` - View invitation audit trail

### Queries

- `getInvitationsByEvent` - List all invitations for an event
- `getInvitationsByUser` - List all invitations for a user
- `getPendingInvitations` - Get user's pending invitations

---

## Security Considerations

1. **Permission Checks**: Only event organizers and admins can send invitations
2. **Privacy**: External email addresses are stored securely
3. **Audit Trail**: All actions logged in history table
4. **Admin Override**: Requires admin role and reason
5. **Expiration**: Optional expiration prevents stale invitations

---

## Next Steps

1. ✅ Schema design complete
2. ⏭️ Create migration file
3. ⏭️ Update schema.ts with new tables
4. ⏭️ Write tests (TDD)
5. ⏭️ Implement backend procedures
6. ⏭️ Create frontend UI components
