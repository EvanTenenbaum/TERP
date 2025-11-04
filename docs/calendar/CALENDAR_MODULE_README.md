# TERP Calendar & Scheduling System

**Version:** 2.0 (Post-Adversarial QA)  
**Initiative:** TERP-INIT-003  
**Status:** Production-Ready  
**Last Updated:** November 4, 2025

## Overview

The TERP Calendar & Scheduling System is a comprehensive, production-ready calendar module that provides event management, recurrence patterns, participant tracking, reminders, and deep integration with all TERP modules.

## Features

### Core Calendar Features
- **Multiple Calendar Views**: Month, Week, Day, and Agenda views
- **Event Management**: Create, edit, delete, and view events with full CRUD operations
- **All-Day and Timed Events**: Support for both all-day events and specific time slots
- **Recurrence Patterns**: Daily, weekly, monthly, and yearly recurrence with custom intervals
- **Priority Levels**: LOW, MEDIUM, HIGH, URGENT with visual indicators
- **Status Tracking**: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- **Module Integration**: Events linked to INVENTORY, ACCOUNTING, CLIENTS, VENDORS, etc.

### Advanced Features
- **IANA Timezone Support**: Field-based time + timezone (not UTC conversion)
- **Materialized Recurrence Instances**: Pre-generated instances for performance
- **RBAC Permissions**: Row-level security with permission hierarchy
- **Audit Trail**: Complete history logging for all changes
- **Participants Management**: Add users, track RSVP responses
- **Reminders**: Email and in-app notifications
- **Custom Views**: User-defined calendar views with filters
- **Attachments**: Link files and documents to events

### V2.1 Additions
- **Meeting Confirmation Workflow**: Track confirmed/tentative/declined meetings
- **Financial Context Integration**: Link events to invoices, bills, payments
- **Client Meeting History**: Track all client interactions

## Architecture

### Backend Structure

```
server/
├── _core/
│   ├── timezoneService.ts          # IANA timezone handling
│   ├── permissionService.ts        # RBAC enforcement
│   ├── instanceGenerationService.ts # Recurrence instances
│   ├── dataIntegrityService.ts     # Cleanup and integrity
│   └── calendarJobs.ts             # Background jobs
├── routers/
│   ├── calendar.ts                 # Core event operations
│   ├── calendarParticipants.ts     # Participant management
│   ├── calendarReminders.ts        # Reminder system
│   ├── calendarViews.ts            # User views
│   ├── calendarRecurrence.ts       # Recurrence patterns
│   ├── calendarMeetings.ts         # Meeting workflow (V2.1)
│   └── calendarFinancials.ts       # Financial context (V2.1)
├── calendarDb.ts                   # Database access layer
└── routers.ts                      # Router registration
```

### Frontend Structure

```
client/src/
├── pages/
│   └── CalendarPage.tsx            # Main calendar page
└── components/calendar/
    ├── MonthView.tsx               # Month grid view
    ├── WeekView.tsx                # Week view with time slots
    ├── DayView.tsx                 # Detailed day view
    ├── AgendaView.tsx              # List view
    ├── CalendarFilters.tsx         # Filtering UI
    └── EventFormDialog.tsx         # Event creation/editing
```

### Database Schema

**10 Tables:**
1. `calendarEvents` - Core event data
2. `calendarRecurrenceRules` - Recurrence patterns
3. `calendarRecurrenceInstances` - Materialized instances
4. `calendarEventParticipants` - Participant tracking
5. `calendarReminders` - Reminder configuration
6. `calendarEventHistory` - Audit trail
7. `calendarEventAttachments` - File attachments
8. `calendarViews` - User-defined views
9. `calendarEventPermissions` - RBAC permissions
10. `clientMeetingHistory` - Client meeting tracking (V2.1)

## API Endpoints

### Calendar Router (`/calendar`)
- `getEvents` - Get events with filtering
- `getEventById` - Get single event details
- `createEvent` - Create new event
- `updateEvent` - Update existing event
- `deleteEvent` - Soft delete event
- `hardDeleteEvent` - Permanent deletion

### Participants Router (`/calendarParticipants`)
- `addParticipant` - Add participant to event
- `updateResponse` - Update RSVP response
- `removeParticipant` - Remove participant
- `getEventParticipants` - Get all participants

### Reminders Router (`/calendarReminders`)
- `createReminder` - Create reminder
- `getEventReminders` - Get event reminders
- `updateReminderStatus` - Mark as sent
- `deleteReminder` - Remove reminder

### Views Router (`/calendarViews`)
- `createView` - Create custom view
- `getViews` - Get user views
- `getDefaultView` - Get default view
- `updateView` - Update view settings
- `deleteView` - Remove view

### Recurrence Router (`/calendarRecurrence`)
- `createRecurrenceRule` - Create pattern
- `updateRecurrenceRule` - Update pattern
- `deleteRecurrenceRule` - Remove pattern
- `generateInstances` - Generate instances

### Meetings Router (`/calendarMeetings`) - V2.1
- `confirmMeeting` - Confirm meeting
- `getMeetingHistory` - Get client meeting history
- `updateMeetingNotes` - Add meeting notes

### Financials Router (`/calendarFinancials`) - V2.1
- `linkInvoice` - Link event to invoice
- `linkBill` - Link event to bill
- `getFinancialContext` - Get financial data

## Background Jobs

### Instance Generation Job
- **Schedule**: Daily at 2 AM
- **Purpose**: Generate recurrence instances 90 days ahead
- **Performance**: Materialized instances for fast queries

### Reminder Notification Job
- **Schedule**: Every 5 minutes
- **Purpose**: Send pending reminders
- **Channels**: Email and in-app notifications

### Data Cleanup Job
- **Schedule**: Weekly on Sunday at 3 AM
- **Purpose**: Remove orphaned records and old data

### Collections Alert Job
- **Schedule**: Daily at 8 AM
- **Purpose**: Identify clients with overdue payments

## Usage Examples

### Creating an Event

```typescript
const event = await trpc.calendar.createEvent.mutate({
  title: "Client Meeting",
  description: "Discuss Q4 inventory needs",
  startDate: "2025-11-15",
  startTime: "14:00",
  endDate: "2025-11-15",
  endTime: "15:00",
  timezone: "America/New_York",
  module: "CLIENTS",
  eventType: "MEETING",
  priority: "HIGH",
  status: "SCHEDULED",
  visibility: "COMPANY",
});
```

### Creating a Recurring Event

```typescript
const recurringEvent = await trpc.calendar.createEvent.mutate({
  title: "Weekly Team Standup",
  startDate: "2025-11-04",
  startTime: "09:00",
  endTime: "09:30",
  timezone: "America/New_York",
  isRecurring: true,
  recurrenceRule: {
    frequency: "WEEKLY",
    interval: 1,
    startDate: "2025-11-04",
    endDate: "2025-12-31",
  },
});
```

### Filtering Events

```typescript
const events = await trpc.calendar.getEvents.useQuery({
  startDate: "2025-11-01",
  endDate: "2025-11-30",
  module: "CLIENTS",
  eventType: "MEETING",
  status: "SCHEDULED",
  priority: "HIGH",
});
```

## Timezone Handling

The calendar uses **field-based time + IANA timezone** (not UTC conversion):

- Events store `startTime` + `timezone` separately
- TimezoneService validates IANA timezones
- DST ghost time detection prevents invalid times
- Timezone conversion happens at query time

## Permissions

RBAC permissions control access:

- **OWNER**: Full control
- **EDIT**: Can modify event
- **VIEW**: Read-only access
- **NONE**: No access

Permission hierarchy:
- Company-wide events visible to all
- Team events visible to team members
- Private events only to owner and invited participants

## Migration Guide

### Database Migration

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate
```

### Initial Data Setup

```sql
-- Create default calendar view for each user
INSERT INTO calendarViews (userId, name, isDefault, filters)
SELECT id, 'My Calendar', true, '{}'
FROM users;
```

## Performance Considerations

### Materialized Instances
- Recurrence instances are pre-generated
- Daily job generates 90 days ahead
- Prevents expensive real-time calculations

### Indexing
- Composite indexes on (startDate, endDate)
- Index on (module, eventType, status)
- Index on (userId, isDefault) for views

### Query Optimization
- Use date range filters
- Limit results with pagination
- Cache frequently accessed views

## Security

### Authentication
- All endpoints require authentication
- User context from tRPC middleware

### Authorization
- Row-level security via PermissionService
- Visibility controls (PRIVATE, TEAM, COMPANY, PUBLIC)
- Permission checks on all mutations

### Data Validation
- Zod schemas for all inputs
- Timezone validation
- DST ghost time detection

## Testing

### Manual Testing Checklist
- [ ] Create all-day event
- [ ] Create timed event
- [ ] Create recurring event (daily, weekly, monthly)
- [ ] Edit event
- [ ] Delete event
- [ ] Add participants
- [ ] Set reminders
- [ ] Filter events by module/type/status
- [ ] Switch between calendar views
- [ ] Test timezone handling
- [ ] Test permission controls

### Integration Testing
- [ ] Calendar integrates with Clients module
- [ ] Calendar integrates with Accounting module
- [ ] Calendar integrates with Inventory module
- [ ] Background jobs run successfully
- [ ] Reminders are sent correctly

## Known Limitations

1. **Recurrence Complexity**: Advanced recurrence patterns (e.g., "2nd Tuesday of every month") not yet supported
2. **Calendar Sync**: External calendar sync (Google Calendar, Outlook) not implemented
3. **Conflict Detection**: Automatic meeting conflict detection not implemented
4. **Resource Booking**: Room/resource booking not implemented

## Future Enhancements

### Phase 1 (Next Release)
- Advanced recurrence patterns
- Conflict detection and resolution
- Drag-and-drop event rescheduling
- Bulk event operations

### Phase 2
- External calendar sync (Google, Outlook, iCal)
- Resource booking (rooms, equipment)
- Video conferencing integration
- Calendar sharing and delegation

### Phase 3
- AI-powered scheduling assistant
- Smart meeting suggestions
- Automatic time zone detection
- Calendar analytics and insights

## Support

For issues or questions:
- Check the technical spec: `product-management/initiatives/TERP-INIT-003/docs/technical-spec.md`
- Review the roadmap: `product-management/initiatives/TERP-INIT-003/docs/roadmap.md`
- Contact the development team

## Changelog

### Version 2.0 (November 4, 2025)
- Initial production release
- Complete backend infrastructure
- Full frontend UI with 4 calendar views
- Recurrence pattern support
- RBAC permissions
- Background job infrastructure
- V2.1 additions (meeting confirmation, financial context)

---

**Status**: ✅ PRODUCTION-READY  
**Implementation**: Complete  
**Documentation**: Complete  
**Testing**: Manual testing required
