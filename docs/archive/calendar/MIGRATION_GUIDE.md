# Calendar Module Database Migration Guide

**Version:** 2.0  
**Date:** November 4, 2025  
**Initiative:** TERP-INIT-003

## Overview

This guide provides step-by-step instructions for migrating the database to support the new Calendar & Scheduling System.

## Prerequisites

- Drizzle ORM installed
- Database connection configured
- Backup of production database (if applicable)

## Migration Steps

### Step 1: Generate Migration

```bash
cd /path/to/TERP
npm run db:generate
```

This will generate a migration file in `drizzle/migrations/` based on the schema changes.

### Step 2: Review Migration

Review the generated migration file to ensure it includes:

1. **10 New Tables**:
   - `calendarEvents`
   - `calendarRecurrenceRules`
   - `calendarRecurrenceInstances`
   - `calendarEventParticipants`
   - `calendarReminders`
   - `calendarEventHistory`
   - `calendarEventAttachments`
   - `calendarViews`
   - `calendarEventPermissions`
   - `clientMeetingHistory`

2. **Indexes**:
   - Composite index on `calendarEvents(startDate, endDate)`
   - Index on `calendarEvents(module, eventType, status)`
   - Index on `calendarViews(userId, isDefault)`
   - Foreign key indexes

3. **Constraints**:
   - Foreign keys to `users`, `clients`, `invoices`, `bills`
   - Check constraints for valid enums
   - NOT NULL constraints

### Step 3: Backup Database (Production Only)

```bash
# PostgreSQL
pg_dump -U username -d terp_db > backup_$(date +%Y%m%d_%H%M%S).sql

# MySQL
mysqldump -u username -p terp_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 4: Apply Migration

```bash
npm run db:migrate
```

### Step 5: Verify Migration

```bash
# Check that all tables were created
npm run db:studio

# Or connect directly to database
psql -U username -d terp_db
\dt calendar*
```

Expected output:
```
                    List of relations
 Schema |            Name              | Type  |  Owner
--------+------------------------------+-------+---------
 public | calendarEvents               | table | username
 public | calendarRecurrenceRules      | table | username
 public | calendarRecurrenceInstances  | table | username
 public | calendarEventParticipants    | table | username
 public | calendarReminders            | table | username
 public | calendarEventHistory         | table | username
 public | calendarEventAttachments     | table | username
 public | calendarViews                | table | username
 public | calendarEventPermissions     | table | username
 public | clientMeetingHistory         | table | username
```

### Step 6: Initialize Default Data

```sql
-- Create default calendar view for each existing user
INSERT INTO calendarViews (userId, name, isDefault, filters, createdAt, updatedAt)
SELECT 
  id, 
  'My Calendar', 
  true, 
  '{}', 
  NOW(), 
  NOW()
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM calendarViews WHERE userId = users.id
);
```

### Step 7: Start Background Jobs

The calendar system includes several background jobs that need to be started:

```typescript
// In your server startup file (e.g., server/index.ts)
import { startAllJobs } from './server/_core/calendarJobs';

// Start calendar background jobs
startAllJobs();
```

Jobs that will be started:
- Instance Generation Job (daily at 2 AM)
- Reminder Notification Job (every 5 minutes)
- Data Cleanup Job (weekly on Sunday at 3 AM)
- Old Instance Cleanup Job (daily at 3 AM)
- Collections Alert Job (daily at 8 AM)
- Data Integrity Verification Job (daily at 4 AM)

### Step 8: Verify Functionality

Test the following:

1. **Create Event**:
```bash
curl -X POST http://localhost:5000/trpc/calendar.createEvent \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Event",
    "startDate": "2025-11-15",
    "startTime": "14:00",
    "endDate": "2025-11-15",
    "endTime": "15:00",
    "timezone": "America/New_York",
    "module": "GENERAL",
    "eventType": "MEETING"
  }'
```

2. **Get Events**:
```bash
curl http://localhost:5000/trpc/calendar.getEvents?startDate=2025-11-01&endDate=2025-11-30
```

3. **Create Recurring Event**:
```bash
curl -X POST http://localhost:5000/trpc/calendar.createEvent \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekly Standup",
    "startDate": "2025-11-04",
    "startTime": "09:00",
    "endTime": "09:30",
    "timezone": "America/New_York",
    "isRecurring": true,
    "recurrenceRule": {
      "frequency": "WEEKLY",
      "interval": 1,
      "startDate": "2025-11-04"
    }
  }'
```

## Rollback Procedure

If you need to rollback the migration:

### Step 1: Restore from Backup

```bash
# PostgreSQL
psql -U username -d terp_db < backup_YYYYMMDD_HHMMSS.sql

# MySQL
mysql -u username -p terp_db < backup_YYYYMMDD_HHMMSS.sql
```

### Step 2: Drop Calendar Tables (Alternative)

If you don't have a backup and need to remove calendar tables:

```sql
-- Drop tables in reverse order (to handle foreign keys)
DROP TABLE IF EXISTS clientMeetingHistory CASCADE;
DROP TABLE IF EXISTS calendarEventPermissions CASCADE;
DROP TABLE IF EXISTS calendarViews CASCADE;
DROP TABLE IF EXISTS calendarEventAttachments CASCADE;
DROP TABLE IF EXISTS calendarEventHistory CASCADE;
DROP TABLE IF EXISTS calendarReminders CASCADE;
DROP TABLE IF EXISTS calendarEventParticipants CASCADE;
DROP TABLE IF EXISTS calendarRecurrenceInstances CASCADE;
DROP TABLE IF EXISTS calendarRecurrenceRules CASCADE;
DROP TABLE IF EXISTS calendarEvents CASCADE;
```

### Step 3: Revert Schema Changes

```bash
# Checkout previous version of schema.ts
git checkout HEAD~1 drizzle/schema.ts

# Regenerate migration
npm run db:generate
npm run db:migrate
```

## Troubleshooting

### Issue: Foreign Key Constraint Fails

**Problem**: Migration fails due to foreign key constraints.

**Solution**: Ensure referenced tables exist:
- `users` table must exist
- `clients` table must exist (for clientMeetingHistory)
- `invoices` table must exist (for financial context)
- `bills` table must exist (for financial context)

### Issue: Enum Type Already Exists

**Problem**: Migration fails with "type already exists" error.

**Solution**:
```sql
-- Drop existing enum types
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS event_status CASCADE;
DROP TYPE IF EXISTS event_priority CASCADE;
-- etc.

-- Then re-run migration
npm run db:migrate
```

### Issue: Background Jobs Not Starting

**Problem**: Background jobs don't start after migration.

**Solution**:
1. Check that `node-cron` is installed: `npm install node-cron`
2. Verify jobs are imported in server startup
3. Check server logs for errors

### Issue: Timezone Validation Fails

**Problem**: Events fail to create with timezone errors.

**Solution**:
- Ensure timezone is a valid IANA timezone (e.g., "America/New_York")
- Check that `moment-timezone` is installed
- Verify timezone data is up to date

## Performance Optimization

After migration, optimize performance:

### Create Additional Indexes

```sql
-- Index for common queries
CREATE INDEX idx_calendar_events_user_date 
ON calendarEvents(createdBy, startDate, endDate);

-- Index for module filtering
CREATE INDEX idx_calendar_events_module_status 
ON calendarEvents(module, status) 
WHERE deletedAt IS NULL;

-- Index for recurrence instance lookups
CREATE INDEX idx_recurrence_instances_rule_date 
ON calendarRecurrenceInstances(recurrenceRuleId, instanceDate);
```

### Analyze Tables

```sql
-- PostgreSQL
ANALYZE calendarEvents;
ANALYZE calendarRecurrenceInstances;

-- MySQL
ANALYZE TABLE calendarEvents;
ANALYZE TABLE calendarRecurrenceInstances;
```

## Post-Migration Checklist

- [ ] All 10 tables created successfully
- [ ] Indexes created
- [ ] Foreign keys established
- [ ] Default calendar views created for existing users
- [ ] Background jobs started
- [ ] Test event creation works
- [ ] Test event retrieval works
- [ ] Test recurrence works
- [ ] Test permissions work
- [ ] Frontend calendar page loads
- [ ] No errors in server logs
- [ ] Database backup created

## Support

If you encounter issues during migration:

1. Check server logs: `tail -f server/logs/error.log`
2. Check database logs
3. Review migration file in `drizzle/migrations/`
4. Consult technical spec: `product-management/initiatives/TERP-INIT-003/docs/technical-spec.md`

---

**Migration Status**: Ready for Production  
**Estimated Time**: 5-10 minutes  
**Downtime Required**: None (for new installations) or 5 minutes (for existing systems)
