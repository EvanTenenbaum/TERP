# TERP Schema Rollback Runbook

**Version:** 1.0  
**Created:** January 2, 2026  
**Sprint:** Sprint A - Backend Infrastructure & Schema Sync

---

## Overview

This runbook provides step-by-step procedures for rolling back schema changes in various failure scenarios. All procedures have been designed following TERP safety protocols.

---

## Pre-Requisites

Before executing any rollback:

1. **Verify Access:**
   - SSH access to production server
   - Database credentials (via `.my.cnf` or `DB_PASSWORD` env var)
   - Git repository access

2. **Gather Information:**
   - Current deployment commit hash
   - Time of failure
   - Error messages/logs
   - Affected tables/data

3. **Communication:**
   - Notify team via Slack/email
   - Update status page if applicable

---

## Scenario 1: Stage 1 (Safe) Failure

**Risk Level:** 🟢 LOW  
**Typical Cause:** New table/column creation failed  
**Expected Recovery Time:** 5-10 minutes

### Procedure

```bash
# 1. Check current state
cd /home/ubuntu/TERP
pnpm tsx scripts/schema-sync/validate.ts --verbose

# 2. List available rollback targets
pnpm tsx scripts/schema-sync/rollback.ts --list

# 3. Preview rollback (DRY-RUN FIRST)
pnpm tsx scripts/schema-sync/rollback.ts --to-checkpoint=<checkpoint-id> --dry-run

# 4. Execute rollback
pnpm tsx scripts/schema-sync/rollback.ts --to-checkpoint=<checkpoint-id>

# 5. Verify
pnpm tsx scripts/schema-sync/verify.ts
curl https://terp-app-b9s35.ondigitalocean.app/health
```

### If No Checkpoint Available

```bash
# Manual rollback via SQL
# 1. Identify the failed migration
cat drizzle/meta/_journal.json | jq '.entries[-1]'

# 2. Drop the newly created table/column
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "DROP TABLE IF EXISTS <table_name>;"
# OR
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "ALTER TABLE <table> DROP COLUMN <column>;"
```

---

## Scenario 2: Stage 2 (Medium Risk) Failure

**Risk Level:** 🟡 MEDIUM  
**Typical Cause:** Constraint/FK addition failed, data type change failed  
**Expected Recovery Time:** 15-30 minutes

### Procedure

```bash
# 1. Stop application to prevent further damage
# (via DigitalOcean console or CLI)

# 2. Check database state
mysql -u $DB_USER $DB_NAME -e "SHOW CREATE TABLE <affected_table>;"

# 3. If checkpoint exists, restore from checkpoint
pnpm tsx scripts/schema-sync/rollback.ts --to-checkpoint=<checkpoint-id>

# 4. If no checkpoint, restore from backup
bash scripts/restore-database.sh /var/backups/terp/<latest_backup>.sql.gz --verify

# 5. Restart application
# (via DigitalOcean console or CLI)

# 6. Verify
curl https://terp-app-b9s35.ondigitalocean.app/health
pnpm tsx scripts/schema-sync/verify.ts
```

### Constraint Failure Recovery

```bash
# If FK constraint failed due to orphan data:
# 1. Identify orphan records
mysql -u $DB_USER $DB_NAME -e "
  SELECT * FROM child_table
  WHERE parent_id NOT IN (SELECT id FROM parent_table);
"

# 2. Either delete orphans or create missing parents
# 3. Retry constraint addition
```

---

## Scenario 3: Stage 3 (High Risk) Failure

**Risk Level:** 🔴 HIGH  
**Typical Cause:** Column rename, NOT NULL addition, data migration failed  
**Expected Recovery Time:** 30-60 minutes

### Procedure

```bash
# 1. IMMEDIATELY stop application
# (via DigitalOcean console - App > Settings > Maintenance Mode)

# 2. Assess damage
mysql -u $DB_USER $DB_NAME -e "SELECT COUNT(*) FROM <affected_table>;"
mysql -u $DB_USER $DB_NAME -e "DESCRIBE <affected_table>;"

# 3. RESTORE FROM BACKUP (mandatory for Stage 3)
# List available backups
ls -la /var/backups/terp/*.sql.gz

# Preview restore
bash scripts/restore-database.sh /var/backups/terp/<pre-stage3-backup>.sql.gz --dry-run

# Execute restore
bash scripts/restore-database.sh /var/backups/terp/<pre-stage3-backup>.sql.gz --verify

# 4. Rollback code to previous commit
git log --oneline -10
git checkout <previous-commit>

# 5. Rebuild and redeploy
pnpm install
pnpm build

# 6. Restart application
# (via DigitalOcean console - disable Maintenance Mode)

# 7. Comprehensive verification
curl https://terp-app-b9s35.ondigitalocean.app/health
pnpm tsx scripts/schema-sync/verify.ts
pnpm test
```

---

## Scenario 4: Post-Deployment Data Corruption

**Risk Level:** 🔴 CRITICAL  
**Typical Cause:** Application bug after schema change, race condition  
**Expected Recovery Time:** 1-2 hours

### Procedure

```bash
# 1. IMMEDIATELY enable maintenance mode
# (via DigitalOcean console)

# 2. Capture current state for forensics
mysqldump -u $DB_USER $DB_NAME > /tmp/corrupted_state_$(date +%Y%m%d_%H%M%S).sql
gzip /tmp/corrupted_state_*.sql

# 3. Identify corruption scope
mysql -u $DB_USER $DB_NAME -e "
  SELECT table_name, update_time
  FROM information_schema.tables
  WHERE table_schema = '$DB_NAME'
  ORDER BY update_time DESC
  LIMIT 20;
"

# 4. Determine restore point
# Find backup BEFORE corruption started
ls -la /var/backups/terp/*.sql.gz

# 5. Restore from clean backup
bash scripts/restore-database.sh /var/backups/terp/<clean_backup>.sql.gz --verify

# 6. Rollback code
git log --oneline -20
git checkout <last-known-good-commit>

# 7. Rebuild and redeploy
pnpm install
pnpm build

# 8. Disable maintenance mode

# 9. Monitor closely for 24 hours
```

---

## Scenario 5: Complete Database Loss

**Risk Level:** 🔴 CRITICAL  
**Typical Cause:** Infrastructure failure, accidental deletion  
**Expected Recovery Time:** 2-4 hours

### Procedure

```bash
# 1. Verify database is actually lost
mysql -u $DB_USER -e "SHOW DATABASES;"

# 2. If database exists but empty, skip to step 4

# 3. Recreate database
mysql -u $DB_USER -e "CREATE DATABASE terp_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Find most recent backup
ls -la /var/backups/terp/*.sql.gz | tail -5

# 5. If local backup unavailable, check S3
aws s3 ls s3://$AWS_S3_BUCKET/terp-backups/ --recursive | tail -5

# 6. Download from S3 if needed
aws s3 cp s3://$AWS_S3_BUCKET/terp-backups/<backup>.sql.gz /tmp/

# 7. Restore
bash scripts/restore-database.sh /tmp/<backup>.sql.gz --verify

# 8. Verify all critical tables
pnpm tsx scripts/schema-sync/verify.ts

# 9. Run full test suite
pnpm test
```

---

## Quick Reference Commands

### Check System Health

```bash
curl https://terp-app-b9s35.ondigitalocean.app/health
pnpm tsx scripts/schema-sync/verify.ts
```

### List Checkpoints

```bash
pnpm tsx scripts/schema-sync/rollback.ts --list
```

### Preview Rollback

```bash
pnpm tsx scripts/schema-sync/rollback.ts --to-checkpoint=<id> --dry-run
```

### Preview Restore

```bash
bash scripts/restore-database.sh <backup.sql.gz> --dry-run
```

### Create Emergency Backup

```bash
bash scripts/backup-database.sh
```

---

## Escalation Path

| Level | Contact           | When                          |
| ----- | ----------------- | ----------------------------- |
| L1    | On-call Developer | Any failure                   |
| L2    | Tech Lead         | Stage 2+ failure              |
| L3    | CTO               | Data loss or >1 hour downtime |

---

## Post-Incident

After any rollback:

1. **Document the incident** in `docs/incidents/`
2. **Update this runbook** if procedures were insufficient
3. **Create follow-up tasks** to prevent recurrence
4. **Conduct post-mortem** within 48 hours

---

## Rollback Drill Schedule

| Drill Type       | Frequency     | Last Completed |
| ---------------- | ------------- | -------------- |
| Stage 1 Rollback | Monthly       | -              |
| Stage 2 Rollback | Quarterly     | -              |
| Full Restore     | Semi-annually | -              |

**Note:** Drills should be conducted in staging environment, not production.
