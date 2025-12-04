# TERP Deployment Documentation

**Last Updated**: 2025-12-04  
**Status**: Active

This directory contains all deployment-related documentation for TERP.

---

## Quick Links

### Railway Deployment
- [Railway Migration Guide](../RAILWAY_MIGRATION_GUIDE.md) - Complete migration guide
- [Railway Docker Build Args](../RAILWAY_DOCKER_BUILD_ARGS.md) - VITE build configuration
- [Railway Environment Setup](../RAILWAY_ENV_SETUP_COMPLETE.md) - Environment variables

### Recent Fixes
- [VITE Build Fix Summary](./RAILWAY_VITE_BUILD_FIX.md) - Quick summary
- [VITE Fix Complete Verification](./RAILWAY_VITE_FIX_COMPLETE_SUMMARY.md) - Full verification
- [Current Deployment Status](./RAILWAY_DEPLOYMENT_STATUS.md) - Latest status

### Platform Comparison
- [Platform Comparison Analysis](../PLATFORM_COMPARISON_ANALYSIS.md) - Railway vs DigitalOcean

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
- Railway detects push to `main`
- Builds Docker image using `Dockerfile`
- Passes VITE env vars as build args (via `railway.json`)
- Runs health checks
- Deploys to production

### 4. Verification
```bash
# Check deployment status
railway status

# View logs
railway logs --lines 100

# Test health endpoint
curl https://terp-app-production.up.railway.app/health
```

---

## Environment Variables

### Required for Build (VITE_*)
These must be set in Railway and are passed as Docker build arguments:

- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk authentication (client-side)
- `VITE_APP_TITLE` - Application title
- `VITE_APP_ID` - Application identifier
- `VITE_APP_LOGO` - Logo URL (optional)
- `VITE_SENTRY_DSN` - Sentry error tracking (optional)

### Required for Runtime
- `DATABASE_URL` - MySQL connection string (auto-set by Railway)
- `JWT_SECRET` - JWT signing secret
- `CLERK_SECRET_KEY` - Clerk authentication (server-side)
- `NODE_ENV` - Environment (production)

### Optional
- `SENTRY_AUTH_TOKEN` - Sentry deployment tracking
- `INITIAL_ADMIN_USERNAME` - Auto-create admin user
- `INITIAL_ADMIN_PASSWORD` - Admin user password

See [Railway Environment Setup](../RAILWAY_ENV_SETUP_COMPLETE.md) for complete list.

---

## Common Issues

### Frontend Returns 502
**Cause**: Application crashed or not responding

**Solutions**:
1. Check logs: `railway logs --lines 100`
2. Look for errors in startup
3. Verify database connection
4. Check schema drift issues

### Build Fails
**Cause**: Missing VITE environment variables or build errors

**Solutions**:
1. Verify all VITE_* vars are set in Railway
2. Check `railway.json` has correct buildArgs
3. Review build logs: `railway logs --build --lines 100`
4. Ensure Dockerfile has ARG declarations

### Schema Drift Errors
**Cause**: Database schema doesn't match code schema

**Solutions**:
1. Run migration: `railway run pnpm db:migrate`
2. Or manually add columns: `railway connect mysql`
3. Or use fix script: `railway run tsx scripts/fix-schema-drift.ts`

---

## Deployment History

### 2025-12-04: VITE Build Fix
- **Issue**: Frontend not building due to missing VITE env vars during build
- **Fix**: Added Docker build args and railway.json configuration
- **Status**: ✅ Complete
- **Docs**: [VITE Fix Summary](./RAILWAY_VITE_FIX_COMPLETE_SUMMARY.md)

### 2025-12-03: Railway Migration
- **Action**: Migrated from DigitalOcean to Railway
- **Reason**: Cost savings ($37/month), faster deploys (2-4 min vs 7-11 min)
- **Status**: ✅ Complete
- **Docs**: [Migration Guide](../RAILWAY_MIGRATION_GUIDE.md)

---

## Monitoring

### Health Checks
```bash
# Application health
curl https://terp-app-production.up.railway.app/health

# Expected response
{"status":"healthy","timestamp":"...","database":"connected"}
```

### Logs
```bash
# Recent logs
railway logs --lines 100

# Follow logs (live)
railway logs --follow

# Filter errors
railway logs --filter "@level:error"

# Build logs
railway logs --build --lines 100
```

### Metrics
- View in Railway dashboard
- CPU usage
- Memory usage
- Request rates
- Response times

---

## Rollback Procedure

### Instant Rollback (Railway Dashboard)
1. Go to Railway dashboard
2. Click "Deployments"
3. Find last good deployment
4. Click "Rollback" button

### CLI Rollback
```bash
# List deployments
railway deployments

# Rollback to previous
railway rollback

# Rollback to specific deployment
railway rollback --deployment <id>
```

---

## Security

### Secrets Management
- Never commit secrets to git
- Use Railway environment variables
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

### Railway Resources
- **Docs**: https://docs.railway.app
- **Discord**: https://discord.gg/railway
- **Status**: https://status.railway.app

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
│   ├── RAILWAY_VITE_BUILD_FIX.md
│   ├── RAILWAY_VITE_FIX_COMPLETE_SUMMARY.md
│   └── RAILWAY_DEPLOYMENT_STATUS.md
├── RAILWAY_MIGRATION_GUIDE.md
├── RAILWAY_DOCKER_BUILD_ARGS.md
├── RAILWAY_ENV_SETUP_COMPLETE.md
└── PLATFORM_COMPARISON_ANALYSIS.md
```

---

**For detailed deployment procedures, see the specific guides linked above.**
