# Schema Drift Monitoring SOP

## Overview

This document outlines the Standard Operating Procedure for monitoring and responding to schema drift between Drizzle ORM definitions and the MySQL database.

## What is Schema Drift?

Schema drift occurs when the database structure diverges from the ORM schema definitions. This can happen due to:

- Manual database modifications
- Failed or partial migrations
- Multiple deployments without proper synchronization
- Direct SQL queries modifying structure

## Monitoring Infrastructure

### Automated Monitoring

1. **PR Validation** (`.github/workflows/schema-validation.yml`)
   - Runs on every PR touching `drizzle/**` or `server/**`
   - Blocks merge if drift is detected

2. **Nightly Check** (`.github/workflows/nightly-schema-check.yml`)
   - Runs daily at 2:00 AM UTC
   - Creates GitHub issue if drift is detected
   - Escalates if not resolved within 24 hours

3. **Pre-Deployment Validation**
   - Part of staging and production deployment procedures
   - Required check before any deployment

### Manual Validation

Run schema validation locally:

```bash
pnpm validate:schema
```

Output includes:
- Schema comparison report
- List of discrepancies
- Suggested fixes

## Alert Procedures

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **Critical** | Production data at risk | Immediate | On-call + Tech Lead |
| **High** | Blocking deployments | 2 hours | Tech Lead |
| **Medium** | Detected drift, no impact | 24 hours | Database Team |
| **Low** | Minor discrepancies | 1 week | Development Team |

### Alert Sources

1. **GitHub Issue Created** (Nightly check)
   - Label: `schema-drift`
   - Auto-assigned to database team

2. **PR Check Failed**
   - Visible in PR checks
   - Blocks merge

3. **Deployment Failure**
   - Visible in deployment logs
   - Triggers immediate response

## Response Procedures

### Step 1: Acknowledge Alert

1. Acknowledge within SLA based on severity
2. Comment on GitHub issue with initial assessment
3. Notify relevant team members

### Step 2: Investigate Root Cause

```bash
# Check recent schema changes
git log --oneline -20 drizzle/

# Check recent migrations
ls -la drizzle/migrations/

# Run validation with verbose output
pnpm validate:schema --verbose
```

Common causes:
- Missing migration file
- Manual database modification
- Concurrent deployments
- Failed migration recovery

### Step 3: Determine Fix Approach

| Cause | Fix Approach |
|-------|--------------|
| Missing column in Drizzle | Add to schema, create migration |
| Extra column in DB | Remove from DB or add to schema |
| Type mismatch | Create corrective migration |
| Manual modification | Revert or formalize with migration |

### Step 4: Implement Fix

For adding missing elements to Drizzle:

```typescript
// Update drizzle/schema.ts
export const tableName = mysqlTable('table_name', {
  // ... existing columns
  new_column: varchar('new_column', { length: 255 }),
});
```

For creating corrective migration:

```bash
# Generate migration
pnpm db:generate

# Review generated SQL
cat drizzle/migrations/XXXX_migration.sql

# Apply migration
pnpm db:push
```

### Step 5: Verify Fix

```bash
# Run validation
pnpm validate:schema

# Verify no issues
# Expected output: "No schema drift detected"
```

### Step 6: Close Alert

1. Update GitHub issue with resolution
2. Close issue with summary
3. Update documentation if needed

## Failure Handling

### Validation Script Fails

```bash
# Check for missing dependencies
pnpm install

# Check database connection
echo "SELECT 1" | mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD

# Check for syntax errors in schema
pnpm tsc --noEmit drizzle/schema.ts
```

### Migration Fails

1. **Do not retry immediately**
2. Check error logs
3. Verify database state
4. Apply manual fix if needed
5. Update migration file
6. Retry with clean state

### False Positives

If validation reports drift that doesn't exist:

1. Verify database connection is to correct environment
2. Check for cached schema information
3. Clear Drizzle cache: `rm -rf .drizzle-cache`
4. Re-run validation

## Escalation Path

### Level 1: Development Team
- Handle minor drift issues
- Create corrective migrations
- Update schema definitions

### Level 2: Database Team
- Handle complex schema issues
- Production database modifications
- Performance-related changes

### Level 3: Technical Lead
- Approve blocked operations (DROP/RENAME)
- Major schema redesigns
- Cross-team coordination

### Level 4: Management
- Major incidents affecting production
- Extended downtime situations
- Business impact decisions

## Prevention Best Practices

1. **Always use migrations** - Never modify production DB directly
2. **Run validation locally** - Before committing schema changes
3. **Review migration files** - Before merging PRs
4. **Test in staging** - Before production deployment
5. **Document exceptions** - If manual changes are necessary

## Contact Information

| Role | Contact | Availability |
|------|---------|--------------|
| On-Call Engineer | [TBD] | 24/7 |
| Database Team | [TBD] | Business Hours |
| Technical Lead | [TBD] | Business Hours |

## Appendix: Common Commands

```bash
# Validate schema
pnpm validate:schema

# Generate migration
pnpm db:generate

# Push schema changes
pnpm db:push

# View database structure
pnpm db:studio

# Check TypeScript errors in schema
pnpm tsc --noEmit drizzle/schema.ts
```
