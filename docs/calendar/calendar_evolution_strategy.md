# Calendar Evolution Strategy
## Feature Overlap Analysis & Implementation Approach

---

## 🎯 Strategic Approach

**Principle**: Maximize evolution of existing features, minimize new builds, eliminate duplication.

---

## 📊 Feature-by-Feature Analysis

### 1. Dashboard Calendar Widget
**Status**: 🆕 **NEW FEATURE**

**Current State**:
- Dashboard exists with widget system (`userDashboardPreferences` table)
- Widget config stored as JSON with `WidgetConfig[]`
- No calendar widget currently implemented

**Evolution Strategy**:
- ✅ **EVOLVE**: Add new calendar widget to existing dashboard widget system
- Add `calendar-day-schedule` widget type to dashboard
- Reuse existing widget configuration infrastructure
- Widget settings can store: event type filters, location filters, time range

**Implementation**:
- Create new `CalendarDayWidget.tsx` component
- Add to dashboard widget registry
- Use existing `userDashboardPreferences` for customization
- **No new database tables needed**

---

### 2. Event Type System
**Status**: ⚠️ **EVOLVE + EXTEND**

**Current State**:
- Hardcoded `eventType` enum with 13 types
- Current types: MEETING, DEADLINE, TASK, DELIVERY, PAYMENT_DUE, FOLLOW_UP, AUDIT, INTAKE, PHOTOGRAPHY, BATCH_EXPIRATION, RECURRING_ORDER, SAMPLE_REQUEST, OTHER

**Requested Types**:
- External: Intake ✅ (exists), Shopping ❌, Customer Payment Drop-off ❌, Vendor Payment Pickup ❌, Meeting ✅ (exists)
- Internal: Meeting ✅ (exists), Photos ✅ (PHOTOGRAPHY exists), Do Not Book ❌, Shift/Vacation ❌

**Evolution Strategy**:
- ✅ **EVOLVE**: Extend existing enum to add missing types
- Map requested types to schema:
  - Shopping → Add `SHOPPING` to enum
  - Customer Payment Drop-off → Add `AR_COLLECTION` to enum
  - Vendor Payment Pickup → Add `AP_PAYMENT` to enum  
  - Do Not Book → Add `BLOCKED_TIME` to enum
  - Shift/Vacation → Add `SHIFT` and `VACATION` to enum

**Migration Required**:
```sql
ALTER TABLE calendar_events 
MODIFY COLUMN event_type ENUM(
  ..existing values..,
  'SHOPPING',
  'AR_COLLECTION',
  'AP_PAYMENT',
  'BLOCKED_TIME',
  'SHIFT',
  'VACATION'
);
```

**Avoid Duplication**:
- Don't create separate "external" vs "internal" event type systems
- Use single enum with all types
- Add `isExternal` boolean field to distinguish (see #5)

---

### 3. Event Type Configuration (Duration, Buffers, Free/Busy)
**Status**: 🆕 **NEW FEATURE** (but small table)

**Current State**:
- No event type configuration exists
- Duration is per-event only
- No buffer settings
- No free/busy status

**Evolution Strategy**:
- 🆕 **NEW TABLE**: Create `calendarEventTypeSettings` table
- Store default settings per event type
- Allow per-user customization

**New Schema**:
```typescript
export const calendarEventTypeSettings = mysqlTable("calendar_event_type_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id), // null = global default
  eventType: varchar("event_type", { length: 50 }).notNull(), // matches enum
  
  // Duration settings
  defaultDurationMinutes: int("default_duration_minutes").default(60),
  
  // Buffer settings
  bufferBeforeMinutes: int("buffer_before_minutes").default(0),
  bufferAfterMinutes: int("buffer_after_minutes").default(0),
  
  // Availability
  showAsBusy: boolean("show_as_busy").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
```

**Why New Table**:
- Can't add to `calendarEvents` (that's per-event, not per-type)
- Need user-specific customization
- Need global defaults
- Small, focused table with clear purpose

---

### 4. Location Management
**Status**: ✅ **ALREADY EXISTS** (just needs UI)

**Current State**:
- `location` varchar(500) field exists in `calendarEvents`
- No location-based views in UI

**Evolution Strategy**:
- ✅ **EVOLVE UI ONLY**: Add location-based calendar views
- Add location filter to existing calendar UI
- Add location grouping/view mode
- **No database changes needed**

**Implementation**:
- Add location filter dropdown to calendar toolbar
- Add "Location View" toggle (group events by location)
- Reuse existing `location` field
- **Zero database changes**

---

### 5. External vs Internal Event Classification
**Status**: 🆕 **EXTEND SCHEMA** (single field)

**Current State**:
- No field to distinguish external vs internal events
- `visibility` enum exists (PRIVATE, TEAM, COMPANY, PUBLIC) but doesn't capture this

**Evolution Strategy**:
- ✅ **EXTEND**: Add single `isExternal` boolean field to `calendarEvents`
- Don't create separate tables or duplicate event types
- Simple, clear distinction

**Migration Required**:
```sql
ALTER TABLE calendar_events 
ADD COLUMN is_external BOOLEAN DEFAULT FALSE NOT NULL;
```

**Why This Approach**:
- Avoids duplicating event type system
- Single source of truth for all events
- Can filter/group by `isExternal` in queries
- Minimal schema change

---

### 6. Multi-Attendee Support
**Status**: ⚠️ **EVOLVE + NEW TABLE**

**Current State**:
- Only `assignedTo` (single user)
- `clientMeetingHistory` links events to clients but only for history tracking

**Evolution Strategy**:
- 🆕 **NEW TABLE**: Create `calendarEventAttendees` junction table
- Keep `assignedTo` for backward compatibility (primary responsible person)
- Support multiple users AND clients as attendees

**New Schema**:
```typescript
export const calendarEventAttendees = mysqlTable("calendar_event_attendees", {
  id: int("id").autoincrement().primaryKey(),
  calendarEventId: int("calendar_event_id")
    .notNull()
    .references(() => calendarEvents.id, { onDelete: "cascade" }),
  
  // Polymorphic attendee (either user OR client)
  attendeeType: mysqlEnum("attendee_type", ["USER", "CLIENT"]).notNull(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }),
  clientId: int("client_id").references(() => clients.id, { onDelete: "cascade" }),
  
  // Attendance tracking
  responseStatus: mysqlEnum("response_status", [
    "PENDING",
    "ACCEPTED",
    "DECLINED",
    "TENTATIVE"
  ]).default("PENDING"),
  
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Why New Table**:
- Many-to-many relationship (events ↔ attendees)
- Can't extend existing fields
- Standard junction table pattern
- Allows tracking response status per attendee

**Avoid Duplication**:
- Don't modify `clientMeetingHistory` (that's for completed meetings)
- This is for upcoming/scheduled events
- Different purposes, no duplication

---

### 7. Client Profile Integration
**Status**: ✅ **ALREADY EXISTS** (needs UI enhancement)

**Current State**:
- `clientMeetingHistory` table exists
- Links `calendarEventId` to `clientId`
- Tracks meeting outcomes, attendees, action items

**Evolution Strategy**:
- ✅ **EVOLVE UI**: Add calendar views to client profile page
- ✅ **EVOLVE UI**: Add "Quick Book" button on client profile
- Use existing `calendarEventAttendees` (from #6) to show upcoming events
- Use existing `clientMeetingHistory` to show past events
- **No database changes needed** (attendees table from #6 handles this)

**Implementation**:
- Add "Upcoming Meetings" section to client profile (query `calendarEventAttendees` where `clientId = X`)
- Add "Meeting History" section (query `clientMeetingHistory`)
- Add "Book Meeting" button → opens calendar event dialog with client pre-selected
- **Zero new tables**

---

### 8. Recurring Events
**Status**: ✅ **ALREADY EXISTS**

**Current State**:
- Full recurrence system exists
- `calendarRecurrenceRules` table with comprehensive pattern support
- `calendarRecurrenceInstances` table for generated instances
- Supports: DAILY, WEEKLY, MONTHLY, YEARLY
- Supports: byDay, byMonthDay, byWeekOfMonth, exceptions, etc.

**Evolution Strategy**:
- ✅ **USE AS-IS**: No changes needed
- Ensure UI exposes all existing recurrence options
- **Zero database changes**

---

### 9. VIP Portal Booking
**Status**: 🆕 **NEW FEATURE** (moderate complexity)

**Current State**:
- No external booking system
- No VIP portal integration with calendar

**Evolution Strategy**:
- 🆕 **NEW FEATURE**: Build external booking interface
- Reuse existing `calendarEvents` table
- Add availability calculation logic
- Create public booking API endpoint

**Implementation Approach**:
- Create new `BookingAvailability` service class
  - Calculates free time slots based on existing events
  - Respects buffer times (from event type settings)
  - Returns list of available slots
- Create new public API endpoint `/api/public/calendar/availability`
- Create new booking form component for VIP portal
- On booking: creates new `calendarEvent` with `isExternal = true`
- **No new tables** - reuses `calendarEvents`

**Why No New Tables**:
- Bookings ARE calendar events
- Just need different UI and access control
- Availability is calculated, not stored

---

### 10. Multi-Calendar View
**Status**: ✅ **UI FEATURE ONLY**

**Current State**:
- All data exists in `calendarEvents`
- No multi-calendar UI

**Evolution Strategy**:
- ✅ **EVOLVE UI**: Add calendar view filters/layers
- Show/hide event types as separate "calendars"
- Color-code by event type or other criteria
- **No database changes needed**

**Implementation**:
- Add filter checkboxes for event types
- Add color mapping for event types
- Add layer toggle UI (show/hide specific event types)
- All data from single `calendarEvents` table
- **Zero database changes**

---

## 📋 Summary: Evolution vs New Build

### ✅ Evolve Existing (8 features)
1. Dashboard Widget System → Add calendar widget
2. Event Type Enum → Extend with new types
3. Location Field → Add UI views/filters
4. Recurring Events → Use as-is
5. Client Profile → Add calendar sections
6. Multi-Calendar View → UI filters only
7. `assignedTo` → Keep for primary owner
8. `clientMeetingHistory` → Use for past meetings

### 🆕 New Features (3 small additions)
1. `calendarEventTypeSettings` table (event type configuration)
2. `calendarEventAttendees` table (multi-attendee support)
3. VIP Portal Booking (UI + API, no new tables)

### 🔧 Schema Extensions (2 fields)
1. Add `isExternal` boolean to `calendarEvents`
2. Extend `eventType` enum with 6 new values

---

## 🚫 Avoided Duplications

1. **NOT creating separate external/internal event systems** → Single `calendarEvents` table with `isExternal` flag
2. **NOT creating separate booking tables** → Bookings are events in `calendarEvents`
3. **NOT duplicating client-event relationships** → Use `calendarEventAttendees` for upcoming, `clientMeetingHistory` for past
4. **NOT creating separate calendar tables** → Multi-calendar is UI-only feature
5. **NOT replacing event types** → Extending existing enum
6. **NOT replacing recurrence system** → Using existing comprehensive system

---

## 📊 Database Impact Summary

| Change Type | Count | Tables Affected |
|-------------|-------|-----------------|
| New Tables | 2 | `calendarEventTypeSettings`, `calendarEventAttendees` |
| Extended Tables | 1 | `calendarEvents` (+1 field) |
| Extended Enums | 1 | `eventType` enum (+6 values) |
| UI-Only Features | 4 | Dashboard widget, location view, multi-calendar, client profile |
| Reused As-Is | 3 | Recurring events, location field, client history |

**Total New Tables**: 2 (both small, focused, no duplication)  
**Total Schema Changes**: Minimal (1 field, 1 enum extension)  
**Reuse Percentage**: ~70% of features use existing infrastructure

---

## ✅ Validation: No Duplication Checklist

- ✅ Single source of truth for events (`calendarEvents`)
- ✅ No duplicate event type systems
- ✅ No duplicate client-event relationships
- ✅ No duplicate booking/scheduling systems
- ✅ No duplicate recurrence logic
- ✅ No duplicate location tracking
- ✅ Attendees table is junction table (standard pattern, not duplication)
- ✅ Event type settings table is configuration (not duplication of events)

---

## 🎯 Next Step
Create concise feature specification document with implementation priorities.
