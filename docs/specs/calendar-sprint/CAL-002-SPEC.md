_No response._
_CAL-002-SPEC.md_

# Specification: CAL-002 - Availability & Booking Foundation

**Document Version:** 1.0  
**Date:** January 2, 2026  
**Author:** Manus AI  
**Status:** DRAFT
**Depends On:** [CAL-001](./CAL-001-SPEC.md)

---

## 1. Overview

This document provides the technical specification for **CAL-002: Availability & Booking Foundation**. Building upon the multi-calendar architecture established in CAL-001, this phase introduces the core components required for a "Calendly-like" appointment scheduling system. The focus is on enabling administrators to define when a calendar is available for booking and to create different types of appointments that can be offered.

This phase is critical for enabling the VIP Portal appointment scheduling functionality (VIP-C-001) and the internal booking workflows (CAL-003). It provides the engine for calculating available slots, which is the heart of the automated scheduling system.

## 2. Business & User Value

- **Business Value:** Standardizes and automates the scheduling process, reducing the administrative overhead of back-and-forth communication to find a meeting time. It ensures that appointments are only booked when staff and resources are actually available, minimizing conflicts and maximizing resource utilization.
- **User Value (Admins):** Provides powerful tools to control and manage team availability, giving them fine-grained control over their time and how it can be booked by others. This empowers teams like Accounting and Sales to define their own operating hours for appointments.

## 3. Scope

### 3.1 In Scope

- **Database Schema:**
    - Creation of a new `appointmentTypes` table to define the "what" (e.g., "Payment Pickup," "Client Demo").
    - Creation of a new `calendarAvailability` table to define the "when" (e.g., "Mondays 9-5").
    - Creation of a new `calendarBlockedDates` table for one-off unavailability (e.g., holidays).
- **Backend (tRPC):**
    - API endpoints for CRUD operations on `appointmentTypes`.
    - API endpoints for managing `calendarAvailability` rules.
    - A core `availability.getSlots` endpoint that calculates and returns available booking slots based on a calendar's rules, existing events, and requested appointment type.
- **Frontend (React/TypeScript):**
    - **Settings Page:** A new "Appointment Types" tab within the Calendar settings page for managing appointment types.
    - **Settings Page:** A new "Availability" tab within the Calendar settings page for defining weekly availability schedules and one-off blocked dates.

### 3.2 Out of Scope

- The public-facing booking UI for clients (handled in VIP-C-001).
- The internal request/approval workflow for appointments (handled in CAL-003).
- Integration with user vacation/time-off (handled in CAL-004).
- Real-time conflict detection during manual event creation (this phase focuses on the API for automated booking).

## 4. Technical Implementation Details

### 4.1 Database Schema

#### 4.1.1 New Table: `appointmentTypes`

Defines the types of bookable events.

```sql
CREATE TABLE "appointmentTypes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "calendarId" UUID NOT NULL REFERENCES "calendars"('id') ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL, -- Duration in minutes
    "bufferBefore" INTEGER NOT NULL DEFAULT 0, -- Prep time before event in minutes
    "bufferAfter" INTEGER NOT NULL DEFAULT 0, -- Wrap-up time after event in minutes
    "minNoticeHours" INTEGER NOT NULL DEFAULT 24, -- Minimum hours in advance for booking
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 30, -- Maximum days in the future for booking
    "color" VARCHAR(7) NOT NULL DEFAULT '#f39c12', -- Default orange color
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointmentTypes_pkey" PRIMARY KEY ("id")
);
```

#### 4.1.2 New Table: `calendarAvailability`

Defines the recurring weekly availability for a calendar.

```sql
CREATE TABLE "calendarAvailability" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "calendarId" UUID NOT NULL REFERENCES "calendars"('id') ON DELETE CASCADE,
    "dayOfWeek" INTEGER NOT NULL, -- ISO 8601 format: 1 = Monday, 7 = Sunday
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,

    CONSTRAINT "calendarAvailability_pkey" PRIMARY KEY ("id")
);
```

#### 4.1.3 New Table: `calendarBlockedDates`

Defines specific dates on which a calendar is unavailable.

```sql
CREATE TABLE "calendarBlockedDates" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "calendarId" UUID NOT NULL REFERENCES "calendars"('id') ON DELETE CASCADE,
    "date" DATE NOT NULL,
    "reason" VARCHAR(255),

    CONSTRAINT "calendarBlockedDates_pkey" PRIMARY KEY ("id")
);
```

### 4.2 Backend (tRPC API)

#### 4.2.1 Core Logic: `availability.getSlots`

This is the most critical part of this phase. This endpoint will be responsible for calculating available time slots.

- **Input:** `{ calendarId: UUID, appointmentTypeId: UUID, startDate: Date, endDate: Date }`
- **Process:**
    1.  Fetch the specified `AppointmentType` to get its `duration`, `bufferBefore`, `bufferAfter`, etc.
    2.  Fetch all `CalendarAvailability` rules for the given `calendarId`.
    3.  Fetch all `CalendarBlockedDates` for the date range.
    4.  Fetch all existing `CalendarEvents` for the `calendarId` within the date range.
    5.  For each day in the requested range:
        a.  Check if it's a blocked date. If so, skip.
        b.  Get the day's availability windows from the rules.
        c.  Generate potential start times (e.g., every 15 minutes) within the availability windows.
        d.  For each potential start time, check if the entire duration (`bufferBefore` + `duration` + `bufferAfter`) is free from any existing events.
        e.  Check if the start time respects the `minNoticeHours`.
        f.  Add all valid start times to a list.
- **Output:** `{ "YYYY-MM-DD": ["HH:mm", "HH:mm", ...], ... }`

#### 4.2.2 CRUD Endpoints

Standard tRPC procedures will be created for managing `appointmentTypes`, `calendarAvailability`, and `calendarBlockedDates`, restricted to users with admin/owner access to the parent calendar.

### 4.3 Frontend (React)

-   **Appointment Types UI (`/settings/calendars/:id/appointment-types`):**
    -   A new tab on the calendar settings page.
    -   A UI for creating, editing, and toggling the `isActive` status of appointment types.
    -   Form fields will map directly to the `appointmentTypes` schema columns (Duration, Buffers, Notice, etc.).
-   **Availability UI (`/settings/calendars/:id/availability`):**
    -   A weekly schedule interface where users can define time ranges for each day of the week (e.g., a row for each day with "+ Add hours" to create a `CalendarAvailability` record).
    -   A separate section for "Blocked Dates" where admins can add specific dates (e.g., company holidays) using a date picker.

## 5. Acceptance Criteria

-   Admins must be able to create and manage different types of appointments, specifying duration, buffers, and booking notice periods.
-   Admins must be able to define a recurring weekly availability schedule for each calendar.
-   Admins must be able to block out specific dates as unavailable.
-   The backend must provide an API endpoint that accurately returns a list of available booking slots for a given calendar and appointment type.
-   The slot calculation must correctly account for existing events, availability rules, blocked dates, and buffers.
-   The system must prevent bookings that violate the minimum notice period.

## 6. Risks & Mitigation

-   **Risk:** Timezone complexity. The server, users, and clients may be in different timezones.
    -   **Mitigation:** All dates and times must be stored in UTC in the database. The server will perform all calculations in UTC. The client-side UI will be responsible for converting times to the user's local timezone for display purposes. The `availability.getSlots` endpoint will accept and return ISO 8601 formatted strings.
-   **Risk:** Performance of the `getSlots` endpoint could be slow if the date range is large or there are many events.
    -   **Mitigation:** Limit the maximum queryable date range to 3 months. Optimize database queries by ensuring all relevant columns (`calendarId`, `startDate`, `endDate`) are indexed. Implement caching for availability data where appropriate.

## 7. Estimated Effort

-   **Backend (Schema, Core Logic, API):** 20 hours
-   **Frontend (UI/UX for Settings):** 12 hours
-   **Total:** 32 hours

---

**Document End**
