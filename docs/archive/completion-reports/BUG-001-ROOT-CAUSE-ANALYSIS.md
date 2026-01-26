# BUG-001 Root Cause Analysis

## Problem Summary

Orders page shows "Confirmed Orders (0)" despite database containing 26 orders with `is_draft = 0`.

## Investigation Timeline

### Initial Hypothesis (INCORRECT)

- **Thought:** Frontend filter logic issue with `isDraft` boolean
- **Action:** Added null checks and early returns to frontend
- **Result:** Did not fix the issue

### Second Hypothesis (INCORRECT)

- **Thought:** Drizzle ORM boolean comparison issue (MySQL TINYINT vs JavaScript boolean)
- **Action:** Changed `eq(orders.isDraft, false)` to `sql\`${orders.isDraft} = 0\``
- **Result:** Did not fix the issue - local queries worked fine

### Third Hypothesis (INCORRECT)

- **Thought:** Schema mismatch between Drizzle and database
- **Action:** Verified all columns exist and match
- **Result:** Schema is correct, not the issue

### Fourth Hypothesis (INCORRECT)

- **Thought:** Cookie `sameSite` setting preventing authentication
- **Action:** Changed `sameSite: "lax"` to `sameSite: "none"` in login endpoint
- **Result:** Did not fix the issue

### ROOT CAUSE (CONFIRMED)

**The production app does not have access to the `DATABASE_URL` environment variable.**

## Evidence

### From Runtime Logs

```
[Simple Auth] Cookies: {}
[Simple Auth] Token: not found
[Simple Auth] Authentication failed
```

The cookies object is EMPTY, meaning authentication is failing because the app can't connect to the database to verify the session.

### From Debug Page

- **Has DATABASE_URL:** No
- **Host:** (empty)
- **Database:** (empty)

### From Environment Variables Check

- **Database component** (`terp-production`): HAS `DATABASE_URL` set
- **App-level environment variables**: Does NOT have `DATABASE_URL`

## Why This Happens

According to DigitalOcean documentation:

> "The full connection string for your database is also be available as a runtime environment variable named DATABASE_URL"

When you use "Create/Attach Database" in App Platform, it should automatically inject `DATABASE_URL` into the app's runtime environment.

**However, this is NOT happening for the TERP app.**

Possible reasons:

1. Database was created but not properly attached to the app component
2. The attachment was done incorrectly
3. There's a bug in DigitalOcean's platform

## Why Everything Else Works

- **Metrics work:** They use a different query that doesn't require full data retrieval
- **Database connection succeeds:** The migrations run successfully at startup
- **Local development works:** Local `.env` file has `DATABASE_URL` set

## The Fix

**Option 1 (Recommended):** Verify database is properly attached

1. Go to terp-app Settings tab in DigitalOcean
2. Check if database component is listed
3. If not, use "Create/Attach Database" to properly attach it

**Option 2 (Workaround):** Manually add environment variable

1. Add `DATABASE_URL` to app-level environment variables
2. Use value: `${terp-production.DATABASE_URL}` (component reference)
3. Or use full connection string from database component

## Related Issues

- **BUG-001:** Orders page shows zero results
- **Authentication failures:** All tRPC queries return 401 Unauthorized
- **Empty cookies:** Session cookies not being sent/received

## Files Modified (During Investigation)

1. `client/src/pages/Orders.tsx` - Added filter logic (unnecessary)
2. `server/ordersDb.ts` - Changed boolean comparison (unnecessary)
3. `server/_core/simpleAuth.ts` - Changed `sameSite` to "none" (good practice but didn't fix this issue)
4. `server/routers/orders.ts` - Added debug endpoints
5. `client/src/pages/OrdersDebug.tsx` - Created debug page

## Lessons Learned

1. **Check environment variables FIRST** when production behaves differently than local
2. **Use debug endpoints** to expose runtime configuration
3. **Read platform documentation carefully** - DigitalOcean's database attachment should be automatic
4. **Don't assume the obvious** - The database connection string should have been automatically injected

## Next Steps

1. Verify database attachment in DigitalOcean control panel
2. If not attached, properly attach it using "Create/Attach Database"
3. If attached but not working, manually add `DATABASE_URL` as workaround
4. Test after deployment to confirm fix works
5. Clean up unnecessary debug code
