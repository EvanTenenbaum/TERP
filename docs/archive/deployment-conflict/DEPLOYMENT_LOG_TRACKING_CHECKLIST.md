# Deployment Log Tracking Checklist

**Version:** 1.0  
**Last Updated:** November 30, 2025  
**Purpose:** Mandatory checklist for all deployments to ensure success verification

---

## 🚨 CRITICAL: This is MANDATORY for ALL Deployments

**Every deployment MUST be verified via logs before reporting task completion.**

If you push code and don't track the deployment logs, **you have failed the task.**

---

## Pre-Deployment Checklist

Before pushing code to trigger deployment:

- [ ] All tests passing locally
- [ ] Code reviewed (if applicable)
- [ ] Environment variables verified in `.do/app.yaml`
- [ ] Database migrations tested (if applicable)
- [ ] Breaking changes documented

---

## During Deployment: Log Monitoring

### Step 1: Monitor Build Logs

**Command:**

```bash
./scripts/terp-logs.sh build --follow
```

**What to Watch For:**

- ✅ Dependencies install successfully
- ✅ TypeScript compilation completes without errors
- ✅ Build artifacts created
- ❌ Any `ERROR` or `FATAL` messages
- ❌ Missing dependencies
- ❌ TypeScript compilation errors

**Expected Duration:** 2-4 minutes

**If Build Fails:**

1. Read the error message carefully
2. Check for missing dependencies: `pnpm install`
3. Check for TypeScript errors: `pnpm typecheck`
4. Fix the issue and push again

---

### Step 2: Monitor Deploy Logs

**Command:**

```bash
./scripts/terp-logs.sh deploy --follow
```

**What to Watch For:**

- ✅ Container starts successfully
- ✅ Application initialization completes
- ✅ Database connection established
- ✅ Server listening on port
- ❌ Container crashes or restarts
- ❌ Database connection failures
- ❌ Missing environment variables

**Expected Duration:** 1-2 minutes

**If Deploy Fails:**

1. Check environment variables in DigitalOcean
2. Verify database is accessible
3. Check for port conflicts
4. Review application startup logs

---

### Step 3: Verify Runtime Logs

**Command:**

```bash
./scripts/terp-logs.sh run 100
```

**What to Check:**

- ✅ No critical errors in recent logs
- ✅ Health checks passing
- ✅ API endpoints responding
- ❌ Repeated error messages
- ❌ Database query failures
- ❌ Authentication errors

**Check for Errors:**

```bash
./scripts/terp-logs.sh run 200 | grep -i "error"
```

**If Runtime Errors Found:**

1. Identify the error pattern
2. Check if it's related to your changes
3. Investigate with context:
   ```bash
   ./scripts/terp-logs.sh run 500 | grep -B 5 -A 5 "YOUR_ERROR"
   ```
4. Fix and create hotfix PR if critical

---

## Post-Deployment Verification

### Step 4: Test Deployed Feature

- [ ] Navigate to production URL: https://terp-app-b9s35.ondigitalocean.app
- [ ] Test the specific feature you deployed
- [ ] Verify no regressions in related features
- [ ] Check for console errors in browser (F12)
- [ ] Test on mobile if UI changes

### Step 5: Monitor for 5 Minutes

After deployment completes, monitor logs for 5 minutes:

```bash
./scripts/terp-logs.sh run --follow
```

**Watch for:**

- Unexpected errors
- Performance issues
- User-facing errors
- Database connection issues

### Step 6: Document Results

In your session file or completion report, document:

1. **Deployment Status:** Success / Failed / Partial
2. **Build Time:** X minutes
3. **Deploy Time:** X minutes
4. **Errors Found:** None / List of errors
5. **Resolution:** N/A / How errors were fixed
6. **Production Test:** Passed / Failed / Details

---

## Common Deployment Issues

### Issue: DATABASE_URL Not Found

**Symptoms:**

```
{"level":"error","msg":"DATABASE_URL environment variable is required"}
```

**Solution:**

1. Check DigitalOcean environment variables
2. Verify scope is `RUN_AND_BUILD_TIME`
3. Trigger new deployment if changed

**Reference:** See BUG-024 documentation

---

### Issue: Build Timeout

**Symptoms:**

- Build logs stop updating
- Deployment stuck in "BUILDING" phase

**Solution:**

1. Check for large dependencies
2. Verify build cache is working
3. Check DigitalOcean status page
4. Contact support if persistent

---

### Issue: Container Crashes on Startup

**Symptoms:**

```
{"level":"error","msg":"Application failed to start"}
```

**Solution:**

1. Check deploy logs for crash reason
2. Verify all environment variables set
3. Check database connectivity
4. Review recent code changes

---

### Issue: Silent Failures

**Symptoms:**

- Deployment shows "success"
- But feature doesn't work in production

**Solution:**

1. Check runtime logs for errors:
   ```bash
   ./scripts/terp-logs.sh run 500 | grep -i "error\|warn\|fail"
   ```
2. Test feature manually in production
3. Check browser console for client errors
4. Verify API endpoints with curl/Postman

---

## Emergency Procedures

### Deployment Failed - Hotfix Required

If deployment failed and production is broken:

1. **Immediate Actions:**

   ```bash
   # Check what's broken
   ./scripts/terp-logs.sh run 100 | grep -i "error"

   # Identify the issue
   ./scripts/terp-logs.sh run 500 | grep -B 10 -A 10 "CRITICAL_ERROR"
   ```

2. **Create Hotfix:**

   ```bash
   # Create hotfix branch
   git checkout main
   git pull
   git checkout -b hotfix/fix-critical-issue

   # Fix the issue
   # ... make changes ...

   # Commit and push
   git add .
   git commit -m "hotfix: fix critical deployment issue"
   git push origin hotfix/fix-critical-issue
   ```

3. **Create Hotfix PR:**
   - Title: `[HOTFIX] Fix critical deployment issue`
   - Description: What broke, how you fixed it
   - Merge immediately (hotfix bypasses test requirements)

4. **Monitor Hotfix Deployment:**
   - Follow this same checklist
   - Verify issue is resolved
   - Document in incident report

---

### Rollback Procedure

If hotfix isn't quick enough, rollback to previous deployment:

1. **Find Last Working Deployment:**

   ```bash
   doctl apps list-deployments 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 | head -5
   ```

2. **Identify Working Commit:**
   - Look for the last `ACTIVE` deployment before the broken one
   - Note the commit SHA

3. **Rollback:**

   ```bash
   git checkout main
   git revert <broken_commit_sha>
   git push origin main
   ```

4. **Monitor Rollback:**
   - Follow this checklist
   - Verify production is stable
   - Plan proper fix

---

## Deployment Log Examples

### ✅ Successful Build Log

```
web 2025-12-01T03:10:38.283406517Z ╭──────────── git repo clone ───────────╼
web 2025-12-01T03:10:38.386365729Z │  › fetching app source code
web 2025-12-01T03:10:38.519582647Z │ => Selecting branch "main"
web 2025-12-01T03:10:41.602182720Z │ => Checking out commit "cfec7f5d"
web 2025-12-01T03:10:42.006572674Z │
web 2025-12-01T03:11:15.234567890Z │ => Installing dependencies...
web 2025-12-01T03:11:45.123456789Z │ => Building application...
web 2025-12-01T03:12:30.987654321Z │ => Build complete!
```

### ✅ Successful Deploy Log

```
web 2025-12-01T03:16:29.564639625Z > terp-redesign@1.0.0 start:production /app
web 2025-12-01T03:16:29.564700833Z > NODE_ENV=production node dist/index.js
web 2025-12-01T03:16:34.712346721Z ✅ Using JWT_SECRET for authentication
web 2025-12-01T03:16:35.123456789Z ✅ Database connected successfully
web 2025-12-01T03:16:35.234567890Z ✅ Server listening on port 3000
```

### ❌ Failed Build Log

```
web 2025-12-01T03:10:38.283406517Z │ => Installing dependencies...
web 2025-12-01T03:11:15.234567890Z │ ERROR: Cannot find module '@types/node'
web 2025-12-01T03:11:15.345678901Z │ ERROR: TypeScript compilation failed
web 2025-12-01T03:11:15.456789012Z │ Build failed with exit code 1
```

### ❌ Failed Deploy Log

```
web 2025-12-01T03:16:29.564639625Z > NODE_ENV=production node dist/index.js
web 2025-12-01T03:16:34.712346721Z ERROR: DATABASE_URL environment variable is required
web 2025-12-01T03:16:34.823456789Z ERROR: Failed to connect to database
web 2025-12-01T03:16:34.934567890Z Application crashed with exit code 1
```

---

## Quick Reference Commands

```bash
# Setup (one-time)
cp .env.logging.example .env.logging
# Edit .env.logging with actual token

# Monitor deployment (run in separate terminals)
./scripts/terp-logs.sh build --follow   # Terminal 1
./scripts/terp-logs.sh deploy --follow  # Terminal 2
./scripts/terp-logs.sh run --follow     # Terminal 3

# Check for errors
./scripts/terp-logs.sh run 200 | grep -i "error"

# Investigate specific error
./scripts/terp-logs.sh run 500 | grep -B 5 -A 5 "DATABASE_URL"

# Save logs for analysis
./scripts/terp-logs.sh run 1000 > deployment-logs-$(date +%Y%m%d-%H%M%S).log

# Check deployment status
doctl apps list-deployments 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 | head -3
```

---

## Completion Criteria

Before reporting task completion, verify ALL of these:

- [ ] Build completed successfully (no errors in build logs)
- [ ] Deploy completed successfully (application started)
- [ ] No critical errors in runtime logs
- [ ] Feature tested in production and works
- [ ] No regressions in related features
- [ ] Monitored for 5 minutes post-deployment
- [ ] Results documented in session file

**If ANY of these are not met, the task is NOT complete.**

---

## Resources

- **Logging Guide:** `docs/LOGGING_ACCESS_GUIDE.md`
- **Log Script:** `scripts/terp-logs.sh`
- **Bug Documentation:** `docs/prompts/BUG-024.md` (DATABASE_URL example)
- **DigitalOcean Docs:** https://docs.digitalocean.com/products/app-platform/

---

**Remember:** Deployments without log verification are incomplete deployments.

**Last Updated:** November 30, 2025  
**Maintainer:** TERP DevOps Team
