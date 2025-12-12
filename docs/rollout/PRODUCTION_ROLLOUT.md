# Production Rollout Plan

## Overview

This document outlines the production deployment procedure for TERP database and application changes. Production deployments require careful planning and coordination.

## Pre-Deployment Requirements

### 1. Staging Verification

- [ ] Changes deployed to staging successfully
- [ ] Staging smoke tests passed
- [ ] Changes validated in staging for at least 24 hours
- [ ] No new issues reported in staging

### 2. Approval Requirements

- [ ] Technical lead approval
- [ ] Database admin approval (for schema changes)
- [ ] Business stakeholder notification
- [ ] Deployment window approved

## Maintenance Window

### Standard Maintenance Window

- **Day**: Weekday (Tuesday-Thursday preferred)
- **Time**: 10:00 PM - 2:00 AM EST (low traffic period)
- **Duration**: 2-4 hours maximum

### Emergency Deployments

- Requires explicit approval from Technical Lead
- Must have rollback plan verified
- Limited to critical security/bug fixes

## Pre-Deployment Checklist

### 24 Hours Before

- [ ] Send deployment notification to stakeholders
- [ ] Verify staging environment matches planned production changes
- [ ] Review and finalize rollback plan
- [ ] Confirm on-call engineer availability
- [ ] Verify backup systems are functioning

### 2 Hours Before

- [ ] Create fresh database backup:
  ```bash
  mysqldump -h $PROD_DB_HOST -u $DB_USER -p$DB_PASSWORD terp_production > prod_backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Verify backup integrity
- [ ] Store backup in multiple locations (S3, local)
- [ ] Confirm team members are online

### 30 Minutes Before

- [ ] Final check of CI pipeline status
- [ ] Verify monitoring dashboards are accessible
- [ ] Confirm rollback scripts are ready
- [ ] Post deployment start announcement

## Deployment Steps

### Step 1: Announce Maintenance

```
📢 Production Deployment Starting
Environment: production.terp-app.local
Estimated Duration: [X] minutes
Maintenance Window: [START TIME] - [END TIME]
Contact: [deployer name]
```

### Step 2: Enable Maintenance Mode (if applicable)

```bash
# Enable maintenance mode
curl -X POST https://api.production.terp-app.local/admin/maintenance/enable \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Step 3: Apply Database Migrations

```bash
# Set environment
export DATABASE_URL="$PRODUCTION_DATABASE_URL"

# Run migrations with logging
pnpm db:push 2>&1 | tee migration_$(date +%Y%m%d_%H%M%S).log

# Verify schema
pnpm validate:schema
```

### Step 4: Deploy Application

```bash
# Deploy to production
# (Use your deployment tool)
railway deploy --environment production
```

### Step 5: Production Smoke Tests

#### Critical Path Testing

- [ ] **Authentication**
  - [ ] User login works
  - [ ] Session persistence works
  - [ ] Logout works

- [ ] **Core Features**
  - [ ] Dashboard loads with real data
  - [ ] Orders list displays correctly
  - [ ] Create new order works
  - [ ] Inventory operations work
  - [ ] Client management works

- [ ] **API Health**
  - [ ] Health endpoint: `curl https://api.production.terp-app.local/health`
  - [ ] tRPC endpoints responding
  - [ ] No 5xx errors in logs

- [ ] **Data Integrity**
  - [ ] Recent data is visible
  - [ ] No data corruption detected
  - [ ] Calculations are correct

### Step 6: Disable Maintenance Mode

```bash
# Disable maintenance mode
curl -X POST https://api.production.terp-app.local/admin/maintenance/disable \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Step 7: Post-Deployment Verification

- [ ] Monitor error rates (should be at or below baseline)
- [ ] Check application performance metrics
- [ ] Verify all services are healthy
- [ ] Confirm no user-reported issues

## Rollback Procedure

### Decision Criteria for Rollback

- Critical functionality broken
- Data integrity issues
- Error rate > 5% above baseline
- Performance degradation > 50%
- Security vulnerability discovered

### Rollback Steps

1. **Immediate Actions**
   ```bash
   # Revert application
   railway rollback --environment production

   # Re-enable maintenance mode if needed
   curl -X POST https://api.production.terp-app.local/admin/maintenance/enable
   ```

2. **Database Rollback** (if needed)
   ```bash
   # Restore from backup
   mysql -h $PROD_DB_HOST -u $DB_USER -p$DB_PASSWORD terp_production < prod_backup_YYYYMMDD_HHMMSS.sql
   ```

3. **Verification**
   - [ ] Application is responding
   - [ ] Data is intact
   - [ ] Core features work
   - [ ] Error rates normalized

4. **Communication**
   ```
   📢 Production Rollback Completed
   Reason: [Brief description]
   Current Status: Stable
   Next Steps: [Investigation/Fix plan]
   ```

5. **Post-Mortem**
   - Create incident report within 24 hours
   - Schedule post-mortem meeting
   - Document lessons learned

## Monitoring

### During Deployment

- Watch error rate dashboards
- Monitor database connection pool
- Check memory and CPU usage
- Review application logs in real-time

### Post-Deployment (First 24 Hours)

- Set up alerts for anomaly detection
- Schedule periodic spot checks
- Review error logs every 4 hours
- Monitor user feedback channels

## Production Smoke Test Checklist

### Authentication & Authorization
- [ ] Login with valid credentials
- [ ] Logout functionality
- [ ] Role-based access control working

### Orders Module
- [ ] View orders list
- [ ] Create new order
- [ ] Edit existing order
- [ ] Order status updates work

### Inventory Module
- [ ] View inventory list
- [ ] Batch management works
- [ ] Stock updates reflect correctly

### Client Module
- [ ] View client list
- [ ] Client details page loads
- [ ] Client notes work

### Calendar Module
- [ ] Calendar view loads
- [ ] Events display correctly
- [ ] Event creation works

### Reporting
- [ ] Dashboard metrics load
- [ ] Export functionality works

## Contact and Escalation

### Primary Contacts

| Role | Name | Contact |
|------|------|---------|
| On-Call Engineer | TBD | [Phone/Slack] |
| Technical Lead | TBD | [Phone/Slack] |
| Database Admin | TBD | [Phone/Slack] |

### Escalation Path

1. On-Call Engineer (immediate response)
2. Technical Lead (within 15 minutes)
3. Database Admin (for data issues)
4. Management (for major incidents)

## Appendix: Emergency Contacts

- **Hosting Provider Support**: [Contact details]
- **Database Provider Support**: [Contact details]
- **Security Team**: [Contact details]
