_No response._
_CAL-003-SPEC.md_

# Specification: CAL-003 - Request/Approval Workflow

**Document Version:** 1.0  
**Date:** January 2, 2026  
**Author:** Manus AI  
**Status:** DRAFT
**Depends On:** [CAL-002](./CAL-002-SPEC.md), [NOTIF-001](../core-systems/NOTIF-001-SPEC.md)

---

## 1. Overview

This document provides the technical specification for **CAL-003: Request/Approval Workflow**. This phase introduces the critical business logic for managing appointment bookings in a regulated environment. Unlike direct-booking systems (like public Calendly), TERP requires that all client-initiated appointments are treated as **requests** that must be reviewed and explicitly approved by a staff member.

This workflow is the bridge between the availability engine (CAL-002) and the client-facing booking interface (VIP-C-001). It ensures that the business maintains full control over its schedule while providing a structured and transparent booking process for VIP clients.

## 2. Business & User Value

- **Business Value:** Provides a crucial control gate for all inbound appointment requests, preventing unwanted or unvetted appointments from appearing on the company calendar. This is essential for security, compliance, and resource management in the cannabis wholesale industry.
- **User Value (Managers):** Creates a centralized queue for all incoming appointment requests, allowing for efficient review and management. It provides managers with the context needed to make informed decisions (approve, reject, or propose a new time) and communicates these decisions back to the client automatically.
- **User Value (Clients):** Offers a clear and professional booking experience. Clients receive confirmation that their request has been submitted and are notified of the final decision, eliminating uncertainty.

## 3. Scope

### 3.1 In Scope

- **Database Schema:**
    - Creation of the `appointmentRequests` table to store the state of each booking request.
- **Backend (tRPC):**
    - An `appointment.request` endpoint for submitting a new appointment request (to be used by VIP-C-001).
    - `appointment.approve`, `appointment.reject`, and `appointment.proposeNewTime` endpoints for managers.
    - Logic upon approval to automatically create a corresponding event in the `calendarEvents` table and mark the time slot as unavailable.
- **Frontend (React/TypeScript):**
    - A new UI component, possibly a tab or a filterable view within the main Calendar page, to display and manage pending appointment requests.
    - A detail view for each request, showing client information, requested time, and any notes.
    - Action buttons (Approve, Reject, Propose New Time) for managers.
- **Notification Integration:**
    - Triggering notifications via NOTIF-001 for:
        - New appointment request (to managers).
        - Request approved (to client).
        - Request rejected (to client).

### 3.2 Out of Scope

- The client-facing UI for selecting a time and submitting a request (this is the responsibility of **VIP-C-001**).
- Complex rescheduling negotiations (the `proposeNewTime` action is a one-shot suggestion; further negotiation is handled outside this scope).
- Automated or rule-based approval of requests.

## 4. Technical Implementation Details

### 4.1 Database Schema

#### 4.1.1 New Table: `appointmentRequests`

This table is the single source of truth for the state of any booking attempt.

```sql
CREATE TABLE "appointmentRequests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "appointmentTypeId" UUID NOT NULL REFERENCES "appointmentTypes"('id'),
    "calendarId" UUID NOT NULL REFERENCES "calendars"('id'),
    "clientId" UUID NOT NULL REFERENCES "clients"('id'),
    "requestedDateTime" TIMESTAMP(3) NOT NULL, -- The start time the client requested
    "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
    "notes" TEXT, -- Notes from the client
    "responseNotes" TEXT, -- Notes from the manager when responding
    "respondedBy" UUID REFERENCES "users"('id'),
    "calendarEventId" UUID REFERENCES "calendarEvents"('id'), -- Populated upon approval
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "appointmentRequests_pkey" PRIMARY KEY ("id")
);
```

**Fields Justification:**
- `status`: The core of the workflow, tracking the request from `pending` to a final state.
- `calendarEventId`: A direct link to the official event created upon approval, ensuring traceability.
- `responseNotes`: Allows managers to provide a reason for rejection or other context.

### 4.2 Backend (tRPC API)

#### 4.2.1 `appointment.request` (Publicly accessible by VIP clients)

- **Input:** `{ appointmentTypeId: UUID, clientId: UUID, requestedDateTime: ISOString, notes: string }`
- **Process:**
    1.  **Validation:** Call `availability.getSlots` internally to verify that the `requestedDateTime` is still a valid, available slot. This prevents race conditions.
    2.  If the slot is valid, create a new record in the `appointmentRequests` table with `status: 'pending'`.
    3.  Trigger a **`NEW_APPOINTMENT_REQUEST`** notification (via NOTIF-001) to the managers/owners of the associated calendar.
- **Output:** `{ success: true, requestId: UUID }`

#### 4.2.2 `appointment.approve` (Manager only)

- **Input:** `{ requestId: UUID }`
- **Process:**
    1.  Find the `appointmentRequest` record.
    2.  **Locking:** Begin a database transaction.
    3.  **Final Conflict Check:** Re-verify the requested time slot is still free. If it has been taken by another event since the request was made, return an error.
    4.  If free, create a new `calendarEvents` record using the details from the request.
    5.  Update the `appointmentRequest` record:
        -   Set `status` to `'approved'`.
        -   Set `calendarEventId` to the ID of the newly created event.
        -   Set `respondedBy` and `respondedAt`.
    6.  Commit the transaction.
    7.  Trigger an **`APPOINTMENT_APPROVED`** notification to the client.
- **Output:** `{ success: true, eventId: UUID }`

#### 4.2.3 `appointment.reject` (Manager only)

- **Input:** `{ requestId: UUID, responseNotes: string }`
- **Process:**
    1.  Update the `appointmentRequest` record:
        -   Set `status` to `'rejected'`.
        -   Set `responseNotes`, `respondedBy`, and `respondedAt`.
    2.  Trigger an **`APPOINTMENT_REJECTED`** notification to the client.
- **Output:** `{ success: true }`

### 4.3 Frontend (React)

-   **Pending Requests View:**
    -   A new view, likely accessible from a badge on the main "Calendar" navigation item or a dedicated tab on the calendar page.
    -   This view will list all `appointmentRequests` with a `status` of `'pending'`.
    -   Each item in the list will be a card showing: `Client Name`, `Appointment Type`, `Requested Date & Time`, and a snippet of the client's `notes`.
-   **Request Detail Modal:**
    -   Clicking a request card opens a modal with full details.
    -   The modal will prominently feature three action buttons: **Approve**, **Reject**, and **Propose New Time** (out of scope for this phase, can be disabled initially).
    -   The "Reject" action should require the manager to enter a reason in the `responseNotes` field.

## 5. Acceptance Criteria

-   The system must be able to receive and store appointment requests from a client-facing interface.
-   Managers must have a dedicated interface to view and manage pending appointment requests.
-   Approving a request must automatically create a corresponding event on the correct calendar.
-   Approving a request must prevent that time slot from being booked by others.
-   Rejecting a request must update its status and notify the client with a reason.
-   All state changes in the workflow must trigger the appropriate notifications to the relevant parties (managers and clients).
-   The system must handle race conditions, preventing the approval of a request for a time slot that is no longer available.

## 6. Risks & Mitigation

-   **Risk:** **Notification Failure.** If the NOTIF-001 service is down, managers or clients may not be notified of state changes.
    -   **Mitigation:** The workflow itself should be transactional and not dependent on the notification succeeding. Implement a robust retry mechanism for notifications. The UI should serve as the source of truth; managers can always see pending requests in their queue even if the initial notification fails.
-   **Risk:** **Orphaned Requests.** A bug could lead to a request being approved without a `calendarEvent` being created.
    -   **Mitigation:** The approval process **must** be wrapped in a single database transaction. If event creation fails, the entire operation rolls back, and the request remains `pending`.

## 7. Estimated Effort

-   **Backend (Schema, API, Workflow Logic):** 14 hours
-   **Frontend (Manager UI):** 10 hours
-   **Total:** 24 hours

---

**Document End**
