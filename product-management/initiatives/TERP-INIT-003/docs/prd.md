# TERP Calendar & Scheduling Feature: Product Requirements Document (PRD)

**Version:** 2.0 (Post-Adversarial QA)
**Date:** November 03, 2025
**Status:** Revised based on critical QA findings and industry research

---

## 1. Introduction

This document provides the complete product requirements for the TERP Calendar & Scheduling feature. This v2.0 revision incorporates critical feedback from a rigorous adversarial QA process and is informed by deep research into calendar system best practices. It addresses fundamental gaps in the initial proposal related to performance, timezone handling, security, and data integrity, resulting in a significantly more robust and production-ready specification.

### 1.1. The Problem

The TERP system manages a complex web of time-sensitive operations across all modules. These activities, such as invoice due dates, order delivery schedules, batch expiration dates, and client meetings, currently exist in isolation. This lack of a unified, time-based view creates several critical problems:

*   **Operational Inefficiency:** Users must manually track deadlines and appointments, often using external tools, leading to context switching and redundant data entry.
*   **Increased Risk of Errors:** Without a centralized system, critical deadlines are easily missed, resulting in financial penalties (late fees), operational disruptions (expired inventory), and damaged client relationships (missed deliveries).
*   **Lack of Proactive Management:** The system is reactive. Users discover problems only after they occur. There is no mechanism to proactively alert users to upcoming commitments or potential scheduling conflicts.
*   **Poor Coordination:** Teams lack visibility into each other's schedules and commitments, making cross-departmental coordination difficult and inefficient.

### 1.2. The Proposed Solution

We will build a **deeply integrated, lightweight, and performant calendar and scheduling system** directly within the TERP platform. This system will provide a centralized, time-aware view of all business operations, automate event creation, and enable proactive management of schedules and deadlines.

The solution will be built entirely on the existing TERP technology stack (React, TypeScript, tRPC, MySQL) to ensure seamless integration and avoid external dependencies. It is designed from the ground up to be robust, scalable, and secure, addressing the common pitfalls of calendar system design.

### 1.3. Key Goals & Objectives

*   **Increase Operational Efficiency:** Reduce time spent on manual scheduling and coordination by at least 25%.
*   **Reduce Errors & Missed Deadlines:** Decrease the rate of missed payment, delivery, and compliance deadlines by over 50%.
*   **Improve Proactive Management:** Provide users with a forward-looking view of their commitments, enabling them to anticipate and resolve issues before they become critical.
*   **Enhance User Experience:** Deliver a simple, intuitive, and powerful scheduling experience that is seamlessly integrated into the user's daily workflow.
*   **Strengthen Competitive Advantage:** Differentiate TERP as an intelligent, proactive ERP system that anticipates user needs.

---

## 2. User Personas & Stories

### 2.1. Persona: Olivia, Operations Manager

*   **Needs:** A high-level view of all operational deadlines, including inventory intake, production schedules, delivery timelines, and compliance reporting. Needs to identify and resolve scheduling conflicts between departments.
*   **User Story:** "As Olivia, I want to see a unified calendar of all company-wide operational events so that I can identify potential bottlenecks and ensure all departments are aligned."

### 2.2. Persona: Alex, Accountant

*   **Needs:** To track all invoice due dates and bill payment deadlines automatically. Needs reminders for upcoming payments to optimize cash flow and avoid late fees.
*   **User Story:** "As Alex, I want every invoice I create to automatically generate a payment due date event on the calendar so that I never miss a collection and can proactively follow up on overdue payments."

### 2.3. Persona: Sam, Sales Representative

*   **Needs:** To schedule client meetings, track quote follow-ups, and manage recurring order schedules. Needs to see a client's entire history of interactions and upcoming events in one place.
*   **User Story:** "As Sam, I want to schedule a follow-up meeting with a client and have it automatically appear on my calendar, linked to the client's record, so I have full context for our conversation."

### 2.4. Persona: David, Warehouse Worker

*   **Needs:** A clear, simple view of his daily tasks, including scheduled inventory intakes, order picking assignments, and delivery preparations. Needs to operate primarily from a mobile device.
*   **User Story:** "As David, I want to view my daily schedule on my phone so I know exactly which orders to prepare and what deliveries are expected."

### 2.5. Persona: Chloe, VIP Client

*   **Needs:** To see the status of her orders, including scheduled delivery dates, and to book appointments with her sales representative through the VIP portal.
*   **User Story:** "As Chloe, I want to log into the VIP portal and see a calendar of my upcoming deliveries and appointments so I can plan accordingly."

---

## 3. Functional Requirements

### 3.1. Core Calendar Views

*   **FR-01: Month View:** Display a traditional monthly calendar grid. Events should be displayed as colored bars. The view must support navigation to previous/next months and a "Today" button.
*   **FR-02: Week View:** Display a weekly calendar with time slots (e.g., 30-minute intervals). Events should be displayed as blocks corresponding to their duration.
*   **FR-03: Day View:** Display a single day with time slots, providing a more detailed view of the day's schedule.
*   **FR-04: Agenda View:** Display a chronological list of upcoming events for a selected date range (e.g., next 7 days). Events should be grouped by day.

### 3.2. Event Management

*   **FR-05: Create Event:** Users must be able to create new events with a title, description, start/end date and time, timezone, location, and assigned user.
*   **FR-06: Update Event:** Users must be able to edit all fields of an existing event, subject to permissions.
*   **FR-07: Delete Event:** Users must be able to delete an event, subject to permissions. A confirmation modal must be shown before deletion.
*   **FR-08: Event Details:** Clicking an event must open a modal or side panel displaying all event details, including linked entities, participants, and history.
*   **FR-09: All-Day & Floating Events:** The system must support all-day events (which span the full day in the specified timezone) and floating time events (which are not tied to a specific timezone).

### 3.3. Recurrence

*   **FR-10: Recurrence Rule Creation:** Users must be able to define recurrence patterns for events, including:
    *   Frequency: Daily, Weekly, Monthly, Yearly
    *   Interval: Every X days/weeks/months/years
    *   Weekly: On specific days of the week (e.g., Mon, Wed, Fri)
    *   Monthly: On a specific day of the month (e.g., the 15th) or a specific day of the week (e.g., the 2nd Tuesday)
    *   Bounds: End after a specific number of occurrences or on a specific date.
*   **FR-11: Recurrence Instance Modification:** Users must be able to edit or delete a single instance of a recurring event, all future instances, or the entire series.
*   **FR-12: Exception Handling:** The system must correctly handle exceptions to recurrence rules (e.g., a rescheduled or cancelled instance).

### 3.4. Integration & Automation

*   **FR-13: Entity Linking:** Events must be linkable to any core TERP entity (e.g., Order, Invoice, Client, Batch). The event details view must display a link to the associated entity.
*   **FR-14: Contextual Event Display:** When viewing an entity (e.g., an Order), a list of all associated calendar events must be displayed.
*   **FR-15: Automated Event Generation:** The system must automatically generate calendar events based on business rules, including:
    *   **Invoices:** Create a payment due date event when an invoice is created.
    *   **Orders:** Create a delivery schedule event when an order is confirmed.
    *   **Batches:** Create expiration warning events at predefined intervals before a batch expires.
    *   **Quotes:** Create a follow-up event X days after a quote is sent.
*   **FR-16: User Control over Automation:** Users must be able to enable or disable specific auto-generation rules in their personal settings.

### 3.5. Collaboration & Sharing

*   **FR-17: Participants:** Users must be able to add other TERP users as participants to an event with roles (Required, Optional).
*   **FR-18: Invitations & Responses:** Participants must receive an in-app notification when invited to an event and must be able to respond (Accept, Decline, Tentative).
*   **FR-19: Event Visibility:** Events must have visibility settings (Private, Team, Company, Public) to control who can see them.
*   **FR-20: Event Sharing:** Users must be able to generate a shareable, read-only link for an event to share with external parties.

### 3.6. Filtering & Search

*   **FR-21: Advanced Filtering:** Users must be able to filter the calendar view by:
    *   Module (e.g., show only Accounting events)
    *   Event Type
    *   Status
    *   Priority
    *   Assigned User
*   **FR-22: Custom Views:** Users must be able to save their current filter configuration as a named, custom view for quick access.
*   **FR-23: Full-Text Search:** The system must provide a search bar to find events by keywords in the title, description, or location.

### 3.7. Notifications & Reminders

*   **FR-24: Configurable Reminders:** Users must be able to set multiple reminders for an event (e.g., 1 day before, 1 hour before).
*   **FR-25: Notification Channels:** Reminders and notifications must be delivered via in-app notification and optionally via email.
*   **FR-26: Notification Center:** A centralized notification center must display a history of all calendar-related notifications.

### 3.8. Advanced Features

*   **FR-27: Conflict Detection:** When creating or rescheduling an event, the system must automatically check for scheduling conflicts with the assigned user's existing events and display a warning.
*   **FR-28: Smart Suggestions:** If a conflict is detected, the system should suggest 3-5 alternative time slots.
*   **FR-29: Drag-and-Drop Rescheduling:** In Week and Day views, users must be able to reschedule events by dragging and dropping them to a new time slot.
*   **FR-30: Event History:** The system must maintain an audit trail of all changes made to an event, visible in the event details view.

---

## 4. Non-Functional Requirements

### 4.1. Performance

*   **NFR-01: Page Load Time:** The main calendar view must load in under 1 second with up to 10,000 events in the user's view.
*   **NFR-02: Interaction Latency:** All UI interactions (e.g., creating an event, applying a filter) must complete in under 500ms.
*   **NFR-03: API Response Time:** All calendar-related API endpoints must have a P95 response time of less than 200ms.
*   **NFR-04: Scalability:** The system must maintain performance with up to 1 million total events in the database and 1,000 concurrent users.

### 4.2. Reliability & Availability

*   **NFR-05: Uptime:** The calendar feature must have an uptime of 99.9%.
*   **NFR-06: Error Rate:** The server-side error rate for all calendar operations must be less than 0.1%.
*   **NFR-07: Data Integrity:** The system must guarantee zero data loss. All operations must be transactional. Orphaned events or reminders must be prevented or cleaned up by background jobs.

### 4.3. Security

*   **NFR-08: Access Control:** All API endpoints must enforce a robust Role-Based Access Control (RBAC) system. A user must never be able to see or modify an event they do not have permission for.
*   **NFR-09: Input Validation:** All user inputs must be rigorously validated on both the client and server to prevent injection attacks.
*   **NFR-10: Audit Trail:** All sensitive actions (creating, updating, deleting events) must be logged in an immutable audit trail.

### 4.4. Usability & Accessibility

*   **NFR-11: Mobile-First Design:** The calendar interface must be fully responsive and optimized for a mobile-first experience.
*   **NFR-12: Accessibility:** The feature must comply with WCAG 2.1 AA standards, including full keyboard navigation and screen reader support.
*   **NFR-13: Intuitiveness:** A new user should be able to perform core tasks (create event, view schedule) without requiring training.

### 4.5. Timezone Handling

*   **NFR-14: Timezone Accuracy:** The system must correctly handle all IANA timezones and their historical and future DST rules.
*   **NFR-15: Ghost & Ambiguous Time:** The system must prevent the creation of events during "ghost times" (e.g., 2:30 AM during a DST spring-forward) and provide disambiguation for "ambiguous times" (e.g., 1:30 AM during a DST fall-back).

---

## 5. Implementation Plan (Revised)

The project will be executed in four phases, including a new **Phase 0** to build a solid foundation before developing user-facing features.

### Phase 0: Foundation (4 weeks)

*   **Goal:** Implement the core backend architecture, including the revised database schema, permission system, and timezone handling, to de-risk the project.
*   **Key Deliverables:**
    *   Finalized database schema and migration scripts.
    *   Core services: TimezoneService, PermissionService, InstanceGenerationService.
    *   Core tRPC endpoints with error handling.
    *   Background jobs for instance generation and reminders.

### Phase 1: MVP (8 weeks)

*   **Goal:** Deliver core, usable calendar functionality with initial integrations.
*   **Key Deliverables:**
    *   Month, Week, and Agenda views.
    *   Basic event creation and editing.
    *   Automated event generation for invoices and orders.
    *   Contextual event display on entity pages.

### Phase 2: Enhanced Functionality (6 weeks)

*   **Goal:** Add collaboration and advanced customization features.
*   **Key Deliverables:**
    *   Multi-user events with participant invitations and responses.
    *   Custom, savable calendar views.
    *   Conflict detection warnings.
    *   Drag-and-drop rescheduling.

### Phase 3: Proactive & Collaborative (6 weeks)

*   **Goal:** Introduce intelligent scheduling and client-facing capabilities.
*   **Key Deliverables:**
    *   Smart suggestions for alternative time slots.
    *   VIP Portal calendar view.
    *   Event sharing with external parties.
    *   Comprehensive user documentation and training materials.

**Total Estimated Timeline:** 24 weeks (6 months)

---

## 6. Success Metrics (Revised)

| Category | Metric | Target | Measurement Method |
|---|---|---|---|
| **Adoption** | Weekly Active Users (WAU) | >70% of TERP WAUs | Analytics tracking |
| | Events Created per User per Week | >10 | Analytics tracking |
| | Auto-Generated Events | >50% of all new events | Database query |
| **Performance** | P95 Calendar Page Load | < 1 second | Frontend performance monitoring |
| | P95 API Response Time | < 200ms | Backend performance monitoring |
| **Reliability** | API Error Rate | < 0.1% | Logging and monitoring tools |
| | Uptime | 99.9% | Uptime monitoring service |
| **User Satisfaction** | In-App Survey Rating | > 4.5 / 5.0 | Post-usage survey |
| | Time Saved (Self-Reported) | > 1 hour/week | Quarterly user survey |
| **Business Impact** | Reduction in Late Payments | 25% reduction YoY | Accounting module data |

---

## 7. Risks & Mitigation (Revised)

| Risk | Impact | Likelihood | Mitigation Strategy |
|---|---|---|---|
| **Technical Complexity** | Delays, bugs, performance issues | High | **Addressed by Phase 0.** Building the foundational services (timezone, recurrence, permissions) first de-risks the most complex parts of the project. |
| **Scope Creep** | Timeline extension, budget overrun | Medium | Strict adherence to the phased roadmap. New feature requests will be added to a backlog for consideration in a future v2.1 release. |
| **Performance Degradation** | Poor user experience at scale | Medium | **Addressed by new architecture.** Materialized instances, aggressive indexing, and a multi-layer caching strategy are designed specifically to handle large data volumes. |
| **Low User Adoption** | Feature provides low ROI | Low | Automated event generation ensures immediate value without user effort. The design is deeply integrated into existing workflows, not a separate tool to learn. |
| **Data Migration Failure** | Production data corruption or loss | Low | A detailed, multi-step migration plan with rollback procedures and extensive staging tests will be executed. A feature flag will allow for instant disabling without data loss. |

---

## 8. Open Questions

*   What should be the default set of permissions for different user roles (e.g., Sales, Accounting, Warehouse)?
*   What is the desired data retention policy for the event audit trail (`calendarEventHistory`)?
*   Should resource scheduling (e.g., booking meeting rooms) be included in the initial scope or deferred?

---

## 9. References

1.  **Red Gate (2016).** *Again and Again! Managing Recurring Events In a Data Model.* [https://www.red-gate.com/blog/again-and-again-managing-recurring-events-in-a-data-model](https://www.red-gate.com/blog/again-and-again-managing-recurring-events-in-a-data-model)
2.  **W3C (2025).** *Working with Time and Timezones.* [https://www.w3.org/TR/timezone/](https://www.w3.org/TR/timezone/)

---

## 10. Approval

| Name | Role | Date |
|---|---|---|
| | Product Manager | |
| | Lead Engineer | |
| | Head of Operations | |


---

## **V2.1 Addendum: Client & Financial Integrations**

**Date:** November 03, 2025

This addendum details new features requested by the user to deepen the calendar's integration with client relationship management and financial operations.

### **1. New User Personas & Stories**

**Persona: Alex (Account Manager)**
- **As Alex,** I want to see all past and upcoming meetings with a client directly on their profile page, so I can quickly understand our interaction history.
- **As Alex,** I need to confirm whether a past meeting actually happened, so our client interaction records are accurate.
- **As Alex,** I want to add notes and action items to a meeting record after it occurs, so I can track follow-ups.

**Persona: Brenda (Accounting Manager)**
- **As Brenda,** I need to see a daily and weekly view of my upcoming AP/AR meetings, so I can prepare for collections calls.
- **As Brenda,** I want the meeting view to show relevant financial context (outstanding AR, overdue amounts, credit status), so I don't have to look it up manually.
- **As Brenda,** I want a dedicated collections calendar that highlights overdue accounts by urgency, so I can prioritize my efforts.

**Persona: Chris (Sales Representative)**
- **As Chris,** I want to set a custom reminder for a sales sheet I've sent, so I can follow up at the perfect time.
- **As Chris,** I want to set multiple reminders for a single sales sheet, so I can have multiple touchpoints.
- **As Chris,** I want to see all my upcoming sales sheet reminders in one place, so I can plan my follow-up activities.

### **2. Updated Functional Requirements**

| ID | Requirement | Description | Priority | Phase |
|---|---|---|---|---|
| **FR-C10** | **Client Profile Meeting History** | A "Meetings" tab will be added to the client profile page, showing lists of upcoming and past meetings associated with that client. | P0 | 1 |
| **FR-C11** | **Meeting Confirmation Workflow** | For past, unconfirmed meetings, the UI will prompt users to confirm the meeting's outcome (e.g., Completed, No-Show, Rescheduled, Cancelled). | P0 | 1 |
| **FR-C12** | **Post-Meeting Notes & Actions** | After confirming a meeting, users can add notes and structured action items to the meeting record. This data will be stored in the `clientMeetingHistory` table. | P0 | 1 |
| **FR-C13** | **AP/AR Meeting Prep Dashboard** | The Accounting Manager dashboard will feature widgets for "Today's Meetings" and "This Week's Meetings", displaying financial context (AR, overdue amounts) for each. | P0 | 1 |
| **FR-C14** | **Detailed Meeting Prep View** | Clicking a meeting from the prep dashboard will navigate to a detailed view with full financial overview, outstanding invoices, and talking points. | P0 | 1 |
| **FR-C15** | **Collections-Focused Calendar** | A dedicated calendar view for AR Collections, color-coded by overdue status, with a prioritized collections queue. | P1 | 2 |
| **FR-C16** | **Sales Sheet Custom Reminders** | On the sales sheet creation/edit page, users can set one or more custom reminders with relative or specific date/time. | P0 | 1 |
| **FR-C17** | **Sales Sheet Reminder Management** | The sales sheet list view will display indicators for pending reminders. A dedicated widget will show upcoming reminders. | P0 | 1 |

### **3. Updated Success Metrics**

| Metric | Description | Target |
|---|---|---|
| **Meeting Confirmation Rate** | % of past meetings that have a confirmed outcome (Completed, No-Show, etc.). | > 90% within 3 months |
| **Sales Sheet Reminder Adoption** | % of new sales sheets created with at least one reminder set. | > 75% within 2 months |
| **Follow-up Rate** | % of sales sheet reminders that are marked as "completed" or lead to a subsequent client interaction within 48 hours. | > 80% |
| **Collections Call Prep Time** | Time saved by accounting managers preparing for collections calls. | Reduce prep time by 50% |

