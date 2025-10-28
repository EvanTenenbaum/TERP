# TERP Monitoring & Rollback Plan

**Application:** TERP v3.5.0  
**Environment:** Production  
**Platform:** DigitalOcean App Platform  
**Date:** October 27, 2025

---

## Table of Contents
1. [Monitoring Setup](#monitoring-setup)
2. [Health Checks](#health-checks)
3. [Alert Configuration](#alert-configuration)
4. [Rollback Procedures](#rollback-procedures)
5. [Backup & Recovery](#backup--recovery)
6. [Incident Response](#incident-response)

---

## Monitoring Setup

### Application Monitoring

#### 1. DigitalOcean Built-in Monitoring
**Already Active:**
- CPU usage monitoring
- Memory usage monitoring
- Request rate tracking
- Response time tracking

**Access:**
```
https://cloud.digitalocean.com/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4/insights
```

#### 2. Application Logs
**Access via DigitalOcean CLI:**
```bash
# Real-time logs
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --follow

# Recent logs
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --tail 100
```

**Access via API:**
```bash
curl -X GET \
  -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
  "https://api.digitalocean.com/v2/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4/deployments/<deployment_id>/logs?type=RUN&follow=false"
```

#### 3. Error Tracking (Sentry) - TO BE CONFIGURED
**Setup Steps:**
1. Create Sentry account at https://sentry.io
2. Create new project for TERP
3. Get DSN from project settings
4. Add to DigitalOcean environment variables:
   ```
   SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
   ```
5. Verify errors are being captured

**Benefits:**
- Real-time error notifications
- Stack traces for debugging
- Error frequency tracking
- User impact analysis

---

## Health Checks

### Endpoint: `/health`
**URL:** https://terp-app-b9s35.ondigitalocean.app/health

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-27T...",
  "uptime": 12345
}
```

### Manual Health Check Script
```bash
#!/bin/bash
# health_check.sh

HEALTH_URL="https://terp-app-b9s35.ondigitalocean.app/health"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -eq 200 ]; then
  echo "✅ TERP is healthy (HTTP $response)"
  exit 0
else
  echo "❌ TERP is unhealthy (HTTP $response)"
  exit 1
fi
```

### Automated Health Monitoring
**Using cron (every 5 minutes):**
```bash
*/5 * * * * /path/to/health_check.sh || echo "TERP health check failed" | mail -s "TERP Alert" admin@example.com
```

---

## Alert Configuration

### Critical Alerts (Immediate Action Required)

#### 1. Application Down
**Trigger:** Health check returns non-200 status
**Action:** 
- Check deployment status
- Review recent logs
- Consider rollback if issue persists

#### 2. High Error Rate
**Trigger:** >10 errors per minute in logs
**Action:**
- Review error logs
- Check Sentry dashboard
- Identify root cause

#### 3. Database Connection Failures
**Trigger:** "ECONNREFUSED" or "Connection lost" in logs
**Action:**
- Check database status in DigitalOcean
- Verify DATABASE_URL is correct
- Check database connection pool

### Warning Alerts (Monitor Closely)

#### 1. High Memory Usage
**Trigger:** Memory usage >80%
**Action:**
- Monitor for memory leaks
- Consider scaling up if sustained

#### 2. Slow Response Times
**Trigger:** Average response time >2 seconds
**Action:**
- Check database query performance
- Review slow API endpoints
- Consider caching strategies

#### 3. High CPU Usage
**Trigger:** CPU usage >80%
**Action:**
- Check for infinite loops
- Review recent code changes
- Consider scaling up

---

## Rollback Procedures

### Scenario 1: Critical Bug in Latest Deployment

#### Option A: Git Revert (Recommended)
```bash
# 1. Identify the problematic commit
git log --oneline -10

# 2. Revert the commit
git revert 28a5db7

# 3. Push to trigger auto-deploy
git push origin main

# 4. Monitor deployment
watch -n 5 'curl -s -H "Authorization: Bearer $DO_TOKEN" \
  "https://api.digitalocean.com/v2/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4/deployments" | \
  jq -r ".deployments[0].phase"'
```

**Time to Complete:** ~4-5 minutes

#### Option B: DigitalOcean Rollback (Faster)
```bash
# 1. Get previous deployment ID
curl -s -H "Authorization: Bearer $DO_TOKEN" \
  "https://api.digitalocean.com/v2/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4/deployments" | \
  jq -r '.deployments[1].id'

# 2. Trigger rollback via DigitalOcean dashboard
# Navigate to: https://cloud.digitalocean.com/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4/deployments
# Click "Rollback" on previous successful deployment
```

**Time to Complete:** ~2-3 minutes

### Scenario 2: Database Schema Issue

#### If Migration Caused Issues:
```bash
# 1. Connect to database
mysql -h [host] -u [user] -p [database]

# 2. Check recent migrations
SELECT * FROM migrations ORDER BY id DESC LIMIT 5;

# 3. Manually revert migration if needed
# (Depends on specific migration)

# 4. Redeploy application
git push origin main
```

### Scenario 3: Environment Variable Issue

#### Fix via DigitalOcean API:
```bash
# 1. Get current app spec
curl -s -H "Authorization: Bearer $DO_TOKEN" \
  "https://api.digitalocean.com/v2/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4" | \
  jq -r '.app.spec' > app_spec.json

# 2. Edit environment variables in app_spec.json

# 3. Update app
curl -X PUT \
  -H "Authorization: Bearer $DO_TOKEN" \
  -H "Content-Type: application/json" \
  -d @app_spec.json \
  "https://api.digitalocean.com/v2/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4"
```

---

## Backup & Recovery

### Database Backups

#### Automated Backups (DigitalOcean)
- **Frequency:** Daily
- **Retention:** 7 days
- **Location:** DigitalOcean managed backups

**Access:**
```
https://cloud.digitalocean.com/databases/[database-id]/backups
```

#### Manual Backup
```bash
# Create backup
mysqldump -h [host] -u [user] -p [database] > backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip backup_*.sql

# Upload to S3 or DigitalOcean Spaces (optional)
aws s3 cp backup_*.sql.gz s3://terp-backups/
```

#### Restore from Backup
```bash
# Download backup
aws s3 cp s3://terp-backups/backup_20251027.sql.gz .

# Decompress
gunzip backup_20251027.sql.gz

# Restore
mysql -h [host] -u [user] -p [database] < backup_20251027.sql
```

### Code Backups
- **Primary:** GitHub repository
- **Automatic:** Every commit is backed up
- **Retention:** Unlimited

---

## Incident Response

### Incident Severity Levels

#### P0 - Critical (Application Down)
**Response Time:** Immediate  
**Examples:**
- Application returns 500 errors
- Database is unreachable
- Authentication completely broken

**Response Steps:**
1. Acknowledge incident
2. Check health endpoint
3. Review recent deployments
4. Rollback if recent deployment caused issue
5. Investigate root cause
6. Implement fix
7. Post-mortem analysis

#### P1 - High (Major Feature Broken)
**Response Time:** Within 1 hour  
**Examples:**
- Critical feature not working
- Data corruption
- Security vulnerability

**Response Steps:**
1. Assess impact
2. Implement temporary workaround if possible
3. Investigate root cause
4. Deploy fix
5. Verify fix in production

#### P2 - Medium (Minor Feature Broken)
**Response Time:** Within 4 hours  
**Examples:**
- Non-critical feature broken
- Performance degradation
- UI bug

**Response Steps:**
1. Document issue
2. Create GitHub issue
3. Prioritize in backlog
4. Fix in next sprint

#### P3 - Low (Cosmetic Issue)
**Response Time:** Within 1 week  
**Examples:**
- Visual glitches
- Minor UX issues
- Non-blocking warnings

**Response Steps:**
1. Create GitHub issue
2. Add to backlog
3. Fix when convenient

### Incident Communication Template

```
**Incident:** [Brief description]
**Severity:** [P0/P1/P2/P3]
**Status:** [Investigating/Identified/Monitoring/Resolved]
**Started:** [Timestamp]
**Resolved:** [Timestamp or "Ongoing"]

**Impact:**
- [What is affected]
- [How many users affected]

**Timeline:**
- [HH:MM] - Incident detected
- [HH:MM] - Investigation started
- [HH:MM] - Root cause identified
- [HH:MM] - Fix deployed
- [HH:MM] - Incident resolved

**Root Cause:**
[Explanation of what caused the incident]

**Resolution:**
[What was done to fix it]

**Prevention:**
[Steps to prevent recurrence]
```

---

## Monitoring Checklist

### Daily Checks
- [ ] Check application health endpoint
- [ ] Review error logs for unusual patterns
- [ ] Verify deployment status is ACTIVE
- [ ] Check database connection status

### Weekly Checks
- [ ] Review Sentry error reports
- [ ] Check memory and CPU usage trends
- [ ] Review slow API endpoints
- [ ] Verify backups are running

### Monthly Checks
- [ ] Review security updates
- [ ] Update dependencies
- [ ] Test rollback procedures
- [ ] Review and update documentation

---

## Emergency Contacts

### Technical Contacts
- **Primary Developer:** [Name/Email]
- **DevOps Engineer:** [Name/Email]
- **Database Admin:** [Name/Email]

### Service Providers
- **DigitalOcean Support:** https://cloud.digitalocean.com/support
- **Clerk Support:** https://clerk.com/support
- **GitHub Support:** https://support.github.com

### Escalation Path
1. On-call developer (immediate)
2. Tech lead (if unresolved in 30 min)
3. CTO (if critical and unresolved in 1 hour)

---

## Quick Reference

### Key URLs
- **Production:** https://terp-app-b9s35.ondigitalocean.app
- **Health Check:** https://terp-app-b9s35.ondigitalocean.app/health
- **DigitalOcean Dashboard:** https://cloud.digitalocean.com/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4
- **GitHub Repo:** https://github.com/EvanTenenbaum/TERP
- **Clerk Dashboard:** https://dashboard.clerk.com

### Key Commands
```bash
# Check deployment status
curl -s -H "Authorization: Bearer $DO_TOKEN" \
  "https://api.digitalocean.com/v2/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4/deployments" | \
  jq -r '.deployments[0].phase'

# View recent logs
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --tail 50

# Trigger manual deployment
git commit --allow-empty -m "Manual deployment trigger"
git push origin main

# Health check
curl https://terp-app-b9s35.ondigitalocean.app/health
```

---

**Document Version:** 1.0  
**Last Updated:** October 27, 2025  
**Next Review:** November 27, 2025

