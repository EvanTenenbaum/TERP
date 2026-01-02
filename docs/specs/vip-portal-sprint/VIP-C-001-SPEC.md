# VIP-C-001: Appointment Scheduling System

**Priority:** HIGH
**Estimate:** 68 hours (increased from 60h to include notification system enhancements)
**Status:** Not Started
**Replaces:** VIP-B-001 (SSO)

---

## 1. Overview

This specification covers a comprehensive appointment scheduling system, similar to Calendly. This system allows VIP Portal clients to book appointments for various services (payment pickup/drop-off, office visits) and provides a management interface for ERP users to control their availability and approve requests.

**All notifications are in-app only.** There is no email notification system.

---

## 2. System Architecture

This feature requires four main components:

1. **Calendar Management (ERP):** A new section in the main ERP for managers to create and configure different "Calendars" (e.g., "Accounting Payments", "Office Visits").
2. **Appointment Booking (VIP Portal):** A new UI in the VIP Portal for clients to select a calendar, view available time slots, and request an appointment.
3. **In-App Notification System:** Enhancements to the existing ERP inbox and a new VIP Portal notification system.
4. **Request & Approval Workflow:** Backend logic to handle appointment requests, approvals, rejections, and notifications.

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

**`vipPortalNotifications` Table:**
```sql
CREATE TABLE vip_portal_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL REFERENCES clients(id),
  notification_type ENUM(
    'appointment_confirmed',
    'appointment_rejected', 
    'appointment_rescheduled',
    'appointment_reminder',
    'interest_list_processed',
    'invoice_created',
    'general'
  ) NOT NULL,
  reference_type VARCHAR(50), -- e.g., 'appointment_request', 'invoice'
  reference_id INT,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Schema Updates

**`inboxItems` sourceType enum - Add new values:**
- `appointment_request` - New appointment request received
- `appointment_confirmed` - Appointment was confirmed
- `appointment_rejected` - Appointment was rejected
- `appointment_rescheduled` - Client responded to proposed time

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

## 6. In-App Notification System (12 hours)

### 6.1 ERP Inbox Enhancements (4 hours)

1. **Schema Update:** Add new `sourceType` values to `inboxItems`:
   - `appointment_request`
   - `appointment_confirmed`
   - `appointment_rejected`
   - `appointment_rescheduled`

2. **Notification Service:** Implement actual inbox item creation in `notificationService.ts`:
   ```typescript
   case "in-app":
     await inboxDb.createInboxItem({
       userId: payload.userId,
       sourceType: payload.metadata?.sourceType || "task_update",
       sourceId: payload.metadata?.sourceId || 0,
       referenceType: payload.metadata?.referenceType || "general",
       referenceId: payload.metadata?.referenceId || 0,
       title: payload.title,
       description: payload.message,
     });
     break;
   ```

3. **Polling:** Add 30-second polling to `InboxPanel` component for near-real-time updates.

### 6.2 VIP Portal Notifications (8 hours)

1. **New Schema:** Create `vipPortalNotifications` table (see Section 3.1)

2. **New Endpoints:**
   ```typescript
   notifications: {
     getAll: vipPortalProcedure.query(...)
     getUnread: vipPortalProcedure.query(...)
     markAsRead: vipPortalProcedure.input({ notificationId }).mutation(...)
     markAllAsRead: vipPortalProcedure.mutation(...)
   }
   ```

3. **New UI Component:** `VIPNotificationBell`
   - Bell icon in VIP Portal header
   - Badge showing unread count
   - Dropdown panel listing recent notifications
   - Click notification to navigate to relevant page
   - 30-second polling for updates

---

## 7. Notification Triggers

| Event | ERP Notification | VIP Portal Notification |
|-------|------------------|------------------------|
| Client submits request | Manager receives "New appointment request from [Client]" | Client sees "Request submitted" confirmation |
| Manager confirms | - | Client receives "Appointment confirmed for [Date/Time]" |
| Manager rejects | - | Client receives "Appointment request declined: [Reason]" |
| Manager proposes new time | - | Client receives "New time proposed: [Date/Time]" |
| Client accepts proposed time | Manager receives "Client accepted proposed time" | Client sees confirmation |
| Client cancels request | Manager receives "Client cancelled appointment" | - |
| Appointment reminder (1 day before) | Manager receives reminder | Client receives reminder |

---

## 8. Acceptance Criteria

1. ERP users can create and manage appointment calendars with custom availability
2. VIP Portal clients can view available times and submit appointment requests
3. ERP users can approve, reject, or propose new times for requests
4. Confirmed appointments are automatically added to the ERP calendar
5. Both parties receive in-app notifications for all state changes
6. Notifications appear within 30 seconds of the triggering event (via polling)

---

## 9. Estimate Breakdown

| Component | Estimate |
|-----------|----------|
| ERP Calendar Management UI | 12h |
| ERP Calendar Management Backend | 12h |
| VIP Portal Booking UI | 16h |
| VIP Portal Booking Backend | 8h |
| ERP Inbox Enhancements | 4h |
| VIP Portal Notification System | 8h |
| Integration & Testing | 8h |
| **Total** | **68h** |

---

## 10. Dependencies

- The core Calendar module must be stable
- The existing `inboxItems` schema must be updatable (add enum values)
- VIP Portal frontend must support header modifications for notification bell

---

## 11. Future Enhancements (Out of Scope)

- Email notifications (requires email service integration)
- SMS notifications (requires SMS service integration)
- WebSocket for real-time push notifications
- Recurring appointments
- Google Calendar / Outlook integration
