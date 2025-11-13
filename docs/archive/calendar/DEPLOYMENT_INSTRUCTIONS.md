# Calendar v3.2 Deployment Instructions
**Manual Migration Required**

---

## 📋 Overview

Calendar v3.2 code is ready for deployment. Migrations must be run manually on the database due to SSL certificate configuration.

**Status**: ✅ Code Ready | ⏳ Migrations Pending

---

## 🚀 Deployment Steps

### Step 1: Verify Code Deployment (5 min)

The following files have been added/modified and are ready in the repository:

**New Files** (11):
1. `server/routers/calendar.v32.ts` - All 9 endpoints
2. `server/tests/calendarDb.v32.test.ts` - Database function tests
3. `server/routers/calendar.v32.test.ts` - Router endpoint tests
4. `server/routers/calendarHealth.generated.ts` - Health check
5. `scripts/generate-calendar-v32.ts` - Code generator
6. `scripts/run-calendar-v32-migrations.ts` - Migration runner
7-11. `drizzle/0031-0035*.sql` - 5 migration files

**Modified Files** (3):
1. `drizzle/schema.ts` - Schema updates
2. `server/calendarDb.ts` - New database functions
3. `server/_core/logger.ts` - Calendar logging utilities

**Rollback Files** (5):
1-5. `drizzle/rollback/0031-0035*.sql` - Rollback migrations

**Status**: ✅ All files committed to repository

---

### Step 2: Run Migrations Manually (15 min)

**⚠️ IMPORTANT**: Backup database before running migrations!

#### Option A: Using Database Admin Tool (Recommended)

1. **Connect to database**:
   - Host: `terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com`
   - Port: `25060`
   - Database: `defaultdb`
   - User: `doadmin`
   - SSL: Required

2. **Run migrations in order**:

**Migration 1**: `drizzle/0031_add_calendar_v32_columns.sql`
```sql
-- Add client_id, vendor_id, metadata to calendar_events
ALTER TABLE calendar_events
ADD COLUMN client_id INT NULL AFTER entity_id;

ALTER TABLE calendar_events
ADD COLUMN vendor_id INT NULL AFTER client_id;

ALTER TABLE calendar_events
ADD COLUMN metadata JSON NULL;

ALTER TABLE calendar_events
ADD CONSTRAINT fk_calendar_events_client
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE calendar_events
ADD CONSTRAINT fk_calendar_events_vendor
FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;
```

**Migration 2**: `drizzle/0032_fix_meeting_history_cascade.sql`
```sql
-- Fix CASCADE behavior on client_meeting_history
ALTER TABLE client_meeting_history
DROP FOREIGN KEY fk_client_meeting_history_event;

ALTER TABLE client_meeting_history
ADD CONSTRAINT fk_client_meeting_history_event
FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id)
ON DELETE SET NULL;
```

**Migration 3**: `drizzle/0033_add_event_types.sql`
```sql
-- Add AR_COLLECTION and AP_PAYMENT event types
ALTER TABLE calendar_events
MODIFY COLUMN event_type ENUM(
  'MEETING', 'DEADLINE', 'TASK', 'DELIVERY', 'PAYMENT_DUE',
  'FOLLOW_UP', 'AUDIT', 'INTAKE', 'PHOTOGRAPHY', 'BATCH_EXPIRATION',
  'RECURRING_ORDER', 'SAMPLE_REQUEST', 'AR_COLLECTION', 'AP_PAYMENT', 'OTHER'
) NOT NULL;
```

**Migration 4**: `drizzle/0034_add_intake_event_to_orders.sql`
```sql
-- Add intake_event_id to orders
ALTER TABLE orders
ADD COLUMN intake_event_id INT NULL;

ALTER TABLE orders
ADD CONSTRAINT fk_orders_intake_event
FOREIGN KEY (intake_event_id) REFERENCES calendar_events(id)
ON DELETE SET NULL;
```

**Migration 5**: `drizzle/0035_add_photo_event_to_batches.sql`
```sql
-- Add photo_session_event_id to batches
ALTER TABLE batches
ADD COLUMN photo_session_event_id INT NULL;

ALTER TABLE batches
ADD CONSTRAINT fk_batches_photo_event
FOREIGN KEY (photo_session_event_id) REFERENCES calendar_events(id)
ON DELETE SET NULL;
```

3. **Verify migrations**:
```sql
-- Check calendar_events has new columns
DESCRIBE calendar_events;
-- Should see: client_id, vendor_id, metadata

-- Check orders has intake_event_id
DESCRIBE orders;
-- Should see: intake_event_id

-- Check batches has photo_session_event_id
DESCRIBE batches;
-- Should see: photo_session_event_id

-- Check event types include new ones
SHOW COLUMNS FROM calendar_events WHERE Field = 'event_type';
-- Should see: AR_COLLECTION, AP_PAYMENT in ENUM
```

#### Option B: Using Migration Script (If SSL Fixed)

If SSL certificate issue is resolved:

```bash
cd /home/ubuntu/TERP
npx tsx scripts/run-calendar-v32-migrations.ts
```

This will:
- Run all 5 migrations automatically
- Verify schema changes
- Report success/failure

---

### Step 3: Verify Deployment (10 min)

1. **Check health endpoint**:
```bash
curl https://api.terp.com/api/trpc/calendar.v32.health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Calendar v3.2 operational",
  "timestamp": "2025-11-12T..."
}
```

2. **Test quick book endpoint** (requires auth):
```bash
curl -X POST https://api.terp.com/api/trpc/calendar.v32.quickBookForClient \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": 1,
    "eventType": "MEETING",
    "date": "2025-11-15",
    "time": "09:00",
    "duration": 60,
    "title": "Test Meeting"
  }'
```

3. **Check logs**:
```bash
# Look for calendar v3.2 log entries
grep "CALENDAR" logs/combined.log | tail -20
```

Should see structured logs like:
```
{"level":"info","eventId":1,"userId":1,"eventType":"MEETING","msg":"Calendar event created: MEETING (ID: 1)"}
```

4. **Run tests**:
```bash
npm test -- server/routers/calendar.v32.test.ts
```

Should see:
```
✓ server/routers/calendar.v32.test.ts (25 tests) 65ms
Test Files  1 passed (1)
Tests  25 passed (25)
```

---

### Step 4: Monitor (Ongoing)

1. **Watch logs** for errors:
```bash
tail -f logs/combined.log | grep -E "(ERROR|CALENDAR)"
```

2. **Check error rates** (if Sentry configured):
   - Monitor Sentry dashboard
   - Look for new calendar.v32 errors

3. **Monitor performance**:
   - Check API response times
   - Monitor database query performance
   - Watch for N+1 query issues (should be none)

---

## 🔄 Rollback Plan

If issues are found, rollback in reverse order:

### Rollback Migrations

Run rollback scripts in reverse order (35 → 31):

```sql
-- Rollback 0035
ALTER TABLE batches DROP FOREIGN KEY IF EXISTS fk_batches_photo_event;
ALTER TABLE batches DROP COLUMN IF EXISTS photo_session_event_id;

-- Rollback 0034
ALTER TABLE orders DROP FOREIGN KEY IF EXISTS fk_orders_intake_event;
ALTER TABLE orders DROP COLUMN IF EXISTS intake_event_id;

-- Rollback 0033
ALTER TABLE calendar_events
MODIFY COLUMN event_type ENUM(
  'MEETING', 'DEADLINE', 'TASK', 'DELIVERY', 'PAYMENT_DUE',
  'FOLLOW_UP', 'AUDIT', 'INTAKE', 'PHOTOGRAPHY', 'BATCH_EXPIRATION',
  'RECURRING_ORDER', 'SAMPLE_REQUEST', 'OTHER'
) NOT NULL;

-- Rollback 0032
ALTER TABLE client_meeting_history DROP FOREIGN KEY IF EXISTS fk_client_meeting_history_event;
ALTER TABLE client_meeting_history
ADD CONSTRAINT fk_client_meeting_history_event
FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id) ON DELETE CASCADE;

-- Rollback 0031
ALTER TABLE calendar_events DROP FOREIGN KEY IF EXISTS fk_calendar_events_client;
ALTER TABLE calendar_events DROP FOREIGN KEY IF EXISTS fk_calendar_events_vendor;
ALTER TABLE calendar_events DROP COLUMN IF EXISTS metadata;
ALTER TABLE calendar_events DROP COLUMN IF EXISTS vendor_id;
ALTER TABLE calendar_events DROP COLUMN IF EXISTS client_id;
```

### Rollback Code

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or use specific rollback files
# (rollback SQL files are in drizzle/rollback/)
```

---

## 📊 Success Criteria

### Migrations
- [ ] All 5 migrations run successfully
- [ ] Schema verification passes
- [ ] No errors in database logs
- [ ] Foreign keys created correctly

### Code
- [ ] Health endpoint returns "healthy"
- [ ] All 35 tests passing
- [ ] No TypeScript errors
- [ ] No linting errors

### Functionality
- [ ] Can create events via quickBookForClient
- [ ] Can view client appointments
- [ ] Can process AR payments
- [ ] Can process AP payments
- [ ] Can create orders from INTAKE
- [ ] Can link batches to PHOTOGRAPHY
- [ ] VIP portal booking works
- [ ] Available slots API works

### Monitoring
- [ ] Structured logs appearing
- [ ] No error spikes
- [ ] Performance acceptable (< 500ms p95)
- [ ] No N+1 queries detected

---

## 📞 Support

If issues arise:

1. **Check logs**: `logs/combined.log`
2. **Run tests**: `npm test`
3. **Check health**: `curl /api/trpc/calendar.v32.health`
4. **Review docs**: `docs/calendar/CALENDAR_V3.2_FINAL_DELIVERY.md`
5. **Rollback if needed**: Use rollback SQL above

---

## 📝 Migration SQL Files

All migration SQL files are in:
- `drizzle/0031_add_calendar_v32_columns.sql`
- `drizzle/0032_fix_meeting_history_cascade.sql`
- `drizzle/0033_add_event_types.sql`
- `drizzle/0034_add_intake_event_to_orders.sql`
- `drizzle/0035_add_photo_event_to_batches.sql`

All rollback SQL files are in:
- `drizzle/rollback/0031_rollback_calendar_v32_columns.sql`
- `drizzle/rollback/0032_rollback_meeting_history_cascade.sql`
- `drizzle/rollback/0033_rollback_event_types.sql`
- `drizzle/rollback/0034_rollback_intake_event_from_orders.sql`
- `drizzle/rollback/0035_rollback_photo_event_from_batches.sql`

---

**Status**: ✅ Ready for manual migration and deployment

**Estimated Time**: 30 minutes total (15 min migrations + 10 min verification + 5 min monitoring setup)

**Risk**: Low (comprehensive testing, rollback plan ready)
