# Baseline excerpt for `CalendarPage`

**Route:** `/calendar` — Depth: **full**

## From FUNCTIONAL_BASELINE.md

### Page: `CalendarPage` (lazy)

* **Route:** `/calendar`.
* **Tabs:** `calendar`, `invitations`, `requests`, `timeoff` (set via `?tab=`; default `calendar`).
* **Views:** Month / Week / Day / Agenda (`MonthView`, `WeekView`, `DayView`, `AgendaView`).
* **Panels:**
  * `CalendarFilters` — filter by calendar, owner, category.
  * `PendingInvitationsWidget` — pending invitations for current user.
  * `AppointmentRequestsList` + `AppointmentRequestModal` — approve/reject client appointment requests.
  * `TimeOffRequestsList` — manage team time-off.
  * `EventFormDialog` — create/edit event (recurrence, participants, reminders).
* **Badge counts:** pending appointment requests and pending team time-off counts surface on tab labels.
* **tRPC:** `calendar.*`, `calendarRecurrence.*`, `calendarParticipants.*`, `calendarReminders.*`, `calendarInvitations.*`, `calendarFinancials.*`, `appointmentRequests.*`, `timeOffRequests.*`, `calendarsManagement.*`, `calendarViews.*`.

---

## Runtime supplement (if any)

(no runtime supplement match)
