# Needs & Matching Module - Deployment Instructions

## Overview

This document provides step-by-step instructions for deploying the Needs & Matching Intelligence Module to your TERP production environment.

**Database Type:** MySQL 8.0+  
**Migration File:** `migrations/001_needs_and_matching_module.sql`

---

## Prerequisites

Before starting deployment, ensure you have:

- [x] Access to your MySQL database (via MySQL Workbench, phpMyAdmin, command line, or Supabase SQL Editor)
- [x] Database credentials (host, port, username, password, database name)
- [x] Backup of your current database (recommended)
- [x] Latest code from GitHub repository (already pushed)

---

## Step-by-Step Deployment

### Step 1: Backup Your Database (Recommended)

**Why:** Always backup before running migrations in case you need to rollback.

**How:**

**Option A: Using MySQL Command Line**
```bash
mysqldump -h YOUR_HOST -u YOUR_USERNAME -p YOUR_DATABASE > backup_before_needs_module.sql
```

**Option B: Using phpMyAdmin**
1. Log into phpMyAdmin
2. Select your database
3. Click "Export" tab
4. Click "Go" to download backup

**Option C: Using Supabase**
1. Go to Supabase Dashboard
2. Navigate to Database → Backups
3. Create a new backup or note the latest automatic backup

---

### Step 2: Locate the Migration File

The SQL migration file is located at:
```
/migrations/001_needs_and_matching_module.sql
```

This file is in your GitHub repository at: `EvanTenenbaum/TERP`

**Download the file:**
- Option 1: Clone/pull the latest code from GitHub
- Option 2: Download directly from GitHub web interface
- Option 3: Copy from the file I've created (attached to this message)

---

### Step 3: Connect to Your MySQL Database

Choose the method that works best for your setup:

#### Option A: MySQL Command Line

```bash
# Connect to your database
mysql -h YOUR_HOST -P YOUR_PORT -u YOUR_USERNAME -p YOUR_DATABASE

# You'll be prompted for your password
```

#### Option B: MySQL Workbench (GUI)

1. Open MySQL Workbench
2. Click "Database" → "Connect to Database"
3. Enter your connection details:
   - Hostname: YOUR_HOST
   - Port: YOUR_PORT (usually 3306)
   - Username: YOUR_USERNAME
   - Password: YOUR_PASSWORD
4. Click "OK"
5. Select your database from the left sidebar

#### Option C: phpMyAdmin (Web Interface)

1. Navigate to your phpMyAdmin URL
2. Log in with your credentials
3. Select your TERP database from the left sidebar
4. Click the "SQL" tab at the top

#### Option D: Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to "SQL Editor" in the left sidebar
3. Click "New query"

---

### Step 4: Run the Migration

#### Using Command Line:

```bash
# Make sure you're in the TERP directory
cd /path/to/TERP

# Run the migration
mysql -h YOUR_HOST -P YOUR_PORT -u YOUR_USERNAME -p YOUR_DATABASE < migrations/001_needs_and_matching_module.sql
```

#### Using MySQL Workbench:

1. Click "File" → "Open SQL Script"
2. Navigate to `migrations/001_needs_and_matching_module.sql`
3. Click "Open"
4. Click the lightning bolt icon (⚡) to execute
5. Wait for "Action Output" to show success messages

#### Using phpMyAdmin:

1. Open the SQL file in a text editor
2. Copy the entire contents
3. Paste into the SQL tab in phpMyAdmin
4. Click "Go" button at the bottom
5. Check for success messages

#### Using Supabase SQL Editor:

1. Open the SQL file in a text editor
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click "Run" button
5. Check the results panel for success

---

### Step 5: Verify the Migration

After running the migration, verify that the tables were created successfully.

**Run this verification query:**

```sql
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('client_needs', 'vendor_supply', 'match_records')
ORDER BY TABLE_NAME;
```

**Expected Result:**
You should see 3 rows returned:
- `client_needs` (0 rows initially)
- `match_records` (0 rows initially)
- `vendor_supply` (0 rows initially)

**Check indexes were created:**

```sql
-- Check client_needs indexes
SHOW INDEX FROM client_needs;

-- Check vendor_supply indexes
SHOW INDEX FROM vendor_supply;

-- Check match_records indexes
SHOW INDEX FROM match_records;
```

**Expected Result:**
Each table should have multiple indexes (PRIMARY + 3-6 additional indexes).

---

### Step 6: Restart Your Application

After the database migration is complete, restart your TERP application to load the new code.

#### If using Vercel:

**Option A: Automatic Deployment**
- Vercel automatically deploys when you push to GitHub
- The latest code is already pushed, so it should deploy automatically
- Check your Vercel dashboard for deployment status

**Option B: Manual Trigger**
1. Go to Vercel Dashboard
2. Select your TERP project
3. Go to "Deployments" tab
4. Click "Redeploy" on the latest deployment

#### If using local development:

```bash
cd /path/to/TERP

# Stop the current server (Ctrl+C if running)

# Pull latest code
git pull origin main

# Install any new dependencies (shouldn't be needed, but safe)
pnpm install

# Start the server
pnpm dev
```

#### If using PM2 or other process manager:

```bash
pm2 restart terp
# or
pm2 restart all
```

---

### Step 7: Verify the Application

After restarting, verify that the new features are working:

#### Test 1: Check New Routes
1. Navigate to your TERP application
2. Go to `/needs` - Should show "Needs Management" page
3. Go to `/vendor-supply` - Should show "Vendor Supply" page

#### Test 2: Check Client Pages
1. Open any client profile page
2. Look for "Needs & History" tab (6th tab)
3. Click on it - Should show needs management interface

#### Test 3: Check Inventory Pages
1. Open any inventory batch detail
2. Scroll down to find "Client Interest" section
3. Should show "No clients currently need this product" (if no needs exist yet)

#### Test 4: Check Dashboard
1. Go to the main dashboard
2. Look for "Smart Opportunities" widget
3. Should show "No opportunities found" (if no needs exist yet)

---

### Step 8: Create Test Data (Optional)

To fully test the system, create a test client need:

1. Go to any client profile page
2. Click "Needs & History" tab
3. Click "Create Need" button
4. Fill in the form:
   - Strain: "Blue Dream" (or any strain)
   - Category: "Flower"
   - Subcategory: "Indoor"
   - Grade: "A"
   - Quantity Min: "100"
   - Price Max: "2500"
   - Priority: "HIGH"
5. Click "Create Need"
6. Click "Find Matches" to test the matching algorithm

---

## Troubleshooting

### Issue: "Table already exists" error

**Solution:** The tables might already exist. Run this query to check:
```sql
SHOW TABLES LIKE '%needs%';
```

If tables exist, you can either:
- Skip the migration (tables are already there)
- Drop and recreate (WARNING: loses data):
  ```sql
  DROP TABLE IF EXISTS match_records;
  DROP TABLE IF EXISTS vendor_supply;
  DROP TABLE IF EXISTS client_needs;
  ```
  Then run the migration again.

### Issue: "Access denied" or "Permission denied"

**Solution:** Your database user needs CREATE TABLE permissions. Contact your database administrator or use a user with sufficient privileges.

### Issue: New routes return 404

**Solution:** 
1. Verify the code was pulled from GitHub
2. Clear your browser cache
3. Restart the application server
4. Check Vercel deployment logs for errors

### Issue: TypeScript errors in console

**Solution:** This shouldn't happen (we have 0 errors), but if it does:
1. Run `pnpm check` to verify
2. Run `pnpm install` to ensure dependencies are correct
3. Restart the dev server

### Issue: "No matches found" when testing

**Solution:** This is expected if:
- No inventory batches match the need criteria
- No vendor supply items exist
- The matching algorithm requires at least 50% confidence

Try creating a need that matches your existing inventory:
- Use the same category/subcategory as an existing batch
- Use a realistic price range

---

## Rollback Instructions

If you need to rollback the migration (removes all tables and data):

```sql
-- WARNING: This deletes all data in these tables!
DROP TABLE IF EXISTS `match_records`;
DROP TABLE IF EXISTS `vendor_supply`;
DROP TABLE IF EXISTS `client_needs`;
```

Then restore from your backup:
```bash
mysql -h YOUR_HOST -P YOUR_PORT -u YOUR_USERNAME -p YOUR_DATABASE < backup_before_needs_module.sql
```

---

## Post-Deployment Checklist

- [ ] Database migration completed successfully
- [ ] 3 new tables created (client_needs, vendor_supply, match_records)
- [ ] Indexes verified on all tables
- [ ] Application restarted
- [ ] `/needs` route accessible
- [ ] `/vendor-supply` route accessible
- [ ] "Needs & History" tab visible on client pages
- [ ] "Client Interest" section visible on inventory pages
- [ ] "Smart Opportunities" widget visible on dashboard
- [ ] Test need created successfully
- [ ] Matching algorithm working (finds matches or shows "no matches")
- [ ] No console errors in browser
- [ ] No server errors in logs

---

## Support

If you encounter any issues during deployment:

1. Check the troubleshooting section above
2. Review the module documentation: `docs/NEEDS_AND_MATCHING_MODULE.md`
3. Check the implementation summary: `docs/NEEDS_MODULE_IMPLEMENTATION_SUMMARY.md`
4. Review the CHANGELOG: `CHANGELOG.md`

---

## Summary

**What you need to do:**

1. ✅ Backup your database
2. ✅ Run the SQL migration file (`migrations/001_needs_and_matching_module.sql`)
3. ✅ Verify tables were created
4. ✅ Restart your application (or wait for Vercel auto-deploy)
5. ✅ Test the new features

**Estimated time:** 10-15 minutes

**Risk level:** Low (non-destructive migration, only adds new tables)

---

**Ready to deploy?** Follow the steps above in order. Good luck! 🚀

