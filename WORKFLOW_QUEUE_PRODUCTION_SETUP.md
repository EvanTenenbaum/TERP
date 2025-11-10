# Workflow Queue Production Setup Guide

## 🚨 Important: Run This Script on Production

The workflow queue system requires database tables and seed data to function. This script safely sets up everything needed in your production database.

## 📋 What This Script Does

The `setup-workflow-queue-production.ts` script will:

1. ✅ Create `workflow_statuses` table (if not exists)
2. ✅ Create `batch_status_history` table (if not exists)  
3. ✅ Add `statusId` column to `batches` table (if not exists)
4. ✅ Seed 6 default workflow statuses
5. ✅ Migrate all existing batches to workflow statuses
6. ✅ Verify the migration and show distribution

**Safe to run multiple times** - The script checks if each step is already complete and skips it if so.

## 🚀 How to Run on Railway

### Option 1: Via Railway CLI (Recommended)

```bash
# Install Railway CLI if you haven't
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run the setup script
railway run pnpm tsx server/scripts/setup-workflow-queue-production.ts
```

### Option 2: Via Railway Dashboard

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Settings" tab
4. Scroll to "Custom Start Command"
5. Temporarily change it to:
   ```
   pnpm tsx server/scripts/setup-workflow-queue-production.ts && node dist/index.js
   ```
6. Deploy the change
7. Watch the logs to see the setup complete
8. Change the start command back to `node dist/index.js`

### Option 3: Via One-Time Deployment

1. Add this to your `package.json` scripts:
   ```json
   "setup:workflow": "tsx server/scripts/setup-workflow-queue-production.ts"
   ```
2. In Railway dashboard, go to "Deployments"
3. Click "Deploy" → "Run Command"
4. Enter: `pnpm setup:workflow`

## 📊 Expected Output

You should see output like this:

```
🚀 Starting Workflow Queue Production Setup...

📋 Step 1: Creating workflow_statuses table...
✅ workflow_statuses table ready

📋 Step 2: Creating batch_status_history table...
✅ batch_status_history table ready

📋 Step 3: Adding statusId column to batches table...
✅ statusId column added to batches table

📋 Step 4: Seeding default workflow statuses...
  ✓ Intake Queue
  ✓ Quality Check
  ✓ Lab Testing
  ✓ Packaging
  ✓ Ready for Sale
  ✓ On Hold
✅ Default workflow statuses seeded

📋 Step 5: Migrating existing batches to workflow statuses...
  Found 176 batches to migrate
✅ Batches migrated to workflow statuses

📋 Step 6: Verifying migration...

📊 Workflow Queue Distribution:
────────────────────────────────────────────────────────
Intake Queue         │    0 batches │ Avg:    0 units
Quality Check        │   44 batches │ Avg:  776 units
Lab Testing          │   61 batches │ Avg:  581 units
Packaging            │   28 batches │ Avg:  219 units
Ready for Sale       │   37 batches │ Avg:    0 units
On Hold              │    6 batches │ Avg:  723 units
────────────────────────────────────────────────────────
TOTAL                │  176 batches
────────────────────────────────────────────────────────

✅ Workflow Queue Setup Complete!

🎉 The workflow queue system is now ready to use!
   Navigate to /workflow-queue to see your batches
```

## 🔍 Troubleshooting

### Error: "Table already exists"

This is normal if you've run the script before. The script will skip creating tables that already exist.

### Error: "Duplicate column name 'statusId'"

This means the statusId column already exists. The script will skip adding it.

### Error: "Cannot add foreign key constraint"

This usually means the referenced table doesn't exist. Make sure your database has the `batches`, `users`, and `workflow_statuses` tables.

### No Data Showing in Workflow Queue

1. Check that the script completed successfully (look for "Setup Complete" message)
2. Verify the tables exist:
   ```sql
   SHOW TABLES LIKE 'workflow%';
   ```
3. Check batch count:
   ```sql
   SELECT COUNT(*) FROM batches WHERE statusId IS NOT NULL;
   ```
4. Clear your browser cache and hard refresh (Ctrl+Shift+R)

## 🎯 After Setup

Once the script completes successfully:

1. ✅ Navigate to `/workflow-queue` in your app
2. ✅ You should see all batches distributed across workflow statuses
3. ✅ Dashboard widgets should show batch counts
4. ✅ You can drag and drop batches between statuses
5. ✅ History tab shows all status changes

## 🔒 RBAC Permissions

The workflow queue respects these permissions:

- `workflow:read` - View workflow queue and history
- `workflow:update` - Move batches between statuses
- `workflow:manage` - Create, edit, delete workflow statuses

Make sure your users have the appropriate permissions assigned.

## 📞 Support

If you encounter any issues:

1. Check the Railway logs for error messages
2. Verify your DATABASE_URL environment variable is set
3. Ensure your database user has CREATE and ALTER permissions
4. Try running the script again (it's safe to run multiple times)

## 🎉 Success Criteria

You'll know the setup was successful when:

- ✅ Script completes without errors
- ✅ Distribution table shows your batches
- ✅ `/workflow-queue` page loads with data
- ✅ Dashboard widgets show batch counts
- ✅ You can drag and drop batches

---

**Last Updated:** November 9, 2024  
**Version:** 1.0  
**Status:** Production Ready ✅
