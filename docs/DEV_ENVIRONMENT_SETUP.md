# TERP Development Environment Setup

**Version**: 1.0  
**Last Updated**: 2025-12-03  
**Status**: IMPLEMENTATION GUIDE

## Problem Statement

Current workflow deploys every change to production, causing:

- Slow iteration (5-10 minute builds)
- Risk of breaking production
- No safe testing environment
- Inefficient for AI agent collaboration

## Solution: Multi-Environment Cloud Setup

### Environment Strategy

| Environment     | Branch      | URL                                 | Purpose             | Deploy Time |
| --------------- | ----------- | ----------------------------------- | ------------------- | ----------- |
| **Production**  | `main`      | terp-app-b9s35.ondigitalocean.app   | Live users          | 5-10 min    |
| **Development** | `develop`   | terp-dev-app.ondigitalocean.app     | Testing & iteration | 3-5 min     |

---

## Phase 1: Create Development App

### Step 1: Clone Production App Spec

```bash
# Get current production app spec
doctl apps spec get <PROD_APP_ID> > .do/app-production.yaml

# Create development app spec
cp .do/app-production.yaml .do/app-development.yaml
```

### Step 2: Modify Development Spec

Edit `.do/app-development.yaml`:

```yaml
name: terp-dev-app
region: nyc

services:
  - name: web
    github:
      repo: your-org/terp
      branch: develop # ← Change from 'main'
      deploy_on_push: true

    # Use smaller instance for dev (cost savings)
    instance_size_slug: basic-xs # vs basic-s for production
    instance_count: 1

    # Development environment variables
    envs:
      - key: NODE_ENV
        value: "development"
      - key: DATABASE_URL
        value: "${dev-db.DATABASE_URL}" # Separate dev database
      - key: CLERK_SECRET_KEY
        scope: SECRET
        value: "sk_test_..." # Use Clerk test keys
      - key: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        value: "pk_test_..."
    # ... other env vars

databases:
  - name: dev-db
    engine: MYSQL
    version: "8"
    size: db-s-1vcpu-1gb # Smaller for dev
```

### Step 3: Create Development Database

```bash
# Create separate dev database
doctl databases create terp-dev-mysql \
  --engine mysql \
  --version 8 \
  --size db-s-1vcpu-1gb \
  --region nyc3

# Get connection details
doctl databases connection terp-dev-mysql

# Update .do/app-development.yaml with dev database connection
```

### Step 4: Deploy Development App

```bash
# Create the development app
doctl apps create --spec .do/app-development.yaml

# Get the app ID
doctl apps list | grep terp-dev-app

# Save for later use
export DEV_APP_ID="<app-id>"
```

---

## Phase 2: Setup Development Workflow

### Create `develop` Branch

```bash
# Create develop branch from main
git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop

# Protect develop branch (GitHub settings)
# - Require pull request reviews: No (for AI agents)
# - Require status checks: Yes
# - Allow force pushes: No
```

### Update Git Workflow

New branching strategy:

```
main (production)
  ↑
  PR (after testing)
  ↑
develop (development)
  ↑
  Direct push or PR
  ↑
feature/* (optional, for complex features)
```

### Development Workflow

```bash
# 1. Work on develop branch
git checkout develop
git pull origin develop

# 2. Make changes
# ... edit code ...

# 3. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin develop

# 4. Auto-deploys to terp-dev-app.ondigitalocean.app
# 5. Test on dev site

# 6. When ready for production
git checkout main
git merge develop
git push origin main

# 7. Auto-deploys to production
```

---

## Phase 4: Environment Variables Management

### Separate Secrets by Environment

**Production** (`.env.production`):

```bash
NODE_ENV=production
DATABASE_URL=mysql://prod-db...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
GEMINI_API_KEY=...
SENTRY_DSN=https://...@sentry.io/production
```

**Development** (`.env.development`):

```bash
NODE_ENV=development
DATABASE_URL=mysql://dev-db...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
GEMINI_API_KEY=...  # Same or separate quota
SENTRY_DSN=https://...@sentry.io/development
```

### Sync Environment Variables

```bash
# scripts/sync-env-vars.sh

#!/bin/bash

ENV=$1  # production or development

if [ "$ENV" = "production" ]; then
  APP_ID=$PROD_APP_ID
  ENV_FILE=.env.production
elif [ "$ENV" = "development" ]; then
  APP_ID=$DEV_APP_ID
  ENV_FILE=.env.development
else
  echo "Usage: ./scripts/sync-env-vars.sh [production|development]"
  exit 1
fi

# Read env file and update app
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ $key =~ ^#.*$ ]] && continue
  [[ -z $key ]] && continue

  echo "Setting $key..."
  doctl apps update $APP_ID --env "$key=$value"
done < "$ENV_FILE"

echo "Environment variables synced for $ENV"
```

---

## Phase 5: Database Strategy

### Option A: Separate Databases (Recommended)

**Pros**:

- Complete isolation
- Safe for destructive testing
- Can seed with test data

**Cons**:

- Additional cost (~$15/month)
- Need to sync schema changes

**Setup**:

```bash
# Already created in Phase 1
# Production DB: terp-mysql-db
# Development DB: terp-dev-mysql

# Sync schema from prod to dev
mysqldump -h prod-host -u user -p --no-data defaultdb > schema.sql
mysql -h dev-host -u user -p defaultdb < schema.sql
```

### Option B: Shared Database with Prefixes

**Pros**:

- Lower cost
- Schema always in sync

**Cons**:

- Risk of data contamination
- Harder to reset

**Setup**:

```typescript
// server/db/index.ts
const tablePrefix = process.env.NODE_ENV === "production" ? "" : "dev_";

export const users = pgTable(`${tablePrefix}users`, {
  // ...
});
```

**Recommendation**: Use Option A (separate databases) for safety.

---

## Phase 6: Monitoring & Debugging

### Development Monitoring

```bash
# Watch dev deployment
./scripts/watch-deploy.sh --app-id $DEV_APP_ID

# View dev logs
doctl apps logs $DEV_APP_ID --type run --follow

# Check dev health
curl https://terp-dev-app.ondigitalocean.app/health
```

### Development Dashboard

Create `scripts/dev-status.sh`:

```bash
#!/bin/bash

echo "=== TERP Development Status ==="
echo ""

echo "Production:"
doctl apps get $PROD_APP_ID --format ID,Name,ActiveDeployment.Phase
curl -s https://terp-app-b9s35.ondigitalocean.app/health | jq .

echo ""
echo "Development:"
doctl apps get $DEV_APP_ID --format ID,Name,ActiveDeployment.Phase
curl -s https://terp-dev-app.ondigitalocean.app/health | jq .

echo ""
echo "Recent Commits:"
echo "  main: $(git log main -1 --oneline)"
echo "  develop: $(git log develop -1 --oneline)"
```

---

## Phase 7: AI Agent Integration

### Update Agent Workflows

Agents should now work on `develop` branch:

```bash
# Agent workflow
git checkout develop
git pull origin develop

# Make changes
# ... implement feature ...

# Push to develop (auto-deploys to dev site)
git push origin develop

# User tests on dev site
# If approved, merge to main
```

### Update Steering Files

Add to `.kiro/steering/02-workflows.md`:

```markdown
## Development vs Production

### Development Branch (`develop`)

- **Purpose**: Testing and iteration
- **URL**: https://terp-dev-app.ondigitalocean.app
- **Database**: Separate dev database
- **Deploy Time**: 3-5 minutes
- **Use For**: All feature development, testing, AI agent work

### Production Branch (`main`)

- **Purpose**: Live users
- **URL**: https://terp-app-b9s35.ondigitalocean.app
- **Database**: Production database
- **Deploy Time**: 5-10 minutes
- **Use For**: Only after testing on develop

### Workflow

1. Work on `develop` branch
2. Push to `develop` → deploys to dev site
3. Test on dev site
4. When ready: merge `develop` → `main`
5. Deploys to production
```

---

## Phase 8: Cost Optimization

### Resource Sizing

| Environment | Instance | Database       | Monthly Cost |
| ----------- | -------- | -------------- | ------------ |
| Production  | basic-s  | db-s-2vcpu-4gb | ~$50         |
| Development | basic-xs | db-s-1vcpu-1gb | ~$25         |
| **Total**   |          |                | **~$75**     |

### Cost Saving Tips

1. **Scale down dev at night**:

```bash
# scripts/scale-dev.sh
doctl apps update $DEV_APP_ID --instance-count 0  # Stop
doctl apps update $DEV_APP_ID --instance-count 1  # Start
```

2. **Use preview deployments sparingly** - Only for complex features

3. **Share dev database** - Multiple preview apps can use same dev DB

---

## Phase 9: Testing Strategy

### Development Testing

```bash
# Run tests before pushing to develop
pnpm test
pnpm typecheck
pnpm lint

# Push to develop
git push origin develop

# Wait for deployment
./scripts/watch-deploy.sh --app-id $DEV_APP_ID

# Manual testing on dev site
# - Test new feature
# - Check for regressions
# - Verify database changes
```

### Production Promotion

```bash
# Only promote to production after:
# ✅ All tests pass
# ✅ Manual testing on dev site
# ✅ No errors in dev logs
# ✅ Performance acceptable

git checkout main
git merge develop
git push origin main

# Monitor production deployment
./scripts/watch-deploy.sh --app-id $PROD_APP_ID
```

---

## Phase 10: Rollback Strategy

### Development Rollback

```bash
# Rollback develop branch
git checkout develop
git revert HEAD
git push origin develop
```

### Production Rollback

```bash
# Rollback production (same as before)
git checkout main
git revert HEAD
git push origin main
```

---

## Implementation Checklist

### Setup (One-time)

- [ ] Create `.do/app-development.yaml`
- [ ] Create development database
- [ ] Deploy development app
- [ ] Create `develop` branch
- [ ] Configure environment variables
- [ ] Update monitoring scripts
- [ ] Update agent workflows
- [ ] Document URLs and credentials

### Daily Workflow

- [ ] Work on `develop` branch
- [ ] Push to `develop` for testing
- [ ] Test on dev site
- [ ] Merge to `main` when ready
- [ ] Verify production deployment

---

## Troubleshooting

### Dev and Prod Out of Sync

```bash
# Sync develop with main
git checkout develop
git merge main
git push origin develop
```

### Database Schema Drift

```bash
# Export prod schema
mysqldump -h prod-host -u user -p --no-data defaultdb > prod-schema.sql

# Import to dev
mysql -h dev-host -u user -p defaultdb < prod-schema.sql

# Or use migrations
pnpm db:migrate
```

### Environment Variables Missing

```bash
# Sync from .env file
./scripts/sync-env-vars.sh development
./scripts/sync-env-vars.sh production
```

---

## Next Steps

1. **Immediate**: Create development app and database
2. **Week 1**: Migrate workflow to use `develop` branch
3. **Week 2**: Train AI agents on new workflow
4. **Week 3**: Evaluate preview deployments for complex features
5. **Ongoing**: Monitor costs and optimize

---

## Benefits Summary

✅ **Fast iteration**: 3-5 min deploys to dev vs 5-10 min to prod  
✅ **Safe testing**: Separate database, can't break production  
✅ **Work anywhere**: Cloud-based, no local setup needed  
✅ **AI collaboration**: Agents push to develop, you test immediately  
✅ **Dev-prod parity**: Same infrastructure, same build process  
✅ **Cost effective**: ~$25/month for dev environment

---

**This setup gives you the speed of local development with the convenience of cloud deployment.**
