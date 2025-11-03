# TERP Calendar Feature: Adversarial QA Review

**Version:** 1.0  
**Date:** November 03, 2025  
**Reviewer:** Manus AI (Adversarial QA Mode)  
**Purpose:** Critical analysis to identify weaknesses, gaps, and potential failure modes

---

## Executive Summary

This adversarial QA review identifies **27 critical issues** across the calendar feature proposal, ranging from fundamental architectural flaws to missing implementation details. The review is organized into severity levels and provides specific recommendations for each issue.

**Critical Issues (Must Fix):** 11  
**High Priority Issues:** 9  
**Medium Priority Issues:** 7

The most severe concerns include lack of data migration strategy, missing permission system, inadequate error handling, and unrealistic timeline estimates.

---

## 1. CRITICAL ISSUES (Must Fix Before Implementation)

### 1.1. No Data Migration or Rollback Strategy

**Problem:** The proposal adds 5 new tables to the production database but provides zero detail on how to handle migration failures, data corruption, or the need to roll back.

**Why This Is Critical:**
- Production database changes are irreversible without a rollback plan
- Migration failures could bring down the entire TERP system
- No mention of how to handle existing data that should become calendar events
- No strategy for migrating existing "scheduled" data (e.g., existing delivery dates on orders)

**Missing Details:**
- What happens if the migration fails halfway through?
- How do we roll back if the calendar feature has critical bugs post-launch?
- What's the data retention policy for deleted events?
- How do we handle timezone data for existing records?
- What if users have thousands of old invoices - do we auto-generate events for all of them?

**Recommendation:**
- Create a detailed migration strategy document
- Implement migration in stages with rollback points
- Add a feature flag system to enable/disable calendar without database rollback
- Define data retention and archival policies
- Create a backfill strategy for historical data with user control

---

### 1.2. Missing Permissions and Access Control System

**Problem:** The proposal mentions "users see events only for modules they have access to" but provides NO implementation details for the permission system.

**Why This Is Critical:**
- Security vulnerability: Users could potentially see sensitive financial or client data
- No definition of who can create/edit/delete events
- No role-based access control (RBAC) specification
- No handling of multi-tenant scenarios if TERP ever expands

**Missing Details:**
- Can a sales rep see accounting events?
- Can a warehouse worker create client meeting events?
- Who can delete events created by others?
- How do permissions work for entity-linked events (e.g., can you see an event if you can't see the linked invoice)?
- What about events with multiple participants from different permission levels?

**Recommendation:**
- Design a comprehensive permission matrix mapping roles to calendar actions
- Implement row-level security checks in all tRPC endpoints
- Add permission validation to the frontend (with backend enforcement)
- Define clear rules for entity-linked event visibility
- Add audit logging for all permission-related actions

---

### 1.3. Timezone Handling Is Superficial

**Problem:** The proposal says "all times stored in UTC, converted to user timezone" but this is naive and will cause major issues.

**Why This Is Critical:**
- Cannabis businesses operate across multiple states with different timezones
- Vendors and clients may be in different timezones
- Daylight Saving Time transitions will cause bugs
- No handling of "floating" times (e.g., "9am wherever the user is")
- No specification of how recurring events handle timezone changes

**Real-World Failure Scenarios:**
- A delivery scheduled for "9am PST" when the user is in EST - what time shows?
- A recurring meeting every Monday at 9am - does it shift during DST?
- An invoice due date is "end of day" - which timezone's end of day?
- A vendor in Colorado schedules a delivery for a California client - whose timezone?

**Missing Details:**
- How do we handle events that span timezone boundaries?
- What's the UX for timezone selection in the event form?
- How do we display timezone information in the UI?
- What happens when a user travels to a different timezone?
- How do we handle historical timezone data (e.g., event created before DST change)?

**Recommendation:**
- Use a robust timezone library (e.g., Luxon, date-fns-tz)
- Store timezone explicitly with each event, not just UTC offset
- Add timezone display to all event views
- Implement "floating time" support for all-day events
- Add timezone conversion warnings in the UI
- Test extensively across DST boundaries

---

### 1.4. Recurrence Expansion Will Kill Performance

**Problem:** The proposal expands recurring events "at query time" which will become a performance nightmare.

**Why This Is Critical:**
- Expanding a daily recurring event for a year = 365 instances calculated on every query
- A user with 50 recurring events viewing a month = thousands of calculations per page load
- No caching strategy for expanded instances
- No limit on recurrence expansion mentioned
- Database indexes won't help with computed data

**Performance Math:**
- 100 users × 50 recurring events each × 30 days = 150,000 instances calculated per day
- Each calculation requires date math, exception checking, and rule matching
- This will add 500ms-2s to every calendar page load

**Missing Details:**
- What's the maximum recurrence expansion window?
- How do we cache expanded instances?
- What happens when a user views a 5-year calendar range?
- How do we invalidate cache when recurrence rules change?

**Recommendation:**
- Pre-compute and materialize recurring event instances in a separate table
- Implement a background job to generate instances for the next 90 days
- Add pagination to recurrence expansion
- Implement aggressive caching with smart invalidation
- Add a hard limit on recurrence expansion (e.g., max 1000 instances)

---

### 1.5. No Conflict Resolution Strategy

**Problem:** Phase 3 mentions "conflict detection" but provides no strategy for what happens when conflicts are detected.

**Why This Is Critical:**
- Detecting conflicts is useless without resolution
- No specification of what constitutes a "conflict" (same time? overlapping? same resource?)
- No UX for handling conflicts
- No automatic conflict resolution rules

**Missing Details:**
- Can users create conflicting events?
- What's the UX when a conflict is detected?
- How do we handle conflicts for recurring events?
- What about resource conflicts (e.g., two events in the same meeting room)?
- How do we prioritize events when suggesting alternatives?

**Recommendation:**
- Define conflict types (hard conflicts vs. soft warnings)
- Implement conflict resolution workflows (override, reschedule, cancel)
- Add priority-based conflict resolution
- Implement smart scheduling suggestions
- Add conflict visualization in the UI

---

### 1.6. Automated Event Generation Could Create Event Spam

**Problem:** The proposal auto-generates events for invoices, orders, quotes, batches, etc., but provides no controls to prevent event overload.

**Why This Is Critical:**
- A business with 1000 invoices/month = 1000 auto-generated events
- Users could be overwhelmed with events they don't care about
- No way to disable auto-generation for specific event types
- No bulk event management tools
- No event prioritization or filtering by importance

**Failure Scenario:**
- User opens calendar and sees 500 events for the month
- Can't find the important meeting among all the auto-generated due dates
- Disables calendar feature entirely because it's "too noisy"

**Missing Details:**
- Can users disable auto-generation for specific event types?
- How do we prioritize auto-generated vs. manual events?
- What's the UX for managing hundreds of events?
- How do we prevent notification fatigue?

**Recommendation:**
- Add user preferences for auto-event generation (per event type)
- Implement event importance/priority levels
- Add smart filtering and grouping in calendar views
- Implement "quiet mode" to hide low-priority events
- Add bulk event management tools (archive, delete, snooze)

---

### 1.7. No Notification System Architecture

**Problem:** The proposal mentions "in-app reminders" but provides NO architecture for the notification system.

**Why This Is Critical:**
- Notifications are a core feature, not an afterthought
- No specification of how notifications are delivered
- No handling of notification preferences
- No strategy for notification persistence
- No mention of notification center or notification history

**Missing Details:**
- Where do notifications appear in the UI?
- How long do notifications persist?
- Can users dismiss notifications?
- What happens if a user misses a notification?
- How do we handle notification overload?
- What about email notifications (mentioned but not designed)?

**Recommendation:**
- Design a comprehensive notification system architecture
- Implement a notification center component
- Add notification preferences (per event type, delivery method, timing)
- Implement notification history and read/unread states
- Add notification batching to prevent spam
- Design email notification templates

---

### 1.8. Entity Linking Is Fragile

**Problem:** The polymorphic entity linking pattern (`entityType` + `entityId`) is fragile and will cause maintenance issues.

**Why This Is Critical:**
- No referential integrity enforcement (MySQL can't enforce polymorphic foreign keys)
- Orphaned events if entities are deleted
- No type safety in TypeScript for entity types
- String-based entity type matching is error-prone
- No validation that `entityId` actually exists

**Failure Scenarios:**
- Invoice #123 is deleted, but calendar event still references it
- Developer typos "order" as "Order" and events don't link
- Entity ID collision between different entity types
- No way to query "all events for this entity" efficiently

**Missing Details:**
- How do we handle cascade deletes?
- What's the validation strategy for entity types?
- How do we maintain referential integrity?
- What happens when an entity is soft-deleted?

**Recommendation:**
- Implement application-level referential integrity checks
- Add database triggers or constraints where possible
- Create a registry of valid entity types with TypeScript enums
- Implement cascade delete handling in application logic
- Add orphaned event cleanup background job
- Consider dedicated junction tables for high-volume entity types

---

### 1.9. No Error Handling Specification

**Problem:** The proposal mentions "error handling" in the quality checklist but provides NO specific error handling strategy.

**Why This Is Critical:**
- Calendar operations can fail in many ways (network, database, validation, conflicts)
- No specification of error messages or user feedback
- No handling of partial failures (e.g., event created but reminder failed)
- No retry logic for failed operations
- No error logging or monitoring strategy

**Missing Details:**
- What happens if event creation fails?
- How do we handle recurrence rule validation errors?
- What if a reminder fails to send?
- How do we communicate errors to users?
- What's the retry strategy for failed background jobs?

**Recommendation:**
- Define error types and error codes
- Implement comprehensive error handling in all tRPC endpoints
- Add user-friendly error messages with actionable guidance
- Implement retry logic with exponential backoff
- Add error logging and monitoring
- Design error recovery workflows

---

### 1.10. Timeline Estimates Are Unrealistic

**Problem:** The roadmap estimates 10-14 weeks total, which is overly optimistic for a feature of this complexity.

**Why This Is Critical:**
- No buffer for unexpected issues
- No time allocated for user testing and feedback iteration
- No time for performance optimization
- No time for comprehensive documentation
- Assumes zero bugs or rework

**Reality Check:**
- Phase 1 alone (database + backend + frontend + testing) is estimated at 4-6 weeks
- This assumes perfect execution with no blockers
- Real-world software projects typically take 2-3x initial estimates
- Calendar systems are notoriously complex (see: every calendar app ever built)

**Missing Considerations:**
- Time for design iterations based on user feedback
- Time for performance optimization and load testing
- Time for accessibility testing and improvements
- Time for cross-browser compatibility testing
- Time for mobile responsiveness refinement
- Time for documentation and training materials

**Recommendation:**
- Add 50-100% buffer to all timeline estimates
- Plan for at least 2-3 iteration cycles per phase
- Allocate dedicated time for testing and QA
- Include time for user feedback and iteration
- Plan for post-launch bug fixes and improvements
- Realistic timeline: 20-30 weeks for full implementation

---

### 1.11. No Scalability Analysis

**Problem:** The proposal claims the system will "scale to tens of thousands of events per user" but provides NO scalability analysis.

**Why This Is Critical:**
- No load testing plan
- No database query optimization strategy
- No caching architecture
- No CDN strategy for static assets
- No horizontal scaling plan

**Scalability Questions:**
- What happens when a user has 10,000 events?
- How do we handle 100 concurrent users viewing the calendar?
- What's the database query performance with 1M+ events?
- How do we handle peak load (e.g., end of month when everyone checks due dates)?

**Recommendation:**
- Conduct load testing with realistic data volumes
- Implement database query optimization (explain analyze)
- Add comprehensive caching strategy
- Implement pagination for large event lists
- Add database connection pooling
- Plan for read replicas if needed

---

## 2. HIGH PRIORITY ISSUES

### 2.1. No Mobile-First Design

**Problem:** The proposal mentions "responsive design" but doesn't prioritize mobile, which is critical for a calendar.

**Why This Matters:**
- Operations managers need to check schedules on the go
- Delivery drivers need to see their schedule on mobile
- Mobile calendar UX is fundamentally different from desktop

**Recommendation:**
- Design mobile-first, then scale up to desktop
- Implement native mobile gestures (swipe to navigate, pull to refresh)
- Optimize for one-handed use
- Add offline support for mobile

---

### 2.2. No Search Functionality

**Problem:** No mention of calendar search, which is essential for finding specific events.

**Why This Matters:**
- Users need to find "that meeting with Client X"
- Need to search by entity (e.g., "all events for Order #123")
- Need to search by date range, participant, or keyword

**Recommendation:**
- Implement full-text search across event titles and descriptions
- Add advanced search filters (date range, entity type, participants)
- Add search suggestions and autocomplete
- Implement search result highlighting

---

### 2.3. No Event Templates

**Problem:** Users will repeatedly create similar events (e.g., weekly team meetings, monthly audits).

**Why This Matters:**
- Reduces data entry for common event types
- Ensures consistency in event creation
- Improves user efficiency

**Recommendation:**
- Implement event templates with pre-filled fields
- Add template library (personal + organization-wide)
- Allow saving custom templates
- Add quick-create buttons for common event types

---

### 2.4. No Bulk Operations

**Problem:** No way to perform bulk operations on events (delete, reschedule, update).

**Why This Matters:**
- Users may need to cancel all events for a vendor
- May need to reschedule all events in a date range
- May need to bulk-update event properties

**Recommendation:**
- Implement multi-select for events
- Add bulk actions (delete, reschedule, update status, change assignee)
- Add bulk recurrence editing
- Implement undo for bulk operations

---

### 2.5. No Event History or Audit Trail

**Problem:** No tracking of event changes, which is critical for accountability.

**Why This Matters:**
- Need to know who changed an event and when
- Need to track event status changes
- Need to recover from accidental deletions or changes

**Recommendation:**
- Implement event change history table
- Track all modifications (created, updated, deleted, rescheduled)
- Add event version history
- Implement event restoration from history

---

### 2.6. No Integration with Existing Notifications

**Problem:** TERP likely has an existing notification system, but the calendar proposes a separate one.

**Why This Matters:**
- Users will receive notifications from multiple systems
- Inconsistent notification UX
- Duplicate notification infrastructure

**Recommendation:**
- Integrate with existing TERP notification system
- Use consistent notification patterns
- Consolidate notification preferences
- Avoid building redundant infrastructure

---

### 2.7. No Consideration for Recurring Order Integration

**Problem:** The proposal mentions recurring orders but doesn't detail the integration.

**Why This Matters:**
- Recurring orders are a core TERP feature
- Need tight integration between recurring orders and calendar
- Need to handle order modifications and cancellations

**Recommendation:**
- Design detailed integration between `recurringOrders` table and calendar
- Auto-sync changes to recurring orders with calendar events
- Handle order cancellations and modifications
- Add visual distinction for recurring order events

---

### 2.8. No Handling of All-Day vs. Timed Events in UI

**Problem:** The schema supports all-day events, but no UI specification for how they're displayed differently.

**Why This Matters:**
- All-day events should appear differently in calendar views
- Need different UX for creating all-day vs. timed events
- Need to handle all-day events across timezones

**Recommendation:**
- Design distinct UI for all-day events (banner at top of day)
- Add toggle for all-day in event form
- Handle all-day events in timezone-aware way
- Add visual distinction in all calendar views

---

### 2.9. No Event Attachments or Rich Content

**Problem:** Events can only have text descriptions, no attachments or rich content.

**Why This Matters:**
- Users may want to attach documents to events (e.g., meeting agendas)
- May want to link to external resources
- May want to add images or files

**Recommendation:**
- Add event attachments table
- Support file uploads for events
- Add rich text editor for event descriptions
- Support links and embedded content

---

## 3. MEDIUM PRIORITY ISSUES

### 3.1. No Keyboard Shortcuts

**Problem:** Power users will want keyboard shortcuts for common actions.

**Recommendation:**
- Implement keyboard shortcuts (e.g., `n` for new event, `t` for today)
- Add keyboard shortcut help modal
- Ensure full keyboard navigation support

---

### 3.2. No Print/Export Functionality

**Problem:** Users may want to print their calendar or export to PDF.

**Recommendation:**
- Add print-friendly calendar view
- Implement PDF export
- Add iCal export for external calendar integration

---

### 3.3. No Event Color Customization

**Problem:** Events are color-coded by module, but users can't customize colors.

**Recommendation:**
- Allow users to customize event colors
- Add color picker to event form
- Support color-coding by multiple dimensions (module, type, priority)

---

### 3.4. No Event Duplication

**Problem:** No way to duplicate an event to create a similar one.

**Recommendation:**
- Add "Duplicate Event" action
- Pre-fill form with duplicated event data
- Allow bulk duplication

---

### 3.5. No Event Sharing

**Problem:** No way to share events with external parties (e.g., clients, vendors).

**Recommendation:**
- Add event sharing functionality
- Generate shareable links
- Support adding external participants via email

---

### 3.6. No Calendar Sync Status

**Problem:** No indication of when calendar data was last synced or if there are sync issues.

**Recommendation:**
- Add sync status indicator
- Show last sync time
- Add manual refresh button
- Implement optimistic UI updates

---

### 3.7. No Event Categories Beyond Module

**Problem:** Events can only be categorized by module and event type, which may not be sufficient.

**Recommendation:**
- Add custom event categories/tags
- Support multiple categories per event
- Add category-based filtering
- Implement category management UI

---

## 4. ARCHITECTURAL IMPROVEMENTS

### 4.1. Recommended Schema Changes

**Add Event History Table:**
```typescript
export const calendarEventHistory = mysqlTable("calendarEventHistory", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull().references(() => calendarEvents.id),
  changeType: mysqlEnum("changeType", ["CREATED", "UPDATED", "DELETED", "RESCHEDULED"]).notNull(),
  changedBy: int("changedBy").notNull().references(() => users.id),
  changedAt: timestamp("changedAt").defaultNow().notNull(),
  previousData: json("previousData").$type<Partial<CalendarEvent>>(),
  newData: json("newData").$type<Partial<CalendarEvent>>(),
});
```

**Add Materialized Recurrence Instances:**
```typescript
export const calendarRecurrenceInstances = mysqlTable("calendarRecurrenceInstances", {
  id: int("id").autoincrement().primaryKey(),
  parentEventId: int("parentEventId").notNull().references(() => calendarEvents.id),
  instanceDate: date("instanceDate").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  status: mysqlEnum("status", ["SCHEDULED", "MODIFIED", "CANCELLED"]).default("SCHEDULED").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  parentDateIdx: index("idx_parent_date").on(table.parentEventId, table.instanceDate),
}));
```

**Add Event Attachments:**
```typescript
export const calendarEventAttachments = mysqlTable("calendarEventAttachments", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull().references(() => calendarEvents.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  url: varchar("url", { length: 1000 }).notNull(),
  fileSize: int("fileSize").notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  uploadedBy: int("uploadedBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

### 4.2. Recommended API Improvements

**Add Batch Operations Endpoint:**
```typescript
bulkUpdateEvents: protectedProcedure
  .input(z.object({
    eventIds: z.array(z.number()),
    updates: z.object({
      status: z.enum([...]).optional(),
      assignedTo: z.number().optional(),
      // ... other fields
    }),
  }))
  .mutation(async ({ input, ctx }) => {
    // Bulk update with transaction
  }),
```

**Add Search Endpoint:**
```typescript
searchEvents: protectedProcedure
  .input(z.object({
    query: z.string(),
    filters: z.object({
      dateRange: z.object({ start: z.string(), end: z.string() }).optional(),
      modules: z.array(z.string()).optional(),
      entityType: z.string().optional(),
    }).optional(),
  }))
  .query(async ({ input, ctx }) => {
    // Full-text search implementation
  }),
```

---

## 5. TESTING GAPS

The proposal mentions testing but lacks specifics:

**Missing Test Coverage:**
- No unit test specifications for complex logic (recurrence expansion, conflict detection)
- No integration test plan for cross-module interactions
- No end-to-end test scenarios
- No performance test benchmarks
- No accessibility testing plan
- No security testing plan

**Recommendation:**
- Define test coverage targets (>80% for critical paths)
- Create comprehensive test plan document
- Implement automated testing pipeline
- Add visual regression testing
- Conduct security penetration testing

---

## 6. DOCUMENTATION GAPS

**Missing Documentation:**
- No user documentation plan
- No API documentation strategy
- No developer onboarding guide for calendar system
- No troubleshooting guide
- No FAQ for common issues

**Recommendation:**
- Create comprehensive user guide with screenshots
- Generate API documentation from tRPC schema
- Write developer documentation for calendar architecture
- Create video tutorials for key workflows
- Build troubleshooting knowledge base

---

## 7. REVISED RECOMMENDATIONS

### 7.1. Pre-Implementation Requirements

Before starting Phase 1, the following MUST be completed:

1. **Permission System Design** - Complete RBAC specification
2. **Migration Strategy** - Detailed migration and rollback plan
3. **Notification Architecture** - Complete notification system design
4. **Performance Baseline** - Establish performance benchmarks
5. **Error Handling Strategy** - Define error types and handling
6. **Timezone Strategy** - Comprehensive timezone handling plan

### 7.2. Revised Timeline

**Phase 0: Foundation (3-4 weeks)**
- Permission system implementation
- Notification system architecture
- Migration strategy and tooling
- Performance testing framework
- Error handling framework

**Phase 1: MVP (6-8 weeks)** - Original scope + fixes
**Phase 2: Enhanced (5-6 weeks)** - Original scope + improvements
**Phase 3: Advanced (5-6 weeks)** - Original scope + polish

**Total Realistic Timeline: 19-24 weeks**

### 7.3. Success Criteria Revisions

Add the following success criteria:

- **Performance:** Calendar views load in <1 second with 10,000 events
- **Reliability:** <0.1% error rate on event operations
- **Accessibility:** WCAG 2.1 AA compliance
- **Mobile:** >50% of calendar usage on mobile devices
- **Adoption:** >70% of users actively using calendar within 6 months

---

## 8. CONCLUSION

The calendar feature proposal is **conceptually sound but operationally incomplete**. The core architecture and integration strategy are well-designed, but critical implementation details are missing. The most concerning gaps are:

1. Lack of permission system design
2. No data migration strategy
3. Superficial timezone handling
4. Performance concerns with recurrence expansion
5. Unrealistic timeline estimates

**Recommendation:** Do NOT proceed with implementation until the critical issues (Section 1) are addressed. The feature has significant potential value, but rushing into implementation with these gaps will result in a fragile, hard-to-maintain system that may need to be rebuilt.

**Estimated Effort to Address Critical Issues:** 3-4 weeks of additional design and planning work.

**Overall Assessment:** The proposal needs substantial strengthening before implementation. With the recommended improvements, this could be a world-class calendar system. Without them, it will be a maintenance nightmare.
