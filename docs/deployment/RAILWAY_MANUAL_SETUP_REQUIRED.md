# Railway Manual Setup Required

> ⚠️ **DEPRECATED - HISTORICAL REFERENCE ONLY**
> 
> **TERP is NO LONGER deployed on Railway. We use DigitalOcean App Platform.**
> 
> **Current Platform**: DigitalOcean App Platform
> **Production URL**: https://terp-app-b9s35.ondigitalocean.app

---

**Date**: 2025-12-06  
**Issue**: (Historical) Railway CLI authentication issues  
**Solution**: N/A - We migrated back to DigitalOcean

---

## ⚠️ ACTION REQUIRED: Manual Setup

Railway CLI requires browser-based authentication which cannot be automated in this environment. You must set `SKIP_SEEDING=true` manually via the Railway Dashboard.

---

## 📋 Step-by-Step Instructions

### Step 1: Access Railway Dashboard

1. Go to: https://railway.app
2. Log in to your account
3. Navigate to your TERP project

### Step 2: Set SKIP_SEEDING Variable

1. Click on your **TERP service** (the app service, not the database)
2. Click on the **"Variables"** tab
3. Click **"New Variable"** button
4. Enter:
   - **Key**: `SKIP_SEEDING`
   - **Value**: `true`
5. Click **"Add"** or **"Save"**

### Step 3: Wait for Redeploy

- Railway will automatically detect the new variable
- A new deployment will be triggered automatically
- Wait 2-4 minutes for deployment to complete

### Step 4: Verify

After deployment completes, verify with:

```bash
# Check health endpoint
curl https://terp-app-production.up.railway.app/health

# Should return 200 with JSON response
```

---

## 🔍 Current Status

**Health Endpoint**: Intermittent (200/502/error)  
**Frontend**: 502 (Bad Gateway)  
**Likely Cause**: SKIP_SEEDING not set, app cycling between start/crash

**Observations:**
- Health endpoint briefly returned 200 ✅
- Then returned to 502/error ⚠️
- App appears to be restarting repeatedly
- This suggests seeding is still attempting and failing

---

## ✅ After Setting SKIP_SEEDING

Once you set `SKIP_SEEDING=true` in Railway:

1. **Wait for deployment** (2-4 minutes)
2. **Check logs** - Should see:
   ```
   ⏭️  SKIP_SEEDING is set - skipping all default data seeding
   💡 To enable seeding: remove SKIP_SEEDING or set it to false
   ```
3. **Verify health endpoint** - Should consistently return 200
4. **Test frontend** - Should return 200 with HTML content

---

## 🎯 Expected Results

**When SKIP_SEEDING is set correctly:**

- ✅ Health endpoint consistently returns 200
- ✅ Frontend returns 200 with HTML
- ✅ Logs show bypass messages
- ✅ App stays running (no crashes)
- ✅ No seeding errors

**Current (SKIP_SEEDING not set):**

- ⚠️ Health endpoint intermittent
- ⚠️ Frontend returns 502
- ⚠️ App cycling (start/crash)
- ⚠️ Seeding likely failing

---

## 📝 Verification Commands

After setting SKIP_SEEDING, run:

```bash
# Monitor deployment
./scripts/monitor-railway-deploy.sh

# Check health
curl https://terp-app-production.up.railway.app/health

# Test frontend
curl -I https://terp-app-production.up.railway.app/

# Check logs (if Railway CLI is available)
railway logs --tail 100 | grep -i "skip"
```

---

**Status**: Awaiting manual SKIP_SEEDING setup  
**Action**: Set `SKIP_SEEDING=true` in Railway Dashboard  
**Next**: Verify deployment after variable is set
