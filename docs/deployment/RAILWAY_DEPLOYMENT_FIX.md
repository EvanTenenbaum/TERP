# Railway Deployment Fix Guide

> ⚠️ **DEPRECATED - HISTORICAL REFERENCE ONLY**
> 
> **TERP is NO LONGER deployed on Railway. We use DigitalOcean App Platform.**
> 
> **Current Platform**: DigitalOcean App Platform
> **Production URL**: https://terp-app-b9s35.ondigitalocean.app

---

**Date**: 2025-12-04  
**Issue**: (Historical) App returning 502 on Railway  
**Solution**: N/A - We migrated back to DigitalOcean

---

## Current Status

**Health Check**: Returning 502 (Bad Gateway)  
**Likely Cause**: App crashing during seeding due to schema drift  
**Fix**: Set `SKIP_SEEDING=true` in Railway

---

## Immediate Fix Steps

### Step 1: Set SKIP_SEEDING in Railway

**Via Railway Dashboard:**
1. Go to: https://railway.app/project/[your-project]
2. Click on your TERP service
3. Go to "Variables" tab
4. Click "New Variable"
5. Add:
   - **Key**: `SKIP_SEEDING`
   - **Value**: `true`
6. Click "Add"
7. Railway will automatically redeploy

**Via Railway CLI:**
```bash
railway variables set SKIP_SEEDING=true
```

### Step 2: Monitor Deployment

**Watch logs in real-time:**
```bash
railway logs --follow
```

**Or check status:**
```bash
railway status
```

### Step 3: Verify Bypass is Working

**Check for bypass messages:**
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

**Expected:** `200 OK` with JSON response

---

## Troubleshooting

### App Still Returns 502

**Check 1: Verify SKIP_SEEDING is Set**
```bash
railway variables | grep SKIP_SEEDING
# Should show: SKIP_SEEDING=true
```

**Check 2: Verify Deployment Completed**
- Railway Dashboard → Deployments → Latest
- Should show "Active" status
- Build should be "Succeeded"

**Check 3: Check Logs for Errors**
```bash
railway logs --tail 200 | grep -i "error"
```

**Look for:**
- ❌ "Unknown column 'vip_portal_enabled'"
- ❌ "Error during seeding"
- ❌ "Seeding failed"

**Should see:**
- ✅ "SKIP_SEEDING is set - skipping..."
- ✅ "Server running on http://0.0.0.0:8080/"

### Deployment Keeps Failing

**Check build logs:**
```bash
railway logs --build --tail 100
```

**Common issues:**
1. **Build fails**: Check for TypeScript errors
2. **Dependencies fail**: Check package.json
3. **Docker build fails**: Check Dockerfile

### SKIP_SEEDING Not Working

**Verify code is deployed:**
```bash
railway logs --tail 50 | grep "commit\|version"
```

Should show commit `fc748b65` or later (with SKIP_SEEDING code).

**Check variable is set correctly:**
- Value must be exactly `true` (not `True` or `TRUE`)
- Variable name must be exactly `SKIP_SEEDING`

---

## Expected Log Output (Success)

When working correctly:
```
[INFO] ⏭️  SKIP_SEEDING is set - skipping all default data seeding
[INFO] 💡 To enable seeding: remove SKIP_SEEDING or set it to false
[INFO] Checking for default data and admin user...
[INFO] Server running on http://0.0.0.0:8080/
[INFO] Health check available at http://localhost:8080/health
```

---

## Verification Checklist

- [ ] SKIP_SEEDING=true set in Railway
- [ ] Deployment completed successfully
- [ ] Logs show bypass messages
- [ ] Health endpoint returns 200
- [ ] Homepage loads (not 502)
- [ ] No seeding errors in logs
- [ ] App stays running (doesn't restart)

---

## If All Else Fails

### Option 1: Manual Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

### Option 2: Check Railway Status

```bash
railway status
railway logs --tail 500
```

### Option 3: Contact Support

If deployment continues to fail:
1. Check Railway status page: https://status.railway.app
2. Review Railway dashboard for service issues
3. Check database connection (if applicable)

---

**Status**: Monitoring deployment  
**Action**: Set SKIP_SEEDING=true if not already set  
**Next**: Verify health endpoint returns 200
