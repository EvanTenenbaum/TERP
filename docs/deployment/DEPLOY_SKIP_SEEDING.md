# Deploy SKIP_SEEDING Bypass - Deployment Guide

**Date**: 2025-12-04  
**Purpose**: Deploy SKIP_SEEDING bypass to Railway and verify it works

---

## Deployment Steps

### Step 1: Code is Already Merged to Main

The SKIP_SEEDING bypass implementation has been merged to main branch.

**Commits:**

- `1740c22f` - feat: Add SKIP_SEEDING env var to bypass seeding
- `61e94a12` - chore: register session for SEEDING-BYPASS implementation
- `0b28fde5` - chore: archive SEEDING-BYPASS session
- `0cb8cc4a` - docs: add SEEDING-BYPASS completion report
- `f76a28c4` - docs: add ST-020 hardening task and mark SKIP_SEEDING as temporary fix
- `fc748b65` - test: add SKIP_SEEDING test report and verification script

### Step 2: Set SKIP_SEEDING in Railway

**Via Railway CLI:**

```bash
railway variables set SKIP_SEEDING=true
```

**Via Railway Dashboard:**

1. Go to: https://railway.app/project/[your-project]
2. Click "Variables" tab
3. Add new variable:
   - **Key**: `SKIP_SEEDING`
   - **Value**: `true`
4. Click "Add"

**Note on Health Checks:**
The health check timeout has been increased to 600 seconds in `railway.json` to allow auto-migrations to complete before the health check times out. Railway uses the `/health/ready` endpoint to verify database connectivity. See the [main deployment README](./README.md#health-check-configuration) for details on health check configuration.

### Step 3: Verify Deployment

**Check Railway Status:**

```bash
railway status
```

**View Logs:**

```bash
railway logs --tail 100
```

**Look for bypass messages:**

```bash
railway logs --tail 100 | grep -i "skip"
```

**Expected output:**

```
⏭️  SKIP_SEEDING is set - skipping all default data seeding
💡 To enable seeding: remove SKIP_SEEDING or set it to false
```

### Step 4: Test Health Endpoint

```bash
curl https://terp-app-production.up.railway.app/health
```

**Expected response:**

```json
{
  "status": "healthy",
  "timestamp": "...",
  "database": "connected"
}
```

### Step 5: Verify App Starts

**Check that app is running:**

```bash
curl https://terp-app-production.up.railway.app/
```

**Should return:** HTML page (not 502 error)

---

## Verification Checklist

- [ ] Code merged to main
- [ ] Railway deployment triggered (automatic on push)
- [ ] SKIP_SEEDING=true set in Railway
- [ ] Health check endpoint is `/health/ready` (verify in `railway.json`)
- [ ] Health check timeout is 600 seconds (verify in `railway.json`)
- [ ] Deployment completed successfully
- [ ] Logs show bypass messages
- [ ] `/health/ready` endpoint returns 200 (not 503)
- [ ] App homepage loads (not 502)
- [ ] No seeding errors in logs

---

## Troubleshooting

### App Still Crashes

1. **Verify SKIP_SEEDING is set:**

   ```bash
   railway variables | grep SKIP_SEEDING
   ```

2. **Check deployment logs:**

   ```bash
   railway logs --build --tail 100
   ```

3. **Verify code is deployed:**
   ```bash
   railway logs --tail 50 | grep "SKIP_SEEDING"
   ```

### Seeding Still Runs

1. **Check variable value:**

   ```bash
   railway variables | grep SKIP_SEEDING
   # Should show: SKIP_SEEDING=true
   ```

2. **Verify variable is set before deployment:**
   - Set variable first
   - Then trigger deployment
   - Or wait for auto-redeploy

### Health Check Fails

1. **Check if app is starting:**

   ```bash
   railway logs --tail 200
   ```

2. **Look for startup errors:**

   ```bash
   railway logs --tail 200 | grep -i "error"
   ```

3. **Check database connection:**
   ```bash
   railway logs --tail 200 | grep -i "database"
   ```

---

## Success Criteria

✅ **Deployment successful when:**

- Railway deployment completes without errors
- Logs show "SKIP_SEEDING is set" messages
- Health endpoint returns 200
- App homepage loads successfully
- No seeding-related crashes

---

## Next Steps After Deployment

1. **Monitor for 24 hours** to ensure stability
2. **Fix schema drift** (separate task)
3. **Re-enable seeding** once schema is fixed
4. **Complete ST-020** to harden the bypass

---

## Rollback Plan

If deployment causes issues:

```bash
# Remove SKIP_SEEDING variable
railway variables delete SKIP_SEEDING

# Or set to false
railway variables set SKIP_SEEDING=false

# Redeploy
railway up
```

---

**Status**: Ready for deployment  
**Risk**: Low (bypass only, no code changes to core logic)  
**Impact**: App can start even with schema drift
