# Live Database Seeding Guide

## Overview

This guide explains how to seed your live DigitalOcean database with realistic test data for manual testing and development.

## Important Notes

⚠️ **Your live URL is currently a staging/testing environment** (not production with real customers)

✅ **Safe to seed with test data** for manual testing and feature exploration

🔄 **One-time operation** - seed once, then interact with the data normally

## How to Seed the Live Database

### Quick Start

```bash
# Seed with full realistic data (recommended)
pnpm seed:live

# Or specify a scenario
pnpm seed:live full    # 60 clients, 4,400 orders (~2min)
pnpm seed:live light   # 10 clients, 50 orders (~30s)
pnpm seed:live edge    # 20 whale clients, 80% overdue AR (~45s)
pnpm seed:live chaos   # 30 clients with anomalies (~60s)
```

### What Happens

1. **5-second countdown** - Press Ctrl+C to cancel if needed
2. **Drops all existing tables** - Clears current data
3. **Runs migrations** - Recreates schema from `drizzle/schema.ts`
4. **Seeds realistic data** - Populates with the chosen scenario
5. **Complete** - Your live URL now has realistic test data

### After Seeding

✅ Browse your live URL and explore the realistic data

✅ Add new clients, orders, invoices, etc. manually

✅ Test features with realistic data patterns

✅ Data persists - no need to re-seed unless you want fresh data

### When to Re-Seed

🔄 **When you want to reset to fresh test data**
- Run `pnpm seed:live` again
- All manual changes will be lost
- Fresh scenario data will be loaded

🔄 **When the schema changes significantly**
- After major database migrations
- When you need to test new fields/tables

## Scenarios Explained

| Scenario | Clients | Orders | Seed Time | Best For |
|:---------|:--------|:-------|:----------|:---------|
| **full** | 60 | 4,400 | ~2min | General testing, realistic scale |
| **light** | 10 | 50 | ~30s | Quick testing, focused scenarios |
| **edge** | 20 whales | 2,000 | ~45s | Stress testing, AR aging, whale clients |
| **chaos** | 30 | 1,500 | ~60s | Anomaly testing, edge cases |

## Database Credentials

The script automatically uses the DigitalOcean database credentials from The Bible:

- **Host**: `terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com`
- **Port**: `25060`
- **User**: `doadmin`
- **Database**: `defaultdb`
- **SSL**: Required

## Safety Features

✅ **5-second countdown** - Time to cancel before destructive operation

✅ **Clear warnings** - Shows exactly what will happen

✅ **Error handling** - Detailed error messages if something fails

✅ **No production risk** - Only affects your staging/testing environment

## Troubleshooting

### "Connection refused" or "Access denied"

- Check that your IP is whitelisted in DigitalOcean database settings
- Verify the credentials in The Bible are current

### "Schema push failed"

- Ensure `drizzle/schema.ts` is up to date
- Check that all migrations are committed

### "Seed script failed"

- Check the error message for specific details
- You may need to run the script again to complete the seed
- The database may be in an inconsistent state - re-running usually fixes it

## Example Workflow

```bash
# 1. Seed the live database with full data
pnpm seed:live full

# 2. Browse your live URL and test features
# (manually add/edit/delete data as needed)

# 3. When you want fresh data again
pnpm seed:live full

# 4. Repeat as needed
```

## Next Steps

After seeding the live database:

1. ✅ Browse your live URL
2. ✅ Test features with realistic data
3. ✅ Add/edit/delete data manually
4. ✅ Continue developing new features

The data will persist until you choose to re-seed.
