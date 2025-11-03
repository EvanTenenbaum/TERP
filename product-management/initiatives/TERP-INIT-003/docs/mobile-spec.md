# TERP Calendar: Mobile Optimization Specification

**Version:** 1.0  
**Date:** November 03, 2025  
**Status:** Production-Ready Specification

---

## Executive Summary

This document provides comprehensive mobile optimization specifications for the TERP Calendar feature. All calendar interfaces—including the new v2.1 client profile, AP/AR prep, and sales sheet reminder features—must be fully optimized for mobile devices to ensure a seamless user experience across all platforms.

Mobile optimization is **not optional**. With warehouse workers, sales representatives, and accounting managers frequently working from mobile devices, the calendar must be as powerful and usable on a smartphone as it is on desktop.

---

## Mobile-First Design Principles

### 1. **Touch-Optimized Interactions**

All interactive elements must meet or exceed the following standards:

- **Minimum touch target size:** 44x44 pixels (iOS standard) or 48x48 pixels (Android standard)
- **Spacing between touch targets:** Minimum 8px to prevent accidental taps
- **Swipe gestures:** Support native mobile interactions (swipe to delete, pull to refresh)
- **Long-press actions:** Use long-press for secondary actions (e.g., quick edit)

### 2. **Progressive Disclosure**

Mobile screens have limited space. Information must be revealed progressively:

- **Collapsed by default:** Show only essential information initially
- **Expandable sections:** Tap to expand for more details
- **Modal overlays:** Use full-screen modals for complex forms
- **Bottom sheets:** Use bottom sheets for quick actions and filters

### 3. **Performance Optimization**

Mobile devices have less processing power and slower networks:

- **Lazy loading:** Load only visible content
- **Image optimization:** Serve appropriately sized images for mobile
- **Minimal bundle size:** Code-split aggressively
- **Offline support:** Cache critical data for offline viewing
- **Optimistic updates:** Show immediate feedback, sync in background

### 4. **Thumb-Friendly Layout**

Design for one-handed use:

- **Bottom navigation:** Primary actions at the bottom of the screen
- **Floating action buttons (FAB):** Position in bottom-right for easy thumb access
- **Avoid top-heavy layouts:** Don't require reaching to the top of the screen for common actions

---

## Responsive Breakpoints

The calendar interface will adapt to the following breakpoints:

| Breakpoint | Width | Device Type | Layout Strategy |
|------------|-------|-------------|-----------------|
| **Mobile** | 320px - 767px | Smartphones | Single column, bottom navigation, full-screen modals |
| **Tablet** | 768px - 1023px | Tablets | Adaptive 2-column, collapsible sidebar, slide-in panels |
| **Desktop** | 1024px+ | Desktops/Laptops | Multi-column, persistent sidebar, side panels |

---

## Mobile-Optimized Components

### 1. **Calendar Views**

#### **Month View (Mobile)**

**Layout:**
- **Compact grid:** 7 columns (days of week), smaller date cells
- **Event indicators:** Colored dots below date numbers (not full event bars)
- **Dot colors:** Match event type (red = invoice, green = delivery, blue = meeting)
- **Multiple events:** Show up to 3 dots per date, "+X more" indicator if >3
- **Tap to expand:** Tapping a date shows a bottom sheet with that day's events

**Interactions:**
- **Swipe left/right:** Navigate to previous/next month
- **Tap date:** Open bottom sheet with day's events
- **Tap event in bottom sheet:** Open event detail modal
- **Long-press date:** Quick create event for that date

**Performance:**
- **Virtualization:** Render only visible month ±1 month buffer
- **Lazy load events:** Fetch events only for visible date range

---

#### **Week View (Mobile)**

**Layout:**
- **Horizontal scroll:** Swipe left/right to navigate days
- **Vertical time slots:** 30-minute intervals, 8 AM - 6 PM default
- **Current day centered:** Auto-scroll to current day on load
- **Event blocks:** Colored blocks positioned in time slots
- **Compact event text:** Show only title, truncate if needed

**Interactions:**
- **Swipe left/right:** Navigate to previous/next week
- **Tap event:** Open event detail modal
- **Tap empty slot:** Quick create event at that time
- **Pinch to zoom:** Adjust time slot granularity (15min, 30min, 1hr)

**Performance:**
- **Render only visible day:** Load events for current day + adjacent days
- **Smooth scrolling:** Use CSS transforms for 60fps scrolling

---

#### **Agenda View (Mobile)**

**Layout:**
- **Vertical scrolling list:** Chronological event cards
- **Date headers:** Sticky headers for each day
- **Event cards:** Compact cards with time, title, module badge, location
- **User avatars:** Show assigned user on right side of card
- **Color-coded left border:** Event type color on left edge of card

**Interactions:**
- **Tap card:** Open event detail modal
- **Swipe left:** Reveal Edit and Delete buttons
- **Pull to refresh:** Reload events
- **Infinite scroll:** Load more events as user scrolls down

**Performance:**
- **Virtualized list:** Render only visible cards (use `react-window` or `react-virtuoso`)
- **Batch loading:** Load 20 events at a time

---

### 2. **Event Creation/Editing**

#### **Mobile Event Form**

**Layout:**
- **Full-screen modal:** Takes over entire screen
- **Fixed header:** Title ("Create Event" or "Edit Event") with Cancel and Save buttons
- **Scrollable content:** Form fields in single column
- **Grouped sections:** Collapsible sections for optional fields (Recurrence, Participants, Attachments)
- **Bottom padding:** Extra padding at bottom for keyboard clearance

**Form Fields (Mobile-Optimized):**
- **Title:** Large text input, autofocus on open
- **Date:** Native date picker (iOS/Android date selector)
- **Time:** Native time picker with AM/PM selector
- **Timezone:** Dropdown with search, defaults to user's timezone
- **Description:** Expandable textarea, starts at 3 rows
- **Location:** Text input with autocomplete suggestions
- **Module:** Segmented control or dropdown
- **Event Type:** Dropdown
- **Priority:** Segmented control (Low / Medium / High / Urgent)
- **Recurrence:** Toggle switch, expands to recurrence options when enabled

**Interactions:**
- **Tap outside:** No action (prevent accidental dismissal)
- **Cancel button:** Show confirmation dialog if form is dirty
- **Save button:** Validate, show errors inline, save and close
- **Keyboard handling:** Scroll form to keep focused field visible

---

### 3. **Event Detail View**

#### **Mobile Event Detail**

**Layout:**
- **Full-screen modal** or **bottom sheet** (user preference)
- **Fixed header:** Event title with Edit and Delete icons
- **Scrollable content:** All event details in single column
- **Action buttons at bottom:** Floating action bar with primary actions

**Content Sections:**
- **Date/Time:** Large, prominent display with timezone
- **Location:** With map icon, tap to open in maps app
- **Description:** Full text, expandable if long
- **Module & Type badges:** Color-coded chips
- **Priority indicator:** Visual badge
- **Participants:** Horizontal scrolling list of avatars
- **Attachments:** List with file icons and download buttons
- **Related entity:** Card with link to invoice/order/client
- **Event history:** Collapsible section, show last 3 changes

**Interactions:**
- **Swipe down:** Dismiss modal (if bottom sheet)
- **Tap Edit:** Open event form in edit mode
- **Tap Delete:** Show confirmation dialog
- **Tap participant avatar:** Show participant details
- **Tap attachment:** Download or open in viewer
- **Tap related entity:** Navigate to entity detail page

---

### 4. **Client Profile - Meetings Tab (Mobile)**

#### **Mobile Layout**

**Structure:**
- **Tab navigation:** Swipeable tabs (Overview, Orders, Invoices, Meetings, Sales Sheets)
- **Two sections:** "Upcoming Meetings" and "Past Meetings"
- **Upcoming:** Compact list, 3 meetings visible without scrolling
- **Past:** Collapsible list, show 5 most recent, "Load More" button

**Upcoming Meeting Card:**
- **Date/Time:** Prominent at top
- **Meeting title:** Bold text
- **Assigned user:** Small avatar with name
- **Edit button:** Icon button on right

**Past Meeting Card:**
- **Date:** Left side
- **Meeting type:** Badge (Sales, Collections, Review)
- **Status badge:** Color-coded (Completed-green, No Show-red, Rescheduled-orange)
- **Confirm button:** If unconfirmed, show "Confirm" button
- **Notes preview:** First 50 characters, "Read more" link

**Interactions:**
- **Tap upcoming meeting:** Open event detail modal
- **Tap Edit:** Open event form
- **Tap past meeting:** Expand to show full notes and action items
- **Tap Confirm:** Open meeting confirmation dialog

---

### 5. **Meeting Confirmation Dialog (Mobile)**

#### **Mobile Layout**

**Structure:**
- **Bottom sheet:** Slides up from bottom, 80% screen height
- **Fixed header:** "Confirm Meeting" with close button
- **Scrollable content:** Meeting details and confirmation options

**Content:**
- **Meeting details:** Date, time, attendees (compact)
- **Outcome options:** Large radio buttons (vertical stack)
  - ✓ Yes - Meeting completed
  - ✗ No - Client no-show
  - ↻ Rescheduled
  - ✕ Cancelled
- **Meeting notes:** Expandable textarea, starts collapsed
- **Action items:** "+ Add action item" button, list below

**Interactions:**
- **Tap outcome:** Select radio button
- **Tap notes field:** Expand textarea, show keyboard
- **Tap "+ Add action item":** Add new action item input
- **Swipe down:** Dismiss without saving
- **Tap Save:** Validate, save, dismiss

---

### 6. **Sales Sheet Reminder UI (Mobile)**

#### **Mobile Layout**

**Structure:**
- **Collapsible section** in sales sheet form
- **Toggle switch:** "Set Follow-up Reminder" at top
- **Expanded content:** Reminder configuration fields

**Reminder Configuration:**
- **Tab selector:** Horizontal scrolling tabs (Relative, Specific Date, Custom)
- **Relative tab:**
  - Dropdown: "In 3 days" (full-width)
  - Time picker: "2:00 PM" (full-width)
  - Preview text: "You will be reminded on Nov 6 at 2:00 PM"
- **Specific Date tab:**
  - Date picker (native)
  - Time picker (native)
  - Preview text
- **Custom tab:**
  - Day of week selector (multi-select chips)
  - Time picker
  - Preview text

**Multiple Reminders:**
- **"+ Add another reminder" button:** Adds new reminder section
- **Reminder list:** Show all configured reminders with delete icon
- **Compact display:** Each reminder shows as chip with time and delete X

**Interactions:**
- **Toggle switch:** Expand/collapse reminder section
- **Tap dropdown:** Open native select menu
- **Tap time picker:** Open native time picker
- **Tap "+ Add another":** Add new reminder configuration
- **Tap delete X:** Remove reminder

---

### 7. **Accounting Manager - AP/AR Prep Dashboard (Mobile)**

#### **Mobile Layout**

**Structure:**
- **Vertical scrolling:** All widgets stack vertically
- **"Today's Meetings" widget:** First, most prominent
- **"This Week's Meetings" widget:** Second
- **"Collections Priority" widget:** Third

**Today's Meetings Card (Mobile):**
- **Meeting header:** Client name, time
- **Financial summary:** Stacked vertically (not horizontal)
  - Outstanding AR: $45,230 (red, large)
  - Overdue: $12,500 (45 days) (dark red)
  - Expected: $32,730 (green)
  - Credit: 75% of limit (orange)
- **Action buttons:** Full-width stacked buttons
  - "View Client Profile" (primary)
  - "Prepare Collection Call" (secondary)

**This Week's Meetings (Mobile):**
- **Compact list:** 4 meetings visible
- **Each row:** 
  - Day/Date on left
  - Client name and time
  - AR amount on right (color-coded)
  - Days overdue badge if applicable
- **Tap to expand:** Show financial summary

**Collections Priority (Mobile):**
- **Ranked list:** Top 5 clients
- **Each row:**
  - Client name
  - Overdue amount (large, red)
  - Days overdue badge
  - "Schedule Call" button (compact)

**Interactions:**
- **Tap meeting card:** Navigate to detailed meeting prep view
- **Tap "View Client Profile":** Navigate to client profile
- **Tap "Prepare Collection Call":** Navigate to meeting prep view
- **Tap "Schedule Call":** Open event creation modal with client pre-filled

---

### 8. **Meeting Prep Detail View (Mobile)**

#### **Mobile Layout**

**Structure:**
- **Full-screen page:** With back button in header
- **Scrollable content:** All sections stack vertically
- **Fixed bottom bar:** "Start Meeting" and "Reschedule" buttons

**Content Sections (Mobile):**
- **Meeting header:** Date, time, attendees (compact)
- **Financial overview card:**
  - Key metrics stacked vertically
  - Payment history chart (simplified, 3 months instead of 6)
- **Outstanding invoices:**
  - Horizontal scrolling cards (not table)
  - Each card shows: Invoice #, Amount, Days overdue, Status
  - Tap card to expand for more details
- **Talking points:**
  - Checklist with large checkboxes
  - Tap to check/uncheck
- **Meeting notes:**
  - Expandable textarea
  - Starts collapsed, tap to expand

**Interactions:**
- **Tap back arrow:** Return to dashboard
- **Tap "Start Meeting":** Mark meeting as in progress, show timer
- **Tap "Reschedule":** Open event edit modal
- **Tap invoice card:** Navigate to invoice detail
- **Swipe invoice cards:** Horizontal scroll to see all invoices

---

### 9. **Collections Calendar (Mobile)**

#### **Mobile Layout**

**Structure:**
- **Month view:** Compact grid with colored dots
- **Filter button:** Top-right, opens bottom sheet with filters
- **Bottom sheet:** Collections queue and expected collections

**Calendar Grid:**
- **Colored dots:** Indicate overdue status
  - Dark red: 90+ days
  - Red: 60-89 days
  - Orange: 30-59 days
  - Yellow: Approaching due
- **Tap date:** Open bottom sheet with that day's collections events

**Collections Queue (Bottom Sheet):**
- **Ranked list:** Scrollable list of clients
- **Each row:**
  - Client name
  - Overdue amount (large)
  - Days overdue badge
  - "Call" button (initiates phone call if on mobile)

**Expected Collections Widget:**
- **Total amount:** Large, prominent
- **Breakdown list:** Client, amount, confidence (High/Medium/Low)

**Interactions:**
- **Swipe left/right:** Navigate months
- **Tap date:** Open bottom sheet with events
- **Tap event:** Open event detail modal
- **Tap "Call" button:** Initiate phone call (if on mobile device)
- **Pull up bottom sheet:** Expand to full screen

---

## Mobile-Specific Features

### 1. **Native Mobile Integrations**

#### **Phone Calls**
- **"Call Client" buttons:** Tap to initiate phone call using `tel:` protocol
- **Available in:** Collections queue, meeting prep view, client profile

#### **Maps Integration**
- **Location fields:** Tap to open in native maps app using `maps:` or `geo:` protocol
- **Available in:** Event detail view, meeting location

#### **Calendar Sync**
- **"Add to Device Calendar" button:** Export event to iOS Calendar or Google Calendar
- **Uses:** iCal format for cross-platform compatibility

### 2. **Offline Support**

#### **Cached Data**
- **Today's events:** Always cached for offline viewing
- **This week's events:** Cached when online
- **Client meeting history:** Cached when viewing client profile

#### **Offline Indicators**
- **Status banner:** "You're offline. Changes will sync when connected."
- **Sync icon:** Shows sync status in header

#### **Offline Actions**
- **Create event:** Saved to local queue, synced when online
- **Edit event:** Saved to local queue, synced when online
- **Conflict resolution:** If server version changed, show conflict dialog when back online

### 3. **Push Notifications**

#### **Notification Types**
- **Event reminders:** "Meeting with ABC Corp in 1 hour"
- **Sales sheet reminders:** "Follow up on Sales Sheet #1234"
- **Collections alerts:** "Invoice #5678 is now 60 days overdue"
- **Meeting invitations:** "You've been invited to Q3 Review Meeting"

#### **Notification Actions**
- **Tap notification:** Open event detail
- **Quick actions:** "Snooze", "Mark as Done", "Reschedule"

### 4. **Gestures**

#### **Swipe Gestures**
- **Swipe left on event card:** Reveal Edit and Delete buttons
- **Swipe right on event card:** Mark as completed (for tasks)
- **Swipe left/right on calendar:** Navigate months/weeks
- **Pull to refresh:** Reload events in list views

#### **Long-Press Gestures**
- **Long-press date:** Quick create event
- **Long-press event:** Show context menu (Edit, Delete, Duplicate, Share)

---

## Performance Targets (Mobile)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **First Contentful Paint (FCP)** | < 1.5s | Lighthouse |
| **Largest Contentful Paint (LCP)** | < 2.5s | Lighthouse |
| **Time to Interactive (TTI)** | < 3.5s | Lighthouse |
| **Total Blocking Time (TBT)** | < 300ms | Lighthouse |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Lighthouse |
| **Bundle Size (JS)** | < 200KB (gzipped) | Webpack Bundle Analyzer |
| **API Response Time (P95)** | < 500ms on 3G | Network throttling |

---

## Accessibility (Mobile)

### 1. **Touch Accessibility**

- **Minimum touch target:** 44x44px (iOS) or 48x48px (Android)
- **Touch target spacing:** Minimum 8px between targets
- **Focus indicators:** Clear visual focus for keyboard navigation (external keyboard on tablet)

### 2. **Screen Reader Support**

- **ARIA labels:** All interactive elements have descriptive labels
- **Semantic HTML:** Proper heading hierarchy, landmarks
- **Live regions:** Announce dynamic content changes
- **Focus management:** Logical focus order, focus trap in modals

### 3. **Text Scaling**

- **Support up to 200% zoom:** All text remains readable
- **Relative units:** Use `rem` and `em` instead of `px` for font sizes
- **No horizontal scrolling:** Content reflows at larger text sizes

### 4. **Color Contrast**

- **WCAG AA compliance:** 4.5:1 contrast ratio for normal text
- **Color not sole indicator:** Use icons and text in addition to color

---

## Testing Strategy

### 1. **Device Testing**

**Required Test Devices:**
- **iOS:** iPhone SE (small screen), iPhone 14 (standard), iPhone 14 Pro Max (large)
- **Android:** Samsung Galaxy S21 (standard), Google Pixel 7 (standard)
- **Tablets:** iPad Air (10.9"), Samsung Galaxy Tab S8 (11")

**Test Browsers:**
- **iOS:** Safari (default), Chrome
- **Android:** Chrome (default), Samsung Internet

### 2. **Network Conditions**

**Test Scenarios:**
- **Fast 4G:** Baseline performance
- **Slow 3G:** Worst-case performance
- **Offline:** Offline functionality
- **Intermittent:** Flaky connection handling

### 3. **Orientation Testing**

- **Portrait:** Primary orientation
- **Landscape:** Ensure usable layout (especially for week view)
- **Rotation:** Smooth transition between orientations

---

## Implementation Checklist

### Phase 1 (MVP)

- [ ] Responsive month view with dot indicators
- [ ] Responsive agenda view with swipe-to-delete
- [ ] Full-screen event creation modal
- [ ] Full-screen event detail modal
- [ ] Touch-optimized form inputs
- [ ] Native date/time pickers
- [ ] Bottom navigation for mobile
- [ ] Floating action button for "New Event"
- [ ] Client profile meetings tab (mobile layout)
- [ ] Meeting confirmation bottom sheet
- [ ] Sales sheet reminder UI (mobile layout)
- [ ] AP/AR prep dashboard (mobile layout)

### Phase 2 (Enhanced)

- [ ] Responsive week view with horizontal scroll
- [ ] Swipe gestures for navigation
- [ ] Long-press context menus
- [ ] Offline support with local caching
- [ ] Push notifications
- [ ] Meeting prep detail view (mobile layout)
- [ ] Collections calendar (mobile layout)

### Phase 3 (Advanced)

- [ ] Native calendar sync (iOS Calendar, Google Calendar)
- [ ] Phone call integration
- [ ] Maps integration
- [ ] Advanced offline conflict resolution
- [ ] Progressive Web App (PWA) support

---

## Conclusion

This mobile optimization specification ensures that the TERP Calendar feature delivers a world-class mobile experience. By following these guidelines, the calendar will be as powerful and usable on a smartphone as it is on desktop, enabling users to manage their schedules effectively regardless of device.

All mobile optimizations are **mandatory**, not optional. Mobile-first design is a core principle of the TERP Calendar feature.

---

**Document Version:** 1.0  
**Last Updated:** November 03, 2025  
**Prepared By:** Manus AI
