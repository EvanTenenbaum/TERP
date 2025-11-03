# Calendar System Research Findings

**Date:** November 03, 2025  
**Purpose:** Research-based insights to strengthen TERP calendar design

---

## Key Findings from Industry Research

### 1. Recurring Event Management (Red Gate, 2016)

The Red Gate article identifies two fundamental approaches to recurring events:

**Naive Approach:** Store all instances as separate rows
- **Pros:** Simple to implement
- **Cons:** 
  - Massive storage requirements
  - Messy update process (must update all instances)
  - Exception handling becomes complex
  - Performance degrades with large datasets

**Expert Approach:** Store pattern + generate instances programmatically
- **Pros:**
  - Minimal storage (one pattern record)
  - Easy updates (change pattern, not instances)
  - Clean exception handling
- **Cons:**
  - More complex implementation
  - Requires careful pattern design
  - Must handle edge cases (holidays, conflicts)

**Critical Insight:** The TERP proposal uses a hybrid approach (store pattern, expand at query time) which has the WORST of both worlds:
- Complex implementation like expert approach
- Poor performance like naive approach (computing on every query)
- No caching strategy mentioned

**Recommendation:** Implement materialized instances table with background job to pre-compute instances for next 90-180 days.

---

### 2. Timezone Handling (W3C, 2025)

The W3C timezone guidelines identify critical concepts:

**Ghost Time:** Wall time that can never exist due to DST transitions
- Example: 2:30 AM on DST spring-forward day doesn't exist
- TERP proposal doesn't address this at all

**Ambiguous Time:** Wall time that occurs twice due to DST fall-back
- Example: 1:30 AM occurs twice on DST fall-back day
- TERP proposal doesn't handle this

**Floating Time:** Time values that aren't tied to a specific timezone
- Example: "9 AM wherever you are"
- Needed for all-day events and location-independent events
- TERP proposal mentions all-day events but no floating time implementation

**Field-Based vs. Incremental Time:**
- **Incremental:** Seconds since epoch (UTC timestamp) - good for past events
- **Field-Based:** Year/month/day/hour/minute/timezone - REQUIRED for future events
- **Critical W3C Guidance:** "The advice you read about always storing everything in UTC does not apply to scheduling future events. You should use the local time of the event instead."

**Why This Matters for TERP:**
- TERP proposal says "store in UTC" which is WRONG for future events
- A meeting scheduled for "9 AM Pacific" should store "9 AM Pacific", not the UTC equivalent
- If timezone rules change (DST laws, etc.), UTC-stored events will show wrong times
- Recurring events MUST store field-based time + timezone identifier

**Recommendation:** Store events as field-based time with timezone identifier (IANA timezone name), not UTC timestamps.

---

### 3. Common Calendar System Failure Modes

Based on research and real-world examples:

**Failure Mode 1: DST Transition Bugs**
- Recurring events that "skip" or "duplicate" during DST transitions
- Events that show at wrong times after DST change
- All-day events that appear on wrong day due to timezone conversion

**Failure Mode 2: Timezone Rule Changes**
- Government changes DST rules or timezone definitions
- Events scheduled before change show at wrong time after change
- No mechanism to update affected events

**Failure Mode 3: Performance Degradation**
- Calendar becomes unusable with >1000 events
- Recurrence expansion takes seconds instead of milliseconds
- Database queries timeout with complex filters

**Failure Mode 4: Data Integrity Issues**
- Orphaned events when linked entities are deleted
- Duplicate events created by race conditions
- Lost events due to failed transactions

**Failure Mode 5: User Confusion**
- Unclear timezone display ("What timezone is this event in?")
- Confusing recurrence editing ("Am I editing this instance or all instances?")
- No indication of conflicts or overlaps

---

## Specific Issues in TERP Proposal

### Issue 1: UTC Storage for Future Events

**Problem:** Proposal says "all times stored in UTC"

**Why This Is Wrong:**
- Future events should store local time + timezone identifier
- Timezone rules can change (DST laws, timezone definitions)
- UTC conversion should happen at display time, not storage time

**Example Failure:**
- Schedule meeting for "9 AM Pacific" on June 1, 2026
- Store as UTC: "2026-06-01T16:00:00Z" (assuming PDT)
- California abolishes DST in 2026
- Event now shows at 8 AM Pacific (wrong!)

**Correct Approach:**
- Store: `{date: "2026-06-01", time: "09:00:00", timezone: "America/Los_Angeles"}`
- Convert to UTC at display time using current timezone rules

---

### Issue 2: No Materialized Instances

**Problem:** Proposal expands recurring events at query time

**Why This Is Wrong:**
- Every calendar page load requires expensive computation
- No way to efficiently query "all events in date range" with recurrence
- Can't handle exceptions efficiently
- Can't detect conflicts without expanding all events

**Correct Approach:**
- Background job materializes instances for next 90-180 days
- Store materialized instances in separate table
- Mark instances as "generated" vs "modified"
- Regenerate when parent event changes

---

### Issue 3: No Exception Handling Strategy

**Problem:** Proposal mentions "exceptionDates" array but no implementation details

**Why This Is Wrong:**
- What happens when you reschedule one instance of a recurring event?
- What happens when you delete one instance?
- How do you track modifications to individual instances?
- How do you handle "edit this and all future instances"?

**Correct Approach:**
- Separate table for event instance exceptions
- Track: rescheduled, cancelled, modified instances
- Link exceptions to parent event
- When editing parent, preserve or update exceptions based on user choice

---

### Issue 4: No Conflict Detection Algorithm

**Problem:** Proposal mentions "conflict detection" but provides no algorithm

**Why This Is Wrong:**
- Detecting conflicts with recurring events is complex
- Must expand both events and check for overlaps
- Must consider timezone differences
- Must handle partial overlaps

**Correct Approach:**
- Materialize instances first
- Query for overlapping instances in same timezone
- Consider resource conflicts (same room, same person)
- Provide conflict severity levels (hard conflict vs. soft warning)

---

### Issue 5: No Timezone Change Handling

**Problem:** No strategy for handling timezone rule changes

**Why This Is Wrong:**
- Timezone rules change frequently (DST laws, timezone definitions)
- Events scheduled before change may show at wrong time after change
- No mechanism to notify users of affected events

**Correct Approach:**
- Store timezone identifier (IANA name), not offset
- Use timezone database (tzdata) for conversions
- Implement timezone rule update mechanism
- Notify users when their events are affected by timezone changes

---

## Recommended Architectural Changes

### 1. Event Time Storage

**Current Proposal:**
```typescript
startTime: timestamp("startTime").notNull(),
endTime: timestamp("endTime").notNull(),
```

**Improved Design:**
```typescript
// For all-day events, these are null
startDate: date("startDate").notNull(),
endDate: date("endDate").notNull(),

// For timed events
startTime: time("startTime"), // Local time, nullable
endTime: time("endTime"), // Local time, nullable

// Timezone (IANA identifier)
timezone: varchar("timezone", { length: 50 }), // e.g., "America/Los_Angeles"

// For floating time events (all-day, location-independent)
isFloatingTime: boolean("isFloatingTime").default(false),
```

### 2. Materialized Instances Table

**Add New Table:**
```typescript
export const calendarRecurrenceInstances = mysqlTable("calendarRecurrenceInstances", {
  id: int("id").autoincrement().primaryKey(),
  parentEventId: int("parentEventId").notNull().references(() => calendarEvents.id, { onDelete: "cascade" }),
  
  // Instance-specific data
  instanceDate: date("instanceDate").notNull(),
  startTime: time("startTime"),
  endTime: time("endTime"),
  timezone: varchar("timezone", { length: 50 }),
  
  // Instance status
  status: mysqlEnum("status", ["GENERATED", "MODIFIED", "CANCELLED"]).default("GENERATED").notNull(),
  
  // If modified, store the modifications
  modifiedTitle: varchar("modifiedTitle", { length: 255 }),
  modifiedDescription: text("modifiedDescription"),
  modifiedLocation: varchar("modifiedLocation", { length: 255 }),
  
  // Metadata
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  modifiedAt: timestamp("modifiedAt"),
  modifiedBy: int("modifiedBy").references(() => users.id),
}, (table) => ({
  parentDateIdx: index("idx_parent_date").on(table.parentEventId, table.instanceDate),
  dateRangeIdx: index("idx_date_range").on(table.instanceDate, table.startTime),
}));
```

### 3. Background Job for Instance Generation

**Service:** `/server/services/instanceGenerationService.ts`

**Responsibilities:**
- Run every 24 hours
- Generate instances for next 90-180 days for all recurring events
- Delete instances older than 30 days (keep for history)
- Regenerate instances when parent event changes
- Handle exceptions and modifications

### 4. Timezone Handling Service

**Service:** `/server/services/timezoneService.ts`

**Responsibilities:**
- Convert between timezones using tzdata
- Handle DST transitions (ghost time, ambiguous time)
- Validate timezone identifiers
- Detect timezone rule changes
- Provide user-friendly timezone display

### 5. Conflict Detection Service

**Service:** `/server/services/conflictDetectionService.ts`

**Responsibilities:**
- Query materialized instances for overlaps
- Consider timezone differences
- Handle resource conflicts
- Provide conflict severity levels
- Suggest alternative times

---

## Performance Considerations

### Query Optimization

**Bad:** Expand recurrence at query time
```sql
-- This is what the current proposal would do
SELECT * FROM calendarEvents WHERE ...
-- Then expand each recurring event in application code
-- Performance: O(n * m) where n = events, m = instances per event
```

**Good:** Query materialized instances
```sql
-- With materialized instances table
SELECT * FROM calendarRecurrenceInstances 
WHERE instanceDate BETWEEN ? AND ?
AND status != 'CANCELLED'
-- Performance: O(log n) with proper indexes
```

### Caching Strategy

**Cache Layers:**
1. **Database Query Cache:** Cache frequent queries (today's events, this week's events)
2. **Application Cache:** Cache expanded instances for active users
3. **Client Cache:** Cache calendar views in browser localStorage

**Cache Invalidation:**
- Invalidate when parent event changes
- Invalidate when instance is modified
- Invalidate when timezone rules change

---

## Testing Requirements

### Timezone Testing

**Test Cases:**
- DST spring-forward (ghost time)
- DST fall-back (ambiguous time)
- Timezone rule changes
- Cross-timezone events
- All-day events across timezones
- Floating time events

### Recurrence Testing

**Test Cases:**
- Daily, weekly, monthly, yearly patterns
- Complex patterns (every 2nd Tuesday)
- Recurrence with exceptions
- Recurrence with end date
- Recurrence with max occurrences
- Editing single instance
- Editing all future instances

### Performance Testing

**Benchmarks:**
- Load calendar with 10,000 events in <1 second
- Expand recurring event with 1000 instances in <100ms
- Detect conflicts across 100 events in <500ms
- Generate instances for 1000 recurring events in <5 seconds (background job)

---

## Conclusion

The TERP calendar proposal has solid conceptual foundation but critical implementation gaps:

1. **Wrong timezone approach** - storing UTC instead of local time + timezone
2. **Performance issues** - expanding at query time instead of materializing
3. **No exception handling** - unclear how to modify individual instances
4. **No conflict detection algorithm** - mentioned but not designed
5. **No timezone change handling** - will break when timezone rules change

These issues are not minor - they will cause real-world failures and user frustration. The research clearly shows that calendar systems are deceptively complex, and shortcuts lead to bugs.

**Recommendation:** Implement the architectural changes outlined above before proceeding with development.
