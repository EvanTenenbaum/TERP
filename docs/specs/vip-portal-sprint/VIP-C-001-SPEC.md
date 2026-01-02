# VIP-C-001: Appointment Scheduling System

**Priority:** HIGH
**Estimate:** 60 hours
**Status:** Not Started
**Dependencies:** NOTIF-001 (Unified Notification System Architecture)

---

## 1. Overview

This specification covers a comprehensive appointment scheduling system, similar to Calendly. This system allows VIP Portal clients to book appointments for various services (payment pickup/drop-off, office visits) and provides a management interface for ERP users to control their availability and approve requests.

**Note:** This feature depends on the Unified Notification System (NOTIF-001). The notification-related work in this spec assumes NOTIF-001 has established the core notification infrastructure. If NOTIF-001 is not complete, the notification portions of this spec will need to be deferred or the dependency resolved.

---

## 2. System Architecture

This feature requires three main components:

1. **Calendar Management (ERP):** A new section in the main ERP for managers to create and configure different "Calendars" (e.g., "Accounting Payments", "Office Visits").
2. **Appointment Booking (VIP Portal):** A new UI in the VIP Portal for clients to select a calendar, view available time slots, and request an appointment.
3. **Request & Approval Workflow:** Backend logic to handle appointment requests, approvals, rejections, and trigger notifications via the unified notification system.

---

## 3. Database Schema Changes

### 3.1 New Tables

**`appointmentCalendars` Table:**
```sql
CREATE TABLE appointment_calendars (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL, -- e.g., "Accounting Payments", "Office Visits"
  description TEXT,
  manager_id INT NOT NULL REFERENCES users(id), -- User responsible for this calendar
  availability JSON NOT NULL, -- Rules for available time slots
  buffer_time INT DEFAULT 15, -- Minutes between appointments
  min_notice INT DEFAULT 240, -- Minutes minimum notice for booking (4 hours default)
  max_advance INT DEFAULT 20160, -- Minutes max advance booking (14 days default)
  slot_duration INT DEFAULT 30, -- Minutes per appointment slot
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**`appointmentRequests` Table:**
```sql
CREATE TABLE appointment_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  calendar_id INT NOT NULL REFERENCES appointment_calendars(id),
  client_id INT NOT NULL REFERENCES clients(id),
  requested_start DATETIME NOT NULL,
  requested_end DATETIME NOT NULL,
  status ENUM('pending', 'confirmed', 'rejected', 'cancelled', 'rescheduled') DEFAULT 'pending',
  client_notes TEXT, -- Notes from the client
  manager_notes TEXT, -- Notes from the manager (e.g., rejection reason)
  proposed_start DATETIME, -- If manager proposes a new time
  proposed_end DATETIME,
  calendar_event_id INT REFERENCES calendar_events(id), -- Created upon confirmation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 4. ERP-Side: Calendar Management (24 hours)

### 4.1 UI/UX

A new page at `/settings/appointment-calendars` will allow authorized users to:

1. **Create/Edit Calendars:**
   - **Name:** "Accounting Payments" or "Office Visits"
   - **Description:** Displayed to clients when booking
   - **Manager:** Assign a user to manage this calendar
   - **Availability:** Define available days and hours
     - Days of week (checkboxes)
     - Start time / End time for each day
     - Block out specific dates (holidays, vacations)
   - **Slot Duration:** 15, 30, 45, or 60 minutes
   - **Buffer Time:** Time between appointments (0-60 minutes)
   - **Minimum Notice:** How far in advance clients must book (1-72 hours)
   - **Maximum Advance:** How far ahead clients can book (1-30 days)

2. **View Appointment Requests:**
   - A new tab in the Calendar module: "Appointment Requests"
   - Shows pending requests with client name, requested time, notes
   - Actions: "Confirm", "Reject", "Propose New Time"

### 4.2 Backend Logic

New tRPC endpoints in a new `appointmentCalendars` router:

```typescript
// Calendar Management
createCalendar: protectedProcedure.input(...).mutation(...)
updateCalendar: protectedProcedure.input(...).mutation(...)
deleteCalendar: protectedProcedure.input(...).mutation(...)
getCalendars: protectedProcedure.query(...)
getCalendarById: protectedProcedure.input(...).query(...)

// Request Management
getPendingRequests: protectedProcedure.query(...)
confirmRequest: protectedProcedure.input(...).mutation(...)
rejectRequest: protectedProcedure.input(...).mutation(...)
proposeNewTime: protectedProcedure.input(...).mutation(...)
```

---

## 5. VIP Portal: Appointment Booking (24 hours)

### 5.1 UI/UX

A new "Schedule Appointment" button on the VIP Portal dashboard opens a multi-step booking flow:

**Step 1: Select Service**
- List of available calendars with descriptions
- e.g., "Payment Pickup/Drop-off", "Office Visit"

**Step 2: Select Date**
- Calendar view showing available dates (grayed out = unavailable)
- Only shows dates within the calendar's min/max advance window

**Step 3: Select Time**
- List of available time slots for the selected date
- Slots are calculated based on calendar availability rules

**Step 4: Confirm & Submit**
- Summary: Service, Date, Time
- Optional notes field
- "Request Appointment" button

**Confirmation Screen:**
- "Your appointment request has been submitted"
- "You will receive a notification when it is confirmed or if changes are needed"

### 5.2 Backend Logic

New tRPC endpoints in `vipPortal.ts`:

```typescript
// Appointment Booking
appointments: {
  getAvailableCalendars: vipPortalProcedure.query(...)
  getAvailableDates: vipPortalProcedure.input({ calendarId, month }).query(...)
  getAvailableSlots: vipPortalProcedure.input({ calendarId, date }).query(...)
  submitRequest: vipPortalProcedure.input({ calendarId, startTime, notes }).mutation(...)
  getMyRequests: vipPortalProcedure.query(...)
  cancelRequest: vipPortalProcedure.input({ requestId }).mutation(...)
  acceptProposedTime: vipPortalProcedure.input({ requestId }).mutation(...)
}
```

---

## 6. Notification Integration (12 hours)

This section depends on NOTIF-001 (Unified Notification System Architecture).

### 6.1 Notification Types Required

The following notification types must be registered with the unified notification system:

| Notification Type | Recipient | Trigger |
|-------------------|-----------|---------|
| `appointment_request_received` | ERP User (Manager) | Client submits a new request |
| `appointment_confirmed` | VIP Portal Client | Manager confirms request |
| `appointment_rejected` | VIP Portal Client | Manager rejects request |
| `appointment_rescheduled` | VIP Portal Client | Manager proposes new time |
| `appointment_accepted` | ERP User (Manager) | Client accepts proposed time |
| `appointment_cancelled` | ERP User (Manager) | Client cancels request |
| `appointment_reminder` | Both | 24 hours before appointment |

### 6.2 Integration Points

When appointment state changes occur, the system will call the unified notification service:

```typescript
// Example: When manager confirms an appointment
await notificationService.send({
  type: 'appointment_confirmed',
  recipientType: 'client',
  recipientId: request.clientId,
  referenceType: 'appointment_request',
  referenceId: request.id,
  data: {
    appointmentDate: request.requestedStart,
    calendarName: calendar.name,
  }
});
```

---

## 7. Acceptance Criteria

1. ERP users can create and manage appointment calendars with custom availability
2. VIP Portal clients can view available times and submit appointment requests
3. ERP users can approve, reject, or propose new times for requests
4. Confirmed appointments are automatically added to the ERP calendar
5. Both parties receive notifications for all state changes (via unified notification system)

---

## 8. Estimate Breakdown

| Component | Estimate |
|-----------|----------|
| ERP Calendar Management UI | 12h |
| ERP Calendar Management Backend | 12h |
| VIP Portal Booking UI | 16h |
| VIP Portal Booking Backend | 8h |
| Notification Integration | 4h |
| Integration & Testing | 8h |
| **Total** | **60h** |

---

## 9. Dependencies

- **NOTIF-001:** Unified Notification System Architecture must be complete or in progress
- The core Calendar module must be stable
- VIP Portal frontend must support the booking flow UI

---

## 10. Future Enhancements (Out of Scope)

- Recurring appointments
- Google Calendar / Outlook integration
- SMS/Email notifications (depends on NOTIF-001 scope)
