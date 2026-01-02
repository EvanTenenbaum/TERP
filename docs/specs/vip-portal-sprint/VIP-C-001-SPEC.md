# VIP-C-001: Appointment Scheduling System

**Priority:** HIGH
**Estimate:** 60 hours
**Status:** Not Started
**Replaces:** VIP-B-001 (SSO)

---

## 1. Overview

This specification replaces the SSO feature with a comprehensive appointment scheduling system, similar to Calendly. This system will allow VIP Portal clients to book appointments for various services (payment pickup/drop-off, office visits) and will provide a management interface for ERP users to control their availability and approve requests.

---

## 2. System Architecture

This feature requires three main components:

1.  **Calendar Management (ERP):** A new section in the main ERP for managers to create and configure different "Calendars" (e.g., "Accounting Payments", "Office Visits").
2.  **Appointment Booking (VIP Portal):** A new UI in the VIP Portal for clients to select a calendar, view available time slots, and request an appointment.
3.  **Request & Notification System:** A backend system to handle appointment requests, approvals, rejections, and notifications.

---

## 3. Database Schema Changes

New tables are required to support this system.

**`appointmentCalendars` Table:**
```sql
CREATE TABLE appointmentCalendars (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL, -- e.g., "Accounting Payments", "Office Visits"
  description TEXT,
  managerId INT NOT NULL, -- User responsible for this calendar
  availability JSON, -- Rules for available time slots (days, hours, etc.)
  eventTypeId INT NOT NULL, -- Links to a new event type
  bufferTime INT DEFAULT 15, -- Minutes between appointments
  minNotice INT DEFAULT 240, -- Minutes minimum notice for booking
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**`appointmentRequests` Table:**
```sql
CREATE TABLE appointmentRequests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  calendarId INT NOT NULL,
  clientId INT NOT NULL,
  requestedStartTime TIMESTAMP NOT NULL,
  requestedEndTime TIMESTAMP NOT NULL,
  status ENUM("PENDING", "CONFIRMED", "REJECTED", "CANCELLED") DEFAULT "PENDING",
  notes TEXT, -- Notes from the client
  rejectionReason TEXT, -- Notes from the manager
  calendarEventId INT, -- Links to the created calendar event upon confirmation
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**`calendarEvents` Schema Update:**
- Add a new `eventType`: `APPOINTMENT`
- Add a new `status`: `PENDING_APPROVAL`

---

## 4. ERP-Side: Calendar Management (24 hours)

### UI/UX

A new page at `/settings/calendars` will allow authorized users (e.g., managers) to:

1.  **Create/Edit Calendars:**
    - **Name:** "Accounting Payments"
    - **Description:** "Schedule a time for payment pickup or drop-off."
    - **Manager:** Assign a user to manage this calendar.
    - **Event Type:** Link to a new custom event type (e.g., "Payment Appointment").
    - **Availability:** A UI to define available days (Mon-Fri), hours (9am-5pm), and block out specific dates or times.
    - **Buffer Time:** Set a buffer (e.g., 15 minutes) between appointments.
    - **Minimum Notice:** Require clients to book at least X hours in advance.

2.  **View Appointment Requests:**
    - A new tab in the main Calendar module showing a list of pending appointment requests.
    - Each request will have "Accept", "Reject", and "Propose New Time" buttons.

### Backend Logic

- New tRPC endpoints for CRUD operations on `appointmentCalendars`.
- New tRPC endpoint to get appointment requests for a manager.
- Logic to handle request approval (creates a `calendarEvent`), rejection (sends notification), and proposing a new time.

---

## 5. VIP Portal: Appointment Booking (24 hours)

### UI/UX

A new "Schedule Appointment" button will be added to the VIP Portal dashboard. This will open a multi-step booking flow:

1.  **Step 1: Select Service:**
    - A list of available calendars (e.g., "Payment Pickup/Drop-off", "Office Visit").

2.  **Step 2: Select Date & Time:**
    - A calendar view showing available dates.
    - A list of available time slots for the selected date, based on the calendar's availability rules.

3.  **Step 3: Confirm & Request:**
    - A summary of the appointment details.
    - A text area for the client to add notes.
    - A "Request Appointment" button.

### Backend Logic

- New tRPC endpoint to get available `appointmentCalendars`.
- New tRPC endpoint to get available time slots for a given calendar and date.
- New tRPC endpoint to submit an `appointmentRequest`.

---

## 6. Notification System (12 hours)

1.  **Manager Notifications:**
    - When a new appointment is requested, the assigned manager receives an in-app notification and an email.

2.  **Client Notifications (VIP Portal):**
    - A new notification area in the VIP Portal.
    - Client receives a notification when their appointment is confirmed, rejected, or a new time is proposed.

---

## 7. Acceptance Criteria

1.  ERP users can create and manage different appointment calendars.
2.  VIP Portal clients can view available appointment times and submit requests.
3.  ERP users can approve or reject appointment requests.
4.  Confirmed appointments are automatically added to the main ERP calendar.
5.  Both parties receive notifications for all state changes.

---

## 8. Dependencies

- The core Calendar module must be stable.
- The notification system must be able to handle both in-app and email notifications.
