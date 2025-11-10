# Calendar Evolution Feature Specification
**TERP ERP System - Calendar Module Enhancement**

---

## 📋 Executive Summary

This specification outlines the evolution of the TERP Calendar system based on user requirements. The approach **maximizes reuse** of existing infrastructure (70% of features), **minimizes new builds** (only 2 new tables), and **eliminates duplication** through strategic schema extensions and UI enhancements.

**Key Metrics**:
- **Reuse**: 70% of features leverage existing infrastructure
- **New Tables**: 2 (small, focused, no duplication)
- **Schema Changes**: Minimal (1 field + 1 enum extension)
- **UI-Only Features**: 4 (no database changes)

---

## 🎯 Feature Categories

### Category A: Dashboard Integration
### Category B: Event Type System Enhancement
### Category C: Attendee & Client Integration
### Category D: Booking & Availability
### Category E: UI Enhancements

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
  'BLOCKED_TIME', 'SHIFT', 'VACATION'
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
   - Apply to calendar event blocks

3. **Layer Toggle**:
   - Show/hide event types independently
   - Persist selection in user preferences

**Database Changes**: ❌ NONE (uses `userDashboardPreferences` for settings)

**Estimated Effort**: Small (1-2 days)

---

### E3. Recurring Events UI
**Priority**: LOW  
**Type**: ✅ EVOLVE (UI only)

**Description**: Ensure UI exposes all existing recurrence options.

**Current Infrastructure**:
- Full recurrence system exists (`calendarRecurrenceRules`)
- Supports DAILY, WEEKLY, MONTHLY, YEARLY
- Supports complex patterns (byDay, byMonthDay, etc.)

**Implementation**:
- Review existing event form
- Ensure all recurrence options are accessible
- Add UI for complex patterns if missing

**Database Changes**: ❌ NONE

**Estimated Effort**: Small (review + minor UI updates)

---

## 📊 Implementation Roadmap

### Phase 1: Core Enhancements (2-3 weeks)
**Priority**: HIGH - Foundation for all other features

1. **B1**: Extend Event Types (2 days)
   - Migration + schema update
   - UI updates for new types

2. **B2**: Event Type Configuration (3 days)
   - New table + migration
   - Settings UI
   - Integration with event creation

3. **C1**: Multi-Attendee Support (3 days)
   - New table + migration
   - Event form updates
   - Attendee management UI

4. **A1**: Dashboard Calendar Widget (2 days)
   - Widget component
   - Dashboard integration
   - Settings UI

5. **C2**: Client Profile Integration (2 days)
   - Upcoming meetings section
   - Meeting history section
   - Quick book button

**Deliverables**:
- 2 new tables
- 1 enum extension
- 1 field addition
- 5 UI components
- Full test coverage

---

### Phase 2: UI Enhancements (1-2 weeks)
**Priority**: MEDIUM - Improves UX, no schema changes

1. **E1**: Location-Based Views (2 days)
   - Location filter
   - Location view mode

2. **E2**: Multi-Calendar View (2 days)
   - Event type filters
   - Color coding
   - Layer toggles

3. **B3**: External/Internal Classification (1 day)
   - Migration
   - UI filters

4. **E3**: Recurring Events UI Review (1 day)
   - Audit existing UI
   - Fill gaps if any

**Deliverables**:
- 0 new tables
- 1 field addition
- 4 UI enhancements
- Improved calendar UX

---

### Phase 3: Booking System (2-3 weeks)
**Priority**: MEDIUM - External-facing feature

1. **D1**: VIP Portal Booking (5 days)
   - Availability service
   - Public API endpoints
   - Booking form component
   - Integration testing

**Deliverables**:
- 0 new tables
- 1 service class
- 2 API endpoints
- 1 booking form
- Public-facing feature

---

## 🚫 Anti-Duplication Validation

### ✅ Single Source of Truth
- All events in `calendarEvents` table
- No separate booking/scheduling tables
- No duplicate event type systems
- No duplicate client-event relationships

### ✅ Reuse Existing Infrastructure
- Dashboard widget system
- Recurrence system
- Location field
- Client meeting history
- User preferences

### ✅ Minimal New Tables
- `calendarEventTypeSettings` - Configuration (not duplication)
- `calendarEventAttendees` - Junction table (standard pattern)

### ✅ Strategic Extensions
- Extend event type enum (not replace)
- Add `isExternal` field (not new table)
- Evolve UI (not rebuild)

---

## 📈 Success Metrics

| Metric | Target |
|--------|--------|
| Code Reuse | 70%+ |
| New Tables | ≤ 2 |
| Schema Changes | Minimal |
| Test Coverage | 100% |
| No Duplication | ✅ Validated |

---

## 🎯 Conclusion

This specification achieves the user's calendar evolution goals while:
- **Maximizing reuse** of existing infrastructure (70%)
- **Minimizing new builds** (only 2 focused tables)
- **Eliminating duplication** through strategic design
- **Maintaining simplicity** with clear, focused features

**Total Effort**: 6-8 weeks (3 phases)  
**Database Impact**: Minimal (2 tables, 2 fields, 1 enum)  
**Risk**: Low (builds on proven infrastructure)

---

**Document Status**: Ready for Review  
**Next Step**: User approval → Phase 1 implementation
