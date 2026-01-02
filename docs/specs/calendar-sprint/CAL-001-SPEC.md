

# Specification: CAL-001 - Calendar Foundation

**Document Version:** 1.0  
**Date:** January 2, 2026  
**Author:** Manus AI  
**Status:** DRAFT

---

## 1. Overview

This document provides the technical specification for **CAL-001: Calendar Foundation**, the first phase of the comprehensive Calendar module overhaul. This phase focuses on establishing the foundational architecture required to support multiple, purpose-driven calendars within the TERP system. The primary goal is to enable the creation and management of distinct calendars (e.g., for Accounting and Office/Sales) and to associate events with these specific calendars.

This phase is a prerequisite for all subsequent calendar improvements, including availability management (CAL-002), appointment booking workflows (CAL-003), and other enhanced features (CAL-004).

## 2. Business & User Value

- **Business Value:** Enables segregation of duties and scheduling contexts, allowing the Accounting team to manage payment-related appointments independently from the Sales team's client meetings. This improves operational efficiency and reduces scheduling conflicts.
- **User Value:** Provides users with a more organized and context-relevant calendar view. Users can focus on events pertinent to their role by filtering for specific calendars, reducing clutter and improving clarity.

## 3. Scope

### 3.1 In Scope

- **Database Schema:**
    - Creation of a new `calendars` table to store calendar definitions.
    - Creation of a new `calendar_user_access` table to manage user permissions for each calendar.
    - Addition of a `calendarId` foreign key to the `calendarEvents` table.
- **Data Migration:**
    - A migration script to create default "Accounting" and "Office" calendars.
    - A migration script to associate all existing `calendarEvents` with the "Office" calendar as a baseline.
- **Backend (tRPC):**
    - API endpoints for CRUD operations on `calendars`.
    - API endpoints to manage user access to calendars.
    - Modification of event creation/update endpoints to require a `calendarId`.
    - Modification of event fetching endpoints to allow filtering by `calendarId`.
- **Frontend (React/TypeScript):**
    - **Settings Page:** A new section under `Settings > Workspace` for "Calendars" to allow admins to create, edit, and archive calendars.
    - **Event Forms:** Addition of a "Calendar" dropdown selector to the "Create Event" and "Edit Event" modals.
    - **Calendar View:** A multi-select filter dropdown in the main calendar view to toggle the visibility of different calendars.
    - **Calendar Legend:** A visual legend indicating the color-coding for each visible calendar.

### 3.2 Out of Scope

- Per-calendar availability rules (handled in CAL-002).
- Appointment booking or request workflows (handled in CAL-003).
- User-specific personal calendars (this phase focuses on workspace-level calendars).
- Publicly shareable calendar links.
- Integration with external calendar services (e.g., Google Calendar, Outlook).

## 4. Technical Implementation Details

### 4.1 Database Schema

#### 4.1.1 New Table: `calendars`

This table will store the definition for each calendar.

```sql
CREATE TABLE "calendars" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(7) NOT NULL DEFAULT '#007bff', -- Default blue color
    "type" TEXT NOT NULL DEFAULT 'workspace', -- e.g., 'workspace', 'personal'
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" UUID REFERENCES "users"("id"), -- For future use with personal calendars
    "workspaceId" UUID NOT NULL REFERENCES "workspaces"("id"),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendars_pkey" PRIMARY KEY ("id")
);
```

**Fields Justification:**
- `color`: To visually distinguish events from different calendars.
- `type`: To differentiate between shared workspace calendars and future personal calendars.
- `isDefault`: The calendar to which new events are assigned by default.
- `isArchived`: For soft-deleting calendars instead of hard-deleting, preserving historical event data.

#### 4.1.2 New Table: `calendar_user_access`

This pivot table manages user access rights to specific calendars.

```sql
CREATE TABLE "calendar_user_access" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "calendarId" UUID NOT NULL REFERENCES "calendars"("id") ON DELETE CASCADE,
    "accessLevel" TEXT NOT NULL, -- e.g., 'view_only', 'can_edit', 'is_owner'

    CONSTRAINT "calendar_user_access_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_calendar_unique" UNIQUE ("userId", "calendarId")
);
```

**Fields Justification:**
- `accessLevel`: Provides granular control over what a user can do within a calendar.

#### 4.1.3 Modification: `calendarEvents` Table

A non-nullable foreign key will be added to associate each event with a calendar.

```sql
ALTER TABLE "calendarEvents"
ADD COLUMN "calendarId" UUID;

-- After migration script runs to populate existing events --

ALTER TABLE "calendarEvents"
ALTER COLUMN "calendarId" SET NOT NULL;

ALTER TABLE "calendarEvents"
ADD CONSTRAINT "calendarEvents_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

**Constraint Choice:** `ON DELETE RESTRICT` is chosen to prevent a calendar from being deleted if it still contains events, ensuring data integrity.

### 4.2 Data Migration

1.  **Create Default Calendars:** A script will run upon deployment to:
    -   Create an "Office" calendar (`color: #3498db`, `isDefault: true`).
    -   Create an "Accounting" calendar (`color: #2ecc71`).
    -   Grant `is_owner` access to all admin users for these calendars.
2.  **Associate Existing Events:** A second script will update all existing records in the `calendarEvents` table, setting their `calendarId` to the ID of the newly created "Office" calendar.

### 4.3 Backend (tRPC API)

| Endpoint | Action | Request Body / Params | Response | Permissions |
|---|---|---|---|---|
| `calendar.create` | Create a new calendar | `{ name, description, color }` | `Calendar` object | Admin |
| `calendar.update` | Update a calendar | `{ id, name, description, color }` | `Calendar` object | Admin |
| `calendar.archive` | Archive a calendar | `{ id }` | `Calendar` object | Admin |
| `calendar.list` | List all accessible calendars | `{}` | `Calendar[]` | Authenticated User |
| `calendar.addUser` | Grant user access | `{ calendarId, userId, accessLevel }` | `CalendarUserAccess` | Admin |
| `calendar.removeUser` | Revoke user access | `{ calendarId, userId }` | `Success` | Admin |
| `event.create` | (Modified) Create event | `{ ..., calendarId }` | `CalendarEvent` | User with `can_edit` access |
| `event.list` | (Modified) List events | `{ ..., calendarIds: UUID[] }` | `CalendarEvent[]` | User with `view_only` access |

### 4.4 Frontend (React)

-   **Calendar Management UI (`/settings/calendars`):**
    -   A table listing all workspace calendars with columns for `Name`, `Description`, `Color`, and `Actions` (Edit, Archive).
    -   A "Create Calendar" button that opens a modal for creating a new calendar.
    -   The "Edit" action will allow changing the name, description, and color.
-   **Event Form Modification:**
    -   A new `<Select>` component will be added to the "Create Event" and "Edit Event" modals.
    -   The dropdown will be labeled "Calendar" and will be a required field.
    -   It will be populated with the list of calendars for which the current user has `can_edit` access.
-   **Calendar View Filtering:**
    -   The existing "Filters" button will be updated to include a "Calendars" section.
    -   This section will contain a list of checkboxes, one for each calendar the user can view.
    -   By default, all calendars are selected.
    -   Checking/unchecking a box will add/remove the `calendarId` from the `event.list` API call and update the view.
    -   A legend will be displayed below the filters showing the color and name of each selected calendar.

## 5. Acceptance Criteria

-   Admins must be able to access a new "Calendars" management page in the Settings area.
-   Admins must be able to create, edit, and archive calendars.
-   When creating or editing an event, the user must select a calendar from a dropdown list.
-   The main calendar view must allow users to filter events by one or more calendars.
-   Events on the calendar must be visually differentiated by the color of the calendar they belong to.
-   All existing events prior to this deployment must be successfully migrated and assigned to the default "Office" calendar.
-   Attempting to delete a calendar that contains events must result in a user-friendly error message.

## 6. Risks & Mitigation

-   **Risk:** Data migration failure could lead to orphaned events.
    -   **Mitigation:** The migration script must be thoroughly tested in a staging environment. It should be idempotent and include robust error handling and logging.
-   **Risk:** Performance degradation if a user has access to a very large number of calendars and events.
    -   **Mitigation:** API endpoints will be paginated. The frontend will virtualize long lists of events in the Agenda view.

## 7. Estimated Effort

-   **Backend (Schema, API, Migration):** 12 hours
-   **Frontend (UI/UX):** 12 hours
-   **Total:** 24 hours

---

**Document End**
