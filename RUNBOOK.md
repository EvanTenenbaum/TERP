# TERP Operational Runbook

This runbook provides step-by-step procedures for common operational tasks, deployments, and incident response.

---

## Table of Contents

1. [Deployment](#deployment)
2. [Rollback](#rollback)
3. [Database Migrations](#database-migrations)
4. [Feature Flags](#feature-flags)
5. [Incident Response](#incident-response)
6. [Monitoring](#monitoring)

---

## Deployment

### Automatic Deployment (Vercel)

**Production** (main branch):
1. Merge PR to `main` branch
2. Vercel automatically builds and deploys
3. Monitor deployment at Vercel dashboard
4. Verify production URL is responding

**Preview** (PR branches):
1. Open or update a PR
2. Vercel automatically creates preview deployment
3. Preview URL is posted as PR comment
4. Test changes on preview URL before merging

### Manual Deployment (if needed)

```bash
# Build locally
pnpm build

# Deploy to Vercel
vercel --prod
```

### Post-Deployment Checklist

- [ ] Production URL is accessible
- [ ] Health check endpoint responds: `GET /api/health`
- [ ] Database connection is working
- [ ] Sentry is receiving events (if configured)
- [ ] No errors in Vercel logs

---

## Rollback

### Quick Rollback (Vercel Alias)

Vercel maintains deployment history. To rollback:

1. **Via Vercel Dashboard**:
   - Go to Vercel project → Deployments
   - Find the last known good deployment
   - Click "..." → "Promote to Production"

2. **Via CLI**:
   ```bash
   # List recent deployments
   vercel ls
   
   # Promote a specific deployment
   vercel alias set <deployment-url> <production-domain>
   ```

### Git Rollback

If Vercel rollback is not sufficient:

```bash
# Revert the problematic commit
git revert <commit-hash>

# Push to main
git push origin main

# Vercel will auto-deploy the revert
```

### Database Rollback

If a migration caused issues:

```bash
# Rollback last migration
pnpm db:migrate:rollback

# Or restore from backup (see Database Migrations section)
```

### Rollback Checklist

- [ ] Identify the problematic deployment/commit
- [ ] Notify team in incident channel
- [ ] Execute rollback procedure
- [ ] Verify production is stable
- [ ] Document incident in Status Hub
- [ ] Create post-mortem issue

---

## Database Migrations

### Running Migrations

**Development**:
```bash
# Create and apply migration
pnpm db:migrate:dev --name descriptive_name
```

**Production** (automatic via CI/CD):
- Migrations run automatically on Vercel deployment
- Uses `pnpm db:migrate:deploy` (non-interactive)

### Migration Safety

**Shadow Database** (CI):
- CI validates migrations against shadow database
- Detects destructive changes
- Fails if migration would cause data loss

**Manual Validation**:
```bash
# Dry-run migration
pnpm db:migrate:deploy --dry-run

# Check migration SQL
cat packages/db/prisma/migrations/<migration-id>/migration.sql
```

### Rollback Migration

```bash
# Rollback last migration
pnpm db:migrate:rollback

# Or manually revert
psql $DATABASE_URL < rollback.sql
```

### Backup and Restore

**Backup** (before risky migration):
```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restore**:
```bash
# Restore from backup
psql $DATABASE_URL < backup_20250122_120000.sql
```

---

## Feature Flags

### Enabling a Feature

**Via Environment Variable** (Vercel):
1. Go to Vercel project → Settings → Environment Variables
2. Add `FEATURE_<FLAG_KEY>=true`
3. Select environment (Production, Preview, or both)
4. Redeploy to apply changes

**Via Database** (future):
```sql
-- Enable for specific user
INSERT INTO feature_flag_overrides (flag_key, user_id, enabled)
VALUES ('ENABLE_MOBILE_UI', '<user-id>', true);

-- Enable globally
UPDATE feature_flags SET enabled = true WHERE key = 'ENABLE_MOBILE_UI';
```

### Disabling a Feature (Kill Switch)

**Emergency Disable**:
1. Go to Vercel → Environment Variables
2. Set `FEATURE_<FLAG_KEY>=false`
3. Redeploy (or wait for automatic redeploy)

**Permanent Disable**:
1. Update `packages/config/src/flags.ts`
2. Set `defaultValue: false`
3. Commit and deploy

### Feature Flag Lifecycle

1. **Add flag** with `defaultValue: false`
2. **Test in preview** with `FEATURE_<FLAG_KEY>=true`
3. **Gradual rollout** via DB overrides
4. **Full rollout** by setting `defaultValue: true`
5. **Remove flag** after stable rollout (cleanup)

---

## Incident Response

### Severity Levels

- **P0 (Critical)**: Production down, data loss, security breach
- **P1 (High)**: Major feature broken, significant user impact
- **P2 (Medium)**: Minor feature broken, limited user impact
- **P3 (Low)**: Cosmetic issue, no user impact

### Incident Workflow

1. **Detect**: Alert, user report, or monitoring
2. **Assess**: Determine severity and impact
3. **Notify**: Alert team in incident channel
4. **Mitigate**: Apply immediate fix or rollback
5. **Resolve**: Deploy permanent fix
6. **Document**: Record in Status Hub
7. **Post-mortem**: Create issue for retrospective

### Incident Checklist

- [ ] Severity level assigned
- [ ] Team notified
- [ ] Incident channel created (if P0/P1)
- [ ] Mitigation applied (rollback or hotfix)
- [ ] Users notified (if customer-facing)
- [ ] Root cause identified
- [ ] Permanent fix deployed
- [ ] Post-mortem issue created
- [ ] Status Hub updated

### Communication Template

```markdown
## Incident: [Brief Description]

**Severity**: P0/P1/P2/P3
**Status**: Investigating / Mitigating / Resolved
**Impact**: [User-facing impact]
**Started**: YYYY-MM-DD HH:MM UTC
**Resolved**: YYYY-MM-DD HH:MM UTC (if resolved)

### Timeline
- HH:MM - Incident detected
- HH:MM - Team notified
- HH:MM - Mitigation applied
- HH:MM - Incident resolved

### Root Cause
[Brief explanation]

### Resolution
[What was done to fix it]

### Prevention
[How to prevent in the future]
```

---

## Monitoring

### Health Checks

**Endpoint**: `GET /api/health`

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-22T19:45:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### Logs

**Vercel Logs**:
- Real-time: Vercel dashboard → Logs
- CLI: `vercel logs <deployment-url>`

**Sentry** (if configured):
- Error tracking: Sentry dashboard
- Performance monitoring: Sentry → Performance

### Metrics

**Vercel Analytics**:
- Page views, load times
- Geographic distribution

**Database**:
- Connection pool status
- Query performance (via Prisma logs)

### Alerts

**Set up alerts for**:
- 5xx error rate > 1%
- Response time > 2s (p95)
- Database connection failures
- Deployment failures

---

## Emergency Contacts

- **On-call**: Check Status Hub for current responsible owner
- **GitHub Issues**: https://github.com/EvanTenenbaum/TERP/issues
- **Vercel Support**: https://vercel.com/support

---

## Additional Resources

- [Status Hub](docs/status/STATUS.md) - Current project state
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development workflow
- [DEPRECATION.md](DEPRECATION.md) - API deprecations
- [ADRs](docs/adrs/) - Architecture decisions

---

**Last Updated**: 2025-10-22

