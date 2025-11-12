# Calendar System Integration QA Report
**Comprehensive Analysis of TERP Module Integration**

---

## 📋 Document Info

- **Version**: 1.0
- **Date**: 2025-11-10
- **Purpose**: Verify Calendar Evolution Spec v3.0 integrates properly with all TERP modules
- **Scope**: All calendar integration points, data flows, and referential integrity

---

## 🎯 Executive Summary

**Critical Finding**: Calendar Evolution Spec v3.0 is **INCOMPLETE** for production integration. While the metadata system design is solid, **critical integration requirements are missing**:

### ❌ Missing Integration Requirements (12 issues)

1. **Client-Event Relationship** - No explicit client_id field on calendar_events
2. **Client Profile Integration** - No specification for appointment history display
3. **Client Meeting History** - Existing table not integrated with new calendar
4. **Client Activity Tracking** - Calendar events not logged in client_activity
5. **Client Communications** - No link between appointments and communications
6. **Invoice-Event Linking** - Metadata only, no database-level relationship
7. **Payment-Event Linking** - Metadata only, no database-level relationship
8. **Order-Event Linking** - No specification for intake/shopping appointments
9. **Batch-Event Linking** - Photo appointments not linked to production batches
10. **User-Event Relationship** - Attendees table exists but not specified in v3.0
11. **Dashboard Widget** - No specification for calendar widget on homepage
12. **VIP Portal Booking** - No specification for external booking interface

### ✅ What v3.0 Got Right

- JSON metadata storage (performance)
- 3-step wizard UX (usability)
- Field-level permissions (security)
- Type-safe validation (data integrity)

### 🔧 Required Actions

**MUST** update v3.0 to v3.1 with:
1. Explicit client_id field on calendar_events (not just metadata)
2. Integration specifications for all 8 TERP modules
3. Data flow diagrams showing how calendar connects to existing features
4. Migration plan for existing client_meeting_history table
5. API specifications for client profile appointment history
6. Dashboard widget specification
7. VIP portal booking specification

---

## 🗺️ TERP Module Integration Map

### Existing TERP Modules (Analyzed)

1. **Users & Auth** - User management, roles, permissions
2. **Dashboard** - Homepage with customizable widgets
3. **Inventory** - Products, strains, batches, stock management
4. **Clients** - Customer profiles, credit limits, needs tracking
5. **Orders** - Sales orders, invoices, payments
6. **Financials** - AR/AP, transactions, accounting
7. **Production** - Batch tracking, photo management
8. **Calendar** - Events, recurrence, attendees (NEW)

### Calendar Integration Points (Required)

```
┌─────────────────────────────────────────────────────────────────┐
│                      TERP Calendar System                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              calendar_events (core table)                 │  │
│  │  - id, title, start_date, start_time, end_date, end_time │  │
│  │  - event_type, location, status, priority                │  │
│  │  - client_id ← MISSING IN v3.0!                          │  │
│  │  - metadata (JSON)                                        │  │
│  │  - created_by, updated_by                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
         │         │         │         │         │         │
         │         │         │         │         │         │
         ▼         ▼         ▼         ▼         ▼         ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │Clients │ │Orders  │ │Invoices│ │Payments│ │Batches │ │Users   │
    │        │ │        │ │        │ │        │ │        │ │        │
    │Profile │ │Intake  │ │AR      │ │AP      │ │Photos  │ │Shifts  │
    │History │ │Shopping│ │Payment │ │Payment │ │        │ │Vacation│
    └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

---

## 🔍 Detailed Integration Analysis

### 1. Client Module Integration ⚠️ CRITICAL

**Current State**:
- ✅ `clients` table exists with comprehensive client data
- ✅ `clientMeetingHistory` table exists (links to calendar_events)
- ✅ `clientActivity` table exists (tracks all client interactions)
- ✅ `clientCommunications` table exists (tracks communications)
- ❌ v3.0 spec doesn't mention client_id field on calendar_events
- ❌ v3.0 spec doesn't specify how to display appointment history on client profile
- ❌ v3.0 spec doesn't integrate with existing clientMeetingHistory table

**Required Integration**:

#### 1.1 Add client_id Field to calendar_events

**Schema Change**:
```typescript
export const calendarEvents = mysqlTable("calendar_events", {
  // ... existing fields ...
  
  // REQUIRED: Direct client relationship
  clientId: int("client_id")
    .references(() => clients.id, { onDelete: "set null" }),
  
  // ... rest of fields ...
});
```

**Why Direct Field vs. Metadata?**
- ✅ **Database-level referential integrity**: Foreign key constraint
- ✅ **Efficient queries**: Can join on indexed column
- ✅ **Client profile queries**: `SELECT * FROM calendar_events WHERE client_id = ?`
- ✅ **Cascading updates**: If client deleted, events can be handled
- ✅ **Reporting**: Easy to aggregate appointments by client

**Migration Strategy**:
1. Add `client_id` column (nullable initially)
2. Migrate existing metadata `client_id` to column
3. Add foreign key constraint
4. Update all event creation/update APIs to use column

#### 1.2 Client Profile Appointment History

**Requirement**: Client profile page MUST show all appointments for that client.

**UI Specification**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Client Profile: Acme Corp (#TERI-001)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [Overview] [Orders] [Invoices] [Appointments] [Activity] [Notes]│
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Appointments                                                  ││
│ │                                                               ││
│ │ Upcoming (3)                                                  ││
│ │ ┌──────────────────────────────────────────────────────────┐ ││
│ │ │ 📅 Nov 15, 2025 @ 2:00 PM                                │ ││
│ │ │ Customer Payment Drop-off                                │ ││
│ │ │ Expected Amount: $1,500.00                               │ ││
│ │ │ Invoice: #INV-2025-123                                   │ ││
│ │ │ [View Details] [Reschedule] [Cancel]                     │ ││
│ │ └──────────────────────────────────────────────────────────┘ ││
│ │                                                               ││
│ │ Past (12)                                                     ││
│ │ ┌──────────────────────────────────────────────────────────┐ ││
│ │ │ ✅ Nov 8, 2025 @ 10:00 AM - Intake Meeting               │ ││
│ │ │ ✅ Oct 25, 2025 @ 3:00 PM - Shopping Appointment         │ ││
│ │ │ ✅ Oct 10, 2025 @ 11:00 AM - Customer Payment Drop-off   │ ││
│ │ │ [Show More...]                                            │ ││
│ │ └──────────────────────────────────────────────────────────┘ ││
│ │                                                               ││
│ │ [+ Quick Book Appointment]                                    ││
│ └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**API Specification**:
```typescript
// GET /api/trpc/clients.getAppointments
{
  clientId: number;
  filter?: "upcoming" | "past" | "all";
  limit?: number;
  offset?: number;
}

// Response
{
  appointments: Array<{
    id: number;
    title: string;
    eventType: string;
    startDate: string;
    startTime: string;
    location: string;
    status: string;
    metadata: EventMetadata;
    attendees: Array<{ id: number; name: string; type: "user" | "client" }>;
  }>;
  pagination: {
    total: number;
    hasMore: boolean;
  };
}
```

**Component**: `ClientAppointmentHistory.tsx`

#### 1.3 Quick Book from Client Profile

**Requirement**: User should be able to quickly book an appointment from client profile.

**UI Specification**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Quick Book Appointment for Acme Corp                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Event Type: [AR_COLLECTION ▼]                                   │
│                                                                  │
│ Date: [11/15/2025 ▼]  Time: [2:00 PM ▼]                        │
│                                                                  │
│ Expected Amount: [$1,500.00]                                     │
│                                                                  │
│ Related Invoice: [#INV-2025-123 ▼]                              │
│   └─ $1,500.00 due on 11/15/2025                                │
│                                                                  │
│                                                                  │
│         [Cancel]  [Book Appointment]                             │
└─────────────────────────────────────────────────────────────────┘
```

**Features**:
- ✅ Client pre-selected (from profile context)
- ✅ Smart defaults based on event type
- ✅ Context-aware suggestions (e.g., unpaid invoices)
- ✅ Simplified form (only essential fields)

**Component**: `QuickBookAppointmentDialog.tsx`

#### 1.4 Client Meeting History Table Integration

**Current State**: `clientMeetingHistory` table already exists!

**Schema**:
```typescript
export const clientMeetingHistory = mysqlTable(
  "client_meeting_history",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id").notNull(),
    calendarEventId: int("calendar_event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),
    meetingDate: timestamp("meeting_date").notNull(),
    meetingType: varchar("meeting_type", { length: 100 }).notNull(),
    attendees: json("attendees").$type<number[]>(),
    notes: text("notes"),
    outcome: text("outcome"),
    followUpRequired: boolean("follow_up_required").default(false),
    followUpDate: date("follow_up_date"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").onUpdateNow(),
  }
);
```

**Integration Strategy**:
1. **Automatic Creation**: When a meeting-type event is created with a client, automatically create clientMeetingHistory record
2. **Status Sync**: When event status changes to "COMPLETED", update meetingDate
3. **Notes Sync**: Allow adding meeting notes/outcome after completion
4. **Follow-up Tracking**: If follow-up required, create new event automatically

**Trigger Logic**:
```typescript
// In calendar.createEvent
if (eventType === "MEETING" && clientId) {
  await db.insert(clientMeetingHistory).values({
    clientId,
    calendarEventId: newEvent.id,
    meetingDate: startDate,
    meetingType: metadata.meeting_type?.value || "general",
    attendees: attendeeIds,
  });
}

// In calendar.updateEvent (when status changes to COMPLETED)
if (status === "COMPLETED" && event.clientId) {
  await db.update(clientMeetingHistory)
    .set({ meetingDate: new Date() })
    .where(eq(clientMeetingHistory.calendarEventId, eventId));
}
```

#### 1.5 Client Activity Tracking

**Current State**: `clientActivity` table exists to track all client interactions.

**Schema**:
```typescript
export const clientActivity = mysqlTable(
  "client_activity",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityType: mysqlEnum("activity_type", [
      "MEETING",
      "CALL",
      "EMAIL",
      "ORDER",
      "PAYMENT",
      "NOTE",
      "OTHER",
    ]).notNull(),
    description: text("description").notNull(),
    activityDate: timestamp("activity_date").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  }
);
```

**Integration Strategy**:
1. **Event Creation**: Log activity when appointment is booked
2. **Event Completion**: Log activity when appointment is completed
3. **Event Cancellation**: Log activity when appointment is cancelled

**Trigger Logic**:
```typescript
// When event is created
if (clientId) {
  await db.insert(clientActivity).values({
    clientId,
    userId: createdBy,
    activityType: "MEETING",
    description: `Appointment scheduled: ${title}`,
    activityDate: new Date(),
  });
}

// When event is completed
if (status === "COMPLETED" && clientId) {
  await db.insert(clientActivity).values({
    clientId,
    userId: updatedBy,
    activityType: "MEETING",
    description: `Appointment completed: ${title}`,
    activityDate: new Date(),
  });
}
```

---

### 2. Orders Module Integration ⚠️ REQUIRED

**Current State**:
- ✅ `orders` table exists (sales orders)
- ❌ v3.0 spec doesn't link INTAKE/SHOPPING appointments to orders
- ❌ No specification for creating orders from appointments

**Required Integration**:

#### 2.1 Link Appointments to Orders

**Use Cases**:
1. **Intake Appointment** → Create new order
2. **Shopping Appointment** → Link to existing order
3. **Order View** → Show related appointments

**Schema Enhancement**:
```typescript
// Add to orders table
export const orders = mysqlTable("orders", {
  // ... existing fields ...
  
  // NEW: Link to intake/shopping appointment
  intakeEventId: int("intake_event_id")
    .references(() => calendarEvents.id, { onDelete: "set null" }),
  
  // ... rest of fields ...
});
```

**Workflow**:
```
INTAKE Appointment → Complete → [Create Order] button
  ↓
Order created with:
  - client_id from appointment
  - expected_order_value from metadata
  - products_of_interest from metadata
  - intake_event_id = appointment.id
```

**API**:
```typescript
// POST /api/trpc/orders.createFromAppointment
{
  appointmentId: number;
  // Order details pre-populated from appointment metadata
}
```

---

### 3. Invoices/Payments Module Integration ⚠️ REQUIRED

**Current State**:
- ✅ Invoices and payments tables exist
- ⚠️ v3.0 uses metadata for invoice_id/payment_id (not database relationships)
- ❌ No specification for linking AR_COLLECTION/AP_PAYMENT events to actual payments

**Required Integration**:

#### 3.1 AR_COLLECTION → Payment Processing

**Workflow**:
```
AR_COLLECTION Appointment (Expected: $1,500)
  ↓
Customer arrives, drops off payment
  ↓
[Process Payment] button in appointment details
  ↓
Payment record created:
  - amount: $1,500 (from metadata.expected_amount)
  - invoice_id: from metadata.invoice_id
  - payment_date: appointment.startDate
  - payment_method: from metadata.payment_method
  ↓
Appointment metadata updated:
  - payment_id: newly created payment.id
  - status: COMPLETED
  ↓
Client activity logged
```

**API**:
```typescript
// POST /api/trpc/calendar.processPaymentFromAppointment
{
  appointmentId: number;
  actualAmount: number; // May differ from expected
  paymentMethod: string;
  notes?: string;
}

// Response: { paymentId: number }
```

#### 3.2 AP_PAYMENT → Vendor Payment Processing

**Workflow**:
```
AP_PAYMENT Appointment (Amount: $2,300)
  ↓
Vendor arrives to pick up payment
  ↓
[Process Payment] button in appointment details
  ↓
Vendor payment record created:
  - amount: $2,300 (from metadata.amount)
  - vendor_id: from metadata.vendor_id
  - payment_date: appointment.startDate
  - payment_method: from metadata.payment_method
  - check_number: from user input
  ↓
Appointment metadata updated:
  - payment_id: newly created payment.id
  - status: COMPLETED
  ↓
Vendor activity logged (if vendor activity tracking exists)
  ↓
PO/Bill updated (if applicable)
```

**API**:
```typescript
// POST /api/trpc/calendar.processVendorPaymentFromAppointment
{
  appointmentId: number;
  actualAmount: number; // May differ from expected
  paymentMethod: string;
  paymentDate: string; // ISO date
  checkNumber?: string;
  notes?: string;
}

// Response: { paymentId: number }
```

**Key Differences from AR Processing**:
- Uses `vendorId` instead of `clientId`
- Creates `vendorPayments` record instead of `payments`
- May include `checkNumber` field
- Updates `purchaseOrderId` instead of `invoiceId`
- Logs to `vendorActivity` (if exists) instead of `clientActivity`

---

### 4. Production/Batch Module Integration ⚠️ REQUIRED

**Current State**:
- ✅ `batches` table exists (production batches)
- ❌ v3.0 doesn't link PHOTOS appointments to batches
- ❌ No specification for photo session management

**Required Integration**:

#### 4.1 Link PHOTOS Appointments to Batches

**Schema Enhancement**:
```typescript
// Add to batches table
export const batches = mysqlTable("batches", {
  // ... existing fields ...
  
  // NEW: Link to photo session appointments
  photoSessionEventId: int("photo_session_event_id")
    .references(() => calendarEvents.id, { onDelete: "set null" }),
  
  // ... rest of fields ...
});
```

**Workflow**:
```
PHOTOS Appointment scheduled
  ↓
metadata.batch_id = selected batch
  ↓
After photo session completed
  ↓
[Upload Photos] button
  ↓
Photos uploaded and linked to batch
  ↓
Batch.photoSessionEventId = appointment.id
```

---

### 5. User/Shift Management Integration ⚠️ REQUIRED

**Current State**:
- ✅ `users` table exists
- ⚠️ v3.0 mentions SHIFT/VACATION event types but no integration spec
- ❌ No specification for shift scheduling UI
- ❌ No specification for vacation tracking

**Required Integration**:

#### 5.1 Shift Scheduling

**Requirements**:
- View who's on shift at any given time
- Prevent double-booking shifts
- Track shift coverage

**UI**: Calendar view with user filter showing only SHIFT events

#### 5.2 Vacation Tracking

**Requirements**:
- Block out user availability during vacation
- Prevent booking appointments with users on vacation
- Track vacation days used

**Integration**: Check user vacation events before allowing appointment booking

---

### 6. Dashboard Widget Integration ⚠️ MISSING

**Current State**:
- ✅ Dashboard widget system exists (`userDashboardPreferences`)
- ❌ v3.0 doesn't specify calendar widget

**Required Specification**:

#### 6.1 Calendar Day Schedule Widget

**Widget Configuration**:
```typescript
{
  id: "calendar_day_schedule",
  isVisible: true,
  order: 1,
  settings: {
    showEventTypes: ["AR_COLLECTION", "AP_PAYMENT", "MEETING"],
    showLocation: true,
    showMetadata: ["expected_amount", "client_id"],
    defaultView: "today", // or "week"
  }
}
```

**Widget UI**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Today's Schedule (Nov 10, 2025)                    [View Calendar]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 9:00 AM  │ Team Meeting                                         │
│          │ Conference Room A                                    │
│          │                                                       │
│ 2:00 PM  │ Customer Payment Drop-off - Acme Corp               │
│          │ Office • Expected: $1,500.00                         │
│          │ [Process Payment]                                    │
│          │                                                       │
│ 4:00 PM  │ Vendor Payment Pickup - ABC Supplies                │
│          │ Office • Amount: $2,300.00                           │
│          │                                                       │
│ No more events today                                             │
└─────────────────────────────────────────────────────────────────┘
```

**Component**: `CalendarDayScheduleWidget.tsx`

**API**:
```typescript
// GET /api/trpc/calendar.getDaySchedule
{
  date: string; // "2025-11-10"
  userId?: number; // Filter by user
  eventTypes?: string[]; // Filter by event types
}
```

---

### 7. VIP Portal Booking Integration ⚠️ MISSING

**Current State**:
- ❌ v3.0 doesn't specify VIP portal booking interface
- ❌ No specification for external booking flow

**Required Specification**:

#### 7.1 VIP Portal Booking UI

**Requirements**:
- Show available time slots (not full calendar)
- Client can only book certain event types (INTAKE, SHOPPING, MEETING)
- No access to internal events (SHIFT, BLOCKED_TIME, etc.)
- Confirmation email after booking

**UI**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Book an Appointment                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Appointment Type: [Intake Meeting ▼]                            │
│                                                                  │
│ Select Date:                                                     │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Nov 15 (Fri)  │ Nov 18 (Mon)  │ Nov 19 (Tue)  │ Nov 20 (Wed) ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ Available Times on Nov 15:                                       │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ ○ 9:00 AM    ○ 10:00 AM   ○ 11:00 AM                         ││
│ │ ○ 2:00 PM    ○ 3:00 PM    ○ 4:00 PM                          ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ Notes (optional):                                                │
│ [                                                              ] │
│                                                                  │
│                                                                  │
│         [Cancel]  [Book Appointment]                             │
└─────────────────────────────────────────────────────────────────┘
```

**API**:
```typescript
// GET /api/trpc/calendar.getAvailableSlots
{
  eventType: string;
  startDate: string;
  endDate: string;
  duration?: number; // minutes, default from event type settings
}

// Response
{
  slots: Array<{
    date: string;
    time: string;
    available: boolean;
  }>;
}

// POST /api/trpc/calendar.bookAppointmentExternal
{
  clientId: number; // From VIP portal auth
  eventType: string;
  date: string;
  time: string;
  notes?: string;
}
```

**Component**: `VIPPortalBooking.tsx`

---

## 📊 Data Flow Diagrams

### Event Creation Flow with Client Integration

```
User creates AR_COLLECTION event
  ↓
1. calendar_events record created
   - client_id = 123 (Acme Corp)
   - metadata.expected_amount = $1,500
   - metadata.invoice_id = 456
  ↓
2. client_activity record created
   - activityType = "MEETING"
   - description = "Appointment scheduled: Customer Payment Drop-off"
  ↓
3. clientMeetingHistory record created (if MEETING type)
   - clientId = 123
   - calendarEventId = new event id
  ↓
4. calendar_event_attendees records created
   - eventId = new event id
   - attendeeType = "client"
   - attendeeId = 123
  ↓
5. Notification sent (if configured)
```

### Payment Processing Flow from Appointment

```
User opens AR_COLLECTION appointment
  ↓
[Process Payment] button clicked
  ↓
1. Payment record created
   - clientId = from event.clientId
   - invoiceId = from event.metadata.invoice_id
   - amount = from event.metadata.expected_amount
   - paymentDate = event.startDate
  ↓
2. Event metadata updated
   - metadata.payment_id = new payment id
  ↓
3. Event status updated
   - status = "COMPLETED"
  ↓
4. Client activity logged
   - activityType = "PAYMENT"
   - description = "Payment processed: $1,500"
  ↓
5. Invoice updated (if fully paid)
   - status = "PAID"
```

---

## ✅ Integration Checklist

### Database Schema Changes
- [ ] Add `client_id` column to `calendar_events` table
- [ ] Add `intake_event_id` column to `orders` table
- [ ] Add `photo_session_event_id` column to `batches` table
- [ ] Create indexes on new foreign key columns
- [ ] Create migration script with data backfill

### API Endpoints (New)
- [ ] `clients.getAppointments` - Get all appointments for a client
- [ ] `calendar.quickBookForClient` - Quick book from client profile
- [ ] `calendar.processPaymentFromAppointment` - Process payment from AR_COLLECTION
- [ ] `calendar.processVendorPaymentFromAppointment` - Process vendor payment from AP_PAYMENT
- [ ] `calendar.getDaySchedule` - Get day schedule for dashboard widget
- [ ] `calendar.getAvailableSlots` - Get available time slots for VIP portal
- [ ] `calendar.bookAppointmentExternal` - Book appointment from VIP portal
- [ ] `orders.createFromAppointment` - Create order from INTAKE appointment

### API Endpoints (Modified)
- [ ] `calendar.createEvent` - Add client_id parameter, trigger integrations
- [ ] `calendar.updateEvent` - Sync with clientMeetingHistory, clientActivity
- [ ] `calendar.deleteEvent` - Cascade to clientMeetingHistory, clientActivity

### UI Components (New)
- [ ] `ClientAppointmentHistory.tsx` - Appointment history on client profile
- [ ] `QuickBookAppointmentDialog.tsx` - Quick book from client profile
- [ ] `CalendarDayScheduleWidget.tsx` - Dashboard widget
- [ ] `VIPPortalBooking.tsx` - External booking interface
- [ ] `ProcessPaymentDialog.tsx` - Process customer payment from AR_COLLECTION
- [ ] `ProcessVendorPaymentDialog.tsx` - Process vendor payment from AP_PAYMENT
- [ ] `CreateOrderFromAppointmentDialog.tsx` - Create order from intake

### UI Components (Modified)
- [ ] `EventFormDialog.tsx` - Add client selection, integrate with quick book
- [ ] `ClientProfile.tsx` - Add appointments tab
- [ ] `Dashboard.tsx` - Add calendar widget option

### Business Logic
- [ ] Automatic clientActivity logging on event create/update/delete
- [ ] Automatic clientMeetingHistory creation for MEETING events
- [ ] Customer payment processing workflow from AR_COLLECTION events
- [ ] Vendor payment processing workflow from AP_PAYMENT events
- [ ] Order creation workflow from INTAKE events
- [ ] Batch linking workflow from PHOTOS events
- [ ] Shift conflict detection for SHIFT events
- [ ] Vacation blocking for user availability

### Testing
- [ ] Integration tests for client-event relationship
- [ ] Integration tests for customer payment processing flow (AR)
- [ ] Integration tests for vendor payment processing flow (AP)
- [ ] Integration tests for order creation flow
- [ ] E2E tests for client profile appointment history
- [ ] E2E tests for quick book from client profile
- [ ] E2E tests for VIP portal booking
- [ ] E2E tests for dashboard widget
- [ ] E2E tests for process customer payment from appointment
- [ ] E2E tests for process vendor payment from appointment

---

## 🚨 Breaking Changes & Migration Plan

### Breaking Changes
1. **client_id column addition** - Requires migration of existing events
2. **clientMeetingHistory integration** - May have orphaned records

### Migration Plan

#### Step 1: Add client_id Column (Nullable)
```sql
ALTER TABLE calendar_events 
ADD COLUMN client_id INT NULL;

ALTER TABLE calendar_events
ADD CONSTRAINT fk_calendar_events_client
FOREIGN KEY (client_id) REFERENCES clients(id)
ON DELETE SET NULL;

CREATE INDEX idx_calendar_events_client_id 
ON calendar_events(client_id);
```

#### Step 2: Backfill client_id from Metadata
```sql
UPDATE calendar_events
SET client_id = CAST(JSON_EXTRACT(metadata, '$.client_id.referenceId') AS UNSIGNED)
WHERE JSON_EXTRACT(metadata, '$.client_id.referenceId') IS NOT NULL;
```

#### Step 3: Sync clientMeetingHistory
```sql
-- Find orphaned clientMeetingHistory records
SELECT cmh.* 
FROM client_meeting_history cmh
LEFT JOIN calendar_events ce ON cmh.calendar_event_id = ce.id
WHERE ce.id IS NULL;

-- Option 1: Delete orphaned records
DELETE FROM client_meeting_history
WHERE calendar_event_id NOT IN (SELECT id FROM calendar_events);

-- Option 2: Create missing calendar events (if data is valuable)
-- (Complex, requires manual review)
```

#### Step 4: Add Other Foreign Keys
```sql
ALTER TABLE orders
ADD COLUMN intake_event_id INT NULL,
ADD CONSTRAINT fk_orders_intake_event
FOREIGN KEY (intake_event_id) REFERENCES calendar_events(id)
ON DELETE SET NULL;

ALTER TABLE batches
ADD COLUMN photo_session_event_id INT NULL,
ADD CONSTRAINT fk_batches_photo_session
FOREIGN KEY (photo_session_event_id) REFERENCES calendar_events(id)
ON DELETE SET NULL;
```

---

## 📋 Updated v3.1 Requirements

### Must-Have for v3.1
1. ✅ client_id field on calendar_events (database-level relationship)
2. ✅ Client profile appointment history UI and API
3. ✅ Quick book from client profile
4. ✅ Automatic clientActivity logging
5. ✅ Automatic clientMeetingHistory integration
6. ✅ Dashboard calendar widget specification
7. ✅ Payment processing workflow from AR_COLLECTION
8. ✅ Order creation workflow from INTAKE

### Should-Have for v3.1
1. ✅ VIP portal booking specification
2. ✅ Batch linking for PHOTOS events
3. ✅ Shift conflict detection
4. ✅ Vacation blocking

### Nice-to-Have (Future)
1. Email notifications for appointments
2. SMS reminders
3. Calendar sync with external calendars (Google, Outlook)
4. Recurring appointment templates
5. Appointment analytics dashboard

---

## 🎯 Conclusion

**v3.0 Status**: ❌ **INCOMPLETE for Production**

**Required Action**: Update to **v3.1** with:
1. Explicit client_id field (not just metadata)
2. Complete integration specifications for all 8 TERP modules
3. Data flow diagrams
4. Migration plan
5. API specifications for all integration points
6. UI specifications for client profile, dashboard widget, VIP portal

**Estimated Effort for v3.1 Updates**:
- Specification writing: 1 week
- Implementation: 4-6 weeks (in addition to v3.0 timeline)
- **Total**: 10-14 weeks (vs. 6-8 weeks in v3.0)

**Recommendation**: 
1. Review this integration QA report
2. Approve v3.1 scope
3. I'll create Calendar Evolution Spec v3.1 with all integration requirements
4. Begin Phase 1 implementation with v3.1 spec

---

**Document Status**: Complete  
**Next Step**: Create Calendar Evolution Spec v3.1
