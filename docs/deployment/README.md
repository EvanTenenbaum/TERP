
# TERP Deployment Documentation

**Last Updated**: 2025-12-16  
**Status**: Active

This directory contains all deployment-related documentation for TERP.

---

> ⚠️ **IMPORTANT: CURRENT DEPLOYMENT PLATFORM**
> 
> **TERP is deployed on DigitalOcean App Platform. NOT Railway.**
> 
> We briefly migrated to Railway in December 2025 but have since migrated back to DigitalOcean.
> Railway-related documentation below is kept for historical reference only.
> 
> - **Current Platform**: DigitalOcean App Platform
> - **Production URL**: https://terp-app-b9s35.ondigitalocean.app
> - **Configuration**: `.do/app.yaml`
> - **CLI**: `doctl` (NOT `railway`)

---

## Quick Links

### DigitalOcean Deployment (CURRENT)
- [Infrastructure Protocol](../../.kiro/steering/04-infrastructure.md) - Main deployment guide
- [Auto Deploy Heal Guide](../AUTO_DEPLOY_HEAL_GUIDE.md) - Automatic deployment monitoring

### Railway Documentation (DEPRECATED - Historical Reference Only)
> ⚠️ These docs are outdated. We no longer use Railway.
- [Railway Migration Guide](../RAILWAY_MIGRATION_GUIDE.md) - Historical reference
- [Railway Docker Build Args](../RAILWAY_DOCKER_BUILD_ARGS.md) - Historical reference
- [Railway Environment Setup](../RAILWAY_ENV_SETUP_COMPLETE.md) - Historical reference

### Platform Comparison
- [Platform Comparison Analysis](../PLATFORM_COMPARISON_ANALYSIS.md) - Railway vs DigitalOcean analysis

---

## Deployment Workflow

### 1. Local Development
```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test
```

### 2. Commit Changes
```bash
# Stage changes
git add .

# Commit with conventional format
git commit -m "feat: add new feature"

# Push to trigger deployment
git push origin main
```

### 3. Automatic Deployment
- DigitalOcean detects push to `main`
- Builds using `.do/app.yaml` configuration
- Runs health checks
- Deploys to production

### 4. Verification
```bash
# Check deployment status
bash scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)

# Watch deployment in real-time
bash scripts/watch-deploy.sh

# View logs
./scripts/terp-logs.sh run 100

# Test health endpoint
curl https://terp-app-b9s35.ondigitalocean.app/health
```

---

## Environment Variables

### Required for Build (VITE_*)
These must be set in DigitalOcean App Platform:

- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk authentication (client-side)
- `VITE_APP_TITLE` - Application title
- `VITE_APP_ID` - Application identifier
- `VITE_APP_LOGO` - Logo URL (optional)
- `VITE_SENTRY_DSN` - Sentry error tracking (optional)

### Required for Runtime
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - JWT signing secret
- `CLERK_SECRET_KEY` - Clerk authentication (server-side)
- `NODE_ENV` - Environment (production)

### Optional
- `SENTRY_AUTH_TOKEN` - Sentry deployment tracking
- `INITIAL_ADMIN_USERNAME` - Auto-create admin user
- `INITIAL_ADMIN_PASSWORD` - Admin user password

Set environment variables via DigitalOcean console or `doctl`:
```bash
doctl apps update <APP_ID> --env KEY=VALUE
```

---

## Health Check Configuration

DigitalOcean uses the `/health` endpoint for deployment health checks.

**Testing Health Endpoints**:
```bash
# Test health endpoint
curl https://terp-app-b9s35.ondigitalocean.app/health

# Expected response
{"status":"healthy","timestamp":"...","database":"connected"}
```

---

## Common Issues

### Deployment Fails

**Solutions**:
1. Check build logs: `./scripts/terp-logs.sh build`
2. Look for TypeScript errors
3. Verify all environment variables are set
4. Check `.do/app.yaml` configuration

### Frontend Returns 502
**Cause**: Application crashed or not responding

**Solutions**:
1. Check logs: `./scripts/terp-logs.sh run 100`
2. Look for errors in startup
3. Verify database connection
4. Check schema drift issues

### Schema Drift Errors
**Cause**: Database schema doesn't match code schema

**Solutions**:
1. Run migration: `pnpm db:migrate`
2. Use fix script: `tsx scripts/fix-schema-drift.ts`

---

## Deployment History

### 2025-12-16: Return to DigitalOcean
- **Action**: Migrated back from Railway to DigitalOcean
- **Status**: ✅ Complete
- **Current Platform**: DigitalOcean App Platform

### 2025-12-03: Railway Migration (REVERTED)
- **Action**: Migrated from DigitalOcean to Railway
- **Status**: ⚠️ REVERTED - We are back on DigitalOcean

---

## Monitoring

### Health Checks
```bash
# Application health
curl https://terp-app-b9s35.ondigitalocean.app/health

# Expected response
{"status":"healthy","timestamp":"...","database":"connected"}
```

### Logs
```bash
# Build logs
./scripts/terp-logs.sh build --follow

# Deploy logs
./scripts/terp-logs.sh deploy --follow

# Runtime logs
./scripts/terp-logs.sh run 100

# Follow runtime logs
./scripts/terp-logs.sh run --follow
```

### Metrics
- View in DigitalOcean console
- CPU usage
- Memory usage
- Request rates
- Response times

---

## Rollback Procedure

### Via DigitalOcean Console
1. Go to DigitalOcean App Platform dashboard
2. Click "Deployments"
3. Find last good deployment
4. Click "Rollback" button

### Via Git
```bash
# Identify last good commit
git log --oneline -10

# Revert bad commit
git revert <bad-commit-hash>

# Push to trigger rollback deployment
git push origin main

# Monitor rollback
bash scripts/watch-deploy.sh
```

---

## Security

### Secrets Management
- Never commit secrets to git
- Use DigitalOcean environment variables
- Rotate secrets regularly
- Use different secrets for dev/prod

### VITE Variables Are Public
⚠️ **Important**: VITE_* variables are embedded in client JavaScript and are publicly visible.

**Safe for VITE_***:
- ✅ Clerk publishable key (pk_*)
- ✅ App title, logo, ID
- ✅ Sentry DSN
- ✅ Public API endpoints

**Never use VITE_* for**:
- ❌ Database credentials
- ❌ API secrets
- ❌ JWT secrets
- ❌ Clerk secret key (sk_*)

---

## Support

### DigitalOcean Resources
- **Docs**: https://docs.digitalocean.com/products/app-platform/
- **Status**: https://status.digitalocean.com/

### TERP Resources
- **Deployment Docs**: This directory
- **Infrastructure Protocol**: `.kiro/steering/04-infrastructure.md`
- **Workflows**: `.kiro/steering/02-workflows.md`

---

## File Organization

```
docs/
├── deployment/
│   ├── README.md (this file)
│   └── (Railway docs - DEPRECATED)
├── RAILWAY_*.md (DEPRECATED - historical reference)
└── AUTO_DEPLOY_HEAL_GUIDE.md
```

---

**For detailed deployment procedures, see `.kiro/steering/04-infrastructure.md`.**
