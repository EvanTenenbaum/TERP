# SKIP_SEEDING Setup - Where to Set It

**Answer**: Set it in the **APP SERVICE variables**, NOT the database variables.

---

## ✅ Correct: App Service Variables

**Set `SKIP_SEEDING=true` in your TERP application service variables.**

### Step-by-Step:

1. **Go to Railway Dashboard**: https://railway.app
2. **Click on your TERP project**
3. **Click on the APP SERVICE** (the service that runs your Node.js/Express app)
   - This is usually named something like "TERP", "web", "api", or "app"
   - **NOT** the MySQL/database service
4. **Click on the "Variables" tab**
5. **Click "New Variable"**
6. **Add:**
   - **Key**: `SKIP_SEEDING`
   - **Value**: `true`
7. **Click "Add" or "Save"**

---

## ❌ Incorrect: Database Variables

**Do NOT set it in the database service variables.**

- Database variables are for database connection settings
- SKIP_SEEDING is an application environment variable
- It needs to be available to your Node.js application at runtime

---

## 🔍 How to Identify the Right Service

In Railway, you typically have:

1. **App Service** (Node.js/Express app)
   - This is where you set `SKIP_SEEDING`
   - Usually shows "Node.js" or "Docker" as the runtime
   - This is the service that runs your application code

2. **Database Service** (MySQL)
   - This is where database variables go
   - Usually shows "MySQL" as the service type
   - **Do NOT set SKIP_SEEDING here**

---

## ✅ Verification

After setting SKIP_SEEDING in the app service:

1. **Railway will automatically redeploy** (2-4 minutes)
2. **Check logs** - Should see:
   ```
   ⏭️  SKIP_SEEDING is set - skipping all default data seeding
   ```
3. **Test health endpoint**:
   ```bash
   curl https://terp-app-production.up.railway.app/health
   ```
   Should return 200 OK

---

## 📝 Summary

- ✅ **Set in**: App Service → Variables tab
- ❌ **NOT in**: Database Service → Variables tab
- ✅ **Variable**: `SKIP_SEEDING=true`
- ✅ **Result**: App will bypass seeding and start successfully

---

**Quick Answer**: App Service Variables (the service running your Node.js code)
