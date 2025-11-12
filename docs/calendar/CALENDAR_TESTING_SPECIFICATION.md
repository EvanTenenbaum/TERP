# Calendar Module - Testing Specification
**Complete Testing Requirements per TERP Bible Protocols**

---

## 📋 Document Info

- **Version**: 1.0
- **Date**: 2025-11-10
- **Module**: Calendar Evolution v3.2
- **Compliance**: TERP Bible Testing Protocols
- **Status**: Production-Ready

---

## 🎯 Testing Overview

This document specifies **complete testing requirements** for the Calendar module per TERP Bible protocols. All requirements are **MANDATORY** and must be met before code can be merged.

### Testing Trophy Model

| Test Type       | Percentage | Count (Est.) | Purpose                                |
| --------------- | ---------- | ------------ | -------------------------------------- |
| **Integration** | 70%        | ~140 tests   | Test how modules work together         |
| **Unit**        | 20%        | ~40 tests    | Test individual functions in isolation |
| **E2E**         | 10%        | ~20 tests    | Test full user flows in the browser    |
| **TOTAL**       | 100%       | **~200 tests** | Complete coverage                    |

---

## 🧪 INTEGRATION TESTS (70% - ~140 tests)

### Test File Structure

```
server/routers/
├── calendar.test.ts (main router tests)
├── calendar-client.test.ts (client integration tests)
├── calendar-payment.test.ts (payment integration tests)
└── calendar-operations.test.ts (operations integration tests)
```

### Template

Use `server/routers/pricing.test.ts` as template:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "./_core/trpc";
import { calendarRouter } from "./calendar";

// Mock all database queries
vi.mock("../db/queries/calendar");
vi.mock("../db/queries/clients");

describe("calendar router", () => {
  const createCaller = createCallerFactory(calendarRouter);
  const caller = createCaller({ user: { id: 1, role: "admin" } });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEvent", () => {
    it("should create event with client", async () => {
      // Arrange
      const mockEvent = { id: 1, title: "Test Event", clientId: 123 };
      vi.mocked(calendarQueries.createEvent).mockResolvedValue(mockEvent);

      // Act
      const result = await caller.createEvent({
        title: "Test Event",
        eventType: "MEETING",
        startDate: "2025-11-15",
        startTime: "10:00",
        clientId: 123,
      });

      // Assert
      expect(result).toEqual(mockEvent);
      expect(calendarQueries.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Event",
          clientId: 123,
        })
      );
    });

    it("should throw error if both client and vendor provided", async () => {
      // Act & Assert
      await expect(
        caller.createEvent({
          title: "Test Event",
          eventType: "MEETING",
          startDate: "2025-11-15",
          startTime: "10:00",
          clientId: 123,
          vendorId: 456,
        })
      ).rejects.toThrow("Event cannot have both client and vendor");
    });
  });
});
```

---

### 1. Calendar Router Tests (`calendar.test.ts`)

**Coverage**: Core CRUD operations, validation, permissions

#### Test Cases (30 tests)

**createEvent** (10 tests):
- [ ] Should create event with valid data
- [ ] Should create event with client_id
- [ ] Should create event with vendor_id
- [ ] Should throw error if both client and vendor provided (Fix #2)
- [ ] Should validate required fields
- [ ] Should enforce calendar:create permission
- [ ] Should use transaction for multi-step operation (Fix #10)
- [ ] Should create client activity if client event (Fix #10)
- [ ] Should create meeting history if client-facing event (Fix #11)
- [ ] Should handle timezone correctly (Fix #18)

**updateEvent** (8 tests):
- [ ] Should update event with valid data
- [ ] Should update client_id
- [ ] Should update vendor_id
- [ ] Should throw error if both client and vendor provided
- [ ] Should enforce calendar:update permission
- [ ] Should use transaction for multi-step operation
- [ ] Should update client activity
- [ ] Should handle timezone changes

**deleteEvent** (5 tests):
- [ ] Should soft delete event
- [ ] Should preserve meeting history (Fix #3)
- [ ] Should enforce calendar:delete permission
- [ ] Should log deletion activity
- [ ] Should handle cascades correctly

**getEvent** (3 tests):
- [ ] Should return event by ID
- [ ] Should include client details if client event
- [ ] Should include vendor details if vendor event

**getEvents** (4 tests):
- [ ] Should return events with filters
- [ ] Should filter by client_id
- [ ] Should filter by vendor_id
- [ ] Should filter by date range

---

### 2. Client Integration Tests (`calendar-client.test.ts`)

**Coverage**: Client-related calendar operations

#### Test Cases (25 tests)

**clients.getAppointments** (8 tests):
- [ ] Should return all appointments for client
- [ ] Should filter upcoming appointments
- [ ] Should filter past appointments
- [ ] Should paginate results
- [ ] Should include event details
- [ ] Should enforce clients:read permission
- [ ] Should use JOIN to avoid N+1 query (Fix #8)
- [ ] Should return empty array if no appointments

**calendar.quickBookForClient** (10 tests):
- [ ] Should create appointment for client
- [ ] Should detect conflicts (Fix #4)
- [ ] Should throw error if time slot conflicts
- [ ] Should pre-populate client data
- [ ] Should create client activity
- [ ] Should create meeting history
- [ ] Should enforce calendar:create permission
- [ ] Should use transaction
- [ ] Should handle timezone
- [ ] Should validate time is in future (Fix #13)

**calendar.getDaySchedule** (7 tests):
- [ ] Should return today's schedule
- [ ] Should filter by event type
- [ ] Should filter by user
- [ ] Should include client details
- [ ] Should include vendor details
- [ ] Should use JOIN to avoid N+1 query (Fix #8)
- [ ] Should enforce calendar:read permission

---

### 3. Payment Integration Tests (`calendar-payment.test.ts`)

**Coverage**: AR/AP payment processing

#### Test Cases (20 tests)

**calendar.processPaymentFromAppointment** (10 tests):
- [ ] Should create payment from AR_COLLECTION event
- [ ] Should validate amount is positive (Fix #5)
- [ ] Should throw error if amount <= 0
- [ ] Should use transaction (Fix #10)
- [ ] Should update appointment metadata
- [ ] Should update appointment status to COMPLETED
- [ ] Should log client activity
- [ ] Should handle partial payments (Fix #12)
- [ ] Should update invoice status correctly
- [ ] Should enforce payments:create permission

**calendar.processVendorPaymentFromAppointment** (10 tests):
- [ ] Should create vendor payment from AP_PAYMENT event
- [ ] Should validate amount is positive (Fix #6)
- [ ] Should throw error if amount <= 0
- [ ] Should use transaction (Fix #10)
- [ ] Should update appointment metadata
- [ ] Should update appointment status to COMPLETED
- [ ] Should log vendor activity (if exists)
- [ ] Should handle check numbers
- [ ] Should update PO status
- [ ] Should enforce payments:create permission

---

### 4. Operations Integration Tests (`calendar-operations.test.ts`)

**Coverage**: Order creation, batch linking

#### Test Cases (15 tests)

**orders.createFromAppointment** (8 tests):
- [ ] Should create order from INTAKE event
- [ ] Should check for duplicate orders (Fix #7)
- [ ] Should throw error if order already exists
- [ ] Should use transaction (Fix #10)
- [ ] Should link order to appointment via intake_event_id
- [ ] Should update appointment metadata
- [ ] Should log client activity
- [ ] Should enforce orders:create permission

**calendar.linkBatchToPhotoSession** (7 tests):
- [ ] Should link batch to PHOTOS event
- [ ] Should update batch with photo_session_event_id
- [ ] Should update appointment metadata
- [ ] Should handle multiple batches per session
- [ ] Should use transaction
- [ ] Should enforce batches:update permission
- [ ] Should log activity

---

### 5. VIP Portal Tests (`calendar-vip.test.ts`)

**Coverage**: External booking, available slots

#### Test Cases (15 tests)

**calendar.getAvailableSlots** (8 tests):
- [ ] Should return available time slots
- [ ] Should mark conflicting slots as unavailable
- [ ] Should use optimized algorithm (Fix #9)
- [ ] Should handle date range
- [ ] Should handle custom duration
- [ ] Should exclude cancelled events
- [ ] Should handle timezone
- [ ] Should be performant with large date ranges

**calendar.bookAppointmentExternal** (7 tests):
- [ ] Should create appointment from VIP portal
- [ ] Should detect conflicts
- [ ] Should send confirmation email
- [ ] Should validate client information
- [ ] Should use transaction
- [ ] Should handle timezone
- [ ] Should be publicly accessible (no auth required)

---

### 6. Event Type Tests (`calendar-event-types.test.ts`)

**Coverage**: Event type management, metadata validation

#### Test Cases (15 tests)

**Event Type CRUD** (8 tests):
- [ ] Should create event type
- [ ] Should update event type
- [ ] Should delete event type
- [ ] Should get event type by ID
- [ ] Should list all event types
- [ ] Should validate metadata schema
- [ ] Should enforce calendar:manage permission
- [ ] Should handle custom fields

**Metadata Validation** (7 tests):
- [ ] Should validate metadata against event type schema
- [ ] Should validate reference fields (Fix #15)
- [ ] Should throw error if referenced entity doesn't exist
- [ ] Should handle optional fields
- [ ] Should handle required fields
- [ ] Should validate field types
- [ ] Should validate field constraints

---

## 🔬 UNIT TESTS (20% - ~40 tests)

### Test File Structure

```
server/db/queries/
├── calendar.test.ts (calendar queries)
├── calendar-validation.test.ts (validation functions)
└── calendar-utils.test.ts (utility functions)
```

### 1. Calendar Queries Tests (`calendar.test.ts`)

**Coverage**: Database query functions

#### Test Cases (15 tests)

- [ ] Should insert event into database
- [ ] Should update event in database
- [ ] Should soft delete event
- [ ] Should find event by ID
- [ ] Should find events by filters
- [ ] Should find events by client_id
- [ ] Should find events by vendor_id
- [ ] Should find events by date range
- [ ] Should count events
- [ ] Should check for conflicts
- [ ] Should get available slots
- [ ] Should handle transactions
- [ ] Should handle errors gracefully
- [ ] Should validate foreign keys
- [ ] Should enforce constraints

---

### 2. Validation Tests (`calendar-validation.test.ts`)

**Coverage**: Input validation functions

#### Test Cases (15 tests)

- [ ] Should validate event title
- [ ] Should validate event type
- [ ] Should validate date format
- [ ] Should validate time format
- [ ] Should validate timezone
- [ ] Should validate duration
- [ ] Should validate client_id/vendor_id mutual exclusivity
- [ ] Should validate metadata structure
- [ ] Should validate reference fields
- [ ] Should validate amount (payment processing)
- [ ] Should validate time is in future
- [ ] Should validate time slot availability
- [ ] Should validate permissions
- [ ] Should handle edge cases
- [ ] Should return clear error messages

---

### 3. Utility Tests (`calendar-utils.test.ts`)

**Coverage**: Utility functions

#### Test Cases (10 tests)

- [ ] Should format date correctly
- [ ] Should format time correctly
- [ ] Should convert timezone
- [ ] Should calculate duration
- [ ] Should check time overlap
- [ ] Should generate time slots
- [ ] Should validate business hours
- [ ] Should handle DST transitions
- [ ] Should parse metadata
- [ ] Should serialize metadata

---

## 🎭 E2E TESTS (10% - ~20 tests)

### Test File Structure

```
e2e/calendar/
├── create-event.spec.ts
├── quick-book.spec.ts
├── process-payment.spec.ts
├── vip-booking.spec.ts
└── calendar-views.spec.ts
```

### Template

```typescript
import { test, expect } from "@playwright/test";

test.describe("Calendar - Create Event", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should create event with client", async ({ page }) => {
    // Navigate to calendar
    await page.goto("/calendar");

    // Click create event button
    await page.click('button:has-text("Create Event")');

    // Fill form
    await page.fill('input[name="title"]', "Test Event");
    await page.selectOption('select[name="eventType"]', "MEETING");
    await page.fill('input[name="date"]', "2025-11-15");
    await page.fill('input[name="time"]', "10:00");
    await page.selectOption('select[name="clientId"]', "123");

    // Submit
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('text=Event created successfully')).toBeVisible();
  });
});
```

---

### 1. Create Event Tests (`create-event.spec.ts`)

#### Test Cases (5 tests)

- [ ] Should create event with client
- [ ] Should create event with vendor
- [ ] Should show error if both client and vendor selected
- [ ] Should detect time conflicts
- [ ] Should handle timezone selection

---

### 2. Quick Book Tests (`quick-book.spec.ts`)

#### Test Cases (4 tests)

- [ ] Should quick book from client profile
- [ ] Should pre-populate client data
- [ ] Should detect conflicts
- [ ] Should show confirmation

---

### 3. Process Payment Tests (`process-payment.spec.ts`)

#### Test Cases (4 tests)

- [ ] Should process customer payment from AR_COLLECTION event
- [ ] Should process vendor payment from AP_PAYMENT event
- [ ] Should validate amount
- [ ] Should update invoice/PO status

---

### 4. VIP Booking Tests (`vip-booking.spec.ts`)

#### Test Cases (4 tests)

- [ ] Should show available time slots
- [ ] Should book appointment from VIP portal
- [ ] Should send confirmation email
- [ ] Should handle conflicts

---

### 5. Calendar Views Tests (`calendar-views.spec.ts`)

#### Test Cases (3 tests)

- [ ] Should display month view
- [ ] Should display week view
- [ ] Should display day view

---

## 📊 TEST COVERAGE REQUIREMENTS

### Coverage Targets

| Module | Target | Minimum |
|--------|--------|---------|
| **Routers** | 100% | 95% |
| **Queries** | 100% | 90% |
| **Utils** | 100% | 90% |
| **Components** | 80% | 70% |
| **Overall** | 90% | 80% |

### Verification

```bash
# Run tests with coverage
pnpm test:coverage

# Check coverage report
open coverage/index.html
```

---

## 🚀 TEST EXECUTION

### Local Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/routers/calendar.test.ts

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

### CI/CD Testing

**GitHub Actions** runs tests automatically on:
- Every push to feature branch
- Every pull request
- Every push to main branch

**Pre-commit Hook** runs tests before commit:
- Blocks commit if tests fail
- Cannot be bypassed with `--no-verify`

---

## ❌ PROHIBITED ACTIONS

- **DO NOT** commit code without tests
- **DO NOT** commit failing tests
- **DO NOT** skip tests (unless explicitly approved)
- **DO NOT** use `--no-verify` to bypass pre-commit hooks
- **DO NOT** connect to real database in tests
- **DO NOT** write tests that depend on other tests
- **DO NOT** write flaky tests

---

## ✅ BEST PRACTICES

### Test Organization

- **Arrange-Act-Assert** pattern
- **One assertion per test** (when possible)
- **Clear test names** (should describe behavior)
- **Mock all external dependencies**
- **Clean up after each test** (use `beforeEach`, `afterEach`)

### Test Naming

```typescript
// Good
it("should throw error if both client and vendor provided", async () => {});

// Bad
it("test1", async () => {});
```

### Mock Management

```typescript
// Good - Clear mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Bad - Mocks persist across tests
```

### Assertions

```typescript
// Good - Specific assertions
expect(result).toEqual({ id: 1, title: "Test Event" });

// Bad - Vague assertions
expect(result).toBeTruthy();
```

---

## 📖 REFERENCE DOCUMENTS

- **Template**: `server/routers/pricing.test.ts`
- **Quick Guide**: `docs/testing/AI_AGENT_QUICK_REFERENCE.md`
- **Full Guide**: `docs/testing/TERP_TESTING_USAGE_GUIDE.md`
- **Bible Protocols**: `docs/DEVELOPMENT_PROTOCOLS.md`

---

## 🎯 DEFINITION OF DONE (Testing)

**Testing is "Done" only when**:

- [ ] **100% of new code is tested**
- [ ] **All tests pass (100%)**
- [ ] **Follows TDD workflow** (Red-Green-Refactor)
- [ ] **Mocks all external dependencies**
- [ ] **Testing Trophy distribution** (70% integration, 20% unit, 10% E2E)
- [ ] **Coverage targets met** (90% overall, 95% routers)
- [ ] **No skipped tests**
- [ ] **No flaky tests**
- [ ] **Pre-commit hooks pass**
- [ ] **CI/CD pipeline green**

---

**Document Status**: Complete  
**Compliance**: TERP Bible Testing Protocols  
**Next Step**: Implement tests following this specification
