# Railway Atomic Migration Plan

> ⚠️ **DEPRECATED - HISTORICAL REFERENCE ONLY**
> 
> **TERP is NO LONGER deployed on Railway. We use DigitalOcean App Platform.**
> 
> This migration was executed but later reverted. We are back on DigitalOcean.
> 
> **Current Platform**: DigitalOcean App Platform
> **Production URL**: https://terp-app-b9s35.ondigitalocean.app

---

**Date**: 2025-12-03  
**Status**: DEPRECATED - Migration was reverted  
**Risk Level**: N/A  
**Estimated Time**: N/A  
**Your Involvement**: N/A

---

## Executive Summary

This plan migrates TERP from DigitalOcean to Railway with:
- ✅ **Zero downtime** (parallel deployment)
- ✅ **Full rollback** capability at every step
- ✅ **Automated execution** (AI-driven)
- ✅ **Comprehensive testing** before cutover
- ✅ **All documentation updated** automatically

---

## Migration Strategy: Blue-Green Deployment

```
Phase 1: Setup Railway (parallel to DO)
Phase 2: Deploy & Test on Railway
Phase 3: Migrate Database
Phase 4: DNS Cutover (instant switch)
Phase 5: Monitor & Verify
Phase 6: Decommission DO (after 7 days)
```

**Key Principle**: DO stays live until Railway is 100% verified.

---

## Pre-Migration Checklist

### Information Gathering (AI will do this)

- [ ] Export all DO environment variables
- [ ] Document current DO app ID
- [ ] Document current DO database credentials
- [ ] List all custom domains
- [ ] Identify all monitoring/alerting integrations
- [ ] Map all external service dependencies

### Backup Creation (AI will do this)

- [ ] Export DO database to SQL file
- [ ] Export DO app spec to JSON
- [ ] Save all environment variables to encrypted file
- [ ] Create git tag: `pre-railway-migration`
- [ ] Document current deployment URLs

---

## Phase 1: Railway Setup (30 minutes, AI-driven)

### 1.1: Install Railway CLI

**AI Action**:
```bash
# Check if Railway CLI installed
if ! command -v railway &> /dev/null; then
    npm install -g @railway/cli
fi

# Verify installation
railway --version
```

**Your Action**: None (automated)

### 1.2: Authenticate Railway

**AI Action**:
```bash
# Initiate login
railway login
```

**Your Action**: Click the browser link that opens, authorize Railway

**Rollback**: N/A (no changes made yet)

### 1.3: Create Railway Project

**AI Action**:
```bash
# Create project
railway init

# Project name: TERP
# Link to GitHub: Yes
# Repository: EvanTenenbaum/TERP
# Branch: main
```

**Your Action**: Confirm prompts (AI will guide you)

**Rollback**: `railway delete` (if needed)

### 1.4: Add MySQL Database

**AI Action**:
```bash
# Add MySQL service
railway add

# Select: MySQL
# Railway auto-provisions MySQL 8
```

**Verification**:
```bash
# Verify DATABASE_URL is set
railway variables | grep DATABASE_URL
```

**Your Action**: None

**Rollback**: Remove MySQL service in Railway dashboard

### 1.5: Configure Environment Variables

**AI Action**:
```bash
# Export DO env vars
doctl apps spec get 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --format json > /tmp/do-env-backup.json

# Extract and set in Railway
railway variables set NODE_ENV=production
railway variables set RATE_LIMIT_GET=1000
railway variables set ENABLE_RBAC=true
railway variables set ENABLE_QA_CRONS=true
railway variables set UPLOAD_DIR=/tmp/uploads

# Vite variables
railway variables set VITE_APP_TITLE=TERP
railway variables set VITE_APP_LOGO=/logo.png
railway variables set VITE_APP_ID=terp-app

# Clerk (AI will use keys from .do/app.yaml)
railway variables set VITE_CLERK_PUBLISHABLE_KEY=<from-do-config>
railway variables set CLERK_SECRET_KEY=<from-do-config>

# Auth secrets (AI will prompt for these)
railway variables set JWT_SECRET=<value>
railway variables set NEXTAUTH_SECRET=<value>
railway variables set NEXTAUTH_URL=<railway-url>

# Monitoring (optional)
railway variables set SENTRY_DSN=<value>
railway variables set CRON_SECRET=<value>
railway variables set PAPERTRAIL_ENDPOINT=<value>

# DATABASE_URL is auto-set by Railway MySQL
```

**Your Action**: Provide secret values when prompted (AI will ask for each)

**Rollback**: Variables only exist in Railway, DO unaffected

### 1.6: Create Railway Configuration

**AI Action**:
```bash
# Create railway.json
cat > railway.json << 'EOF'
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "healthcheckPath": "/health/live",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
EOF

git add railway.json
git commit -m "chore: add Railway configuration"
```

**Your Action**: None

**Rollback**: `git revert HEAD`

---

## Phase 2: Deploy to Railway (20 minutes, AI-driven)

### 2.1: Initial Deployment

**AI Action**:
```bash
# Deploy to Railway
railway up

# Watch deployment
railway logs --follow
```

**Verification**:
```bash
# Check deployment status
railway status

# Get Railway URL
railway domain
```

**Your Action**: None (AI monitors deployment)

**Rollback**: Railway deployment fails, DO still serving traffic

### 2.2: Health Check Verification

**AI Action**:
```bash
# Get Railway URL
RAILWAY_URL=$(railway domain)

# Test health endpoint
curl -f "https://$RAILWAY_URL/health/live"

# Expected: {"status":"ok"}
```

**Your Action**: None

**Rollback**: If health check fails, Railway deployment is isolated, DO unaffected

### 2.3: Smoke Testing

**AI Action**:
```bash
# Test critical endpoints
curl -f "https://$RAILWAY_URL/health"
curl -f "https://$RAILWAY_URL/api/trpc/health"

# Test authentication (if possible without users)
# Test database connection
```

**Your Action**: Manually test Railway URL in browser (AI will provide link)

**Rollback**: DO still serving traffic, can abandon Railway

---

## Phase 3: Database Migration (30 minutes, AI-driven)

### 3.1: Export DO Database

**AI Action**:
```bash
# Export from DigitalOcean
mysqldump -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
  -P 25060 \
  -u doadmin \
  -p \
  --ssl-mode=REQUIRED \
  --single-transaction \
  --quick \
  --lock-tables=false \
  defaultdb > /tmp/terp-db-backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
ls -lh /tmp/terp-db-backup-*.sql
```

**Your Action**: Provide DO database password when prompted

**Rollback**: N/A (read-only operation)

### 3.2: Import to Railway MySQL

**AI Action**:
```bash
# Import to Railway
railway connect mysql < /tmp/terp-db-backup-*.sql

# Verify import
railway connect mysql -e "SHOW TABLES;"
railway connect mysql -e "SELECT COUNT(*) FROM users;"
```

**Verification**:
```bash
# Compare record counts
echo "DO Database:"
mysql -h do-host -u doadmin -p -e "SELECT COUNT(*) FROM users;" defaultdb

echo "Railway Database:"
railway connect mysql -e "SELECT COUNT(*) FROM users;"
```

**Your Action**: None

**Rollback**: Railway database is isolated, DO database unchanged

### 3.3: Test Railway with Real Data

**AI Action**:
```bash
# Trigger Railway redeployment to use new database
railway up --detach

# Wait for deployment
sleep 60

# Test with real data
RAILWAY_URL=$(railway domain)
curl -f "https://$RAILWAY_URL/api/trpc/users.list"
```

**Your Action**: Test Railway app with real data (AI provides URL)

**Rollback**: DO still serving traffic, can revert

---

## Phase 4: DNS Cutover (5 minutes, AI-guided)

### 4.1: Generate Railway Domain

**AI Action**:
```bash
# Generate production domain
railway domain

# Output: your-app-xyz.up.railway.app
```

**Your Action**: None

### 4.2: Update DNS (Your Action Required)

**AI Guidance**:
```
Current: terp-app-b9s35.ondigitalocean.app → DO App
New:     terp-app-b9s35.ondigitalocean.app → Railway App

Option A: CNAME (if using custom domain)
-----------------------------------------
Update DNS record:
  Type: CNAME
  Name: terp-app-b9s35 (or @)
  Value: your-app-xyz.up.railway.app
  TTL: 300 (5 minutes)

Option B: Railway Custom Domain (recommended)
----------------------------------------------
1. In Railway dashboard: Settings → Domains
2. Add custom domain: terp-app-b9s35.ondigitalocean.app
3. Railway provides DNS instructions
4. Update DNS as instructed
```

**Your Action**: Update DNS records (AI provides exact values)

**Rollback**: Change DNS back to DO (5 minute TTL = fast rollback)

### 4.3: Verify DNS Propagation

**AI Action**:
```bash
# Check DNS propagation
while true; do
    RESOLVED=$(dig +short terp-app-b9s35.ondigitalocean.app)
    echo "DNS resolves to: $RESOLVED"
    
    if [[ $RESOLVED == *"railway"* ]]; then
        echo "✅ DNS cutover complete!"
        break
    fi
    
    sleep 30
done
```

**Your Action**: None

**Rollback**: Update DNS back to DO

---

## Phase 5: Monitor & Verify (30 minutes, AI-driven)

### 5.1: Traffic Monitoring

**AI Action**:
```bash
# Monitor Railway logs
railway logs --follow

# Watch for errors
railway logs --tail 500 | grep -i "error"

# Check response times
railway metrics
```

**Your Action**: None (AI monitors and alerts)

### 5.2: Functional Testing

**AI Action**:
```bash
# Test all critical paths
curl -f "https://terp-app-b9s35.ondigitalocean.app/health"
curl -f "https://terp-app-b9s35.ondigitalocean.app/api/trpc/health"

# Test authentication
# Test database queries
# Test file uploads
```

**Your Action**: Manually test critical features (AI provides checklist)

### 5.3: Performance Verification

**AI Action**:
```bash
# Benchmark response times
for i in {1..10}; do
    curl -w "@curl-format.txt" -o /dev/null -s "https://terp-app-b9s35.ondigitalocean.app/health"
done

# Compare to DO baseline
```

**Your Action**: None

### 5.4: Error Rate Monitoring

**AI Action**:
```bash
# Check Railway error rate
railway logs --tail 1000 | grep -c "ERROR"

# Check Sentry (if configured)
# Check application metrics
```

**Your Action**: None

---

## Phase 6: Update Documentation (15 minutes, AI-driven)

### 6.1: Update Steering Files

**AI Action**:
```bash
# Update .kiro/steering/04-infrastructure.md
# Replace all DO references with Railway

# Update .kiro/steering/terp-master-protocol.md
# Replace doctl commands with railway commands
```

**Files to Update**:
- `.kiro/steering/04-infrastructure.md`
- `.kiro/steering/terp-master-protocol.md`
- `.kiro/steering/02-workflows.md`
- `docs/DEV_WORKFLOW_QUICK_START.md`
- `docs/DEV_WORKFLOW_DIAGRAM.md`
- `EXTERNAL_AGENT_PROMPT.md`
- `README.md`

**Your Action**: Review and approve changes

### 6.2: Update Scripts

**AI Action**:
```bash
# Create new Railway scripts
scripts/railway-logs.sh
scripts/railway-status.sh
scripts/railway-deploy.sh
scripts/railway-rollback.sh

# Archive DO scripts
mkdir scripts/archived-do/
mv scripts/watch-deploy.sh scripts/archived-do/
mv scripts/terp-logs.sh scripts/archived-do/
mv scripts/check-deployment-status.sh scripts/archived-do/
mv scripts/fix-do-env-vars.sh scripts/archived-do/
```

**Your Action**: None

### 6.3: Update Agent Prompts

**AI Action**:
```bash
# Update all agent prompt files
# Replace DO commands with Railway commands
# Update URLs
# Update monitoring instructions
```

**Files to Update**:
- `agent-prompts/implementation-agent.md`
- `agent-prompts/pm-agent.md`
- `agent-prompts/qa-agent.md`
- `EXTERNAL_AGENT_PROMPT.md`
- `EXTERNAL_AGENT_QUICK_START.md`

**Your Action**: None

### 6.4: Create Migration Summary

**AI Action**:
```bash
# Create RAILWAY_MIGRATION_COMPLETE.md
# Document:
# - What was migrated
# - New URLs
# - New commands
# - Rollback procedures
# - Cost savings
```

**Your Action**: Review summary

---

## Phase 7: Decommission DO (After 7 days)

### 7.1: Monitoring Period

**AI Action**:
```bash
# Monitor Railway for 7 days
# Check daily:
# - Error rates
# - Response times
# - Uptime
# - Cost
```

**Your Action**: Approve decommissioning after 7 days

### 7.2: Stop DO App (Reversible)

**AI Action**:
```bash
# Scale DO app to 0 instances (doesn't delete)
doctl apps update 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --instance-count 0
```

**Your Action**: Approve

**Rollback**: Scale back to 1 instance

### 7.3: Delete DO App (After 14 days)

**AI Action**:
```bash
# Delete DO app
doctl apps delete 1fd40be5-b9af-4e71-ab1d-3af0864a7da4

# Delete DO database
doctl databases delete terp-mysql-db
```

**Your Action**: Final approval

**Rollback**: Not possible (but Railway is proven by this point)

---

## Rollback Procedures

### Rollback from Phase 1-2 (Railway Setup/Deploy)

**Action**: Do nothing, DO still serving traffic

**Steps**:
1. Delete Railway project: `railway delete`
2. Remove railway.json: `git revert <commit>`
3. Continue using DO

**Time**: 2 minutes

### Rollback from Phase 3 (Database Migration)

**Action**: Railway has data, but DO still serving traffic

**Steps**:
1. Do nothing (DO database unchanged)
2. Optionally delete Railway project
3. Continue using DO

**Time**: 2 minutes

### Rollback from Phase 4 (DNS Cutover)

**Action**: Traffic going to Railway, need to revert

**Steps**:
1. Update DNS back to DO
2. Wait for propagation (5 minutes with 300s TTL)
3. Verify traffic back on DO
4. Investigate Railway issues

**Time**: 10 minutes

### Rollback from Phase 5+ (Post-Cutover)

**Action**: Railway in production, issues discovered

**Steps**:
1. Update DNS back to DO
2. Scale up DO app if scaled down
3. Verify DO serving traffic
4. Fix Railway issues offline
5. Re-attempt cutover when ready

**Time**: 15 minutes

---

## Risk Mitigation

### Risk 1: Railway Deployment Fails

**Mitigation**:
- DO continues serving traffic
- Fix Railway issues offline
- No user impact

**Probability**: Low (Railway auto-detects Node.js/pnpm)

### Risk 2: Database Migration Fails

**Mitigation**:
- DO database unchanged
- Railway database isolated
- Can retry migration
- No user impact

**Probability**: Low (standard mysqldump/import)

### Risk 3: DNS Cutover Issues

**Mitigation**:
- 5-minute TTL for fast rollback
- DO app still running
- Can revert DNS immediately
- Brief user impact (5-10 min)

**Probability**: Very Low (standard DNS change)

### Risk 4: Performance Degradation

**Mitigation**:
- Monitor response times
- Compare to DO baseline
- Scale Railway resources if needed
- Rollback if severe

**Probability**: Low (Railway typically faster)

### Risk 5: Data Loss

**Mitigation**:
- DO database unchanged until Phase 7
- Railway database backed up daily
- Can restore from DO backup
- Zero data loss risk

**Probability**: Very Low (multiple backups)

---

## Success Criteria

### Phase 1-2: Setup & Deploy
- [ ] Railway project created
- [ ] MySQL database provisioned
- [ ] All env vars set
- [ ] App deployed successfully
- [ ] Health checks passing

### Phase 3: Database Migration
- [ ] DO database exported
- [ ] Railway database imported
- [ ] Record counts match
- [ ] App works with real data

### Phase 4: DNS Cutover
- [ ] DNS updated
- [ ] Traffic routing to Railway
- [ ] No errors in logs
- [ ] Response times acceptable

### Phase 5: Monitoring
- [ ] 24 hours of stable operation
- [ ] Error rate < 1%
- [ ] Response times < 500ms
- [ ] All features working

### Phase 6: Documentation
- [ ] All docs updated
- [ ] All scripts updated
- [ ] Agent prompts updated
- [ ] Migration summary created

### Phase 7: Decommission
- [ ] 7 days of stable Railway operation
- [ ] DO app scaled to 0
- [ ] 14 days of stable operation
- [ ] DO resources deleted

---

## Cost Comparison

### Current (DigitalOcean)
- App: $25/month
- Database: $25/month
- **Total: $50/month**

### After Migration (Railway)
- App: $8/month (512MB RAM, 0.5 vCPU)
- Database: $5/month (1GB storage)
- **Total: $13/month**

**Savings: $37/month ($444/year)**

---

## Timeline

| Phase | Duration | Your Time | AI Time |
|-------|----------|-----------|---------|
| 1. Setup | 30 min | 5 min | 25 min |
| 2. Deploy | 20 min | 2 min | 18 min |
| 3. Database | 30 min | 2 min | 28 min |
| 4. DNS | 5 min | 3 min | 2 min |
| 5. Monitor | 30 min | 2 min | 28 min |
| 6. Docs | 15 min | 1 min | 14 min |
| **Total** | **2h 10min** | **15 min** | **1h 55min** |

**Your involvement: 15 minutes of approvals**

---

## Execution Checklist

### Pre-Migration
- [ ] Read this entire plan
- [ ] Approve migration strategy
- [ ] Schedule migration window
- [ ] Notify team (if applicable)

### During Migration
- [ ] Approve Railway authentication
- [ ] Provide secret values when prompted
- [ ] Test Railway URL when ready
- [ ] Update DNS when instructed
- [ ] Approve documentation changes

### Post-Migration
- [ ] Monitor for 24 hours
- [ ] Test all critical features
- [ ] Approve 7-day monitoring
- [ ] Approve DO decommissioning

---

## Emergency Contacts

**Railway Support**:
- Discord: https://discord.gg/railway
- Email: team@railway.app
- Status: https://status.railway.app

**Rollback Decision Tree**:
```
Issue detected?
├─ Before DNS cutover? → Do nothing, fix Railway offline
├─ After DNS cutover, minor issue? → Monitor, fix if worsens
├─ After DNS cutover, major issue? → Rollback DNS immediately
└─ Data integrity issue? → Rollback DNS, investigate thoroughly
```

---

## Next Steps

**Ready to proceed?**

1. **Review this plan** thoroughly
2. **Ask any questions** you have
3. **Say "start migration"** when ready
4. **AI will execute** each phase
5. **You approve** at key checkpoints

**Estimated start-to-finish: 2-3 hours**

**Your active time: 15 minutes**

---

**This plan is designed for zero-risk migration. At any point, we can pause or rollback with no user impact.**

Ready when you are! 🚀
