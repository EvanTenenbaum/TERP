# Deployment Checklist

## Critical Requirements for Production Deployment

This checklist ensures all systemic requirements are met before deployment.

---

## ✅ Phase 1: Database Schema Sync

### Requirement
Database schema must be automatically synced on every deployment.

### Implementation
- ✅ **Post-deploy migration script**: `scripts/post-deploy-migrate.sh`
- ✅ **Dockerfile integration**: Runs migrations before starting server
- ✅ **Command**: `pnpm drizzle-kit push --yes`

### Verification
```bash
# Check if migrations run on startup
docker logs <container-id> | grep "Database migrations"
```

### Status: ✅ IMPLEMENTED

---

## ⚠️ Phase 2: Additional Critical Requirements

### 2.1 Drizzle-kit Configuration
**Requirement**: `drizzle.config.ts` must be properly configured for production.

**Check**:
```bash
cat drizzle.config.ts
```

**Required**:
- Database connection from `DATABASE_URL`
- Correct schema path
- Migrations directory configured

### 2.2 Database Connection Pooling
**Requirement**: Production database must have proper connection pooling.

**Check**: Review `server/db-sync.ts` or equivalent

**Required**:
- Connection pool size configured
- Timeout settings
- Retry logic

### 2.3 Migration Safety
**Requirement**: Migrations must not drop data without explicit flags.

**Check**: Review migration files in `drizzle/migrations/`

**Required**:
- No destructive operations without confirmation
- Backup strategy documented
- Rollback procedures

### 2.4 Environment Variables
**Requirement**: All required environment variables must be set.

**Check**:
```bash
# In production console
env | grep -E "(DATABASE|NODE_ENV|JWT)"
```

**Required**:
- `DATABASE_URL`: ✅ Set via app.yaml
- `NODE_ENV=production`: ✅ Set via app.yaml
- `JWT_SECRET`: ✅ Set as SECRET
- `NEXTAUTH_SECRET`: ✅ Set as SECRET

### 2.5 Build-time vs Runtime Variables
**Requirement**: Variables must have correct scope.

**Check**: Review `.do/app.yaml`

**Required**:
- `DATABASE_URL`: `RUN_AND_BUILD_TIME` (needed for migrations during build)
- `VITE_*`: `RUN_AND_BUILD_TIME` (embedded in frontend)
- Secrets: `RUN_TIME` only

### 2.6 Health Check Configuration
**Requirement**: Health checks must not fail during migrations.

**Current**: 
- Initial delay: 180 seconds
- Path: `/health/live`

**Issue**: If migrations take >180s, deployment may fail

**Solution**: Increase `initial_delay_seconds` if needed

### 2.7 Seeding System Dependencies
**Requirement**: Seeding must work with current schema.

**Check**:
```bash
# Compare seeder fields with schema
grep -r "export const.*= mysqlTable" drizzle/schema.ts
```

**Required**:
- All seeder generators match current schema
- No references to removed columns
- All foreign keys exist

---

## 🔍 Phase 3: Pre-Deployment Verification

### 3.1 Local Testing
```bash
# Test migrations locally
pnpm drizzle-kit push

# Test seeding locally
pnpm seed:new --dry-run --size=small
```

### 3.2 Schema Validation
```bash
# Generate migration to see pending changes
pnpm drizzle-kit generate

# Review generated migration
cat drizzle/migrations/<latest>.sql
```

### 3.3 Dependency Check
```bash
# Ensure all dependencies are installed
pnpm install --frozen-lockfile

# Check for missing packages
pnpm why drizzle-kit
pnpm why drizzle-orm
```

---

## 📋 Deployment Procedure

### Step 1: Pre-Deployment
1. ✅ Run local tests
2. ✅ Verify schema changes
3. ✅ Review migration files
4. ✅ Commit all changes

### Step 2: Deployment
1. ✅ Push to GitHub main branch
2. ✅ DigitalOcean auto-deploys
3. ✅ Dockerfile builds image
4. ✅ Migrations run automatically
5. ✅ Server starts

### Step 3: Post-Deployment Verification
1. Check deployment logs for migration success
2. Verify health endpoint
3. Test seeding system
4. Validate UI functionality

---

## 🚨 Rollback Procedure

### If Deployment Fails

1. **Check logs**:
   ```bash
   doctl apps logs <app-id> --type build
   doctl apps logs <app-id> --type run
   ```

2. **If migration fails**:
   - Revert schema changes in code
   - Push revert commit
   - Wait for auto-deploy

3. **If data corruption**:
   - Restore from database backup
   - Review migration SQL
   - Fix and redeploy

---

## 📊 Monitoring

### Key Metrics
- Deployment duration
- Migration execution time
- Health check response time
- Error rates

### Alerts
- Migration failures
- Schema validation errors
- Connection pool exhaustion
- Health check failures

---

## 🔄 Continuous Improvement

### After Each Deployment
1. Document any issues encountered
2. Update this checklist
3. Improve automation
4. Reduce manual steps

### Regular Reviews
- Monthly: Review migration strategy
- Quarterly: Audit schema changes
- Annually: Evaluate deployment pipeline

---

## ✅ Current Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| Auto-migrations | ✅ Implemented | Via post-deploy script |
| Schema sync | ⚠️ Testing | Need to verify in production |
| Seeding system | ⚠️ Schema mismatch | Fixed in this deployment |
| Health checks | ✅ Configured | 180s initial delay |
| Environment vars | ✅ Set | All required vars configured |
| Rollback procedure | ✅ Documented | See above |

---

**Last Updated**: 2025-12-16  
**Next Review**: After successful deployment
