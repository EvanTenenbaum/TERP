# QA-044-MIGRATION: Apply Event Invitation Database Migration

<!-- METADATA (for validation) -->
<!-- TASK_ID: QA-044-MIGRATION -->
<!-- TASK_TITLE: Apply Event Invitation Database Migration -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2025-11-21 -->

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** QA-044-MIGRATION  
**Priority:** P1 (CRITICAL - Feature Blocked)  
**Estimated Time:** 1-2 hours  
**Module:** Database Migration

⚠️ **CRITICAL:** This is a follow-up task. The code for QA-044 is already deployed, but the database migration has NOT been applied. The feature will NOT work until this migration is run.

---

## 📋 Table of Contents

1. [Context](#context)
2. [Phase 1: Pre-Flight Check](#phase-1-pre-flight-check)
3. [Phase 2: Session Startup](#phase-2-session-startup)
4. [Phase 3: Migration](#phase-3-migration)
5. [Phase 4: Completion](#phase-4-completion)
6. [Quick Reference](#quick-reference)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Context

**Background:**
QA-044 (Event Invitation Workflow) was completed with all code deployed to production. However, the database migration `drizzle/0036_add_event_invitations.sql` was NOT applied to the production database. This means:
- The code exists and is deployed
- The database tables do NOT exist
- The feature will throw errors if used
- The feature is completely non-functional

**Goal:**
Apply the database migration to production and verify the feature works correctly.

**Success Criteria:**

- [ ] Database migration applied successfully
- [ ] All 3 new tables created (calendar_event_invitations, calendar_invitation_settings, calendar_invitation_history)
- [ ] Tables verified in production database
- [ ] Application tested and working
- [ ] Smoke tests passed
- [ ] Roadmap updated to complete

---

## Phase 1: Pre-Flight Check

**Objective:** Verify environment and check for conflicts BEFORE starting work.

### Step 1.1: Register Your Session

1. Create session file: `docs/sessions/active/Session-$(date +%Y%m%d)-QA-044-MIGRATION-$(openssl rand -hex 4).md`
2. Use template: `docs/templates/SESSION_TEMPLATE.md`
3. Fill in your session details.

### Step 1.2: Register Session (Atomic) ⚠️ CRITICAL

**This step prevents race conditions. Follow it exactly.**

1. `git pull origin main` (to get the latest `ACTIVE_SESSIONS.md`)
2. Read `docs/ACTIVE_SESSIONS.md` and check for module conflicts.
3. If clear, add your session to the file:
   ```bash
   echo "- QA-044-MIGRATION: Session-$(date +%Y%m%d)-QA-044-MIGRATION-$(openssl rand -hex 4) ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
   ```
4. Commit and push **immediately**:
   ```bash
   git add docs/ACTIVE_SESSIONS.md
   git commit -m "Register session for QA-044-MIGRATION"
   git push origin main
   ```
5. **If the push fails due to a conflict, another agent registered first.** STOP, pull again, and re-evaluate. Do not proceed until your session is successfully pushed to `main`.

### Step 1.3: Verify Environment

Run these commands:

```bash
node --version
pnpm --version
git status
mysql --version  # Verify MySQL client available
```

### Step 1.4: Verify Database Access

**You need:**
- Production database connection details
- Database credentials (from `.env` or DigitalOcean)
- MySQL client installed

**Verify access:**
```bash
# Test connection (will prompt for password)
mysql -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      -P 25060 \
      -u doadmin \
      -p \
      --ssl-mode=REQUIRED \
      defaultdb -e "SELECT 1;"
```

If this fails, you need database credentials from the user.

---

## Phase 2: Session Startup

**Objective:** Set up your workspace and verify migration file exists.

### Step 2.1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b qa-044-migration
```

### Step 2.2: Verify Migration File Exists

```bash
# Check migration file exists
ls -la drizzle/0036_add_event_invitations.sql

# Read migration file to understand what it does
cat drizzle/0036_add_event_invitations.sql
```

**Expected Tables:**
- `calendar_event_invitations`
- `calendar_invitation_settings`
- `calendar_invitation_history`

### Step 2.3: Check Rollback File (Safety)

```bash
# Check if rollback exists
ls -la drizzle/rollback/0036_rollback_event_invitations.sql
```

If rollback doesn't exist, document this in your session file.

### Step 2.4: Update Roadmap Status

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Find the QA-044 task and note that migration is in progress.

---

## Phase 3: Migration

**Objective:** Apply database migration safely and verify.

### Step 3.1: Backup Current State (Recommended)

**Option 1: Create Database Backup**
```bash
# Export current schema for the tables (if they exist)
mysqldump -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
         -P 25060 \
         -u doadmin \
         -p \
         --ssl-mode=REQUIRED \
         --no-data \
         defaultdb calendar_event_invitations calendar_invitation_settings calendar_invitation_history > backup_schema_$(date +%Y%m%d).sql
```

**Option 2: Document Current State**
- Note current table count
- Document any existing data

### Step 3.2: Verify Tables Don't Exist

```bash
mysql -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      -P 25060 \
      -u doadmin \
      -p \
      --ssl-mode=REQUIRED \
      defaultdb -e "SHOW TABLES LIKE 'calendar_%invitation%';"
```

**Expected:** Empty result (tables don't exist yet)

If tables DO exist, STOP and investigate. They may have been created manually.

### Step 3.3: Apply Migration

**Method 1: Direct SQL Execution**
```bash
mysql -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      -P 25060 \
      -u doadmin \
      -p \
      --ssl-mode=REQUIRED \
      defaultdb < drizzle/0036_add_event_invitations.sql
```

**Method 2: Interactive MySQL**
```bash
mysql -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      -P 25060 \
      -u doadmin \
      -p \
      --ssl-mode=REQUIRED \
      defaultdb

# Then in MySQL prompt:
source drizzle/0036_add_event_invitations.sql;
```

### Step 3.4: Verify Tables Created

```bash
mysql -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      -P 25060 \
      -u doadmin \
      -p \
      --ssl-mode=REQUIRED \
      defaultdb -e "SHOW TABLES LIKE 'calendar_%invitation%';"
```

**Expected Output:**
```
+----------------------------------------+
| Tables_in_defaultdb                    |
+----------------------------------------+
| calendar_event_invitations             |
| calendar_invitation_settings           |
| calendar_invitation_history           |
+----------------------------------------+
```

### Step 3.5: Verify Table Structure

```bash
mysql -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      -P 25060 \
      -u doadmin \
      -p \
      --ssl-mode=REQUIRED \
      defaultdb -e "DESCRIBE calendar_event_invitations;"
```

Verify columns match expected schema from migration file.

### Step 3.6: Test Application

1. **Check Application Logs:**
   - Verify no errors related to missing tables
   - Check DigitalOcean app logs

2. **Test Feature:**
   - Navigate to calendar
   - Create a test event
   - Try to send an invitation
   - Verify invitation appears
   - Accept invitation
   - Verify participant created

### Step 3.7: Run Smoke Tests

**Test Checklist:**
- [ ] Create test event
- [ ] Send invitation to test user
- [ ] Accept invitation
- [ ] Verify participant created in database
- [ ] Check invitation history
- [ ] Test auto-accept settings (if applicable)

---

## Phase 4: Completion

**Objective:** Finalize migration and update documentation.

### Step 4.1: Verify All Deliverables

- [ ] Migration applied successfully
- [ ] All 3 tables created
- [ ] Tables verified
- [ ] Application tested
- [ ] Smoke tests passed

### Step 4.2: Create Completion Report

Use the template at `docs/templates/COMPLETION_REPORT_TEMPLATE.md`.

**Include:**
- Migration execution details
- Tables created
- Verification results
- Testing results
- Any issues encountered

### Step 4.3: Update Roadmap to Complete

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Update QA-044 task:
- Change status from `⚠️ INCOMPLETE` to `✅ COMPLETE`
- Add completion date: `(Completed: YYYY-MM-DD)`
- Note that migration was applied
- Add key information about migration

### Step 4.4: Archive Session

1. Move session file to `docs/sessions/completed/`
2. Remove from `docs/ACTIVE_SESSIONS.md`

### Step 4.5: Push to Main

```bash
git add docs/roadmaps/MASTER_ROADMAP.md docs/sessions/
git commit -m "Complete QA-044-MIGRATION: Apply event invitation database migration"
git push origin qa-044-migration:main
```

**DO NOT create a pull request** - push directly to main.

### Step 4.6: Notify User

Inform the user that:
- Migration applied successfully
- QA-044 feature is now fully functional
- All tests passed

---

## ⚡ Quick Reference

**Migration File:**
- `drizzle/0036_add_event_invitations.sql`

**Database Connection:**
```bash
mysql -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      -P 25060 \
      -u doadmin \
      -p \
      --ssl-mode=REQUIRED \
      defaultdb
```

**Tables Created:**
- `calendar_event_invitations`
- `calendar_invitation_settings`
- `calendar_invitation_history`

**Verification Commands:**
```bash
# Check tables exist
SHOW TABLES LIKE 'calendar_%invitation%';

# Check table structure
DESCRIBE calendar_event_invitations;
```

---

## 🆘 Troubleshooting

**Issue: Migration fails with syntax error**
- Check MySQL version compatibility
- Verify migration file syntax
- Check for special characters or encoding issues

**Issue: Tables already exist**
- Check if migration was already applied
- Verify table structure matches migration
- Consider if manual creation happened

**Issue: Permission denied**
- Verify database user has CREATE TABLE permissions
- Check if user has access to defaultdb database
- Contact database administrator if needed

**Issue: Application still shows errors after migration**
- Clear application cache
- Restart DigitalOcean app
- Check application logs for specific errors
- Verify database connection in application

**Issue: Need to rollback**
```bash
# If rollback file exists
mysql -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      -P 25060 \
      -u doadmin \
      -p \
      --ssl-mode=REQUIRED \
      defaultdb < drizzle/rollback/0036_rollback_event_invitations.sql
```

---

**Last Updated:** November 21, 2025

