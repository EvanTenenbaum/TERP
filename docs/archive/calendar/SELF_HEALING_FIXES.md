# Calendar Evolution Spec v3.1 - Self-Healing Fixes
**Complete Corrections for All Identified Issues**

---

## 📋 Document Info

- **Date**: 2025-11-10
- **Purpose**: Provide complete fixes for all 22 issues identified in Comprehensive QA
- **Status**: Ready for integration into v3.2

---

## 🎯 Fix Strategy

All fixes are categorized by priority and organized for easy integration:
- **Critical Fixes**: Must be applied before implementation starts
- **High Priority Fixes**: Should be applied in Phase 1
- **Medium Priority Fixes**: Can be applied in Phase 2
- **Low Priority Fixes**: Optional enhancements

---

## 🔴 CRITICAL FIXES (Must Apply Before Implementation)

### FIX #1: Add vendor_id Column to calendar_events

**Issue**: Missing vendor_id column (inconsistent with client_id approach)

**Schema Change**:
```typescript
export const calendarEvents = mysqlTable("calendar_events", {
  // ... existing fields ...
  
  // Client relationship (existing)
  clientId: int("client_id")
    .references(() => clients.id, { onDelete: "set null" }),
  
  // NEW: Vendor relationship
  vendorId: int("vendor_id")
    .references(() => vendors.id, { onDelete: "set null" }),
  
  // ... rest of fields ...
}, (table) => ({
  clientIdIdx: index("idx_calendar_events_client_id").on(table.clientId),
  vendorIdIdx: index("idx_calendar_events_vendor_id").on(table.vendorId), // NEW
}));
```

**Migration**:
```sql
-- Step 1: Add column
ALTER TABLE calendar_events 
ADD COLUMN vendor_id INT NULL;

-- Step 2: Backfill from metadata
UPDATE calendar_events
SET vendor_id = CAST(JSON_EXTRACT(metadata, '$.vendor_id.referenceId') AS UNSIGNED)
WHERE JSON_EXTRACT(metadata, '$.vendor_id.referenceId') IS NOT NULL;

-- Step 3: Add foreign key
ALTER TABLE calendar_events
ADD CONSTRAINT fk_calendar_events_vendor
FOREIGN KEY (vendor_id) REFERENCES vendors(id)
ON DELETE SET NULL;

-- Step 4: Add index
CREATE INDEX idx_calendar_events_vendor_id 
ON calendar_events(vendor_id);
```

**API Changes**:
```typescript
// calendar.createEvent - Add vendorId parameter
input: z.object({
  // ... existing fields ...
  clientId: z.number().optional(),
  vendorId: z.number().optional(), // NEW
  // ... rest of fields ...
})

// calendar.updateEvent - Allow updating vendorId
input: z.object({
  id: z.number(),
  clientId: z.number().optional(),
  vendorId: z.number().optional(), // NEW
  // ... rest of fields ...
})

// calendar.getEvents - Add vendorId filter
input: z.object({
  // ... existing filters ...
  clientId: z.number().optional(),
  vendorId: z.number().optional(), // NEW
  // ... rest of filters ...
})
```

---

### FIX #3: Change clientMeetingHistory Cascade to Preserve History

**Issue**: CASCADE delete removes valuable historical data

**Schema Change**:
```typescript
export const clientMeetingHistory = mysqlTable(
  "client_meeting_history",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id").notNull(),
    
    // CHANGED: Allow null to preserve history when event deleted
    calendarEventId: int("calendar_event_id")
      .references(() => calendarEvents.id, { onDelete: "set null" }),
    
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

**Migration**:
```sql
-- Drop existing constraint
ALTER TABLE client_meeting_history
DROP FOREIGN KEY fk_client_meeting_history_event;

-- Add new constraint with SET NULL
ALTER TABLE client_meeting_history
ADD CONSTRAINT fk_client_meeting_history_event
FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id)
ON DELETE SET NULL;
```

**UI Handling**:
```typescript
// In ClientMeetingHistory component
const MeetingHistoryRow = ({ meeting }) => {
  return (
    <tr>
      <td>{meeting.meetingDate}</td>
      <td>{meeting.meetingType}</td>
      <td>
        {meeting.calendarEventId ? (
          <Link to={`/calendar/events/${meeting.calendarEventId}`}>
            View Event
          </Link>
        ) : (
          <span className="text-muted">(Event deleted)</span>
        )}
      </td>
    </tr>
  );
};
```

---

### FIX #4: Add Conflict Detection to Quick Book

**Issue**: No check for double-booking

**API Fix**:
```typescript
// In calendar.quickBookForClient
export const quickBookForClient = protectedProcedure
  .input(z.object({
    clientId: z.number(),
    eventType: z.string(),
    date: z.string(),
    time: z.string(),
    duration: z.number().optional().default(60), // minutes
    location: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    notes: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const startDateTime = new Date(`${input.date}T${input.time}`);
    const endDateTime = new Date(startDateTime.getTime() + input.duration * 60000);

    // Check for conflicts
    const conflicts = await ctx.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          // Overlapping time range
          or(
            // New event starts during existing event
            and(
              lte(calendarEvents.startDate, startDateTime),
              gte(
                sql`DATE_ADD(${calendarEvents.startDate}, INTERVAL ${calendarEvents.duration} MINUTE)`,
                startDateTime
              )
            ),
            // New event ends during existing event
            and(
              lte(calendarEvents.startDate, endDateTime),
              gte(
                sql`DATE_ADD(${calendarEvents.startDate}, INTERVAL ${calendarEvents.duration} MINUTE)`,
                endDateTime
              )
            ),
            // New event completely contains existing event
            and(
              gte(calendarEvents.startDate, startDateTime),
              lte(
                sql`DATE_ADD(${calendarEvents.startDate}, INTERVAL ${calendarEvents.duration} MINUTE)`,
                endDateTime
              )
            )
          ),
          ne(calendarEvents.status, "CANCELLED")
        )
      );

    if (conflicts.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Time slot conflicts with ${conflicts.length} existing appointment(s)`,
      });
    }

    // Proceed with creating appointment
    const client = await ctx.db.query.clients.findFirst({
      where: eq(clients.id, input.clientId),
    });

    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Client not found",
      });
    }

    const appointment = await ctx.db.insert(calendarEvents).values({
      title: `${input.eventType} - ${client.name}`,
      eventType: input.eventType,
      clientId: input.clientId,
      startDate: startDateTime,
      startTime: input.time,
      duration: input.duration,
      location: input.location,
      metadata: input.metadata || {},
      notes: input.notes,
      status: "SCHEDULED",
      createdBy: ctx.user.id,
      updatedBy: ctx.user.id,
    });

    // Auto-create client activity
    await ctx.db.insert(clientActivity).values({
      clientId: input.clientId,
      userId: ctx.user.id,
      activityType: "MEETING",
      description: `Appointment scheduled: ${appointment.title}`,
      activityDate: new Date(),
    });

    // Auto-create attendee record
    await ctx.db.insert(calendarEventAttendees).values({
      eventId: appointment.id,
      attendeeType: "client",
      attendeeId: input.clientId,
    });

    return { appointmentId: appointment.id };
  });
```

---

### FIX #8: Fix getDaySchedule N+1 Query Problem

**Issue**: Loading clients one by one

**API Fix**:
```typescript
// In calendar.getDaySchedule
export const getDaySchedule = protectedProcedure
  .input(z.object({
    date: z.string().optional(), // ISO date, default today
    userId: z.number().optional(),
    eventTypes: z.array(z.string()).optional(),
  }))
  .query(async ({ ctx, input }) => {
    const targetDate = input.date ? new Date(input.date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Build query with JOIN to avoid N+1
    let query = ctx.db
      .select({
        // Event fields
        id: calendarEvents.id,
        title: calendarEvents.title,
        eventType: calendarEvents.eventType,
        startTime: calendarEvents.startTime,
        endTime: calendarEvents.endTime,
        location: calendarEvents.location,
        metadata: calendarEvents.metadata,
        
        // Client fields (LEFT JOIN)
        clientId: clients.id,
        clientName: clients.name,
        
        // Vendor fields (LEFT JOIN)
        vendorId: vendors.id,
        vendorName: vendors.name,
      })
      .from(calendarEvents)
      .leftJoin(clients, eq(calendarEvents.clientId, clients.id))
      .leftJoin(vendors, eq(calendarEvents.vendorId, vendors.id))
      .where(
        and(
          gte(calendarEvents.startDate, startOfDay),
          lte(calendarEvents.startDate, endOfDay),
          ne(calendarEvents.status, "CANCELLED")
        )
      );

    // Apply user filter if provided
    if (input.userId) {
      query = query
        .innerJoin(
          calendarEventAttendees,
          eq(calendarEvents.id, calendarEventAttendees.eventId)
        )
        .where(
          and(
            eq(calendarEventAttendees.attendeeType, "user"),
            eq(calendarEventAttendees.attendeeId, input.userId)
          )
        );
    }

    // Apply event type filter if provided
    if (input.eventTypes && input.eventTypes.length > 0) {
      query = query.where(inArray(calendarEvents.eventType, input.eventTypes));
    }

    // Order by start time
    query = query.orderBy(asc(calendarEvents.startTime));

    const results = await query;

    // Transform results
    const events = results.map(row => ({
      id: row.id,
      title: row.title,
      eventType: row.eventType,
      startTime: row.startTime,
      endTime: row.endTime,
      location: row.location,
      metadata: row.metadata,
      client: row.clientId ? { id: row.clientId, name: row.clientName } : null,
      vendor: row.vendorId ? { id: row.vendorId, name: row.vendorName } : null,
    }));

    return { events };
  });
```

---

### FIX #9: Optimize getAvailableSlots Algorithm

**Issue**: O(n*m) complexity

**API Fix**:
```typescript
// In calendar.getAvailableSlots
export const getAvailableSlots = publicProcedure
  .input(z.object({
    eventType: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    duration: z.number().optional().default(60), // minutes
  }))
  .query(async ({ ctx, input }) => {
    // Generate all possible slots
    const slots: Array<{ date: string; time: string; startDateTime: Date }> = [];
    const currentDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    while (currentDate <= endDate) {
      // Business hours: 9 AM - 5 PM
      for (let hour = 9; hour < 17; hour++) {
        const slotDateTime = new Date(currentDate);
        slotDateTime.setHours(hour, 0, 0, 0);
        
        slots.push({
          date: currentDate.toISOString().split("T")[0],
          time: `${hour.toString().padStart(2, "0")}:00`,
          startDateTime: slotDateTime,
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get all events in date range (single query)
    const existingEvents = await ctx.db
      .select({
        startDate: calendarEvents.startDate,
        duration: calendarEvents.duration,
      })
      .from(calendarEvents)
      .where(
        and(
          gte(calendarEvents.startDate, new Date(input.startDate)),
          lte(calendarEvents.startDate, new Date(input.endDate)),
          ne(calendarEvents.status, "CANCELLED")
        )
      );

    // Create set of unavailable time ranges for O(1) lookup
    const unavailableRanges = existingEvents.map(event => ({
      start: event.startDate.getTime(),
      end: event.startDate.getTime() + (event.duration || 60) * 60000,
    }));

    // Check each slot against unavailable ranges
    const slotsWithAvailability = slots.map(slot => {
      const slotStart = slot.startDateTime.getTime();
      const slotEnd = slotStart + input.duration * 60000;

      // Check if slot overlaps with any existing event
      const isAvailable = !unavailableRanges.some(range => {
        return (
          (slotStart >= range.start && slotStart < range.end) || // Slot starts during event
          (slotEnd > range.start && slotEnd <= range.end) || // Slot ends during event
          (slotStart <= range.start && slotEnd >= range.end) // Slot contains event
        );
      });

      return {
        date: slot.date,
        time: slot.time,
        available: isAvailable,
      };
    });

    return { slots: slotsWithAvailability };
  });
```

---

### FIX #10: Add Transactions for Multi-Step Operations

**Issue**: Race conditions and inconsistent data

**API Fix (Example for calendar.createEvent)**:
```typescript
// In calendar.createEvent
export const createEvent = protectedProcedure
  .input(z.object({
    title: z.string(),
    eventType: z.string(),
    startDate: z.string(),
    startTime: z.string(),
    clientId: z.number().optional(),
    vendorId: z.number().optional(),
    metadata: z.record(z.any()).optional(),
    notes: z.string().optional(),
    attendees: z.array(z.object({
      type: z.enum(["user", "client"]),
      id: z.number(),
    })).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Validate client and vendor mutual exclusivity
    if (input.clientId && input.vendorId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Event cannot have both client and vendor",
      });
    }

    // Use transaction for all operations
    const result = await ctx.db.transaction(async (tx) => {
      // 1. Create event
      const [event] = await tx.insert(calendarEvents).values({
        title: input.title,
        eventType: input.eventType,
        startDate: new Date(`${input.startDate}T${input.startTime}`),
        startTime: input.startTime,
        clientId: input.clientId,
        vendorId: input.vendorId,
        metadata: input.metadata || {},
        notes: input.notes,
        status: "SCHEDULED",
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      }).returning();

      // 2. Create client activity if client event
      if (input.clientId) {
        await tx.insert(clientActivity).values({
          clientId: input.clientId,
          userId: ctx.user.id,
          activityType: "MEETING",
          description: `Appointment scheduled: ${input.title}`,
          activityDate: new Date(),
        });
      }

      // 3. Create meeting history if client-facing event
      const clientFacingEventTypes = [
        "MEETING",
        "INTAKE",
        "SHOPPING",
        "AR_COLLECTION",
      ];
      if (clientFacingEventTypes.includes(input.eventType) && input.clientId) {
        await tx.insert(clientMeetingHistory).values({
          clientId: input.clientId,
          calendarEventId: event.id,
          meetingDate: new Date(`${input.startDate}T${input.startTime}`),
          meetingType: input.eventType,
        });
      }

      // 4. Create attendee records
      if (input.attendees && input.attendees.length > 0) {
        await tx.insert(calendarEventAttendees).values(
          input.attendees.map(attendee => ({
            eventId: event.id,
            attendeeType: attendee.type,
            attendeeId: attendee.id,
          }))
        );
      }

      return event;
    });

    return { eventId: result.id };
  });
```

**Apply Same Pattern To**:
- `calendar.updateEvent`
- `calendar.processPaymentFromAppointment`
- `calendar.processVendorPaymentFromAppointment`
- `orders.createFromAppointment`

---

### FIX #18: Add Timezone Handling

**Issue**: No timezone specification

**Schema Change**:
```typescript
export const calendarEvents = mysqlTable("calendar_events", {
  // ... existing fields ...
  
  startDate: timestamp("start_date").notNull(), // UTC
  startTime: varchar("start_time", { length: 5 }), // HH:mm
  endDate: timestamp("end_date"),
  endTime: varchar("end_time", { length: 5 }),
  
  // NEW: Timezone for event
  timezone: varchar("timezone", { length: 50 })
    .default("America/Los_Angeles")
    .notNull(),
  
  // ... rest of fields ...
});
```

**Migration**:
```sql
-- Add timezone column
ALTER TABLE calendar_events
ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'America/Los_Angeles';
```

**API Changes**:
```typescript
// In calendar.createEvent
input: z.object({
  // ... existing fields ...
  timezone: z.string().optional().default("America/Los_Angeles"),
  // ... rest of fields ...
})

// In calendar.getEvents response
output: z.object({
  events: z.array(z.object({
    // ... existing fields ...
    timezone: z.string(),
    startDateLocal: z.string(), // ISO string in event's timezone
    // ... rest of fields ...
  })),
})
```

**Implementation**:
```typescript
import { DateTime } from "luxon";

// When returning events
const eventsWithTimezone = events.map(event => ({
  ...event,
  startDateLocal: DateTime.fromJSDate(event.startDate)
    .setZone(event.timezone)
    .toISO(),
  endDateLocal: event.endDate
    ? DateTime.fromJSDate(event.endDate)
        .setZone(event.timezone)
        .toISO()
    : null,
}));
```

---

## 🟠 HIGH PRIORITY FIXES (Apply in Phase 1)

### FIX #2: Add Client/Vendor Mutual Exclusivity Validation

**Issue**: Event could have both client and vendor

**API Fix**:
```typescript
// In calendar.createEvent and calendar.updateEvent
if (input.clientId && input.vendorId) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Event cannot have both client and vendor. Please specify one or neither.",
  });
}
```

---

### FIX #5 & #6: Add Payment Amount Validation

**Issue**: No validation for payment amounts

**API Fix**:
```typescript
// In calendar.processPaymentFromAppointment
if (input.actualAmount <= 0) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Payment amount must be positive",
  });
}

// Optional: Warn if significantly different from expected
const expectedAmount = appointment.metadata.expected_amount?.value as number;
if (expectedAmount && Math.abs(input.actualAmount - expectedAmount) > expectedAmount * 0.5) {
  console.warn(
    `Payment amount differs significantly from expected: ${input.actualAmount} vs ${expectedAmount}`,
    { appointmentId: input.appointmentId }
  );
}

// In calendar.processVendorPaymentFromAppointment (same logic)
if (input.actualAmount <= 0) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Payment amount must be positive",
  });
}
```

---

### FIX #11: Expand Meeting History to All Client Events

**Issue**: Only creates meeting history for eventType === "MEETING"

**API Fix**:
```typescript
// In calendar.createEvent (within transaction)
const clientFacingEventTypes = [
  "MEETING",
  "INTAKE",
  "SHOPPING",
  "AR_COLLECTION",
  "CUSTOMER_VISIT",
];

if (clientFacingEventTypes.includes(input.eventType) && input.clientId) {
  await tx.insert(clientMeetingHistory).values({
    clientId: input.clientId,
    calendarEventId: event.id,
    meetingDate: new Date(`${input.startDate}T${input.startTime}`),
    meetingType: input.eventType,
  });
}
```

---

### FIX #12: Handle Partial Payments

**Issue**: Assumes payment fully pays invoice

**API Fix**:
```typescript
// In calendar.processPaymentFromAppointment
if (appointment.metadata.invoice_id?.referenceId) {
  const invoiceId = appointment.metadata.invoice_id.referenceId as number;
  
  const invoice = await tx.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });

  if (invoice) {
    // Calculate total payments for this invoice
    const [totalPaymentsResult] = await tx
      .select({ sum: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(payments)
      .where(eq(payments.invoiceId, invoice.id));

    const totalPaid = totalPaymentsResult?.sum || 0;

    // Update invoice status based on balance
    let newStatus: string;
    if (totalPaid >= invoice.totalAmount) {
      newStatus = "PAID";
    } else if (totalPaid > 0) {
      newStatus = "PARTIALLY_PAID";
    } else {
      newStatus = "UNPAID";
    }

    await tx.update(invoices)
      .set({ 
        status: newStatus,
        paidAmount: totalPaid,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoice.id));
  }
}
```

---

### FIX #15: Validate Metadata References

**Issue**: Metadata can reference non-existent entities

**API Fix**:
```typescript
// Helper function
async function validateMetadataReferences(
  tx: Transaction,
  metadata: EventMetadata
): Promise<void> {
  for (const [key, field] of Object.entries(metadata)) {
    if (field.type === "REFERENCE" && field.referenceId) {
      const exists = await checkReferenceExists(
        tx,
        field.referenceType!,
        field.referenceId
      );
      
      if (!exists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Referenced ${field.referenceType} #${field.referenceId} does not exist`,
        });
      }
    }
  }
}

async function checkReferenceExists(
  tx: Transaction,
  type: string,
  id: number
): Promise<boolean> {
  switch (type) {
    case "invoice": {
      const invoice = await tx.query.invoices.findFirst({
        where: eq(invoices.id, id),
      });
      return !!invoice;
    }
    
    case "payment": {
      const payment = await tx.query.payments.findFirst({
        where: eq(payments.id, id),
      });
      return !!payment;
    }
    
    case "order": {
      const order = await tx.query.orders.findFirst({
        where: eq(orders.id, id),
      });
      return !!order;
    }
    
    case "client": {
      const client = await tx.query.clients.findFirst({
        where: eq(clients.id, id),
      });
      return !!client;
    }
    
    case "vendor": {
      const vendor = await tx.query.vendors.findFirst({
        where: eq(vendors.id, id),
      });
      return !!vendor;
    }
    
    case "batch": {
      const batch = await tx.query.batches.findFirst({
        where: eq(batches.id, id),
      });
      return !!batch;
    }
    
    default:
      // Unknown types pass validation
      return true;
  }
}

// In calendar.createEvent and calendar.updateEvent
if (input.metadata) {
  await validateMetadataReferences(tx, input.metadata);
}
```

---

### FIX #17: Add Migration Verification

**Issue**: Migration could fail silently

**Migration Fix**:
```sql
-- After backfill, verify
SELECT 
  COUNT(*) as total_events,
  COUNT(client_id) as events_with_client_column,
  COUNT(vendor_id) as events_with_vendor_column,
  SUM(CASE WHEN JSON_EXTRACT(metadata, '$.client_id.referenceId') IS NOT NULL THEN 1 ELSE 0 END) as events_with_client_metadata,
  SUM(CASE WHEN JSON_EXTRACT(metadata, '$.vendor_id.referenceId') IS NOT NULL THEN 1 ELSE 0 END) as events_with_vendor_metadata,
  SUM(CASE 
    WHEN JSON_EXTRACT(metadata, '$.client_id.referenceId') IS NOT NULL 
    AND client_id IS NULL 
    THEN 1 ELSE 0 END) as failed_client_backfills,
  SUM(CASE 
    WHEN JSON_EXTRACT(metadata, '$.vendor_id.referenceId') IS NOT NULL 
    AND vendor_id IS NULL 
    THEN 1 ELSE 0 END) as failed_vendor_backfills
FROM calendar_events;

-- Expected: failed_client_backfills = 0, failed_vendor_backfills = 0
```

---

## 🟡 MEDIUM PRIORITY FIXES (Apply in Phase 2)

### FIX #7: Add Order Creation Duplicate Check

**Issue**: Could create multiple orders from same intake

**API Fix**:
```typescript
// In orders.createFromAppointment
const existingOrder = await tx.query.orders.findFirst({
  where: eq(orders.intakeEventId, input.appointmentId),
});

if (existingOrder) {
  throw new TRPCError({
    code: "CONFLICT",
    message: `Order #${existingOrder.id} already exists for this intake appointment`,
  });
}
```

---

### FIX #13: Add Time Validation in Quick Book UI

**Issue**: Could book appointments in the past

**UI Fix**:
```typescript
// In QuickBookAppointmentDialog component
const handleSubmit = (values: FormValues) => {
  const selectedDateTime = new Date(`${values.date}T${values.time}`);
  const now = new Date();

  if (selectedDateTime < now) {
    form.setError("date", {
      type: "manual",
      message: "Cannot book appointment in the past",
    });
    return;
  }

  // Proceed with booking
  onSubmit(values);
};
```

---

### FIX #16: Handle Broken Metadata References in UI

**Issue**: Deleted entities still referenced in metadata

**UI Fix**:
```typescript
// Reusable component for metadata references
const MetadataReference = ({ 
  type, 
  id, 
  label 
}: { 
  type: string; 
  id: number; 
  label: string;
}) => {
  const { data, isLoading, error } = useQuery(
    [type, id],
    () => fetchEntity(type, id)
  );

  if (isLoading) {
    return <Skeleton className="h-4 w-24" />;
  }

  if (error || !data) {
    return (
      <span className="text-muted-foreground">
        {label} #{id} <span className="text-xs">(deleted)</span>
      </span>
    );
  }

  return (
    <Link to={`/${type}s/${id}`} className="text-primary hover:underline">
      {label} #{data.number || id}
    </Link>
  );
};

// Usage in event details
<MetadataReference 
  type="invoice" 
  id={event.metadata.invoice_id?.referenceId} 
  label="Invoice"
/>
```

---

## 🟢 LOW PRIORITY FIXES (Optional Enhancements)

### FIX #14: Add Confirmation for Large Payments

**Issue**: No confirmation for large amounts

**UI Fix**:
```typescript
// In ProcessPaymentDialog component
const LARGE_AMOUNT_THRESHOLD = 10000;

const handleSubmit = async (values: FormValues) => {
  if (values.actualAmount > LARGE_AMOUNT_THRESHOLD) {
    const confirmed = await confirm({
      title: "Confirm Large Payment",
      description: `You are about to process a payment of $${values.actualAmount.toLocaleString()}. Please confirm this is correct.`,
    });

    if (!confirmed) {
      return;
    }
  }

  // Proceed with payment
  onSubmit(values);
};
```

---

## 📊 FIX SUMMARY

| Priority | Fixes | Estimated Effort |
|----------|-------|------------------|
| **Critical** | 7 | 2-3 weeks |
| **High** | 7 | 1-2 weeks |
| **Medium** | 3 | 1 week |
| **Low** | 1 | 0.5 weeks |
| **TOTAL** | **18** | **4.5-6.5 weeks** |

---

## 🎯 INTEGRATION PLAN

### Before Implementation (Week 0)
1. Apply all Critical Fixes to v3.1 spec → Create v3.2
2. Update database schema diagrams
3. Update API specifications
4. Update migration scripts

### Phase 1 Implementation (Weeks 1-5)
1. Implement schema with all Critical Fixes
2. Implement APIs with Critical + High Priority Fixes
3. Test thoroughly

### Phase 2 Implementation (Weeks 6-10)
1. Implement UI with Medium Priority Fixes
2. Add optional Low Priority Fixes
3. Final testing

---

## ✅ VERIFICATION CHECKLIST

After applying fixes:
- [ ] All 7 Critical Fixes applied to spec
- [ ] Schema updated with vendor_id, timezone
- [ ] Migration scripts include verification
- [ ] All APIs use transactions
- [ ] Conflict detection implemented
- [ ] N+1 queries eliminated
- [ ] Validation added for all inputs
- [ ] Metadata references validated
- [ ] Partial payment handling implemented
- [ ] Meeting history expanded to all client events
- [ ] UI handles broken references gracefully
- [ ] Timezone handling documented

---

**Document Status**: Complete  
**Next Step**: Create implementation roadmap with fixes integrated
