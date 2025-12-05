# SKIP_SEEDING Deployment Verification

**Date**: 2025-12-04  
**Commit**: fc748b65  
**Status**: Deployed to main, awaiting Railway deployment

---

## ✅ Deployment Steps Completed

1. ✅ Code merged to main branch
2. ✅ Pushed to origin/main
3. ✅ Railway will auto-deploy (triggered by push)

---

## 🔧 Required: Set SKIP_SEEDING in Railway

**Railway CLI is not available in this environment.** You need to set the environment variable manually.

### Option 1: Railway Dashboard (Recommended)

1. Go to: https://railway.app/project/[your-project-id]
2. Click on your service (TERP app)
3. Go to "Variables" tab
4. Click "New Variable"
5. Add:
   - **Key**: `SKIP_SEEDING`
   - **Value**: `true`
6. Click "Add"
7. Railway will automatically redeploy

### Option 2: Railway CLI (If Available)

```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Set variable
railway variables set SKIP_SEEDING=true

# This will trigger automatic redeploy
```

---

## ✅ Verification Steps

### Step 1: Wait for Deployment

Railway typically takes 2-4 minutes to deploy after push.

**Check deployment status:**
- Railway Dashboard → Deployments → Latest deployment
- Should show "Building" → "Deploying" → "Active"

### Step 2: Check Logs for Bypass Messages

**Via Railway Dashboard:**
1. Go to your service
2. Click "Logs" tab
3. Look for:
   ```
   ⏭️  SKIP_SEEDING is set - skipping all default data seeding
   💡 To enable seeding: remove SKIP_SEEDING or set it to false
   ```

**Via Railway CLI (if available):**
```bash
railway logs --tail 100 | grep -i "skip"
```

### Step 3: Test Health Endpoint

```bash
curl https://terp-app-production.up.railway.app/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-04T...",
  "database": "connected"
}
```

### Step 4: Test Homepage

```bash
curl https://terp-app-production.up.railway.app/
```

**Expected:** HTML content (not 502 error)

### Step 5: Verify No Seeding Errors

**Check logs for errors:**
```bash
railway logs --tail 200 | grep -i "error"
```

**Should NOT see:**
- ❌ "Unknown column 'vip_portal_enabled'"
- ❌ "Error during seeding"
- ❌ "Seeding failed"

**Should see:**
- ✅ "SKIP_SEEDING is set - skipping..."
- ✅ "Server running on http://0.0.0.0:8080/"
- ✅ "Health check available"

---

## 📋 Verification Checklist

- [ ] Code pushed to main (✅ Done)
- [ ] Railway deployment triggered (✅ Automatic)
- [ ] SKIP_SEEDING=true set in Railway (⚠️ **REQUIRED - Manual Step**)
- [ ] Deployment completed successfully
- [ ] Logs show bypass messages
- [ ] Health endpoint returns 200
- [ ] App homepage loads (not 502)
- [ ] No seeding errors in logs

---

## 🚨 If App Still Crashes

### Check 1: Verify SKIP_SEEDING is Set

**Railway Dashboard:**
- Variables tab → Should show `SKIP_SEEDING=true`

**Railway CLI:**
```bash
railway variables | grep SKIP_SEEDING
```

### Check 2: Verify Code is Deployed

**Check latest commit:**
```bash
railway logs --tail 50 | grep "commit\|version"
```

Should show commit `fc748b65` or later.

### Check 3: Check Deployment Logs

**Railway Dashboard:**
- Deployments → Latest → Build Logs
- Should show successful build

**Railway CLI:**
```bash
railway logs --build --tail 100
```

### Check 4: Verify Variable is Set Before Deployment

**Important:** Set `SKIP_SEEDING=true` **before** the deployment completes, or trigger a new deployment after setting it.

---

## 📊 Expected Log Output

When SKIP_SEEDING is working correctly, you should see:

```
[INFO] ⏭️  SKIP_SEEDING is set - skipping all default data seeding
[INFO] 💡 To enable seeding: remove SKIP_SEEDING or set it to false
[INFO] Checking for default data and admin user...
[INFO] Server running on http://0.0.0.0:8080/
[INFO] Health check available at http://localhost:8080/health
```

**NOT:**
```
[ERRO] ❌ Error during seeding:
[ERRO] Unknown column 'vip_portal_enabled' in 'field list'
```

---

## 🎯 Success Criteria

✅ **Deployment successful when:**
- Railway deployment completes without errors
- Logs show "SKIP_SEEDING is set" messages
- Health endpoint returns 200
- App homepage loads successfully
- No seeding-related crashes
- App stays running (doesn't restart)

---

## 📝 Next Steps

1. **Set SKIP_SEEDING=true in Railway** (manual step required)
2. **Wait for deployment** (2-4 minutes)
3. **Verify logs** show bypass messages
4. **Test health endpoint** returns 200
5. **Monitor for 24 hours** to ensure stability
6. **Fix schema drift** (separate task - ST-020)

---

## 🔄 Rollback Plan

If something goes wrong:

```bash
# Remove SKIP_SEEDING variable
railway variables delete SKIP_SEEDING

# Or set to false
railway variables set SKIP_SEEDING=false

# This will trigger redeploy
```

---

**Status**: Code deployed, awaiting SKIP_SEEDING variable setup  
**Action Required**: Set `SKIP_SEEDING=true` in Railway dashboard  
**Risk**: Low (bypass only, no core logic changes)
