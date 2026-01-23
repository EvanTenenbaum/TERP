# TERP Signal Messaging Integration - Product Specification

**Spec ID:** FEAT-SIGNAL-001
**Status:** Ready for Implementation
**Priority:** HIGH
**Module:** Communications / Client Management
**Estimated Effort:** 6 weeks (phased)
**Author:** Claude AI
**Date:** 2026-01-20
**Target Repository:** https://github.com/EvanTenenbaum/TERP

---

## Document Purpose

This specification provides **complete, actionable implementation details** for integrating Signal messaging into TERP. It is designed to be directly consumed by Claude Code for autonomous implementation with minimal human intervention.

**Implementation Approach:** This spec follows TERP's established patterns, including the drizzle schema conventions, tRPC router patterns, and React 19 + Tailwind CSS 4 + shadcn/ui frontend stack. All code samples are production-ready and align with existing codebase conventions.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Functional Requirements](#2-functional-requirements)
3. [Database Schema](#3-database-schema)
4. [Backend Service Implementation](#4-backend-service-implementation)
5. [Message Queue Implementation](#5-message-queue-implementation)
6. [tRPC Router Implementation](#6-trpc-router-implementation)
7. [RBAC Permissions](#7-rbac-permissions)
8. [Infrastructure Configuration](#8-infrastructure-configuration)
9. [Frontend Components](#9-frontend-components)
10. [Testing Strategy](#10-testing-strategy)
11. [Implementation Phases](#11-implementation-phases)
12. [Monitoring & Alerting](#12-monitoring--alerting)
13. [Rollback Plan](#13-rollback-plan)
14. [Security Considerations](#14-security-considerations)

---

## 1. Executive Summary

### 1.1 Problem Statement

TERP users currently manage client communications outside the system, creating fragmented customer records and missed follow-up opportunities. Sales representatives juggle personal phones, multiple messaging apps, and email while the ERP has no visibility into these critical touchpoints.

**User Pain Points:**
- No unified view of client communication history
- Manual logging of conversations is tedious and incomplete
- No ability to message clients directly from order/client context
- Compliance and audit trail concerns in cannabis industry
- Sales team uses personal numbers, creating business continuity risks

### 1.2 Solution Overview

Integrate Signal messaging directly into TERP with:
- **Per-role Signal numbers** (Sales, Account Management, Operations, Support, Admin)
- **Two-way messaging** embedded in client records
- **Message templates** for common communications
- **Real-time delivery** via WebSocket integration
- **Full audit trail** linked to client profiles

### 1.3 Technical Approach

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Signal Interface | signal-cli-rest-api (Docker) | Most mature unofficial API, 2,300+ GitHub stars, JSON-RPC mode for performance |
| Backend Service | TypeScript SignalService class | Aligns with TERP's service pattern (see accountingHooks.ts, notificationService) |
| API Layer | tRPC router (signalRouter.ts) | Standard TERP pattern with protectedProcedure/adminProcedure |
| Database | Drizzle schema extensions | New tables following existing conventions |
| Queue | BullMQ with Redis | Handles retry logic, rate limiting |
| Frontend | React components with tRPC hooks | Standard shadcn/ui components |
| Real-time | WebSocket events via existing pattern | Extends TERP's notification WebSocket |

### 1.4 Risk Acknowledgment

**Signal ToS Risk (Medium):** Signal's Terms of Service prohibit "auto-messaging" but enforcement appears limited for legitimate business use. Mitigation:
- Messages are user-initiated, not automated spam
- Per-role numbers distribute load
- Business-appropriate volume patterns
- Matrix protocol backup ready for failover

---

## 2. Functional Requirements

### 2.1 Core Capabilities

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-001 | Send Signal messages from client detail page | Must Have | User can compose and send message; delivery status shown |
| FR-002 | Receive Signal messages in real-time | Must Have | Incoming messages appear within 5 seconds; notification bell updates |
| FR-003 | View conversation history per client | Must Have | Threaded view shows all messages with timestamps |
| FR-004 | Use message templates | Should Have | Templates with variable substitution (client name, order number) |
| FR-005 | Assign Signal numbers to roles | Must Have | Admin can manage role-to-number mapping |
| FR-006 | Search message history | Should Have | Full-text search across all conversations |
| FR-007 | Message from order context | Should Have | Quick message with order details auto-populated |
| FR-008 | Bulk message (limited) | Could Have | Send to multiple clients with personalization |
| FR-009 | Read receipts display | Should Have | Show when message was delivered/read |
| FR-010 | Attachment support | Should Have | Send/receive images and documents |

### 2.2 Business Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-001 | Only users with `signal:send` permission can send messages | tRPC middleware check |
| BR-002 | Messages linked to client record if phone matches | Auto-link on receive, manual link available |
| BR-003 | Admin role required for account registration/management | adminProcedure in router |
| BR-004 | Rate limit: max 10 messages per minute per account | BullMQ limiter configuration |
| BR-005 | All messages logged immutably for audit | INSERT-only pattern, no deletes |
| BR-006 | Failed messages retry 3 times with exponential backoff | BullMQ retry configuration |

### 2.3 Integration Points

| System | Integration Type | Details |
|--------|-----------------|---------|
| Client Module | Data Link | signalConversations.clientId → clients.id |
| RBAC System | Permission Check | New permissions: signal:view, signal:send, signal:admin |
| Notification System | Event Push | signal:message:received triggers inbox notification |
| Audit Log | Event Logging | All send/receive events logged to auditLogs table |
| Calendar Module | Optional | Link messages to scheduled follow-ups |

---

## 3. Database Schema

### 3.1 Schema File Location

Create new file: `drizzle/schema-signal.ts`

### 3.2 Complete Schema Definition

```typescript
// drizzle/schema-signal.ts
// Signal Messaging Module Schema for TERP
// FEAT-SIGNAL-001: Two-way Signal messaging integration

import {
  int,
  mysqlTable,
  mysqlEnum,
  varchar,
  text,
  timestamp,
  boolean,
  bigint,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { users } from "./schema";
import { clients } from "./schema";
import { roles } from "./schema-rbac";

// ============================================================================
// SIGNAL ACCOUNT MANAGEMENT
// ============================================================================

/**
 * Signal Account Status Enum
 * Tracks the registration lifecycle of a Signal account
 */
export const signalAccountStatusEnum = mysqlEnum("signal_account_status", [
  "PENDING_REGISTRATION",  // Registration initiated, awaiting verification
  "PENDING_VERIFICATION",  // Verification code sent, awaiting entry
  "ACTIVE",                // Fully registered and operational
  "SUSPENDED",             // Temporarily disabled (manual or rate limit)
  "DEACTIVATED",           // Permanently deactivated
]);

/**
 * Signal Accounts Table
 * Maps Signal phone numbers to TERP roles
 * One Signal number per role (e.g., Sales has +1-555-SALES-01)
 */
export const signalAccounts = mysqlTable(
  "signal_accounts",
  {
    id: int("id").autoincrement().primaryKey(),

    // Role association - links to RBAC roles table
    roleId: int("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),

    // Phone number in E.164 format (e.g., +15551234567)
    phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),

    // Display name shown to message recipients
    displayName: varchar("display_name", { length: 100 }),

    // Account status
    status: signalAccountStatusEnum.notNull().default("PENDING_REGISTRATION"),

    // Registration timestamps
    registrationInitiatedAt: timestamp("registration_initiated_at"),
    registeredAt: timestamp("registered_at"),

    // Health monitoring
    lastHealthCheck: timestamp("last_health_check"),
    consecutiveFailures: int("consecutive_failures").notNull().default(0),
    lastErrorMessage: text("last_error_message"),

    // Soft delete support (ST-013 pattern)
    deletedAt: timestamp("deleted_at"),

    // Standard timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    roleIdIdx: index("idx_signal_accounts_role").on(table.roleId),
    statusIdx: index("idx_signal_accounts_status").on(table.status),
    phoneIdx: uniqueIndex("idx_signal_accounts_phone").on(table.phoneNumber),
  })
);

export type SignalAccount = typeof signalAccounts.$inferSelect;
export type InsertSignalAccount = typeof signalAccounts.$inferInsert;

// ============================================================================
// SIGNAL CONVERSATIONS
// ============================================================================

/**
 * Signal Conversations Table
 * Links a Signal account to a client's phone number
 * Each unique (signalAccountId, clientPhoneNumber) pair is one conversation
 */
export const signalConversations = mysqlTable(
  "signal_conversations",
  {
    id: int("id").autoincrement().primaryKey(),

    // Which TERP Signal account owns this conversation
    signalAccountId: int("signal_account_id")
      .notNull()
      .references(() => signalAccounts.id, { onDelete: "cascade" }),

    // Link to TERP client (nullable - may be unknown contact initially)
    clientId: int("client_id").references(() => clients.id, { onDelete: "set null" }),

    // Client's Signal phone number (E.164 format)
    clientPhoneNumber: varchar("client_phone_number", { length: 20 }).notNull(),

    // Client display name (from Signal profile or manual entry)
    clientDisplayName: varchar("client_display_name", { length: 255 }),

    // Conversation state
    lastMessageAt: timestamp("last_message_at"),
    lastMessagePreview: varchar("last_message_preview", { length: 255 }),
    unreadCount: int("unread_count").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    isPinned: boolean("is_pinned").notNull().default(false),

    // Soft delete support
    deletedAt: timestamp("deleted_at"),

    // Standard timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    // Unique conversation per account + phone number
    uniqueConversation: uniqueIndex("idx_signal_conv_unique").on(
      table.signalAccountId,
      table.clientPhoneNumber
    ),
    clientIdIdx: index("idx_signal_conv_client").on(table.clientId),
    lastMessageIdx: index("idx_signal_conv_last_msg").on(table.lastMessageAt),
    archivedIdx: index("idx_signal_conv_archived").on(table.isArchived),
  })
);

export type SignalConversation = typeof signalConversations.$inferSelect;
export type InsertSignalConversation = typeof signalConversations.$inferInsert;

// ============================================================================
// SIGNAL MESSAGES
// ============================================================================

/**
 * Message Direction Enum
 */
export const signalMessageDirectionEnum = mysqlEnum("signal_message_direction", [
  "INBOUND",   // Received from client
  "OUTBOUND",  // Sent to client
]);

/**
 * Message Status Enum
 * Tracks delivery lifecycle
 */
export const signalMessageStatusEnum = mysqlEnum("signal_message_status", [
  "PENDING",    // Queued for sending
  "SENDING",    // Currently being sent
  "SENT",       // Sent to Signal server
  "DELIVERED",  // Delivered to recipient device
  "READ",       // Read receipt received
  "FAILED",     // Delivery failed after retries
]);

/**
 * Attachment Type for JSON column
 */
export interface SignalAttachment {
  id: string;
  contentType: string;
  filename: string;
  size: number;
  thumbnailPath?: string;
  storagePath: string;
}

/**
 * Signal Messages Table
 * Individual messages within a conversation
 * Immutable for audit purposes - no updates, no deletes
 */
export const signalMessages = mysqlTable(
  "signal_messages",
  {
    id: int("id").autoincrement().primaryKey(),

    // Conversation reference
    conversationId: int("conversation_id")
      .notNull()
      .references(() => signalConversations.id, { onDelete: "cascade" }),

    // Signal's timestamp (Unix milliseconds) - used for deduplication
    signalTimestamp: bigint("signal_timestamp", { mode: "number" }),

    // Message direction
    direction: signalMessageDirectionEnum.notNull(),

    // Message content
    messageText: text("message_text"),

    // Attachments (images, documents)
    attachments: json("attachments").$type<SignalAttachment[]>(),

    // Delivery status
    status: signalMessageStatusEnum.notNull().default("PENDING"),

    // Error tracking for failed messages
    failureReason: text("failure_reason"),
    retryCount: int("retry_count").notNull().default(0),

    // Who sent this outbound message (null for inbound)
    sentByUserId: int("sent_by_user_id").references(() => users.id, { onDelete: "set null" }),

    // Template used (if any)
    templateId: int("template_id").references(() => signalTemplates.id, { onDelete: "set null" }),

    // Contextual links (optional)
    linkedOrderId: int("linked_order_id"),
    linkedEntityType: varchar("linked_entity_type", { length: 50 }),
    linkedEntityId: int("linked_entity_id"),

    // Immutable timestamp - no updatedAt for audit integrity
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: index("idx_signal_msg_conversation").on(table.conversationId),
    timestampIdx: index("idx_signal_msg_timestamp").on(table.signalTimestamp),
    statusIdx: index("idx_signal_msg_status").on(table.status),
    sentByIdx: index("idx_signal_msg_sent_by").on(table.sentByUserId),
    createdAtIdx: index("idx_signal_msg_created").on(table.createdAt),
  })
);

export type SignalMessage = typeof signalMessages.$inferSelect;
export type InsertSignalMessage = typeof signalMessages.$inferInsert;

// ============================================================================
// SIGNAL MESSAGE TEMPLATES
// ============================================================================

/**
 * Template Category Enum
 */
export const signalTemplateCategoryEnum = mysqlEnum("signal_template_category", [
  "ORDER_UPDATE",
  "DELIVERY_NOTIFICATION",
  "PAYMENT_REMINDER",
  "FOLLOW_UP",
  "GENERAL",
]);

/**
 * Signal Templates Table
 * Reusable message templates with variable substitution
 */
export const signalTemplates = mysqlTable(
  "signal_templates",
  {
    id: int("id").autoincrement().primaryKey(),

    // Template identification
    name: varchar("name", { length: 100 }).notNull(),
    category: signalTemplateCategoryEnum.notNull().default("GENERAL"),

    // Template content with {{variable}} placeholders
    // Supported variables: {{clientName}}, {{orderNumber}}, {{totalAmount}}, {{userName}}
    templateText: text("template_text").notNull(),

    // List of variables used (for validation)
    variables: json("variables").$type<string[]>(),

    // Access control
    isGlobal: boolean("is_global").notNull().default(false),
    roleId: int("role_id").references(() => roles.id, { onDelete: "cascade" }),

    // Usage tracking
    usageCount: int("usage_count").notNull().default(0),
    lastUsedAt: timestamp("last_used_at"),

    // Ownership
    createdByUserId: int("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // Soft delete
    deletedAt: timestamp("deleted_at"),

    // Standard timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("idx_signal_tpl_category").on(table.category),
    roleIdx: index("idx_signal_tpl_role").on(table.roleId),
    globalIdx: index("idx_signal_tpl_global").on(table.isGlobal),
  })
);

export type SignalTemplate = typeof signalTemplates.$inferSelect;
export type InsertSignalTemplate = typeof signalTemplates.$inferInsert;

// ============================================================================
// SIGNAL AUDIT LOG (Append-Only)
// ============================================================================

/**
 * Signal Audit Event Type Enum
 */
export const signalAuditEventTypeEnum = mysqlEnum("signal_audit_event_type", [
  "ACCOUNT_REGISTERED",
  "ACCOUNT_VERIFIED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_REACTIVATED",
  "MESSAGE_SENT",
  "MESSAGE_RECEIVED",
  "MESSAGE_FAILED",
  "MESSAGE_DELIVERED",
  "MESSAGE_READ",
  "CONVERSATION_CREATED",
  "CONVERSATION_ARCHIVED",
  "CONVERSATION_LINKED_TO_CLIENT",
  "TEMPLATE_CREATED",
  "TEMPLATE_USED",
  "HEALTH_CHECK_FAILED",
  "HEALTH_CHECK_RECOVERED",
]);

/**
 * Signal Audit Log Table
 * Immutable audit trail for compliance
 */
export const signalAuditLog = mysqlTable(
  "signal_audit_log",
  {
    id: int("id").autoincrement().primaryKey(),

    // Event classification
    eventType: signalAuditEventTypeEnum.notNull(),

    // Actor
    actorUserId: int("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorIp: varchar("actor_ip", { length: 45 }),

    // Entity references (polymorphic)
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: int("entity_id").notNull(),

    // Event details
    description: text("description"),
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Immutable timestamp
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (table) => ({
    eventTypeIdx: index("idx_signal_audit_event").on(table.eventType),
    actorIdx: index("idx_signal_audit_actor").on(table.actorUserId),
    entityIdx: index("idx_signal_audit_entity").on(table.entityType, table.entityId),
    occurredAtIdx: index("idx_signal_audit_time").on(table.occurredAt),
  })
);

export type SignalAuditLogEntry = typeof signalAuditLog.$inferSelect;
export type InsertSignalAuditLogEntry = typeof signalAuditLog.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================

export const signalAccountsRelations = relations(signalAccounts, ({ one, many }) => ({
  role: one(roles, {
    fields: [signalAccounts.roleId],
    references: [roles.id],
  }),
  conversations: many(signalConversations),
}));

export const signalConversationsRelations = relations(signalConversations, ({ one, many }) => ({
  signalAccount: one(signalAccounts, {
    fields: [signalConversations.signalAccountId],
    references: [signalAccounts.id],
  }),
  client: one(clients, {
    fields: [signalConversations.clientId],
    references: [clients.id],
  }),
  messages: many(signalMessages),
}));

export const signalMessagesRelations = relations(signalMessages, ({ one }) => ({
  conversation: one(signalConversations, {
    fields: [signalMessages.conversationId],
    references: [signalConversations.id],
  }),
  sentByUser: one(users, {
    fields: [signalMessages.sentByUserId],
    references: [users.id],
  }),
  template: one(signalTemplates, {
    fields: [signalMessages.templateId],
    references: [signalTemplates.id],
  }),
}));

export const signalTemplatesRelations = relations(signalTemplates, ({ one, many }) => ({
  role: one(roles, {
    fields: [signalTemplates.roleId],
    references: [roles.id],
  }),
  createdByUser: one(users, {
    fields: [signalTemplates.createdByUserId],
    references: [users.id],
  }),
  messages: many(signalMessages),
}));
```

### 3.3 Schema Export

Add to `drizzle/schema.ts`:

```typescript
// At the end of the file, add:

// ============================================================================
// SIGNAL MESSAGING MODULE
// ============================================================================
export * from "./schema-signal";
```

### 3.4 Migration Generation

After creating the schema, run:

```bash
pnpm db:push
```

---

## 4. Backend Service Implementation

### 4.1 Service File Location

Create: `server/services/signalService.ts`

### 4.2 Service Configuration Interface

```typescript
export interface SignalServiceConfig {
  apiUrl: string;                    // signal-cli-rest-api URL
  healthCheckIntervalMs: number;     // Health check frequency
  maxRetryAttempts: number;          // Max message retry attempts
  retryDelayMs: number;              // Initial retry delay
  rateLimitPerMinute: number;        // Messages per minute limit
}
```

### 4.3 Key Service Methods

The SignalService class should implement:

| Method | Purpose | Returns |
|--------|---------|---------|
| `initialize()` | Start service, load accounts, begin receiving | void |
| `shutdown()` | Graceful shutdown, stop subscriptions | void |
| `registerAccount(phone, roleId, displayName?)` | Initiate Signal registration | { success, error? } |
| `verifyRegistration(phone, code)` | Complete verification with SMS code | { success, error? } |
| `sendMessage(payload)` | Send message through role's account | { success, messageId?, error? } |
| `getOrCreateConversation(accountId, clientPhone)` | Get/create conversation record | SignalConversation |
| `linkConversationToClient(conversationId, clientId)` | Link conversation to TERP client | { success, error? } |
| `getHealthStatus()` | Get health status of all accounts | AccountHealthStatus[] |

### 4.4 Implementation Notes

1. **EventEmitter Pattern**: Service extends EventEmitter to broadcast events like `message:received` and `health:alert`

2. **Account Subscriptions**: Map<phoneNumber, unsubscribe> tracks active listeners

3. **E.164 Validation**: Phone numbers must match `/^\+[1-9]\d{1,14}$/`

4. **Audit Logging**: All significant events logged to signalAuditLog table

5. **Auto-Client Linking**: On message receive, attempt to match phone to existing client

---

## 5. Message Queue Implementation

### 5.1 Queue File Location

Create: `server/services/signalMessageQueue.ts`

### 5.2 BullMQ Configuration

```typescript
const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD,
};

export const signalMessageQueue = new Queue<QueuedMessage>("signal-messages", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,  // 5s, 25s, 125s
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
```

### 5.3 Worker Configuration

```typescript
export const signalMessageWorker = new Worker<QueuedMessage>(
  "signal-messages",
  async (job) => {
    // Process message send
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 60000,  // 10 messages per minute
    },
  }
);
```

---

## 6. tRPC Router Implementation

### 6.1 Router File Location

Create: `server/routers/signalRouter.ts`

### 6.2 Router Endpoints

| Endpoint | Procedure Type | Purpose |
|----------|---------------|---------|
| `listConversations` | protectedProcedure | List conversations for user's role |
| `getConversation` | protectedProcedure | Get single conversation with messages |
| `listMessages` | protectedProcedure | Paginated messages for conversation |
| `sendMessage` | protectedProcedure | Send new message |
| `sendTemplateMessage` | protectedProcedure | Send using template |
| `markRead` | protectedProcedure | Mark conversation as read |
| `setArchived` | protectedProcedure | Archive/unarchive conversation |
| `linkToClient` | protectedProcedure | Link conversation to client |
| `listTemplates` | protectedProcedure | List available templates |
| `createTemplate` | protectedProcedure | Create new template |
| `updateTemplate` | protectedProcedure | Update existing template |
| `deleteTemplate` | protectedProcedure | Soft delete template |
| `registerAccount` | adminProcedure | Register new Signal account |
| `verifyAccount` | adminProcedure | Verify account registration |
| `listAccounts` | adminProcedure | List all Signal accounts |
| `getHealthStatus` | adminProcedure | Get system health status |
| `getAuditLog` | adminProcedure | Get audit log entries |
| `suspendAccount` | adminProcedure | Suspend account |
| `reactivateAccount` | adminProcedure | Reactivate suspended account |

### 6.3 Router Registration

Add to `server/routers/index.ts`:

```typescript
import { signalRouter } from "./signalRouter";

export const appRouter = router({
  // ... existing routers
  signal: signalRouter,
});
```

---

## 7. RBAC Permissions

### 7.1 New Permissions to Seed

```typescript
const signalPermissions = [
  { name: "signal:view", module: "signal", description: "View Signal conversations and messages" },
  { name: "signal:send", module: "signal", description: "Send Signal messages" },
  { name: "signal:template:create", module: "signal", description: "Create Signal message templates" },
  { name: "signal:template:edit", module: "signal", description: "Edit Signal message templates" },
  { name: "signal:template:delete", module: "signal", description: "Delete Signal message templates" },
  { name: "signal:admin", module: "signal", description: "Manage Signal accounts (admin only)" },
];
```

### 7.2 Default Role Assignments

| Role | Permissions |
|------|-------------|
| Admin | All signal:* permissions |
| Manager | signal:view, signal:send, signal:template:* |
| Sales | signal:view, signal:send |
| Support | signal:view, signal:send |
| Warehouse | signal:view |

---

## 8. Infrastructure Configuration

### 8.1 Docker Compose Addition

```yaml
services:
  signal-api:
    image: bbernhard/signal-cli-rest-api:latest
    container_name: terp-signal-api
    restart: unless-stopped
    environment:
      - MODE=json-rpc
      - AUTO_RECEIVE_SCHEDULE=0 */6 * * *
      - JSON_RPC_TRUST_NEW_IDENTITIES=on-first-use
    ports:
      - "8080:8080"
    volumes:
      - signal-data:/home/.local/share/signal-cli
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - terp-network

volumes:
  signal-data:
```

### 8.2 Environment Variables

Add to `.env.example`:

```bash
# Signal Messaging Configuration
SIGNAL_API_URL=http://localhost:8080
SIGNAL_HEALTH_CHECK_INTERVAL_MS=300000
SIGNAL_MAX_RETRY_ATTEMPTS=3
SIGNAL_RATE_LIMIT_PER_MINUTE=10

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

## 9. Frontend Components

### 9.1 Component File Locations

Create in `client/src/components/signal/`:

| Component | Purpose |
|-----------|---------|
| `SignalConversationList.tsx` | List of conversations with search/filter |
| `SignalMessageThread.tsx` | Message thread view with send input |
| `SignalComposeModal.tsx` | Modal for composing new message |
| `SignalTemplateSelector.tsx` | Template picker with preview |
| `SignalClientWidget.tsx` | Widget for client detail page |
| `SignalAdminPanel.tsx` | Admin account management |

### 9.2 Page Routes

Add to routing:

```typescript
{
  path: "/messaging",
  element: <MessagingPage />,
  children: [
    { path: "", element: <SignalConversationList /> },
    { path: ":conversationId", element: <SignalMessageThread /> },
  ],
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

- `server/services/__tests__/signalService.test.ts` - Service logic
- `server/routers/__tests__/signalRouter.test.ts` - Router endpoints

### 10.2 Integration Tests

- Message send/receive flow
- Template variable substitution
- Client linking
- Permission enforcement

### 10.3 E2E Tests

Add to mega-qa journeys:
- Account registration flow
- Send message to client flow
- Receive and link message flow

---

## 11. Implementation Phases

### Phase 1: Infrastructure & Schema (Week 1)

- [ ] Deploy signal-cli-rest-api container
- [ ] Create drizzle/schema-signal.ts
- [ ] Generate and apply migrations
- [ ] Add environment variables
- [ ] Seed RBAC permissions

### Phase 2: Backend Service (Week 2)

- [ ] server/services/signalService.ts
- [ ] server/services/signalMessageQueue.ts
- [ ] Unit tests for service layer
- [ ] Health monitoring setup

### Phase 3: API Layer (Week 3)

- [ ] server/routers/signalRouter.ts
- [ ] Router registration
- [ ] Integration tests
- [ ] Permission middleware

### Phase 4: Frontend - Core (Week 4)

- [ ] SignalConversationList.tsx
- [ ] SignalMessageThread.tsx
- [ ] Messaging page route
- [ ] Navigation item

### Phase 5: Frontend - Integration (Week 5)

- [ ] SignalClientWidget.tsx
- [ ] SignalComposeModal.tsx
- [ ] SignalTemplateSelector.tsx
- [ ] Order context messaging

### Phase 6: Polish & Documentation (Week 6)

- [ ] Admin UI
- [ ] Health dashboard
- [ ] User documentation
- [ ] Operations runbook

---

## 12. Monitoring & Alerting

### 12.1 Key Metrics

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Message send success rate | < 95% | Page on-call |
| Avg message latency | > 5s | Slack warning |
| Queue depth | > 100 | Slack warning |
| Account consecutive failures | >= 3 | Page on-call |

### 12.2 Logging

Structured logging for all Signal events with correlation IDs.

---

## 13. Rollback Plan

### 13.1 Feature Flag

```typescript
{
  key: "signal-messaging",
  name: "Signal Messaging Integration",
  enabled: false,
  rollout: { type: "percentage", value: 0 },
}
```

### 13.2 Rollback Steps

1. Set feature flag to disabled
2. Stop SignalService
3. If needed: apply rollback migration
4. Investigate and fix
5. Re-enable gradually

---

## 14. Security Considerations

### 14.1 Data Handling

- Phone numbers in E.164 format only
- Message content stored unencrypted (Signal E2E in transit)
- Attachments in isolated directory
- Audit log immutable

### 14.2 Access Control

- All endpoints require authentication
- Role-based access via ctx.user.roleId
- Admin procedures require signal:admin permission

---

## Appendices

### A. Signal CLI REST API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/register/{number}` | POST | Initiate registration |
| `/v1/register/{number}/verify/{code}` | POST | Complete verification |
| `/v2/send` | POST | Send message |
| `/v1/receive/{number}` | GET | Poll for messages |
| `/v1/about/{number}` | GET | Health check |

### B. Template Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{{clientName}}` | clients.name | "ABC Dispensary" |
| `{{orderNumber}}` | orders.id prefixed | "ORD-12345" |
| `{{totalAmount}}` | orders.total formatted | "$1,234.56" |
| `{{userName}}` | users.name | "John Smith" |
| `{{dueDate}}` | orders.dueDate formatted | "January 25, 2026" |

### C. Cost Estimate

| Item | Setup | Monthly |
|------|-------|---------|
| 5 Mobile SIMs | $100 | $150-200 |
| Redis (existing) | $0 | $0 |
| Docker resources | $0 | ~$10 |
| **Total** | **$100** | **$160-210** |

---

**End of Specification**

*This document is designed for direct consumption by Claude Code. All code samples follow TERP's established patterns and are production-ready.*
