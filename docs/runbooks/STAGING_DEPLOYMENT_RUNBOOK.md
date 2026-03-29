# Staging Deployment Runbook

**Platform**: DigitalOcean App Platform
**URL**: https://terp-staging-yicld.ondigitalocean.app
**Trigger**: Auto-deploy on push to `main` (`main` is the current staging branch as of March 28, 2026)

---

## Pre-Deploy Checklist

- [ ] CI pipeline green (`pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`)
- [ ] Pending migrations reviewed (`drizzle-kit` — check `server/db/schema/` for uncommitted changes)
- [ ] No conflicting active sessions (check `docs/ACTIVE_SESSIONS.md`)
- [ ] Team notified in Slack

## Deploy Procedure

### Auto-Deploy (standard)

1. Merge PR to `main`
2. DigitalOcean detects the push to `main` and auto-deploys staging
3. Monitor the build in the DigitalOcean App Platform console

### Manual Deploy

1. Open DigitalOcean App Platform console
2. Select the TERP staging app
3. Click **Force Deploy**

### Skip Deploy

Add `[skip-staging-sync]` to the commit message for docs-only changes that should not redeploy staging.

## Post-Deploy Verification

1. **Health check**:

   ```bash
   curl -s https://terp-staging-yicld.ondigitalocean.app/api/health
   ```

   Expected: 200 OK with JSON response

2. **Run smoke tests**:

   ```bash
   pnpm playwright test --project=staging-critical
   ```

3. **Verify key flows manually** (if smoke tests are not yet covering them):
   - Login
   - Inventory list loads
   - Create order

## Rollback Procedure

### Option A: Revert commit (auto-redeploy)

```bash
git revert HEAD
git push origin main
```

DigitalOcean will auto-deploy the reverted state to staging.

### Option B: DigitalOcean console rollback

1. Open DigitalOcean App Platform console
2. Navigate to the TERP staging app
3. Click **Roll Back to Previous Deployment**

### Option C: Manual revert and push

```bash
git revert HEAD && git push origin main
```

## Emergency Contacts

| Role | Contact        |
| ---- | -------------- |
| Lead | Evan Tenenbaum |
