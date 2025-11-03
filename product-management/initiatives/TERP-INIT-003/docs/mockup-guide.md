# TERP Calendar Feature - UI/UX Mockup Guide

**Date:** November 03, 2025  
**Design System:** TERP ERP v2.0  
**Status:** Production-Ready Mockups

---

## Overview

This document provides a comprehensive guide to the TERP Calendar feature UI/UX mockups, explaining the design decisions, user flows, and implementation considerations for each interface.

All mockups adhere to TERP's core design principles:
- **Unobtrusive and professional** - No gamification or unnecessary complexity
- **Clean and scannable** - Card-based layouts with generous whitespace
- **Consistent** - Follows established TERP design patterns
- **Responsive** - Works seamlessly across desktop and mobile
- **Accessible** - Touch-friendly targets, clear visual hierarchy

---

## Design System Reference

### Color Palette

**Primary Colors:**
- Primary Blue: `--color-blue-700` (used for CTAs, active states)
- Primary Blue Light: `--color-blue-50` (used for text on blue backgrounds)

**Semantic Colors:**
- Red: Invoice due dates, payment deadlines, urgent items
- Green: Order deliveries, completed items, success states
- Blue: Meetings, general events, informational items
- Orange: Batch expirations, warnings, high priority
- Yellow: Reminders, caution states

**Neutral Colors:**
- Background: `oklch(1 0 0)` (pure white)
- Foreground: `oklch(0.235 0.015 65)` (dark gray text)
- Border: `oklch(0.92 0.004 286.32)` (light gray borders)
- Muted: `oklch(0.967 0.001 286.375)` (subtle backgrounds)

### Typography

- **Headings:** System sans-serif, bold weight
- **Body:** System sans-serif, regular weight
- **Labels:** System sans-serif, medium weight
- **Sizes:** Responsive scaling from 14px (mobile) to 16px (desktop)

### Spacing

- **Card padding:** 24px (desktop), 16px (mobile)
- **Element spacing:** 8px, 16px, 24px, 32px (multiples of 8)
- **Grid gaps:** 16px (mobile), 24px (desktop)

---

## Mockup Catalog

### 1. Calendar Month View (Desktop)

**File:** `calendar_month_view.png`

**Purpose:** Primary calendar interface showing events across an entire month.

**Key Features:**
- **Navigation:** Left sidebar with module icons (Dashboard, Orders, Products, Customers)
- **View switcher:** Month/Week/Day tabs in top toolbar
- **Filter controls:** Dropdown to filter by module, event type, priority
- **New Event button:** Prominent blue CTA in top-right
- **Calendar grid:** 7-column layout with clear date labels
- **Event display:** Colored bars spanning appropriate dates
- **Today indicator:** Subtle blue border around current date
- **Legend:** Color-coded event type indicators at bottom

**User Flow:**
1. User navigates to Calendar from sidebar
2. Default view shows current month
3. User can switch views, apply filters, or create new event
4. Clicking an event opens detail panel
5. Clicking a date creates new event for that day

**Design Decisions:**
- **Color coding:** Immediate visual distinction between event types
- **Multi-day events:** Span across dates to show duration clearly
- **Minimal chrome:** No unnecessary borders or decorations
- **Scannable:** Easy to see week/month at a glance

---

### 2. Calendar Week View (Desktop)

**File:** `calendar_week_view.png`

**Purpose:** Detailed time-based view of a single week with hourly slots.

**Key Features:**
- **Time grid:** 8 AM - 6 PM slots (business hours)
- **5-day work week:** Monday through Friday
- **Current time indicator:** Red horizontal line showing current time
- **All-day events:** Displayed at top of grid
- **Timed events:** Positioned in appropriate time slots as colored blocks
- **Event details:** Title and basic info visible on event block
- **Toolbar:** Same navigation and controls as month view

**User Flow:**
1. User switches to Week view from Month view
2. Can scroll vertically to see more time slots
3. Can drag events to reschedule (future implementation)
4. Clicking event opens detail panel
5. Double-clicking empty slot creates new event

**Design Decisions:**
- **Business hours focus:** Shows 8 AM - 6 PM by default (expandable)
- **Current time indicator:** Always know where you are in the day
- **Block sizing:** Event height proportional to duration
- **Overlap handling:** Overlapping events shown side-by-side

---

### 3. Event Creation Modal (Desktop)

**File:** `calendar_event_modal.png`

**Purpose:** Create new calendar events with all necessary details.

**Key Features:**
- **Modal overlay:** Centered dialog with subtle backdrop
- **Form fields:** Title, Description, Date, Time, Timezone, Location
- **Module selector:** Dropdown to categorize event (Accounting/Inventory/Sales)
- **Event type:** Dropdown for event classification
- **Priority selector:** Radio buttons for Low/Medium/High/Urgent
- **Assigned to:** User selector with avatar
- **Participants:** Multi-user selector with '+ Add Participant' button
- **Recurrence toggle:** Enable/disable recurring events
- **Action buttons:** Cancel (gray) and Create Event (blue)

**User Flow:**
1. User clicks 'New Event' button or double-clicks calendar
2. Modal appears with form fields
3. User fills in required fields (Title, Date, Time)
4. User optionally adds description, location, participants
5. User clicks 'Create Event' to save

**Design Decisions:**
- **Progressive disclosure:** Recurrence hidden until toggled
- **Smart defaults:** Current date/time pre-filled
- **Clear hierarchy:** Required fields emphasized
- **Timezone explicit:** Always show timezone to avoid confusion
- **Validation:** Real-time validation with helpful error messages

---

### 4. Event Detail Panel (Desktop)

**File:** `calendar_event_detail.png`

**Purpose:** View and manage detailed information about a specific event.

**Key Features:**
- **Side panel:** Slides in from right, overlaying calendar
- **Header:** Event title with edit/delete action buttons
- **Date/time:** Prominently displayed with timezone
- **Location:** Map pin icon with location name
- **Description:** Full event description text
- **Module badge:** Color-coded badge showing event category
- **Priority indicator:** Visual badge for priority level
- **Participants:** List of attendees with avatars and response status
- **Attachments:** File list with icons and download links
- **Related entity:** Link to associated invoice/order/etc.
- **Event history:** Audit trail showing creation and updates

**User Flow:**
1. User clicks event in calendar
2. Detail panel slides in from right
3. User can read all event information
4. User can click Edit to modify event
5. User can click Delete to remove event
6. User can click related entity link to navigate

**Design Decisions:**
- **Side panel:** Doesn't obscure calendar, easy to dismiss
- **Comprehensive info:** All event details in one place
- **Quick actions:** Edit/delete always accessible
- **Audit trail:** Transparency about who created/modified event
- **Related entities:** Deep integration with other modules

---

### 5. Recurrence Settings Modal (Desktop)

**File:** `calendar_recurrence_modal.png`

**Purpose:** Configure recurring event patterns.

**Key Features:**
- **Frequency dropdown:** Daily/Weekly/Monthly/Yearly
- **Interval input:** "Every X week(s)" configurable
- **Day selector:** Checkboxes for days of week (weekly recurrence)
- **End conditions:** Radio buttons for Never/On date/After X occurrences
- **Date picker:** For "On date" end condition
- **Occurrence counter:** For "After X occurrences" end condition
- **Preview section:** Shows next 5 occurrences for validation
- **Action buttons:** Cancel and Save

**User Flow:**
1. User toggles recurrence in event creation/edit modal
2. Recurrence modal appears
3. User selects frequency (e.g., Weekly)
4. User configures interval and days
5. User sets end condition
6. User reviews preview of next occurrences
7. User clicks Save to apply recurrence pattern

**Design Decisions:**
- **Preview feature:** Critical for validating complex patterns
- **Flexible end conditions:** Supports all common use cases
- **Clear labels:** No ambiguity about what each option does
- **Validation:** Prevents invalid patterns (e.g., 0 occurrences)

---

### 6. Conflict Warning Dialog (Desktop)

**File:** `calendar_conflict_warning.png`

**Purpose:** Alert user to scheduling conflicts and suggest alternatives.

**Key Features:**
- **Warning banner:** Yellow/orange alert with icon
- **Conflict details:** Shows conflicting event info
- **Visual timeline:** Colored bars showing overlap
- **Alternative suggestions:** 3 suggested time slots
- **Quick action buttons:** "Use This Time" for each suggestion
- **Override option:** "Schedule Anyway" button for intentional conflicts
- **Cancel button:** Abort event creation

**User Flow:**
1. User creates event that conflicts with existing event
2. System detects conflict and shows warning dialog
3. User reviews conflicting event details
4. User can accept a suggested alternative time
5. Or user can schedule anyway (override)
6. Or user can cancel and manually choose different time

**Design Decisions:**
- **Smart suggestions:** System finds next available slots
- **Visual overlap:** Clear visualization of conflict
- **User control:** Allow override for intentional double-booking
- **Non-blocking:** Warning, not error - user has final say

---

### 7. Advanced Filters Panel (Desktop)

**File:** `calendar_filters_panel.png`

**Purpose:** Filter calendar events by multiple criteria.

**Key Features:**
- **Module checkboxes:** Filter by Accounting/Inventory/Sales/Orders
- **Event type checkboxes:** Filter by Meeting/Deadline/Delivery/Payment Due
- **Status checkboxes:** Filter by Scheduled/In Progress/Completed
- **Priority checkboxes:** Filter by Low/Medium/High/Urgent
- **Assigned to dropdown:** Filter by user with search
- **Date range picker:** Filter by date range
- **Auto-generated toggle:** Show/hide system-generated events
- **Custom view saver:** Save filter combination as named view
- **Action buttons:** Clear All and Apply Filters

**User Flow:**
1. User clicks Filter button in toolbar
2. Filter panel slides in from right
3. User selects desired filter criteria
4. User clicks Apply Filters
5. Calendar updates to show only matching events
6. User can save filter combination as custom view

**Design Decisions:**
- **Multi-criteria:** Combine multiple filters for precision
- **Persistent state:** Filters remain applied until cleared
- **Custom views:** Power users can save common filter sets
- **Clear all:** Quick reset to default view
- **Toggle for auto-events:** Hide system-generated clutter

---

### 8. Agenda View (Desktop)

**File:** `calendar_agenda_view.png`

**Purpose:** Chronological list view of upcoming events.

**Key Features:**
- **View selector:** Day/Week/Agenda tabs (Agenda selected)
- **Date range dropdown:** Next 7 Days, Next 30 Days, Custom
- **Grouped by date:** Events organized under date headers
- **Event cards:** Compact cards showing time, title, module, location, user
- **Module badges:** Color-coded badges for quick categorization
- **Action menu:** Three-dot menu for quick actions
- **User avatars:** Assigned user shown on each event
- **Sidebar navigation:** Consistent with other views

**User Flow:**
1. User switches to Agenda view
2. Sees chronological list of upcoming events
3. Can change date range (e.g., Next 30 Days)
4. Can click event to see details
5. Can use action menu for quick edit/delete

**Design Decisions:**
- **List format:** Better for scanning many events
- **Date grouping:** Clear temporal organization
- **Compact cards:** More events visible without scrolling
- **Quick actions:** Three-dot menu for power users
- **Flexible range:** Customize how far ahead to look

---

### 9. Mobile Month View

**File:** `calendar_mobile_month.png`

**Purpose:** Touch-optimized calendar month view for smartphones.

**Key Features:**
- **Hamburger menu:** Access to navigation drawer
- **View tabs:** Month/Week/Day switcher
- **Compact calendar grid:** Optimized for small screens
- **Event indicators:** Colored dots under dates (not full bars)
- **Legend:** Event type color key at bottom
- **Floating action button:** Blue '+' button for new event
- **Touch targets:** Minimum 44x44px tap areas

**User Flow:**
1. User opens calendar on mobile
2. Sees current month with event dots
3. Taps date to expand and see event list
4. Taps event to see details
5. Taps '+' button to create new event

**Design Decisions:**
- **Dots instead of bars:** More readable on small screens
- **Expandable dates:** Progressive disclosure of event details
- **FAB for new event:** Thumb-friendly bottom-right placement
- **Minimal chrome:** Maximize calendar space on small screen

---

### 10. Mobile Agenda View

**File:** `calendar_mobile_agenda.png`

**Purpose:** Touch-optimized list view for mobile devices.

**Key Features:**
- **Back navigation:** Arrow to return to previous screen
- **Date range selector:** Dropdown for Next 7 Days, etc.
- **Scrollable event list:** Vertically scrolling cards
- **Event cards:** Time, title, module badge, location, user avatar
- **Swipe actions:** Swipe left to reveal Edit/Delete buttons
- **Floating action button:** '+' button for new event
- **Touch-optimized spacing:** Generous padding for easy tapping

**User Flow:**
1. User switches to Agenda view on mobile
2. Scrolls through upcoming events
3. Swipes left on event to reveal actions
4. Taps Edit or Delete
5. Or taps event card to see full details

**Design Decisions:**
- **Swipe actions:** Mobile-native interaction pattern
- **Card-based:** Easy to scan and tap
- **Prominent avatars:** Quick visual identification of assignee
- **Contextual info:** Module badge and location shown inline

---

### 11. Dashboard Calendar Widget

**File:** `calendar_dashboard_widget.png`

**Purpose:** Show upcoming events on main dashboard for quick overview.

**Key Features:**
- **Card format:** Fits in dashboard grid
- **Calendar icon:** Visual identifier
- **Next 3 events:** Compact list showing upcoming items
- **Color indicators:** Dots matching event type colors
- **Date and time:** Clearly displayed for each event
- **View all link:** Navigate to full calendar
- **Consistent styling:** Matches other dashboard widgets

**User Flow:**
1. User views dashboard
2. Sees upcoming events at a glance
3. Clicks 'View All Events' to open full calendar
4. Or clicks individual event to see details

**Design Decisions:**
- **Limited to 3 events:** Avoid overwhelming dashboard
- **Next events only:** Most relevant information
- **Quick navigation:** Link to full calendar
- **Consistent design:** Matches dashboard aesthetic

---

### 12. Order Integration View

**File:** `calendar_order_integration.png`

**Purpose:** Show delivery schedule timeline within order detail page.

**Key Features:**
- **Order header:** Order number, client, status, amount
- **Delivery schedule section:** Dedicated area for timeline
- **Horizontal timeline:** Visual progress indicator
- **Milestones:** Order Placed, Processing, Scheduled Delivery, Expected Arrival
- **Status indicators:** Checkmark (completed), blue dot (in progress), gray (upcoming)
- **Dates:** Clear date labels for each milestone
- **Action buttons:** Reschedule Delivery and Add to Calendar
- **Calendar icon:** Visual cue for scheduled delivery

**User Flow:**
1. User views order detail page
2. Sees delivery schedule timeline
3. Can click 'Reschedule Delivery' to change date
4. Can click 'Add to Calendar' to create calendar event
5. Timeline updates when delivery is rescheduled

**Design Decisions:**
- **Horizontal timeline:** Natural left-to-right progress
- **Visual status:** Color and icons show progress clearly
- **Integrated actions:** Reschedule and calendar add in context
- **Non-intrusive:** Fits naturally in order detail layout

---

### 13. Invoice Integration View

**File:** `calendar_entity_integration.png`

**Purpose:** Show related calendar events within invoice detail page.

**Key Features:**
- **Invoice header:** Invoice number, client, amount
- **Related Events section:** Card showing linked events
- **Vertical timeline:** Events in chronological order
- **Event details:** Date, time, title for each event
- **Color indicators:** Dots matching event type (blue, red, orange)
- **Highlighted due date:** Payment Due in red for urgency
- **Add Event button:** Create new event linked to this invoice
- **View in Calendar link:** Navigate to full calendar

**User Flow:**
1. User views invoice detail page
2. Sees related events timeline
3. Can click '+ Add Event' to create new linked event
4. Can click 'View in Calendar' to see in full calendar context
5. Can click individual event to see details

**Design Decisions:**
- **Vertical timeline:** Fits naturally in detail page layout
- **Connecting lines:** Visual continuity between events
- **Contextual creation:** Add event button creates pre-linked event
- **Urgency highlighting:** Payment due in red for attention

---

## Responsive Design Considerations

### Desktop (1920x1080+)

- **Full sidebar navigation:** Always visible
- **Multi-column layouts:** Utilize horizontal space
- **Hover states:** Rich interactions with mouse
- **Keyboard shortcuts:** Power user features
- **Detail panels:** Side panels that don't obscure content

### Tablet (768px - 1024px)

- **Collapsible sidebar:** Hamburger menu for navigation
- **Adaptive layouts:** Shift from multi-column to single-column
- **Touch targets:** Minimum 44x44px
- **Simplified toolbars:** Combine actions into menus

### Mobile (375px - 767px)

- **Bottom navigation:** Thumb-friendly navigation bar
- **Full-screen modals:** Maximize screen real estate
- **Swipe gestures:** Native mobile interactions
- **Floating action buttons:** Primary actions always accessible
- **Progressive disclosure:** Show only essential info initially

---

## Accessibility Features

### Visual Accessibility

- **Color contrast:** WCAG AA compliant (4.5:1 minimum)
- **Color not sole indicator:** Icons and text accompany colors
- **Focus indicators:** Clear keyboard focus states
- **Scalable text:** Supports browser zoom up to 200%

### Keyboard Navigation

- **Tab order:** Logical flow through interactive elements
- **Keyboard shortcuts:** Arrow keys for date navigation, Enter to select
- **Escape key:** Close modals and panels
- **Focus trap:** Keep focus within modals

### Screen Reader Support

- **Semantic HTML:** Proper heading hierarchy, landmarks
- **ARIA labels:** Descriptive labels for all interactive elements
- **Live regions:** Announce dynamic content changes
- **Alt text:** Descriptive text for all icons and images

---

## Implementation Notes

### Technology Stack

- **Framework:** React 19
- **Styling:** Tailwind CSS 4
- **Components:** shadcn/ui
- **Calendar library:** Consider `@fullcalendar/react` or build custom
- **Date handling:** `date-fns` or `luxon` (NOT `moment.js`)
- **Timezone:** `@js-joda/timezone` for IANA timezone support

### Component Architecture

```
CalendarPage/
├── CalendarToolbar/
│   ├── ViewSwitcher
│   ├── DateNavigator
│   ├── FilterButton
│   └── NewEventButton
├── CalendarViews/
│   ├── MonthView/
│   │   ├── MonthGrid
│   │   ├── DateCell
│   │   └── EventBar
│   ├── WeekView/
│   │   ├── WeekGrid
│   │   ├── TimeSlot
│   │   └── EventBlock
│   ├── DayView/
│   │   └── (similar to WeekView)
│   └── AgendaView/
│       ├── DateGroup
│       └── EventCard
├── EventModal/
│   ├── EventForm
│   ├── RecurrenceModal
│   └── ParticipantSelector
├── EventDetailPanel/
│   ├── EventHeader
│   ├── EventInfo
│   ├── ParticipantList
│   └── AttachmentList
├── FilterPanel/
│   ├── ModuleFilter
│   ├── TypeFilter
│   ├── PriorityFilter
│   └── DateRangeFilter
└── ConflictDialog/
    ├── ConflictInfo
    ├── TimelinVisualization
    └── SuggestionList
```

### State Management

- **Global state:** Calendar view, filters, selected date
- **Local state:** Form inputs, modal open/closed, loading states
- **Server state:** Events data (use React Query or SWR)
- **Optimistic updates:** Immediate UI feedback, rollback on error

### Performance Optimization

- **Virtualization:** Render only visible events in large lists
- **Lazy loading:** Load events for visible date range only
- **Debouncing:** Debounce filter changes to reduce API calls
- **Memoization:** Memoize expensive calculations (event positioning)
- **Code splitting:** Lazy load calendar views and modals

---

## User Testing Recommendations

### Usability Testing Scenarios

1. **Create a recurring weekly meeting**
   - Success criteria: User completes task in <2 minutes
   
2. **Reschedule a conflicting event**
   - Success criteria: User accepts suggested alternative time
   
3. **Filter calendar to show only high-priority accounting events**
   - Success criteria: User applies filters in <30 seconds
   
4. **Add a delivery event from an order detail page**
   - Success criteria: User creates linked event without confusion
   
5. **View upcoming events on mobile**
   - Success criteria: User navigates agenda view successfully

### Metrics to Track

- **Time to create event:** Target <1 minute for simple events
- **Filter usage:** % of users who use filters
- **View preferences:** Most popular view (Month/Week/Agenda)
- **Mobile vs desktop usage:** Platform distribution
- **Error rates:** Form validation errors, conflict overrides

---

## Design Iteration Plan

### Phase 1: MVP (Weeks 1-8)

- Month view and Agenda view only
- Basic event creation (no recurrence)
- Simple filters (module and date range)
- Desktop-first design

### Phase 2: Enhanced Features (Weeks 9-16)

- Week and Day views
- Recurring events
- Advanced filters
- Conflict detection
- Mobile responsive design

### Phase 3: Integrations (Weeks 17-24)

- Dashboard widget
- Order/invoice integration
- Participant management
- Attachment support
- Email notifications

---

## Conclusion

These mockups represent a production-ready design for the TERP Calendar feature that balances simplicity with power. The design adheres to TERP's core principles of being unobtrusive, professional, and easy to use while providing the advanced functionality needed for effective business scheduling.

All mockups are ready for developer handoff and can be implemented using the TERP design system and existing component library.

**Next Steps:**
1. Review mockups with stakeholders
2. Conduct user testing with target personas
3. Refine based on feedback
4. Begin Phase 0 implementation (core architecture)
5. Iterate through phased rollout

---

**Document Version:** 1.0  
**Last Updated:** November 03, 2025  
**Prepared By:** Manus AI Design Team
