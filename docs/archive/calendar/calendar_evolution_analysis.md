# Calendar Evolution Notes - Parsed & Organized

## Raw Notes from User
```
Calendar widget on homepage dash(show day schedule based on customizable setting (event type, location etc). Click should take you to calendar 

Customizable default lengths for each event type 
Customizable / toggle on off - auto buffer between certain appointment types 

Customizable location (calendar should have location view )  

Different types of events, all faults customizable and in each event creation/edit also customizable including whether to show as free or busy)

External (ie anyone not on the team using erp) 
Intake 
Shopping 
Customer Payment drop off (AR collection) 
Vendor Payment pickup (AP payment) 
Meeting 

Internal:
Meeting 
Photos 
Do not book  (placeholder time block)
Who is on shift / vacations 

Each event should allow inclusion of client and/or users as attendees. Don't worry about any external phone email etc notifications. It should be captures/tracked in client profile and shown on profile page. Should allow user to quick book a client from profile page 

Should allow for reoccurring event settings 

VIP portals should allow booking but only by showing available times listed, not calendar view. Find the rest of this component of calendar bookings. 

In calendar module user should be able to see multiple calendars showing the different types of events
```

---

## Organized Feature Categories

### 1. Dashboard Integration
- **Calendar widget on homepage dashboard**
  - Show day schedule based on customizable settings (event type, location, etc.)
  - Click widget to navigate to full calendar module

### 2. Event Type System
**External Event Types** (non-team members):
- Intake
- Shopping  
- Customer Payment Drop-off (AR collection)
- Vendor Payment Pickup (AP payment)
- Meeting

**Internal Event Types** (team members):
- Meeting
- Photos
- Do Not Book (placeholder time block)
- Who is on shift / vacations

**Event Type Configuration**:
- Customizable default duration for each event type
- Customizable auto-buffer between certain appointment types
- Toggle free/busy status per event type
- All settings customizable globally AND per-event

### 3. Location Management
- Location field for events
- Location-based calendar view
- Filter/group events by location

### 4. Attendee Management
- Add clients as attendees
- Add users (team members) as attendees
- Track attendance in client profile
- Show event history on client profile page
- Quick-book functionality from client profile

### 5. Recurring Events
- Support for recurring event patterns
- (Note: Schema already exists for this)

### 6. External Booking (VIP Portals)
- Allow external users to book appointments
- Show only available time slots (list view)
- No calendar view for external users
- Integration with VIP portal system

### 7. Multi-Calendar View
- View multiple calendars simultaneously
- Filter by event type
- Separate visual representation for different event categories

---

## Current TERP Features Analysis

### ✅ Already Exists in Schema
1. **Event Types** - `eventType` enum exists with: MEETING, DEADLINE, TASK, DELIVERY, PAYMENT_DUE, FOLLOW_UP, AUDIT, INTAKE, PHOTOGRAPHY, etc.
2. **Location** - `location` varchar(500) field exists
3. **Recurring Events** - Full recurrence system exists (`calendarRecurrenceRules` table)
4. **Entity Linking** - `entityType` and `entityId` for polymorphic relationships (can link to clients)
5. **User Assignment** - `assignedTo` field exists
6. **Visibility** - `visibility` enum (PRIVATE, TEAM, COMPANY, PUBLIC)
7. **Client Integration** - `clientMeetingHistory` table exists linking calendar events to clients

### ⚠️ Partially Exists (Needs Evolution)
1. **Event Type Customization** - Event types are hardcoded enums, not user-customizable
2. **Attendees** - Only single `assignedTo`, no multi-attendee support
3. **Dashboard Widget** - Dashboard exists but no calendar widget yet
4. **Client Profile Integration** - `clientMeetingHistory` exists but no quick-book UI

### ❌ Missing (Needs New Implementation)
1. **Default Duration per Event Type** - No configuration table
2. **Auto-Buffer Between Events** - No buffer settings
3. **Free/Busy Status** - No field for this
4. **External/Internal Event Classification** - No field to distinguish
5. **Shift/Vacation Tracking** - No dedicated event type or system
6. **VIP Portal Booking** - No external booking system
7. **Multi-Calendar View** - UI feature, not in backend yet
8. **Location-Based View** - UI feature, not in backend yet

---

## Next Steps
1. Map overlaps with existing features
2. Identify evolution opportunities
3. Identify new features requiring fresh implementation
4. Create concise feature specification
