# Staging Rollout Plan

## Overview

This document outlines the staging deployment procedure for TERP database and application changes.

## Pre-Deployment Checklist

### 1. Backup Steps

- [ ] Verify current database backup is recent (< 24 hours)
- [ ] Create manual backup before major changes:
  ```bash
  mysqldump -h $STAGING_DB_HOST -u $DB_USER -p$DB_PASSWORD terp_staging > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Verify backup file integrity (check file size, basic SQL validation)
- [ ] Store backup in secure location with timestamp

### 2. Pre-Flight Checks

- [ ] All CI checks passing on the branch
- [ ] Schema validation passing: `pnpm validate:schema`
- [ ] TypeScript errors at or below baseline
- [ ] All unit tests passing
- [ ] No blocking code review comments

### 3. Environment Verification

- [ ] Staging environment is accessible
- [ ] Database connection is working
- [ ] Application health check endpoint responding
- [ ] SSL certificate is valid
- [ ] Host guard configuration is correct

## Deployment Steps

### Step 1: Announce Deployment

```
📢 Staging Deployment Starting
Environment: staging.terp-app.local
Estimated Duration: 15-30 minutes
Contact: [deployer name]
```

### Step 2: Apply Database Migrations

```bash
# Set environment
export DATABASE_URL="mysql://user:pass@staging-host:3306/terp_staging"

# Run migrations
pnpm db:push

# Verify schema
pnpm validate:schema
```

### Step 3: Deploy Application

```bash
# Deploy to staging
# (Use your deployment tool - Railway, Vercel, etc.)
```

### Step 4: Smoke Test Checklist

#### Critical Flows

- [ ] **Authentication**: User can log in
- [ ] **Dashboard**: Dashboard loads with data
- [ ] **Orders**: Create new order works
- [ ] **Inventory**: View inventory list works
- [ ] **Clients**: View client details works
- [ ] **Calendar**: Calendar events display correctly
- [ ] **VIP Portal**: Client portal accessible (if applicable)

#### API Health

- [ ] `/api/health` returns 200
- [ ] tRPC endpoints responding
- [ ] No console errors in browser

### Step 5: Verify Deployment

```bash
# Check application logs
railway logs --limit 100

# Verify no errors
grep -i error logs.txt | head -20
```

## Rollback Procedure

### If issues are detected:

1. **Stop the deployment** immediately
2. **Document the issue** with screenshots/logs
3. **Rollback application** to previous version:
   ```bash
   # Use your deployment tool's rollback feature
   railway rollback
   ```
4. **Restore database** if schema changes were applied:
   ```bash
   mysql -h $STAGING_DB_HOST -u $DB_USER -p$DB_PASSWORD terp_staging < backup_YYYYMMDD_HHMMSS.sql
   ```
5. **Verify rollback** with smoke tests
6. **Create incident report**

## Post-Deployment

- [ ] Update deployment log
- [ ] Notify team of successful deployment
- [ ] Monitor error rates for 30 minutes
- [ ] Close deployment announcement

## SSL and Host Guard Requirements

### SSL Configuration

- All staging endpoints must use HTTPS
- Certificate must be valid and not expired
- HSTS headers should be configured

### Host Guard

- Staging environment should restrict access to authorized IPs/users
- Configure allowed hosts in environment variables:
  ```
  ALLOWED_HOSTS=staging.terp-app.local
  ```

## Contact

- **On-Call Engineer**: [Contact details]
- **Database Team**: [Contact details]
- **Escalation**: [Contact details]
