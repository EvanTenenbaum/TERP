# TERP Calendar & Scheduling: Final Implementation Roadmap

**Version:** 3.0 (Final - User Approved)  
**Date:** November 03, 2025  
**Status:** Ready for Implementation

---

## Executive Summary

This roadmap incorporates all user-approved features and enhancements:

**✅ Approved Scope:**
- V2.1 Client & Financial Integrations (Client meetings, AP/AR prep, Sales sheet reminders)
- Credit & Collections workflow (added to Phase 1)
- Vendor Management & Purchase Orders (added to Phase 1)
- Full mobile optimization (mandatory across all features)

**Total Timeline:** 28 weeks (7 months)

**Phases:**
- **Phase 0:** Foundation (4 weeks)
- **Phase 1:** MVP + Core Integrations (12 weeks) ← Expanded scope
- **Phase 2:** Enhanced Functionality (6 weeks)
- **Phase 3:** Proactive & Collaborative (6 weeks)

---

## Phase 0: Foundation (4 weeks)

### Goal

Build the core backend architecture and services to de-risk the project before developing user-facing features. This phase addresses the most technically complex aspects: timezone handling, recurrence instance generation, permissions, and data integrity.

### Key Deliverables

**Week 1-2: Database Schema & Core Services**

**Database:**
- Implement all 9 core tables with proper indexing:
  - `calendarEvents` (with v2.1 additions: salesSheetId, overdueAmount, meetingOutcome, etc.)
  - `calendarRecurrenceRules`
  - `calendarRecurrenceInstances` (materialized instances)
  - `calendarEventParticipants`
  - `calendarReminders`
  - `calendarEventHistory` (audit trail)
  - `calendarEventAttachments`
  - `calendarViews` (custom user views)
  - `calendarEventPermissions` (RBAC)
  - `clientMeetingHistory` (v2.1 addition)
- Write and test all Drizzle migration scripts
- Set up proper foreign key constraints and cascading deletes
- Create comprehensive database indexes for performance

**Core Services:**
- **TimezoneService:** IANA timezone handling, DST rules, ghost/ambiguous time prevention
- **PermissionService:** RBAC enforcement, row-level security checks
- **InstanceGenerationService:** Materialized recurrence instance generation
- **DataIntegrityService:** Orphaned event cleanup, referential integrity checks

**Week 3: Background Jobs & API Foundation**

**Background Jobs:**
- **Instance Generation Job:** Runs daily, generates recurrence instances for next 90 days
- **Reminder Notification Job:** Runs every 5 minutes, sends pending reminders
- **Data Cleanup Job:** Runs weekly, removes orphaned events and expired data
- **Collections Alert Job:** Runs daily, generates collections events for overdue invoices (v2.1)

**tRPC Routers (Scaffolding):**
- `calendar.ts` - Core event operations
- `recurrence.ts` - Recurrence management
- `participants.ts` - Multi-user events
- `reminders.ts` - Reminder management
- `views.ts` - Custom view management
- `meetings.ts` - Meeting confirmation (v2.1)
- `financials.ts` - AP/AR financial context (v2.1)
- `salesSheets.ts` - Sales sheet reminders (v2.1)

**Week 4: Testing & Validation**

**Unit Tests:**
- TimezoneService: Test DST transitions, ghost time prevention, timezone conversions
- InstanceGenerationService: Test complex recurrence patterns, exception handling
- PermissionService: Test RBAC rules, row-level security

**Integration Tests:**
- Background jobs: Test instance generation, reminder delivery, cleanup
- API endpoints: Test CRUD operations, error handling, validation

**Performance Tests:**
- Query performance with 100K events
- Instance generation with 1K recurring events
- Permission checks with 10K users

**Acceptance Criteria:**
- All unit tests passing (>90% code coverage)
- All integration tests passing
- Performance targets met (P95 API response < 200ms)
- No database migration errors
- Background jobs running successfully

---

## Phase 1: MVP + Core Integrations (12 weeks)

### Goal

Deliver core calendar functionality with deep integration into TERP's most critical workflows: invoices, orders, clients, sales sheets, and collections. This phase includes all v2.1 enhancements and the approved Credit & Collections and Vendor Management integrations.

### Week 1-3: Core Calendar UI (Desktop & Mobile)

**Desktop Views:**
- Month view with event bars spanning dates
- Week view with time slots and current time indicator
- Agenda view with chronological event list
- Event creation modal with all fields
- Event detail side panel

**Mobile Views:**
- Responsive month view with dot indicators
- Responsive agenda view with swipe-to-delete
- Full-screen event creation modal (mobile-optimized)
- Full-screen event detail modal (mobile-optimized)
- Bottom navigation
- Floating action button for "New Event"

**Components:**
- `CalendarPage.tsx` - Main calendar container
- `MonthView.tsx` - Month grid with events
- `WeekView.tsx` - Week grid with time slots
- `AgendaView.tsx` - Chronological event list
- `EventModal.tsx` - Create/edit event form
- `EventDetailPanel.tsx` - Event details side panel
- `CalendarToolbar.tsx` - View switcher, filters, new event button

**API Endpoints:**
- `calendar.getEvents` - Fetch events for date range with filters
- `calendar.getEventById` - Fetch single event with full details
- `calendar.createEvent` - Create new event
- `calendar.updateEvent` - Update existing event
- `calendar.deleteEvent` - Delete event (soft delete)

**Acceptance Criteria:**
- Users can view events in month, week, and agenda views
- Users can create, edit, and delete events
- All views are fully responsive (desktop, tablet, mobile)
- Mobile views use touch-optimized interactions (44x44px touch targets)
- Page load time < 1s with 10K events
- All interactions complete in < 500ms

### Week 4-5: Recurrence & Advanced Event Features

**Recurrence UI:**
- Recurrence settings modal with frequency selector
- Weekly: Day of week checkboxes
- Monthly: Day of month or "2nd Tuesday" selector
- End conditions: Never, On date, After X occurrences
- Preview of next 5 occurrences

**Advanced Features:**
- All-day events
- Floating time events (no timezone)
- Event attachments (file upload)
- Event history/audit trail display

**API Endpoints:**
- `recurrence.createRule` - Create recurrence rule
- `recurrence.updateRule` - Update recurrence rule
- `recurrence.updateInstance` - Modify single instance
- `recurrence.deleteInstance` - Delete single instance or series

**Acceptance Criteria:**
- Users can create complex recurrence patterns
- Users can edit/delete single instance or entire series
- Preview shows correct next occurrences
- Instance generation job creates instances correctly
- Recurrence works correctly across DST transitions

### Week 6-7: Client Profile Integration (V2.1)

**Client Profile - Meetings Tab:**
- "Meetings" tab in client profile page
- "Upcoming Meetings" section (desktop: card, mobile: compact list)
- "Past Meetings" section (desktop: table, mobile: collapsible list)
- Meeting confirmation UI for past meetings
- Meeting notes and action items capture

**Meeting Confirmation:**
- Meeting confirmation dialog (desktop: modal, mobile: bottom sheet)
- Outcome options: Completed, No-Show, Rescheduled, Cancelled
- Meeting notes textarea
- Action items list with "+ Add action item" button
- Save to `clientMeetingHistory` table

**Components:**
- `ClientProfileMeetingsTab.tsx` - Meetings tab content
- `MeetingConfirmationDialog.tsx` - Confirmation modal/bottom sheet
- `MeetingHistoryCard.tsx` - Past meeting display
- `UpcomingMeetingCard.tsx` - Upcoming meeting display

**API Endpoints:**
- `meetings.getClientMeetings` - Fetch all meetings for a client
- `meetings.getUnconfirmed` - Fetch unconfirmed past meetings
- `meetings.confirm` - Confirm meeting outcome with notes/actions

**Acceptance Criteria:**
- Client profile shows all past and upcoming meetings
- Users can confirm past meetings with outcome
- Users can add notes and action items to confirmed meetings
- Meeting history integrates with client timeline
- Mobile layout is fully optimized (bottom sheet, touch targets)
- Meeting confirmation rate > 90% within 3 months (tracked)

### Week 8-9: Sales Sheet Reminders (V2.1)

**Sales Sheet Integration:**
- "Set Follow-up Reminder" section in sales sheet form
- Toggle to enable/disable reminders
- Three reminder modes: Relative, Specific Date, Custom
- Multiple reminders per sales sheet
- Reminder preview text
- Reminder indicators in sales sheet list view
- "Upcoming Reminders" widget

**Components:**
- `SalesSheetReminderForm.tsx` - Reminder configuration UI
- `SalesSheetReminderIndicator.tsx` - Bell icon with tooltip
- `UpcomingRemindersWidget.tsx` - Dashboard widget

**API Endpoints:**
- `salesSheets.setReminder` - Create reminder for sales sheet
- `salesSheets.getReminders` - Fetch reminders for sales sheet
- `salesSheets.getUpcomingReminders` - Fetch upcoming reminders for user
- `salesSheets.deleteReminder` - Remove reminder

**Acceptance Criteria:**
- Users can set multiple custom reminders per sales sheet
- Reminders support relative ("In 3 days") and specific date/time
- Sales sheet list shows reminder indicators
- Reminder notifications delivered on time
- Mobile UI is fully optimized (tabs, dropdowns, time pickers)
- Sales sheet reminder adoption > 75% within 2 months (tracked)

### Week 10-11: AP/AR Meeting Prep & Collections (V2.1)

**Accounting Manager Dashboard:**
- "Today's Meetings" widget with financial context
- "This Week's Meetings" widget with compact list
- "Collections Priority" sidebar widget
- Financial summary for each meeting:
  - Outstanding AR
  - Overdue amount and days past due
  - Expected payment
  - Credit limit utilization

**Meeting Prep Detail View:**
- Full financial overview with payment history chart
- Outstanding invoices table with aging
- Suggested talking points checklist
- Meeting notes textarea
- "Start Meeting" and "Reschedule" buttons

**Collections Calendar:**
- Dedicated calendar view filtered for AR collections
- Color-coded by urgency (90+ days, 60-89 days, 30-59 days)
- Collections queue sidebar ranked by priority
- "Expected Collections This Week" widget

**Components:**
- `APMeetingPrepDashboard.tsx` - Dashboard widgets
- `MeetingPrepDetailView.tsx` - Detailed prep view
- `CollectionsCalendar.tsx` - Collections-focused calendar
- `FinancialSummaryCard.tsx` - Financial context display
- `CollectionsQueueWidget.tsx` - Priority queue sidebar

**Services:**
- `FinancialContextService` - Aggregate financial data (optimized with caching)
- `MeetingConfirmationService` - Handle meeting confirmation workflow

**API Endpoints:**
- `financials.getMeetingContext` - Fetch financial context for client
- `financials.getCollectionsQueue` - Fetch prioritized collections list
- `financials.getExpectedCollections` - Fetch expected collections for period

**Acceptance Criteria:**
- Accounting managers see today's and this week's meetings with financial context
- Meeting prep view shows all relevant financial data in one place
- Collections calendar highlights overdue accounts by urgency
- Collections queue ranks clients by priority
- Mobile layout is fully optimized (stacked cards, horizontal scrolling)
- Collections call prep time reduced by 50% (tracked)

### Week 12: Credit & Collections + Vendor Management

**Credit & Collections Workflow:**
- Auto-generate collections events for overdue invoices:
  - 30 days overdue: "Collections call - Invoice #X"
  - 60 days overdue: "Escalated collections - Invoice #X"
  - 90 days overdue: "Urgent: Collections escalation - Invoice #X"
- Auto-generate credit review events:
  - Client reaches 80% of credit limit: "Credit review - Client X"
  - Credit limit expiring in 30 days: "Credit limit renewal - Client X"

**Vendor Management:**
- Auto-generate vendor delivery events:
  - PO created: "Expected delivery - PO #X" on expected delivery date
- Manual scheduling:
  - Vendor performance reviews
  - Contract renewal reminders
  - Vendor onboarding sessions

**Auto-Generation Rules:**
- Configurable in admin settings
- Users can disable specific rules in personal settings
- Events linked to source entity (invoice, PO, client)

**API Endpoints:**
- `autoGeneration.configureRules` - Admin configuration
- `autoGeneration.getUserPreferences` - User preferences
- `autoGeneration.updateUserPreferences` - Update user preferences

**Acceptance Criteria:**
- Collections events auto-generated for overdue invoices
- Credit review events auto-generated at 80% limit utilization
- Vendor delivery events auto-generated from POs
- Users can disable auto-generation rules in settings
- All auto-generated events are clearly marked

---

## Phase 2: Enhanced Functionality (6 weeks)

### Goal

Add collaboration features, advanced customization, and intelligent scheduling assistance.

### Week 1-2: Multi-User Events & Collaboration

**Participants:**
- Add participants to events with roles (Organizer, Required, Optional, Observer)
- Participant invitation workflow
- Response status (Pending, Accepted, Declined, Tentative)
- In-app notifications for invitations

**Event Visibility:**
- Visibility settings (Private, Team, Company, Public)
- Permission-based event viewing
- Event sharing with external parties (read-only link)

**Components:**
- `ParticipantSelector.tsx` - Add/remove participants
- `ParticipantList.tsx` - Display participants with response status
- `EventInvitationNotification.tsx` - In-app notification

**API Endpoints:**
- `participants.add` - Add participant to event
- `participants.remove` - Remove participant
- `participants.respond` - Accept/decline invitation
- `participants.getInvitations` - Fetch pending invitations

**Acceptance Criteria:**
- Users can add multiple participants to events
- Participants receive in-app notifications
- Participants can accept/decline invitations
- Event visibility controls work correctly
- Permission checks prevent unauthorized access

### Week 3-4: Custom Views & Advanced Filtering

**Custom Views:**
- Save current filter configuration as named view
- Set default view for quick access
- Share views with team members
- Pre-built views: "My Tasks", "Team Events", "Overdue Items"

**Advanced Filtering:**
- Filter by module, event type, status, priority, assigned user
- Date range filtering
- Keyword search in title, description, location
- "Show/hide auto-generated events" toggle

**Components:**
- `FilterPanel.tsx` - Advanced filter UI (desktop: side panel, mobile: bottom sheet)
- `CustomViewSelector.tsx` - Dropdown to select saved views
- `SaveViewDialog.tsx` - Save current filters as view

**API Endpoints:**
- `views.create` - Create custom view
- `views.update` - Update custom view
- `views.delete` - Delete custom view
- `views.getAll` - Fetch all user views

**Acceptance Criteria:**
- Users can save current filters as custom view
- Users can set default view
- Filters work correctly in combination
- Search returns relevant results
- Mobile filter UI is fully optimized (bottom sheet)

### Week 5-6: Conflict Detection & Smart Suggestions

**Conflict Detection:**
- Detect scheduling conflicts when creating/editing events
- Check assigned user's existing events
- Show conflict warning dialog with visual timeline
- Allow override for intentional double-booking

**Smart Suggestions:**
- Suggest 3-5 alternative time slots when conflict detected
- Algorithm: Find next available slots considering:
  - User's existing events
  - Business hours (8 AM - 6 PM)
  - Preferred meeting times (avoid early morning, late afternoon)

**Components:**
- `ConflictWarningDialog.tsx` - Conflict warning with suggestions
- `TimelineSuggestionVisualization.tsx` - Visual timeline showing overlap

**Services:**
- `ConflictDetectionService` - Detect scheduling conflicts
- `SmartSuggestionService` - Generate alternative time slots

**API Endpoints:**
- `calendar.checkConflicts` - Check for conflicts
- `calendar.getSuggestions` - Get alternative time slots

**Acceptance Criteria:**
- Conflicts detected when creating/editing events
- Warning dialog shows conflicting events
- Smart suggestions provide viable alternatives
- Users can override and schedule anyway
- Conflict detection works for recurring events

---

## Phase 3: Proactive & Collaborative (6 weeks)

### Goal

Introduce intelligent scheduling, client-facing capabilities, and comprehensive documentation.

### Week 1-2: Drag-and-Drop Rescheduling

**Desktop:**
- Drag events to new time slots in week/day view
- Visual feedback during drag (ghost event)
- Conflict detection during drag
- Optimistic update with rollback on error

**Mobile:**
- Long-press to enter "move mode"
- Tap new time slot to reschedule
- Confirmation dialog before saving

**Components:**
- `DraggableEvent.tsx` - Draggable event component
- `DroppableTimeSlot.tsx` - Droppable time slot

**API Endpoints:**
- `calendar.reschedule` - Reschedule event to new time

**Acceptance Criteria:**
- Users can drag-and-drop events in week/day view (desktop)
- Conflicts detected during drag
- Optimistic updates with error handling
- Mobile long-press reschedule works correctly

### Week 3-4: VIP Portal Calendar Integration

**VIP Portal:**
- Calendar view showing client's upcoming deliveries
- Appointment booking with sales representative
- Order delivery schedule timeline
- Read-only view (clients cannot edit)

**Components:**
- `VIPCalendarView.tsx` - Client-facing calendar
- `AppointmentBookingForm.tsx` - Book appointment with sales rep
- `DeliveryScheduleTimeline.tsx` - Visual delivery timeline

**API Endpoints:**
- `vip.getClientEvents` - Fetch events for VIP client
- `vip.bookAppointment` - Book appointment with sales rep

**Acceptance Criteria:**
- VIP clients can view their delivery schedule
- VIP clients can book appointments
- Calendar is read-only for clients
- Mobile-optimized for client access

### Week 5: Notifications & Reminders

**In-App Notifications:**
- Notification center with history
- Real-time notifications for:
  - Event reminders
  - Meeting invitations
  - Event updates
  - Collections alerts

**Email Notifications:**
- Configurable email reminders
- Daily digest of upcoming events
- Weekly summary

**Push Notifications (Mobile):**
- Event reminders
- Sales sheet reminders
- Collections alerts

**Components:**
- `NotificationCenter.tsx` - Notification history
- `NotificationToast.tsx` - Real-time notification toast

**Services:**
- `NotificationService` - Send notifications via multiple channels

**API Endpoints:**
- `notifications.getAll` - Fetch notification history
- `notifications.markAsRead` - Mark notification as read
- `notifications.updatePreferences` - Update notification preferences

**Acceptance Criteria:**
- Users receive in-app notifications for all event types
- Email notifications sent based on user preferences
- Push notifications work on mobile devices
- Notification center shows history
- Users can configure notification preferences

### Week 6: Documentation & Training

**User Documentation:**
- User guide with screenshots
- Video tutorials for key workflows
- FAQ section
- Mobile-specific guide

**Developer Documentation:**
- API documentation (tRPC endpoints)
- Database schema documentation
- Service architecture documentation
- Deployment guide

**Training Materials:**
- Admin training deck
- End-user training deck
- Quick reference cards

**Deliverables:**
- `USER_GUIDE.md` - Comprehensive user guide
- `API_DOCUMENTATION.md` - API reference
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- Video tutorials (5-10 minutes each)

**Acceptance Criteria:**
- All documentation complete and reviewed
- Training materials tested with users
- Video tutorials published
- Help section integrated into app

---

## Success Metrics & Tracking

### Adoption Metrics

| Metric | Target | Tracking Method |
|--------|--------|-----------------|
| Weekly Active Users (WAU) | >70% of TERP WAUs | Analytics tracking |
| Events Created per User per Week | >10 | Analytics tracking |
| Auto-Generated Events | >50% of all new events | Database query |
| Meeting Confirmation Rate | >90% within 3 months | Database query |
| Sales Sheet Reminder Adoption | >75% within 2 months | Database query |

### Performance Metrics

| Metric | Target | Tracking Method |
|--------|--------|-----------------|
| P95 Calendar Page Load | < 1 second | Frontend performance monitoring |
| P95 API Response Time | < 200ms | Backend performance monitoring |
| API Error Rate | < 0.1% | Logging and monitoring |
| Uptime | 99.9% | Uptime monitoring service |

### Business Impact Metrics

| Metric | Target | Tracking Method |
|--------|--------|-----------------|
| Reduction in Late Payments | 25% reduction YoY | Accounting module data |
| Collections Call Prep Time | 50% reduction | User survey |
| Sales Sheet Follow-up Rate | >80% | Database query (reminder → interaction) |
| Time Saved (Self-Reported) | >1 hour/week | Quarterly user survey |

---

## Risk Management

### Technical Risks

| Risk | Mitigation |
|------|------------|
| **Timezone complexity** | Phase 0 builds TimezoneService first with comprehensive testing |
| **Performance with large datasets** | Materialized instances, aggressive indexing, query optimization |
| **Mobile performance** | Code splitting, lazy loading, offline caching |
| **Data integrity** | Application-level checks, background cleanup jobs, comprehensive testing |

### Schedule Risks

| Risk | Mitigation |
|------|------------|
| **Scope creep** | Strict phase boundaries, change control process |
| **Dependency delays** | Phase 0 de-risks critical dependencies |
| **Resource availability** | Buffer time in each phase, parallel workstreams where possible |

### User Adoption Risks

| Risk | Mitigation |
|------|------------|
| **Low adoption** | Extensive training, in-app onboarding, user feedback loops |
| **Resistance to change** | Gradual rollout, optional features, user control over automation |
| **Mobile usability issues** | Comprehensive mobile testing, user testing with target personas |

---

## Deployment Strategy

### Phase 0-1: Internal Testing

- Deploy to staging environment
- Internal team testing (5-10 users)
- Bug fixes and performance tuning

### Phase 2: Beta Release

- Deploy to production with feature flag
- Invite 20-30 beta users
- Collect feedback, iterate on UX
- Monitor performance and error rates

### Phase 3: General Availability

- Enable for all users
- Monitor adoption metrics
- Provide training and support
- Iterate based on user feedback

---

## Resource Requirements

### Development Team

- **1 Backend Developer** (full-time, 28 weeks)
- **1 Frontend Developer** (full-time, 28 weeks)
- **1 UI/UX Designer** (part-time, 12 weeks - Phases 1-2)
- **1 QA Engineer** (part-time, 16 weeks - Phases 1-3)
- **1 Technical Writer** (part-time, 4 weeks - Phase 3)

### Infrastructure

- **Database:** MySQL (existing TERP infrastructure)
- **Background Jobs:** Node.js cron jobs or dedicated job queue (e.g., BullMQ)
- **Notifications:** In-app (existing), Email (existing), Push (new - requires setup)
- **Monitoring:** Existing TERP monitoring tools + calendar-specific dashboards

---

## Conclusion

This final implementation roadmap incorporates all user-approved features and provides a clear, executable plan for delivering the TERP Calendar & Scheduling feature. The phased approach de-risks the project, ensures quality, and delivers value incrementally.

**Key Highlights:**
- ✅ All v2.1 enhancements included (Client meetings, AP/AR prep, Sales reminders)
- ✅ Credit & Collections and Vendor Management added to Phase 1
- ✅ Full mobile optimization mandatory across all features
- ✅ Realistic timeline with buffer for testing and iteration
- ✅ Clear success metrics and risk mitigation strategies

**Total Timeline:** 28 weeks (7 months)

**Next Steps:**
1. Secure resource allocation (2 full-time developers + part-time support)
2. Set up project tracking (Jira, GitHub Projects, etc.)
3. Begin Phase 0 implementation (database schema and core services)
4. Schedule weekly check-ins with stakeholders

---

**Document Version:** 3.0 (Final)  
**Last Updated:** November 03, 2025  
**Prepared By:** Manus AI  
**Status:** Ready for Implementation
