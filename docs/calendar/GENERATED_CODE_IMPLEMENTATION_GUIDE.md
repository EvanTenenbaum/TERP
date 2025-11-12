# Calendar v3.2 Generated Code Implementation Guide
**How to Complete the Generated Endpoint Implementations**

---

## 📋 Overview

The code generator created **9 router endpoints** with skeleton implementations. This guide shows how to complete each one following TERP Bible protocols.

---

## 🎯 Generated Endpoints

### 1. `quickBookForClient`
**Status**: Skeleton generated  
**TODO**: Implement conflict detection and event creation

**Implementation**:
```typescript
quickBookForClient: protectedProcedure
  .input(z.object({
    clientId: z.number(),
    eventType: z.string(),
    date: z.string(),
    time: z.string(),
    duration: z.number(),
    title: z.string(),
    notes: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    await requirePermission(ctx.user.id, "calendar.create");

    return await withTransaction(async (tx) => {
      // 1. Check for conflicts
      const conflicts = await checkConflicts({
        startDate: input.date,
        startTime: input.time,
        endDate: input.date,
        endTime: addMinutes(input.time, input.duration),
      });

      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Time slot conflicts with ${conflicts.length} existing appointment(s)`,
        });
      }

      // 2. Create event
      const [event] = await tx.insert(calendarEvents).values({
        title: input.title,
        eventType: input.eventType,
        startDate: input.date,
        startTime: input.time,
        clientId: input.clientId,
        duration: input.duration,
        notes: input.notes,
        status: "SCHEDULED",
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      }).returning();

      // 3. Log client activity
      await tx.insert(clientActivity).values({
        clientId: input.clientId,
        userId: ctx.user.id,
        activityType: "MEETING",
        description: `Appointment scheduled: ${input.title}`,
        activityDate: new Date(),
      });

      // 4. Create meeting history if client-facing event
      const clientFacingTypes = ["MEETING", "INTAKE", "AR_COLLECTION"];
      if (clientFacingTypes.includes(input.eventType)) {
        await tx.insert(clientMeetingHistory).values({
          clientId: input.clientId,
          calendarEventId: event.id,
          meetingDate: new Date(`${input.date}T${input.time}`),
          meetingType: input.eventType,
        });
      }

      return { eventId: event.id };
    });
  }),
```

---

### 2. `getClientAppointments`
**Status**: Skeleton generated  
**TODO**: Implement query with filtering

**Implementation**:
```typescript
getClientAppointments: protectedProcedure
  .input(z.object({
    clientId: z.number(),
    filter: z.enum(["upcoming", "past", "all"]).optional().default("all"),
    limit: z.number().optional().default(50),
    offset: z.number().optional().default(0),
  }))
  .query(async ({ input, ctx }) => {
    await requirePermission(ctx.user.id, "calendar.view");

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Build conditions
    const conditions: any[] = [
      eq(calendarEvents.clientId, input.clientId),
      isNull(calendarEvents.deletedAt),
    ];

    // Apply filter
    const now = new Date();
    if (input.filter === "upcoming") {
      conditions.push(gte(calendarEvents.startDate, now));
    } else if (input.filter === "past") {
      conditions.push(lt(calendarEvents.startDate, now));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(calendarEvents)
      .where(and(...conditions));

    const total = countResult?.count || 0;

    // Get appointments
    const appointments = await db
      .select()
      .from(calendarEvents)
      .where(and(...conditions))
      .orderBy(desc(calendarEvents.startDate))
      .limit(input.limit)
      .offset(input.offset);

    return { appointments, total };
  }),
```

---

### 3. `getDaySchedule`
**Status**: Skeleton generated  
**TODO**: Implement with JOIN to avoid N+1

**Implementation**:
```typescript
getDaySchedule: protectedProcedure
  .input(z.object({
    date: z.string(),
    eventTypes: z.array(z.string()).optional(),
  }))
  .query(async ({ input, ctx }) => {
    await requirePermission(ctx.user.id, "calendar.view");

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Calculate day boundaries
    const startOfDay = new Date(`${input.date}T00:00:00`);
    const endOfDay = new Date(`${input.date}T23:59:59`);

    // Build conditions
    const conditions: any[] = [
      gte(calendarEvents.startDate, startOfDay),
      lte(calendarEvents.startDate, endOfDay),
      ne(calendarEvents.status, "CANCELLED"),
      isNull(calendarEvents.deletedAt),
    ];

    if (input.eventTypes && input.eventTypes.length > 0) {
      conditions.push(inArray(calendarEvents.eventType, input.eventTypes as any));
    }

    // Use JOIN to load clients and vendors (Fix #8 - N+1 query)
    const events = await db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        eventType: calendarEvents.eventType,
        startTime: calendarEvents.startTime,
        endTime: calendarEvents.endTime,
        location: calendarEvents.location,
        metadata: calendarEvents.metadata,
        clientId: clients.id,
        clientName: clients.name,
        vendorId: vendors.id,
        vendorName: vendors.name,
      })
      .from(calendarEvents)
      .leftJoin(clients, eq(calendarEvents.clientId, clients.id))
      .leftJoin(vendors, eq(calendarEvents.vendorId, vendors.id))
      .where(and(...conditions))
      .orderBy(asc(calendarEvents.startTime));

    // Transform to desired format
    const eventsWithDetails = events.map(row => ({
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

    return { events: eventsWithDetails };
  }),
```

---

### 4. `processPaymentFromAppointment`
**Status**: Skeleton generated  
**TODO**: Implement AR payment processing

**Implementation**:
```typescript
processPaymentFromAppointment: protectedProcedure
  .input(z.object({
    eventId: z.number(),
    invoiceId: z.number(),
    amount: z.number(),
    paymentMethod: z.string(),
    notes: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    await requirePermission(ctx.user.id, "payments.create");

    return await withTransaction(async (tx) => {
      // 1. Validate event
      const [event] = await tx
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, input.eventId))
        .limit(1);

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event.eventType !== "AR_COLLECTION") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Event must be AR_COLLECTION type",
        });
      }

      // 2. Validate invoice
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.invoiceId))
        .limit(1);

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      if (invoice.status === "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invoice already paid",
        });
      }

      // 3. Validate amount
      if (input.amount <= 0 || input.amount > invoice.total) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid payment amount",
        });
      }

      // 4. Create payment
      const [payment] = await tx.insert(payments).values({
        invoiceId: input.invoiceId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        paymentDate: new Date(),
        notes: input.notes,
        createdBy: ctx.user.id,
      }).returning();

      // 5. Update invoice status
      const newAmountPaid = (invoice.amountPaid || 0) + input.amount;
      const newStatus = newAmountPaid >= invoice.total ? "PAID" : "PARTIAL";

      await tx
        .update(invoices)
        .set({
          amountPaid: newAmountPaid,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, input.invoiceId));

      // 6. Link payment to event
      await tx
        .update(calendarEvents)
        .set({
          metadata: sql`JSON_SET(COALESCE(metadata, '{}'), '$.paymentId', ${payment.id})`,
          status: "COMPLETED",
          updatedAt: new Date(),
        })
        .where(eq(calendarEvents.id, input.eventId));

      // 7. Log client activity
      if (event.clientId) {
        await tx.insert(clientActivity).values({
          clientId: event.clientId,
          userId: ctx.user.id,
          activityType: "PAYMENT_RECEIVED",
          description: `Payment received: $${input.amount} for Invoice #${invoice.invoiceNumber}`,
          activityDate: new Date(),
        });
      }

      return { paymentId: payment.id };
    });
  }),
```

---

### 5. `processVendorPaymentFromAppointment`
**Status**: Skeleton generated  
**TODO**: Implement AP payment processing

**Implementation**: Similar to AR payment but with:
- Validate `AP_PAYMENT` event type
- Use `purchaseOrders` table instead of `invoices`
- Use `vendorPayments` table instead of `payments`
- Include `checkNumber` field
- Log to `vendorActivity` instead of `clientActivity`

---

### 6. `createOrderFromAppointment`
**Status**: Skeleton generated  
**TODO**: Implement order creation from INTAKE

**Implementation**:
```typescript
createOrderFromAppointment: protectedProcedure
  .input(z.object({
    eventId: z.number(),
    orderData: z.object({
      orderType: z.enum(["QUOTE", "SALE"]),
      items: z.array(z.any()),
      // ... other order fields
    }),
  }))
  .mutation(async ({ input, ctx }) => {
    await requirePermission(ctx.user.id, "orders.create");

    return await withTransaction(async (tx) => {
      // 1. Validate event
      const [event] = await tx
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, input.eventId))
        .limit(1);

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event.eventType !== "INTAKE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Event must be INTAKE type",
        });
      }

      // 2. Check for duplicate order
      const [existingOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.intakeEventId, input.eventId))
        .limit(1);

      if (existingOrder) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Order already exists for this intake appointment",
        });
      }

      // 3. Create order
      const [order] = await tx.insert(orders).values({
        ...input.orderData,
        clientId: event.clientId!,
        intakeEventId: input.eventId,
        createdBy: ctx.user.id,
      }).returning();

      // 4. Update event
      await tx
        .update(calendarEvents)
        .set({
          metadata: sql`JSON_SET(COALESCE(metadata, '{}'), '$.orderId', ${order.id})`,
          status: "COMPLETED",
          updatedAt: new Date(),
        })
        .where(eq(calendarEvents.id, input.eventId));

      // 5. Log client activity
      if (event.clientId) {
        await tx.insert(clientActivity).values({
          clientId: event.clientId,
          userId: ctx.user.id,
          activityType: "ORDER_CREATED",
          description: `Order created from intake appointment: ${order.orderNumber}`,
          activityDate: new Date(),
        });
      }

      return { orderId: order.id };
    });
  }),
```

---

### 7. `linkBatchToPhotoSession`
**Status**: Skeleton generated  
**TODO**: Implement batch linking

**Implementation**:
```typescript
linkBatchToPhotoSession: protectedProcedure
  .input(z.object({
    eventId: z.number(),
    batchId: z.number(),
  }))
  .mutation(async ({ input, ctx }) => {
    await requirePermission(ctx.user.id, "batches.update");

    return await withTransaction(async (tx) => {
      // 1. Validate event
      const [event] = await tx
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, input.eventId))
        .limit(1);

      if (!event || event.eventType !== "PHOTOGRAPHY") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Event must be PHOTOGRAPHY type",
        });
      }

      // 2. Validate batch
      const [batch] = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, input.batchId))
        .limit(1);

      if (!batch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Batch not found",
        });
      }

      // 3. Link batch to event
      await tx
        .update(batches)
        .set({
          photoSessionEventId: input.eventId,
        })
        .where(eq(batches.id, input.batchId));

      // 4. Update event metadata
      await tx
        .update(calendarEvents)
        .set({
          metadata: sql`JSON_SET(COALESCE(metadata, '{}'), '$.batchId', ${input.batchId})`,
          updatedAt: new Date(),
        })
        .where(eq(calendarEvents.id, input.eventId));

      return { success: true };
    });
  }),
```

---

### 8. `getAvailableSlots`
**Status**: Skeleton generated  
**TODO**: Implement optimized O(n) algorithm

**Implementation**: See Fix #9 in v3.2 spec (already documented)

---

### 9. `bookAppointmentExternal`
**Status**: Skeleton generated  
**TODO**: Implement VIP portal booking

**Implementation**: Similar to `quickBookForClient` but:
- No auth required (uses client credentials)
- Return confirmation details
- No email sending (per your requirement)

---

## 📊 Implementation Progress

| Endpoint | Status | Tests | Coverage |
|----------|--------|-------|----------|
| quickBookForClient | ⏳ Skeleton | ⏳ Generated | 0% |
| getClientAppointments | ⏳ Skeleton | ⏳ Generated | 0% |
| getDaySchedule | ⏳ Skeleton | ⏳ Generated | 0% |
| processPaymentFromAppointment | ⏳ Skeleton | ⏳ Generated | 0% |
| processVendorPaymentFromAppointment | ⏳ Skeleton | ⏳ Generated | 0% |
| createOrderFromAppointment | ⏳ Skeleton | ⏳ Generated | 0% |
| linkBatchToPhotoSession | ⏳ Skeleton | ⏳ Generated | 0% |
| getAvailableSlots | ⏳ Skeleton | ⏳ Generated | 0% |
| bookAppointmentExternal | ⏳ Skeleton | ⏳ Generated | 0% |

---

## 🚀 Next Steps

1. **Complete implementations** using the code above
2. **Update generated tests** to test actual logic
3. **Run test suite** and verify all pass
4. **Add E2E tests** for critical workflows
5. **Verify 100% coverage**
6. **Deploy to staging**

---

**Document Status**: Implementation guide ready  
**Generated Code**: 9 endpoints, 27 tests  
**Remaining Work**: Complete implementations
