# TERP Deployment Guide

Comprehensive guide for deploying and maintaining the TERP cannabis ERP application.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Build Process](#build-process)
- [Deployment Steps](#deployment-steps)
- [Rollback Procedures](#rollback-procedures)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

Before deploying to production, ensure the following:

- [ ] All tests passing: `pnpm test`
- [ ] TypeScript check: `pnpm check`
- [ ] Build succeeds: `pnpm build`
- [ ] Environment variables configured (see below)
- [ ] Database migrations reviewed
- [ ] Feature flags reviewed and configured
- [ ] No sensitive data in commits (secrets, API keys, etc.)

```bash
# Run all pre-deployment checks
pnpm check && pnpm test && pnpm build
```

## Environment Variables

### Required Variables

| Variable       | Description                         | Example                                 |
| -------------- | ----------------------------------- | --------------------------------------- |
| `DATABASE_URL` | MySQL connection string             | `mysql://user:pass@host:3306/terp`      |
| `JWT_SECRET`   | Token encryption key (min 32 chars) | Generate with `openssl rand -base64 32` |
| `PORT`         | Server port (default: 3000)         | `3000`                                  |
| `NODE_ENV`     | Environment mode                    | `production`                            |

### Authentication (Clerk)

| Variable                     | Description       | Required   |
| ---------------------------- | ----------------- | ---------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk public key  | Production |
| `CLERK_SECRET_KEY`           | Clerk private key | Production |

### Optional Services

| Variable                | Description                           | Default    |
| ----------------------- | ------------------------------------- | ---------- |
| `SENTRY_DSN`            | Server-side error tracking            | (disabled) |
| `VITE_SENTRY_DSN`       | Client-side error tracking            | (disabled) |
| `SENTRY_ORG`            | Sentry organization (for source maps) | -          |
| `SENTRY_PROJECT`        | Sentry project (for source maps)      | -          |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook verification           | -          |

### Feature Flags

| Variable               | Description         | Default |
| ---------------------- | ------------------- | ------- |
| `FEATURE_LIVE_CATALOG` | Enable live catalog | `false` |

### Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in required values
3. Generate secure secrets:
   ```bash
   # Generate JWT secret
   openssl rand -base64 32
   ```
4. Never commit `.env` to git (it's in `.gitignore`)

## Database Migrations

### Check Migration Status

```bash
# View pending migrations
pnpm drizzle-kit status
```

### Apply Migrations

```bash
# Generate migration files from schema changes
pnpm drizzle-kit generate

# Push schema to database (development)
pnpm drizzle-kit push

# Apply migrations (production recommended)
pnpm drizzle-kit migrate
```

### Migration Best Practices

1. **Review generated SQL** before applying in production
2. **Back up database** before running migrations
3. **Test migrations** in staging environment first
4. **Keep migrations small** and atomic when possible
5. **Document breaking changes** in PR description

## Build Process

### Development Build

```bash
# Start development server with hot reload
pnpm dev
```

### Production Build

```bash
# Full production build
pnpm build:production

# The build process:
# 1. Generates version file
# 2. Builds client with Vite
# 3. Bundles server with esbuild
# 4. Copies scripts to dist/
```

### Build Output

```
dist/
├── index.js       # Server bundle
├── assets/        # Client assets
├── scripts/       # Utility scripts
└── ...
```

## Deployment Steps

### DigitalOcean App Platform

TERP is configured for DigitalOcean App Platform deployment:

1. **Connect Repository**: Link GitHub repository to App Platform
2. **Configure Build**: Build command is `pnpm build:production`
3. **Configure Run**: Run command is `pnpm start:production`
4. **Set Environment Variables**: Add all required variables in App Platform settings
5. **Configure Database**: Attach managed MySQL database
6. **Deploy**: App Platform automatically deploys on push to main

### Manual Deployment

For manual server deployment:

```bash
# Clone and install
git clone <repository-url>
cd TERP
pnpm install

# Build for production
pnpm build:production

# Set environment variables
export DATABASE_URL="..."
export JWT_SECRET="..."
export NODE_ENV=production

# Start the server
pnpm start:production
```

### Docker Deployment

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build:production
EXPOSE 3000
CMD ["pnpm", "start:production"]
```

## Rollback Procedures

### Application Rollback

1. **Revert to Previous Deployment**
   - In DigitalOcean: Use "Rollback" button in deployment history
   - Manual: Checkout previous tag and redeploy

2. **Verify Health**

   ```bash
   curl https://your-app.com/api/health
   ```

3. **Monitor Error Rates**
   - Check Sentry for new errors
   - Review application logs

### Database Rollback

**⚠️ Caution: Database rollbacks can cause data loss**

1. **From Backup** (safest)

   ```bash
   # Restore from automated backup
   # Use database provider's restore feature
   ```

2. **Manual Reversion**
   ```bash
   # Only for simple schema changes
   # Requires writing reverse migration
   ```

### Emergency Procedures

1. **Stop the Application**

   ```bash
   # DigitalOcean: Pause app in dashboard
   # Manual: Stop the process
   ```

2. **Roll Back Database** (if needed)
3. **Roll Back Application**
4. **Restart and Verify**

## Health Checks

### Endpoints

| Endpoint                      | Purpose         | Expected Response       |
| ----------------------------- | --------------- | ----------------------- |
| `/api/health`                 | Basic health    | `200 OK`                |
| `/api/trpc/monitoring.health` | Detailed health | JSON with system status |

### Monitoring Commands

```bash
# Basic health check
curl -s https://your-app.com/api/health | jq

# Check database connectivity
# (via application logs or monitoring dashboard)
```

### Alerts to Configure

1. **Response Time** > 2 seconds
2. **Error Rate** > 1%
3. **Memory Usage** > 80%
4. **Database Connection Failures**

## Troubleshooting

### Common Issues

#### Database Connection Failed

```
Error: Cannot connect to MySQL
```

or

```
❌ CRITICAL: Database health check failed - Cannot establish connection
error: {"errorno":"ETIMEDOUT","code":"ETIMEDOUT","syscall":"connect"}
```

**Solutions:**

1. **Check database firewall rules** - The App Platform must be in the database's trusted sources
   - See [DIGITALOCEAN_DATABASE_FIREWALL.md](deployment/DIGITALOCEAN_DATABASE_FIREWALL.md) for details
2. Verify `DATABASE_URL` is correct
3. Check database server is running
4. Verify network/firewall rules
5. Check connection pool exhaustion

#### Build Fails with Type Errors

```bash
# Run type check to see all errors
pnpm check

# Fix errors before building
```

#### Memory Issues in Production

```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed
```

**Solutions:**

1. Increase Node.js memory: `--max-old-space-size=1024`
2. Check for memory leaks using profiler
3. Review large data processing operations

#### Environment Variable Missing

```
Error: JWT_SECRET is not defined
```

**Solutions:**

1. Verify variable is set in environment
2. Check for typos in variable name
3. Ensure `.env` file is loaded (development only)

### Logging

```bash
# View application logs (DigitalOcean)
doctl apps logs <app-id>

# View logs locally
pnpm dev 2>&1 | tee app.log
```

### Support

For deployment issues:

1. Check this documentation first
2. Review application logs
3. Check GitHub issues for similar problems
4. Contact the development team

---

## Quick Reference

```bash
# Pre-deployment
pnpm check && pnpm test && pnpm build

# Deploy
pnpm build:production && pnpm start:production

# Health check
curl https://your-app.com/api/health

# Database migration
pnpm drizzle-kit generate && pnpm drizzle-kit migrate
```
