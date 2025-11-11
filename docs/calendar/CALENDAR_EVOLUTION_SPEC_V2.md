# Calendar Evolution Feature Specification v2.0
**TERP ERP System - Calendar Module Enhancement**

---

## 📋 Executive Summary

This specification outlines the evolution of the TERP Calendar system based on user requirements. The approach **maximizes reuse** of existing infrastructure (70% of features), **minimizes new builds** (only 4 new tables), and **eliminates duplication** through strategic schema extensions and UI enhancements.

**Key Metrics**:
- **Reuse**: 70% of features leverage existing infrastructure
- **New Tables**: 4 (small, focused, no duplication)
- **Schema Changes**: Minimal (2 fields + 1 enum extension)
- **UI-Only Features**: 4 (no database changes)

**NEW in v2.0**: 🎯 **Custom Metadata Fields & Notes System** - Flexible business data capture for all event types

---

## 🎯 Feature Categories

### Category A: Dashboard Integration
### Category B: Event Type System Enhancement
### Category C: Attendee & Client Integration
### Category D: Booking & Availability
### Category E: UI Enhancements
### **Category F: Custom Metadata & Notes System** ⭐ NEW

---

## 📦 Category A: Dashboard Integration

### A1. Calendar Day Schedule Widget
**Priority**: HIGH  
**Type**: ✅ EVOLVE (reuse existing dashboard widget system)

**Description**: Add calendar widget to homepage dashboard showing today's schedule with customizable filters.

**Current Infrastructure**:
- Dashboard widget system exists (`userDashboardPreferences` table)
- Widget config stored as JSON (`WidgetConfig[]`)

**Implementation**:
1. Create `CalendarDayWidget.tsx` component
2. Add to dashboard widget registry
3. Widget settings:
   - Event type filters (multi-select)
   - Location filter
   - Time range (e.g., "Next 8 hours", "Full day")
4. Click widget → navigate to full calendar

**Database Changes**: ❌ NONE (reuses `userDashboardPreferences`)

**Estimated Effort**: Small (1-2 days)

---

## 📦 Category B: Event Type System Enhancement

### B1. Extend Event Types
**Priority**: HIGH  
**Type**: 🔧 EXTEND (add to existing enum)

**Description**: Add new event types to support external and internal business operations.

**New Event Types**:
| Type | Category | Use Case |
|------|----------|----------|
| `SHOPPING` | External | Client shopping appointments |
| `AR_COLLECTION` | External | Customer payment drop-off |
| `AP_PAYMENT` | External | Vendor payment pickup |
| `BLOCKED_TIME` | Internal | Do not book placeholder |
| `SHIFT` | Internal | Employee shift scheduling |
| `VACATION` | Internal | Employee time off |

**Migration Required**:
```sql
ALTER TABLE calendar_events 
MODIFY COLUMN event_type ENUM(
  'MEETING', 'DEADLINE', 'TASK', 'DELIVERY', 'PAYMENT_DUE', 
  'FOLLOW_UP', 'AUDIT', 'INTAKE', 'PHOTOGRAPHY', 
  'BATCH_EXPIRATION', 'RECURRING_ORDER', 'SAMPLE_REQUEST', 
  'OTHER',
  'SHOPPING', 'AR_COLLECTION', 'AP_PAYMENT', 
  'BLOCKED_TIME', 'SHIFT', 'VACATION', 'TRAINING'
);
```

**Estimated Effort**: Small (migration + UI updates)

---

### B2. Event Type Configuration
**Priority**: HIGH  
**Type**: 🆕 NEW TABLE

**Description**: Allow customization of default duration, buffers, and free/busy status per event type.

**New Schema**:
```typescript
export const calendarEventTypeSettings = mysqlTable(
  "calendar_event_type_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").references(() => users.id), // null = global default
    eventType: varchar("event_type", { length: 50 }).notNull(),
    
    // Duration
    defaultDurationMinutes: int("default_duration_minutes").default(60),
    
    // Buffers
    bufferBeforeMinutes: int("buffer_before_minutes").default(0),
    bufferAfterMinutes: int("buffer_after_minutes").default(0),
    
    // Availability
    showAsBusy: boolean("show_as_busy").default(true),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userEventTypeIdx: unique("user_event_type_idx").on(
      table.userId,
      table.eventType
    ),
  })
);
```

**Features**:
- Global defaults (userId = null)
- Per-user overrides
- Default duration per event type
- Auto-buffer before/after appointments
- Free/busy status per type

**UI Components**:
- Settings page: "Calendar Event Type Configuration"
- Table showing all event types with editable settings
- "Reset to Default" button per row

**Estimated Effort**: Medium (2-3 days)

---

### B3. External vs Internal Classification
**Priority**: MEDIUM  
**Type**: 🔧 EXTEND (add single field)

**Description**: Distinguish between external (client-facing) and internal (team-only) events.

**Migration Required**:
```sql
ALTER TABLE calendar_events 
ADD COLUMN is_external BOOLEAN DEFAULT FALSE NOT NULL;
```

**Usage**:
- Filter calendar by external/internal events
- Different UI styling for external events
- Booking system only creates external events

**Estimated Effort**: Small (migration + UI filters)

---

## 📦 Category C: Attendee & Client Integration

### C1. Multi-Attendee Support
**Priority**: HIGH  
**Type**: 🆕 NEW TABLE

**Description**: Support multiple users and clients as attendees for calendar events.

**New Schema**:
```typescript
export const calendarEventAttendees = mysqlTable(
  "calendar_event_attendees",
  {
    id: int("id").autoincrement().primaryKey(),
    calendarEventId: int("calendar_event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),
    
    // Polymorphic attendee (USER or CLIENT)
    attendeeType: mysqlEnum("attendee_type", ["USER", "CLIENT"]).notNull(),
    userId: int("user_id").references(() => users.id, { onDelete: "cascade" }),
    clientId: int("client_id").references(() => clients.id, { onDelete: "cascade" }),
    
    // Response tracking
    responseStatus: mysqlEnum("response_status", [
      "PENDING",
      "ACCEPTED",
      "DECLINED",
      "TENTATIVE"
    ]).default("PENDING"),
    
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    eventIdIdx: index("event_id_idx").on(table.calendarEventId),
    userIdIdx: index("user_id_idx").on(table.userId),
    clientIdIdx: index("client_id_idx").on(table.clientId),
  })
);
```

**Features**:
- Add multiple users as attendees
- Add multiple clients as attendees
- Track response status (pending/accepted/declined)
- Keep `assignedTo` field for primary owner

**UI Changes**:
- Event form: Multi-select for users
- Event form: Multi-select for clients
- Event detail: Show all attendees with status badges

**Estimated Effort**: Medium (2-3 days)

---

### C2. Client Profile Calendar Integration
**Priority**: HIGH  
**Type**: ✅ EVOLVE (UI only, reuse existing data)

**Description**: Show calendar events on client profile page and enable quick booking.

**Current Infrastructure**:
- `clientMeetingHistory` table (for past meetings)
- `calendarEventAttendees` table (for upcoming meetings - from C1)

**Implementation**:
1. **Upcoming Meetings Section**:
   - Query `calendarEventAttendees` where `clientId = X`
   - Show list of upcoming events
   - Click to view/edit event

2. **Meeting History Section**:
   - Query `clientMeetingHistory`
   - Show past meetings with outcomes

3. **Quick Book Button**:
   - Opens calendar event dialog
   - Client pre-selected as attendee
   - Defaults to appropriate event type (e.g., MEETING)

**Database Changes**: ❌ NONE (reuses existing tables)

**Estimated Effort**: Small (1-2 days)

---

## 📦 Category D: Booking & Availability

### D1. VIP Portal Booking System
**Priority**: MEDIUM  
**Type**: 🆕 NEW FEATURE (no new tables)

**Description**: Allow external users (VIP portal) to book appointments by selecting from available time slots.

**Implementation**:

**1. Availability Calculation Service**:
```typescript
class BookingAvailabilityService {
  async getAvailableSlots(params: {
    startDate: Date;
    endDate: Date;
    eventType: string;
    durationMinutes: number;
    userId?: number; // specific team member
  }): Promise<TimeSlot[]> {
    // 1. Get event type settings (duration, buffers)
    // 2. Query existing events in date range
    // 3. Calculate free time slots
    // 4. Apply buffer rules
    // 5. Return list of available slots
  }
}
```

**2. Public API Endpoint**:
- `POST /api/public/calendar/availability` - Get available slots
- `POST /api/public/calendar/book` - Create booking
- Authentication: VIP portal token

**3. Booking Form Component**:
- Date picker
- Event type selector (filtered to bookable types)
- Available slots list (no calendar view)
- Client info form
- Confirmation

**4. Booking Creation**:
- Creates `calendarEvent` with `isExternal = true`
- Adds client as attendee (via `calendarEventAttendees`)
- Sets status to `PENDING` (requires confirmation)

**Database Changes**: ❌ NONE (reuses `calendarEvents` + `calendarEventAttendees`)

**Estimated Effort**: Large (4-5 days)

---

## 📦 Category E: UI Enhancements

### E1. Location-Based Calendar Views
**Priority**: MEDIUM  
**Type**: ✅ EVOLVE (UI only)

**Description**: Add location filtering and location-grouped views to calendar.

**Current Infrastructure**:
- `location` field exists in `calendarEvents`

**Implementation**:
1. **Location Filter Dropdown**:
   - Multi-select locations
   - "All Locations" option
   - Dynamically populated from existing events

2. **Location View Mode**:
   - Toggle: "Calendar View" vs "Location View"
   - Location View: Group events by location
   - Show location as section headers

**Database Changes**: ❌ NONE

**Estimated Effort**: Small (1-2 days)

---

### E2. Multi-Calendar View (Event Type Layers)
**Priority**: MEDIUM  
**Type**: ✅ EVOLVE (UI only)

**Description**: Show/hide different event types as separate "calendar layers" with color coding.

**Implementation**:
1. **Event Type Filter Panel**:
   - Checkboxes for each event type
   - Color indicator per type
   - "Select All" / "Deselect All"

2. **Color Coding**:
   - Assign colors to event types
   - Store in user preferences
   - Apply to event backgrounds in calendar

3. **Layer Toggle**:
   - Show/hide event types dynamically
   - Persist selection in user preferences

**Database Changes**: ❌ NONE (uses `userDashboardPreferences`)

**Estimated Effort**: Small (1-2 days)

---

### E3. Recurring Events UI Review
**Priority**: LOW  
**Type**: ✅ EVOLVE (review existing)

**Description**: Review and enhance existing recurring events UI if needed.

**Current Infrastructure**:
- Comprehensive recurrence system exists
- `calendarRecurrenceRules` table
- `calendarRecurrenceInstances` table

**Action**: Review existing UI and enhance if gaps found

**Database Changes**: ❌ NONE

**Estimated Effort**: Small (1 day review)

---

## 📦 Category F: Custom Metadata & Notes System ⭐ NEW

### F1. Universal Notes Field
**Priority**: HIGH  
**Type**: 🔧 EXTEND (add single field)

**Description**: Add a free-form notes field available on all event types for quick information capture.

**Migration Required**:
```sql
ALTER TABLE calendar_events 
ADD COLUMN notes TEXT AFTER description;
```

**Features**:
- Always visible in event form
- Markdown support
- Viewable by all users (default visibility)
- Searchable

**UI**:
- Textarea in event creation/edit form
- Displayed prominently in event details
- Search includes notes content

**Estimated Effort**: Small (0.5 days)

---

### F2. Custom Metadata Fields System
**Priority**: HIGH  
**Type**: 🆕 NEW TABLES (2)

**Description**: Flexible system for adding structured business data to calendar events, with smart defaults based on event type.

**New Schema**:

**Table 1: Event Metadata Storage**
```typescript
export const calendarEventMetadata = mysqlTable(
  "calendar_event_metadata",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),
    
    fieldKey: varchar("field_key", { length: 100 }).notNull(),
    fieldValue: text("field_value"),
    fieldType: mysqlEnum("field_type", [
      "TEXT",
      "NUMBER",
      "CURRENCY",
      "DATE",
      "BOOLEAN",
      "REFERENCE"
    ]).notNull(),
    
    // For reference fields (links to other TERP entities)
    referenceType: varchar("reference_type", { length: 50 }), // 'invoice', 'payment', 'order', 'client', 'batch', etc.
    referenceId: int("reference_id"),
    
    // Audit
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    eventIdIdx: index("event_id_idx").on(table.eventId),
    fieldKeyIdx: index("field_key_idx").on(table.fieldKey),
    referenceIdx: index("reference_idx").on(table.referenceType, table.referenceId),
  })
);
```

**Table 2: Custom Field Definitions**
```typescript
export const calendarCustomFieldDefinitions = mysqlTable(
  "calendar_custom_field_definitions",
  {
    id: int("id").autoincrement().primaryKey(),
    fieldKey: varchar("field_key", { length: 100 }).notNull().unique(),
    fieldLabel: varchar("field_label", { length: 200 }).notNull(),
    fieldType: mysqlEnum("field_type", [
      "TEXT",
      "NUMBER",
      "CURRENCY",
      "DATE",
      "BOOLEAN",
      "REFERENCE"
    ]).notNull(),
    
    referenceType: varchar("reference_type", { length: 50 }), // For REFERENCE type fields
    
    // Which event types this field applies to (NULL = all types)
    applicableEventTypes: json("applicable_event_types"), // Array of event type enums
    
    // Field configuration
    isRequired: boolean("is_required").default(false),
    defaultValue: text("default_value"),
    validationRules: json("validation_rules"), // e.g., {"min": 0, "max": 10000}
    
    // Organization
    isSystemField: boolean("is_system_field").default(false), // System-defined vs user-defined
    isActive: boolean("is_active").default(true),
    sortOrder: int("sort_order").default(0),
    
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    eventTypesIdx: index("event_types_idx").on(table.applicableEventTypes),
    activeIdx: index("active_idx").on(table.isActive),
  })
);
```

---

### F3. Smart Default Fields by Event Type

**Description**: System-defined metadata fields that appear automatically based on event type, aligned with TERP business workflows.

#### AR_COLLECTION (Customer Payment Drop-off)
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `client_id` | Client | REFERENCE (client) | ✅ | Link to client record |
| `invoice_id` | Invoice | REFERENCE (invoice) | - | Which invoice is being paid |
| `expected_amount` | Expected Amount | CURRENCY | ✅ | How much money expected |
| `payment_method` | Payment Method | TEXT | - | Cash/Check/Wire/etc. |
| `payment_id` | Payment Record | REFERENCE (payment) | - | Link to payment after processed |

#### AP_PAYMENT (Vendor Payment Pickup)
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `vendor_id` | Vendor | REFERENCE (vendor) | ✅ | Link to vendor record |
| `bill_id` | Bill | REFERENCE (bill) | - | Which bill is being paid |
| `payment_amount` | Payment Amount | CURRENCY | ✅ | How much money to give |
| `payment_method` | Payment Method | TEXT | - | Check/Wire/Cash/etc. |
| `check_number` | Check Number | TEXT | - | If paying by check |
| `payment_id` | Payment Record | REFERENCE (payment) | - | Link to payment after processed |

#### INTAKE
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `client_id` | Client | REFERENCE (client) | ✅ | Link to client record |
| `intake_type` | Intake Type | TEXT | - | First visit, follow-up, etc. |
| `expected_order_value` | Expected Order Value | CURRENCY | - | Estimated deal size |
| `products_of_interest` | Products of Interest | TEXT | - | What products client is interested in |
| `priority_level` | Priority | TEXT | - | Low/Medium/High |

#### SHOPPING
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `client_id` | Client | REFERENCE (client) | ✅ | Link to client record |
| `shopping_list` | Shopping List | TEXT | - | Products client wants to see |
| `budget_range` | Budget Range | TEXT | - | Client's stated budget |

#### PAYMENT_DUE
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `bill_id` | Bill | REFERENCE (bill) | - | Which bill is due |
| `amount_due` | Amount Due | CURRENCY | ✅ | How much is due |
| `payment_status` | Status | TEXT | - | Pending/Paid/Overdue |

#### MEETING (External)
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `client_id` | Client | REFERENCE (client) | - | Link to client if applicable |
| `meeting_type` | Meeting Type | TEXT | - | Sales, support, negotiation, etc. |
| `agenda` | Agenda | TEXT | - | Meeting topics |
| `follow_up_required` | Follow-up Required | BOOLEAN | - | Does this need a follow-up? |
| `related_order_id` | Related Order | REFERENCE (order) | - | If discussing specific order |

#### MEETING (Internal)
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `meeting_type` | Meeting Type | TEXT | - | Standup, planning, review, etc. |
| `agenda` | Agenda | TEXT | - | Meeting topics |
| `action_items` | Action Items | TEXT | - | Tasks assigned during meeting |

#### PHOTOS
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `batch_ids` | Batches | TEXT | - | Which batches being photographed |
| `product_ids` | Products | TEXT | - | Which products being photographed |
| `photo_type` | Photo Type | TEXT | - | Product shots, lifestyle, etc. |
| `photographer` | Photographer | REFERENCE (user) | - | Who is doing the photography |

#### BLOCKED_TIME
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `reason` | Reason | TEXT | - | Why this time is blocked |
| `is_recurring` | Recurring Block | BOOLEAN | - | Weekly block (e.g., lunch) |

#### SHIFT
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `shift_type` | Shift Type | TEXT | - | Opening, closing, mid, etc. |
| `role` | Role | TEXT | - | What role during this shift |
| `coverage_for` | Covering For | REFERENCE (user) | - | If covering for someone |

#### VACATION
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `vacation_type` | Type | TEXT | - | PTO, sick, personal, etc. |
| `approval_status` | Approval Status | TEXT | - | Pending/Approved/Denied |
| `approved_by` | Approved By | REFERENCE (user) | - | Who approved |

#### TRAINING
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `training_topic` | Topic | TEXT | - | What is being trained |
| `trainer` | Trainer | REFERENCE (user) | - | Who is conducting training |
| `materials_link` | Materials | TEXT | - | Link to training materials |

#### DEADLINE
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `project_name` | Project | TEXT | - | What project this deadline is for |
| `deliverable` | Deliverable | TEXT | - | What is due |
| `assigned_to` | Assigned To | REFERENCE (user) | - | Who is responsible |

#### TASK
| Field Key | Label | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `task_status` | Status | TEXT | - | Not Started/In Progress/Complete |
| `assigned_to` | Assigned To | REFERENCE (user) | - | Who is responsible |
| `related_order_id` | Related Order | REFERENCE (order) | - | If task is order-related |

---

### F4. Custom Field Management UI

**Description**: Admin interface for creating and managing custom metadata fields.

**Features**:
1. **Field Definition Manager**:
   - List all custom fields
   - Create new custom field
   - Edit existing field
   - Activate/deactivate fields
   - Reorder fields

2. **Field Configuration**:
   - Field key (unique identifier)
   - Field label (display name)
   - Field type (TEXT, NUMBER, CURRENCY, DATE, BOOLEAN, REFERENCE)
   - Applicable event types (multi-select)
   - Required flag
   - Default value
   - Validation rules

3. **System Fields**:
   - Cannot be deleted (only deactivated)
   - Can be edited (label, validation)
   - Marked with badge

**Database Changes**: ✅ USES NEW TABLES

**Estimated Effort**: Medium (2-3 days)

---

### F5. Dynamic Event Form

**Description**: Event creation/edit form that dynamically shows relevant metadata fields based on event type.

**UI Flow**:
1. User selects event type
2. Form dynamically loads:
   - Universal notes field (always visible)
   - Default metadata fields for that event type
   - Option to add custom fields

**Example: AR_COLLECTION Event Form**
```
┌─────────────────────────────────────┐
│ Create Event: AR Collection         │
├─────────────────────────────────────┤
│ Title: [Customer Payment - ABC Corp]│
│ Date: [11/15/2025] Time: [2:00 PM] │
│ Location: [Front Desk]              │
│                                      │
│ ─── Payment Details ───             │
│ Client: [ABC Corp ▼] ⭐             │
│ Invoice: [INV-2025-123 ▼]           │
│ Expected Amount: [$500.00] ⭐       │
│ Payment Method: [Cash ▼]            │
│                                      │
│ ─── Notes ───                       │
│ [Free-form notes here...]           │
│                                      │
│ ─── Custom Fields ───               │
│ + Add Custom Field                  │
│                                      │
│ [Cancel]              [Save Event]  │
└─────────────────────────────────────┘
```

**Key UX Principles**:
- ⭐ = Required field
- ▼ = Dropdown with autocomplete
- Default fields shown based on event type
- Custom fields collapsed by default (progressive disclosure)
- Notes always visible (universal field)
- Reference fields link to TERP entities

**Database Changes**: ✅ USES NEW TABLES

**Estimated Effort**: Medium (3-4 days)

---

### F6. Metadata Display & Search

**Description**: Display metadata in event details and enable search/filter by metadata values.

**Features**:
1. **Event Details View**:
   - Show all metadata fields with labels
   - Reference fields show entity name (clickable link)
   - Currency fields formatted properly
   - Notes displayed prominently

2. **Search & Filter**:
   - Search by notes content
   - Filter by metadata field values
   - Advanced search: "Show all AR_COLLECTION events with expected_amount > $1000"

3. **Metadata Reporting**:
   - Aggregate metadata across events
   - Example: "Total expected payments this week: $5,000"

**Database Changes**: ❌ NONE (uses existing tables)

**Estimated Effort**: Medium (2-3 days)

---

## 📊 Implementation Roadmap

### Phase 1: Core Enhancements (3-4 weeks)
**Goal**: Essential features for immediate business value

| Feature | Priority | Effort | Dependencies |
|---------|----------|--------|--------------|
| B1. Extend Event Types | HIGH | Small | None |
| B2. Event Type Configuration | HIGH | Medium | B1 |
| C1. Multi-Attendee Support | HIGH | Medium | None |
| A1. Dashboard Calendar Widget | HIGH | Small | None |
| F1. Universal Notes Field | HIGH | Small | None |
| F2. Custom Metadata System | HIGH | Medium | F1 |
| F3. Smart Default Fields | HIGH | Small | F2 |
| F4. Custom Field Management UI | HIGH | Medium | F2 |
| F5. Dynamic Event Form | HIGH | Medium | F2, F3, F4 |

**Total Effort**: 3-4 weeks

---

### Phase 2: UI & Integration (2-3 weeks)
**Goal**: Enhanced user experience and system integration

| Feature | Priority | Effort | Dependencies |
|---------|----------|--------|--------------|
| C2. Client Profile Integration | HIGH | Small | C1 |
| E1. Location-Based Views | MEDIUM | Small | None |
| E2. Multi-Calendar View | MEDIUM | Small | None |
| B3. External/Internal Classification | MEDIUM | Small | None |
| F6. Metadata Display & Search | HIGH | Medium | F2 |

**Total Effort**: 2-3 weeks

---

### Phase 3: Booking System (2-3 weeks)
**Goal**: External booking capability for VIP portal

| Feature | Priority | Effort | Dependencies |
|---------|----------|--------|--------------|
| D1. VIP Portal Booking | MEDIUM | Large | B2, C1 |
| E3. Recurring Events UI Review | LOW | Small | None |

**Total Effort**: 2-3 weeks

---

## 📈 Summary Metrics

### Database Impact
| Change Type | Count | Details |
|-------------|-------|---------|
| **New Tables** | 4 | `calendar_event_type_settings`, `calendar_event_attendees`, `calendar_event_metadata`, `calendar_custom_field_definitions` |
| **New Columns** | 2 | `notes` (TEXT), `is_external` (BOOLEAN) |
| **Enum Extensions** | 1 | Add 7 new event types |
| **Indexes** | 8 | Performance optimization |

### Development Effort
| Phase | Duration | Features |
|-------|----------|----------|
| Phase 1 | 3-4 weeks | 9 features (core + metadata) |
| Phase 2 | 2-3 weeks | 5 features (UI + integration) |
| Phase 3 | 2-3 weeks | 2 features (booking) |
| **Total** | **7-10 weeks** | **16 features** |

### Code Reuse
- **70% Reuse**: Leverages existing dashboard, client, user, invoice, payment, order, and batch systems
- **30% New**: Focused on calendar-specific enhancements
- **Zero Duplication**: All features integrate with existing TERP infrastructure

---

## ✅ Anti-Duplication Validation

**Single Source of Truth**:
- ✅ All events in `calendarEvents` table
- ✅ All attendees in `calendarEventAttendees` table (junction)
- ✅ All metadata in `calendarEventMetadata` table
- ✅ All field definitions in `calendarCustomFieldDefinitions` table

**No Duplicate Systems**:
- ✅ No separate booking tables (bookings ARE events)
- ✅ No duplicate event types (extended single enum)
- ✅ No duplicate client relationships (reused existing tables)
- ✅ No duplicate recurrence (using comprehensive existing system)
- ✅ No duplicate notes/comments (single notes field + structured metadata)

**Leveraged Existing TERP Entities**:
- ✅ `clients` - for client attendees and references
- ✅ `users` - for user attendees and references
- ✅ `invoices` - for AR collection events
- ✅ `bills` - for AP payment events
- ✅ `payments` - for payment tracking
- ✅ `orders` - for order-related events
- ✅ `batches` - for product/batch references
- ✅ `vendors` - for vendor-related events

---

## 🎯 Success Criteria

### Phase 1 Success
- ✅ All new event types available in dropdown
- ✅ Event type configuration working (duration, buffers, free/busy)
- ✅ Multi-attendee support functional
- ✅ Dashboard calendar widget displaying
- ✅ Notes field available on all events
- ✅ Custom metadata fields working for AR_COLLECTION and AP_PAYMENT
- ✅ Smart default fields appearing based on event type

### Phase 2 Success
- ✅ Client profile shows upcoming meetings and history
- ✅ Location filtering and grouping working
- ✅ Multi-calendar view with color-coded layers
- ✅ External/internal event classification
- ✅ Metadata search and filtering functional

### Phase 3 Success
- ✅ VIP portal booking system operational
- ✅ Availability calculation accurate
- ✅ Bookings create events with proper metadata
- ✅ Recurring events UI reviewed and enhanced

---

## 📝 Notes

### Design Principles Followed
1. **Maximize Reuse** - 70% of features use existing infrastructure
2. **Minimize Schema Changes** - Only 4 new tables, 2 new columns
3. **Zero Duplication** - Single source of truth for all data
4. **Progressive Disclosure** - Complex features hidden until needed
5. **Business Context** - Smart defaults based on TERP workflows
6. **Flexibility** - Custom fields support any business need
7. **Audit Trail** - Track who added what when

### Key Innovations in v2.0
- **Smart Default Fields** - Context-aware metadata based on event type
- **Reference Fields** - Direct links to TERP entities (invoices, payments, orders, etc.)
- **Universal Notes** - Simple free-form capture for all events
- **Flexible Metadata** - Structured data without rigid schema
- **User-Defined Fields** - Admins can create custom fields as needed

---

**Document Version**: 2.0  
**Last Updated**: 2025-11-10  
**Status**: Ready for Review & Approval
