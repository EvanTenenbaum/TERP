# Railway Configuration Documentation

> ⚠️ **DEPRECATED - HISTORICAL REFERENCE ONLY**
> 
> **TERP is NO LONGER deployed on Railway. We use DigitalOcean App Platform.**
> 
> This file and `railway.json` are kept for historical reference only.
> Do NOT use Railway CLI commands or deploy to Railway.
> 
> **Current Platform**: DigitalOcean App Platform
> **Production URL**: https://terp-app-b9s35.ondigitalocean.app
> **Configuration**: `.do/app.yaml`
> 
> See `.kiro/steering/04-infrastructure.md` for current deployment documentation.

---

This document explains the configuration choices in `railway.json` (DEPRECATED).

## Build Configuration

### Docker Build

```json
"builder": "DOCKERFILE"
```

Uses the `Dockerfile` in the root directory for building the application.

### Build Arguments

```json
"buildArgs": {
  "VITE_CLERK_PUBLISHABLE_KEY": "${{VITE_CLERK_PUBLISHABLE_KEY}}",
  "VITE_APP_TITLE": "${{VITE_APP_TITLE}}",
  "VITE_APP_LOGO": "${{VITE_APP_LOGO}}",
  "VITE_APP_ID": "${{VITE_APP_ID}}",
  "VITE_SENTRY_DSN": "${{VITE_SENTRY_DSN}}"
}
```

**Why needed**: Vite requires environment variables at build time (not runtime) to embed them in the client bundle. These are passed as Docker build arguments and then set as ENV in the Dockerfile.

**See**: `docs/RAILWAY_DOCKER_BUILD_ARGS.md` for complete details.

## Deploy Configuration

### Start Command

```json
"startCommand": "pnpm run start:production"
```

Runs the production server using the `start:production` script defined in `package.json`.

### Restart Policy

```json
"restartPolicyType": "ON_FAILURE",
"restartPolicyMaxRetries": 10
```

Automatically restarts the application if it crashes, up to 10 times. This provides resilience against transient failures.

### Health Check Path

```json
"healthcheckPath": "/health/ready"
```

**Why `/health/ready` instead of `/health`**:

- `/health` always returns 200 (even when database is unavailable)
- `/health/ready` returns 503 when database connection fails
- Provides accurate deployment readiness signal to Railway
- Prevents marking deployment as successful when app is not actually ready

**Implementation**: See `server/_core/healthCheck.ts` lines 192-209 for the readiness check logic.

### Health Check Timeout

```json
"healthcheckTimeout": 600
```

**Why 600 seconds (10 minutes)**:

- Auto-migrations run during startup (`server/_core/index.ts` lines 66-75)
- Schema drift fixes can take significant time on cold starts
- Database connection establishment may be delayed
- Ensures migrations complete before health check times out

**Trade-off**: Longer timeout means slower failure detection, but prevents false negatives during legitimate startup delays.

## Environment Variables

This configuration works in conjunction with the following environment variables:

### Required

- `SKIP_SEEDING=true` - Bypasses default data seeding to prevent crashes from schema drift
- `DATABASE_URL` - MySQL connection string (auto-set by Railway)
- `JWT_SECRET` - JWT signing secret
- `CLERK_SECRET_KEY` - Clerk authentication (server-side)

### Build-time (VITE)

- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk authentication (client-side)
- `VITE_APP_TITLE` - Application title
- `VITE_APP_ID` - Application identifier
- `VITE_APP_LOGO` - Logo URL (optional)
- `VITE_SENTRY_DSN` - Sentry DSN (optional)

## Deployment Flow

```
1. Railway receives push to main branch
2. Reads railway.json configuration
3. Builds Docker image with VITE build args
4. Starts container with start command
5. Waits up to 600 seconds for /health/ready to return 200
6. If health check passes: deployment successful
7. If health check fails or times out: deployment failed
```

## Troubleshooting

### Health Check Timeout

If deployments consistently timeout:

1. Check logs for migration progress: `railway logs --tail 200 | grep -i "migration"`
2. Verify `SKIP_SEEDING=true` is set to reduce startup time
3. Consider increasing `healthcheckTimeout` if migrations legitimately take longer

### Build Failures

If builds fail with missing VITE variables:

1. Verify all VITE\_\* variables are set in Railway dashboard
2. Check that `railway.json` buildArgs match Dockerfile ARG declarations
3. Review build logs: `railway logs --build --lines 100`

### App Crashes After Deployment

If app crashes despite passing health check:

1. Check runtime logs: `railway logs --tail 100`
2. Verify database connection is stable
3. Check for schema drift errors
4. Ensure all required environment variables are set

## Related Documentation

- [Railway Migration Guide](docs/RAILWAY_MIGRATION_GUIDE.md)
- [Railway Docker Build Args](docs/RAILWAY_DOCKER_BUILD_ARGS.md)
- [Deployment Documentation](docs/deployment/README.md)
- [SKIP_SEEDING Deployment Guide](docs/deployment/DEPLOY_SKIP_SEEDING.md)

## Maintenance

When updating this configuration:

1. Test changes in a preview environment first
2. Document the reason for changes in this file
3. Update related documentation if needed
4. Monitor first deployment carefully after changes
