---
inclusion: always
---

# ☁️ TERP Infrastructure

**Version**: 2.3  
**Last Updated**: 2025-12-16  
**Status**: MANDATORY

This document covers deployment, database, and infrastructure management.

---

> ⚠️ **IMPORTANT: CURRENT DEPLOYMENT PLATFORM**
>
> **TERP is deployed on DigitalOcean App Platform. NOT Railway.**
>
> We briefly migrated to Railway in December 2025 but have since migrated back to DigitalOcean.
> Any documentation mentioning Railway as the "current" platform is outdated.
>
> - **Current Platform**: DigitalOcean App Platform
> - **Production URL**: https://terp-staging-yicld.ondigitalocean.app
> - **Configuration**: `.do/app.yaml`

---

## DigitalOcean Deployment (Current)

### Overview

TERP has two environments on **DigitalOcean App Platform**.

| Environment | URL                                             | Deploys From        | Configuration          |
| ----------- | ----------------------------------------------- | ------------------- | ---------------------- |
| Staging     | `https://terp-staging-yicld.ondigitalocean.app` | `staging` branch    | `.do/app-staging.yaml` |
| Production  | `https://terp-staging-yicld.ondigitalocean.app` | `production` branch | `.do/app.yaml`         |

### Staging-First Deployment Process

1.  **Merge to `main`**: A PR is merged into the `main` branch.
2.  **Auto-sync to `staging`**: A GitHub Action automatically merges `main` into `staging` and pushes.
3.  **Staging Deployment**: The push to the `staging` branch triggers an automatic deployment to the staging environment.
4.  **Verification**: Changes are verified on the staging URL.
5.  **Production Deployment**: The project owner manually promotes the verified build to production.

**Ignored Paths** (no deployment triggered):

- `docs/**` - Documentation
- `*.md` - Markdown files
- `.github/**` - GitHub workflows
- `.kiro/**` - Kiro steering files
- `agent-prompts/**` - Agent prompts
- `product-management/**` - PM docs
- `testing/**`, `tests-e2e/**` - Test documentation
- `dashboard.html` - Static dashboard
- Editor configs (`.vscode/`, `.cursor/`)

### Monitoring Deployment

**Automatic (Recommended)**:

```bash
# Just push - auto-heal monitors and fixes automatically
git push origin staging

# Monitor progress
tail -f .deployment-status-*.log

# System will:
# 1. Monitor deployment
# 2. Analyze failures
# 3. Apply fixes automatically (up to 3 attempts)
# 4. Stop on repeated errors to avoid loops
```

**Manual Monitoring**:

```bash
# Check deployment status
bash scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)

# Watch deployment in real-time
bash scripts/watch-deploy.sh

# View deployment logs
cat .deployment-status-*.log

# List active monitors
bash scripts/manage-deployment-monitors.sh status

# Run auto-heal manually
./scripts/auto-deploy-heal.sh
```

**See**: `docs/AUTO_DEPLOY_HEAL_GUIDE.md` for complete documentation

### Using doctl CLI

You have access to the `doctl` CLI for infrastructure management.

```bash
# List all apps
doctl apps list

# Get app details
doctl apps get <APP_ID>

# View deployment logs
doctl apps logs <APP_ID> --type build
doctl apps logs <APP_ID> --type deploy
doctl apps logs <APP_ID> --type run

# Trigger manual deployment
doctl apps create-deployment <APP_ID>

# View app spec
doctl apps spec get <APP_ID>
```

### Deployment Verification Checklist

After every deployment:

- [ ] Deployment completed successfully
- [ ] Health check endpoint returns 200
- [ ] No errors in runtime logs
- [ ] Feature works in production
- [ ] Database migrations applied (if any)
- [ ] No performance degradation

```bash
# Verify health
curl https://terp-staging-yicld.ondigitalocean.app/health

# Check for errors
./scripts/terp-logs.sh run 100 | grep -i "error"

# Test feature manually
# (open browser and test)
```

### Rollback Procedure

If deployment introduces issues:

```bash
# 1. Identify last good commit
git log --oneline -10

# 2. Revert bad commit
git revert <bad-commit-hash>

# 3. Push immediately
git push origin staging

# 4. Monitor rollback
bash scripts/watch-deploy.sh

# 5. Verify rollback successful
curl https://terp-staging-yicld.ondigitalocean.app/health
```

---

## Railway (DEPRECATED - DO NOT USE)

> ⚠️ **Railway is NOT our current deployment platform.**
>
> We briefly used Railway in December 2025 but migrated back to DigitalOcean.
> The `railway.json` file and Railway-related docs exist for historical reference only.
>
> **DO NOT**:
>
> - Deploy to Railway
> - Use `railway` CLI commands
> - Reference Railway URLs (https://terp-staging-yicld.ondigitalocean.app)
>
> **DO**:
>
> - Use DigitalOcean App Platform
> - Use `doctl` CLI commands
> - Reference DigitalOcean URL (https://terp-staging-yicld.ondigitalocean.app)

---

## Database

### Production Database

**Provider**: DigitalOcean Managed MySQL
**Host**: `terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com`
**Port**: `25060`
**Database**: `defaultdb`
**SSL**: Required

### Connection String

```bash
# Format (stored in environment variables)
DATABASE_URL="mysql://doadmin:PASSWORD@HOST:25060/defaultdb?ssl-mode=REQUIRED"
```

**NEVER commit database credentials to git.**

### Database Migrations

Using Drizzle ORM:

```bash
# Generate migration
pnpm db:generate

# Apply migration
pnpm db:migrate

# Push schema changes (development only)
pnpm db:push
```

### Migration Workflow

```bash
# 1. Make schema changes
# Edit server/db/schema.ts

# 2. Generate migration
pnpm db:generate

# 3. Review migration file
cat drizzle/migrations/XXXX_*.sql

# 4. Test migration locally
# (if you have local database)

# 5. Commit migration
git add drizzle/migrations/
git commit -m "db: add calendar_events table"

# 6. Push to main
git push origin staging

# 7. Migration runs automatically on deployment
# 8. Verify migration succeeded
./scripts/terp-logs.sh deploy | grep -i "migration"
```

### Production Database Query Tool

You have direct access to query the production database using:

```bash
# List all tables
npx tsx scripts/prod-db-query.ts tables

# Get row counts for all tables
npx tsx scripts/prod-db-query.ts counts

# Run any SQL query
npx tsx scripts/prod-db-query.ts "SELECT * FROM users LIMIT 5"
npx tsx scripts/prod-db-query.ts "SELECT id, name, email FROM clients"
npx tsx scripts/prod-db-query.ts "SELECT COUNT(*) FROM orders WHERE status = 'pending'"
```

**Current Production Data Summary** (as of 2025-12-16):

- 1 user, 10 clients, 15 vendors
- 200 batches, 120 products, 400 orders
- 50 invoices with 20,681 line items
- 332 calendar events, 170 comments
- 16,268 ledger entries

**Use Cases**:

- Verify data after migrations
- Debug production issues
- Check data integrity
- Validate seeding results
- Investigate user-reported bugs

**⚠️ CAUTION**: This connects to the LIVE production database. Be careful with:

- Large queries (add LIMIT)
- UPDATE/DELETE statements (prefer read-only operations)
- Sensitive data (don't log PII)

### Database Best Practices

**DO** ✅:

- Use migrations for all schema changes
- Test migrations locally first
- Make migrations reversible when possible
- Add indexes for foreign keys
- Use transactions for data migrations
- Back up before major changes

**DON'T** ❌:

- Make manual schema changes in production
- Skip migration files
- Delete old migrations
- Commit credentials
- Use `db:push` in production
- Make breaking schema changes without coordination

---

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL="mysql://..."

# Authentication (Clerk)
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."

# API Keys
GEMINI_API_KEY="..."
OPENAI_API_KEY="..."

# Deployment
DIGITALOCEAN_TOKEN="dop_v1_..."

# Monitoring
SENTRY_DSN="..."
SENTRY_AUTH_TOKEN="..."
```

### Managing Environment Variables

**Local Development**:

```bash
# Copy example file
cp .env.example .env

# Edit with your values
# .env is gitignored
```

**Production (DigitalOcean)**:

```bash
# Set via DigitalOcean console
# App Settings > Environment Variables

# Or via doctl
doctl apps update <APP_ID> --env KEY=VALUE
```

### Secrets Management

**NEVER**:

- Commit secrets to git
- Log secrets
- Expose secrets in error messages
- Share secrets in chat/email

**ALWAYS**:

- Use environment variables
- Rotate secrets regularly
- Use different secrets for dev/prod
- Document which secrets are needed

---

## Monitoring and Logging

### Viewing Logs

```bash
# Build logs (during deployment)
./scripts/terp-logs.sh build --follow

# Deploy logs (deployment process)
./scripts/terp-logs.sh deploy --follow

# Runtime logs (application logs)
./scripts/terp-logs.sh run 100

# Follow runtime logs
./scripts/terp-logs.sh run --follow

# Search logs for errors
./scripts/terp-logs.sh run 500 | grep -i "error"
```

### Log Levels

```typescript
// Use appropriate log levels
console.log("Info: User logged in");
console.warn("Warning: Rate limit approaching");
console.error("Error: Database connection failed");

// Include context
console.error("Order processing failed:", {
  orderId,
  error: error.message,
  timestamp: new Date().toISOString(),
});
```

### Monitoring Tools

**Sentry** (Error Tracking):

- Automatic error capture
- Stack traces
- User context
- Performance monitoring

**DigitalOcean Insights**:

- CPU usage
- Memory usage
- Request rates
- Response times

### Health Checks

```bash
# Application health endpoint
curl https://terp-staging-yicld.ondigitalocean.app/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-12-02T10:30:00Z",
  "database": "connected"
}
```

---

## Performance Optimization

### Database Performance

```bash
# Check slow queries
# (via DigitalOcean console)

# Add indexes for slow queries
# Edit server/db/schema.ts
# Add index definitions

# Monitor query performance
# Use Sentry performance monitoring
```

### Application Performance

```bash
# Build size analysis
pnpm build
# Check output for bundle sizes

# Lighthouse audit
# Run in browser DevTools

# React DevTools Profiler
# Identify slow components
```

### CDN and Caching

- Static assets cached by DigitalOcean CDN
- API responses cached where appropriate
- Use `Cache-Control` headers

---

## Backup and Recovery

### Database Backups

**Automatic**:

- DigitalOcean takes daily backups
- 7-day retention
- Point-in-time recovery available

**Manual Backup**:

```bash
# Export database (if needed)
# Use DigitalOcean console or mysqldump
```

### Code Backups

**Git is the backup**:

- All code in GitHub
- Full history preserved
- Can revert to any commit

### Recovery Procedures

**Database Recovery**:

1. Contact DigitalOcean support
2. Request restore from backup
3. Specify date/time
4. Verify data after restore

**Application Recovery**:

```bash
# Revert to last good commit
git revert <bad-commit>
git push origin staging

# Or rollback to specific commit
git reset --hard <good-commit>
git push --force origin main  # Use with caution!
```

---

## Security

### SSL/TLS

- Automatic SSL via DigitalOcean
- Certificate auto-renewal
- HTTPS enforced

### Database Security

- SSL required for connections
- Firewall rules restrict access
- Strong passwords required
- Regular security updates

### Application Security

```typescript
// Input validation
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// SQL injection prevention (Drizzle handles this)
const user = await db.query.users.findFirst({
  where: eq(users.email, email), // Parameterized
});

// XSS prevention (React handles this)
<div>{userInput}</div> // Automatically escaped

// CSRF protection (tRPC handles this)
// Built-in CSRF tokens
```

### Security Checklist

- [ ] All inputs validated
- [ ] SQL queries parameterized
- [ ] Secrets in environment variables
- [ ] HTTPS enforced
- [ ] Authentication required for protected routes
- [ ] Authorization checked for sensitive operations
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies regularly updated

---

## Scaling

### Current Setup

- **App**: Single instance (can scale horizontally)
- **Database**: Managed MySQL (can upgrade tier)
- **CDN**: Automatic via DigitalOcean

### Scaling Strategy

**Horizontal Scaling** (more instances):

```bash
# Update app spec
# Increase instance count in .do/app.yaml
# Push to deploy
```

**Vertical Scaling** (bigger instances):

```bash
# Update instance size in .do/app.yaml
# Push to deploy
```

**Database Scaling**:

- Upgrade to larger database tier
- Add read replicas
- Implement caching layer (Redis)

---

## Troubleshooting

### Deployment Fails

```bash
# 1. Check build logs
./scripts/terp-logs.sh build

# 2. Common issues:
# - Dependency installation failed
# - TypeScript errors
# - Build script failed
# - Out of memory

# 3. Fix locally and redeploy
pnpm install
pnpm build
git commit -am "fix: resolve build issue"
git push origin staging
```

### Application Crashes

```bash
# 1. Check runtime logs
./scripts/terp-logs.sh run 500

# 2. Look for:
# - Uncaught exceptions
# - Database connection errors
# - Memory issues
# - Timeout errors

# 3. Fix and redeploy
```

### Database Connection Issues

```bash
# 1. Verify DATABASE_URL is set
# Check DigitalOcean console

# 2. Check database status
# DigitalOcean console > Databases

# 3. Verify SSL mode
# Must be REQUIRED

# 4. Check firewall rules
# Ensure app can reach database
```

### Performance Issues

```bash
# 1. Check DigitalOcean Insights
# CPU, memory, request rates

# 2. Check slow queries
# Database insights

# 3. Profile application
# Use React DevTools Profiler

# 4. Optimize and redeploy
```

---

## Infrastructure Commands Reference

```bash
# Deployment
bash scripts/watch-deploy.sh
bash scripts/check-deployment-status.sh <commit>
bash scripts/manage-deployment-monitors.sh status

# Logs
./scripts/terp-logs.sh build --follow
./scripts/terp-logs.sh deploy --follow
./scripts/terp-logs.sh run 100

# Database Migrations
pnpm db:generate
pnpm db:migrate
pnpm db:push  # Dev only

# Production Database Queries
npx tsx scripts/prod-db-query.ts tables
npx tsx scripts/prod-db-query.ts counts
npx tsx scripts/prod-db-query.ts "SELECT * FROM users"

# DigitalOcean CLI
doctl apps list
doctl apps get <APP_ID>
doctl apps logs <APP_ID>
doctl apps create-deployment <APP_ID>

# Health checks
curl https://terp-staging-yicld.ondigitalocean.app/health
```

---

## Infrastructure Best Practices

### DO ✅

- Monitor every deployment
- Check logs after deployment
- Verify health checks pass
- Test features in production
- Use migrations for schema changes
- Keep dependencies updated
- Monitor performance metrics
- Set up alerts for errors

### DON'T ❌

- Skip deployment verification
- Make manual database changes
- Commit secrets
- Ignore error logs
- Skip health checks
- Deploy without testing
- Make breaking changes without coordination
- Ignore performance issues

---

**Infrastructure is critical. Monitor carefully, deploy safely, and always verify success.**
