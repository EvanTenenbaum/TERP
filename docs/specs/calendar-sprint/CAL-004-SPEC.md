_No response._
_CAL-004-SPEC.md_

# Specification: CAL-004 - Enhanced Features

**Document Version:** 1.0  
**Date:** January 2, 2026  
**Author:** Manus AI  
**Status:** DRAFT
**Depends On:** [CAL-003](./CAL-003-SPEC.md)

---

## 1. Overview

This document provides the technical specification for **CAL-004: Enhanced Features**. This final phase of the calendar overhaul focuses on adding high-value "quality of life" features that build upon the foundational work of the previous phases. The three core enhancements are:

1.  **Recurring Events UI:** Activating the latent backend capability for recurring events by building the necessary user interface.
2.  **Vacation & Time Off System:** Formalizing vacation and sick leave tracking, and integrating it with the availability system.
3.  **Mobile Experience Optimization:** Improving the usability and responsiveness of the calendar for users on mobile devices.

These features are designed to round out the calendar module, making it a robust, enterprise-grade scheduling tool that is both powerful on the desktop and accessible on the go.

## 2. Business & User Value

- **Business Value:** Reduces manual data entry by allowing recurring events to be created once. Improves resource planning by making employee time-off a formal part of the scheduling system. Increases productivity by providing a functional mobile interface for staff in the field.
- **User Value:** Saves significant time for users who manage repeating meetings or tasks. Provides a clear and easy way to request time off and see team availability. Enables users to manage their schedule effectively from any device, anywhere.

## 3. Scope

### 3.1 In Scope

- **Recurring Events:**
    - **Frontend:** A new UI section in the "Create/Edit Event" modal to configure recurrence rules (e.g., "Repeats every week on Tuesday until...").
    - **Frontend:** Logic to handle editing or deleting a single instance of a recurring event versus the entire series.
    - **Frontend:** A visual indicator (e.g., a circular arrow icon) on events that are part of a recurring series.
- **Vacation & Time Off:**
    - **Schema:** Addition of an `isTimeOff` flag and `timeOffStatus` to the `calendarEvents` table.
    - **Backend:** A simple approval workflow for time-off requests.
    - **Backend:** Logic to ensure that approved time-off events automatically block the user's availability for appointment booking.
    - **Frontend:** A new "Request Time Off" form and a view for managers to see and approve/reject team requests.
- **Mobile Optimization:**
    - **CSS/Layout:** Refactoring the main calendar grid to be responsive, likely defaulting to a week or agenda view on smaller screens.
    - **Component Redesign:** Adapting modals (like Create Event) to become full-screen views or bottom sheets on mobile.
    - **Interaction Design:** Implementing touch-friendly interactions, such as swipe gestures to navigate between weeks.

### 3.2 Out of Scope

- Complex, multi-stage time-off approval chains.
- Time-off accrual or balance tracking (e.g., PTO banks).
- Full feature parity between desktop and mobile (the goal is a usable, core-feature-focused mobile experience, not a 1:1 replica).
- Native mobile application development (this focuses on responsive web design).

## 4. Technical Implementation Details

### 4.1 Recurring Events UI

- **Leverage Existing Schema:** The `calendarEvents` table already contains `recurrenceRule` (iCal RRULE string), `recurrenceEndDate`, and `parentEventId`. The frontend will be responsible for generating and parsing these RRULE strings.
- **UI Component:**
    - A checkbox "Does this event repeat?" will reveal the recurrence options.
    - Dropdowns for frequency (`Daily`, `Weekly`, `Monthly`, `Yearly`).
    - Conditional inputs based on frequency (e.g., "Repeats every `[2]` weeks on `[Mon, Wed]`").
    - An end condition (e.g., "Ends on `[Date]`" or "Ends after `[10]` occurrences").
- **Edit/Delete Logic:**
    - When a user attempts to edit or delete a recurring event, a modal will prompt them: "Do you want to change only this event, or all future events in the series?"
    - **"This event only":** A new `calendarEvents` record is created as an "exception" with its `parentEventId` pointing to the original series event.
    - **"All future events":** The `recurrenceEndDate` of the original series is modified to end before the current instance, and a new recurring series is created starting from the current instance.

### 4.2 Vacation & Time Off

- **Schema Modification:**
    - Add `isTimeOff` (BOOLEAN) to `calendarEvents` to flag these events for special handling.
    - Add `timeOffStatus` (TEXT: `'pending', 'approved', 'rejected'`) to `calendarEvents`.
- **Workflow:**
    1.  A user submits a "Time Off" event via a simplified event form. The event is created with `isTimeOff: true` and `timeOffStatus: 'pending'`.
    2.  A `TIME_OFF_REQUESTED` notification is sent to the user's manager.
    3.  The manager sees the pending request in a dedicated view.
    4.  The manager can "Approve" or "Reject".
        -   **Approve:** The event's `timeOffStatus` is updated to `'approved'`.
        -   **Reject:** The event is deleted or its status is updated to `'rejected'`.
- **Availability Integration:**
    - The `availability.getSlots` endpoint (from CAL-002) will be modified.
    - In addition to fetching regular events, it will now also fetch all `calendarEvents` where `isTimeOff: true` and `timeOffStatus: 'approved'` for the relevant users/calendars.
    - These time-off blocks will be treated as unavailable "busy" slots during the availability calculation.

### 4.3 Mobile Optimization

- **Responsive Grid:**
    - Use CSS media queries to change the calendar display.
    - `> 768px` (desktop): Default to Month view.
    - `< 768px` (mobile): Default to a single-day or 3-day view. Implement a swipe gesture to move between days/weeks.
- **Full-Screen Modals:**
    - The `Create Event` and `Event Detail` modals will be refactored. On mobile viewports, they will render as full-screen overlays rather than centered modals, providing more space for content and larger touch targets.
- **Bottom Sheet for Actions:**
    - On mobile, secondary actions (like filtering, event options) will appear in a bottom sheet component, which is more ergonomic for one-handed use.

## 5. Acceptance Criteria

-   Users must be able to create an event that repeats on a daily, weekly, or monthly schedule.
-   When editing a recurring event, the user must be given the choice to edit a single instance or the entire series.
-   Recurring events must be clearly marked with an icon in all calendar views.
-   Users must be able to submit a request for time off.
-   Managers must be able to approve or reject time-off requests.
-   Approved time off must automatically make the user unavailable for new appointment bookings during that period.
-   The calendar interface must be usable on a mobile device with a screen width of 375px.
-   On mobile, the calendar view must adapt to the smaller screen size, avoiding horizontal scrolling or cramped text.

## 6. Risks & Mitigation

-   **Risk:** **RRULE Complexity.** iCal RRULE strings can be complex and a source of bugs.
    -   **Mitigation:** Use a well-tested, popular open-source library (e.g., `rrule.js`) for generating, parsing, and interpreting RRULEs on the frontend. This avoids reinventing the wheel and leverages community-vetted code.
-   **Risk:** **Performance on Mobile.** A complex calendar with many events can be slow to render on less powerful mobile devices.
    -   **Mitigation:** Implement view virtualization for agenda/list views, rendering only the events currently in the viewport. Limit the default date range loaded on mobile to a shorter period (e.g., one week at a time).

## 7. Estimated Effort

-   **Recurring Events UI:** 8 hours
-   **Vacation/Time Off System:** 6 hours
-   **Mobile Optimization:** 6 hours
-   **Total:** 20 hours

---

**Document End**
